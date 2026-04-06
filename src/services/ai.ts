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
    minimax: { baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M2.7', modelLight: 'MiniMax-M2.5' },
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

const SYSTEM_PROMPT = `你是一位兼修韦特塔罗与荣格心理学的资深占卜导师，拥有20年实战经验。你的解读风格：洞察犀利、斩钉截铁、文字优美且极具画面感。

## 解读铁律
1. **牌面图像分析**：每张牌的解读必须从其经典韦特牌面图像入手——描述画面中人物的姿态、神情、手持之物、背景场景中的象征符号（如水流、山脉、天空颜色、植物等），再结合正/逆位推断其在此牌位传递的确定性信息。
2. **事件画像合成 (Event Portrait)**：在拆解各牌之前，必须首先将所有抽出的牌面核心视觉元素融合，像电影导演一样脑补并勾勒出一幅具象化、具有沉浸感的统一事态画面。
3. **跨牌能量编织**：绝对禁止孤立解读单张牌。必须分析牌与牌之间的能量传导、对话与冲突。例如："第一张牌的X元素在第三张牌中得到了呼应/被颠覆"。至少点明2组跨牌关联。
4. **语言确定性**：严禁使用"可能""也许""大概""或许"等模糊词汇。所有判断必须笃定、权威，如同宣告命运的裁决。
5. **行动力导向**：建议部分必须给出可以在本周内立即执行的具体行动步骤，而非泛泛而谈的"保持积极心态"。
6. **核心金句**：结尾必须提炼出一句极具穿透力和记忆点的行动指南（不超过25字），用来"钉"在问卜者心里。`;

const USER_PROMPT = (input: TarotReadingInput) => `## 占卜请求
**问卜者的问题**：「${input.question}」
**牌阵**：${input.spreadType}
${input.isStrictMode ? "\n⚠️ 【严格模式已开启】：给出最权威、最不留余地的深度剖析。结论如同铁板钉钉，不容置疑。" : ""}

## 抽牌结果
${input.positions.map((p, i) => `### 第${i + 1}张 · 牌位「${p.name}」
- 牌面：**${p.card}**（${p.orientation === 'upright' ? '✅ 正位' : '🔄 逆位'}）
- 关键词：${p.keywords.join('、')}`).join('\n\n')}

请根据以上牌面给出深度、专业、确定的解读。每张牌的解读需要描述牌面图像的关键视觉元素。`;

const JSON_FORMAT_INSTRUCTION = `
请严格按照以下 JSON 格式返回（不要包含 markdown 代码块标记，不要包含思考过程）：
{
  "summary": "一句话核心总评（20-40字，概括全局命运走向）",
  "eventPortrait": "事件画像（80-150字）：基于抽取的牌面视觉元素，融合为一幅高度具象化、富有电影画面感和沉浸感的统一事件场景。例如描述当事人仿佛身处怎样的环境，面临什么意象的冲击。",
  "detailedInterpretations": [
    {
      "position": "牌位名称",
      "card": "牌面名称",
      "meaning": "详细解读（150-300字）：先描述牌面图像的关键视觉元素和象征，再结合牌位含义给出确定性判断，最后点出此牌与其他牌面的能量关联"
    }
  ],
  "overallTrend": "整体趋势分析（200-400字）：编织所有牌面的能量交汇，揭示问题的深层脉络和命运走向",
  "suggestions": {
    "actionableSteps": "3条可在本周内立即执行的具体行动建议（每条一句话，用序号分隔）",
    "mindsetShift": "心态转变的核心方向（100-150字），指出当前思维盲区",
    "warningSigns": "必须警惕的2-3个具体风险信号或陷阱"
  },
  "finalAdvice": "一句核心行动指南金句（不超过25字，极具穿透力）"
}`;

const SUPPLEMENTARY_SYSTEM_PROMPT = `你是一位资深的塔罗占卜导师。不要输出思考过程，直接输出结果。
要求如下：
1. 直接给出建议，不使用"可能""也许""大概"等模糊词汇
2. 直接说明它对问题的启示，明确行动指导或心态调整方向
3. 语气要像一位经验丰富的占卜师，充满确定性和洞察力`;

const SUPPLEMENTARY_USER_PROMPT = (input: { question: string; card: string; orientation: string; keywords: string[] }) => {
  const orientation = input.orientation === 'upright' ? '正位' : '逆位';
  const keywordStr = input.keywords.join('、');
  return `针对过去问题："${input.question}"
用户补抽了一张牌：${input.card}（${orientation}），该牌关键词为：${keywordStr}。
请基于这张牌的含义给出2-3句建议参考，不要包含任何思考过程或分析过程。`;
};

// ===================== Gemini Schema =====================
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    eventPortrait: { type: Type.STRING },
    detailedInterpretations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { position: { type: Type.STRING }, card: { type: Type.STRING }, meaning: { type: Type.STRING } } } },
    overallTrend: { type: Type.STRING },
    suggestions: { type: Type.OBJECT, properties: { actionableSteps: { type: Type.STRING }, mindsetShift: { type: Type.STRING }, warningSigns: { type: Type.STRING } }, required: ["actionableSteps", "mindsetShift", "warningSigns"] },
    finalAdvice: { type: Type.STRING }
  },
  required: ["summary", "eventPortrait", "detailedInterpretations", "overallTrend", "suggestions", "finalAdvice"]
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
// Also handles nested objects in detailedInterpretations.
function normalizeReading(obj: Record<string, unknown>): TarotReading {
  // Normalize suggestions
  const s = obj.suggestions as Record<string, unknown> | undefined;
  if (s && typeof s === 'object') {
    for (const key of ['actionableSteps', 'mindsetShift', 'warningSigns'] as const) {
      const val = s[key];
      if (Array.isArray(val)) {
        s[key] = val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join('\n');
      } else if (val && typeof val === 'object') {
        s[key] = Object.values(val).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join('\n');
      }
    }
  }
  // Normalize detailedInterpretations — some models nest meaning as objects
  const di = obj.detailedInterpretations;
  if (Array.isArray(di)) {
    for (const item of di) {
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        if (rec.meaning && typeof rec.meaning === 'object') {
          // Flatten object meaning into readable string
          const parts = Object.entries(rec.meaning as Record<string, unknown>)
            .map(([k, v]) => `${k}：${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
          rec.meaning = parts.join('\n');
        }
      }
    }
  }
  // Normalize string fields that might be objects
  for (const key of ['summary', 'overallTrend', 'finalAdvice'] as const) {
    const val = obj[key];
    if (val && typeof val === 'object') {
      obj[key] = Array.isArray(val)
        ? val.map(v => String(v)).join(' ')
        : Object.values(val).map(v => String(v)).join(' ');
    }
  }
  return obj as unknown as TarotReading;
}

function parseAIResponse(text: string): TarotReading {
  // Strip <think>...</think> blocks (some models output thinking process)
  // Also handle unclosed <think> tags (no closing </think>)
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*?(<\/think>|$)/g, '')
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

async function callOpenAI(cfg: AIConfig, model: string, systemPrompt: string, userPrompt: string, jsonMode: boolean): Promise<string> {
  const isMinimax = cfg.provider === 'minimax';
  const messages = [
    { role: 'system', content: systemPrompt + (jsonMode ? '\n\n' + JSON_FORMAT_INSTRUCTION : '') },
    { role: 'user', content: userPrompt },
  ];
  const { url, headers } = getOpenAIEndpoint(cfg);
  const providerHint = getProviderHint(cfg);
  
  let actualModel = model;
  if (isMinimax) {
    if (model === 'MiniMax-M2.7') actualModel = 'minimax-text-01';
    else if (model === 'MiniMax-M2.5') actualModel = 'abab6.5s-chat';
    else if (model === 'MiniMax-M2.5-highspeed') actualModel = 'abab6.5g-chat';
    else if (model === 'MiniMax-M2.1') actualModel = 'abab6.5-chat';
  }

  // MiniMax does not support response_format: json_object
  const body: Record<string, unknown> = { model: actualModel, messages, provider: providerHint };
  if (jsonMode && !isMinimax) body.response_format = { type: 'json_object' };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`AI 请求失败 (${res.status}): ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenAIStream(cfg: AIConfig, model: string, systemPrompt: string, userPrompt: string, jsonMode: boolean, onProgress: (s: string) => void): Promise<string> {
  const isMinimax = cfg.provider === 'minimax';
  const messages = [
    { role: 'system', content: systemPrompt + (jsonMode ? '\n\n' + JSON_FORMAT_INSTRUCTION : '') },
    { role: 'user', content: userPrompt },
  ];
  const { url, headers } = getOpenAIEndpoint(cfg);
  const providerHint = getProviderHint(cfg);

  let actualModel = model;
  if (isMinimax) {
    if (model === 'MiniMax-M2.7') actualModel = 'minimax-text-01';
    else if (model === 'MiniMax-M2.5') actualModel = 'abab6.5s-chat';
    else if (model === 'MiniMax-M2.5-highspeed') actualModel = 'abab6.5g-chat';
    else if (model === 'MiniMax-M2.1') actualModel = 'abab6.5-chat';
  }

  // MiniMax does not support response_format: json_object
  const body: Record<string, unknown> = { model: actualModel, messages, stream: true, provider: providerHint };
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
    const textLen = accumulated.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').length;
    if (textLen < 200) onProgress("正在分析牌面...");
    else if (textLen < 600) onProgress("正在解读关联...");
    else if (textLen < 1200) onProgress("正在生成建议...");
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

async function callGemini(cfg: AIConfig, model: string, systemPrompt: string, userPrompt: string, jsonMode: boolean): Promise<string> {
  const ai = getGeminiClient(cfg.apiKey);
  const config: any = { ...geminiThinkingConfig(model), systemInstruction: systemPrompt + (jsonMode ? '\n\n' + JSON_FORMAT_INSTRUCTION : '') };
  if (jsonMode) {
    config.responseMimeType = "application/json";
    config.responseSchema = RESPONSE_SCHEMA;
  }
  const response = await ai.models.generateContent({
    model, contents: userPrompt,
    config
  });
  if (!response.text) throw new Error("AI 返回内容为空，请重试。");
  return response.text;
}

async function callGeminiStream(cfg: AIConfig, model: string, systemPrompt: string, userPrompt: string, jsonMode: boolean, onProgress: (s: string) => void): Promise<string> {
  const ai = getGeminiClient(cfg.apiKey);
  const config: any = { ...geminiThinkingConfig(model), systemInstruction: systemPrompt + (jsonMode ? '\n\n' + JSON_FORMAT_INSTRUCTION : '') };
  if (jsonMode) {
    config.responseMimeType = "application/json";
    config.responseSchema = RESPONSE_SCHEMA;
  }
  const response = await ai.models.generateContentStream({
    model, contents: userPrompt,
    config
  });
  let accumulated = '';
  for await (const chunk of response) {
    accumulated += chunk.text || '';
    const textLen = accumulated.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').length;
    if (textLen < 200) onProgress("正在分析牌面...");
    else if (textLen < 600) onProgress("正在解读关联...");
    else if (textLen < 1200) onProgress("正在生成建议...");
    else onProgress("即将完成...");
  }
  return accumulated;
}

async function callGeminiLight(cfg: AIConfig, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const ai = getGeminiClient(cfg.apiKey);
  const config: any = { systemInstruction: systemPrompt };
  const response = await ai.models.generateContent({ model, contents: userPrompt, config });
  return response.text || "暂无补充建议";
}

// ===================== Public API =====================
export async function interpretTarot(input: TarotReadingInput): Promise<TarotReading> {
  const cfg = getConfig();
  const text = cfg.provider === 'gemini'
    ? await callGemini(cfg, cfg.model, SYSTEM_PROMPT, USER_PROMPT(input), true)
    : await callOpenAI(cfg, cfg.model, SYSTEM_PROMPT, USER_PROMPT(input), true); // minimax uses OpenAI-compatible API
  return parseAIResponse(text);
}

export async function interpretTarotStream(input: TarotReadingInput, onProgress: (stage: string) => void): Promise<TarotReading> {
  const cfg = getConfig();
  onProgress("正在连接灵感...");
  const text = cfg.provider === 'gemini'
    ? await callGeminiStream(cfg, cfg.model, SYSTEM_PROMPT, USER_PROMPT(input), true, onProgress)
    : await callOpenAIStream(cfg, cfg.model, SYSTEM_PROMPT, USER_PROMPT(input), true, onProgress); // minimax uses OpenAI-compatible API
  onProgress("解读完成");
  return parseAIResponse(text);
}

export async function interpretSupplementary(input: {
  question: string; card: string; orientation: string; keywords: string[];
}): Promise<{ summary: string }> {
  const cfg = getConfig();
  const text = cfg.provider === 'gemini'
    ? await callGeminiLight(cfg, cfg.modelLight, SUPPLEMENTARY_SYSTEM_PROMPT, SUPPLEMENTARY_USER_PROMPT(input))
    : await callOpenAI(cfg, cfg.modelLight, SUPPLEMENTARY_SYSTEM_PROMPT, SUPPLEMENTARY_USER_PROMPT(input), false); // minimax uses OpenAI-compatible API

  // Strip <think>...</think> blocks from the response
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*/g, '')
    .trim();

  return { summary: cleaned || "暂无补充建议" };
}

