import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import TarotFlow from './components/TarotFlow';
import History from './components/History';
import ErrorBoundary from './components/ErrorBoundary';
import { Sparkles, History as HistoryIcon, Info, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'flow' | 'history'>('home');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Ensure user doc exists
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || 'anonymous@local',
              displayName: currentUser.displayName || '探索者',
              createdAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("Error checking user doc:", err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => auth.signOut();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0502] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-[#ff4e00] text-xl font-serif italic"
        >
          正在连接灵感...
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {!user ? (
        <div className="min-h-screen bg-[#0a0502] text-white flex flex-col items-center justify-center p-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md"
          >
            <h1 className="text-6xl font-serif font-light mb-4 tracking-tighter">Tarot Flow</h1>
            <p className="text-gray-400 mb-8 font-light italic">先洗牌，再选数，再翻开答案。每一轮都固定，每一张都有位置。</p>
            <button
              onClick={handleLogin}
              disabled={authLoading}
              className="px-8 py-3 bg-[#ff4e00] text-white rounded-full font-medium hover:bg-[#e64600] transition-colors shadow-lg shadow-[#ff4e00]/20 disabled:opacity-50"
            >
              {authLoading ? '连接中...' : '开启灵感之旅'}
            </button>
          </motion.div>
        </div>
      ) : (
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
              <button onClick={handleLogout} aria-label="退出登录" className="text-gray-400 hover:text-red-400 transition-colors">
                <LogOut size={18} />
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
                      你好，{user.displayName?.split(' ')[0] || '探索者'}。<br />
                      <span className="text-gray-500 italic">今天想探寻什么？</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                      onClick={() => setView('flow')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('flow'); } }}
                      role="button"
                      tabIndex={0}
                      className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-[#ff4e00]/50 transition-all cursor-pointer overflow-hidden"
                    >
                      <div className="relative z-10">
                        <Sparkles className="text-[#ff4e00] mb-4" size={32} />
                        <h3 className="text-2xl font-serif mb-2">开始抽牌</h3>
                        <p className="text-gray-400 text-sm">选择牌阵，洗牌，输入数字，获取 AI 深度解读。</p>
                      </div>
                      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[#ff4e00]/10 rounded-full blur-3xl group-hover:bg-[#ff4e00]/20 transition-all" />
                    </div>

                    <div
                      onClick={() => setView('history')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('history'); } }}
                      role="button"
                      tabIndex={0}
                      className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-[#ff4e00]/50 transition-all cursor-pointer overflow-hidden"
                    >
                      <div className="relative z-10">
                        <HistoryIcon className="text-[#ff4e00] mb-4" size={32} />
                        <h3 className="text-2xl font-serif mb-2">历史记录</h3>
                        <p className="text-gray-400 text-sm">回顾你过去的每一次占卜，观察命运的轨迹。</p>
                      </div>
                      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[#ff4e00]/10 rounded-full blur-3xl group-hover:bg-[#ff4e00]/20 transition-all" />
                    </div>
                  </div>

                  <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <Info className="text-gray-400" size={20} />
                      <h3 className="text-lg font-serif">牌阵说明</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-400">
                      <div className="space-y-1">
                        <p>• <span className="text-white font-medium">单张判断</span></p>
                        <p className="text-xs">适合快速判断是非、吉凶。位置：核心结论。</p>
                      </div>
                      <div className="space-y-1">
                        <p>• <span className="text-white font-medium">三张基础</span></p>
                        <p className="text-xs">涵盖过去、现在、未来。位置：现状、阻碍、发展。</p>
                      </div>
                      <div className="space-y-1">
                        <p>• <span className="text-white font-medium">五张进阶</span></p>
                        <p className="text-xs">深入分析复杂决策。位置：总趋势、当前状态、外部变量、转折点、最终走向。</p>
                      </div>
                      <div className="space-y-1">
                        <p>• <span className="text-white font-medium">感情/关系</span></p>
                        <p className="text-xs">剖析双方心态与互动。位置：我的心态、对方心态、关系现状、潜在挑战、未来走向。</p>
                      </div>
                      <div className="space-y-1">
                        <p>• <span className="text-white font-medium">事业/决策</span></p>
                        <p className="text-xs">职场现状与行动建议。位置：现状、个人优势、外部劣势、潜在机遇、最终建议。</p>
                      </div>
                      <div className="space-y-1">
                        <p>• <span className="text-white font-medium">周运势</span></p>
                        <p className="text-xs">预测未来七天运势。位置：本周主题、周一至周日每日运势。</p>
                      </div>
                      <div className="space-y-1">
                        <p>• <span className="text-white font-medium">十张年度</span></p>
                        <p className="text-xs">全面的生活维度预测。位置：自我、环境、潜意识、过去、未来、他人、恐惧、建议等。</p>
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
      )}
    </ErrorBoundary>
  );
}
