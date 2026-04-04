import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SPREADS, SpreadType } from '../constants/tarot';
import { shuffleDeck, generateHash, getCardsFromSelection, TarotSession } from '../lib/tarotLogic';
import { interpretTarotStream, interpretSupplementary } from '../services/ai';
import { TarotReading } from '../types/reading';
import { ArrowRight, ArrowLeft, RefreshCw, Hash, CheckCircle2, Loader2, Sparkles, ChevronRight, ShieldAlert, Plus, Zap, Columns, Layout, Heart, Briefcase, Calendar, Compass, AlertCircle, TrendingUp } from 'lucide-react';

type Step = 'setup' | 'shuffle' | 'select' | 'flip' | 'result';

// Card suit styling based on card index in the deck
function getCardSuitStyle(cardName: string) {
  const suits: Record<string, { gradient: string; label: string; symbol: string }> = {
    '权杖': { gradient: 'from-amber-100 to-[#F3EEE6]', label: 'Wands', symbol: '🔥' },
    '圣杯': { gradient: 'from-blue-100 to-[#F3EEE6]', label: 'Cups', symbol: '💧' },
    '宝剑': { gradient: 'from-slate-200 to-[#F3EEE6]', label: 'Swords', symbol: '⚔️' },
    '星币': { gradient: 'from-emerald-100 to-[#F3EEE6]', label: 'Pentacles', symbol: '✨' },
  };
  for (const [key, style] of Object.entries(suits)) {
    if (cardName.includes(key)) return style;
  }
  // Major Arcana
  return { gradient: 'from-[#E7D7B0] to-[#F3EEE6]', label: 'Major Arcana', symbol: '🌟' };
}

function SectionDivider() {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-[#E8E0D2]" />
      <Sparkles size={10} className="text-[#C9A86A]" />
      <div className="flex-1 h-px bg-[#E8E0D2]" />
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
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Timer: counts up while loading
  React.useEffect(() => {
    if (!loading) { setElapsedSec(0); return; }
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

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
      setCardIndex(0);
      setCardFlipped(false);
      setStep('flip');
      setLoading(false);
      setProgressStage('');
    } catch (err) {
      console.error("AI interpretation failed:", err);
      setError("AI 解读失败，请检查网络后重试。");
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
          <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7">
            <div className="space-y-3">
              <label className="block text-[11px] font-serif uppercase tracking-[0.2em] text-[#5C5349]">你的问题</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={499}
                placeholder="例如：今年我的事业发展趋势如何？"
                className="w-full bg-[#F3EEE6] border border-[#E8E0D2] rounded-2xl p-5 text-lg font-light focus:border-[#C9A86A] outline-none transition-all min-h-[100px] resize-none"
              />
              {/* Scrollable suggested questions */}
              <div className="space-y-2.5 -mx-6">
                <p className="text-[10px] uppercase tracking-widest text-[#5C5349] font-serif px-6">推荐问题</p>
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex gap-2 px-6 pb-1" style={{ width: 'max-content' }}>
                    {SUGGESTED_QUESTIONS.flatMap((group) =>
                      group.questions.map((q) => (
                        <button key={q} onClick={() => setQuestion(q)} className="px-3.5 py-2 rounded-full bg-[#F3EEE6] border border-[#E8E0D2]/50 text-[11px] text-[#5C5349] hover:border-[#C9A86A]/40 hover:bg-[#C9A86A]/5 transition-all whitespace-nowrap shrink-0">
                          <span className="text-[#C9A86A]/60 mr-1 text-[10px]">{group.category}</span>{q}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] font-serif uppercase tracking-[0.2em] text-[#5C5349]">选择牌阵</label>
              <div role="radiogroup" aria-label="选择牌阵" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(SPREADS) as SpreadType[]).map((key) => {
                  const Icon = { single: Zap, three: Columns, five: Layout, relationship: Heart, career: Briefcase, week: Calendar, ten: Compass }[key] || Sparkles;
                  const selected = spreadType === key;
                  return (
                    <div key={key} onClick={() => setSpreadType(key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSpreadType(key); } }} role="radio" aria-checked={selected} tabIndex={0} className={`p-4 rounded-xl border cursor-pointer transition-all ${selected ? 'bg-[#C9A86A]/10 border-[#C9A86A] shadow-sm shadow-[#C9A86A]/10' : 'bg-[#F3EEE6] border-[#E8E0D2] hover:border-[#C9A86A]/30'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className={selected ? 'text-[#C9A86A]' : 'text-[#5C5349]/50'} />
                        <span className="text-[10px] font-mono text-[#5C5349]/60">{SPREADS[key].count}张</span>
                      </div>
                      <h4 className="text-sm font-serif leading-snug">{SPREADS[key].name}</h4>
                      <p className="text-[10px] text-[#5C5349]/60 mt-0.5 line-clamp-1">{SPREADS[key].description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F3EEE6] border border-[#E8E0D2] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ShieldAlert className={`shrink-0 ${isStrictMode ? "text-[#C9A86A]" : "text-[#5C5349]/50"}`} size={18} />
                <div className="min-w-0">
                  <h4 className="text-sm font-serif">严格模式</h4>
                  <p className="text-[10px] text-[#5C5349]/70 truncate">同一问题仅允许一次占卜</p>
                </div>
              </div>
              <button onClick={() => setIsStrictMode(!isStrictMode)} role="switch" aria-checked={isStrictMode} aria-label="严格模式" className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${isStrictMode ? 'bg-[#C9A86A]' : 'bg-[#E8E0D2]'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isStrictMode ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <button disabled={!question.trim() || loading} onClick={startShuffle} className="w-full py-4 bg-[#C9A86A] text-white rounded-full font-medium flex items-center justify-center gap-2 hover:bg-[#B8944F] transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
              <span>开始洗牌</span>
            </button>
          </motion.div>
        )}

        {step === 'shuffle' && session && (
          <motion.div key="shuffle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center space-y-8 py-12">
            <button onClick={goBack} className="self-start flex items-center gap-2 text-[#5C5349] hover:text-[#3D352E] transition-colors text-sm">
              <ArrowLeft size={16} /><span>返回修改</span>
            </button>
            <div className="relative">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} className="w-48 h-48 border-2 border-dashed border-[#C9A86A]/30 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw size={48} className="text-[#C9A86A] animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-serif">洗牌完成</h3>
              <p className="text-[#5C5349]/80">本轮牌序已固定，不可更改。</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#F3EEE6] rounded-full border border-[#E8E0D2] text-xs font-mono text-[#5C5349]">
              <Hash size={14} /><span>校验码: {session.hash.substring(0, 16)}...</span>
            </div>
            <button onClick={() => setStep('select')} className="px-12 py-4 bg-[#C9A86A] text-white rounded-full font-medium flex items-center justify-center gap-2 hover:bg-[#B8944F] transition-all">
              <span>进入选牌</span><ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {step === 'flip' && reading && session && (() => {
          const cards = getCardsFromSelection(session.shuffledDeck, session.orientations, chosenNumbers);
          const cardCount = cards.length;

          return (
            <motion.div key="flip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-gradient-to-b from-[#FAF7F2] via-[#F3EEE6] to-[#E7D7B0] flex flex-col items-center justify-center gap-8 p-6 overflow-hidden">
              {/* Background shimmer effect */}
              <div className="absolute inset-0 opacity-30">
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C9A86A]/20 to-transparent"
                />
              </div>

              {/* Floating particles */}
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute w-1 h-1 bg-[#C9A86A]/40 rounded-full"
                  animate={{
                    y: [0, -300],
                    x: Math.sin(i) * 100,
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 3 + i * 0.3,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  style={{
                    left: `${20 + i * 10}%`,
                    bottom: 0,
                  }}
                />
              ))}

              <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2 relative z-10">
                <motion.h2
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-5xl font-serif bg-gradient-to-r from-[#C9A86A] to-[#E7D7B0] bg-clip-text text-transparent"
                >
                  翻牌时刻
                </motion.h2>
                <p className="text-[#5C5349]/70">见证命运的揭示</p>
              </motion.div>

              <div className="flex gap-6 flex-wrap justify-center max-w-3xl relative z-10">
                {cards.map((card, idx) => {
                  const suit = getCardSuitStyle(card.name);
                  const isFlipped = idx < cardIndex;
                  const isFlipping = idx === cardIndex;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      transition={{ delay: idx * 0.12, duration: 0.6 }}
                      style={{ perspective: '1200px' }}
                      className="cursor-pointer relative"
                      onClick={() => {
                        if (idx === cardIndex && !isFlipped) {
                          setCardIndex(idx + 1);
                        }
                      }}
                    >
                      {/* Glow effect for current card */}
                      {isFlipping && (
                        <motion.div
                          className="absolute inset-0 rounded-xl bg-[#C9A86A]/30 blur-xl"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          style={{ width: '140px', height: '210px', margin: '-10px' }}
                        />
                      )}

                      <motion.div
                        style={{
                          transformStyle: 'preserve-3d',
                          width: '140px',
                          height: '210px',
                          position: 'relative',
                        }}
                        animate={{
                          rotateY: isFlipped ? 180 : 0,
                          scale: isFlipping ? 1.1 : 1,
                        }}
                        transition={{
                          duration: isFlipping ? 0.7 : 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {/* Back */}
                        <div
                          className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#F3EEE6] to-[#E8E0D2] border-2 border-[#C9A86A]/40 flex items-center justify-center shadow-2xl"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div className="absolute inset-2 border border-[#C9A86A]/30 rounded-lg pointer-events-none" />
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 4 }}
                          >
                            <Sparkles size={32} className="text-[#C9A86A]/60" />
                          </motion.div>
                        </div>

                        {/* Front */}
                        <div
                          className={`absolute inset-0 rounded-xl bg-gradient-to-br ${suit.gradient} border-2 border-[#E8E0D2] flex flex-col items-center justify-center shadow-2xl`}
                          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                          <div className={`text-4xl ${card.orientation === 'reversed' ? 'rotate-180' : ''}`}>
                            {suit.symbol}
                          </div>
                          <p className="text-[9px] text-[#5C5349] tracking-widest uppercase mt-2 font-serif">{suit.label}</p>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center space-y-4 relative z-10">
                {cardIndex < cardCount ? (
                  <>
                    <motion.p
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-sm text-[#5C5349]/80 font-medium"
                    >
                      点击卡片继续翻牌
                    </motion.p>
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-32 h-1 bg-[#E8E0D2] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#C9A86A] to-[#E7D7B0]"
                          animate={{ width: `${(cardIndex / cardCount) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className="text-xs text-[#5C5349]/60 font-mono w-12 text-right">{cardIndex}/{cardCount}</p>
                    </div>
                  </>
                ) : (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStep('result')}
                    className="px-12 py-4 bg-gradient-to-r from-[#C9A86A] to-[#E7D7B0] text-white rounded-full font-medium shadow-lg shadow-[#C9A86A]/30 hover:shadow-xl hover:shadow-[#C9A86A]/40 transition-all"
                  >
                    查看完整解读
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          );
        })()}

        {step === 'select' && session && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 relative">
            <button onClick={goBack} className="flex items-center gap-2 text-[#5C5349] hover:text-[#3D352E] transition-colors text-sm">
              <ArrowLeft size={16} /><span>返回洗牌</span>
            </button>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-serif">请选择 {SPREADS[spreadType].count} 个数字</h3>
              <p className="text-[#5C5349]/80 text-sm italic">凭直觉从 1 到 78 中选择位置</p>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2" role="group" aria-label="选择数字">
              {Array.from({ length: 78 }, (_, i) => i + 1).map((num) => (
                <button key={num} onClick={() => handleSelect(num)} disabled={!chosenNumbers.includes(num) && chosenNumbers.length >= SPREADS[spreadType].count}
                  aria-pressed={chosenNumbers.includes(num)}
                  aria-label={`数字 ${num}${chosenNumbers.includes(num) ? '，已选择' : ''}`}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-mono transition-all border ${chosenNumbers.includes(num) ? 'bg-[#C9A86A] border-[#C9A86A] text-white' : 'bg-[#F3EEE6] border-[#E8E0D2] hover:border-[#C9A86A]/30 text-[#5C5349] disabled:opacity-20'}`}>
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
                  <div key={i} className={`w-3 h-3 rounded-full border ${chosenNumbers[i] ? 'bg-[#C9A86A] border-[#C9A86A]' : 'bg-transparent border-[#E8E0D2]'}`} />
                ))}
              </div>
              <button disabled={chosenNumbers.length !== SPREADS[spreadType].count || loading} onClick={startReading}
                className="px-12 py-4 bg-[#C9A86A] text-white rounded-full font-medium flex items-center justify-center gap-2 hover:bg-[#B8944F] transition-all disabled:opacity-50 shadow-2xl shadow-[#C9A86A]/10">
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                <span>{loading ? (progressStage || '解读中...') : '开始解读'}</span>
              </button>
            </div>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md flex flex-col items-center justify-center gap-5" role="alert" aria-live="assertive">
                {/* Rotating icon */}
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}>
                  <Sparkles size={44} className="text-[#C9A86A]" />
                </motion.div>
                {/* Stage text */}
                <motion.p key={progressStage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-serif text-[#3D352E] italic">
                  {progressStage || '正在连接灵感...'}
                </motion.p>
                {/* Elapsed timer */}
                <p className="text-xs text-[#5C5349] tabular-nums">已等待 {elapsedSec}s</p>
                {/* Pulse progress bar */}
                <div className="w-40 h-0.5 bg-[#E7D7B0]/40 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-[#C9A86A]/60 rounded-full"
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

          return (
          <motion.div key="result" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="space-y-0">

            {/* === Section A: Title === */}
            <div className="text-center space-y-5 mb-14">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#C9A86A]/10 text-[#C9A86A] rounded-full text-xs uppercase tracking-widest border border-[#C9A86A]/20">
                <CheckCircle2 size={14} /><span>占卜结论</span>
              </motion.div>
              {/* Question echo */}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="text-sm text-[#5C5349] italic">
                「{session.question}」
              </motion.p>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-3xl sm:text-4xl font-serif leading-tight">{reading.summary}</motion.h2>
            </div>

            {/* === Section B: 全屏单张翻牌舞台 === */}
            <AnimatePresence mode="wait">
            {cardIndex < cardCount ? (() => {
              const currentCard = cards[cardIndex];
              const suit = getCardSuitStyle(currentCard.name);
              return (
                <motion.div key={`card-stage-${cardIndex}`}
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}
                  className="mt-10 flex flex-col items-center"
                >
                  {/* Progress bar */}
                  <div className="flex items-center justify-between w-full mb-8">
                    <div className="flex gap-1.5 items-center">
                      {cards.map((_, i) => (
                        <div key={i} className={`rounded-full transition-all duration-500 ${
                          i < cardIndex ? 'w-5 h-1.5 bg-[#C9A86A]' :
                          i === cardIndex ? 'w-5 h-1.5 bg-[#C9A86A]' :
                          'w-1.5 h-1.5 bg-[#E8E0D2]/30'
                        }`} />
                      ))}
                    </div>
                    <span className="text-[11px] text-[#5C5349]/60 font-mono tabular-nums">
                      {cardIndex + 1} / {cardCount}
                    </span>
                  </div>

                  {/* Position label */}
                  <p className="text-[11px] uppercase tracking-[0.25em] text-[#5C5349] mb-8 font-serif">
                    第 {cardIndex + 1} 张 · {SPREADS[spreadType].positions[cardIndex]}
                  </p>

                  {/* ── The flip card ── */}
                  <div style={{ perspective: '1000px' }} className="mb-10">
                    <motion.div
                      style={{
                        transformStyle: 'preserve-3d',
                        width: '160px',
                        height: '240px',
                        position: 'relative',
                        cursor: cardFlipped ? 'default' : 'pointer',
                      }}
                      animate={{ rotateY: cardFlipped ? 180 : 0 }}
                      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => !cardFlipped && setCardFlipped(true)}
                    >
                      {/* Back face */}
                      <div className="absolute inset-0 rounded-2xl bg-[#F3EEE6] border border-[#E8E0D2] flex flex-col items-center justify-center gap-4 select-none"
                        style={{ backfaceVisibility: 'hidden' }}>
                        <div className="absolute inset-3 border border-[#E8E0D2]/60 rounded-xl pointer-events-none" />
                        <div className="absolute inset-6 border border-white/[0.03] rounded-lg pointer-events-none" />
                        <motion.div animate={{ opacity: [0.25, 0.8, 0.25], scale: [0.88, 1.12, 0.88] }}
                          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
                          <Sparkles size={28} className="text-[#C9A86A]/50" />
                        </motion.div>
                        <span className="text-[11px] text-[#5C5349]/60 font-serif italic tracking-wider">点击翻牌</span>
                      </div>

                      {/* Front face */}
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${suit.gradient} border border-[#E8E0D2] flex flex-col items-center justify-center gap-2 select-none`}
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div className="absolute inset-2 border border-[#E8E0D2]/60 rounded-xl pointer-events-none" />
                        <div className={`text-5xl ${currentCard.orientation === 'reversed' ? 'rotate-180' : ''}`}>
                          {suit.symbol}
                        </div>
                        <p className="text-[9px] text-[#5C5349] tracking-[0.25em] uppercase mt-1">{suit.label}</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* ── Interpretation (slides in after flip) ── */}
                  <AnimatePresence>
                  {cardFlipped && (
                    <motion.div
                      initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45, duration: 0.55 }}
                      className="w-full space-y-6"
                    >
                      {/* Card identity */}
                      <div className="text-center space-y-2">
                        <h3 className="text-3xl font-serif">{currentCard.name}</h3>
                        <p className="text-sm text-[#5C5349] tracking-wider">{currentCard.nameEn}</p>
                        <span className={`inline-block mt-1 text-xs px-3 py-1 rounded-full border ${
                          currentCard.orientation === 'upright'
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                            : 'border-red-500/30 text-red-400 bg-red-500/5'
                        }`}>
                          {currentCard.orientation === 'upright' ? '正位' : '逆位'}
                        </span>
                      </div>

                      {/* Keywords */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {currentCard.keywords.map(k => (
                          <span key={k} className="text-xs px-3 py-1 bg-[#F3EEE6] rounded-full text-[#5C5349]/80">{k}</span>
                        ))}
                      </div>

                      <SectionDivider />

                      {/* Interpretation text */}
                      <p className="text-[15px] text-[#5C5349] leading-[1.8] font-light">
                        {reading.detailedInterpretations?.[cardIndex]?.meaning || '暂无解读'}
                      </p>

                      {/* Next / finish button */}
                      <div className="pt-2 pb-8">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            if (cardIndex < cardCount - 1) {
                              setCardIndex(i => i + 1);
                              setCardFlipped(false);
                            } else {
                              setCardIndex(cardCount);
                            }
                          }}
                          className="w-full py-4 bg-[#C9A86A] text-white rounded-full font-medium flex items-center justify-center gap-2 hover:bg-[#B8944F] transition-all shadow-lg shadow-[#C9A86A]/20"
                        >
                          {cardIndex < cardCount - 1 ? (
                            <><span>下一张牌</span><ArrowRight size={16} /></>
                          ) : (
                            <><Sparkles size={16} /><span>查看完整解读</span></>
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </motion.div>
              );
            })() : (
              /* === Section C: Analysis (after all cards) === */
              <motion.div key="analysis"
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
              <SectionDivider />
              <div className="space-y-10 mt-10 mb-16">
                {/* Overall Trend */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="p-6 sm:p-8 rounded-2xl bg-[#FFFDF9] border border-[#E8E0D2]">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={16} className="text-[#C9A86A]" />
                    <h3 className="text-lg font-serif">整体趋势</h3>
                  </div>
                  <p className="text-[#5C5349] leading-[1.8] text-[14px]">{reading.overallTrend}</p>
                </motion.div>

                {/* Three Suggestion Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="p-5 rounded-xl bg-[#FFFDF9] border border-[#E8E0D2] border-t-2 border-t-emerald-500/50">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRight size={13} className="text-emerald-400" />
                      <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-widest">行动</h4>
                    </div>
                    <p className="text-[#5C5349] text-[13px] leading-[1.7]">{reading.suggestions?.actionableSteps || '暂无建议'}</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className="p-5 rounded-xl bg-[#FFFDF9] border border-[#E8E0D2] border-t-2 border-t-blue-400/50">
                    <div className="flex items-center gap-2 mb-3">
                      <RefreshCw size={13} className="text-blue-400" />
                      <h4 className="text-xs font-medium text-blue-400 uppercase tracking-widest">心态</h4>
                    </div>
                    <p className="text-[#5C5349] text-[13px] leading-[1.7]">{reading.suggestions?.mindsetShift || '暂无建议'}</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                    className="p-5 rounded-xl bg-[#FFFDF9] border border-[#E8E0D2] border-t-2 border-t-amber-400/50">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle size={13} className="text-amber-400" />
                      <h4 className="text-xs font-medium text-amber-400 uppercase tracking-widest">警示</h4>
                    </div>
                    <p className="text-[#5C5349] text-[13px] leading-[1.7]">{reading.suggestions?.warningSigns || '暂无警示'}</p>
                  </motion.div>
                </div>

                {/* Core Advice */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
                  className="p-6 sm:p-8 rounded-2xl bg-[#C9A86A]/10 border border-[#C9A86A]/20 flex flex-col gap-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles size={14} className="text-[#C9A86A]" />
                    <h3 className="text-xs font-medium text-[#C9A86A] uppercase tracking-widest">核心建议</h3>
                  </div>
                  <p className="text-[#3D352E] text-lg sm:text-xl font-serif leading-[1.6]">
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
                          className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E0D2] flex gap-4">
                          <div className="text-2xl shrink-0">{scSuit.symbol}</div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-serif text-[#3D352E]">{sc.name}</h4>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sc.orientation === 'upright' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {sc.orientation === 'upright' ? '正位' : '逆位'}
                              </span>
                            </div>
                            <p className="text-xs text-[#5C5349]/80 leading-relaxed">{sc.interpretation}</p>
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
                      className="w-full sm:w-auto px-8 py-3 bg-[#F3EEE6] border border-[#E8E0D2] text-[#C9A86A] rounded-full font-medium hover:bg-[#E7D7B0] transition-all flex items-center justify-center gap-2">
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                      <span>补抽一张牌</span>
                    </motion.button>
                  )}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={onComplete}
                    className="w-full sm:w-auto px-12 py-4 bg-[#C9A86A] text-white rounded-full font-medium hover:bg-[#B8944F] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#C9A86A]/20">
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
