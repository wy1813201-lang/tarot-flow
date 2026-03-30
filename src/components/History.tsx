import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { SPREADS } from '../constants/tarot';
import { TarotReading } from '../types/reading';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

interface SessionRecord {
  id: string;
  uid: string;
  question: string;
  spreadType: string;
  isStrictMode: boolean;
  hash: string;
  reading?: TarotReading;
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function History() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = async (isLoadMore = false) => {
    if (!auth.currentUser) { setLoading(false); return; }
    const colRef = collection(db, 'users', auth.currentUser.uid, 'sessions');
    let q = query(colRef, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    if (isLoadMore && lastDoc) {
      q = query(colRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
    }

    try {
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SessionRecord));
      if (isLoadMore) {
        setSessions(prev => [...prev, ...data]);
      } else {
        setSessions(data);
      }
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser.uid}/sessions`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [auth.currentUser?.uid]);

  const handleLoadMore = () => { setLoadingMore(true); fetchHistory(true); };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'sessions', id));
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${auth.currentUser!.uid}/sessions/${id}`);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500 italic">正在加载命运的回响...</div>;
  if (sessions.length === 0) return (
    <div className="text-center py-20 space-y-4">
      <p className="text-gray-500 italic">尚无占卜记录。</p>
      <p className="text-sm text-gray-600">开启你的第一次探索吧。</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-serif mb-8">历史记录</h2>
      <div className="space-y-4">
        {sessions.map((session) => (
          <motion.div key={session.id} layout className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(expandedId === session.id ? null : session.id); } }}
              role="button"
              tabIndex={0}
              aria-expanded={expandedId === session.id}
              className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#ff4e00] uppercase tracking-widest font-serif">
                    {SPREADS[session.spreadType as keyof typeof SPREADS]?.name || session.spreadType}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">#{session.hash.substring(0, 8)}</span>
                </div>
                <h3 className="text-xl font-serif line-clamp-1">{session.question}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} /><span>{new Date(session.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={(e) => handleDelete(session.id, e)} aria-label="删除此记录" className="p-2 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                {expandedId === session.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            <AnimatePresence>
              {expandedId === session.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5 bg-black/20">
                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-serif text-gray-500 uppercase tracking-widest">占卜结论</h4>
                      <p className="text-lg text-white">{session.reading?.summary}</p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-serif text-gray-500 uppercase tracking-widest">核心建议</h4>
                      <p className="text-gray-300 italic border-l-2 border-[#ff4e00] pl-4">{session.reading?.finalAdvice}</p>
                    </div>

                    {detailId === session.id && session.reading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pt-4 border-t border-white/5">
                        {session.reading.detailedInterpretations?.map((interp, i) => (
                          <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#ff4e00] font-serif uppercase tracking-widest">{interp.position}</span>
                              <span className="text-xs text-gray-500">— {interp.card}</span>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">{interp.meaning}</p>
                          </div>
                        ))}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                          <h5 className="text-xs text-[#ff4e00] font-serif uppercase tracking-widest">整体趋势</h5>
                          <p className="text-sm text-gray-300 leading-relaxed">{session.reading.overallTrend}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                            <h5 className="text-xs text-[#ff4e00] font-serif uppercase tracking-widest">行动建议</h5>
                            <p className="text-xs text-gray-400 leading-relaxed">{session.reading.suggestions?.actionableSteps}</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                            <h5 className="text-xs text-[#ff4e00] font-serif uppercase tracking-widest">心态调整</h5>
                            <p className="text-xs text-gray-400 leading-relaxed">{session.reading.suggestions?.mindsetShift}</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                            <h5 className="text-xs text-[#ff4e00] font-serif uppercase tracking-widest">潜在警示</h5>
                            <p className="text-xs text-gray-400 leading-relaxed">{session.reading.suggestions?.warningSigns}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="pt-4 flex justify-end">
                      <button onClick={() => setDetailId(detailId === session.id ? null : session.id)}
                        className="text-xs text-[#ff4e00] flex items-center gap-1 hover:underline">
                        <span>{detailId === session.id ? '收起完整报告' : '查看完整报告'}</span>
                        {detailId === session.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button onClick={handleLoadMore} disabled={loadingMore}
            className="px-8 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-full text-sm hover:bg-white/10 transition-all flex items-center gap-2">
            {loadingMore ? <Loader2 className="animate-spin" size={16} /> : null}
            <span>{loadingMore ? '加载中...' : '加载更多'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
