-- ==============================================================================
-- DropHour: Auto-Purge Storage & Database Migration (50MB+ & Multi-Node Support)
-- Run this in Supabase SQL Editor for each Supabase project (Node 1 to Node 5)
-- ==============================================================================

-- 1. Ensure file_shares table has database_instance_id and payment fields
ALTER TABLE public.file_shares 
    ADD COLUMN IF NOT EXISTS database_instance_id TEXT DEFAULT 'db-1',
    ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS amount_paid_inr INTEGER DEFAULT 0;

-- 2. Enhanced Cleanup Function: Purges physical storage objects + marks expired
CREATE OR REPLACE FUNCTION public.cleanup_expired_file_shares()
RETURNS TABLE(purged_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_count integer := 0;
BEGIN
    -- 1. Physically delete expired file objects from Supabase storage.objects
    DELETE FROM storage.objects
    WHERE bucket_id = 'temporary-files'
      AND name IN (
          SELECT storage_path 
          FROM public.file_shares 
          WHERE expires_at <= now() OR status = 'expired' OR status = 'deleted'
      );

    -- 2. Update status in public.file_shares
    WITH expired_rows AS (
        UPDATE public.file_shares
        SET status = 'expired'
        WHERE (expires_at <= now() OR status = 'active') AND expires_at <= now()
        RETURNING id
    )
    SELECT count(*) INTO affected_count FROM expired_rows;

    RETURN QUERY SELECT affected_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_file_shares() TO anon, authenticated, service_role;

-- 3. Secure Deletion Function: Guarantees user can only delete if providing valid delete_token
CREATE OR REPLACE FUNCTION public.delete_share_securely(p_delete_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_storage_path text;
    target_id uuid;
BEGIN
    IF p_delete_token IS NULL OR length(trim(p_delete_token)) < 16 THEN
        RETURN false;
    END IF;

    SELECT id, storage_path INTO target_id, target_storage_path
    FROM public.file_shares
    WHERE delete_token = trim(p_delete_token)
    LIMIT 1;

    IF target_id IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Physically remove binary file from private storage bucket
    DELETE FROM storage.objects
    WHERE bucket_id = 'temporary-files'
      AND name = target_storage_path;

    -- 2. Mark database record as deleted
    UPDATE public.file_shares
    SET status = 'deleted'
    WHERE id = target_id;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_share_securely(text) TO anon, authenticated, service_role;

-- 4. If pg_cron is enabled, run auto-purge every minute
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('cleanup-expired-shares-every-minute');
        PERFORM cron.schedule(
            'cleanup-expired-shares-every-minute',
            '* * * * *',
            'SELECT public.cleanup_expired_file_shares();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
