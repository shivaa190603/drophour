import type { Handler, HandlerEvent } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Use GET.' }),
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

  const paymentLinkId = event.queryStringParameters?.id;
  if (!paymentLinkId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing payment link ID parameter.' }),
    };
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const response = await fetch(
      `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(paymentLinkId)}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data?.error?.description || 'Failed to check status' }),
      };
    }

    const isPaid = data.status === 'paid';
    const paymentId = data.payments?.[0]?.payment_id || `pay_${data.id.slice(-10)}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isPaid,
        status: data.status,
        amountPaid: data.amount_paid ? data.amount_paid / 100 : 0,
        paymentId: isPaid ? paymentId : null,
      }),
    };
  } catch (err: any) {
    console.error('[Razorpay Status Exception]', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};
