import React, { useState, useEffect } from 'react';
import { 
    Ticket, Plus, Trash2, Copy, CheckCircle2,
    Calendar, Crown, Timer, Filter, Search,
    ArrowUpRight, Sparkles, Hash, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Coupon, PlanTier } from '@/types';

const AdminCoupons = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCoupon, setNewCoupon] = useState<{
        plan: PlanTier;
        months: number;
        usageType: 'single' | 'multiple';
    }>({
        plan: 'growth',
        months: 1,
        usageType: 'single'
    });
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "coupons"), (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
            setCoupons(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleGenerateCoupon = async () => {
        setIsGenerating(true);
        try {
            const code = `BB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            await addDoc(collection(db, "coupons"), {
                code,
                plan: newCoupon.plan,
                months: newCoupon.months,
                usageType: newCoupon.usageType,
                redemptionCount: 0,
                usedByList: [],
                isUsed: false,
                createdAt: new Date().toISOString()
            });
            toast.success(`Coupon ${code} generated successfully!`);
        } catch (e) {
            toast.error("Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteCoupon = async (id: string) => {
        if (!window.confirm("Invalidate this coupon code?")) return;
        try {
            await deleteDoc(doc(db, "coupons", id));
            toast.success("Coupon neutralized");
        } catch (e) {
            toast.error("Neutralization failed");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Access code copied to clipboard", {
            icon: <Copy className="w-4 h-4" />
        });
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Access Tokens</h2>
                    <p className="text-slate-500 font-medium text-sm">Managing subscription injection codes and plan entitlements.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Generator Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Token Generator</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">Plan Entitlement</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {(['basic', 'growth', 'pro'] as PlanTier[]).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setNewCoupon({ ...newCoupon, plan: p })}
                                            className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${newCoupon.plan === p ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-transparent text-slate-900 hover:border-slate-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Crown className={`w-4 h-4 ${newCoupon.plan === p ? 'text-white' : 'text-slate-400'}`} />
                                                <span className="text-sm font-black uppercase tracking-widest">{p} tier</span>
                                            </div>
                                            {newCoupon.plan === p && <CheckCircle2 className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">Usage Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['single', 'multiple'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setNewCoupon({ ...newCoupon, usageType: type })}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${newCoupon.usageType === type ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-900 hover:border-slate-200'}`}
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest">{type}</span>
                                            {newCoupon.usageType === type && <CheckCircle2 className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">Duration (Months)</label>
                                
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {[1, 3, 6, 12].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setNewCoupon({ ...newCoupon, months: m })}
                                            className={`py-2 rounded-xl text-[10px] font-black transition-all ${newCoupon.months === m ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            {m}M
                                        </button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="120"
                                        value={newCoupon.months}
                                        onChange={(e) => setNewCoupon({ ...newCoupon, months: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                                        placeholder="Enter months..."
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest pointer-events-none">
                                        Months
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerateCoupon}
                                disabled={isGenerating}
                                className="w-full gradient-primary text-white h-16 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                            >
                                {isGenerating ? <Timer className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                Mint Access Token
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tokens List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-indigo-600" /> Active Registry
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{coupons.length} Generated</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Token Code</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Usage</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">State</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr className="animate-pulse">
                                            <td colSpan={4} className="px-8 py-20 text-center"><div className="h-20 bg-slate-50 rounded-[2rem]" /></td>
                                        </tr>
                                    ) : coupons.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-32 text-center">
                                                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                                                    <Ticket className="w-8 h-8 text-slate-200" />
                                                </div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">No tokens found in system memory</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        coupons.map((c) => (
                                            <tr key={c.id} className="group hover:bg-slate-50/10 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                            <Hash className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-sm font-black text-slate-900 tracking-widest">{c.code}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Crown className="w-3 h-3 text-amber-500" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{c.plan}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-3 h-3 text-slate-300" />
                                                            <span className="text-[10px] font-bold text-slate-400">{c.months} Months Access</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="w-3 h-3 text-indigo-400" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{c.usageType || 'single'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                                            <span className="text-[10px] font-bold text-slate-400">{c.redemptionCount || 0} Redemptions</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {c.isUsed && c.usageType !== 'multiple' ? (
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-200">
                                                                Already Redeemed
                                                            </span>
                                                            <p className="text-[8px] font-bold text-slate-300 ml-1 truncate max-w-[120px]">UID: {c.usedBy}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                                            Available
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => copyToClipboard(c.code)}
                                                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                                            title="Copy Code"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteCoupon(c.id)}
                                                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all shadow-sm"
                                                            title="Invalidate Token"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCoupons;
