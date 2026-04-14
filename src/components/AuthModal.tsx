import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (password.length < 6) {
      setError('密码至少需要 6 个字符');
      setLoading(false);
      return;
    }

    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === 'register') {
      setSuccess('注册成功！请查收邮箱验证链接。');
    } else {
      onClose();
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError(null);
    setSuccess(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#FAF7F2] rounded-2xl shadow-2xl max-w-sm w-full p-8 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#5C5349]/50 hover:text-[#3D352E] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif text-[#3D352E]">
                {mode === 'login' ? '欢迎回来' : '加入星谶'}
              </h2>
              <p className="text-xs text-[#5C5349]/70 mt-1">
                {mode === 'login' ? '登录继续你的占卜之旅' : '注册开启命运的探索'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C5349]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="邮箱地址"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#F3EEE6] border border-[#E8E0D2] rounded-xl text-sm focus:border-[#C9A86A] outline-none transition-colors"
                />
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C5349]/40" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="密码（至少 6 位）"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-[#F3EEE6] border border-[#E8E0D2] rounded-xl text-sm focus:border-[#C9A86A] outline-none transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
              {success && (
                <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{success}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#C9A86A] text-white rounded-xl font-medium hover:bg-[#B8944F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {mode === 'login' ? '登录' : '注册'}
              </button>
            </form>

            <p className="text-center text-xs text-[#5C5349]/60 mt-5">
              {mode === 'login' ? '还没有账号？' : '已有账号？'}
              <button
                onClick={switchMode}
                className="text-[#C9A86A] hover:underline ml-1"
              >
                {mode === 'login' ? '立即注册' : '去登录'}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
