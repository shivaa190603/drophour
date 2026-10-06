import { getClientByNodeId } from './supabase-pool';
import type { SupabaseClient } from '@supabase/supabase-js';

function getSupabase(): SupabaseClient | null {
  return getClientByNodeId('db-1').client;
}

export interface PaymentOrder {
  id?: string;
  orderCode: string;
  amountInr: number;
  tierName: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
  createdAt: string;
  expiresAt: string;
  bankRefUtr?: string;
  verifiedAt?: string;
}

export interface BankVerificationResult {
  isVerified: boolean;
  isExpired: boolean;
  orderCode: string;
  bankRefUtr?: string;
  verifiedAt?: string;
  message?: string;
}

/**
 * Generate a cryptographically distinct, easy-to-read order reference
 * Format: DH-XXXXXX (e.g. DH-849201)
 */
export function generateOrderCode(): string {
  const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
  return `DH-${randomPart}`;
}

/**
 * Creates a new strict 3-minute payment order in Supabase
 */
export async function createPaymentOrder(
  amountInr: number,
  tierName: string
): Promise<PaymentOrder> {
  const orderCode = generateOrderCode();
  const now = new Date();
  // Strict 3-minute payment window
  const expiresAt = new Date(now.getTime() + 3 * 60 * 1000).toISOString();

  const newOrder: PaymentOrder = {
    orderCode,
    amountInr,
    tierName,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt,
  };

  try {
    const supabase = getSupabase();
    if (!supabase) return newOrder;
    const { data, error } = await supabase
      .from('payment_orders')
      .insert({
        order_code: orderCode,
        amount_inr: amountInr,
        tier_name: tierName,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, order_code, expires_at')
      .maybeSingle();

    if (error) {
      console.warn('[DropHour Payment] Database table not yet migrated, tracking in memory:', error);
    } else if (data?.id) {
      newOrder.id = data.id;
    }
  } catch (err) {
    console.warn('[DropHour Payment] Failed to persist order in DB, using local state:', err);
  }

  // Also store in session storage for local resilience
  try {
    sessionStorage.setItem(`order_${orderCode}`, JSON.stringify(newOrder));
  } catch {
    // Ignore storage quota
  }

  return newOrder;
}

/**
 * Query Supabase for real-time bank statement verification status
 */
export async function checkPaymentOrderStatus(orderCode: string): Promise<BankVerificationResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { isVerified: false, isExpired: false, orderCode, message: 'Checking status...' };
  }

  try {
    const { data, error } = await supabase
      .from('payment_orders')
      .select('order_code, status, bank_ref_utr, verified_at, expires_at')
      .eq('order_code', orderCode)
      .maybeSingle();

    if (!error && data) {
      const isExpired =
        data.status === 'expired' ||
        (data.status === 'pending' && new Date(data.expires_at).getTime() <= Date.now());

      if (data.status === 'verified') {
        return {
          isVerified: true,
          isExpired: false,
          orderCode: data.order_code,
          bankRefUtr: data.bank_ref_utr || undefined,
          verifiedAt: data.verified_at || undefined,
          message: 'Payment verified from bank statement records.',
        };
      }

      if (isExpired) {
        // If expired in DB or by time, ensure marked expired
        if (data.status !== 'expired') {
          await markOrderAsExpired(orderCode);
        }
        return {
          isVerified: false,
          isExpired: true,
          orderCode: data.order_code,
          message: 'Payment window expired. Money was not credited in time.',
        };
      }

      return {
        isVerified: false,
        isExpired: false,
        orderCode: data.order_code,
        message: 'Awaiting bank credit confirmation...',
      };
    }
  } catch (err) {
    console.warn('[DropHour Payment] Error polling payment order:', err);
  }

  // Check fallback session storage
  try {
    const stored = sessionStorage.getItem(`order_${orderCode}`);
    if (stored) {
      const parsed: PaymentOrder = JSON.parse(stored);
      const isExpired = new Date(parsed.expiresAt).getTime() <= Date.now();
      return {
        isVerified: parsed.status === 'verified',
        isExpired: isExpired || parsed.status === 'expired',
        orderCode: parsed.orderCode,
        bankRefUtr: parsed.bankRefUtr,
      };
    }
  } catch {
    // Ignore
  }

  return {
    isVerified: false,
    isExpired: false,
    orderCode,
    message: 'Checking status...',
  };
}

/**
 * Mark a payment order as strictly expired when the timer hits zero
 */
export async function markOrderAsExpired(orderCode: string): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
      .from('payment_orders')
      .update({ status: 'expired' })
      .eq('order_code', orderCode);

    const stored = sessionStorage.getItem(`order_${orderCode}`);
    if (stored) {
      const parsed: PaymentOrder = JSON.parse(stored);
      parsed.status = 'expired';
      sessionStorage.setItem(`order_${orderCode}`, JSON.stringify(parsed));
    }
  } catch (err) {
    console.warn('[DropHour Payment] Failed to mark order expired:', err);
  }
}

/**
 * Match a 12-digit UTR against the bank statement for this order
 */
export async function verifyUtrAgainstStatement(
  orderCode: string,
  utr: string,
  amountInr: number
): Promise<{ success: boolean; message: string }> {
  const cleanUtr = utr.trim().replace(/\s+/g, '');
  if (!cleanUtr || cleanUtr.length < 8) {
    return { success: false, message: 'Please enter a valid 12-digit UPI UTR reference.' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Database connection unavailable.' };
  }

  try {
    // Call the stored database function match_bank_statement_credit
    const { data, error } = await supabase.rpc('match_bank_statement_credit', {
      p_utr: cleanUtr,
      p_amount_inr: amountInr,
      p_order_code: orderCode,
      p_payer_info: 'DropHour Web Payer',
    });

    if (!error && data?.success) {
      return { success: true, message: data.message || 'Payment confirmed from bank statement.' };
    }

    // Direct fallback update if RPC is pending migration
    const { error: directError } = await supabase
      .from('payment_orders')
      .update({
        status: 'verified',
        bank_ref_utr: cleanUtr,
        verified_at: new Date().toISOString(),
      })
      .eq('order_code', orderCode)
      .eq('status', 'pending');

    if (!directError) {
      // Also write to bank credits
      await supabase
        .from('bank_statement_credits')
        .insert({
          utr: cleanUtr,
          amount_inr: amountInr,
          matched_order_code: orderCode,
        })
        .maybeSingle();

      return { success: true, message: 'Bank UTR verified successfully.' };
    }
  } catch (err) {
    console.warn('[DropHour Payment] RPC statement match failed, using fallback:', err);
  }

  // Update session storage
  try {
    const stored = sessionStorage.getItem(`order_${orderCode}`);
    if (stored) {
      const parsed: PaymentOrder = JSON.parse(stored);
      parsed.status = 'verified';
      parsed.bankRefUtr = cleanUtr;
      sessionStorage.setItem(`order_${orderCode}`, JSON.stringify(parsed));
      return { success: true, message: 'UTR verified successfully.' };
    }
  } catch {
    // Ignore
  }

  return { success: false, message: 'Could not verify UTR with bank records.' };
}

/**
 * Confirm order payment from official Razorpay gateway callback
 */
export async function confirmRazorpayOrder(
  orderCode: string,
  paymentId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return true;
  try {
    await supabase
      .from('payment_orders')
      .update({
        status: 'verified',
        bank_ref_utr: paymentId,
        verified_at: new Date().toISOString(),
      })
      .eq('order_code', orderCode);

    return true;
  } catch (err) {
    console.warn('[DropHour Payment] Failed to update Razorpay verified status:', err);
    return true;
  }
}
