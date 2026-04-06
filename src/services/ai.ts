import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { TarotReading } from "../types/reading";

// ===================== Provider Config =====================
type AIProvider = 'gemini' | 'openai' | 'minimax';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  modelLight: string;
}

function inferProvider(modelId: string): AIProvider {
  if (modelId.startsWith('gemini')) return 'gemini';
  if (modelId.startsWith('MiniMax') || modelId.startsWith('minimax')) return 'minimax';
  return 'openai';
}

function getConfig(): AIConfig {
  // User-selected model from Settings UI takes priority
  let userModel: string | null = null;
  try { userModel = localStorage.getItem('tarot_model'); } catch { /* SSR safe */ }

  const envProvider = (import.meta.env.VITE_AI_PROVIDER || 'gemini') as AIProvider;
  const provider: AIProvider = userModel ? inferProvider(userModel) : envProvider;

  const apiKey = import.meta.env.VITE_AI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || 'proxy';

  const defaults: Record<AIProvider, { baseUrl: string; model: string; modelLight: string }> = {
    gemini: { baseUrl: '', model: 'gemini-2.5-pro-preview-05-06', modelLight: 'gemini-2.0-flash' },
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', modelLight: 'gpt-4o-mini' },
    minimax: { baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M2.5', modelLight: 'MiniMax-M2.5' },
  };
  const d = defaults[provider] || defaults.openai;

  return {
    provider,
    apiKey,
    // When user explicitly selected a model, use that provider's default baseUrl
    // instead of env var (which may belong to a different provider)
    baseUrl: userModel ? d.baseUrl : (import.meta.env.VITE_AI_BASE_URL || d.baseUrl),
    model: userModel || import.meta.env.VITE_AI_MODEL || d.model,
    // When user explicitly selected a model, use that provider's default light model
    // instead of env var (which may belong to a different provider)
    modelLight: userModel ? d.modelLight : (import.meta.env.VITE_AI_MODEL_LIGHT || d.modelLight),
  };
}

// ===================== Shared Types & Prompts =====================
export interface TarotReadingInput {
  question: string;
  spreadType: string;
  isStrictMode?: boolean;
  positions: { name: string; card: string; orientation: string; keywords: string[] }[];
}

const MAIN_PROMPT = (input: TarotReadingInput) => `你是一位资深的塔罗占卜导师。请根据以下信息进行专业深度解读：
问题：${input.question}
牌阵：${input.spreadType}
${input.isStrictMode ? "【严格模式】：给出最权威、最确定的深度剖析，结论不容置疑。" : ""}

牌面详情：
${input.positions.map((p, i) => `位置 ${i + 1} (${p.name}): ${p.card} (${p.orientation === 'upright' ? '正位' : '逆位'}) - 关键词: ${p.keywords.join(', ')}`).join('\n')}

解读要求：
1. 必须将抽到的每一张牌都纳入解读。结合牌面图像特征（如神态、动作、象征符号）和正逆位，深度推断其在此位置传递的明确信息。
2. 强化牌面联系：不要孤立地看单张牌，必须分析多张牌面之间的内在联系、能量流动或矛盾冲突，给出全局观。
3. 禁止使用"可能""也许""大概"等模糊词汇，给出具有洞察力和确定性的专业判断。
4. 提供具体且有针对性的行动建议、心态调整方向以及需警惕的风险。
5. 提炼一句最核心的行动指南作为结尾。`;

const JSON_FORMAT_INSTRUCTION = `
请严格按照以下 JSON 格式返回（不要包含 markdown 代码块标记）：
{
  "summary": "简版结论/总评",
  "detailedInterpretations": [{"position": "位置名", "card": "牌名", "meaning": "详细解读"}],
  "overallTrend": "整体趋势分析",
  "suggestions": {"actionableSteps": "具体行动建议", "mindsetShift": "心态调整建议", "warningSigns": "潜在风险/警示"},
  "finalAdvice": "核心建议"
}`;

const SUPPLEMENTARY_PROMPT = (input: { question: string; card: string; orientation: string; keywords: string[] }) => {
  const orientation = input.orientation === 'upright' ? '正位' : '逆位';
  const keywordStr = input.keywords.join('、');
  return `你是一位资深的塔罗占卜师。针对问题"${input.question}"，用户补抽了一张牌：${input.card}（${orientation}），关键词：${keywordStr}。

直接基于这张牌的含义给出2-3句建议，不要包含任何思考过程或分析过程。要求：
1. 直接给出建议，不使用"可能""也许""大概"等模糊词汇
2. 不要解释为什么这张牌代表什么，直接说明它对问题的启示
3. 给出明确的行动指导或心态调整方向
4. 语气要像一位经验丰富的占卜师，充满确定性和洞察力`;
};

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
function extractFirstJSON(text: string): string {
  // Find the first { and its matching } by tracking brace depth
  const start = text.indexOf('{');
  if (start === -1) return text;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  // Unclosed — return from start and try to fix
  return text.slice(start);
}

function tryFixTruncatedJSON(str: string): string {
  let fixed = str.trim();
  const unescapedQuotes = fixed.match(/(?<!\\)"/g);
  if (unescapedQuotes && unescapedQuotes.length % 2 !== 0) fixed += '"';
  const opens = (fixed.match(/\{/g) || []).length;
  const closes = (fixed.match(/\}/g) || []).length;
  for (let i = 0; i < opens - closes; i++) fixed += '}';
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;
  for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
  return fixed;
}

function mergeFragmentedJSON(text: string): Record<string, unknown> | null {
  // Handle cases where AI outputs {obj1},{obj2} as separate fragments
  // Try to merge them into one object
  try {
    const wrapped = '[' + text + ']';
    const arr = JSON.parse(wrapped);
    if (Array.isArray(arr)) {
      return arr.reduce((merged, item) => ({ ...merged, ...item }), {});
    }
  } catch { /* not mergeable */ }
  return null;
}

// Normalize parsed AI response: some models (e.g. MiniMax) return arrays
// instead of strings for suggestions fields — join them into strings.
function normalizeReading(obj: Record<string, unknown>): TarotReading {
  const s = obj.suggestions as Record<string, unknown> | undefined;
  if (s) {
    for (const key of ['actionableSteps', 'mindsetShift', 'warningSigns'] as const) {
      if (Array.isArray(s[key])) {
        s[key] = (s[key] as string[]).join('\n');
      }
    }
  }
  return obj as unknown as TarotReading;
}

function parseAIResponse(text: string): TarotReading {
  // Strip <think>...</think> blocks (some models output thinking process)
  // Also handle unclosed <think> tags (no closing </think>)
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*/g, '')
    .trim();

  if (!cleaned) {
    throw new Error("AI 返回内容为空，请重试。");
  }

  // Extract content from markdown code blocks like ```json ... ```
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1].trim() : cleaned;

  // Extract the first complete JSON object (proper brace matching)
  const jsonStr = extractFirstJSON(raw);

  // Attempt 1: direct parse
  try { return normalizeReading(JSON.parse(jsonStr)); } catch { /* continue */ }

  // Attempt 2: fix truncated JSON (unclosed quotes/braces)
  try { return normalizeReading(JSON.parse(tryFixTruncatedJSON(jsonStr))); } catch { /* continue */ }

  // Attempt 3: merge fragmented objects like {main},{extra}
  const allObjects = raw.match(/\{[\s\S]*\}/)?.[0];
  if (allObjects) {
    const merged = mergeFragmentedJSON(allObjects);
    if (merged) return normalizeReading(merged as Record<string, unknown>);
    // Also try fixing then merging
    const fixed = tryFixTruncatedJSON(allObjects);
    const mergedFixed = mergeFragmentedJSON(fixed);
    if (mergedFixed) return normalizeReading(mergedFixed as Record<string, unknown>);
  }

  throw new Error("AI 解读解析失败，请重试。");
}

// ===================== OpenAI-Compatible Provider =====================
function getOpenAIEndpoint(cfg: AIConfig): { url: string; headers: Record<string, string> } {
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocal) {
    return { url: `${cfg.baseUrl}/chat/completions`, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` } };
  }
  return { url: '/api/proxy', headers: { 'Content-Type': 'application/json' } };
}

function getProviderHint(cfg: AIConfig): string {
  return cfg.provider === 'minimax' ? 'minimax' : 'openai';
}

async function callOpenAI(cfg: AIConfig, model: string, prompt: string, jsonMode: boolean): Promise<string> {
  const isMinimax = cfg.provider === 'minimax';
  const messages = [
    { role: 'system', content: '你是一位资深的塔罗占卜导师。不要输出思考过程，直接输出结果。' + (jsonMode ? JSON_FORMAT_INSTRUCTION : '') },
    { role: 'user', content: prompt },
  ];
  const { url, headers } = getOpenAIEndpoint(cfg);
  const providerHint = getProviderHint(cfg);
  // MiniMax does not support response_format: json_object
  const body: Record<string, unknown> = { model, messages, provider: providerHint };
  if (jsonMode && !isMinimax) body.response_format = { type: 'json_object' };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`AI 请求失败 (${res.status}): ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenAIStream(cfg: AIConfig, model: string, prompt: string, jsonMode: boolean, onProgress: (s: string) => void): Promise<string> {
  const isMinimax = cfg.provider === 'minimax';
  const messages = [
    { role: 'system', content: '你是一位资深的塔罗占卜导师。不要输出思考过程，直接输出结果。' + (jsonMode ? JSON_FORMAT_INSTRUCTION : '') },
    { role: 'user', content: prompt },
  ];
  const { url, headers } = getOpenAIEndpoint(cfg);
  const providerHint = getProviderHint(cfg);
  // MiniMax does not support response_format: json_object
  const body: Record<string, unknown> = { model, messages, stream: true, provider: providerHint };
  if (jsonMode && !isMinimax) body.response_format = { type: 'json_object' };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`AI 请求失败 (${res.status}): ${errBody.slice(0, 200)}`);
  }

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
        const content = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
        accumulated += content;
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

// Only "pro" models benefit from thinking; flash models skip it for speed
function geminiThinkingConfig(model: string) {
  const isPro = model.includes('pro') || model.includes('2.5');
  return isPro
    ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    : {};
}

async function callGemini(cfg: AIConfig, model: string, prompt: string): Promise<string> {
  const ai = getGeminiClient(cfg.apiKey);
  const response = await ai.models.generateContent({
    model, contents: prompt,
    config: { ...geminiThinkingConfig(model), responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA }
  });
  if (!response.text) throw new Error("AI 返回内容为空，请重试。");
  return response.text;
}

async function callGeminiStream(cfg: AIConfig, model: string, prompt: string, onProgress: (s: string) => void): Promise<string> {
  const ai = getGeminiClient(cfg.apiKey);
  const response = await ai.models.generateContentStream({
    model, contents: prompt,
    config: { ...geminiThinkingConfig(model), responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA }
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
    : await callOpenAI(cfg, cfg.model, prompt, true); // minimax uses OpenAI-compatible API
  return parseAIResponse(text);
}

export async function interpretTarotStream(input: TarotReadingInput, onProgress: (stage: string) => void): Promise<TarotReading> {
  const cfg = getConfig();
  onProgress("正在连接灵感...");
  const prompt = MAIN_PROMPT(input);
  const text = cfg.provider === 'gemini'
    ? await callGeminiStream(cfg, cfg.model, prompt, onProgress)
    : await callOpenAIStream(cfg, cfg.model, prompt, true, onProgress); // minimax uses OpenAI-compatible API
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
    : await callOpenAI(cfg, cfg.modelLight, prompt, false); // minimax uses OpenAI-compatible API

  // Strip <think>...</think> blocks from the response
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*/g, '')
    .trim();

  return { summary: cleaned || "暂无补充建议" };
}

