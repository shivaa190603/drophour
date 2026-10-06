import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Intelligent parser for Indian Bank SMS alerts (YES Bank, PhonePe, SBI, HDFC, ICICI, Axis, Paytm Bank)
 */
function parseBankSms(smsText: string): {
  amountInr: number | null;
  utr: string | null;
  orderCode: string | null;
  isCredit: boolean;
} {
  const text = smsText || '';
  const lower = text.toLowerCase();

  // Verify that this is a credit notification (not a debit)
  const isCredit =
    lower.includes('credited') ||
    lower.includes('received') ||
    lower.includes('deposited') ||
    lower.includes('credit of');

  // Extract Amount in INR (e.g. "Rs 10.00", "INR 10", "Rs. 10", "₹10")
  let amountInr: number | null = null;
  const amountMatch = text.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(/,/g, '');
    const parsed = Math.round(parseFloat(rawNum));
    if (!isNaN(parsed) && parsed > 0) {
      amountInr = parsed;
    }
  }

  // Extract 12-digit UPI UTR / Reference number
  let utr: string | null = null;
  const utrPattern = /(?:UPI\s*Ref(?:\s*no\.?)?|UTR|Ref\s*No\.?|Ref(?:\s*ID)?|Txn\s*ID|Ref)[:\s]*(\d{12})/i;
  const utrMatch = text.match(utrPattern);
  if (utrMatch) {
    utr = utrMatch[1];
  } else {
    // Fallback: search for any standalone 12-digit number in the SMS
    const standaloneDigits = text.match(/\b\d{12}\b/);
    if (standaloneDigits) {
      utr = standaloneDigits[0];
    }
  }

  // Extract DropHour Order Code if present in remarks (e.g. "DH-849201")
  let orderCode: string | null = null;
  const orderMatch = text.match(/DH-\d{6}/i);
  if (orderMatch) {
    orderCode = orderMatch[0].toUpperCase();
  }

  return { amountInr, utr, orderCode, isCredit };
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  if (!supabase) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Supabase configuration missing on server.' }),
    };
  }

  try {
    let bodyData: any = {};
    try {
      bodyData = JSON.parse(event.body || '{}');
    } catch {
      // In case app sent raw plain text body
      bodyData = { message: event.body };
    }

    // Support common SMS forwarder payload fields: message, sms, text, body, or direct params
    const rawSms =
      bodyData.message ||
      bodyData.sms ||
      bodyData.text ||
      bodyData.body ||
      bodyData.content ||
      '';

    const directUtr = bodyData.utr || bodyData.reference;
    const directAmount = bodyData.amount ? parseInt(bodyData.amount, 10) : null;
    const directOrder = bodyData.order_code || bodyData.orderCode;

    // Parse the SMS text
    const parsed = parseBankSms(rawSms);

    const finalUtr = directUtr || parsed.utr;
    const finalAmount = directAmount || parsed.amountInr;
    const finalOrder = directOrder || parsed.orderCode;

    if (!finalUtr) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'No 12-digit UPI UTR found in SMS payload.',
          parsed,
        }),
      };
    }

    if (!finalAmount) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'No valid payment amount found in SMS payload.',
          parsed,
        }),
      };
    }

    console.log(`[DropHour Webhook] Matching Bank Credit: UTR=${finalUtr}, Amount=₹${finalAmount}, Order=${finalOrder || 'Auto-Match'}`);

    // Call stored procedure to match statement credit
    const { data: matchResult, error: matchError } = await supabase.rpc(
      'match_bank_statement_credit',
      {
        p_utr: finalUtr,
        p_amount_inr: finalAmount,
        p_order_code: finalOrder || null,
        p_payer_info: bodyData.sender || 'Automated Bank SMS',
      }
    );

    if (matchError) {
      console.warn('[DropHour Webhook] Stored procedure failed, performing direct match:', matchError);

      // Direct fallback matching
      let query = supabase
        .from('payment_orders')
        .update({
          status: 'verified',
          bank_ref_utr: finalUtr,
          verified_at: new Date().toISOString(),
        });

      if (finalOrder) {
        query = query.eq('order_code', finalOrder);
      } else {
        query = query.eq('status', 'pending').eq('amount_inr', finalAmount);
      }

      const { data: updatedOrders, error: _updateErr } = await query.select();

      // Also record in bank statement credits
      await supabase.from('bank_statement_credits').insert({
        utr: finalUtr,
        amount_inr: finalAmount,
        payer_info: bodyData.sender || 'Automated Bank SMS',
        raw_remark: rawSms.slice(0, 255),
        matched_order_code: finalOrder || (updatedOrders?.[0]?.order_code ?? null),
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Direct bank credit matched successfully.',
          utr: finalUtr,
          amount: finalAmount,
          matched_orders: updatedOrders?.length || 0,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        result: matchResult,
        utr: finalUtr,
        amount: finalAmount,
      }),
    };
  } catch (err: any) {
    console.error('[DropHour Webhook] Exception processing SMS:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};
