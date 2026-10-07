-- ==============================================================================
-- DropHour Security Hardening: Direct API Upload Prevention (Fix 1)
-- Run this in Supabase SQL Editor to block unauthorized paid uploads
-- ==============================================================================

-- Stored Function: Strictly verify payment before allowing database insert
CREATE OR REPLACE FUNCTION public.enforce_strict_payment_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If file size is greater than 50 MB (Paid tier)
    IF NEW.file_size > 52428800 THEN
        -- 1. Must have a valid payment_id
        IF NEW.payment_id IS NULL OR length(trim(NEW.payment_id)) < 6 THEN
            RAISE EXCEPTION 'Security Alert: Paid upload rejected. Missing payment ID.';
        END IF;

        -- 2. Payment ID must exist and be marked 'verified' in payment_orders
        IF NOT EXISTS (
            SELECT 1 FROM public.payment_orders
            WHERE (order_code = NEW.payment_id OR bank_ref_utr = NEW.payment_id)
              AND status = 'verified'
              AND amount_inr >= NEW.amount_paid_inr
        ) THEN
            RAISE EXCEPTION 'Security Alert: Payment verification failed in bank/Razorpay records.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop any previous trigger and attach strictly to file_shares
DROP TRIGGER IF EXISTS trg_strict_payment_check ON public.file_shares;
CREATE TRIGGER trg_strict_payment_check
    BEFORE INSERT ON public.file_shares
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_strict_payment_verification();
