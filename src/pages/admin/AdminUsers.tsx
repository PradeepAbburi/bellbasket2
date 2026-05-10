import React, { useState, useEffect } from 'react';
import { 
    Users, Search, Filter, Shield, ShieldAlert,
    Trash2, Mail, Phone, Calendar, UserPlus,
    UserCircle, Ban, ArrowRight, Activity,
    MoreVertical, CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import PageLoading from '@/components/PageLoading';
import { User } from '@/types';

const AdminUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'vendor' | 'admin' | 'hr'>('all');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (u.phone || '').includes(searchQuery);
        const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'unblock' : 'block'} this user?`)) return;
        try {
            await updateDoc(doc(db, "users", userId), {
                isBlocked: !currentStatus
            });
            toast.success(currentStatus ? "Access restored" : "Access restricted");
        } catch (e) {
            toast.error("Operation failed");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm("CRITICAL: Permanently delete this account?")) return;
        try {
            await deleteDoc(doc(db, "users", userId));
            toast.success("Identity purged");
        } catch (e) {
            toast.error("Purge failed");
        }
    };

    if (loading) return <PageLoading />;

    return (
        <div className="space-y-6 md:space-y-10 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div className="space-y-1 text-center md:text-left">
                    <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">User Identities</h2>
                    <p className="text-slate-500 font-medium text-[10px] md:text-sm uppercase tracking-widest">Managing authenticated nodes</p>
                </div>
                <button className="gradient-primary text-white h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 w-full md:w-auto">
                    <UserPlus className="w-4 h-4" /> Provision Identity
                </button>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="relative w-full lg:w-96 group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search identities..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-14 pr-6 text-xs font-black focus:ring-8 focus:ring-indigo-600/5 transition-all outline-none"
                        />
                    </div>
                    <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
                        <div className="bg-slate-50 p-1.5 rounded-2xl flex items-center gap-1 w-fit">
                            {['all', 'customer', 'vendor', 'admin', 'hr'].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRoleFilter(r as any)}
                                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${roleFilter === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mobile View: Cards */}
                <div className="lg:hidden divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                        <div key={u.id} className="p-6 space-y-4 bg-white hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
                                        <UserCircle className="w-7 h-7 text-slate-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">{u.name || 'Anonymous'}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{u.email}</p>
                                    </div>
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                    u.role === 'admin' ? 'bg-indigo-600 text-white' :
                                    u.role === 'vendor' ? 'bg-emerald-500 text-white' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {u.role}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <div className="flex items-center gap-3">
                                    {u.isBlocked ? (
                                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                                            <ShieldAlert className="w-3 h-3" /> Restricted
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                            <Shield className="w-3 h-3" /> Authorized
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleToggleBlock(u.id, !!u.isBlocked)}
                                        className={`p-3 rounded-xl border transition-all ${
                                            u.isBlocked ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}
                                    >
                                        {u.isBlocked ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteUser(u.id)}
                                        className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Node Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Classification</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Access Key</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Admin Console</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0">
                                                <UserCircle className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{u.name || 'ANON NODE'}</p>
                                                <p className="text-[10px] font-bold text-slate-400 truncate">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                                            u.role === 'admin' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100' :
                                            u.role === 'vendor' ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-100' :
                                            'bg-slate-100 border-slate-200 text-slate-600'
                                        }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                                                <Mail className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">{u.phone || 'NO TEL'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {u.isBlocked ? (
                                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
                                                <ShieldAlert className="w-3 h-3" /> RESTRICTED
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                                <Shield className="w-3 h-3" /> AUTHORIZED
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleToggleBlock(u.id, !!u.isBlocked)} className={`p-2.5 rounded-xl border transition-all ${u.isBlocked ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                {u.isBlocked ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => handleDeleteUser(u.id)} className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
