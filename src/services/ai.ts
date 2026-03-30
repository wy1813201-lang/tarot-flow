import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { TarotReading } from "../types/reading";

// ===================== Provider Config =====================
type AIProvider = 'gemini' | 'openai';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  modelLight: string;
}

function getConfig(): AIConfig {
  const provider = (import.meta.env.VITE_AI_PROVIDER || 'gemini') as AIProvider;
  const apiKey = import.meta.env.VITE_AI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || 'proxy';
  // On Vercel, OpenAI calls go through /api/proxy — no client-side key needed.

  const defaults: Record<AIProvider, { baseUrl: string; model: string; modelLight: string }> = {
    gemini: { baseUrl: '', model: 'gemini-2.5-pro-preview-05-06', modelLight: 'gemini-2.0-flash' },
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', modelLight: 'gpt-4o-mini' },
  };
  const d = defaults[provider] || defaults.openai;

  return {
    provider,
    apiKey,
    baseUrl: import.meta.env.VITE_AI_BASE_URL || d.baseUrl,
    model: import.meta.env.VITE_AI_MODEL || d.model,
    modelLight: import.meta.env.VITE_AI_MODEL_LIGHT || d.modelLight,
  };
}

// ===================== Shared Types & Prompts =====================
export interface TarotReadingInput {
  question: string;
  spreadType: string;
  isStrictMode?: boolean;
  positions: { name: string; card: string; orientation: string; keywords: string[] }[];
}

const MAIN_PROMPT = (input: TarotReadingInput) => `你是一位资深的塔罗占卜导师。请根据以下信息进行极其详尽、专业的深度解读：
问题：${input.question}
牌阵：${input.spreadType}
${input.isStrictMode ? "【严格模式】：本次占卜结果具有唯一性，请给出最权威、最不容置疑的深度剖析。" : ""}

牌面详情：
${input.positions.map((p, i) => `位置 ${i + 1} (${p.name}): ${p.card} (${p.orientation === 'upright' ? '正位' : '逆位'}) - 关键词: ${p.keywords.join(', ')}`).join('\n')}

解读要求（请务必严格执行）：
1. 提供一份内容详实、洞察深刻、逻辑严密的塔罗深度分析报告，总字数不少于500字。
2. 紧密结合每张牌的关键词，详细推演其在特定位置上的深远影响。
3. 深入挖掘心理映射、现实显化、动态关联分析。
4. 严禁使用"可能""也许""大概"等模糊词汇。
5. 提供至少3条具体行动建议、心态转变建议、危机预警。
6. 在报告结尾提炼出一个最关键的行动指南。`;

const JSON_FORMAT_INSTRUCTION = `
请严格按照以下 JSON 格式返回（不要包含 markdown 代码块标记）：
{
  "summary": "简版结论/总评",
  "detailedInterpretations": [{"position": "位置名", "card": "牌名", "meaning": "详细解读"}],
  "overallTrend": "整体趋势分析",
  "suggestions": {"actionableSteps": "具体行动建议", "mindsetShift": "心态调整建议", "warningSigns": "潜在风险/警示"},
  "finalAdvice": "核心建议"
}`;

const SUPPLEMENTARY_PROMPT = (input: { question: string; card: string; orientation: string; keywords: string[] }) =>
  `你是一位塔罗占卜师。针对问题"${input.question}"，用户补抽了一张牌：${input.card}（${input.orientation === 'upright' ? '正位' : '逆位'}），关键词：${input.keywords.join('、')}。请用2-3句话给出简洁有力的补充建议，不要使用"可能""也许"等模糊词汇。`;

// ===================== Gemini Schema =====================
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    detailedInterpretations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { position: { type: Type.STRING }, card: { type: Type.STRING }, meaning: { type: Type.STRING } } } },
    overallTrend: { type: Type.STRING },
    suggestions: { type: Type.OBJECT, properties: { actionableSteps: { type: Type.STRING }, mindsetShift: { type: Type.STRING }, warningSigns: { type: Type.STRING } }, required: ["actionableSteps", "mindsetShift", "warningSigns"] },
    finalAdvice: { type: Type.STRING }
  },
  required: ["summary", "detailedInterpretations", "overallTrend", "suggestions", "finalAdvice"]
};

// ===================== Parse =====================
function parseAIResponse(text: string): TarotReading {
  try {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    return JSON.parse(jsonStr.trim());
  } catch {
    console.error("Failed to parse AI response:", text);
    throw new Error("AI 解读解析失败，请重试。");
  }
}

// ===================== OpenAI-Compatible Provider =====================
function getOpenAIEndpoint(cfg: AIConfig): { url: string; headers: Record<string, string> } {
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocal) {
    return { url: `${cfg.baseUrl}/chat/completions`, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` } };
  }
  return { url: '/api/proxy', headers: { 'Content-Type': 'application/json' } };
}

async function callOpenAI(cfg: AIConfig, model: string, prompt: string, jsonMode: boolean): Promise<string> {
  const messages = [
    { role: 'system', content: '你是一位资深的塔罗占卜导师。' + (jsonMode ? JSON_FORMAT_INSTRUCTION : '') },
    { role: 'user', content: prompt },
  ];
  const { url, headers } = getOpenAIEndpoint(cfg);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, ...(jsonMode ? { response_format: { type: 'json_object' } } : {}) }),
  });
  if (!res.ok) throw new Error(`AI 请求失败 (${res.status})`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenAIStream(cfg: AIConfig, model: string, prompt: string, jsonMode: boolean, onProgress: (s: string) => void): Promise<string> {
  const messages = [
    { role: 'system', content: '你是一位资深的塔罗占卜导师。' + (jsonMode ? JSON_FORMAT_INSTRUCTION : '') },
    { role: 'user', content: prompt },
  ];
  const { url, headers } = getOpenAIEndpoint(cfg);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, stream: true, ...(jsonMode ? { response_format: { type: 'json_object' } } : {}) }),
  });
  if (!res.ok) throw new Error(`AI 请求失败 (${res.status})`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      try {
        const json = JSON.parse(line.slice(6));
        accumulated += json.choices?.[0]?.delta?.content || '';
      } catch { /* skip malformed chunks */ }
    }
    const len = accumulated.length;
    if (len < 200) onProgress("正在分析牌面...");
    else if (len < 600) onProgress("正在解读关联...");
    else if (len < 1200) onProgress("正在生成建议...");
    else onProgress("即将完成...");
  }
  return accumulated;
}

// ===================== Gemini Provider =====================
function getGeminiClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

async function callGemini(cfg: AIConfig, model: string, prompt: string): Promise<string> {
  const ai = getGeminiClient(cfg.apiKey);
  const response = await ai.models.generateContent({
    model, contents: prompt,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA }
  });
  if (!response.text) throw new Error("AI 返回内容为空，请重试。");
  return response.text;
}

async function callGeminiStream(cfg: AIConfig, model: string, prompt: string, onProgress: (s: string) => void): Promise<string> {
  const ai = getGeminiClient(cfg.apiKey);
  const response = await ai.models.generateContentStream({
    model, contents: prompt,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA }
  });
  let accumulated = '';
  for await (const chunk of response) {
    accumulated += chunk.text || '';
    const len = accumulated.length;
    if (len < 200) onProgress("正在分析牌面...");
    else if (len < 600) onProgress("正在解读关联...");
    else if (len < 1200) onProgress("正在生成建议...");
    else onProgress("即将完成...");
  }
  return accumulated;
}

async function callGeminiLight(cfg: AIConfig, model: string, prompt: string): Promise<string> {
  const ai = getGeminiClient(cfg.apiKey);
  const response = await ai.models.generateContent({ model, contents: prompt });
  return response.text || "暂无补充建议";
}

// ===================== Public API =====================
export async function interpretTarot(input: TarotReadingInput): Promise<TarotReading> {
  const cfg = getConfig();
  const prompt = MAIN_PROMPT(input);
  const text = cfg.provider === 'gemini'
    ? await callGemini(cfg, cfg.model, prompt)
    : await callOpenAI(cfg, cfg.model, prompt, true);
  return parseAIResponse(text);
}

export async function interpretTarotStream(input: TarotReadingInput, onProgress: (stage: string) => void): Promise<TarotReading> {
  const cfg = getConfig();
  onProgress("正在连接灵感...");
  const prompt = MAIN_PROMPT(input);
  const text = cfg.provider === 'gemini'
    ? await callGeminiStream(cfg, cfg.model, prompt, onProgress)
    : await callOpenAIStream(cfg, cfg.model, prompt, true, onProgress);
  onProgress("解读完成");
  return parseAIResponse(text);
}

export async function interpretSupplementary(input: {
  question: string; card: string; orientation: string; keywords: string[];
}): Promise<{ summary: string }> {
  const cfg = getConfig();
  const prompt = SUPPLEMENTARY_PROMPT(input);
  const text = cfg.provider === 'gemini'
    ? await callGeminiLight(cfg, cfg.modelLight, prompt)
    : await callOpenAI(cfg, cfg.modelLight, prompt, false);
  return { summary: text || "暂无补充建议" };
}

