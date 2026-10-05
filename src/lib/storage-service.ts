import { supabase, isSupabaseConfigured } from './supabase';
import {
  selectOptimalSupabaseNode,
  getPoolConfigs,
  getClientForNode,
} from './supabase-pool';
import type { CreateShareResponse, ShareMetadata, FileShare } from '../types/file';
import {
  generateShareCode,
  generateSecureToken,
  sanitizeFilename,
  validateFile,
  normalizeShareCode,
} from './validation';
import { getFilePricingTier } from './pricing';
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
      if (
        tableError.code === 'PGRST205' ||
        tableError.message?.includes('schema cache') ||
        tableError.message?.includes('not find the table')
      ) {
        return {
          isConfigured: true,
          isReady: false,
          missingTable: true,
          missingBucket: true,
          message:
            'The "file_shares" table and "temporary-files" bucket have not been created yet.',
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
 * Periodically purge expired files from all configured Supabase database nodes
 * Physically deletes the binary files from 'temporary-files' storage bucket and updates database
 */
export async function runSupabaseAutoPurge(): Promise<void> {
  const nodes = getPoolConfigs().filter((n) => n.isConfigured && n.url && n.anonKey);
  const nowIso = new Date().toISOString();

  for (const node of nodes) {
    const client = getClientForNode(node);
    if (!client) continue;

    try {
      // 1. Trigger RPC function if available on Supabase
      try {
        await client.rpc('cleanup_expired_file_shares');
      } catch {
        // RPC might not exist or pg_cron handled it
      }

      // 2. Proactive client-side scan for expired or deleted shares on this node
      const { data: expiredShares } = await client
        .from('file_shares')
        .select('id, storage_path')
        .or(`expires_at.lte.${nowIso},status.eq.deleted,status.eq.expired`)
        .limit(30);

      if (expiredShares && expiredShares.length > 0) {
        const storagePaths = expiredShares.map((s) => s.storage_path).filter(Boolean);
        const ids = expiredShares.map((s) => s.id);

        if (storagePaths.length > 0) {
          // Physically remove binary files from Supabase storage
          await client.storage.from('temporary-files').remove(storagePaths);
        }

        // Update database records to expired
        await client
          .from('file_shares')
          .update({ status: 'expired' })
          .in('id', ids);
      }
    } catch (err) {
      console.warn(`[DropHour Purge] Error purging node ${node.id}:`, err);
    }
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
    database_instance_id: 'local',
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
    database_instance_id: 'local',
  };
}

/**
 * Upload a file and create a temporary share (1-hour expiration)
 * Uses smart load balancing across up to 5 Supabase nodes for >50MB files
 */
export async function uploadAndCreateShare(
  file: File,
  onProgress?: (progress: number) => void,
  paymentDetails?: { amountPaidInr: number; paymentId?: string }
): Promise<CreateShareResponse> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const cleanFilename = sanitizeFilename(file.name);
  const now = new Date();
  const pricing = getFilePricingTier(file.size);
  const isPaidTransfer =
    pricing.isPaid || Boolean(paymentDetails && paymentDetails.amountPaidInr > 0);
  // Free transfers: 1 hour (3600s), Paid transfers: 2 hours (7200s)
  const expiryDurationMs = (isPaidTransfer ? 2 : 1) * 60 * 60 * 1000;
  const expiresAt = new Date(now.getTime() + expiryDurationMs).toISOString();
  const shareToken = generateSecureToken(24);
  const shareCode = generateShareCode();
  const deleteToken = generateSecureToken(32);

  // If Supabase is configured, use Smart Load Balancer to pick the best node among the 5 instances
  if (isSupabaseConfigured) {
    try {
      if (onProgress) onProgress(15);

      const { client: targetClient, node: targetNode } =
        await selectOptimalSupabaseNode(file.size, isPaidTransfer);

      if (targetClient) {
        const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
        const uniqueId = crypto.randomUUID();
        const storagePath = `${datePath}/${uniqueId}/${cleanFilename}`;

        if (onProgress) onProgress(40);

        // Upload physical file bytes to Supabase storage on the selected node
        const { error: uploadError } = await targetClient.storage
          .from('temporary-files')
          .upload(storagePath, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          console.warn(
            `[DropHour] Storage upload failed on node ${targetNode.id}:`,
            uploadError
          );
          // Fall back to local engine if bucket fails
          return await saveToLocalEngine(
            file,
            cleanFilename,
            shareToken,
            shareCode,
            deleteToken,
            expiresAt,
            now,
            onProgress
          );
        }

        if (onProgress) onProgress(75);

        // Record file share metadata in the node's database
        // Only insert standard schema columns that exist in the PostgreSQL table
        const insertPayload: Record<string, unknown> = {
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
        };

        let { error: dbError } = await targetClient.from('file_shares').insert(insertPayload);

        // If insert failed due to strict legacy RLS policy (expires_at <= 1 hour 5 minutes),
        // fallback to standard 1 hour expiration so database write succeeds without failing over to local demo
        if (dbError && dbError.code === '42501' && isPaidTransfer) {
          console.warn('[DropHour] 2-hour RLS constraint detected on node, falling back to 1-hour database entry:', dbError);
          const safeExpiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
          insertPayload.expires_at = safeExpiresAt;
          const retryRes = await targetClient.from('file_shares').insert(insertPayload);
          dbError = retryRes.error;
        }

        if (dbError) {
          console.warn(`[DropHour] DB insert failed on node ${targetNode.id}:`, dbError);
          // Reclaim storage object if DB insert failed
          await targetClient.storage.from('temporary-files').remove([storagePath]);
          return await saveToLocalEngine(
            file,
            cleanFilename,
            shareToken,
            shareCode,
            deleteToken,
            expiresAt,
            now,
            onProgress
          );
        }

        if (onProgress) onProgress(100);

        return {
          share_token: shareToken,
          share_code: shareCode,
          delete_token: deleteToken,
          expires_at: (insertPayload.expires_at as string) || expiresAt,
          file_size: file.size,
          original_filename: cleanFilename,
          database_instance_id: targetNode.id,
          payment_status: pricing.isPaid ? 'paid' : 'free',
          amount_paid_inr: paymentDetails?.amountPaidInr || (pricing.isPaid ? pricing.priceInr : 0),
          payment_id: paymentDetails?.paymentId,
        };
      }
    } catch (err: unknown) {
      console.warn('[DropHour] Error during Supabase upload, falling back to local engine:', err);
      return await saveToLocalEngine(
        file,
        cleanFilename,
        shareToken,
        shareCode,
        deleteToken,
        expiresAt,
        now,
        onProgress
      );
    }
  }

  // Local / Demo Mode fallback
  return await saveToLocalEngine(
    file,
    cleanFilename,
    shareToken,
    shareCode,
    deleteToken,
    expiresAt,
    now,
    onProgress
  );
}

/**
 * Fetch share metadata by share_token or human share_code
 * Searches across configured Supabase database nodes and automatically purges if expired
 */
export async function getShareByTokenOrCode(
  rawIdentifier: string
): Promise<{ share: ShareMetadata | null; expired: boolean; notFound: boolean }> {
  const identifier = rawIdentifier.replace(/\/+$/, '').trim();
  const normalizedCode = normalizeShareCode(identifier);

  // Security check: strictly validate identifier format to prevent injection attacks
  if (!identifier || !/^[A-Za-z0-9_-]{4,64}$/.test(identifier)) {
    return { share: null, expired: false, notFound: true };
  }

  // Search across configured Supabase nodes
  const nodes = getPoolConfigs().filter((n) => n.isConfigured && n.url && n.anonKey);

  for (const node of nodes) {
    const client = getClientForNode(node);
    if (!client) continue;

    try {
      // SECURITY: Never select delete_token in public lookups
      // Only select columns that exist in the PostgreSQL table schema
      const query = client
        .from('file_shares')
        .select(
          'id, share_token, share_code, original_filename, storage_path, file_size, mime_type, created_at, expires_at, status, download_count'
        );

      let data = null;
      let error = null;

      if (identifier.length >= 20) {
        // High-entropy 24-character token lookup: exact match is fast and indexed
        const res = await query.eq('share_token', identifier).maybeSingle();
        data = res.data;
        error = res.error;
      } else {
        // Short code lookup (case-insensitive) or fallback
        const res = await query
          .or(
            `share_code.ilike.${identifier},share_code.ilike.${normalizedCode},share_token.eq.${identifier}`
          )
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      if (!error && data) {
        const isExpired =
          new Date(data.expires_at).getTime() <= Date.now() || data.status !== 'active';

        if (isExpired) {
          // Immediately purge expired physical file from this Supabase node!
          if (data.storage_path) {
            client.storage.from('temporary-files').remove([data.storage_path]).then();
          }
          client
            .from('file_shares')
            .update({ status: 'expired' })
            .eq('id', data.id)
            .then();

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
            database_instance_id: node.id,
          },
          expired: false,
          notFound: false,
        };
      }
    } catch {
      // Continue to next node
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

  const isExpired =
    new Date(record.expires_at).getTime() <= Date.now() || record.status !== 'active';
  if (isExpired) {
    deleteLocalFileBlob(record.share_token).catch(() => {});
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
      database_instance_id: 'local',
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

  // Security check: strictly validate identifier format to prevent injection attacks
  if (!shareToken || !/^[A-Za-z0-9_-]{4,64}$/.test(shareToken)) {
    throw new Error('Invalid or malformed share identifier.');
  }

  // Search across Supabase nodes
  const nodes = getPoolConfigs().filter((n) => n.isConfigured && n.url && n.anonKey);

  for (const node of nodes) {
    const client = getClientForNode(node);
    if (!client) continue;

    try {
      const query = client
        .from('file_shares')
        .select('id, original_filename, storage_path, expires_at, status, download_count');

      let record = null;
      let fetchError = null;

      if (shareToken.length >= 20) {
        const res = await query.eq('share_token', shareToken).maybeSingle();
        record = res.data;
        fetchError = res.error;
      } else {
        const res = await query
          .or(
            `share_code.ilike.${shareToken},share_code.ilike.${normalizedCode},share_token.eq.${shareToken}`
          )
          .maybeSingle();
        record = res.data;
        fetchError = res.error;
      }

      if (!fetchError && record) {
        if (new Date(record.expires_at).getTime() <= Date.now() || record.status !== 'active') {
          // Immediately purge expired file from storage
          if (record.storage_path) {
            client.storage.from('temporary-files').remove([record.storage_path]).then();
          }
          client
            .from('file_shares')
            .update({ status: 'expired' })
            .eq('id', record.id)
            .then();

          throw new Error('This file has expired and has been permanently removed.');
        }

        // Create signed URL for private bucket (60 seconds valid)
        const { data: signedData, error: signError } = await client.storage
          .from('temporary-files')
          .createSignedUrl(record.storage_path, 60, {
            download: record.original_filename,
          });

        if (!signError && signedData?.signedUrl) {
          // Increment download count asynchronously
          client
            .from('file_shares')
            .update({
              download_count: (record.download_count || 0) + 1,
              last_downloaded_at: new Date().toISOString(),
            })
            .eq('id', record.id)
            .then();

          return {
            url: signedData.signedUrl,
            filename: record.original_filename,
          };
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('expired')) {
        throw err;
      }
    }
  }

  // Local / Demo mode fallback
  const shares = getLocalShares();
  const recordIndex = shares.findIndex((s) => s.share_token === shareToken);

  if (recordIndex === -1) {
    throw new Error('We could not find that file.');
  }

  const record = shares[recordIndex];
  if (new Date(record.expires_at).getTime() <= Date.now() || record.status !== 'active') {
    deleteLocalFileBlob(record.share_token).catch(() => {});
    throw new Error('This file has expired and has been permanently removed.');
  }

  const localFile = await getLocalFileBlob(shareToken);
  if (!localFile) {
    throw new Error('File object is no longer available in local storage.');
  }

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
 * Permanently deletes file immediately using delete_token
 * Physically deletes the binary file from Supabase storage bucket and marks record deleted
 */
export async function deleteShareImmediately(
  deleteToken: string,
  shareToken?: string
): Promise<{ success: boolean; error?: string }> {
  // Security check: validate delete_token format
  const cleanDeleteToken = (deleteToken || '').trim();
  if (!cleanDeleteToken || !/^[A-Za-z0-9_-]{16,64}$/.test(cleanDeleteToken)) {
    return { success: false, error: 'Invalid or missing delete token.' };
  }

  let deletedFromSupabase = false;

  // Search across all Supabase nodes
  const nodes = getPoolConfigs().filter((n) => n.isConfigured && n.url && n.anonKey);

  for (const node of nodes) {
    const client = getClientForNode(node);
    if (!client) continue;

    try {
      // 1. Attempt atomic secure server-side RPC deletion
      try {
        const { data: rpcSuccess } = await client.rpc('delete_share_securely', {
          p_delete_token: cleanDeleteToken,
        });
        if (rpcSuccess) {
          deletedFromSupabase = true;
          break;
        }
      } catch {
        // Fall back to direct table lookup
      }

      const { data: record } = await client
        .from('file_shares')
        .select('id, storage_path')
        .eq('delete_token', cleanDeleteToken)
        .maybeSingle();

      if (record) {
        // 1. Physically delete binary file from storage bucket
        if (record.storage_path) {
          const { error: removeError } = await client.storage
            .from('temporary-files')
            .remove([record.storage_path]);
          if (removeError) {
            console.warn('[DropHour Delete] Storage remove error:', removeError);
          }
        }

        // 2. Mark database record as deleted
        await client
          .from('file_shares')
          .update({ status: 'deleted' })
          .eq('id', record.id);

        deletedFromSupabase = true;
        break;
      }
    } catch (err) {
      console.warn(`[DropHour Delete] Error on node ${node.id}:`, err);
    }
  }

  // Also clean up local storage if present
  const shares = getLocalShares();
  const record = shares.find(
    (s) => s.delete_token === deleteToken || (shareToken && s.share_token === shareToken)
  );

  if (record) {
    await deleteLocalFileBlob(record.share_token);
    const remaining = shares.filter((s) => s.delete_token !== deleteToken);
    saveLocalShares(remaining);
    return { success: true };
  }

  if (deletedFromSupabase) {
    return { success: true };
  }

  return { success: false, error: 'File record not found or already deleted.' };
}
