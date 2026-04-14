import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertCircle, Hand, Play } from 'lucide-react';
import { SPREADS, SpreadType } from '../../constants/tarot';
import { StardomeAnimation } from './StardomeAnimation';

export interface FlipStageProps {
  selectedCards: any[];
  spreadType: SpreadType;
  error: string | null;
  setError: (e: string | null) => void;
  startReading: () => void;
  loading: boolean;
}

export function FlipStage({
  selectedCards,
  spreadType,
  error,
  setError,
  startReading,
  loading
}: FlipStageProps) {
  const [showStardome, setShowStardome] = useState(true);
  const cards = selectedCards;
  const cardCount = cards.length;
  const [flippedIndices, setFlippedIndices] = React.useState<number[]>([]);
  const [revealMode, setRevealMode] = React.useState<'manual' | 'sequential'>('manual');
  const [isSequentialRevealing, setIsSequentialRevealing] = React.useState(false);
  const revealTimersRef = useRef<number[]>([]);
  const cardSignature = useMemo(
    () => cards.map((card) => `${card.name}-${card.orientation}-${card.imageUrl}`).join('|'),
    [cards]
  );

  const clearRevealTimers = React.useCallback(() => {
    revealTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    revealTimersRef.current = [];
  }, []);

  React.useEffect(() => {
    clearRevealTimers();
    setFlippedIndices([]);
    setRevealMode('manual');
    setIsSequentialRevealing(false);
  }, [cardSignature, clearRevealTimers]);

  React.useEffect(() => {
    return () => {
      clearRevealTimers();
    };
  }, [clearRevealTimers]);

  const allDone = cardCount > 0 && flippedIndices.length === cardCount;
  const remainingCount = Math.max(cardCount - flippedIndices.length, 0);
  const gridClasses = useMemo(() => {
    if (cardCount <= 1) return 'max-w-sm grid-cols-1';
    if (cardCount === 2) return 'max-w-3xl grid-cols-1 sm:grid-cols-2';
    if (cardCount === 3) return 'max-w-6xl grid-cols-1 md:grid-cols-3';
    if (cardCount <= 5) return 'max-w-6xl grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
    return 'max-w-6xl grid-cols-2 xl:grid-cols-4';
  }, [cardCount]);

  const revealCard = (index: number) => {
    if (isSequentialRevealing) return;
    setRevealMode('manual');
    setFlippedIndices((prev) => (prev.includes(index) ? prev : [...prev, index]));
  };

  const startSequentialReveal = () => {
    if (isSequentialRevealing || allDone) return;
    clearRevealTimers();
    setRevealMode('sequential');
    setIsSequentialRevealing(true);

    const remainingIndices = cards
      .map((_, index) => index)
      .filter((index) => !flippedIndices.includes(index));

    if (remainingIndices.length === 0) {
      setIsSequentialRevealing(false);
      return;
    }

    remainingIndices.forEach((index, order) => {
      const timerId = window.setTimeout(() => {
        setFlippedIndices((prev) => (prev.includes(index) ? prev : [...prev, index]));
        if (order === remainingIndices.length - 1) {
          setIsSequentialRevealing(false);
        }
      }, order * 680 + 120);
      revealTimersRef.current.push(timerId);
    });
  };

  const isThreeCardSpread = cardCount === 3;
  const cardsContainerClass = isThreeCardSpread
    ? 'flex w-full flex-col items-center justify-center gap-8 md:flex-row md:items-end md:gap-8'
    : `grid w-full gap-6 ${gridClasses}`;

  const getCardSlotClass = (index: number) => {
    if (!isThreeCardSpread) return 'flex flex-col items-center gap-4';
    const slotTransforms = [
      'md:translate-y-10 md:-rotate-[5deg]',
      'md:-translate-y-8 md:scale-[1.04]',
      'md:translate-y-10 md:rotate-[5deg]',
    ];
    return `flex flex-col items-center gap-4 transition-transform ${slotTransforms[index] || ''}`;
  };

  const getCardSize = (index: number) => {
    if (isThreeCardSpread) {
      return index === 1
        ? { width: '228px', height: '388px' }
        : { width: '212px', height: '360px' };
    }
    if (cardCount === 1) return { width: '228px', height: '388px' };
    return { width: '198px', height: '336px' };
  };

  // Memoize particle positions
  const stars = useMemo(() => Array.from({ length: 40 }, () => ({
    w: Math.random() * 2 + 1, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
    dur: 2 + Math.random() * 3, delay: Math.random() * 2,
  })), []);
  
  const dustParticles = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    dur: 4 + i * 0.4, delay: i * 0.3, left: `${10 + i * 7}%`,
  })), []);

  if (showStardome) {
    return <StardomeAnimation cardCount={cardCount} onComplete={() => setShowStardome(false)} />;
  }

  return (
    <motion.div
      key="flip"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto scrollbar-hide px-4 pb-12 pt-24"
      style={{ background: 'radial-gradient(ellipse at center, #1a1410 0%, #0d0a07 100%)' }}
    >
      {/* Stars background */}
      {stars.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{ width: s.w, height: s.w, left: s.left, top: s.top }}
          animate={{ opacity: [0.1, 0.8, 0.1] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
        />
      ))}

      {/* Gold dust particles */}
      {dustParticles.map((d, i) => (
        <motion.div
          key={`dust-${i}`}
          className="absolute w-0.5 h-0.5 bg-[#C9A86A] rounded-full"
          animate={{ y: [0, -window.innerHeight], opacity: [0, 1, 0] }}
          transition={{ duration: d.dur, repeat: Infinity, delay: d.delay }}
          style={{ left: d.left, bottom: 0 }}
        />
      ))}

      <AnimatePresence mode="wait">
        <motion.div
          key="cards-tableau"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-8 py-4"
        >
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <p className="text-[10px] uppercase tracking-[0.45em] text-[#C9A86A]/65 font-mono">逐张揭晓</p>
            <h2 className="text-3xl font-serif text-[#E7D7B0] sm:text-4xl md:text-[2.8rem]">
              {cardCount === 3 ? '三张牌已在眼前展开' : '牌面已在你眼前展开'}
            </h2>
            {allDone && (
              <p className="mx-auto max-w-2xl text-sm leading-7 text-[#C9A86A]/70">
                三张牌都已显现。先感受它们之间的呼应，再进入解读。
              </p>
            )}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A86A]/20 bg-[#C9A86A]/10 px-4 py-2 text-xs text-[#E7D7B0]">
              <span>已揭晓 {flippedIndices.length} / {cardCount}</span>
            </div>
            {!allDone && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setRevealMode('manual')}
                  disabled={isSequentialRevealing}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs tracking-[0.18em] uppercase transition ${
                    revealMode === 'manual'
                      ? 'border-[#C9A86A]/35 bg-[#C9A86A]/14 text-[#E7D7B0]'
                      : 'border-white/12 bg-white/[0.03] text-[#C9A86A]/70 hover:border-[#C9A86A]/25 hover:text-[#E7D7B0]'
                  } disabled:cursor-default disabled:opacity-50`}
                >
                  <Hand size={13} />
                  <span>手动逐张翻开</span>
                </button>
                <button
                  type="button"
                  onClick={startSequentialReveal}
                  disabled={isSequentialRevealing}
                  className="inline-flex items-center gap-2 rounded-full border border-[#C9A86A]/25 bg-white/[0.05] px-4 py-2 text-xs tracking-[0.18em] uppercase text-[#E7D7B0] transition hover:border-[#C9A86A]/45 hover:bg-[#C9A86A]/10 disabled:cursor-default disabled:opacity-60"
                >
                  <Play size={13} />
                  <span>{isSequentialRevealing ? '正在依次翻开' : '按顺序依次翻开'}</span>
                </button>
              </div>
            )}
          </motion.div>

          <div className="relative w-full pt-2">
            <div
              className="pointer-events-none absolute left-1/2 top-[44%] h-[260px] w-[92%] -translate-x-1/2 rounded-[999px] blur-3xl"
              style={{ background: 'radial-gradient(ellipse at center, rgba(201,168,106,0.18) 0%, rgba(201,168,106,0.05) 42%, transparent 72%)' }}
            />
            <div
              className="pointer-events-none absolute left-1/2 top-[52%] h-[320px] w-[80%] -translate-x-1/2 rounded-[999px]"
              style={{ border: '1px solid rgba(201,168,106,0.08)', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, transparent 70%)' }}
            />

            <div className={cardsContainerClass}>
            {cards.map((card, index) => {
              const isFlipped = flippedIndices.includes(index);
              const position = SPREADS[spreadType].positions[index];
              const cardSize = getCardSize(index);

              return (
                <motion.div
                  key={`${card.name}-${index}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * index }}
                  className={getCardSlotClass(index)}
                >
                  <div className="text-center space-y-1">
                    <p className="text-[10px] tracking-[0.35em] text-[#C9A86A]/65 uppercase font-mono">
                      {index + 1} / {cardCount}
                    </p>
                    <p className="text-sm tracking-[0.18em] text-[#E7D7B0]/85 font-serif">
                      {position}
                    </p>
                  </div>

                  <div style={{ perspective: '1400px' }} className="flex justify-center">
                    <motion.button
                      type="button"
                      whileHover={isFlipped || isSequentialRevealing ? {} : { scale: 1.03, y: -4 }}
                      whileTap={isFlipped || isSequentialRevealing ? {} : { scale: 0.97 }}
                      style={{
                        transformStyle: 'preserve-3d',
                        width: cardSize.width,
                        height: cardSize.height,
                        position: 'relative',
                        cursor: isFlipped || isSequentialRevealing ? 'default' : 'pointer'
                      }}
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => revealCard(index)}
                      disabled={isSequentialRevealing}
                    >
                      <div
                        className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center select-none overflow-hidden"
                        style={{
                          backfaceVisibility: 'hidden',
                          background: 'linear-gradient(135deg, #1c1408 0%, #2d1f0a 50%, #1c1408 100%)',
                          border: '2px solid rgba(201,168,106,0.5)',
                          boxShadow: '0 0 60px rgba(201,168,106,0.2), 0 30px 60px rgba(0,0,0,0.8)',
                        }}
                      >
                        <div className="absolute inset-3 rounded-xl" style={{ border: '1px solid rgba(201,168,106,0.3)' }} />
                        <div className="absolute inset-5 rounded-lg" style={{ border: '1px solid rgba(201,168,106,0.15)' }} />

                        <motion.div
                          className="absolute inset-0 rounded-2xl"
                          animate={{ opacity: [0.4, 0.7, 0.4] }}
                          transition={{ repeat: Infinity, duration: 3 }}
                          style={{ background: 'radial-gradient(ellipse at center, rgba(201,168,106,0.08) 0%, transparent 70%)' }}
                        />

                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                          className="absolute inset-0 rounded-2xl"
                          style={{ background: 'conic-gradient(from 0deg, transparent, rgba(201,168,106,0.05), transparent, rgba(201,168,106,0.05), transparent)' }}
                        />

                        <div className="relative flex flex-col items-center gap-4">
                          <motion.div
                            animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                          >
                            <Sparkles size={38} className="text-[#C9A86A]" />
                          </motion.div>
                          <motion.p
                            animate={{ opacity: [0.4, 0.9, 0.4] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="text-[11px] tracking-[0.42em] text-[#C9A86A]/70 uppercase font-serif"
                          >
                            {isSequentialRevealing ? '顺序揭晓中' : '点击揭晓'}
                          </motion.p>
                          <p className="text-[10px] tracking-[0.22em] text-[#E7D7B0]/50">{position}</p>
                        </div>
                      </div>

                      <div
                        className="absolute inset-0 rounded-2xl overflow-hidden select-none"
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          boxShadow: '0 0 80px rgba(201,168,106,0.4), 0 40px 80px rgba(0,0,0,0.8)',
                        }}
                      >
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          style={{ transform: card.orientation === 'reversed' ? 'rotate(180deg)' : 'none' }}
                          draggable={false}
                        />
                        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ border: '2px solid rgba(201,168,106,0.6)', boxShadow: 'inset 0 0 30px rgba(201,168,106,0.1)' }} />
                      </div>
                    </motion.button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isFlipped && (
                      <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.35 }}
                        className="w-full max-w-[255px] rounded-[1.4rem] border border-[#C9A86A]/18 bg-[linear-gradient(180deg,rgba(23,17,12,0.88),rgba(12,9,7,0.72))] px-4 py-4 text-center shadow-lg shadow-black/30 backdrop-blur-sm"
                      >
                        <div className="space-y-1">
                          <h3 className="text-xl font-serif text-[#E7D7B0]">{card.name}</h3>
                          <p className="text-[11px] tracking-[0.3em] text-[#C9A86A]/60 uppercase">{card.nameEn}</p>
                          <span className={`inline-block mt-1 text-[10px] px-3 py-1 rounded-full border ${
                            card.orientation === 'upright'
                              ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                              : 'border-red-500/40 text-red-300 bg-red-500/10'
                          }`}>
                            {card.orientation === 'upright' ? '正位' : '逆位'}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                          {card.keywords.map((keyword: string) => (
                            <span key={keyword} className="rounded-full border border-[#C9A86A]/20 bg-[#C9A86A]/5 px-2.5 py-1 text-[11px] text-[#E7D7B0]/80">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            {!allDone && (
              <p className="text-sm text-[#C9A86A]/70">
                {isSequentialRevealing ? '牌面正在按顺序显现，请稍候。' : '你可以继续手动翻开剩余牌背，或让系统按顺序依次翻开。'}
              </p>
            )}

            {allDone && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-5 rounded-[2rem] border border-[#C9A86A]/10 bg-white/[0.03] px-6 py-6 backdrop-blur-sm"
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2.2 }}
                >
                  <Sparkles size={44} className="text-[#C9A86A]" />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif text-[#E7D7B0]">牌面已全部揭晓</h3>
                  <p className="text-sm text-[#C9A86A]/65">命运的信息已经显现，下一步就是进入完整解读。</p>
                </div>
                {error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-red-500/30 bg-red-900/30 p-4">
                    <AlertCircle className="text-red-400 shrink-0" size={20} />
                    <p className="flex-1 text-sm text-red-300">{error}</p>
                    <button onClick={() => { setError(null); startReading(); }} className="rounded-full border border-red-500/30 bg-red-500/20 px-4 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30">重试</button>
                  </motion.div>
                )}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={loading}
                  onClick={startReading}
                  className="flex items-center gap-2 rounded-full px-12 py-4 text-sm font-medium text-[#1a1410] shadow-2xl disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #C9A86A, #E7D7B0)', boxShadow: '0 0 40px rgba(201,168,106,0.4)' }}
                >
                  {loading ? <div className="animate-spin" /> : <Sparkles size={18} />}
                  <span>{loading ? '解读中...' : '开始解读'}</span>
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
