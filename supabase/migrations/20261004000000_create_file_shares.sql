-- ==============================================================================
-- DropHour: Supabase PostgreSQL Schema & Storage Setup
-- Run this entire script in Supabase SQL Editor
-- ==============================================================================

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

-- 2. Indexes for fast lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_file_shares_share_token ON public.file_shares (share_token);
CREATE INDEX IF NOT EXISTS idx_file_shares_share_code ON public.file_shares (share_code);
CREATE INDEX IF NOT EXISTS idx_file_shares_delete_token ON public.file_shares (delete_token);
CREATE INDEX IF NOT EXISTS idx_file_shares_cleanup ON public.file_shares (expires_at, status);

-- 3. Row Level Security (RLS) on file_shares
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
    WITH CHECK (expires_at <= (now() + interval '1 hour 5 minutes'));

-- 4. Create Private Storage Bucket (50MB Limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('temporary-files', 'temporary-files', false, 52428800, null)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800;

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

-- 6. Cleanup Stored Function
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
$$;

-- 7. pg_cron Recurring Job Setup (if pg_cron extension is enabled)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'cleanup-expired-shares-every-minute',
            '* * * * *',
            'SELECT public.cleanup_expired_file_shares();'
        );
    END IF;
END $$;
