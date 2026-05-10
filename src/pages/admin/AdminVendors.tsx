import React, { useState, useEffect } from 'react';
import { 
    Store, Search, Filter, Shield, ShieldAlert,
    MoreVertical, ExternalLink, Mail, Phone, MapPin,
    CheckCircle2, XCircle, Clock, TrendingUp, RefreshCcw,
    ChevronDown, Eye, AlertTriangle, Building, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import PageLoading from '@/components/PageLoading';
import { Store as StoreType } from '@/types';

const AdminVendors = () => {
    const [vendors, setVendors] = useState<StoreType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked'>('all');
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "stores"), (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreType));
            setVendors(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredVendors = vendors.filter(v => {
        const matchesSearch = (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (v.address || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' ? true : 
                             filterStatus === 'active' ? !v.isBlocked : v.isBlocked;
        return matchesSearch && matchesStatus;
    });

    const handleToggleBlock = async (vendorId: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "stores", vendorId), {
                isBlocked: !currentStatus
            });
            toast.success(currentStatus ? "Vendor operational" : "Vendor restricted");
        } catch (e) {
            toast.error("Operation failed");
        }
    };

    const handleSyncSlugs = async () => {
        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            const storesSnap = await getDocs(collection(db, "stores"));
            let count = 0;
            const generateSlug = (name: string, area: string) => `${name}-${area}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            storesSnap.docs.forEach(storeDoc => {
                const data = storeDoc.data() as StoreType;
                if (!data.slug) {
                    const area = data.address?.split(',')[0] || 'area';
                    batch.update(doc(db, "stores", storeDoc.id), { slug: generateSlug(data.name, area) });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                toast.success(`SEO optimized for ${count} nodes`);
            } else {
                toast.info("Hierarchy already optimized");
            }
        } catch (e) {
            toast.error("Handshake failed");
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) return <PageLoading />;

    return (
        <div className="space-y-6 md:space-y-10 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div className="space-y-1 text-center md:text-left">
                    <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Vendor Ecosystem</h2>
                    <p className="text-slate-500 font-medium text-[10px] md:text-sm uppercase tracking-widest text-center md:text-left">Managing physical nodes</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleSyncSlugs}
                        disabled={isSyncing}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50 w-full sm:w-auto"
                    >
                        <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Nodes
                    </button>
                    <button className="gradient-primary text-white h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
                        <Building className="w-4 h-4" /> Provision Store
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="relative w-full lg:w-96 group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search network nodes..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-14 pr-6 text-xs font-black focus:ring-8 focus:ring-indigo-600/5 transition-all outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar -mx-2 px-2">
                        <div className="bg-slate-50 p-1.5 rounded-2xl flex items-center gap-1 w-fit">
                            {['all', 'active', 'blocked'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s as any)}
                                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mobile View: Cards */}
                <div className="lg:hidden divide-y divide-slate-100">
                    {filteredVendors.map((vendor) => (
                        <div key={vendor.id} className="p-6 space-y-5 bg-white hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                                        {vendor.image ? <img src={vendor.image} alt="" className="w-full h-full object-cover" /> : <Building className="w-6 h-6 text-indigo-300" />}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{vendor.name}</h4>
                                        <p 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const query = (vendor.lat && vendor.lng) ? `${vendor.lat},${vendor.lng}` : encodeURIComponent(vendor.address || 'India');
                                                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                                            }}
                                            className="text-[10px] font-bold text-slate-400 truncate max-w-[150px] cursor-pointer hover:text-indigo-600 hover:underline transition-all"
                                         >
                                             {vendor.address || 'Global Access'}
                                         </p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{vendor.category}</span>
                                        </div>
                                    </div>
                                </div>
                                {vendor.isBlocked ? (
                                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                )}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
                                        <Package className="w-3.5 h-3.5" /> {vendor.products?.length || 0} items
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => window.open(`/store/${vendor.id}`, '_blank')} className="p-3 rounded-xl border border-slate-200 text-slate-400">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleToggleBlock(vendor.id, !!vendor.isBlocked)} className={`p-3 rounded-xl border transition-all ${vendor.isBlocked ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                        {vendor.isBlocked ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
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
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Node Hub</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Classification</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredVendors.map((vendor) => (
                                <tr key={vendor.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                                {vendor.image ? <img src={vendor.image} alt="" className="w-full h-full object-cover" /> : <Building className="w-6 h-6 text-indigo-300" />}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{vendor.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <MapPin className="w-3 h-3 text-slate-300" />
                                                    <p 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const query = (vendor.lat && vendor.lng) ? `${vendor.lat},${vendor.lng}` : encodeURIComponent(vendor.address || 'India');
                                                            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                                                        }}
                                                        className="text-[10px] font-bold text-slate-400 truncate max-w-[200px] cursor-pointer hover:text-indigo-600 hover:underline transition-all"
                                                     >
                                                         {vendor.address || 'Global Node'}
                                                     </p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md w-fit border border-slate-200">{vendor.category}</span>
                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${vendor.storeType === 'service' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                                {vendor.storeType || 'Retail'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-slate-300" />
                                            <span className="text-xs font-black text-slate-700">{vendor.products?.length || 0} Units</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {vendor.isBlocked ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest border border-rose-100">
                                                <ShieldAlert className="w-3.5 h-3.5" /> Restricted
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                <Shield className="w-3.5 h-3.5" /> Operational
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => window.open(`/store/${vendor.id}`, '_blank')} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                                                <Eye className="w-4.5 h-4.5" />
                                            </button>
                                            <button onClick={() => handleToggleBlock(vendor.id, !!vendor.isBlocked)} className={`p-2.5 rounded-xl border transition-all ${vendor.isBlocked ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'}`}>
                                                {vendor.isBlocked ? <CheckCircle2 className="w-4.5 h-4.5" /> : <XCircle className="w-4.5 h-4.5" />}
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

export default AdminVendors;
