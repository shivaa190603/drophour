import type { Handler, HandlerEvent } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  const keyId = process.env.VITE_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  if (!keyId || !keySecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Razorpay credentials missing on server.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const amountInr = Number(body.amountInr) || 10;
    const orderCode = body.orderCode || `DH-${Date.now().toString().slice(-6)}`;
    const filename = body.filename || 'File Transfer';

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    // Create a dynamic Razorpay Payment Link
    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInr * 100, // amount in paise
        currency: 'INR',
        accept_partial: false,
        description: `DropHour ${orderCode} - ${filename.slice(0, 30)}`,
        reference_id: `dh_${orderCode}_${Date.now()}`,
        expire_by: Math.floor(Date.now() / 1000) + 20 * 60, // 20 mins expiry (safe for Razorpay 15-min minimum)
        upi_link: true,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('[Razorpay Link Error]', data);
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: data?.error?.description || 'Failed to create Razorpay link',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        paymentLinkId: data.id,
        paymentUrl: data.short_url,
        amountInr,
        orderCode,
      }),
    };
  } catch (err: any) {
    console.error('[Razorpay Exception]', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};
