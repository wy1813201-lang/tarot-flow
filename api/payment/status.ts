import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const orderId = req.query.orderId as string;
  if (!orderId) return res.status(400).json({ success: false, error: 'Missing orderId' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ success: false, error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: order } = await supabase
    .from('pending_orders')
    .select('status')
    .eq('order_no', orderId)
    .single();

  return res.json({
    success: true,
    data: { paid: order?.status === 'paid' },
  });
}
