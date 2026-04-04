import React, { useState } from 'react';
import TarotFlow from './components/TarotFlow';
import History from './components/History';
import ErrorBoundary from './components/ErrorBoundary';
import { Sparkles, History as HistoryIcon, Info, Settings2 } from 'lucide-react';
import Settings from './components/Settings';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState<'home' | 'flow' | 'history'>('home');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FAF7F2] text-[#3D352E] font-sans selection:bg-[#C9A86A]/20">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 flex justify-between items-center backdrop-blur-xl bg-[#FAF7F2]/80 border-b border-[#E8E0D2]">
          <div
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setView('home')}
          >
            <div className="text-lg font-serif font-light text-[#3D352E]">灵签局</div>
            <div className="text-[9px] tracking-[0.4em] text-[#5C5349]/60 uppercase">Tarot Flow</div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => setView('flow')} aria-current={view === 'flow' ? 'page' : undefined} className={`flex items-center gap-2 text-sm uppercase tracking-widest ${view === 'flow' ? 'text-[#C9A86A]' : 'text-[#5C5349] hover:text-[#3D352E]'}`}>
              <Sparkles size={16} />
              <span className="hidden sm:inline">新占卜</span>
            </button>
            <button onClick={() => setView('history')} aria-current={view === 'history' ? 'page' : undefined} className={`flex items-center gap-2 text-sm uppercase tracking-widest ${view === 'history' ? 'text-[#C9A86A]' : 'text-[#5C5349] hover:text-[#3D352E]'}`}>
              <HistoryIcon size={16} />
              <span className="hidden sm:inline">历史</span>
            </button>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-sm uppercase tracking-widest text-[#5C5349] hover:text-[#3D352E]">
              <Settings2 size={16} />
              <span className="hidden sm:inline">设置</span>
            </button>
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center text-center"
              >
                {/* Hero */}
                <div className="pt-8 sm:pt-16 pb-10 space-y-6 max-w-md">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C9A86A]/20 to-[#E7D7B0]/20 border border-[#C9A86A]/20 flex items-center justify-center"
                  >
                    <Sparkles size={28} className="text-[#C9A86A]" />
                  </motion.div>
                  <h2 className="text-3xl sm:text-4xl font-serif leading-tight text-[#3D352E]">
                    欢迎来到灵签局
                  </h2>
                  <p className="text-[#5C5349] text-sm leading-relaxed">
                    洗牌 · 选数 · 翻牌 · 解读<br />
                    每一轮牌序固定，每一张都有位置
                  </p>
                  <button
                    onClick={() => setView('flow')}
                    className="inline-flex items-center gap-2 px-10 py-3.5 bg-[#C9A86A] text-white rounded-full font-medium hover:bg-[#B8944F] transition-colors shadow-lg shadow-[#C9A86A]/15"
                  >
                    <Sparkles size={16} />
                    开始占卜
                  </button>
                </div>

                {/* Spread cards — horizontal scroll on mobile */}
                <div className="w-full border-t border-[#E8E0D2] pt-8">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#5C5349]/60 mb-5 flex items-center justify-center gap-2">
                    <Info size={10} /> 支持的牌阵
                  </h3>
                  <div className="overflow-x-auto scrollbar-hide -mx-6">
                    <div className="flex gap-3 px-6 pb-2" style={{ width: 'max-content' }}>
                      {[
                        { name: '单张', desc: '快速核心答案', count: 1 },
                        { name: '三张', desc: '过去·现在·未来', count: 3 },
                        { name: '五张', desc: '深入复杂决策', count: 5 },
                        { name: '感情', desc: '双方心态互动', count: 5 },
                        { name: '事业', desc: '职场行动建议', count: 5 },
                        { name: '周运', desc: '七天运势预测', count: 8 },
                      ].map((s) => (
                        <button
                          key={s.name}
                          onClick={() => setView('flow')}
                          className="shrink-0 w-28 p-4 rounded-2xl bg-[#F3EEE6] border border-[#E8E0D2] hover:border-[#C9A86A]/30 transition-all text-left group"
                        >
                          <span className="text-[10px] text-[#C9A86A] font-mono">{s.count}张</span>
                          <p className="text-sm font-serif text-[#3D352E] mt-1">{s.name}</p>
                          <p className="text-[10px] text-[#5C5349]/70 mt-0.5">{s.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'flow' && <TarotFlow onComplete={() => setView('history')} />}
            {view === 'history' && <History />}
          </AnimatePresence>
        </main>
      </div>
      <Settings open={showSettings} onClose={() => setShowSettings(false)} />
    </ErrorBoundary>
  );
}
