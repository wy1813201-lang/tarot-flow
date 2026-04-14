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
  const providerKeys: Record<AIProvider, string> = {
    gemini: import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY || '',
    minimax: import.meta.env.VITE_MINIMAX_API_KEY || import.meta.env.VITE_AI_API_KEY || '',
    openai: import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_AI_API_KEY || '',
  };
  const apiKey = providerKeys[provider] || import.meta.env.VITE_AI_API_KEY || 'proxy';

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
1. **事件画像合成 (Event Portrait)**：先把所有牌面的前景、背景、动作、光线、气氛融合成一幅统一画面。凡是整组牌共同构成的场景感、处境感、氛围感，都应该集中写进事件画像，不要拆散到单牌里重复铺陈。
2. **单牌解读职责清晰**：每张牌的解读只负责这张牌在当前牌位上的核心判断。可以引用与该牌直接相关的韦特图像符号，但不要再重复整组牌已经形成的场景开场，不要再写”你正站在某个门口/处在某种氛围里”这一类画像式铺垫。
3. **跨牌能量编织**：绝对禁止孤立解读单张牌。必须分析牌与牌之间的能量传导、对话与冲突。例如：”第一张牌的X元素在第三张牌中得到了呼应/被颠覆”。至少点明2组跨牌关联。
4. **语言确定性**：严禁使用”可能””也许””大概””或许”等模糊词汇。所有判断必须笃定、权威，如同宣告命运的裁决。
5. **画像深度分析——从画面直击问题核心**：事件画像不是终点，而是分析的起点。必须基于合成的画像场景，对问卜者提出的具体问题进行一篇完整的、层层递进的深度分析。分析必须包含三个层面：（1）**画面联想**：画面中的每个意象都要桥接到问题本身，让问卜者一读就觉得”这说的就是我”——“画面中那条干涸的河床，对应的正是你在感情中长期付出却得不到回流的枯竭感”；（2）**暗处信号**：从牌面背景细节（远山、流水方向、天空颜色、人物目光朝向、角落里的小符号）中挖掘与问题直接相关的潜意识信号——“月亮牌底部的龙虾正在爬出水面，这暗示你内心深处对这段关系的不安全感正在浮出意识层面”；（3）**行动启示**：所有启示必须从画像中”生长”出来，形式是”因为画面中XX（具体意象），所以YY（具体行动）”——禁止出现与画面无关的空泛建议。三个层面必须融为一篇连贯的文章，不要分段标注层面名称，而是自然衔接。
8. **核心金句**：结尾必须提炼出一句极具穿透力和记忆点的行动指南（不超过25字），用来”钉”在问卜者心里。这句话也必须能在画面中找到对应的意象锚点。
9. **整体趋势必须编织全部牌面能量线**：overallTrend 段落不是重复事件画像，而是把所有牌面的能量交汇编织成一条从现在到未来的命运主线。必须点名每张牌在这条主线上扮演的角色（如”塔牌负责打碎旧格局，星星牌接手重建信念”），让读者一看就知道每张牌如何推动命运演进。`;

const USER_PROMPT = (input: TarotReadingInput) => `## 占卜请求
**问卜者的问题**：「${input.question}」
**牌阵**：${input.spreadType}
${input.isStrictMode ? "\n⚠️ 【严格模式已开启】：给出最权威、最不留余地的深度剖析。结论如同铁板钉钉，不容置疑。" : ""}

## 抽牌结果
${input.positions.map((p, i) => `### 第${i + 1}张 · 牌位「${p.name}」
- 牌面：**${p.card}**（${p.orientation === 'upright' ? '✅ 正位' : '🔄 逆位'}）
- 关键词：${p.keywords.join('、')}`).join('\n\n')}

请根据以上牌面给出深度、专业、确定的解读。
注意：
1. 事件画像负责统一场景描述，要把整组牌的画面感写足、写满。
2. 逐牌拆解不要重复事件画像里的开场氛围，要直接进入这张牌的符号、牌位功能、判断结果与跨牌关系。`;

const JSON_FORMAT_INSTRUCTION = `
请严格按照以下 JSON 格式返回（不要包含 markdown 代码块标记，不要包含思考过程）：
{
  "summary": "一句话核心总评（20-40字，概括全局命运走向）",
  "eventPortrait": "事件画像（150-260字）：基于抽取的全部牌面视觉元素，融合为一幅高度具象化、富有电影画面感和沉浸感的统一事件场景。这里要承担整组牌的场景描述与氛围铺陈。",
  "detailedInterpretations": [
    {
      "position": "牌位名称",
      "card": "牌面名称",
      "meaning": "详细解读（120-220字）：直接解释这张牌在当前牌位上的核心含义、风险、转机与跨牌关系。可以引用这张牌直接相关的视觉符号，但不要重复事件画像中的整体场景开场。"
    }
  ],
  "overallTrend": "整体趋势与命运主线（200-400字）：把所有牌面的能量交汇编织成从现在到未来的一条命运主线。必须逐牌点名其在主线上的角色（如'XX牌负责打碎旧格局，YY牌接手重建信念'），揭示问题的深层脉络和命运走向。不要重复事件画像的场景描述，这里聚焦能量演进和趋势判断。",
  "suggestions": {
    "actionableSteps": "（保留字段，简要写1-2条核心行动即可）",
    "mindsetShift": "（保留字段，一句话概括心态方向）",
    "warningSigns": "（保留字段，一句话概括风险）"
  },
  "insights": {
    "portraitDepthAnalysis": "画像深度分析（500-800字）：基于事件画像，对问卜者提出的问题进行一篇完整的、层层递进的深度分析文章。需要自然融合三个层面——（1）画面联想：把画面中每个意象桥接到问卜者的具体处境，例如'画面中那条从圣杯溢出的水流向了权杖脚下的干裂大地——这对应的正是你在感情中持续输出的能量终于开始滋养到你一直搁置的事业土壤'；（2）暗处信号：从牌面背景细节中挖掘潜意识信号，例如'月亮牌底部的龙虾正在爬出水面——你内心深处的不安全感正在浮出意识层面，这恰恰是你终于准备好面对它的信号'；（3）行动启示：从画面中自然生长出行动方向，格式为'因为画面中XX，所以YY'。三个层面必须融为一篇连贯的文章，不要分段标注层面名称，自然衔接，让问卜者从画面联想到自身处境再到具体行动，一气呵成。禁止出现任何与画面无关的空泛建议。"
  },
  "finalAdvice": "一句核心行动指南金句（不超过25字，极具穿透力）"
}`;

// ===================== Deep Analysis =====================
const DEEP_ANALYSIS_SYSTEM_PROMPT = `你是一位兼修韦特塔罗、荣格心理学与东方命理的资深占卜导师。你的使命是基于已完成的塔罗牌阵，给出一份全面、深入、可操作的多维度命运分析报告。

## 解读铁律
1. **基于画像**：所有分析必须紧扣已有的事件画像和牌面信息，不能泛泛而谈。
2. **时间线清晰**：近期/中期/远期的建议必须具体、可执行，有明确的时间感。
3. **语言确定性**：严禁使用"可能""也许""大概"等模糊词汇。所有判断如同宣告命运的裁决。
4. **不要输出思考过程**，直接输出结果 JSON。`;

const DEEP_ANALYSIS_USER_PROMPT = (input: {
  question: string;
  eventPortrait: string;
  summary: string;
  cards: { name: string; orientation: string; position: string; meaning: string }[];
}) => {
  const cardList = input.cards.map(c =>
    `- ${c.position}：${c.name}（${c.orientation === 'upright' ? '正位' : '逆位'}）— ${c.meaning}`
  ).join('\n');

  return `## 深度分析请求
**问卜者的问题**：「${input.question}」

## 事件画像
"""
${input.eventPortrait}
"""

## 核心结论
${input.summary}

## 牌面信息
${cardList}

请严格按以下JSON格式输出完整的深度分析（不要有其他文字）：
{
  "shortTerm": "近期行动（1周内，100-150字）：基于牌阵能量，给出这一周最重要的1-2个具体行动，说明为什么现在是执行的时机。",
  "midTerm": "中期方向（1个月，100-150字）：未来一个月的能量走向和关键节点，指出哪些事情会自然推进，哪些需要主动介入。",
  "longTerm": "远期趋势（3个月以上，100-150字）：当前局势的最终走向，以及达到这个结果需要具备的核心条件。",
  "opportunities": "机遇洞察（80-120字）：从牌面和画像中识别出的隐藏机遇，以及如何把握它的具体方式。",
  "risks": "风险预警（80-120字）：当前局势中最需要警惕的2-3个具体风险信号，以及避开它们的策略。",
  "psyche": "内在能量（80-120字）：基于牌面的心理能量分析——当前内在状态、潜意识倾向，以及需要调整的心理模式。",
  "external": "外部影响（80-120字）：环境、他人或外部力量对当前局势的影响，以及如何与这些外部力量协作或抗衡。"
}`;
};

export interface DeepAnalysis {
  shortTerm: string;
  midTerm: string;
  longTerm: string;
  opportunities: string;
  risks: string;
  psyche: string;
  external: string;
}

const SUPPLEMENTARY_SYSTEM_PROMPT = `你是一位兼修韦特塔罗与荣格心理学的资深占卜导师。你的使命是将补牌融入已有的画像叙事中，像一位电影导演添加新镜头一样，续写已有的命运画面。

## 解读铁律
1. **画像续写**：你必须在已有画像的基础上续写下一幕，保持叙事连贯性和视觉沉浸感。
2. **牌面图像分析**：基于韦特牌面的实际视觉元素，给出精准的深度解读。
3. **语言确定性**：严禁使用"可能""也许""大概"等模糊词汇。
4. **不要输出思考过程**，直接输出结果 JSON。`;

export interface SupplementaryResult {
  portraitContinuation: string;
  deepReading: string;
  energyShift: string;
  coreMessage: string;
  advice: string;
  connection: string;
}

const SUPPLEMENTARY_USER_PROMPT = (input: {
  question: string; card: string; orientation: string; keywords: string[];
  contextType?: 'overall' | 'card' | 'general'; contextLabel?: string;
  existingPortrait?: string; existingCards?: string[]; existingContinuations?: string[];
  deepAnalysisContext?: string;
}) => {
  const orientation = input.orientation === 'upright' ? '正位' : '逆位';
  const keywordStr = input.keywords.join('、');
  const contextHint = input.contextType === 'overall'
    ? '这是对整体画像的追问补牌。'
    : input.contextType === 'card' && input.contextLabel
    ? `这是针对「${input.contextLabel}」这张牌的追问补牌。`
    : '这是一张通用补牌。';

  return `## 补牌请求
**问卜者的问题**：「${input.question}」
**补牌类型**：${contextHint}
**补抽的牌**：${input.card}（${orientation}），关键词：${keywordStr}

${input.existingPortrait ? `## 已有事件画像\n"""${input.existingPortrait}"""` : ''}
${input.existingCards?.length ? `## 已有主牌\n${input.existingCards.join('、')}` : ''}
${input.existingContinuations?.length ? `## 已有续篇\n${input.existingContinuations.join('\n')}` : ''}

请严格按以下JSON格式输出（不要有其他文字）：
{
  "portraitContinuation": "画像续篇（80-120字）：在已有画像基础上续写下一幕场景，保持叙事风格连贯。",
  "deepReading": "深度解读（80-120字）：这张牌在当前牌阵和画像语境下的精准含义，必须联系已有牌面。",
  "energyShift": "能量流转（60-80字）：这张牌带来的能量变化方向，以及对整体局势的影响。",
  "coreMessage": "核心信息（一句话概括）",
  "advice": "行动建议（一句话）",
  "connection": "与主牌的联系（一句话）"
}`;
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
    insights: { type: Type.OBJECT, properties: { portraitDepthAnalysis: { type: Type.STRING } }, required: ["portraitDepthAnalysis"] },
    finalAdvice: { type: Type.STRING }
  },
  required: ["summary", "eventPortrait", "detailedInterpretations", "overallTrend", "suggestions", "insights", "finalAdvice"]
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

function resolveCompatibleModelName(_cfg: AIConfig, model: string): string {
  return model;
}

async function callOpenAI(cfg: AIConfig, model: string, systemPrompt: string, userPrompt: string, jsonMode: boolean): Promise<string> {
  const isMinimax = cfg.provider === 'minimax';
  const messages = [
    { role: 'system', content: systemPrompt + (jsonMode ? '\n\n' + JSON_FORMAT_INSTRUCTION : '') },
    { role: 'user', content: userPrompt },
  ];
  const { url, headers } = getOpenAIEndpoint(cfg);
  const providerHint = getProviderHint(cfg);
  const actualModel = resolveCompatibleModelName(cfg, model);

  // MiniMax does not support response_format: json_object
  const body: Record<string, unknown> = { model: actualModel, messages, provider: providerHint };
  if (jsonMode && !isMinimax) body.response_format = { type: 'json_object' };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error(`[AI] Error ${res.status}:`, errBody.slice(0, 300));
    throw new Error(`AI 请求失败 (${res.status}): ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  return content.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
}

async function callOpenAIStream(cfg: AIConfig, model: string, systemPrompt: string, userPrompt: string, jsonMode: boolean, onProgress: (s: string) => void): Promise<string> {
  const isMinimax = cfg.provider === 'minimax';
  const messages = [
    { role: 'system', content: systemPrompt + (jsonMode ? '\n\n' + JSON_FORMAT_INSTRUCTION : '') },
    { role: 'user', content: userPrompt },
  ];
  const { url, headers } = getOpenAIEndpoint(cfg);
  const providerHint = getProviderHint(cfg);
  const actualModel = resolveCompatibleModelName(cfg, model);

  // MiniMax does not support response_format: json_object
  const body: Record<string, unknown> = { model: actualModel, messages, stream: true, provider: providerHint };
  if (jsonMode && !isMinimax) body.response_format = { type: 'json_object' };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error(`[AI] Stream Error ${res.status}:`, errBody.slice(0, 300));
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
  return accumulated.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
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
  contextType?: 'overall' | 'card' | 'general'; contextLabel?: string;
  existingPortrait?: string; existingCards?: string[]; existingContinuations?: string[];
  deepAnalysisContext?: string;
}): Promise<SupplementaryResult> {
  const cfg = getConfig();
  const userPrompt = SUPPLEMENTARY_USER_PROMPT(input);
  const text = cfg.provider === 'gemini'
    ? await callGeminiLight(cfg, cfg.modelLight, SUPPLEMENTARY_SYSTEM_PROMPT, userPrompt)
    : await callOpenAI(cfg, cfg.modelLight, SUPPLEMENTARY_SYSTEM_PROMPT, userPrompt, false);

  // Strip <think>...</think> blocks from the response
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*/g, '')
    .trim();

  // Try JSON parse first
  try {
    const jsonStr = extractFirstJSON(cleaned);
    const parsed = JSON.parse(jsonStr);
    return {
      portraitContinuation: String(parsed.portraitContinuation || ''),
      deepReading: String(parsed.deepReading || ''),
      energyShift: String(parsed.energyShift || ''),
      coreMessage: String(parsed.coreMessage || ''),
      advice: String(parsed.advice || ''),
      connection: String(parsed.connection || ''),
    };
  } catch {
    // Fallback: treat entire response as coreMessage
    return {
      portraitContinuation: '',
      deepReading: cleaned,
      energyShift: '',
      coreMessage: cleaned,
      advice: '',
      connection: '',
    };
  }
}

export async function interpretDeepAnalysis(input: {
  question: string;
  eventPortrait: string;
  summary: string;
  cards: { name: string; orientation: string; position: string; meaning: string }[];
}): Promise<DeepAnalysis> {
  const cfg = getConfig();
  const text = cfg.provider === 'gemini'
    ? await callGeminiLight(cfg, cfg.modelLight, DEEP_ANALYSIS_SYSTEM_PROMPT, DEEP_ANALYSIS_USER_PROMPT(input))
    : await callOpenAI(cfg, cfg.modelLight, DEEP_ANALYSIS_SYSTEM_PROMPT, DEEP_ANALYSIS_USER_PROMPT(input), false);

  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*/g, '')
    .trim();

  try {
    const jsonStr = extractFirstJSON(cleaned);
    const parsed = JSON.parse(jsonStr);
    return {
      shortTerm: String(parsed.shortTerm || ''),
      midTerm: String(parsed.midTerm || ''),
      longTerm: String(parsed.longTerm || ''),
      opportunities: String(parsed.opportunities || ''),
      risks: String(parsed.risks || ''),
      psyche: String(parsed.psyche || ''),
      external: String(parsed.external || ''),
    };
  } catch {
    throw new Error('深度分析解析失败，请重试。');
  }
}
