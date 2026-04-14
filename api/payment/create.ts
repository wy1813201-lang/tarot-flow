import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const PLANS: Record<string, { price: number; uses: number; expireDays: number | null }> = {
  single: { price: 300, uses: 1, expireDays: null },
  weekly: { price: 1500, uses: 20, expireDays: 7 },
  monthly: { price: 3000, uses: 60, expireDays: 30 },
};

function signParams(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params).filter(k => k !== 'hash' && params[k]).sort();
  const str = sorted.map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('md5').update(str + secret).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { plan, userId } = req.body || {};
  if (!plan || !userId || !PLANS[plan]) {
    return res.status(400).json({ success: false, error: 'Invalid plan or userId' });
  }

  const appId = process.env.XUNHUPAY_APP_ID;
  const appSecret = process.env.XUNHUPAY_APP_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.APP_URL || 'https://starprophet.app';

  if (!appId || !appSecret) {
    return res.status(500).json({ success: false, error: 'Payment gateway not configured' });
  }

  const planInfo = PLANS[plan];
  const orderNo = `SP${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // Save pending order to Supabase
  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from('pending_orders').insert({
      user_id: userId,
      order_no: orderNo,
      plan,
      amount_cents: planInfo.price,
      status: 'pending',
    });
  }

  const params: Record<string, string> = {
    version: '1.1',
    appid: appId,
    trade_order_id: orderNo,
    total_fee: (planInfo.price / 100).toFixed(2),
    title: `星谶占卜 - ${{ single: '单次', weekly: '周卡', monthly: '月卡' }[plan]}`,
    time: Math.floor(Date.now() / 1000).toString(),
    notify_url: `${appUrl}/api/payment/callback`,
    return_url: `${appUrl}?payment=success`,
    nonce_str: crypto.randomBytes(16).toString('hex'),
  };

  params.hash = signParams(params, appSecret);

  try {
    const response = await fetch('https://api.xunhupay.com/payment/do.html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await response.json();

    if (data.errcode === 0 || data.url) {
      return res.json({
        success: true,
        data: {
          orderId: orderNo,
          payUrl: data.url || data.url_qrcode,
          qrCodeUrl: data.url_qrcode,
        },
      });
    }

    return res.status(400).json({ success: false, error: data.errmsg || 'Payment gateway error' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
}
