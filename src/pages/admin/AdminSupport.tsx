import React, { useState, useEffect } from 'react';
import { 
    LifeBuoy, Search, Filter, MessageSquare, 
    AlertCircle, CheckCircle2, Clock, Trash2,
    User, Mail, Phone, Calendar, ArrowUpRight,
    ExternalLink, ShieldAlert, Sparkles, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';

const AdminSupport = () => {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

    useEffect(() => {
        const q = query(collection(db, "support_requests"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTickets(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (t.message || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, "support_requests", id), {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
            toast.success(`Ticket state: ${newStatus.toUpperCase()}`);
            if (selectedTicket?.id === id) {
                setSelectedTicket({ ...selectedTicket, status: newStatus });
            }
        } catch (e) {
            toast.error("Status update protocol failed");
        }
    };

    const handleDeleteTicket = async (id: string) => {
        if (!window.confirm("Purge this communication record from the ledger?")) return;
        try {
            await deleteDoc(doc(db, "support_requests", id));
            toast.success("Record purged");
            setSelectedTicket(null);
        } catch (e) {
            toast.error("Purge failure");
        }
    };

    return (
        <div className="space-y-8 h-[calc(100vh-10rem)] flex flex-col">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Support Command</h2>
                    <p className="text-slate-500 font-medium text-sm">Managing user inbound communications and protocol resolutions.</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    {['all', 'pending', 'resolved'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s as any)}
                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-8 overflow-hidden min-h-0">
                {/* Tickets Feed */}
                <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden min-h-0 border-r border-slate-100 pr-4">
                    <div className="relative shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Query subjects, names or content..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-xs font-black focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                        />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 pb-10">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-slate-50 rounded-3xl animate-pulse" />)
                        ) : filteredTickets.length === 0 ? (
                            <div className="p-10 text-center glass rounded-3xl border-dashed border-2 border-indigo-100 mt-10">
                                <LifeBuoy className="w-10 h-10 text-indigo-200 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">No active support threads</p>
                            </div>
                        ) : (
                            filteredTickets.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTicket(t)}
                                    className={`w-full p-6 rounded-[2rem] text-left transition-all border ${selectedTicket?.id === t.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-102' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${t.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${selectedTicket?.id === t.id ? 'text-white/60' : 'text-slate-400'}`}>{t.status}</span>
                                        </div>
                                        <span className={`text-[8px] font-bold ${selectedTicket?.id === t.id ? 'text-white/40' : 'text-slate-300'} uppercase tracking-[0.2em]`}>{new Date(t.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className={`text-sm font-black truncate mb-1 ${selectedTicket?.id === t.id ? 'text-white' : 'text-slate-900'}`}>{t.subject}</h4>
                                    <p className={`text-[10px] font-bold truncate ${selectedTicket?.id === t.id ? 'text-white/60' : 'text-slate-400'}`}>{t.message}</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black ${selectedTicket?.id === t.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {t.name?.charAt(0)}
                                        </div>
                                        <span className={`text-[10px] font-black ${selectedTicket?.id === t.id ? 'text-white' : 'text-slate-700'}`}>{t.name}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Ticket Details View */}
                <div className="lg:col-span-3 overflow-hidden min-h-0">
                    <AnimatePresence mode="wait">
                        {selectedTicket ? (
                            <motion.div 
                                key={selectedTicket.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full flex flex-col bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden"
                            >
                                <div className="p-8 border-b border-slate-100 shrink-0 flex items-center justify-between bg-slate-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center">
                                            <MessageSquare className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedTicket.subject}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket #{selectedTicket.id.slice(0, 8)}</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${selectedTicket.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {selectedTicket.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteTicket(selectedTicket.id)}
                                        className="p-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all border border-rose-100 shadow-sm"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Sender Protocol</p>
                                            <p className="text-sm font-black text-slate-900">{selectedTicket.name}</p>
                                            <p className="text-xs font-bold text-slate-500 mt-1">{selectedTicket.email}</p>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Timestamp</p>
                                            <p className="text-sm font-black text-slate-900">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Communication History</p>
                                        <div className="p-8 rounded-[2rem] bg-indigo-50/30 border border-indigo-100 text-slate-800 text-sm font-bold leading-relaxed relative">
                                            <div className="absolute -left-2 top-8 w-4 h-4 bg-indigo-50 rotate-45 border-l border-b border-indigo-100" />
                                            {selectedTicket.message}
                                        </div>
                                    </div>

                                    {selectedTicket.status === 'pending' && (
                                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pending Resolution</p>
                                                <p className="text-xs font-bold text-amber-700 mt-1">This ticket requires administrative action before archiving.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 border-t border-slate-100 bg-slate-50/50 shrink-0 flex items-center gap-4">
                                    <button 
                                        onClick={() => handleUpdateStatus(selectedTicket.id, selectedTicket.status === 'pending' ? 'resolved' : 'pending')}
                                        className={`flex-1 flex items-center justify-center gap-3 h-16 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl ${selectedTicket.status === 'pending' ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:scale-105' : 'bg-slate-200 text-slate-600 shadow-slate-200/20 hover:bg-slate-300'}`}
                                    >
                                        {selectedTicket.status === 'pending' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                        {selectedTicket.status === 'pending' ? 'Mark as Resolved' : 'Back to Pending'}
                                    </button>
                                    <button className="h-16 px-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all">
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-20 glass rounded-[3rem] border-dashed border-2 border-indigo-100 space-y-6">
                                <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center">
                                    <MessageSquare className="w-10 h-10 text-indigo-300" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-400">Communication Terminal Idle</h3>
                                    <p className="text-slate-400 font-medium max-w-sm mx-auto text-sm">Select a support ticket from the registry to view protocol details and initiate resolution.</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default AdminSupport;
