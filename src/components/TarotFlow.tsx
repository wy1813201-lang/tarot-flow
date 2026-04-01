import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SPREADS, SpreadType } from '../constants/tarot';
import { shuffleDeck, generateHash, getCardsFromSelection, TarotSession } from '../lib/tarotLogic';
import { interpretTarotStream, interpretSupplementary } from '../services/ai';
import { TarotReading } from '../types/reading';
import { ArrowRight, ArrowLeft, RefreshCw, Hash, CheckCircle2, Loader2, Sparkles, ChevronRight, ShieldAlert, Plus, Zap, Columns, Layout, Heart, Briefcase, Calendar, Compass, AlertCircle, TrendingUp } from 'lucide-react';

type Step = 'setup' | 'shuffle' | 'select' | 'result';

// Card suit styling based on card index in the deck
function getCardSuitStyle(cardName: string) {
  const suits: Record<string, { gradient: string; label: string; symbol: string }> = {
    '权杖': { gradient: 'from-amber-900/25 to-[#0a0502]', label: 'Wands', symbol: '🔥' },
    '圣杯': { gradient: 'from-blue-900/25 to-[#0a0502]', label: 'Cups', symbol: '💧' },
    '宝剑': { gradient: 'from-slate-600/25 to-[#0a0502]', label: 'Swords', symbol: '⚔️' },
    '星币': { gradient: 'from-emerald-900/25 to-[#0a0502]', label: 'Pentacles', symbol: '✨' },
  };
  for (const [key, style] of Object.entries(suits)) {
    if (cardName.includes(key)) return style;
  }
  // Major Arcana
  return { gradient: 'from-[#ff4e00]/15 to-[#0a0502]', label: 'Major Arcana', symbol: '🌟' };
}

function SectionDivider() {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-white/5" />
      <Sparkles size={10} className="text-[#ff4e00]/30" />
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

const SUGGESTED_QUESTIONS = [
  { category: "事业", questions: ["今年我的事业发展趋势如何？", "我是否应该接受这份新的工作机会？", "如何提升职场人际关系？"] },
  { category: "感情", questions: ["我和TA未来的感情走向如何？", "我什么时候能遇到正缘？", "这段关系中的阻碍是什么？"] },
  { category: "财富", questions: ["近期的财运状况如何？", "这项投资是否会有好的回报？"] },
  { category: "综合", questions: ["我目前最需要关注的是什么？", "本周的整体运势如何？"] },
];

interface SupplementaryCard {
  name: string;
  nameEn: string;
  orientation: string;
  keywords: string[];
  interpretation: string;
  chosenNumber: number;
}

export default function TarotFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('setup');
  const [question, setQuestion] = useState('');
  const [spreadType, setSpreadType] = useState<SpreadType>('three');
  const [isStrictMode, setIsStrictMode] = useState(false);
  const [session, setSession] = useState<TarotSession | null>(null);
  const [chosenNumbers, setChosenNumbers] = useState<number[]>([]);
  const [reading, setReading] = useState<TarotReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState('');
  const [supplementaryCards, setSupplementaryCards] = useState<SupplementaryCard[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const revealTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Timer: counts up while loading
  React.useEffect(() => {
    if (!loading) { setElapsedSec(0); return; }
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  // Auto-reveal cards one by one after entering result step
  React.useEffect(() => {
    if (step !== 'result' || !reading || !session) return;
    const cards = getCardsFromSelection(session.shuffledDeck, session.orientations, chosenNumbers);
    if (revealedCount >= cards.length) return;
    revealTimerRef.current = setTimeout(() => {
      setRevealedCount(c => c + 1);
    }, revealedCount === 0 ? 700 : 1300);
    return () => clearTimeout(revealTimerRef.current);
  }, [step, reading, revealedCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const startShuffle = async () => {
    if (!question.trim()) return;
    setLoading(true);
    const { deck, orientations } = shuffleDeck();
    const sessionId = crypto.randomUUID();
    const hash = await generateHash(deck, orientations, sessionId);

    setSession({
      uid: 'local',
      question,
      spreadType,
      isStrictMode,
      shuffledDeck: deck,
      orientations,
      hash,
      createdAt: new Date().toISOString()
    });

    setTimeout(() => {
      setLoading(false);
      setStep('shuffle');
    }, 1500);
  };

  const handleSelect = (num: number) => {
    if (chosenNumbers.includes(num)) {
      setChosenNumbers(prev => prev.filter(n => n !== num));
    } else if (chosenNumbers.length < SPREADS[spreadType].count) {
      setChosenNumbers(prev => [...prev, num]);
    }
  };

  const startReading = async () => {
    if (chosenNumbers.length !== SPREADS[spreadType].count || !session) return;
    setLoading(true);
    setError(null);
    setProgressStage('正在连接灵感...');

    const selectedCards = getCardsFromSelection(session.shuffledDeck, session.orientations, chosenNumbers);
    const positions = SPREADS[spreadType].positions.map((name, i) => ({
      name,
      card: selectedCards[i].name,
      orientation: selectedCards[i].orientation,
      keywords: selectedCards[i].keywords
    }));

    try {
      const result = await interpretTarotStream({
        question: session.question,
        spreadType: SPREADS[spreadType].name,
        isStrictMode: session.isStrictMode,
        positions
      }, setProgressStage);

      const finalSession = { ...session, chosenNumbers, reading: result, createdAt: new Date().toISOString() };

      try {
        const existing = JSON.parse(localStorage.getItem('tarot_sessions') || '[]');
        existing.unshift({ id: crypto.randomUUID(), ...finalSession });
        localStorage.setItem('tarot_sessions', JSON.stringify(existing.slice(0, 100)));
      } catch (err) {
        console.error('localStorage save failed:', err);
      }
      setReading(result);
      setRevealedCount(0);
      setStep('result');
    } catch (err) {
      console.error("AI interpretation failed:", err);
      setError("AI 解读失败，请检查网络后重试。");
    } finally {
      setLoading(false);
      setProgressStage('');
    }
  };

  const drawSupplementaryCard = async () => {
    if (!session || isStrictMode || loading) return;
    setLoading(true);

    const availableNumbers = Array.from({ length: 78 }, (_, i) => i + 1)
      .filter(n => !chosenNumbers.includes(n) && !supplementaryCards.some(sc => sc.chosenNumber === n));

    if (availableNumbers.length === 0) { setLoading(false); return; }

    const randomNum = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    const cardData = getCardsFromSelection(session.shuffledDeck, session.orientations, [randomNum])[0];

    try {
      const result = await interpretSupplementary({
        question: session.question,
        card: cardData.name,
        orientation: cardData.orientation,
        keywords: cardData.keywords
      });
      setSupplementaryCards(prev => [...prev, { ...cardData, interpretation: result.summary }]);
    } catch (err) {
      console.error("Supplementary interpretation failed:", err);
      setError("补牌解读失败，请重试。");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'shuffle') setStep('setup');
    else if (step === 'select') { setStep('shuffle'); setChosenNumbers([]); }
  };

  return (
    <div className="min-h-[60vh] flex flex-col">
      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="space-y-4">
              <label className="block text-sm font-serif uppercase tracking-widest text-gray-500">你的问题</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={499}
                placeholder="例如：今年我的事业发展趋势如何？"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl font-light focus:border-[#ff4e00] outline-none transition-all min-h-[120px]"
              />
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-serif">推荐问题</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((group) => (
                    <div key={group.category} className="contents">
                      {group.questions.map((q) => (
                        <button key={q} onClick={() => setQuestion(q)} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[11px] text-gray-400 hover:border-[#ff4e00]/30 hover:text-white transition-all whitespace-nowrap">
                          <span className="text-[#ff4e00]/50 mr-1">[{group.category}]</span>{q}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-serif uppercase tracking-widest text-gray-500">选择牌阵</label>
              <div role="radiogroup" aria-label="选择牌阵" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(Object.keys(SPREADS) as SpreadType[]).map((key) => {
                  const Icon = { single: Zap, three: Columns, five: Layout, relationship: Heart, career: Briefcase, week: Calendar, ten: Compass }[key] || Sparkles;
                  return (
                    <div key={key} onClick={() => setSpreadType(key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSpreadType(key); } }} role="radio" aria-checked={spreadType === key} tabIndex={0} className={`p-6 rounded-2xl border cursor-pointer transition-all relative overflow-hidden group ${spreadType === key ? 'bg-[#ff4e00]/10 border-[#ff4e00]' : 'bg-white/5 border-white/10 hover:border-white/30'}`}>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                          <div className={`p-2 rounded-lg ${spreadType === key ? 'bg-[#ff4e00] text-white' : 'bg-white/5 text-gray-400'}`}><Icon size={20} /></div>
                          <span className="text-[10px] uppercase tracking-tighter px-2 py-1 bg-white/5 rounded-md text-gray-500">{SPREADS[key].count} 张牌</span>
                        </div>
                        <h4 className="text-lg font-serif mb-1">{SPREADS[key].name}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{SPREADS[key].description}</p>
                      </div>
                      <div className={`absolute -right-4 -bottom-4 opacity-5 transition-all group-hover:opacity-10 ${spreadType === key ? 'opacity-20 text-[#ff4e00]' : 'text-white'}`}><Icon size={80} /></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className={isStrictMode ? "text-[#ff4e00]" : "text-gray-500"} size={24} />
                <div>
                  <h4 className="text-lg font-serif">严格模式</h4>
                  <p className="text-xs text-gray-500">同一问题仅允许一次占卜，禁止补牌或重抽。</p>
                </div>
              </div>
              <button onClick={() => setIsStrictMode(!isStrictMode)} role="switch" aria-checked={isStrictMode} aria-label="严格模式" className={`w-12 h-6 rounded-full transition-all relative ${isStrictMode ? 'bg-[#ff4e00]' : 'bg-gray-700'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isStrictMode ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <button disabled={!question.trim() || loading} onClick={startShuffle} className="w-full py-4 bg-white text-black rounded-full font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
              <span>开始洗牌</span>
            </button>
          </motion.div>
        )}

        {step === 'shuffle' && session && (
          <motion.div key="shuffle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center space-y-8 py-12">
            <button onClick={goBack} className="self-start flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
              <ArrowLeft size={16} /><span>返回修改</span>
            </button>
            <div className="relative">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} className="w-48 h-48 border-2 border-dashed border-[#ff4e00]/30 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw size={48} className="text-[#ff4e00] animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-serif">洗牌完成</h3>
              <p className="text-gray-400">本轮牌序已固定，不可更改。</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs font-mono text-gray-500">
              <Hash size={14} /><span>校验码: {session.hash.substring(0, 16)}...</span>
            </div>
            <button onClick={() => setStep('select')} className="px-12 py-4 bg-[#ff4e00] text-white rounded-full font-medium flex items-center justify-center gap-2 hover:bg-[#e64600] transition-all">
              <span>进入选牌</span><ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {step === 'select' && session && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 relative">
            <button onClick={goBack} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
              <ArrowLeft size={16} /><span>返回洗牌</span>
            </button>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-serif">请选择 {SPREADS[spreadType].count} 个数字</h3>
              <p className="text-gray-400 text-sm italic">凭直觉从 1 到 78 中选择位置</p>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2" role="group" aria-label="选择数字">
              {Array.from({ length: 78 }, (_, i) => i + 1).map((num) => (
                <button key={num} onClick={() => handleSelect(num)} disabled={!chosenNumbers.includes(num) && chosenNumbers.length >= SPREADS[spreadType].count}
                  aria-pressed={chosenNumbers.includes(num)}
                  aria-label={`数字 ${num}${chosenNumbers.includes(num) ? '，已选择' : ''}`}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-mono transition-all border ${chosenNumbers.includes(num) ? 'bg-[#ff4e00] border-[#ff4e00] text-white' : 'bg-white/5 border-white/10 hover:border-white/30 text-gray-500 disabled:opacity-20'}`}>
                  {num}
                </button>
              ))}
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                <AlertCircle className="text-red-400 shrink-0" size={20} />
                <p className="text-red-300 text-sm flex-1">{error}</p>
                <button onClick={() => { setError(null); startReading(); }} className="px-4 py-1.5 bg-red-500/20 text-red-300 rounded-full text-xs hover:bg-red-500/30 transition-colors">重试</button>
              </motion.div>
            )}

            <div className="sticky bottom-6 left-0 right-0 flex flex-col items-center gap-4">
              <div className="flex gap-2">
                {Array.from({ length: SPREADS[spreadType].count }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full border ${chosenNumbers[i] ? 'bg-[#ff4e00] border-[#ff4e00]' : 'bg-transparent border-white/20'}`} />
                ))}
              </div>
              <button disabled={chosenNumbers.length !== SPREADS[spreadType].count || loading} onClick={startReading}
                className="px-12 py-4 bg-white text-black rounded-full font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50 shadow-2xl shadow-black">
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                <span>{loading ? (progressStage || '解读中...') : '开始解读'}</span>
              </button>
            </div>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-5" role="alert" aria-live="assertive">
                {/* Rotating icon */}
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}>
                  <Sparkles size={44} className="text-[#ff4e00]" />
                </motion.div>
                {/* Stage text */}
                <motion.p key={progressStage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-serif text-gray-200 italic">
                  {progressStage || '正在连接灵感...'}
                </motion.p>
                {/* Elapsed timer */}
                <p className="text-xs text-gray-500 tabular-nums">已等待 {elapsedSec}s</p>
                {/* Pulse progress bar */}
                <div className="w-40 h-0.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-[#ff4e00]/60 rounded-full"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    style={{ width: '60%' }}
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === 'result' && reading && session && (() => {
          const cards = getCardsFromSelection(session.shuffledDeck, session.orientations, chosenNumbers);
          const cardCount = cards.length;
          const animBase = 0.3;

          return (
          <motion.div key="result" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="space-y-0">

            {/* === Section A: Title === */}
            <div className="text-center space-y-5 mb-14">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#ff4e00]/10 text-[#ff4e00] rounded-full text-xs uppercase tracking-widest border border-[#ff4e00]/20">
                <CheckCircle2 size={14} /><span>占卜结论</span>
              </motion.div>
              {/* Question echo */}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="text-sm text-gray-500 italic">
                「{session.question}」
              </motion.p>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-3xl sm:text-4xl font-serif leading-tight">{reading.summary}</motion.h2>
            </div>

            <SectionDivider />

            {/* === Section B: Card Reveal (逐张翻牌) === */}
            <div className="mt-12 mb-8 space-y-5">
              {cards.map((card, i) => {
                const suit = getCardSuitStyle(card.name);
                const isRevealed = i < revealedCount;
                const isJustRevealed = i === revealedCount - 1;

                // ── Face-down card ──
                if (!isRevealed) {
                  return (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      onClick={() => { clearTimeout(revealTimerRef.current); setRevealedCount(i + 1); }}
                      className="rounded-3xl bg-[#100c08] border border-white/[0.05] overflow-hidden cursor-pointer hover:border-[#ff4e00]/30 transition-colors group"
                    >
                      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
                        <span className="text-[11px] text-gray-600 uppercase tracking-widest font-serif">
                          第 {i + 1} 张 · {SPREADS[spreadType].positions[i]}
                        </span>
                        <span className="text-[10px] text-gray-700 italic">待翻开</span>
                      </div>
                      <div className="flex items-center justify-center gap-3 py-9">
                        <motion.div animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.9, 1.1, 0.9] }}
                          transition={{ repeat: Infinity, duration: 2.8 }}>
                          <Sparkles size={16} className="text-[#ff4e00]/40" />
                        </motion.div>
                        <span className="text-sm text-gray-700 font-serif italic group-hover:text-gray-500 transition-colors">
                          点击翻开此牌
                        </span>
                        <motion.div animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.9, 1.1, 0.9] }}
                          transition={{ repeat: Infinity, duration: 2.8, delay: 0.6 }}>
                          <Sparkles size={16} className="text-[#ff4e00]/40" />
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                }

                // ── Revealed card ──
                return (
                  <motion.div key={i}
                    initial={isJustRevealed ? { rotateY: 88, opacity: 0, scale: 0.94 } : false}
                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-3xl bg-white/[0.04] border border-white/[0.07] overflow-hidden"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-3">
                      <span className="text-[11px] text-gray-500 uppercase tracking-widest font-serif">
                        第 {i + 1} 张 · {SPREADS[spreadType].positions[i]}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ${
                        card.orientation === 'upright'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${card.orientation === 'upright' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {card.orientation === 'upright' ? '正位' : '逆位'}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="flex gap-5 px-6 pb-6 items-start">
                      {/* Thumbnail */}
                      <div className={`w-24 sm:w-28 shrink-0 aspect-[2/3] bg-gradient-to-br ${suit.gradient} rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden border border-white/[0.06] ${card.orientation === 'reversed' ? 'ring-1 ring-red-500/20' : ''}`}>
                        <div className="absolute inset-1.5 border border-white/[0.05] rounded-lg pointer-events-none" />
                        <div className={`text-2xl sm:text-3xl mb-1 opacity-90 ${card.orientation === 'reversed' ? 'rotate-180' : ''}`}>{suit.symbol}</div>
                        <p className="text-[9px] sm:text-[10px] text-gray-600 tracking-[0.2em] uppercase">{suit.label}</p>
                      </div>

                      {/* Info + interpretation */}
                      <div className="flex-1 min-w-0 flex flex-col gap-3 pt-1">
                        <div>
                          <h4 className="text-lg sm:text-xl font-serif">{card.name}</h4>
                          <p className="text-[11px] text-gray-500 tracking-wider mt-0.5">{card.nameEn}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {card.keywords.map(k => (
                            <span key={k} className="text-[11px] px-2.5 py-0.5 bg-white/[0.06] rounded-full text-gray-400">{k}</span>
                          ))}
                        </div>
                        <div className="w-10 h-px bg-[#ff4e00]/20" />
                        {/* Interpretation fades in after flip */}
                        <motion.p
                          initial={isJustRevealed ? { opacity: 0, y: 8 } : false}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: isJustRevealed ? 0.45 : 0, duration: 0.5 }}
                          className="text-[15px] text-gray-300 leading-[1.9]"
                        >
                          {reading.detailedInterpretations?.[i]?.meaning || "暂无解读"}
                        </motion.p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Skip button */}
              {revealedCount < cardCount && (
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
                  onClick={() => { clearTimeout(revealTimerRef.current); setRevealedCount(cardCount); }}
                  className="w-full text-xs text-gray-700 hover:text-gray-400 transition-colors py-2 font-serif italic"
                >
                  跳过，显示全部 →
                </motion.button>
              )}
            </div>

            {/* === Section C: Analysis (only after all cards revealed) === */}
            <AnimatePresence>
            {revealedCount >= cardCount && (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>
            <SectionDivider />
            <div className="space-y-10 mt-10 mb-16">
              {/* Overall Trend */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: animBase + cardCount * 0.08 + 0.2 }}
                className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp size={18} className="text-[#ff4e00]/70" />
                  <h3 className="text-xl sm:text-2xl font-serif">整体趋势分析</h3>
                </div>
                <p className="text-gray-300 leading-[2] text-[15px] font-light">{reading.overallTrend}</p>
              </motion.div>

              {/* Three Suggestion Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: animBase + cardCount * 0.08 + 0.4 }}
                  className="p-6 sm:p-7 rounded-3xl bg-white/[0.03] border border-white/[0.06] border-t-2 border-t-emerald-500/50 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <ArrowRight size={14} className="text-emerald-400" />
                    <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-widest">行动建议</h4>
                  </div>
                  <p className="text-gray-300 text-[15px] leading-[1.9]">{reading.suggestions?.actionableSteps || "暂无建议"}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: animBase + cardCount * 0.08 + 0.5 }}
                  className="p-6 sm:p-7 rounded-3xl bg-white/[0.03] border border-white/[0.06] border-t-2 border-t-blue-400/50 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="text-blue-400" />
                    <h4 className="text-xs font-medium text-blue-400 uppercase tracking-widest">心态调整</h4>
                  </div>
                  <p className="text-gray-300 text-[15px] leading-[1.9]">{reading.suggestions?.mindsetShift || "暂无建议"}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: animBase + cardCount * 0.08 + 0.6 }}
                  className="p-6 sm:p-7 rounded-3xl bg-white/[0.03] border border-white/[0.06] border-t-2 border-t-amber-400/50 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-400" />
                    <h4 className="text-xs font-medium text-amber-400 uppercase tracking-widest">潜在警示</h4>
                  </div>
                  <p className="text-gray-300 text-[15px] leading-[1.9]">{reading.suggestions?.warningSigns || "暂无警示"}</p>
                </motion.div>
              </div>

              {/* Core Advice */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: animBase + cardCount * 0.08 + 0.7 }}
                className="p-8 sm:p-10 rounded-3xl bg-[#ff4e00]/10 border border-[#ff4e00]/20 shadow-lg shadow-[#ff4e00]/5 flex flex-col gap-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles size={16} className="text-[#ff4e00]" />
                  <h3 className="text-sm font-medium text-[#ff4e00] uppercase tracking-widest">核心建议</h3>
                </div>
                <p className="text-white text-xl sm:text-2xl font-serif font-light leading-[1.7]">
                  {reading.finalAdvice}
                </p>
              </motion.div>
            </div>

            {/* === Section D: Supplementary + Actions === */}
            <div className="space-y-6 pt-4">
              {supplementaryCards.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-blue-500 to-blue-500/0" />
                    <h3 className="text-xl font-serif">补充建议</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supplementaryCards.map((sc, i) => {
                      const scSuit = getCardSuitStyle(sc.name);
                      return (
                      <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex gap-4">
                        <div className="text-2xl shrink-0">{scSuit.symbol}</div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-serif text-white">{sc.name}</h4>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sc.orientation === 'upright' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {sc.orientation === 'upright' ? '正位' : '逆位'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">{sc.interpretation}</p>
                        </div>
                      </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                  <AlertCircle className="text-red-400 shrink-0" size={20} />
                  <p className="text-red-300 text-sm">{error}</p>
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 pb-4">
                {!isStrictMode && (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={drawSupplementaryCard} disabled={loading}
                    className="w-full sm:w-auto px-8 py-3 bg-white/5 border border-white/10 text-white rounded-full font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    <span>补抽一张牌</span>
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.97 }} onClick={onComplete}
                  className="w-full sm:w-auto px-12 py-4 bg-[#ff4e00] text-white rounded-full font-medium hover:bg-[#e64600] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#ff4e00]/20">
                  <span>查看历史记录</span><ChevronRight size={18} />
                </motion.button>
              </div>
            </div>
            </motion.div>
            )}
            </AnimatePresence>

          </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
