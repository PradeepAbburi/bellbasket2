import React, { useState, useEffect } from 'react';
import { 
    LifeBuoy, Search, MessageSquare, 
    AlertCircle, CheckCircle2, Clock, Trash2,
    User, Mail, Calendar, Shield, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { sendInAppNotification } from '@/utils/notifications';
import { toast } from 'sonner';
import PageLoading from '@/components/PageLoading';

const AdminSupport = () => {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
    const [roleTab, setRoleTab] = useState<'all' | 'customer' | 'vendor'>('all');
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

    // Fetch support requests real-time
    useEffect(() => {
        const q = query(collection(db, "support_requests"));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort in memory by updatedAt or createdAt descending
            list.sort((a: any, b: any) => {
                const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return dateB - dateA;
            });
            setTickets(list);
            setLoading(false);
        }, (err) => {
            console.error("Support sync error:", err);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Sync selected ticket real-time when list updates
    useEffect(() => {
        if (selectedTicket) {
            const updated = tickets.find(t => t.id === selectedTicket.id);
            if (updated) {
                setSelectedTicket(updated);
            }
        }
    }, [tickets]);

    // Clear admin unread flag when viewing ticket
    useEffect(() => {
        if (selectedTicket && selectedTicket.hasUnreadAdmin) {
            updateDoc(doc(db, "support_requests", selectedTicket.id), {
                hasUnreadAdmin: false
            }).catch(err => console.error("Error clearing admin unread badge:", err));
        }
    }, [selectedTicket?.id, selectedTicket?.hasUnreadAdmin]);

    if (loading) return <PageLoading />;

    const filteredTickets = tickets.filter(t => {
        // Search filter
        const matchesSearch = (t.userName || t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (t.subject || t.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (t.userEmail || t.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        // Status filter
        // Treat 'open' as pending, 'closed' as resolved
        const isResolved = t.status === 'resolved' || t.status === 'closed';
        const matchesStatus = statusFilter === 'all' 
            ? true 
            : (statusFilter === 'pending' ? !isResolved : isResolved);
        
        // Role filter (vendor vs customer)
        const isVendorTicket = t.userRole === 'vendor' || !!t.plan;
        const matchesRole = roleTab === 'all' 
            ? true 
            : (roleTab === 'vendor' ? isVendorTicket : !isVendorTicket);

        return matchesSearch && matchesStatus && matchesRole;
    });

    const handleUpdateStatus = async (id: string, currentStatus: string) => {
        // If pending/open -> resolve it. If resolved/closed -> open it as pending.
        const isResolved = currentStatus === 'resolved' || currentStatus === 'closed';
        const newStatus = isResolved ? 'pending' : 'resolved';
        
        try {
            await updateDoc(doc(db, "support_requests", id), {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
            
            toast.success(`Ticket status updated to ${newStatus.toUpperCase()}`);

            // Send in-app notification to the ticket creator
            if (selectedTicket?.userId) {
                await sendInAppNotification(selectedTicket.userId, {
                    title: `Support Ticket Updated 🎫`,
                    body: `Your support ticket regarding "${selectedTicket.subject || 'your request'}" is now marked as ${newStatus.toUpperCase()}.`,
                    url: selectedTicket.userRole === 'vendor' ? '/vendor' : '/support',
                    type: 'system',
                    id: selectedTicket.id
                });
            }
        } catch (e) {
            toast.error("Failed to update status");
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
        <div className="space-y-6 h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-10rem)] flex flex-col text-left">
            <header className={`flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0 ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white tracking-tight">Support Queue</h2>
                    <p className="text-slate-400 font-medium text-sm">Managing user inbound communications and protocol status resolutions.</p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {/* User Role Categories Tab Selector */}
                    <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'customer', label: 'Customers' },
                            { id: 'vendor', label: 'Vendors' }
                        ].map((role) => (
                            <button
                                key={role.id}
                                onClick={() => setRoleTab(role.id as any)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${roleTab === role.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>

                    {/* Status filter */}
                    <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                        {[
                            { id: 'all', label: 'All Status' },
                            { id: 'pending', label: 'Pending' },
                            { id: 'resolved', label: 'Resolved' }
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setStatusFilter(s.id as any)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-8 overflow-hidden min-h-0">
                {/* Tickets Feed */}
                <div className={`lg:col-span-2 flex flex-col gap-4 overflow-hidden min-h-0 border-r-0 lg:border-r border-slate-800/60 pr-0 lg:pr-4 ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="relative shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Query subjects, names or email..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-black focus:ring-4 focus:ring-indigo-550/10 focus:border-indigo-500/50 transition-all outline-none text-white placeholder-slate-500 shadow-sm"
                        />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 pb-10">
                        {filteredTickets.length === 0 ? (
                            <div className="p-10 text-center bg-[#0f172a] rounded-3xl border-dashed border-2 border-slate-800 mt-6">
                                <LifeBuoy className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">No active support threads</p>
                            </div>
                        ) : (
                            filteredTickets.map((t) => {
                                const isResolved = t.status === 'resolved' || t.status === 'closed';
                                const isVendor = t.userRole === 'vendor' || !!t.plan;
                                
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTicket(t)}
                                        className={`w-full p-6 rounded-2xl lg:rounded-[2rem] text-left transition-all border relative ${selectedTicket?.id === t.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-950/20 scale-102' : 'bg-[#0f172a] border-slate-800/80 hover:bg-slate-900/60'}`}
                                    >
                                        {/* Unread dot */}
                                        {t.hasUnreadAdmin && (
                                            <span className="absolute top-6 right-6 w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" />
                                        )}

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${isResolved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${selectedTicket?.id === t.id ? 'text-white/60' : 'text-slate-400'}`}>
                                                    {t.status || 'pending'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                    isVendor 
                                                        ? (selectedTicket?.id === t.id ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20') 
                                                        : (selectedTicket?.id === t.id ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20')
                                                }`}>
                                                    {isVendor ? 'Vendor' : 'User'}
                                                </span>
                                            </div>
                                            <span className={`text-[8px] font-bold ${selectedTicket?.id === t.id ? 'text-white/40' : 'text-slate-500'} uppercase tracking-[0.2em]`}>
                                                {new Date(t.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className={`text-sm font-black truncate mb-1 ${selectedTicket?.id === t.id ? 'text-white' : 'text-slate-200'}`}>
                                            {t.subject || t.details || 'Support Ticket'}
                                        </h4>
                                        <p className={`text-[10px] font-bold truncate ${selectedTicket?.id === t.id ? 'text-white/60' : 'text-slate-400'}`}>
                                            {t.details || t.messages?.[t.messages.length - 1]?.text || 'No description'}
                                        </p>
                                        <div className="mt-4 flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black ${selectedTicket?.id === t.id ? 'bg-white/25 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                {(t.userName || t.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <span className={`text-[10px] font-black ${selectedTicket?.id === t.id ? 'text-white' : 'text-slate-300'}`}>
                                                {t.userName || t.name || 'Anonymous'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Ticket Details View */}
                <div className={`lg:col-span-3 overflow-hidden min-h-0 h-full ${selectedTicket ? 'flex' : 'hidden lg:flex'}`}>
                    <AnimatePresence mode="wait">
                        {selectedTicket ? (
                            <motion.div 
                                key={selectedTicket.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full flex flex-col bg-[#0f172a] rounded-3xl lg:rounded-[3rem] border border-slate-800 shadow-xl overflow-hidden"
                            >
                                {/* Header */}
                                <div className="p-6 md:p-8 border-b border-slate-800 shrink-0 flex items-center justify-between bg-slate-900/30">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <button 
                                            onClick={() => setSelectedTicket(null)}
                                            className="lg:hidden p-2.5 -ml-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all shrink-0"
                                            title="Back to queue"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-900/20 shrink-0">
                                            <LifeBuoy className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white tracking-tight leading-snug truncate max-w-[250px] md:max-w-[400px]">
                                                {selectedTicket.subject || 'Support Ticket'}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID: {selectedTicket.id.slice(0, 8)}</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                                    (selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                    {selectedTicket.status || 'pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteTicket(selectedTicket.id)}
                                        className="p-3 rounded-xl bg-rose-950/20 text-rose-455 hover:bg-rose-900/40 transition-all border border-rose-900/30 shadow-sm"
                                        title="Delete Record"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Details Body */}
                                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-slate-950/15 text-slate-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Sender Details</p>
                                            <p className="text-sm font-black text-white">{selectedTicket.userName || selectedTicket.name || 'Anonymous'}</p>
                                            <p className="text-xs font-bold text-slate-400 mt-0.5">{selectedTicket.userEmail || selectedTicket.email || 'No Email'}</p>
                                        </div>
                                        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Metadata Ledger</p>
                                            <p className="text-sm font-black text-white capitalize">Role: {selectedTicket.userRole || (selectedTicket.plan ? 'vendor' : 'customer')}</p>
                                            <p className="text-xs font-bold text-slate-400 mt-0.5">Submitted: {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {(selectedTicket.storeId || selectedTicket.orderId || selectedTicket.bookingId) && (
                                        <div className="bg-indigo-950/10 p-5 rounded-2xl border border-indigo-900/35 space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Linked Reference Ledger</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {selectedTicket.storeId && (
                                                    <div>
                                                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Store Reference</span>
                                                        <span className="text-xs font-mono font-black text-white">{selectedTicket.storeId}</span>
                                                    </div>
                                                )}
                                                {selectedTicket.orderId && (
                                                    <div>
                                                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Order Reference</span>
                                                        <span className="text-xs font-mono font-black text-white">{selectedTicket.orderId}</span>
                                                    </div>
                                                )}
                                                {selectedTicket.bookingId && (
                                                    <div>
                                                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Booking Reference</span>
                                                        <span className="text-xs font-mono font-black text-white">{selectedTicket.bookingId}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3 pt-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Problem Description</p>
                                        <div className="p-6 rounded-2xl lg:rounded-[2rem] bg-indigo-950/20 border border-indigo-900/30 text-slate-200 text-xs font-medium leading-relaxed whitespace-pre-wrap break-words">
                                            {selectedTicket.details || selectedTicket.messages?.[1]?.text || selectedTicket.messages?.[0]?.text || 'No description provided.'}
                                        </div>
                                    </div>

                                    {selectedTicket.status === 'pending' ? (
                                        <div className="bg-amber-950/20 border border-amber-900/35 p-5 rounded-2xl flex items-start gap-3 mt-4">
                                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Awaiting Resolution</p>
                                                <p className="text-xs font-bold text-amber-600/90 mt-1">This ticket requires administrative action. Review details and toggle the status below to notify the sender.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-950/20 border border-emerald-900/35 p-5 rounded-2xl flex items-start gap-3 mt-4">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Ticket Resolved</p>
                                                <p className="text-xs font-bold text-emerald-600/90 mt-1">This ticket has been marked as resolved. The sender has been notified.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Status Toggle Action bar */}
                                <div className="p-6 md:p-8 border-t border-slate-800 bg-slate-900/30 shrink-0">
                                    <button 
                                        onClick={() => handleUpdateStatus(selectedTicket.id, selectedTicket.status)}
                                        className={`w-full flex items-center justify-center gap-3 h-14 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                                            (selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') 
                                                ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white' 
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-950/20'
                                        }`}
                                    >
                                        {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                        {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') ? 'Re-open Ticket' : 'Mark as Resolved'}
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-[#0f172a] rounded-[3rem] border-dashed border-2 border-slate-800 space-y-6">
                                <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-800/80 flex items-center justify-center">
                                    <MessageSquare className="w-10 h-10 text-slate-650" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-500">Communication Terminal Idle</h3>
                                    <p className="text-slate-400 font-medium max-w-sm mx-auto text-sm">Select a support ticket from the registry to view logs and toggle resolution status.</p>
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
