import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { SPREADS } from '../constants/tarot';
import { TarotReading } from '../types/reading';

interface SessionRecord {
  id: string;
  question: string;
  spreadType: string;
  isStrictMode: boolean;
  hash: string;
  reading?: TarotReading;
  createdAt: string;
}

export default function History() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('tarot_sessions') || '[]');
      setSessions(data);
    } catch {
      setSessions([]);
    }
  }, []);

  const handleDelete = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    localStorage.setItem('tarot_sessions', JSON.stringify(updated));
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 text-[#5C5349]">
        <p className="text-lg font-light italic">尚无占卜记录</p>
        <p className="text-sm mt-2">完成第一次占卜后记录将出现在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-serif font-light mb-6 text-[#3D352E]">占卜历史</h2>
      {sessions.map(session => (
        <motion.div
          key={session.id}
          layout
          className="bg-[#FFFDF9] border border-[#E8E0D2] rounded-2xl overflow-hidden shadow-sm"
        >
          <div
            className="p-5 cursor-pointer flex items-start justify-between gap-4"
            onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#3D352E] truncate">{session.question}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-[#5C5349]">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(session.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>{SPREADS[session.spreadType as keyof typeof SPREADS]?.name || session.spreadType}</span>
                {session.isStrictMode && <span className="text-[#C9A86A]">严格模式</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={e => { e.stopPropagation(); handleDelete(session.id); }}
                className="p-1.5 text-[#5C5349]/40 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
              {expandedId === session.id ? <ChevronUp size={16} className="text-[#5C5349]" /> : <ChevronDown size={16} className="text-[#5C5349]" />}
            </div>
          </div>

          <AnimatePresence>
            {expandedId === session.id && session.reading && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[#E8E0D2] px-5 pb-5 pt-4 space-y-4"
              >
                <div>
                  <h5 className="text-xs text-[#C9A86A] font-serif uppercase tracking-widest mb-1">总评</h5>
                  <p className="text-sm text-[#3D352E] leading-relaxed">{session.reading.summary}</p>
                </div>

                {session.reading.detailedInterpretations?.length > 0 && (
                  <div>
                    <h5 className="text-xs text-[#C9A86A] font-serif uppercase tracking-widest mb-2">牌面解读</h5>
                    <div className="space-y-2">
                      {session.reading.detailedInterpretations.map((item, i) => (
                        <div key={i} className="bg-[#FAF7F2] rounded-xl p-3">
                          <p className="text-xs text-[#5C5349]">{item.position} · {item.card}</p>
                          <p className="text-sm text-[#3D352E] mt-1 leading-relaxed">{item.meaning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setDetailId(detailId === session.id ? null : session.id)}
                    className="text-xs text-[#C9A86A] flex items-center gap-1 hover:underline"
                  >
                    <span>{detailId === session.id ? '收起完整报告' : '查看完整报告'}</span>
                    {detailId === session.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                <AnimatePresence>
                  {detailId === session.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 pt-2"
                    >
                      {session.reading.overallTrend && (
                        <div>
                          <h5 className="text-xs text-[#C9A86A] font-serif uppercase tracking-widest mb-1">整体趋势</h5>
                          <p className="text-sm text-[#3D352E] leading-relaxed">{session.reading.overallTrend}</p>
                        </div>
                      )}
                      {session.reading.suggestions && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <h5 className="text-xs text-[#C9A86A] font-serif uppercase tracking-widest mb-1">行动建议</h5>
                            <p className="text-xs text-[#5C5349] leading-relaxed">{session.reading.suggestions.actionAdvice}</p>
                          </div>
                          <div>
                            <h5 className="text-xs text-[#C9A86A] font-serif uppercase tracking-widest mb-1">心态调整</h5>
                            <p className="text-xs text-[#5C5349] leading-relaxed">{session.reading.suggestions.mindsetShift}</p>
                          </div>
                          <div>
                            <h5 className="text-xs text-[#C9A86A] font-serif uppercase tracking-widest mb-1">潜在警示</h5>
                            <p className="text-xs text-[#5C5349] leading-relaxed">{session.reading.suggestions.warningSigns}</p>
                          </div>
                        </div>
                      )}
                      {session.reading.finalAdvice && (
                        <div>
                          <h5 className="text-xs text-[#C9A86A] font-serif uppercase tracking-widest mb-1">最终建议</h5>
                          <p className="text-sm text-[#3D352E] leading-relaxed">{session.reading.finalAdvice}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
