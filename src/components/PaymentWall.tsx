import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Zap, Crown, Loader2, QrCode } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUsage } from '../hooks/useUsage';

interface PaymentWallProps {
  open: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

const PLANS = [
  { key: 'single', name: '单次占卜', price: 3, uses: 1, desc: '立即解锁一次', icon: Sparkles, accent: 'from-[#C9A86A]/10 to-[#C9A86A]/5' },
  { key: 'weekly', name: '周卡', price: 15, uses: 20, desc: '7天内可用20次', icon: Zap, accent: 'from-violet-500/10 to-violet-500/5', popular: true },
  { key: 'monthly', name: '月卡', price: 30, uses: 60, desc: '30天内可用60次', icon: Crown, accent: 'from-amber-500/10 to-amber-500/5' },
] as const;

export default function PaymentWall({ open, onClose, onPaymentSuccess }: PaymentWallProps) {
  const { user } = useAuth();
  const { refreshUsage } = useUsage();
  const [selectedPlan, setSelectedPlan] = useState<string>('weekly');
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, userId: user.id }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '创建订单失败');
        return;
      }
      setQrUrl(data.data.payUrl);
      setOrderId(data.data.orderId);
      pollPaymentStatus(data.data.orderId);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = (oid: string) => {
    let attempts = 0;
    const maxAttempts = 100; // 5 minutes at 3s interval
    const timer = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(timer);
        return;
      }
      try {
        const res = await fetch(`/api/payment/status?orderId=${oid}`);
        const data = await res.json();
        if (data.data?.paid) {
          clearInterval(timer);
          await refreshUsage();
          onPaymentSuccess();
          onClose();
        }
      } catch { /* retry silently */ }
    }, 3000);
  };

  const resetState = () => {
    setQrUrl(null);
    setOrderId(null);
    setError(null);
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => { resetState(); onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#FAF7F2] rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { resetState(); onClose(); }}
              className="absolute top-4 right-4 text-[#5C5349]/50 hover:text-[#3D352E]"
            >
              <X size={18} />
            </button>

            {!qrUrl ? (
              <>
                <div className="text-center mb-5">
                  <h2 className="text-xl font-serif text-[#3D352E]">解锁更多占卜</h2>
                  <p className="text-xs text-[#5C5349]/70 mt-1">免费体验已用完，选择适合你的方案</p>
                </div>

                <div className="space-y-3">
                  {PLANS.map(plan => {
                    const Icon = plan.icon;
                    const selected = selectedPlan === plan.key;
                    return (
                      <button
                        key={plan.key}
                        onClick={() => setSelectedPlan(plan.key)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all relative
                          ${selected
                            ? 'border-[#C9A86A] bg-gradient-to-r ' + plan.accent
                            : 'border-[#E8E0D2] hover:border-[#C9A86A]/30'
                          }`}
                      >
                        {'popular' in plan && plan.popular && (
                          <span className="absolute -top-2.5 right-3 text-[9px] px-2 py-0.5 bg-[#C9A86A] text-white rounded-full font-medium">
                            推荐
                          </span>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon size={18} className={selected ? 'text-[#C9A86A]' : 'text-[#5C5349]/40'} />
                            <div>
                              <p className="text-sm font-medium text-[#3D352E]">{plan.name}</p>
                              <p className="text-[10px] text-[#5C5349]/60">{plan.desc}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-[#3D352E]">¥{plan.price}</p>
                            <p className="text-[10px] text-[#5C5349]/50">{plan.uses}次</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>
                )}

                <button
                  onClick={handlePay}
                  disabled={loading}
                  className="w-full mt-5 py-3 bg-[#C9A86A] text-white rounded-xl font-medium hover:bg-[#B8944F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                  微信 / 支付宝支付
                </button>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <h3 className="text-lg font-serif text-[#3D352E]">扫码支付</h3>
                <div className="mx-auto w-52 h-52 bg-white rounded-xl border border-[#E8E0D2] flex items-center justify-center overflow-hidden">
                  <img src={qrUrl} alt="支付二维码" className="w-full h-full object-contain" />
                </div>
                <p className="text-xs text-[#5C5349]/60">请使用微信或支付宝扫码完成支付</p>
                <div className="flex items-center justify-center gap-2 text-xs text-[#C9A86A]">
                  <Loader2 size={12} className="animate-spin" />
                  等待支付确认...
                </div>
                <button
                  onClick={resetState}
                  className="text-xs text-[#5C5349]/50 hover:text-[#3D352E] underline"
                >
                  返回选择方案
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
