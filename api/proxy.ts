import type { VercelRequest, VercelResponse } from '@vercel/node';

const AI_API_KEY = process.env.AI_API_KEY!;
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_BASE_URL = 'https://api.minimaxi.com/v1';

function getProviderConfig(provider?: string) {
  if (provider === 'minimax' && MINIMAX_API_KEY) {
    return { apiKey: MINIMAX_API_KEY, baseUrl: MINIMAX_BASE_URL };
  }
  return { apiKey: AI_API_KEY, baseUrl: AI_BASE_URL };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { path = 'chat/completions', provider, ...body } = req.body;
  const { apiKey, baseUrl } = getProviderConfig(provider);

  try {
    const upstream = await fetch(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
