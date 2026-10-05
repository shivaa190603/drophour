import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, X, ShieldAlert } from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  supabaseUrl?: string;
}

const SQL_MIGRATION = `-- Run this in your Supabase SQL Editor:
-- 1. Create file_shares table
CREATE TABLE IF NOT EXISTS public.file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_token TEXT UNIQUE NOT NULL,
    share_code TEXT UNIQUE NOT NULL,
    delete_token TEXT UNIQUE NOT NULL,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deleted')),
    download_count INTEGER NOT NULL DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_file_shares_share_token ON public.file_shares (share_token);
CREATE INDEX IF NOT EXISTS idx_file_shares_share_code ON public.file_shares (share_code);
CREATE INDEX IF NOT EXISTS idx_file_shares_delete_token ON public.file_shares (delete_token);
CREATE INDEX IF NOT EXISTS idx_file_shares_cleanup ON public.file_shares (expires_at, status);

-- 3. Row Level Security (RLS)
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public lookup active shares by token or code" ON public.file_shares;
CREATE POLICY "Public lookup active shares by token or code"
    ON public.file_shares
    FOR SELECT
    TO anon, authenticated
    USING (status = 'active' AND expires_at > now());

DROP POLICY IF EXISTS "Allow anonymous share creation" ON public.file_shares;
CREATE POLICY "Allow anonymous share creation"
    ON public.file_shares
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (expires_at <= (now() + interval '2 hours 15 minutes'));

-- 4. Create Private Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('temporary-files', 'temporary-files', false, 52428800, null)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 5. Storage Security Policies
DROP POLICY IF EXISTS "Allow anonymous uploads to temporary-files" ON storage.objects;
CREATE POLICY "Allow anonymous uploads to temporary-files"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'temporary-files');

DROP POLICY IF EXISTS "Service role full control of temporary-files" ON storage.objects;
CREATE POLICY "Service role full control of temporary-files"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'temporary-files')
    WITH CHECK (bucket_id = 'temporary-files');

-- 6. Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_file_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.file_shares
    SET status = 'expired'
    WHERE expires_at <= now() AND status = 'active';
END;
$$;`;

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  supabaseUrl,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Extract project ref from URL if possible
  const projectRef = supabaseUrl ? supabaseUrl.replace('https://', '').split('.')[0] : 'nimqhkfbwaepcaqsvjky';
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SQL_MIGRATION);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-6 shadow-sm max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#171717]">
                Supabase Setup Required
              </h2>
              <p className="text-xs text-[#666666]">
                Your Supabase database table and storage bucket haven't been created yet.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#666666] hover:text-[#171717] p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-sm">
          <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#171717]">
              <ShieldAlert className="w-4 h-4 text-[#D97706]" />
              <span>How to complete setup (takes 30 seconds):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-[#666666] pl-1">
              <li>
                Click{' '}
                <a
                  href={sqlEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2563EB] font-medium underline inline-flex items-center gap-1"
                >
                  Open Supabase SQL Editor <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Click <strong>Copy SQL Script</strong> below and paste it into the editor.</li>
              <li>Click <strong>Run</strong> in Supabase. Your private bucket and tables will be live!</li>
            </ol>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">
                SQL Migration Script
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="h-8 px-3 rounded text-xs font-medium bg-[#171717] hover:bg-black text-[#FFFFFF] transition-colors flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL Script</span>
                  </>
                )}
              </button>
            </div>

            <pre className="bg-[#171717] text-[#FFFFFF] p-3.5 rounded text-xs font-mono max-h-56 overflow-y-auto overflow-x-auto select-all leading-relaxed">
              {SQL_MIGRATION}
            </pre>
          </div>
        </div>

        <div className="pt-4 border-t border-[#D9D9D9] flex items-center justify-between mt-4">
          <span className="text-xs text-[#666666]">
            Meanwhile, file uploads automatically save to local browser storage so you can test right now.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#F7F7F5] border border-[#D9D9D9] hover:border-[#171717] text-[#171717] text-xs font-medium rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
