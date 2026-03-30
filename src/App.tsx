import React, { useState } from 'react';
import TarotFlow from './components/TarotFlow';
import History from './components/History';
import ErrorBoundary from './components/ErrorBoundary';
import { Sparkles, History as HistoryIcon, Info, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState<'home' | 'flow' | 'history'>('home');

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-[#ff4e00]/30">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center backdrop-blur-md bg-black/20 border-b border-white/5">
          <div
            className="text-2xl font-serif font-light cursor-pointer hover:text-[#ff4e00] transition-colors"
            onClick={() => setView('home')}
          >
            Tarot Flow
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setView('flow')} aria-current={view === 'flow' ? 'page' : undefined} className={`flex items-center gap-2 text-sm uppercase tracking-widest ${view === 'flow' ? 'text-[#ff4e00]' : 'text-gray-400 hover:text-white'}`}>
              <Sparkles size={16} />
              <span className="hidden sm:inline">新占卜</span>
            </button>
            <button onClick={() => setView('history')} aria-current={view === 'history' ? 'page' : undefined} className={`flex items-center gap-2 text-sm uppercase tracking-widest ${view === 'history' ? 'text-[#ff4e00]' : 'text-gray-400 hover:text-white'}`}>
              <HistoryIcon size={16} />
              <span className="hidden sm:inline">历史</span>
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
                className="space-y-12"
              >
                <div className="space-y-4">
                  <h2 className="text-5xl font-serif font-light leading-tight">
                    欢迎使用 Tarot Flow。<br />
                    <span className="text-gray-500 italic">今天想探寻什么？</span>
                  </h2>
                  <p className="text-gray-400 max-w-lg">先洗牌，再选数，再翻开答案。每一轮都固定，每一张都有位置。</p>
                  <button
                    onClick={() => setView('flow')}
                    className="flex items-center gap-2 px-8 py-3 bg-[#ff4e00] text-white rounded-full font-medium hover:bg-[#e64600] transition-colors shadow-lg shadow-[#ff4e00]/20"
                  >
                    <Sparkles size={18} />
                    开始新占卜
                  </button>
                </div>

                <div className="border-t border-white/5 pt-8">
                  <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2"><Info size={12} /> 牌阵说明</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-500 text-sm">
                    <div className="space-y-1">
                      <p>• <span className="text-white font-medium">单张</span></p>
                      <p className="text-xs">快速洞察当前能量或核心答案。</p>
                    </div>
                    <div className="space-y-1">
                      <p>• <span className="text-white font-medium">三张</span></p>
                      <p className="text-xs">过去、现在、未来的时间线解读。</p>
                    </div>
                    <div className="space-y-1">
                      <p>• <span className="text-white font-medium">五张凯尔特</span></p>
                      <p className="text-xs">深入分析复杂决策。</p>
                    </div>
                    <div className="space-y-1">
                      <p>• <span className="text-white font-medium">感情/关系</span></p>
                      <p className="text-xs">剖析双方心态与互动。</p>
                    </div>
                    <div className="space-y-1">
                      <p>• <span className="text-white font-medium">事业/决策</span></p>
                      <p className="text-xs">职场现状与行动建议。</p>
                    </div>
                    <div className="space-y-1">
                      <p>• <span className="text-white font-medium">周运势</span></p>
                      <p className="text-xs">预测未来七天运势。</p>
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
    </ErrorBoundary>
  );
}
