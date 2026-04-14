import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, RefreshCw, Loader2, Sparkles, Zap, Columns, Layout, Heart, Briefcase, Calendar, Compass } from 'lucide-react';
import { SPREADS, SpreadType } from '../../constants/tarot';

const SUGGESTED_QUESTIONS = [
  { category: "事业", questions: ["今年我的事业发展趋势如何？", "我是否应该接受这份新的工作机会？", "如何提升职场人际关系？"] },
  { category: "感情", questions: ["我和TA未来的感情走向如何？", "我什么时候能遇到正缘？", "这段关系中的阻碍是什么？"] },
  { category: "财富", questions: ["近期的财运状况如何？", "这项投资是否会有好的回报？"] },
  { category: "综合", questions: ["我目前最需要关注的是什么？", "本周的整体运势如何？"] },
];

export interface SetupFormProps {
  question: string;
  setQuestion: (c: string) => void;
  spreadType: SpreadType;
  setSpreadType: (t: SpreadType) => void;
  isStrictMode: boolean;
  setIsStrictMode: (b: boolean) => void;
  startShuffle: () => void;
  loading: boolean;
}

export function SetupForm({ question, setQuestion, spreadType, setSpreadType, isStrictMode, setIsStrictMode, startShuffle, loading }: SetupFormProps) {
  return (
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
        <div className="space-y-2.5 -mx-6">
          <p className="text-[10px] uppercase tracking-widest text-[#5C5349] font-serif px-6">推荐问题</p>
          <div className="overflow-hidden">
            <motion.div className="flex gap-2 px-6 pb-1" animate={{ x: [0, -1000, 0] }} transition={{ repeat: Infinity, duration: 30, ease: 'linear' }} style={{ width: 'max-content' }}>
              {SUGGESTED_QUESTIONS.flatMap((group) =>
                group.questions.map((q) => (
                  <button key={q} onClick={() => setQuestion(q)} className="px-3.5 py-2 rounded-full bg-[#F3EEE6] border border-[#E8E0D2]/50 text-[11px] text-[#5C5349] hover:border-[#C9A86A]/40 hover:bg-[#C9A86A]/5 transition-all whitespace-nowrap shrink-0">
                    <span className="text-[#C9A86A]/60 mr-1 text-[10px]">{group.category}</span>{q}
                  </button>
                ))
              )}
            </motion.div>
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
  );
}
