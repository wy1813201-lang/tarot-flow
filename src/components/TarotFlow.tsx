import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SPREADS, SpreadType } from '../constants/tarot';
import { shuffleDeck, generateHash, getCardsFromSelection, TarotSession } from '../lib/tarotLogic';
import { interpretTarotStream, interpretSupplementary } from '../services/ai';
import { TarotReading } from '../types/reading';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ArrowRight, ArrowLeft, RefreshCw, Hash, CheckCircle2, Loader2, Sparkles, ChevronRight, ShieldAlert, Plus, Zap, Columns, Layout, Heart, Briefcase, Calendar, Compass, AlertCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

type Step = 'setup' | 'shuffle' | 'select' | 'result';

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

  const startShuffle = async () => {
    if (!question.trim()) return;
    setLoading(true);
    const { deck, orientations } = shuffleDeck();
    const sessionId = crypto.randomUUID();
    const hash = await generateHash(deck, orientations, sessionId);

    setSession({
      uid: auth.currentUser?.uid || 'local-dev',
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

      const finalSession = { ...session, chosenNumbers, reading: result };

      try {
        if (auth.currentUser) {
          await addDoc(collection(db, 'users', auth.currentUser.uid, 'sessions'), finalSession);
        }
      } catch (err) {
        console.error("Firestore save failed:", err);
      }
      setReading(result);
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6" role="alert" aria-live="assertive">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}>
                  <Sparkles size={48} className="text-[#ff4e00]" />
                </motion.div>
                <motion.p key={progressStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-serif text-gray-300 italic">
                  {progressStage || '正在连接灵感...'}
                </motion.p>
                <p className="text-xs text-gray-500">深度解读需要一些时间，请耐心等待</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === 'result' && reading && session && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-[#ff4e00]/10 text-[#ff4e00] rounded-full text-xs uppercase tracking-widest border border-[#ff4e00]/20">
                <CheckCircle2 size={14} /><span>占卜结论</span>
              </div>
              <h2 className="text-4xl font-serif leading-tight">{reading.summary}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {getCardsFromSelection(session.shuffledDeck, session.orientations, chosenNumbers).map((card, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                  <div className="text-xs text-gray-500 uppercase tracking-widest font-serif">位置 {i + 1}: {SPREADS[spreadType].positions[i]}</div>
                  <div className="aspect-[2/3] bg-gradient-to-br from-gray-800 to-black rounded-xl flex flex-col items-center justify-center p-4 text-center border border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-[#ff4e00]/20" />
                    </div>
                    <div className={`text-4xl mb-2 ${card.orientation === 'reversed' ? 'rotate-180' : ''}`}>🎴</div>
                    <h4 className="text-xl font-serif">{card.name}</h4>
                    <p className="text-xs text-gray-500 italic mt-1">{card.nameEn}</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-1">
                      {card.keywords.map(k => (<span key={k} className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-gray-400">{k}</span>))}
                    </div>
                    <div className={`absolute bottom-4 right-4 text-[10px] uppercase tracking-widest ${card.orientation === 'upright' ? 'text-green-500' : 'text-red-500'}`}>
                      {card.orientation === 'upright' ? '正位' : '逆位'}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed italic">{reading.detailedInterpretations?.[i]?.meaning || "暂无解读"}</p>
                </motion.div>
              ))}
            </div>

            <div className="space-y-8">
              <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-[#ff4e00]" />
                  <h3 className="text-2xl font-serif">整体趋势分析</h3>
                </div>
                <p className="text-gray-300 leading-relaxed text-lg font-light">{reading.overallTrend}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-sm font-serif text-[#ff4e00] uppercase tracking-widest">行动建议</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{reading.suggestions?.actionableSteps || "暂无建议"}</p>
                </div>
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-sm font-serif text-[#ff4e00] uppercase tracking-widest">心态调整</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{reading.suggestions?.mindsetShift || "暂无建议"}</p>
                </div>
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-sm font-serif text-[#ff4e00] uppercase tracking-widest">潜在警示</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{reading.suggestions?.warningSigns || "暂无警示"}</p>
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-[#ff4e00]/10 border border-[#ff4e00]/20 space-y-4">
                <h3 className="text-xl font-serif text-[#ff4e00]">核心建议</h3>
                <p className="text-white text-lg italic">"{reading.finalAdvice}"</p>
              </div>

              {supplementaryCards.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-blue-500" />
                    <h3 className="text-2xl font-serif">补充建议</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {supplementaryCards.map((sc, i) => (
                      <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-6 rounded-3xl bg-white/5 border border-white/10 flex gap-4">
                        <div className={`text-3xl ${sc.orientation === 'reversed' ? 'rotate-180' : ''}`}>🎴</div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-serif text-white">{sc.name} ({sc.orientation === 'upright' ? '正位' : '逆位'})</h4>
                          <p className="text-xs text-gray-400 italic">{sc.interpretation}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                  <AlertCircle className="text-red-400 shrink-0" size={20} />
                  <p className="text-red-300 text-sm">{error}</p>
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                {!isStrictMode && (
                  <button onClick={drawSupplementaryCard} disabled={loading} className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-full font-medium hover:bg-white/10 transition-all flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    <span>补抽一张牌</span>
                  </button>
                )}
                <button onClick={onComplete} className="px-12 py-4 bg-[#ff4e00] text-white rounded-full font-medium hover:bg-[#e64600] transition-all flex items-center gap-2 shadow-xl shadow-[#ff4e00]/20">
                  <span>查看历史记录</span><ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
