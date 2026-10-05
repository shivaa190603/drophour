import { supabase, isSupabaseConfigured } from './supabase';
import type { CreateShareResponse, ShareMetadata, FileShare } from '../types/file';
import {
  generateShareCode,
  generateSecureToken,
  sanitizeFilename,
  validateFile,
  normalizeShareCode,
} from './validation';
import { saveLocalFileBlob, getLocalFileBlob, deleteLocalFileBlob } from './local-storage-db';

const LOCAL_STORAGE_SHARES_KEY = 'drophour_local_shares';

export interface SupabaseHealth {
  isConfigured: boolean;
  isReady: boolean;
  missingTable?: boolean;
  missingBucket?: boolean;
  message?: string;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  if (!isSupabaseConfigured || !supabase) {
    return { isConfigured: false, isReady: false };
  }

  try {
    const { error: tableError } = await supabase.from('file_shares').select('id').limit(1);
    
    if (tableError) {
      if (tableError.code === 'PGRST205' || tableError.message?.includes('schema cache') || tableError.message?.includes('not find the table')) {
        return {
          isConfigured: true,
          isReady: false,
          missingTable: true,
          missingBucket: true,
          message: 'The "file_shares" table and "temporary-files" bucket have not been created yet.',
        };
      }
    }

    return { isConfigured: true, isReady: true };
  } catch (err: unknown) {
    return {
      isConfigured: true,
      isReady: false,
      message: err instanceof Error ? err.message : 'Unable to connect to Supabase.',
    };
  }
}

function getLocalShares(): FileShare[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SHARES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalShares(shares: FileShare[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_SHARES_KEY, JSON.stringify(shares));
  } catch (err) {
    console.error('Failed to save shares to localStorage', err);
  }
}

/**
 * Periodically purge physically expired files in local storage mode
 */
export async function runLocalCleanup(): Promise<void> {
  const shares = getLocalShares();
  const now = Date.now();
  const remaining: FileShare[] = [];

  for (const item of shares) {
    if (new Date(item.expires_at).getTime() <= now || item.status === 'deleted') {
      try {
        await deleteLocalFileBlob(item.share_token);
      } catch {
        // ignore
      }
    } else {
      remaining.push(item);
    }
  }

  if (remaining.length !== shares.length) {
    saveLocalShares(remaining);
  }
}

/**
 * Helper to save file locally in IndexedDB + localStorage
 */
async function saveToLocalEngine(
  file: File,
  cleanFilename: string,
  shareToken: string,
  shareCode: string,
  deleteToken: string,
  expiresAt: string,
  now: Date,
  onProgress?: (progress: number) => void
): Promise<CreateShareResponse> {
  for (let pct = 30; pct <= 90; pct += 25) {
    if (onProgress) onProgress(pct);
    await new Promise((r) => setTimeout(r, 60));
  }

  await saveLocalFileBlob(shareToken, file, cleanFilename);

  const localShare: FileShare = {
    id: crypto.randomUUID(),
    share_token: shareToken,
    share_code: shareCode,
    delete_token: deleteToken,
    original_filename: cleanFilename,
    storage_path: `local/${shareToken}/${cleanFilename}`,
    file_size: file.size,
    mime_type: file.type || 'application/octet-stream',
    created_at: now.toISOString(),
    expires_at: expiresAt,
    status: 'active',
    download_count: 0,
  };

  const currentShares = getLocalShares();
  currentShares.push(localShare);
  saveLocalShares(currentShares);

  if (onProgress) onProgress(100);

  return {
    share_token: shareToken,
    share_code: shareCode,
    delete_token: deleteToken,
    expires_at: expiresAt,
    file_size: file.size,
    original_filename: cleanFilename,
  };
}

/**
 * Upload a file and create a temporary share (1-hour expiration)
 */
export async function uploadAndCreateShare(
  file: File,
  onProgress?: (progress: number) => void
): Promise<CreateShareResponse> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const cleanFilename = sanitizeFilename(file.name);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const shareToken = generateSecureToken(24);
  const shareCode = generateShareCode();
  const deleteToken = generateSecureToken(32);

  // If Supabase is configured, attempt Supabase Storage & Database
  if (isSupabaseConfigured && supabase) {
    try {
      if (onProgress) onProgress(20);

      // 1. Attempt Edge Function first
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', cleanFilename);
      formData.append('share_token', shareToken);
      formData.append('share_code', shareCode);
      formData.append('delete_token', deleteToken);

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-share', {
        body: formData,
      });

      if (!edgeError && edgeData) {
        if (onProgress) onProgress(100);
        return {
          share_token: edgeData.share_token,
          share_code: edgeData.share_code,
          delete_token: edgeData.delete_token,
          expires_at: edgeData.expires_at,
          file_size: edgeData.file_size,
          original_filename: edgeData.original_filename,
        };
      }

      // 2. Direct Supabase Storage & DB upload
      const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      const uniqueId = crypto.randomUUID();
      const storagePath = `${datePath}/${uniqueId}/${cleanFilename}`;

      if (onProgress) onProgress(45);

      const { error: uploadError } = await supabase.storage
        .from('temporary-files')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.warn('[DropHour] Supabase storage upload failed (bucket missing or not setup):', uploadError);
        console.info('[DropHour] Falling back to local storage engine so your upload succeeds...');
        return await saveToLocalEngine(file, cleanFilename, shareToken, shareCode, deleteToken, expiresAt, now, onProgress);
      }

      if (onProgress) onProgress(80);

      const { error: dbError } = await supabase.from('file_shares').insert({
        share_token: shareToken,
        share_code: shareCode,
        delete_token: deleteToken,
        original_filename: cleanFilename,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        created_at: now.toISOString(),
        expires_at: expiresAt,
        status: 'active',
        download_count: 0,
      });

      if (dbError) {
        console.warn('[DropHour] Supabase database insert failed (table missing or RLS):', dbError);
        await supabase.storage.from('temporary-files').remove([storagePath]);
        console.info('[DropHour] Falling back to local storage engine...');
        return await saveToLocalEngine(file, cleanFilename, shareToken, shareCode, deleteToken, expiresAt, now, onProgress);
      }

      if (onProgress) onProgress(100);

      return {
        share_token: shareToken,
        share_code: shareCode,
        delete_token: deleteToken,
        expires_at: expiresAt,
        file_size: file.size,
        original_filename: cleanFilename,
      };
    } catch (err: unknown) {
      console.warn('[DropHour] Supabase error during upload, falling back to local engine:', err);
      return await saveToLocalEngine(file, cleanFilename, shareToken, shareCode, deleteToken, expiresAt, now, onProgress);
    }
  }

  // Local / Demo Mode (IndexedDB + localStorage)
  return await saveToLocalEngine(file, cleanFilename, shareToken, shareCode, deleteToken, expiresAt, now, onProgress);
}

/**
 * Fetch share metadata by share_token or human share_code
 */
export async function getShareByTokenOrCode(
  rawIdentifier: string
): Promise<{ share: ShareMetadata | null; expired: boolean; notFound: boolean }> {
  const identifier = rawIdentifier.replace(/\/+$/, '').trim();
  const normalizedCode = normalizeShareCode(identifier);

  // Supabase live check
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('file_shares')
        .select('*')
        .or(`share_token.ilike.${identifier},share_code.ilike.${identifier},share_code.ilike.${normalizedCode}`)
        .maybeSingle();

      if (!error && data) {
        const isExpired = new Date(data.expires_at).getTime() <= Date.now() || data.status !== 'active';
        if (isExpired) {
          return { share: null, expired: true, notFound: false };
        }

        return {
          share: {
            share_token: data.share_token,
            share_code: data.share_code,
            original_filename: data.original_filename,
            file_size: data.file_size,
            mime_type: data.mime_type,
            created_at: data.created_at,
            expires_at: data.expires_at,
            status: data.status,
            download_count: data.download_count || 0,
          },
          expired: false,
          notFound: false,
        };
      }
    } catch (err) {
      console.warn('[DropHour] Error querying Supabase share:', err);
    }
  }

  // Local / Demo mode check
  const shares = getLocalShares();
  const lowerId = identifier.toLowerCase();
  const lowerNorm = normalizedCode.toLowerCase();
  const record = shares.find(
    (s) =>
      s.share_token.toLowerCase() === lowerId ||
      s.share_code.toLowerCase() === lowerId ||
      normalizeShareCode(s.share_code).toLowerCase() === lowerNorm
  );

  if (!record) {
    return { share: null, expired: false, notFound: true };
  }

  const isExpired = new Date(record.expires_at).getTime() <= Date.now() || record.status !== 'active';
  if (isExpired) {
    return { share: null, expired: true, notFound: false };
  }

  return {
    share: {
      share_token: record.share_token,
      share_code: record.share_code,
      original_filename: record.original_filename,
      file_size: record.file_size,
      mime_type: record.mime_type,
      created_at: record.created_at,
      expires_at: record.expires_at,
      status: record.status,
      download_count: record.download_count,
    },
    expired: false,
    notFound: false,
  };
}

/**
 * Generates download URL or file download trigger
 */
export async function downloadFile(
  rawShareToken: string
): Promise<{ url: string; filename: string; isDirectBlob?: boolean }> {
  const shareToken = rawShareToken.replace(/\/+$/, '').trim();
  const normalizedCode = normalizeShareCode(shareToken);

  // Supabase live mode
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: record, error: fetchError } = await supabase
        .from('file_shares')
        .select('original_filename, storage_path, expires_at, status, download_count')
        .or(`share_token.ilike.${shareToken},share_code.ilike.${shareToken},share_code.ilike.${normalizedCode}`)
        .maybeSingle();

      if (!fetchError && record) {
        if (new Date(record.expires_at).getTime() <= Date.now() || record.status !== 'active') {
          throw new Error('This file has expired and has been removed.');
        }

        // Try edge function if available
        const { data: edgeDownload } = await supabase.functions.invoke('download-share', {
          body: { share_token: shareToken },
        });

        if (edgeDownload && edgeDownload.download_url) {
          return {
            url: edgeDownload.download_url,
            filename: edgeDownload.filename || record.original_filename,
          };
        }

        // Fallback: Create signed URL for private bucket (60 seconds valid)
        const { data: signedData, error: signError } = await supabase.storage
          .from('temporary-files')
          .createSignedUrl(record.storage_path, 60, {
            download: record.original_filename,
          });

        if (!signError && signedData?.signedUrl) {
          // Increment download count asynchronously
          supabase
            .from('file_shares')
            .update({
              download_count: (record.download_count || 0) + 1,
              last_downloaded_at: new Date().toISOString(),
            })
            .eq('share_token', shareToken)
            .then();

          return {
            url: signedData.signedUrl,
            filename: record.original_filename,
          };
        }
      }
    } catch {
      // Try local fallback
    }
  }

  // Local / Demo mode
  const shares = getLocalShares();
  const recordIndex = shares.findIndex((s) => s.share_token === shareToken);

  if (recordIndex === -1) {
    throw new Error('We could not find that file.');
  }

  const record = shares[recordIndex];
  if (new Date(record.expires_at).getTime() <= Date.now() || record.status !== 'active') {
    throw new Error('This file has expired and has been permanently removed.');
  }

  const localFile = await getLocalFileBlob(shareToken);
  if (!localFile) {
    throw new Error('File object is no longer available in local storage.');
  }

  // Increment download count
  shares[recordIndex].download_count += 1;
  shares[recordIndex].last_downloaded_at = new Date().toISOString();
  saveLocalShares(shares);

  const objectUrl = URL.createObjectURL(localFile.blob);
  return {
    url: objectUrl,
    filename: record.original_filename,
    isDirectBlob: true,
  };
}

/**
 * Permanently delete file immediately using delete_token
 */
export async function deleteShareImmediately(
  deleteToken: string,
  shareToken?: string
): Promise<{ success: boolean; error?: string }> {
  // Supabase live mode
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('delete-share', {
        body: { delete_token: deleteToken, share_token: shareToken },
      });

      if (!edgeError && edgeResult?.success) {
        return { success: true };
      }

      // Direct fallback
      const { data: record } = await supabase
        .from('file_shares')
        .select('id, storage_path')
        .eq('delete_token', deleteToken)
        .single();

      if (record) {
        await supabase.storage.from('temporary-files').remove([record.storage_path]);
        await supabase
          .from('file_shares')
          .update({ status: 'deleted' })
          .eq('id', record.id);
        return { success: true };
      }
    } catch {
      // Fall through to local
    }
  }

  // Local / Demo mode
  const shares = getLocalShares();
  const record = shares.find((s) => s.delete_token === deleteToken);

  if (!record) {
    return { success: false, error: 'File record not found or already deleted.' };
  }

  await deleteLocalFileBlob(record.share_token);
  const remaining = shares.filter((s) => s.delete_token !== deleteToken);
  saveLocalShares(remaining);

  return { success: true };
}
