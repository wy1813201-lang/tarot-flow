import type { VercelRequest, VercelResponse } from '@vercel/node';

const AI_API_KEY = process.env.AI_API_KEY || process.env.VITE_AI_API_KEY || '';
const AI_BASE_URL = process.env.AI_BASE_URL || process.env.VITE_AI_BASE_URL || 'https://api.openai.com/v1';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || process.env.VITE_MINIMAX_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

function getProviderConfig(provider?: string) {
  if (provider === 'minimax') {
    return { apiKey: MINIMAX_API_KEY || AI_API_KEY, baseUrl: 'https://api.minimaxi.com/v1' };
  }
  if (provider === 'gemini') {
    // Gemini OpenAI compatible endpoint
    return { apiKey: GEMINI_API_KEY || AI_API_KEY, baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' };
  }
  return { apiKey: AI_API_KEY, baseUrl: AI_BASE_URL };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { path = 'chat/completions', provider, ...body } = req.body;
  const { apiKey, baseUrl } = getProviderConfig(provider);

  if (!apiKey) {
    return res.status(500).json({ error: `API key not configured for provider: ${provider || 'default'}` });
  }

  const upstreamUrl = `${baseUrl}/${path}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return res.status(upstream.status).json({
        error: `Upstream API error (${upstream.status})`,
        detail: errorText.slice(0, 500),
      });
    }

    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } finally {
        res.end();
      }
    } else {
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message, upstream: upstreamUrl });
  }
}
