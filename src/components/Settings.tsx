import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Cpu, Sparkles, Zap } from 'lucide-react';

export interface ModelOption {
  id: string;
  name: string;
  provider: 'openai' | 'gemini' | 'minimax';
  description: string;
  tier: 'fast' | 'balanced' | 'deep';
}

const MODEL_OPTIONS: ModelOption[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: '最强综合能力，解读深度最佳', tier: 'deep' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: '快速响应，性价比高', tier: 'fast' },
  { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', provider: 'gemini', description: '深度思考，分析能力强', tier: 'deep' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', description: '极速响应，适合快速占卜', tier: 'fast' },
  { id: 'MiniMax-M2.7', name: 'MiniMax M2.7', provider: 'minimax', description: '最新旗舰，中文理解顶级', tier: 'deep' },
  { id: 'MiniMax-M2.5', name: 'MiniMax M2.5', provider: 'minimax', description: '均衡之选，玄学风味浓', tier: 'balanced' },
  { id: 'MiniMax-M2.5-highspeed', name: 'MiniMax M2.5 极速', provider: 'minimax', description: '高速版本，快问快答', tier: 'fast' },
  { id: 'MiniMax-M2.1', name: 'MiniMax M2.1', provider: 'minimax', description: '稳定可靠，经典版本', tier: 'balanced' },
];

type ProviderKey = 'openai' | 'gemini' | 'minimax';

const PROVIDER_TABS: { key: ProviderKey; label: string; icon: typeof Cpu }[] = [
  { key: 'openai', label: 'OpenAI', icon: Cpu },
  { key: 'gemini', label: 'Gemini', icon: Sparkles },
  { key: 'minimax', label: 'MiniMax', icon: Zap },
];

const TIER_CONFIG = {
  fast: { label: '极速', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  balanced: { label: '均衡', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  deep: { label: '深度', className: 'bg-purple-500/15 text-purple-400 border border-purple-500/20' },
};

const STORAGE_KEY = 'tarot_model';

export function getSelectedModel(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function getModelProvider(modelId: string): ProviderKey {
  const option = MODEL_OPTIONS.find(m => m.id === modelId);
  if (option) return option.provider;
  if (modelId.startsWith('gemini')) return 'gemini';
  if (modelId.startsWith('MiniMax') || modelId.startsWith('minimax')) return 'minimax';
  return 'openai';
}

export default function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState(() => getSelectedModel() || MODEL_OPTIONS[0].id);
  const selectedProvider = getModelProvider(selected);
  const [activeTab, setActiveTab] = useState<ProviderKey>(selectedProvider);

  const handleSelect = (modelId: string) => {
    setSelected(modelId);
    try { localStorage.setItem(STORAGE_KEY, modelId); } catch { /* ignore */ }
  };

  const modelsForTab = MODEL_OPTIONS.filter(m => m.provider === activeTab);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg mx-4 bg-[#141210] border border-white/10 rounded-3xl p-6 space-y-5 max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif">模型设置</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <p className="text-xs text-gray-500">不同模型有不同的解读风格和速度。</p>

            {/* Provider Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
              {PROVIDER_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === key
                      ? 'bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Model List */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                {modelsForTab.map((m) => {
                  const tier = TIER_CONFIG[m.tier];
                  return (
                    <motion.button
                      key={m.id}
                      onClick={() => handleSelect(m.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        selected === m.id
                          ? 'bg-[#ff4e00]/10 border-[#ff4e00] border-l-2 border-l-[#ff4e00]'
                          : 'bg-white/[0.03] border-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${tier.className}`}>
                            {tier.label}
                          </span>
                          {selected === m.id && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#ff4e00] text-white rounded-full">当前</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{m.description}</p>
                    </motion.button>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            <p className="text-[10px] text-gray-600 text-center pt-2">设置会自动保存，下次占卜时生效。</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
