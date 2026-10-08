import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'razorpay-dev-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/create-razorpay-order' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr || '{}');
                  const keyId = env.VITE_RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
                  const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

                  if (!keyId || !keySecret) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Razorpay credentials missing on server.' }));
                    return;
                  }

                  const amountInr = Number(body.amountInr) || 5;
                  const orderCode = body.orderCode || `DH-${Date.now().toString().slice(-6)}`;
                  const filename = body.filename || 'File Transfer';
                  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

                  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
                    method: 'POST',
                    headers: {
                      Authorization: `Basic ${auth}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      amount: amountInr * 100,
                      currency: 'INR',
                      accept_partial: false,
                      description: `DropHour ${orderCode} - ${filename.slice(0, 30)}`,
                      reference_id: `dh_${orderCode}_${Date.now()}`,
                      expire_by: Math.floor(Date.now() / 1000) + 20 * 60,
                      upi_link: true,
                    }),
                  });

                  const data = (await response.json()) as any;
                  res.statusCode = response.status;
                  res.setHeader('Content-Type', 'application/json');
                  if (!response.ok) {
                    res.end(JSON.stringify({ error: data?.error?.description || 'Failed to create Razorpay link' }));
                  } else {
                    res.end(
                      JSON.stringify({
                        success: true,
                        paymentLinkId: data.id,
                        paymentUrl: data.short_url,
                        amountInr,
                        orderCode,
                      })
                    );
                  }
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
                }
              });
              return;
            }

            if (req.url?.startsWith('/api/check-razorpay-status') && req.method === 'GET') {
              try {
                const urlObj = new URL(req.url, 'http://localhost');
                const paymentLinkId = urlObj.searchParams.get('id');
                const keyId = env.VITE_RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
                const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

                if (!paymentLinkId || !keyId || !keySecret) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Missing parameters or credentials.' }));
                  return;
                }

                const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
                const response = await fetch(
                  `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(paymentLinkId)}`,
                  {
                    headers: { Authorization: `Basic ${auth}` },
                  }
                );

                const data = (await response.json()) as any;
                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json');

                if (!response.ok) {
                  res.end(JSON.stringify({ error: data?.error?.description || 'Failed to check status' }));
                } else {
                  const isPaid = data.status === 'paid';
                  const paymentId = data.payments?.[0]?.payment_id || `pay_${data.id.slice(-10)}`;
                  res.end(
                    JSON.stringify({
                      isPaid,
                      status: data.status,
                      amountPaid: data.amount_paid ? data.amount_paid / 100 : 0,
                      paymentId: isPaid ? paymentId : null,
                    })
                  );
                }
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
              }
              return;
            }

            next();
          });
        },
      },
    ],
  };
});


