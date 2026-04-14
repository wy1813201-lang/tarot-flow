import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const PLAN_CONFIG: Record<string, { uses: number; expireDays: number | null }> = {
  single: { uses: 1, expireDays: null },
  weekly: { uses: 20, expireDays: 7 },
  monthly: { uses: 60, expireDays: 30 },
};

function verifySign(params: Record<string, string>, secret: string): boolean {
  const hash = params.hash;
  if (!hash) return false;
  const sorted = Object.keys(params).filter(k => k !== 'hash' && params[k]).sort();
  const str = sorted.map(k => `${k}=${params[k]}`).join('&');
  const expected = crypto.createHash('md5').update(str + secret).digest('hex');
  return hash === expected;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const params = req.method === 'POST' ? req.body : req.query;
  const appSecret = process.env.XUNHUPAY_APP_SECRET;

  if (!appSecret || !verifySign(params, appSecret)) {
    return res.status(403).send('Invalid signature');
  }

  const orderNo = params.trade_order_id;
  const status = params.status;

  if (status !== 'OD') {
    return res.send('success'); // Not paid yet, acknowledge receipt
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).send('Database not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find pending order (idempotency check)
  const { data: order } = await supabase
    .from('pending_orders')
    .select('*')
    .eq('order_no', orderNo)
    .single();

  if (!order) return res.send('success'); // Unknown order, acknowledge anyway
  if (order.status === 'paid') return res.send('success'); // Already processed

  const config = PLAN_CONFIG[order.plan];
  if (!config) return res.send('success');

  const expiresAt = config.expireDays
    ? new Date(Date.now() + config.expireDays * 86400000).toISOString()
    : null;

  // Credit subscription
  await supabase.from('subscriptions').insert({
    user_id: order.user_id,
    plan: order.plan,
    uses_remaining: config.uses,
    expires_at: expiresAt,
    order_no: orderNo,
  });

  // Mark order as paid
  await supabase
    .from('pending_orders')
    .update({ status: 'paid' })
    .eq('id', order.id);

  return res.send('success');
}
