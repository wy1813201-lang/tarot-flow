import React, { useState, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SPREADS, SpreadType } from '../constants/tarot';
import { shuffleDeck, generateHash, getCardsFromSelection, TarotSession } from '../lib/tarotLogic';
import { interpretTarotStream, interpretSupplementary, interpretDeepAnalysis, DeepAnalysis } from '../services/ai';
import { TarotReading } from '../types/reading';
import { ArrowRight, ArrowLeft, RefreshCw, Hash, Loader2, Sparkles, ChevronRight, Target, Shield, Eye, Wind, Brain, Clock, Plus, AlertCircle, Dice5, Download, TrendingUp } from 'lucide-react';
import { SetupForm } from './TarotFlow/SetupForm';
import { FlipStage } from './TarotFlow/FlipStage';
const ResultPage = lazy(() => import('./TarotFlow/ResultPage').then(m => ({ default: m.ResultPage })));
type Step = 'setup' | 'shuffle' | 'select' | 'flip' | 'result';

import { getExcerpt } from '../lib/utils';




const ASTRO_PHRASES = [
  "正在触碰卡牌的灵魂边界...",
  "星轨交汇，命运线开始显影...",
  "倾听古老神谕的低语...",
  "正在穿越意象的迷雾...",
  "即将凝结最终的命运裁决..."
];

const ALL_CARD_NUMBERS = Array.from({ length: 78 }, (_, i) => i + 1);
function pickRandomUniqueNumbers(pool: number[], count: number): number[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

// SUGGESTED_QUESTIONS moved to SetupForm.tsx

interface SupplementaryCard {
  name: string;
  nameEn: string;
  orientation: string;
  keywords: string[];
  interpretation: string; // legacy fallback
  coreMessage: string;
  advice: string;
  connection: string;
  portraitContinuation: string;
  deepReading: string;
  energyShift: string;
  chosenNumber: number;
  imageUrl: string;
  contextType?: 'overall' | 'card' | 'general';
  contextLabel?: string;
}

interface SupplementaryCardData {
  name: string; nameEn: string; orientation: string; keywords: string[];
  imageUrl: string; portraitContinuation: string; deepReading: string; energyShift: string;
  contextType?: string; contextLabel?: string;
}

interface StoredSessionRecord {
  id: string;
  question: string;
  spreadType: string;
  isStrictMode: boolean;
  hash: string;
  reading?: TarotReading;
  createdAt: string;
  shuffledDeck?: number[];
  orientations?: ("upright" | "reversed")[];
  chosenNumbers?: number[];
  supplementaryCards?: SupplementaryCard[];
  deepAnalysis?: DeepAnalysis | null;
}

// (splitActionableSteps and getExcerpt moved to utils.ts)





export default function TarotFlow({ onComplete, initialSessionRecord }: { onComplete: () => void, initialSessionRecord?: StoredSessionRecord | null }) {
  const [step, setStep] = useState<Step>(initialSessionRecord?.reading ? 'result' : 'setup');
  const [question, setQuestion] = useState(initialSessionRecord?.question || '');
  const [spreadType, setSpreadType] = useState<SpreadType>((initialSessionRecord?.spreadType as SpreadType) || 'three');
  const [isStrictMode, setIsStrictMode] = useState(initialSessionRecord?.isStrictMode || false);
  const [session, setSession] = useState<TarotSession | null>(
    initialSessionRecord ? {
      hash: initialSessionRecord.hash,
      question: initialSessionRecord.question,
      spreadType: initialSessionRecord.spreadType,
      isStrictMode: initialSessionRecord.isStrictMode,
      shuffledDeck: initialSessionRecord.shuffledDeck,
      orientations: initialSessionRecord.orientations
    } : null
  );
  const [chosenNumbers, setChosenNumbers] = useState<number[]>(initialSessionRecord?.chosenNumbers || []);
  const [reading, setReading] = useState<TarotReading | null>(initialSessionRecord?.reading || null);
  const [sessionRecordId, setSessionRecordId] = useState<string | null>(initialSessionRecord?.id || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState('');
  const [supplementaryCards, setSupplementaryCards] = useState<SupplementaryCard[]>(initialSessionRecord?.supplementaryCards || []);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [astroPhraseIdx, setAstroPhraseIdx] = useState(0);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [replacementIndex, setReplacementIndex] = useState<number | null>(null);
  const [lastRollMessage, setLastRollMessage] = useState('');
  const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysis | null>(initialSessionRecord?.deepAnalysis || null);
  const [deepAnalysisLoading, setDeepAnalysisLoading] = useState(false);
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(0);
  const [advancedOpen, setAdvancedOpen] = useState(
    !!(initialSessionRecord?.supplementaryCards?.length || initialSessionRecord?.deepAnalysis)
  );
  const [portraitExpanded, setPortraitExpanded] = useState(false);

  // Particles removed from here, moving to FlipStage

  // Memoize card selections
  const selectedCards = useMemo(() => {
    if (!session || chosenNumbers.length === 0) return [];
    return getCardsFromSelection(session.shuffledDeck, session.orientations, chosenNumbers);
  }, [session, chosenNumbers]);

  const {
    overallSupplementaryCards,
    generalSupplementaryCards,
    supplementaryCardsByLabel,
  } = useMemo(() => {
    const overall: typeof supplementaryCards = [];
    const general: typeof supplementaryCards = [];
    const byLabel: Record<string, typeof supplementaryCards> = {};
    for (const sc of supplementaryCards) {
      if (sc.contextType === 'overall') {
        overall.push(sc);
      } else if (sc.contextType === 'general' || !sc.contextType) {
        general.push(sc);
      } else if (sc.contextType === 'card' && sc.contextLabel) {
        if (!byLabel[sc.contextLabel]) byLabel[sc.contextLabel] = [];
        byLabel[sc.contextLabel].push(sc);
      }
    }
    return { overallSupplementaryCards: overall, generalSupplementaryCards: general, supplementaryCardsByLabel: byLabel };
  }, [supplementaryCards]);

  const requiredCardCount = SPREADS[spreadType].count;
  const replacementLabel = replacementIndex !== null
    ? SPREADS[spreadType].positions[replacementIndex] || `牌位 ${replacementIndex + 1}`
    : null;

  React.useEffect(() => {
    if (!sessionRecordId) return;
    try {
      const existing = JSON.parse(localStorage.getItem('tarot_sessions') || '[]');
      const updated = existing.map((record: StoredSessionRecord) =>
        record.id === sessionRecordId
          ? { ...record, supplementaryCards, deepAnalysis }
          : record
      );
      localStorage.setItem('tarot_sessions', JSON.stringify(updated));
    } catch {
      // localStorage save failed silently
    }
  }, [sessionRecordId, supplementaryCards, deepAnalysis]);

  // Timer: counts up while loading
  React.useEffect(() => {
    if (!loading) { 
      setElapsedSec(0); 
      setAstroPhraseIdx(0);
      return; 
    }
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    const pt = setInterval(() => setAstroPhraseIdx(prev => (prev + 1) % ASTRO_PHRASES.length), 3500);
    return () => { clearInterval(t); clearInterval(pt); };
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

    const readingInput = {
      question: session.question,
      spreadType: SPREADS[spreadType].name,
      isStrictMode: session.isStrictMode,
      positions
    };

    // Try up to 2 times with brief delay between retries
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          setProgressStage('连接波动，正在重新尝试...');
          await new Promise(r => setTimeout(r, 1500));
        }
        const result = await interpretTarotStream(readingInput, setProgressStage);

        const recordId = crypto.randomUUID();
        const finalSession: StoredSessionRecord = {
          id: recordId,
          ...session,
          chosenNumbers,
          reading: result,
          supplementaryCards: [],
          deepAnalysis: null,
          createdAt: new Date().toISOString()
        };

        try {
          const existing = JSON.parse(localStorage.getItem('tarot_sessions') || '[]');
          existing.unshift(finalSession);
          localStorage.setItem('tarot_sessions', JSON.stringify(existing.slice(0, 100)));
        } catch {
          // localStorage save failed silently
        }
        setSessionRecordId(recordId);
        setReading(result);
        setStep('result');
        setLoading(false);
        setProgressStage('');
        return; // success — exit early
      } catch (e: any) {
        lastError = e;
        const msg = e?.message || '';
        // Don't retry on quota exhaustion — it won't help
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) break;
      }
    }

    // All retries failed
    const msg = lastError?.message || '';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      setError("API 配额暂时耗尽。请稍等片刻后重试，或在设置中切换模型。");
    } else {
      setError(`AI 解读失败：${msg.slice(0, 100) || '请检查网络后重试。'}`);
    }
    setLoading(false);
    setProgressStage('');
  };

  const drawSupplementaryCard = async (contextType: 'overall' | 'card' | 'general' = 'general', contextLabel?: string) => {
    if (!session || isStrictMode || loading) return;
    setLoading(true);

    const availableNumbers = Array.from({ length: 78 }, (_, i) => i + 1)
      .filter(n => !chosenNumbers.includes(n) && !supplementaryCards.some(sc => sc.chosenNumber === n));

    if (availableNumbers.length === 0) { setLoading(false); return; }

    const randomNum = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    const cardData = getCardsFromSelection(session.shuffledDeck, session.orientations, [randomNum])[0];

    try {
      if (contextType === 'overall' && !contextLabel) {
        setProgressStage('正在基于全局灵感补牌...');
      } else if (contextType === 'card' && contextLabel) {
        setProgressStage(`正在针对「${contextLabel}」补牌...`);
      } else {
        setProgressStage('正在连接新灵感...');
      }

      const result = await interpretSupplementary({
        question: session.question,
        card: cardData.name,
        orientation: cardData.orientation,
        keywords: cardData.keywords,
        contextType,
        contextLabel,
        existingPortrait: reading?.eventPortrait || '',
        existingCards: selectedCards.map(c => `${c.name}(${c.orientation === 'upright' ? '正位' : '逆位'})`),
        existingContinuations: supplementaryCards.map(sc => sc.portraitContinuation).filter(Boolean),
        deepAnalysisContext: deepAnalysis ? JSON.stringify(deepAnalysis) : undefined,
      });
      setSupplementaryCards(prev => [...prev, {
        ...cardData, 
        interpretation: result.portraitContinuation || result.coreMessage, 
        coreMessage: result.coreMessage, 
        advice: result.advice, 
        connection: result.connection,
        portraitContinuation: result.portraitContinuation,
        deepReading: result.deepReading,
        energyShift: result.energyShift,
        chosenNumber: randomNum, 
        contextType,
        contextLabel 
      }]);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
        setError("补牌请求受限，请稍后再试。");
      } else {
        setError(err instanceof Error ? err.message : "补牌解读失败，请重试。");
      }
      // Auto-dismiss supplement errors after 5s
      setTimeout(() => setError(null), 5000);
    } finally {
      setProgressStage('');
      setLoading(false);
    }
  };

  const generateDeepAnalysis = async () => {
    if (!session || !reading || deepAnalysisLoading) return;
    setDeepAnalysisLoading(true);
    try {
      const cards = getCardsFromSelection(session.shuffledDeck, session.orientations, chosenNumbers);
      const result = await interpretDeepAnalysis({
        question: session.question,
        eventPortrait: reading.eventPortrait || reading.summary,
        summary: reading.summary,
        cards: reading.detailedInterpretations.map((di, i) => ({
          name: cards[i]?.name || di.card,
          orientation: cards[i]?.orientation || 'upright',
          position: di.position,
          meaning: di.meaning,
        })),
      });
      setDeepAnalysis(result);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : '深度分析生成失败，请重试。');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeepAnalysisLoading(false);
    }
  };

  const exportPoster = async () => {
    const doExport = async () => {
      const el = document.getElementById('tarot-result-container');
      if (!el || !(window as any).htmlToImage) return;
      try {
        setLoading(true);
        const dataUrl = await (window as any).htmlToImage.toPng(el, {
          pixelRatio: 2,
          backgroundColor: '#FAF7F2',
          filter: (node: any) => {
            if (node.classList && node.classList.contains('export-exclude')) {
              return false;
            }
            return true;
          }
        });
        const link = document.createElement('a');
        link.download = `TarotFlow_Divine_${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (!(window as any).htmlToImage) {
      setLoading(true);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
      script.onload = () => doExport();
      document.body.appendChild(script);
    } else {
      doExport();
    }
  };

  const rollDiceBatch = () => {
    if (diceRolling || (chosenNumbers.length >= requiredCardCount && replacementIndex === null)) return;
    const targetReplacementIndex = replacementIndex;
    const targetReplacementLabel = replacementLabel;
    const snapshotChosenNumbers = [...chosenNumbers];
    setDiceRolling(true);
    setDiceResults([]);
    setLastRollMessage('');
    window.setTimeout(() => {
      if (targetReplacementIndex !== null) {
        const currentNumber = snapshotChosenNumbers[targetReplacementIndex];
        const lockedNumbers = snapshotChosenNumbers.filter((_, index) => index !== targetReplacementIndex);
        const available = ALL_CARD_NUMBERS.filter((n) => n !== currentNumber && !lockedNumbers.includes(n));
        const [replacementNumber] = pickRandomUniqueNumbers(available, 1);
        const nextNumbers = snapshotChosenNumbers.map((num, index) => (
          index === targetReplacementIndex ? replacementNumber : num
        ));
        setDiceResults([replacementNumber]);
        setChosenNumbers(nextNumbers);
        setLastRollMessage(`已将「${targetReplacementLabel}」替换为 ${replacementNumber}`);
        setReplacementIndex(null);
      } else {
        const available = ALL_CARD_NUMBERS.filter((n) => !snapshotChosenNumbers.includes(n));
        const pickedNumbers = pickRandomUniqueNumbers(available, requiredCardCount);
        setDiceResults(pickedNumbers);
        setChosenNumbers(pickedNumbers);
        setLastRollMessage(`命运已为你落下 ${pickedNumbers.length} 个数字，对应牌阵已经选定`);
      }
      setDiceRolling(false);
    }, 650);
  };

  const goBack = () => {
    if (step === 'shuffle') setStep('setup');
    else if (step === 'select') {
      setStep('shuffle');
      setChosenNumbers([]);
      setDiceResults([]);
      setDiceRolling(false);
      setReplacementIndex(null);
      setLastRollMessage('');
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col">
      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <SetupForm
            question={question}
            setQuestion={setQuestion}
            spreadType={spreadType}
            setSpreadType={setSpreadType}
            isStrictMode={isStrictMode}
            setIsStrictMode={setIsStrictMode}
            startShuffle={startShuffle}
            loading={loading}
          />
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
            <button onClick={() => {
              setChosenNumbers([]);
              setDiceResults([]);
              setReplacementIndex(null);
              setLastRollMessage('');
              setStep('select');
            }} className="px-12 py-4 bg-[#C9A86A] text-white rounded-full font-medium flex items-center justify-center gap-2 hover:bg-[#B8944F] transition-all">
              <span>进入选牌</span><ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {step === 'flip' && session && (
          <FlipStage
            selectedCards={selectedCards}
            spreadType={spreadType}
            error={error}
            setError={setError}
            startReading={startReading}
            loading={loading}
          />
        )}

        {step === 'select' && session && (
          <motion.div key="select" initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }} className="space-y-10 relative w-full min-h-[60vh] flex flex-col items-center justify-center py-6">
            {/* 动态呼吸环境光晕 (保留高级的背景质感) */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-[#FDF9F1]/80 to-[#F2E5C9]/50 blur-3xl opacity-50"
              />
              <motion.div
                animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-20 -right-20 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-[#FFFFFF]/80 to-[#E8D9B4]/40 blur-3xl opacity-30"
              />
            </div>

            {/* 返回与头部 */}
            <div className="w-full max-w-5xl px-4 flex justify-start z-10">
              <button onClick={goBack} className="flex items-center gap-2 text-[#5C5349] hover:text-[#3D352E] transition-all text-sm font-medium bg-white/30 px-4 py-2 rounded-full backdrop-blur-md border border-white/50 shadow-sm hover:bg-white/50">
                <ArrowLeft size={16} /><span>返回洗牌</span>
              </button>
            </div>

            <div className="w-full flex-1 flex flex-col items-center space-y-6 z-10 px-4 relative justify-center">
              
              {/* 计算当前是否属于结算无替换状态 */}
              {(function() {
                const isResultsPhase = chosenNumbers.length >= requiredCardCount && replacementIndex === null;
                return (
                  <>
                    {/* 清晰的标题与描述文字 (仅在投掷阶段和重铸阶段显示) */}
                    <AnimatePresence mode="popLayout">
                      {!isResultsPhase && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0, scale: 0.8 }}
                          animate={{ opacity: 1, height: 'auto', scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.8 }}
                          transition={{ type: "spring", bounce: 0.2 }}
                          className="text-center space-y-3 origin-center mt-6"
                        >
                          <motion.h3 className="text-3xl font-serif text-[#3D352E] drop-shadow-sm">
                            投掷骰子选牌
                          </motion.h3>
                          <motion.p className="text-[#5C5349]/90 text-sm italic">
                            {replacementLabel
                              ? `当前准备替换「${replacementLabel}」，再掷一次就会更新这个牌位`
                              : `点击一次骰子，直接显现 ${requiredCardCount} 个对应数字`}
                          </motion.p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ================= 电影级氛围层 (柔和化/圣洁化) ================= */}

                    {/* 1. 柔和夜幕 (Soft Eclipse) - 降低不透明度，温和压暗 */}
                    <AnimatePresence>
                      {diceRolling && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, transition: { duration: 0.8 } }}
                          className="fixed inset-0 bg-[#3D352E]/30 z-0 pointer-events-none backdrop-blur-sm"
                        />
                      )}
                    </AnimatePresence>

                    {/* 2. 圣洁光晕扩散 (Ethereal Ripple) - 去除暴力的全白闪屏，改为局部柔和散光 */}
                    <AnimatePresence>
                      {!diceRolling && lastRollMessage && (
                        <>
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0.8 }}
                            animate={{ scale: 4, opacity: 0 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-tr from-[#FFFDF9] to-[#F1E0C0] z-[80] pointer-events-none mix-blend-screen blur-3xl"
                          />
                          <motion.div
                            initial={{ scale: 0.2, opacity: 1, borderWidth: '8px' }}
                            animate={{ scale: 6, opacity: 0, borderWidth: '0px' }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-white/60 z-[80] pointer-events-none shadow-[0_0_40px_rgba(255,255,255,0.5)]"
                          />
                        </>
                      )}
                    </AnimatePresence>

                    {/* ================= 平移包裹流 (移除震屏) ================= */}
                    <motion.div
                      layout
                      className="w-full flex flex-col items-center z-10"
                      // 移除了夸张的 x/y 物理震动，仅保留平滑过渡
                      animate={{ x: 0, y: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      {/* 空间重置的 3D 骰子：当位于结果页时，体积大幅度缩小、高度降低，让出 C 位 */}
                      <motion.div 
                        layout 
                        animate={{ 
                          scale: isResultsPhase ? 0.6 : 1, 
                          marginBottom: isResultsPhase ? '-3rem' : '1rem',
                          marginTop: isResultsPhase ? '-1rem' : '2.5rem'
                        }} 
                        transition={{ type: "spring", bounce: 0.2, duration: 1 }}
                        style={{ perspective: '1200px' }} 
                        className="flex items-center justify-center relative w-48 h-48 z-10"
                      >
                        {/* 骰子底部的环境投影 */}
                        <motion.div 
                          animate={diceRolling ? { scale: [1, 1.8, 1], opacity: [0.3, 0.7, 0.3] } : { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: diceRolling ? 1.5 : 3, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute bottom-[-1rem] w-32 h-6 rounded-[100%] bg-[#B8944F]/30 blur-xl"
                        />

                        {/* 神圣星盘仪 (柔和慢转) */}
                        <AnimatePresence>
                          {diceRolling && (
                            <motion.div
                              style={{ transformStyle: 'preserve-3d' }}
                              animate={{ rotateX: [0, 360], rotateY: [0, -360], rotateZ: [0, 180] }}
                              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                              className="absolute inset-0 flex items-center justify-center pointer-events-none scale-150 opacity-60"
                            >
                              <div className="absolute w-full h-full rounded-full border border-[#C9A86A]/40 shadow-[0_0_15px_rgba(201,168,106,0.3)]" style={{ transform: 'rotateX(75deg)' }} />
                              <div className="absolute w-full h-full rounded-full border border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.4)]" style={{ transform: 'rotateY(75deg)' }} />
                              <div className="absolute w-full h-full rounded-full border border-[#FFFDF9]/40 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]" style={{ transform: 'rotateZ(45deg) rotateX(45deg)' }} />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <motion.div
                          className={`relative w-24 h-24 ${isResultsPhase ? 'cursor-default' : 'cursor-pointer'}`}
                          style={{ transformStyle: 'preserve-3d' }}
                          animate={
                            diceRolling 
                              ? { rotateX: [0, 360, 720, 1080], rotateY: [0, 180, 540, 720], rotateZ: [0, 180, 360, 540], z: [0, 100, 0], scale: [1, 1.25, 1] } 
                              : { rotateX: [15, 25, 15], rotateY: [-20, 20, -20] }
                          }
                          transition={
                            diceRolling 
                              ? { duration: 0.65, ease: 'easeInOut' } 
                              : { duration: 6, ease: 'easeInOut', repeat: Infinity }
                          }
                          onClick={!diceRolling && !isResultsPhase ? rollDiceBatch : undefined}
                          whileHover={!diceRolling && !isResultsPhase ? { scale: 1.08 } : {}}
                          whileTap={!diceRolling && !isResultsPhase ? { scale: 0.95 } : {}}
                        >
                          {['front', 'back', 'right', 'left', 'top', 'bottom'].map((face) => {
                            const transforms = {
                              front: 'translateZ(48px)',
                              back: 'rotateX(180deg) translateZ(48px)',
                              right: 'rotateY(90deg) translateZ(48px)',
                              left: 'rotateY(-90deg) translateZ(48px)',
                              top: 'rotateX(90deg) translateZ(48px)',
                              bottom: 'rotateX(-90deg) translateZ(48px)',
                            };
                            return (
                              <div
                                key={face}
                                className={`absolute inset-0 flex items-center justify-center rounded-2xl bg-[#FDFBF7] border-[2.5px] border-[#C9A86A]/80 shadow-[inset_0_0_15px_rgba(201,168,106,0.15)] ${
                                  isResultsPhase ? 'opacity-50 grayscale(50%)' : 'opacity-100'
                                }`}
                                style={{ 
                                  transform: transforms[face as keyof typeof transforms], 
                                  backfaceVisibility: 'visible',
                                  backgroundImage: 'radial-gradient(circle at center, #FFFFFF 0%, #FAF6EE 70%, #EFE5D1 100%)'
                                }}
                              >
                                {/* 内圈法阵嵌套 */}
                                <div className="absolute inset-1.5 rounded-xl border border-[#C9A86A]/30 flex items-center justify-center">
                                  <div className="absolute inset-2 rounded-full border border-dashed border-[#C9A86A]/40 pointer-events-none" />
                                </div>
                                <Dice5 size={32} strokeWidth={1.5} className={`relative z-10 ${isResultsPhase ? 'text-[#C9A86A]/50' : 'text-[#C9A86A]'} drop-shadow-sm`} />
                              </div>
                            );
                          })}
                        </motion.div>
                      </motion.div>

                      {/* 视觉反馈文字 (结果产生后隐藏，避免挤占空间) */}
                      <div className="relative w-full h-0 flex items-center justify-center overflow-visible pointer-events-none z-10">
                        <AnimatePresence mode="wait">
                          {diceRolling ? (
                            <motion.p key="rolling" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute -top-4 text-xs font-serif text-white/90 italic drop-shadow-md">
                              {replacementLabel ? `重铸「${replacementLabel}」...` : ''}
                            </motion.p>
                          ) : null}
                        </AnimatePresence>
                      </div>

                    {/* 空间置换：只有在抽到卡牌后，这里才隆重登场 */}
                      <AnimatePresence mode="popLayout">
                        {chosenNumbers.length > 0 && (
                          <motion.div 
                            layout
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: "spring", bounce: 0.5, duration: 1 }}
                            className="relative w-full max-w-4xl mx-auto pb-12 mt-10 z-10"
                          >
                            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                              {chosenNumbers.map((num, i) => {
                                const isTarget = replacementIndex === i;
                                const isDimmed = replacementIndex !== null && !isTarget;
                                return (
                                  <motion.div
                                    key={`${num}-${i}`}
                                    layout
                                    initial={{ opacity: 0, scale: 2.5, y: -40 }}
                                    animate={{ 
                                      opacity: isDimmed ? 0.2 : 1, 
                                      scale: isTarget ? 1.08 : 1, 
                                      y: 0, 
                                      filter: isDimmed ? 'blur(3px) grayscale(50%)' : 'blur(0px) grayscale(0%)'
                                    }}
                                    transition={{ 
                                      duration: 0.5, 
                                      type: 'spring', 
                                      bounce: isTarget || !isDimmed ? 0.5 : 0 
                                    }}
                                    className="relative flex flex-col items-center group cursor-pointer"
                                    onClick={() => !diceRolling && setReplacementIndex((prev) => prev === i ? null : i)}
                                  >
                                    <p className="text-[10px] uppercase tracking-widest text-[#5C5349]/50 font-medium mb-1.5">{SPREADS[spreadType].positions[i] || `牌位 ${i + 1}`}</p>
                                    
                                    <div className={`relative flex flex-col items-center justify-center w-20 h-20 rounded-full transition-all duration-300 backdrop-blur-xl ${
                                      isTarget
                                        ? 'bg-white/90 border border-[#C9A86A]/50 shadow-[0_0_40px_rgba(201,168,106,0.5),inset_0_2px_10px_rgba(255,255,255,0.9)] z-10'
                                        : 'bg-white/20 border border-white/40 shadow-[0_4px_16px_rgba(201,168,106,0.04),inset_0_1px_4px_rgba(255,255,255,0.4)] group-hover:bg-white/80 group-hover:shadow-[0_8px_24px_rgba(201,168,106,0.15)] group-hover:border-white/80'
                                    }`}>
                                      
                                      {isTarget && (
                                        <motion.div 
                                          animate={{ opacity: [0.4, 0.8, 0.4] }} 
                                          transition={{ repeat: Infinity, duration: 1.5 }}
                                          className="absolute inset-0 rounded-full border border-[#C9A86A]/60 shadow-[inset_0_0_15px_rgba(201,168,106,0.2)] pointer-events-none" 
                                        />
                                      )}

                                      {(!isTarget && !diceRolling) && (
                                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                          <RefreshCw size={10} className="text-[#C9A86A]" />
                                        </div>
                                      )}

                                      <span className="relative z-10 text-4xl font-serif text-transparent bg-clip-text bg-gradient-to-br from-[#9B7A39] to-[#C9A86A] font-bold drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        {num}
                                      </span>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </>
                );
              })()}

              {/* 进入翻牌 */}
              <AnimatePresence>
                {chosenNumbers.length >= requiredCardCount && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-12 z-50 flex flex-col items-center gap-3 w-full max-w-5xl px-4 pointer-events-none"
                  >
                    {/* 直接删除了原先的说明容器 */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStep('flip')}
                      className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#C9A86A] hover:bg-[#B8944F] px-8 py-3.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(201,168,106,0.3)] transition-all"
                    >
                      <span>进入翻牌</span>
                      <ArrowRight size={16} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {step === 'result' && reading && session && (
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#C9A86A]" size={32} /></div>}>
          <ResultPage
            session={session}
            reading={reading}
            selectedCards={selectedCards}
            spreadType={spreadType}
            supplementaryCards={supplementaryCards}
            overallSupplementaryCards={overallSupplementaryCards}
            generalSupplementaryCards={generalSupplementaryCards}
            supplementaryCardsByLabel={supplementaryCardsByLabel}
            deepAnalysis={deepAnalysis}
            expandedCardIndex={expandedCardIndex}
            setExpandedCardIndex={setExpandedCardIndex}
            portraitExpanded={portraitExpanded}
            setPortraitExpanded={setPortraitExpanded}
            advancedOpen={advancedOpen}
            setAdvancedOpen={setAdvancedOpen}
            drawSupplementaryCard={drawSupplementaryCard}
            generateDeepAnalysis={generateDeepAnalysis}
            exportPoster={exportPoster}
            loading={loading}
            deepAnalysisLoading={deepAnalysisLoading}
            isStrictMode={isStrictMode}
            error={error}
            setError={setError}
            onComplete={onComplete}
          />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Immersive loading overlay when startReading() is called from flip step */}
      <AnimatePresence>
        {loading && progressStage && step === 'flip' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
            style={{ background: 'radial-gradient(ellipse at center, rgba(26,20,16,0.95) 0%, rgba(13,10,7,0.98) 100%)' }}
          >
            <div className="flex flex-col items-center gap-6 text-center px-6">
              {/* Rotating card-back icon with pulse */}
              <div className="relative">
                <motion.div
                  animate={{ rotateY: [0, 180, 360] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="w-16 h-24 rounded-lg border border-[#C9A86A]/30 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(201,168,106,0.15), rgba(201,168,106,0.05))', transformStyle: 'preserve-3d' }}
                >
                  <Sparkles size={24} className="text-[#C9A86A]" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="absolute inset-0 rounded-lg border border-[#C9A86A]/20"
                />
              </div>
              <div className="space-y-2">
                <motion.p
                  key={progressStage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg font-serif text-[#E7D7B0]"
                >
                  {progressStage}
                </motion.p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={astroPhraseIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-[#C9A86A]/60 italic"
                  >
                    {ASTRO_PHRASES[astroPhraseIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#C9A86A]/40 font-mono">
                <Loader2 size={12} className="animate-spin" />
                <span>{elapsedSec}s</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay for supplement calls on result page only */}
      {loading && step === 'result' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md flex flex-col items-center justify-center gap-4" role="alert" aria-live="assertive">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}>
            <Sparkles size={44} className="text-[#C9A86A]" />
          </motion.div>
          <div style={{ width: '80vw', maxWidth: '420px', minHeight: '48px' }} className="flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              <motion.p
                key={astroPhraseIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45 }}
                className="text-lg sm:text-xl font-serif text-[#3D352E] italic text-center whitespace-nowrap"
              >
                {ASTRO_PHRASES[astroPhraseIdx]}
              </motion.p>
            </AnimatePresence>
          </div>
          {progressStage && (
            <p className="text-sm font-mono text-[#C9A86A]/80 tracking-wide animate-pulse text-center whitespace-nowrap">
              [{progressStage}]
            </p>
          )}
          <p className="text-xs text-[#5C5349] tabular-nums">已等待 {elapsedSec}s</p>
          <div className="w-40 h-0.5 bg-[#E7D7B0]/40 rounded-full overflow-hidden">
            <motion.div className="h-full bg-[#C9A86A]/60 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              style={{ width: '60%' }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
