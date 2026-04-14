import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, CreditCard, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserMenuProps {
  onLoginClick: () => void;
}

export default function UserMenu({ onLoginClick }: UserMenuProps) {
  const { user, profile, subscription, loading, configured, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!configured || loading) return null;

  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        className="flex items-center gap-2 text-sm uppercase tracking-widest text-[#5C5349] hover:text-[#3D352E]"
      >
        <User size={16} />
        <span className="hidden sm:inline">登录</span>
      </button>
    );
  }

  const displayName = profile?.display_name || user.email?.split('@')[0] || '用户';
  const freeLeft = profile?.free_uses_remaining ?? 0;
  const subLeft = subscription?.uses_remaining ?? 0;
  const totalLeft = freeLeft + subLeft;
  const planLabel = subscription
    ? { single: '单次', weekly: '周卡', monthly: '月卡' }[subscription.plan] || subscription.plan
    : freeLeft > 0 ? '免费体验' : '未订阅';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-[#5C5349] hover:text-[#3D352E] transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-[#C9A86A]/15 border border-[#C9A86A]/30 flex items-center justify-center">
          <User size={12} className="text-[#C9A86A]" />
        </div>
        <span className="hidden sm:inline text-xs max-w-[80px] truncate">{displayName}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#FAF7F2] border border-[#E8E0D2] rounded-xl shadow-xl overflow-hidden z-[250]">
          <div className="px-4 py-3 border-b border-[#E8E0D2]">
            <p className="text-sm font-medium text-[#3D352E] truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A86A]/10 text-[#C9A86A] font-medium">
                {planLabel}
              </span>
              <span className="text-[10px] text-[#5C5349]/60">
                剩余 {totalLeft} 次
              </span>
            </div>
          </div>
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-xs text-[#5C5349] hover:bg-[#F3EEE6] flex items-center gap-3 transition-colors"
            >
              <CreditCard size={14} />
              购买次数
            </button>
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-xs text-[#5C5349] hover:bg-[#F3EEE6] flex items-center gap-3 transition-colors"
            >
              <LogOut size={14} />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
