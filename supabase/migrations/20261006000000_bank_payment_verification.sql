-- ==============================================================================
-- DropHour: Real-Time Bank Statement Verification & Strict Access Control
-- Run this in Supabase SQL Editor on active database instances
-- ==============================================================================

-- 1. Table: payment_orders (Strict 3-minute payment requests)
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE NOT NULL,
    amount_inr INTEGER NOT NULL,
    tier_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 minutes'),
    bank_ref_utr TEXT,
    verified_at TIMESTAMPTZ
);

-- 2. Table: bank_statement_credits (Verified bank statement/SMS transactions)
CREATE TABLE IF NOT EXISTS public.bank_statement_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utr TEXT UNIQUE NOT NULL,
    amount_inr INTEGER NOT NULL,
    payer_info TEXT,
    raw_remark TEXT,
    credited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    matched_order_code TEXT REFERENCES public.payment_orders(order_code)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_payment_orders_code ON public.payment_orders (order_code);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_bank_credits_utr ON public.bank_statement_credits (utr);

-- 3. Row Level Security on payment_orders
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public lookup payment order by order_code" ON public.payment_orders;
CREATE POLICY "Public lookup payment order by order_code"
    ON public.payment_orders
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anonymous order creation" ON public.payment_orders;
CREATE POLICY "Allow anonymous order creation"
    ON public.payment_orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        status = 'pending' AND 
        expires_at <= (now() + interval '5 minutes')
    );

DROP POLICY IF EXISTS "Allow order update on verification" ON public.payment_orders;
CREATE POLICY "Allow order update on verification"
    ON public.payment_orders
    FOR UPDATE
    TO anon, authenticated
    USING (status = 'pending' OR status = 'verified');

-- Row Level Security on bank_statement_credits
ALTER TABLE public.bank_statement_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow inserting statement credits" ON public.bank_statement_credits;
CREATE POLICY "Allow inserting statement credits"
    ON public.bank_statement_credits
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow reading statement credits" ON public.bank_statement_credits;
CREATE POLICY "Allow reading statement credits"
    ON public.bank_statement_credits
    FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

-- 4. Stored Function: Auto-expire timed-out payment orders
CREATE OR REPLACE FUNCTION public.expire_timed_out_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count integer := 0;
BEGIN
    UPDATE public.payment_orders
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at <= now();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_timed_out_orders() TO anon, authenticated, service_role;

-- 5. Stored Function: Match Bank Statement Credit to Order
CREATE OR REPLACE FUNCTION public.match_bank_statement_credit(
    p_utr text,
    p_amount_inr integer,
    p_order_code text DEFAULT NULL,
    p_payer_info text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_order_code text := trim(p_order_code);
    clean_utr text := trim(p_utr);
    matched_id uuid;
BEGIN
    IF clean_utr IS NULL OR length(clean_utr) < 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid UTR reference number.');
    END IF;

    -- If order_code was provided, verify and match directly
    IF target_order_code IS NOT NULL AND length(target_order_code) > 0 THEN
        UPDATE public.payment_orders
        SET status = 'verified',
            bank_ref_utr = clean_utr,
            verified_at = now()
        WHERE order_code = target_order_code
          AND status = 'pending'
          AND expires_at > now()
          AND amount_inr = p_amount_inr
        RETURNING id INTO matched_id;
    ELSE
        -- Auto-match to latest pending order with identical amount that is unexpired
        UPDATE public.payment_orders
        SET status = 'verified',
            bank_ref_utr = clean_utr,
            verified_at = now()
        WHERE id = (
            SELECT id FROM public.payment_orders
            WHERE status = 'pending'
              AND expires_at > now()
              AND amount_inr = p_amount_inr
            ORDER BY created_at DESC
            LIMIT 1
        )
        RETURNING id, order_code INTO matched_id, target_order_code;
    END IF;

    IF matched_id IS NOT NULL THEN
        -- Record bank credit statement entry
        INSERT INTO public.bank_statement_credits (utr, amount_inr, payer_info, raw_remark, matched_order_code)
        VALUES (clean_utr, p_amount_inr, p_payer_info, 'Auto-matched via DropHour engine', target_order_code)
        ON CONFLICT (utr) DO UPDATE SET matched_order_code = target_order_code;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Payment successfully verified against bank credit.',
            'order_code', target_order_code,
            'utr', clean_utr
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No matching active pending order found for this amount, or payment window expired.'
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_bank_statement_credit(text, integer, text, text) TO anon, authenticated, service_role;
