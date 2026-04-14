import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CheckCircle2, TrendingUp, ChevronRight, AlertCircle, Plus, Brain, Download, Clock, Target, Shield, Eye, Wind, Sparkles, Loader2 } from 'lucide-react';
import { SPREADS, SpreadType } from '../../constants/tarot';
import { getCharacterExcerpt, splitMeaningLayers } from '../../lib/utils';
import { TarotSession } from '../../lib/tarotLogic';
import { TarotReading } from '../../types/reading';
import { DeepAnalysis } from '../../services/ai';

export interface SupplementaryCardData {
  name: string; nameEn: string; orientation: string; keywords: string[];
  imageUrl: string; portraitContinuation: string; deepReading: string; energyShift: string;
  contextType?: string; contextLabel?: string;
  chosenNumber?: number;
}

function SectionDivider() {
  return (
    <div role="separator" aria-hidden="true" className="flex items-center gap-6 py-10 opacity-85">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C9A86A]/40 to-[#C9A86A]/40" />
      <div className="relative flex items-center justify-center">
        <Sparkles size={16} className="text-[#C9A86A] animate-pulse motion-reduce:animate-none" />
      </div>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#C9A86A]/40 to-[#C9A86A]/40" />
    </div>
  );
}

function ResultMetaPill({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'accent' | 'violet' }) {
  const toneClasses = {
    default: 'border-white/50 bg-white/40 text-[#5C5349] shadow-[0_2px_15px_rgba(0,0,0,0.03)] backdrop-blur-md',
    accent: 'border-[#C9A86A]/40 bg-[#C9A86A]/15 text-[#C9A86A] shadow-[0_4px_20px_rgba(201,168,106,0.15)] backdrop-blur-md',
    violet: 'border-violet-500/30 bg-violet-500/10 text-violet-600 shadow-[0_4px_20px_rgba(139,92,246,0.15)] backdrop-blur-md',
  } as const;

  return (
    <div className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-[11px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${toneClasses[tone]}`}>
      <span className="tracking-[0.2em] font-medium uppercase opacity-60">{label}</span>
      <span className="font-semibold tracking-wide">{value}</span>
    </div>
  );
}

function SupplementaryCardBlock({ sc, accent = 'gold', index = 0 }: { sc: SupplementaryCardData; accent?: 'gold' | 'amber'; index?: number }) {
  const reducedMotion = useReducedMotion();
  const accentColor = accent === 'amber' ? '#D97706' : '#C9A86A';
  const borderColor = accent === 'amber' ? 'border-amber-500/20' : 'border-[#C9A86A]/20';
  const headerBg = accent === 'amber'
    ? 'linear-gradient(90deg, rgba(217,119,6,0.08) 0%, rgba(217,119,6,0.02) 60%, transparent 100%)'
    : 'linear-gradient(90deg, rgba(201,168,106,0.10) 0%, rgba(201,168,106,0.02) 60%, transparent 100%)';
  const headerLabel = sc.contextType === 'overall'
    ? '画像补牌 · 整体追问'
    : sc.contextType === 'card'
    ? `单牌追问 · 针对「${sc.contextLabel}」`
    : '通用补牌';

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08, ...(reducedMotion && { duration: 0, delay: 0 }) }}
      className={`rounded-2xl overflow-hidden border ${borderColor} shadow-lg`}
      style={{ background: 'linear-gradient(135deg, #FFFEF9 0%, #F9F4EA 40%, #F3EDE0 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E0D2]/60" style={{ background: headerBg }}>
        <div className="w-1.5 h-6 rounded-full" style={{ background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}44)` }} />
        <p className="text-xs font-serif tracking-wider font-medium" style={{ color: accentColor }}>{headerLabel}</p>
      </div>
      {/* Body */}
      <div className="flex flex-col sm:flex-row gap-0">
        {/* Card image */}
        <div className="relative w-full sm:w-24 h-32 sm:h-auto sm:aspect-[2/3] shrink-0 flex items-center justify-center p-3 sm:p-4"
          style={{ background: `radial-gradient(ellipse at 50% 40%, ${accentColor}18 0%, transparent 70%)` }}>
          <div className="relative w-20 sm:w-full aspect-[2/3] rounded-xl overflow-hidden border shadow-md" style={{ borderColor: `${accentColor}44` }}>
            <img src={sc.imageUrl} alt={sc.name} className={`w-full h-full object-cover ${sc.orientation === 'reversed' ? 'rotate-180' : ''}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0 py-4 px-4 sm:pl-2 sm:pr-5">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-base font-serif font-semibold text-[#3D352E]">{sc.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sc.orientation === 'upright' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' : 'bg-red-500/10 text-red-600 border-red-500/25'}`}>
              {sc.orientation === 'upright' ? '正位' : '逆位'}
            </span>
            {sc.keywords?.slice(0, 3).map((kw, ki) => (
              <span key={ki} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F3EEE6] text-[#5C5349]/60 border border-[#E8E0D2]/80">{kw}</span>
            ))}
          </div>
          <div className="relative pl-5 space-y-3">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-400/40 via-emerald-400/25 to-purple-400/30" />
            {sc.portraitContinuation && (
              <div className="relative">
                <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm" />
                <p className="text-[10px] font-semibold tracking-wider mb-0.5 uppercase" style={{ color: accentColor }}>画像续篇</p>
                <p className="text-[12px] text-[#3D352E] font-medium leading-[1.75] font-serif italic">{sc.portraitContinuation}</p>
              </div>
            )}
            {sc.deepReading && (
              <div className="relative">
                <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm" />
                <p className="text-[10px] text-emerald-600 font-semibold tracking-wider mb-0.5 uppercase">深度解读</p>
                <p className="text-[12px] text-[#5C5349] leading-[1.75]">{sc.deepReading}</p>
              </div>
            )}
            {sc.energyShift && (
              <div className="relative">
                <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-sm" />
                <p className="text-[10px] text-purple-500 font-semibold tracking-wider mb-0.5 uppercase">能量流转</p>
                <p className="text-[12px] text-[#5C5349]/80 leading-[1.7] italic">{sc.energyShift}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export interface ResultPageProps {
  session: TarotSession;
  reading: TarotReading;
  selectedCards: any[];
  spreadType: SpreadType;
  supplementaryCards: any[];
  overallSupplementaryCards: any[];
  generalSupplementaryCards: any[];
  supplementaryCardsByLabel: Record<string, any[]>;
  deepAnalysis: DeepAnalysis | null;
  expandedCardIndex: number | null;
  setExpandedCardIndex: (updater: any) => void;
  portraitExpanded: boolean;
  setPortraitExpanded: (updater: any) => void;
  advancedOpen: boolean;
  setAdvancedOpen: (updater: any) => void;
  drawSupplementaryCard: (contextType: 'overall' | 'card' | 'general', contextLabel?: string) => void;
  generateDeepAnalysis: () => void;
  exportPoster: () => void;
  loading: boolean;
  deepAnalysisLoading: boolean;
  isStrictMode: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  onComplete: () => void;
}

export function ResultPage({
  session, reading, selectedCards, spreadType, supplementaryCards,
  overallSupplementaryCards, generalSupplementaryCards, supplementaryCardsByLabel,
  deepAnalysis,
  expandedCardIndex, setExpandedCardIndex,
  portraitExpanded, setPortraitExpanded,
  advancedOpen, setAdvancedOpen,
  drawSupplementaryCard, generateDeepAnalysis, exportPoster,
  loading, deepAnalysisLoading, isStrictMode, error, setError, onComplete
}: ResultPageProps) {
  const reducedMotion = useReducedMotion();
  const cards = selectedCards;
  const cardCount = cards.length;
  const layeredInterpretations = React.useMemo(
    () => (reading.detailedInterpretations ?? []).map((interp, idx) => {
      const { contextualLead, focusedInterpretation } = splitMeaningLayers(interp.meaning || '');
      return {
        ...interp,
        positionLabel: interp.position || SPREADS[spreadType].positions[idx] || `第${idx + 1}张`,
        contextualLead,
        focusedMeaning: focusedInterpretation || interp.meaning || '',
      };
    }),
    [reading.detailedInterpretations, spreadType]
  );
  const portraitSupplements = layeredInterpretations.filter((item) => item.contextualLead);

  return (
    <>
          <motion.div id="tarot-result-container" key="result" role="article" aria-label="塔罗牌占卜结果" initial={reducedMotion ? false : { opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="relative py-4 isolate">
            
            {/* === Ambient Background Glow === */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-[#FAFAF8]">
              <div className="absolute top-[-30%] left-[-10%] w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,_rgba(201,168,106,0.12)_0%,_transparent_60%)] blur-[120px] rounded-full" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[100%] h-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.06)_0%,_transparent_60%)] blur-[100px] rounded-full" />
            </div>

            <div className="text-center space-y-5 mb-12">
              <motion.div initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0, duration: reducedMotion ? 0 : undefined }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#C9A86A]/10 text-[#C9A86A] rounded-full text-xs uppercase tracking-widest border border-[#C9A86A]/20">
                <CheckCircle2 size={14} /><span>占卜结论</span>
              </motion.div>
              <motion.p initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05, ...(reducedMotion && { duration: 0, delay: 0 }) }}
                className="text-sm text-[#5C5349] italic">
                「{session.question}」
              </motion.p>
              <motion.h2 initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, ...(reducedMotion && { duration: 0, delay: 0 }) }}
                className="mx-auto max-w-4xl text-3xl sm:text-4xl md:text-[2.9rem] font-serif leading-relaxed tracking-wide bg-gradient-to-r from-[#4A413A] via-[#B8944F] to-[#4A413A] bg-clip-text text-transparent drop-shadow-md pb-2">
                {reading.summary}
              </motion.h2>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, ...(reducedMotion && { duration: 0, delay: 0 }) }}
                className="mt-2 flex flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-visible snap-x snap-mandatory gap-3 items-start justify-start sm:justify-center"
              >
                {cards.map((c, idx) => (
                  <div key={`result-mini-${idx}`} className="snap-center shrink-0 w-[88px] rounded-2xl border border-[#E8E0D2] bg-white/60 p-2 shadow-sm">
                    <div className="mx-auto mb-2 w-14 overflow-hidden rounded-lg border border-[#E8E0D2]">
                      <img src={c.imageUrl} alt={c.name} className={`h-20 w-full object-cover ${c.orientation === 'reversed' ? 'rotate-180' : ''}`} />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#C9A86A]">{idx + 1}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#5C5349]">{SPREADS[spreadType].positions[idx]}</p>
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, ...(reducedMotion && { duration: 0, delay: 0 }) }}
                className="mt-1 flex flex-wrap items-center justify-center gap-2 opacity-75"
              >
                <ResultMetaPill label="牌阵" value={SPREADS[spreadType].name} />
                <ResultMetaPill label="牌数" value={`${cardCount}张`} />
              </motion.div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, ...(reducedMotion && { duration: 0, delay: 0 }) }}
                className="mt-4 mx-auto max-w-4xl relative"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-[#C9A86A]/20 via-[#E8E0D2]/40 to-[#C9A86A]/20 rounded-[2.2rem] blur-md opacity-60 pointer-events-none" />
                <div className="relative rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,_rgba(201,168,106,0.15)_0%,_rgba(255,255,255,0.85)_35%,_rgba(255,248,234,0.85)_100%)] backdrop-blur-xl px-6 py-6 text-left shadow-xl shadow-[#C9A86A]/10 sm:px-8">
                  <div className="mb-4 flex items-center gap-3 text-[#C9A86A]">
                    <Sparkles size={16} className="animate-pulse motion-reduce:animate-none" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.32em]">核心建议</h3>
                  </div>
                  <p className="text-[1.35rem] font-serif leading-[1.75] text-[#3D352E] sm:text-[1.7rem]">
                    {reading.finalAdvice}
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="mx-auto mb-8 max-w-4xl">
              <motion.div initial={reducedMotion ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, ...(reducedMotion && { duration: 0, delay: 0 }) }}
                className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 backdrop-blur-2xl px-6 py-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:px-8">
                <div className="grid gap-6">
                  {reading.eventPortrait && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C9A86A]/30 bg-[#C9A86A]/10 shadow-[0_2px_10px_rgb(201,168,106,0.1)]">
                          <Sparkles size={16} className="text-[#C9A86A]" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#C9A86A]">命运画像与趋势</p>
                          <p className="text-sm text-[#5C5349]/70">整组牌共同构成的处境全景与命运走向。</p>
                        </div>
                      </div>
                      <div className="rounded-3xl bg-white/60 backdrop-blur-md border border-white/50 px-5 py-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#C9A86A]/80 mb-3">事件画像</p>
                        <p className="relative z-10 text-[15px] leading-loose text-[#5C5349] sm:text-[16px]">
                          {portraitExpanded ? reading.eventPortrait : getCharacterExcerpt(reading.eventPortrait, 220)}
                        </p>
                        {reading.eventPortrait.length > 220 && (
                          <button
                            onClick={() => setPortraitExpanded((prev) => !prev)}
                            aria-expanded={portraitExpanded}
                            className="mt-4 text-sm font-medium text-[#C9A86A] transition-all duration-300 hover:text-[#B8944F] hover:tracking-wide export-exclude focus-visible:ring-2 focus-visible:ring-[#C9A86A]/50 focus-visible:ring-offset-2"
                          >
                            {portraitExpanded ? '收起画像' : '展开画像'}
                          </button>
                        )}

                        {portraitSupplements.length > 0 && (
                          <div className="mt-5 rounded-3xl border border-[#E8E0D2]/70 bg-[#FAF7F2]/80 px-4 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#C9A86A]">牌面投影</p>
                            <div className="mt-3 space-y-3">
                              {portraitSupplements.map((item) => (
                                <div key={`portrait-supplement-${item.positionLabel}`} className="grid gap-1 sm:grid-cols-[78px_1fr] sm:gap-3">
                                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8C6D2F]">{item.positionLabel}</span>
                                  <p className="text-sm leading-7 text-[#5C5349]/80">{item.contextualLead}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {reading.overallTrend && (
                        <div className="mt-5 rounded-3xl bg-white/60 backdrop-blur-md border border-white/50 px-5 py-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={14} className="text-[#C9A86A]" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#C9A86A]/80">命运主线</p>
                          </div>
                          <p className="text-[15px] leading-loose text-[#5C5349]">{reading.overallTrend}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <SectionDivider />

            <div className="mb-8 mt-8 space-y-4" role="list">
              <div className="flex items-center gap-3 px-1">
                <div className="h-8 w-1 rounded-full bg-gradient-to-b from-[#C9A86A] to-[#C9A86A]/30" />
                <div>
                  <h3 className="text-xl font-serif text-[#3D352E]">逐牌拆解</h3>
                  <p className="text-sm text-[#5C5349]/65">默认展开一张，其余按需展开，阅读会更轻松。</p>
                </div>
              </div>

              {cards.map((c, idx) => {
                const interp = layeredInterpretations[idx];
                const cardScs = supplementaryCardsByLabel[c.name] || [];
                const isExpanded = expandedCardIndex === idx;
                return (
                  <motion.div key={`card-block-${idx}`} role="listitem" initial={reducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + idx * 0.04, ...(reducedMotion && { duration: 0, delay: 0 }) }}
                    className={`overflow-hidden rounded-3xl border ${isExpanded ? 'border-[#C9A86A]/40 shadow-[0_12px_45px_rgb(201,168,106,0.12)]' : 'border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5'} transition-all duration-500 ${isExpanded ? 'bg-[linear-gradient(135deg,_rgba(255,254,249,0.9)_0%,_rgba(247,240,226,0.9)_60%,_rgba(243,237,224,0.9)_100%)] backdrop-blur-xl' : 'bg-white/50 backdrop-blur-md'}`}>
                    <button
                      type="button"
                      onClick={() => setExpandedCardIndex((prev) => prev === idx ? null : idx)}
                      aria-expanded={isExpanded}
                      aria-controls={`card-detail-${idx}`}
                      className="w-full px-4 py-4 text-left sm:px-5 focus-visible:ring-2 focus-visible:ring-[#C9A86A]/50 focus-visible:ring-offset-2"
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          <div className={`relative w-16 overflow-hidden rounded-xl border shadow-sm sm:w-20 ${c.orientation === 'reversed' ? 'border-[#5C5349]/25' : 'border-[#C9A86A]/35'}`}>
                            <img src={c.imageUrl} alt={c.name} className={`h-24 w-full object-cover sm:h-28 ${c.orientation === 'reversed' ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] uppercase tracking-[0.24em] text-[#C9A86A]">{idx + 1} · {SPREADS[spreadType].positions[idx]}</span>
                            {cardScs.length > 0 && (
                              <span className="rounded-full border border-amber-500/20 bg-amber-500/8 px-2 py-0.5 text-[10px] text-amber-600">补牌 {cardScs.length}</span>
                            )}
                          </div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-serif text-[#3D352E]">{c.name}</h4>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${c.orientation === 'upright' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border-red-500/20 bg-red-500/10 text-red-600'}`}>
                              {c.orientation === 'upright' ? '正位' : '逆位'}
                            </span>
                          </div>
                          <p className="mb-2 text-[11px] tracking-[0.18em] text-[#5C5349]/45">{c.nameEn}</p>
                          <p className="text-sm leading-7 text-[#5C5349]">
                            {interp ? getCharacterExcerpt(interp.focusedMeaning, 100) : '点击展开查看这张牌的聚焦解读。'}
                          </p>
                          {!isExpanded && (
                            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#C9A86A]/80">展开查看聚焦解读</p>
                          )}
                        </div>

                        <div className="mt-1 shrink-0">
                          <ChevronRight size={18} className={`text-[#C9A86A] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          id={`card-detail-${idx}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="overflow-hidden border-t border-[#E8E0D2]/60"
                        >
                          <motion.div
                            initial={reducedMotion ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.2, ...(reducedMotion && { duration: 0, delay: 0 }) }}
                            className="space-y-4 px-5 py-5"
                          >
                            <div className="flex flex-wrap gap-2">
                              {c.keywords.map((k) => (
                                <span key={k} className="rounded-full border border-[#E8E0D2] bg-[#F3EEE6] px-2 py-0.5 text-[10px] text-[#5C5349]/70">{k}</span>
                              ))}
                            </div>
                            {interp && (
                              <p className="text-[14px] leading-[1.9] text-[#5C5349]">{interp.focusedMeaning}</p>
                            )}
                            {!isStrictMode && (
                              <button onClick={() => drawSupplementaryCard('card', c.name)} disabled={loading}
                                className="rounded-full border border-[#C9A86A]/30 bg-white/80 px-3 py-1.5 text-[11px] text-[#C9A86A] transition-colors hover:bg-[#FAF7F2] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#C9A86A]/50 focus-visible:ring-offset-2">
                                <span className="flex items-center gap-1.5"><Plus size={12} />针对此牌追问</span>
                              </button>
                            )}

                            {cardScs.length > 0 && (
                              <div className="space-y-4 pt-2">
                                {cardScs.map((sc, i) => (
                                  <div key={`card-sc-${idx}-${i}`}>
                                    <SupplementaryCardBlock sc={sc} accent="amber" index={i} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {reading.insights && (() => {
              const depthText = reading.insights.portraitDepthAnalysis
                || [reading.insights.portraitAssociation || reading.insights.symbolResonance, reading.insights.hiddenMessages || reading.insights.hiddenUndercurrent, reading.insights.portraitRevelation || reading.insights.transformationKey].filter(Boolean).join('\n\n');
              return depthText ? (
                <div className="mb-8">
                  <div className="flex items-center gap-3 px-1 mb-6">
                    <div className="h-8 w-1 rounded-full bg-gradient-to-b from-[#C9A86A] to-[#C9A86A]/30" />
                    <div>
                      <h3 className="text-xl font-serif text-[#3D352E]">画像深度分析</h3>
                      <p className="text-sm text-[#5C5349]/65">基于画面意象，直击你的问题核心。</p>
                    </div>
                  </div>
                  <motion.div initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10, ...(reducedMotion && { duration: 0, delay: 0 }) }}
                    className="relative overflow-hidden rounded-3xl border border-[#C9A86A]/25 bg-[linear-gradient(135deg,_rgba(201,168,106,0.06)_0%,_rgba(255,255,255,0.5)_50%,_rgba(201,168,106,0.04)_100%)] backdrop-blur-md p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="absolute top-0 right-0 w-40 h-40 sm:w-56 sm:h-56 bg-gradient-to-bl from-[#C9A86A]/10 via-violet-500/5 to-transparent rounded-bl-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent rounded-tr-[80px] pointer-events-none" />
                    <div className="mb-5 flex items-center gap-3 relative z-10">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C9A86A]/30 bg-[#C9A86A]/10 shadow-[0_2px_10px_rgb(201,168,106,0.1)]">
                        <Eye size={16} className="text-[#C9A86A]" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A86A]">画像深度分析</h4>
                        <p className="text-[10px] text-[#5C5349]/50">从画面联想到处境洞察，再到行动启示</p>
                      </div>
                    </div>
                    <div className="relative z-10 space-y-4">
                      {depthText.split('\n\n').map((paragraph, i) => (
                        <p key={i} className="text-[15px] leading-[2] text-[#5C5349]">{paragraph}</p>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : null;
            })()}

            <motion.div initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, ...(reducedMotion && { duration: 0, delay: 0 }) }}
              className="mb-8 overflow-hidden rounded-3xl border border-[#E8E0D2] bg-white/45 shadow-lg shadow-black/5">
              <button
                type="button"
                onClick={() => setAdvancedOpen((prev) => !prev)}
                aria-expanded={advancedOpen}
                aria-controls="advanced-panel"
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:ring-2 focus-visible:ring-[#C9A86A]/50 focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C9A86A]/20 bg-[#C9A86A]/8">
                    <Brain size={16} className="text-[#C9A86A]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#C9A86A]">继续深挖</p>
                    <p className="mt-0.5 text-sm text-[#5C5349]/65">补牌追问 · 七维分析 · 海报导出</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2">
                    {supplementaryCards.length > 0 && <ResultMetaPill label="补牌" value={`${supplementaryCards.length}张`} tone="accent" />}
                    {deepAnalysis && <ResultMetaPill label="深度" value="已生成" tone="violet" />}
                  </div>
                  <ChevronRight size={18} className={`text-[#C9A86A] transition-transform duration-200 ${advancedOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {advancedOpen && (
                  <motion.div
                    id="advanced-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeOut' }}
                    className="overflow-hidden border-t border-[#E8E0D2]/70"
                  >
                    <div className="space-y-6 px-6 py-6">
                      {/* Action buttons */}
                      <div className="export-exclude">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#5C5349]/40 mb-3">操作面板</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {!isStrictMode && (
                            <motion.button
                              whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                              onClick={() => drawSupplementaryCard('overall')}
                              disabled={loading}
                              className="group rounded-2xl border border-[#C9A86A]/20 bg-[#C9A86A]/6 px-4 py-4 text-left transition-all hover:bg-[#C9A86A]/12 hover:border-[#C9A86A]/30 hover:shadow-md disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#C9A86A]/50 focus-visible:ring-offset-2"
                            >
                              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[#C9A86A]">
                                <Plus size={14} className="transition-transform group-hover:rotate-90" />整体画像追问
                              </span>
                              <p className="text-xs leading-6 text-[#5C5349]/60">基于整幅画面补抽一张牌，延展全局叙事。</p>
                            </motion.button>
                          )}

                          {!isStrictMode && (
                            <motion.button
                              whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                              onClick={() => drawSupplementaryCard('general')}
                              disabled={loading}
                              className="group rounded-2xl border border-[#C9A86A]/20 bg-[#C9A86A]/6 px-4 py-4 text-left transition-all hover:bg-[#C9A86A]/12 hover:border-[#C9A86A]/30 hover:shadow-md disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#C9A86A]/50 focus-visible:ring-offset-2"
                            >
                              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[#C9A86A]">
                                <Plus size={14} className="transition-transform group-hover:rotate-90" />补抽一张牌
                              </span>
                              <p className="text-xs leading-6 text-[#5C5349]/60">补充新的侧面建议，不绑定某一张主牌。</p>
                            </motion.button>
                          )}

                          <motion.button
                            whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                            onClick={generateDeepAnalysis}
                            disabled={deepAnalysisLoading}
                            className="group rounded-2xl border border-violet-500/20 bg-violet-500/6 px-4 py-4 text-left transition-all hover:bg-violet-500/10 hover:border-violet-500/30 hover:shadow-md disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2"
                          >
                            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-600">
                              {deepAnalysisLoading ? <Loader2 className="animate-spin" size={14} /> : <Brain size={14} />}
                              {deepAnalysis ? '重新生成深度分析' : '生成七维分析'}
                            </span>
                            <p className="text-xs leading-6 text-[#5C5349]/60">延展到七个维度，查看更长时间尺度的判断。</p>
                          </motion.button>

                          <motion.button
                            whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                            onClick={exportPoster}
                            disabled={loading}
                            className="group rounded-2xl border border-[#E8E0D2] bg-white/60 px-4 py-4 text-left transition-all hover:bg-white hover:border-[#C9A86A]/20 hover:shadow-md disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#C9A86A]/50 focus-visible:ring-offset-2"
                          >
                            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[#C9A86A]"><Download size={14} />生成神谕海报</span>
                            <p className="text-xs leading-6 text-[#5C5349]/60">导出为海报图，方便分享或收藏。</p>
                          </motion.button>
                        </div>
                      </div>

                      {/* Deep Analysis Section */}
                      {(deepAnalysis || deepAnalysisLoading) && (
                        <div className="rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-500/4 via-white/50 to-white/40 p-6 shadow-inner shadow-black/3">
                          <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10">
                              <Brain size={16} className="text-violet-500" />
                            </div>
                            <div>
                              <h3 className="text-lg font-serif text-[#3D352E]">七维深度分析</h3>
                              <p className="text-sm text-[#5C5349]/60">从时间线、机遇、风险、心理多维度拆解命运走向。</p>
                            </div>
                          </div>

                          {deepAnalysisLoading ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border border-violet-500/10 bg-violet-500/5 p-4 animate-pulse">
                                  <div className="mb-3 flex items-center gap-2">
                                    <div className="h-4 w-4 rounded-full bg-violet-500/20" />
                                    <div className="h-3 w-16 rounded bg-violet-500/20" />
                                  </div>
                                  <div className="space-y-2">
                                    <div className="h-3 w-full rounded bg-violet-500/10" />
                                    <div className="h-3 w-5/6 rounded bg-violet-500/10" />
                                    <div className="h-3 w-4/6 rounded bg-violet-500/10" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : deepAnalysis && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              {/* Timeline row - spans full width */}
                              {([
                                { key: 'shortTerm', label: '近期行动', sub: '1周内', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-500/8 border-emerald-500/20' },
                                { key: 'midTerm', label: '中期发展', sub: '1个月', icon: Target, color: 'text-blue-600', bg: 'bg-blue-500/8 border-blue-500/20' },
                                { key: 'longTerm', label: '远期趋势', sub: '3个月+', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-500/8 border-purple-500/20' },
                                { key: 'opportunities', label: '机遇点', sub: '', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-500/8 border-amber-500/20' },
                                { key: 'risks', label: '风险提示', sub: '', icon: Shield, color: 'text-red-600', bg: 'bg-red-500/8 border-red-500/20' },
                                { key: 'psyche', label: '心理能量', sub: '', icon: Eye, color: 'text-violet-600', bg: 'bg-violet-500/8 border-violet-500/20' },
                                { key: 'external', label: '外部影响', sub: '', icon: Wind, color: 'text-sky-600', bg: 'bg-sky-500/8 border-sky-500/20' },
                              ] as const).map((dim, i) => (
                                <motion.div
                                  key={dim.key}
                                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.05, ...(reducedMotion && { duration: 0, delay: 0 }) }}
                                  className={`rounded-2xl border p-4 ${dim.bg} ${i === 6 ? 'sm:col-span-2' : ''}`}
                                >
                                  <div className="mb-2 flex items-center gap-2">
                                    <dim.icon size={14} className={dim.color} />
                                    <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${dim.color}`}>{dim.label}</span>
                                    {dim.sub && <span className="ml-auto text-[10px] text-[#5C5349]/40">{dim.sub}</span>}
                                  </div>
                                  <p className="text-[13px] leading-[1.8] text-[#5C5349]">{deepAnalysis[dim.key as keyof DeepAnalysis]}</p>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Supplementary cards - combined into one section */}
                      {(overallSupplementaryCards.length > 0 || generalSupplementaryCards.length > 0) && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 px-1">
                            <div className="h-7 w-1 rounded-full bg-gradient-to-b from-[#C9A86A] to-[#C9A86A]/30" />
                            <div>
                              <h3 className="text-lg font-serif text-[#3D352E]">补牌记录</h3>
                              <p className="text-sm text-[#5C5349]/50">追问补抽的牌面及其解读</p>
                            </div>
                          </div>
                          {overallSupplementaryCards.map((sc, i) => (
                            <div key={`overall-sc-${i}`}>
                              <SupplementaryCardBlock sc={sc} accent="gold" index={i} />
                            </div>
                          ))}
                          {generalSupplementaryCards.map((sc, i) => (
                            <div key={`general-sc-${i}`}>
                              <SupplementaryCardBlock sc={sc} accent="gold" index={overallSupplementaryCards.length + i} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 export-exclude">
                <AlertCircle className="shrink-0 text-red-400" size={20} />
                <p className="text-sm font-medium text-red-600">{error}</p>
              </motion.div>
            )}

            <motion.div initial={reducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, ...(reducedMotion && { duration: 0, delay: 0 }) }} className="flex justify-center pt-2 pb-8 export-exclude">
              <motion.button whileTap={reducedMotion ? undefined : { scale: 0.95 }} onClick={onComplete} disabled={loading}
                className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#C9A86A] to-[#B89A4A] px-14 py-4 text-lg font-medium text-white transition-all hover:shadow-2xl hover:shadow-[#C9A86A]/30 focus-visible:ring-2 focus-visible:ring-[#C9A86A]/50 focus-visible:ring-offset-2">
                <span>返回保存记录</span><ChevronRight size={20} />
              </motion.button>
            </motion.div>

          </motion.div>
          </>
  );
}
