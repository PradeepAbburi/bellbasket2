import React, { useState, useEffect } from 'react';
import { 
    Users, Store, ShoppingBag, TrendingUp, 
    ArrowUpRight, ArrowDownRight, Activity,
    Calendar, Download, Filter, Sparkles,
    ShieldCheck, AlertCircle, CreditCard, StickyNote
} from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '@/context/AppContext';
import PageLoading from '@/components/PageLoading';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ label, value, icon: Icon, color, trend, trendType }: any) => (
    <motion.div 
        whileHover={{ y: -5 }}
        className="bg-[#0f172a] p-5 md:p-6 rounded-[2rem] border border-slate-800 shadow-lg hover:shadow-xl hover:shadow-indigo-500/5 transition-all group text-left"
    >
        <div className="flex items-start justify-between">
            <div className="space-y-3 md:space-y-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-${color}-500/10 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 text-${color}-400`} />
                </div>
                <div>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
                    <h3 className="text-2xl md:text-3xl font-black text-white mt-1">{value}</h3>
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-[9px] md:text-[10px] font-bold ${trendType === 'up' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'} px-2.5 py-1 rounded-full w-fit`}>
                        {trendType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trend}
                    </div>
                )}
            </div>
        </div>
    </motion.div>
);

const AdminOverview = () => {
    const { user } = useApp();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalVendors: 0,
        totalOrders: 0,
        totalRevenue: 0,
        activeSync: true
    });
    const [loading, setLoading] = useState(true);
    const [recentNotes, setRecentNotes] = useState<any[]>([]);

    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
            const users = snap.docs.map(doc => doc.data());
            setStats(prev => ({
                ...prev,
                totalUsers: users.filter(u => u.role === 'customer').length,
                totalVendors: users.filter(u => u.role === 'vendor').length
            }));
        });

        const unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
            const orders = snap.docs.map(doc => doc.data());
            setStats(prev => ({
                ...prev,
                totalOrders: orders.length,
                totalRevenue: orders.reduce((acc, curr) => acc + (curr.total || 0), 0)
            }));
            setLoading(false);
        });

        let unsubNotes = () => {};
        if (user?.id) {
            unsubNotes = onSnapshot(
                query(
                    collection(db, "notes"),
                    where("vendorId", "==", user.id)
                ),
                (snap) => {
                    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    list.sort((a: any, b: any) => {
                        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return dateB - dateA;
                    });
                    setRecentNotes(list.slice(0, 3));
                },
                (err) => console.error("Recent notes sync error:", err)
            );
        }

        return () => {
            unsubUsers();
            unsubOrders();
            unsubNotes();
        };
    }, [user?.id]);

    const chartData = [
        { name: 'Mon', revenue: 4500 },
        { name: 'Tue', revenue: 5200 },
        { name: 'Wed', revenue: 4800 },
        { name: 'Thu', revenue: 6100 },
        { name: 'Fri', revenue: 5900 },
        { name: 'Sat', revenue: 7500 },
        { name: 'Sun', revenue: 6800 },
    ];

    if (loading) return <PageLoading />;

    return (
        <div className="space-y-6 md:space-y-10 pb-20 text-left">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 text-center md:text-left">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse hidden md:block" />
                        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">System Node</h2>
                    </div>
                    <p className="text-slate-400 font-medium text-[10px] md:text-sm uppercase tracking-widest text-center md:text-left">Real-time Command Center</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button className="flex-1 md:flex-none gradient-primary text-white h-12 px-6 md:px-8 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" /> Actions
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard label="Revenue" value={`\u20B9${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="emerald" trend="+12%" trendType="up" />
                <StatCard label="Orders" value={stats.totalOrders} icon={ShoppingBag} color="indigo" trend="+8%" trendType="up" />
                <StatCard label="Vendors" value={stats.totalVendors} icon={Store} color="amber" trend="-2%" trendType="down" />
                <StatCard label="Users" value={stats.totalUsers} icon={Users} color="rose" trend="+15%" trendType="up" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                <div className="xl:col-span-2 bg-[#0f172a] p-6 md:p-8 rounded-[2.5rem] border border-slate-800 shadow-lg overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Revenue Matrix</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Daily Traffic Analysis</p>
                        </div>
                        <div className="flex bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit">
                            {['7D', '30D', 'ALL'].map(t => (
                                <button key={t} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${t === '7D' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[300px] md:h-[350px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#0f172a', 
                                        borderRadius: '16px',
                                        border: '1px solid #1e293b',
                                        color: '#fff',
                                        padding: '16px',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)'
                                    }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                    <div className="bg-[#0f172a] border border-slate-800 p-6 md:p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-lg">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-8 -mt-8" />
                        <h3 className="text-lg font-black tracking-tight uppercase tracking-widest mb-6">Operations Hub</h3>
                        
                        <div className="space-y-4">
                            {[
                                { label: 'Node Health', value: 'OPTIMAL', color: 'emerald' },
                                { label: 'Sync Rate', value: '100%', color: 'indigo' },
                                { label: 'Latency Delta', value: '24ms', color: 'amber' }
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/20 border border-slate-800">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200">{s.label}</span>
                                    <span className={`text-xs font-black text-${s.color}-400`}>{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#0f172a] p-6 md:p-8 rounded-[2.5rem] border border-slate-800 shadow-lg text-left">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                <StickyNote className="w-5 h-5 text-indigo-500 animate-pulse" />
                                Admin Notes
                            </h3>
                            <button 
                                onClick={() => navigate('/admin/notes')}
                                className="text-xs font-black text-indigo-400 hover:underline flex items-center gap-1 uppercase tracking-wider"
                            >
                                View All <ArrowUpRight className="w-4.5 h-4.5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {recentNotes.length === 0 ? (
                                <div className="text-center py-6 border-2 border-dashed border-slate-850 rounded-2xl">
                                    <p className="text-xs font-bold text-slate-500 italic">No saved notes.</p>
                                </div>
                            ) : (
                                recentNotes.map((note) => (
                                    <div key={note.id} className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-indigo-500/30 transition-colors">
                                        <h4 className="font-bold text-white text-sm truncate">{note.itemName}</h4>
                                        {note.description && (
                                            <p className="text-slate-400 text-xs mt-1 whitespace-pre-wrap break-words">{note.description}</p>
                                        )}
                                        <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase">
                                            {new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-[#0f172a] p-6 md:p-8 rounded-[2.5rem] border border-slate-800 shadow-lg text-left">
                        <h3 className="text-xl font-black text-white tracking-tight mb-8">Performance</h3>
                        <div className="space-y-6">
                            {[
                                { name: 'Admin Node 1', score: 92 },
                                { name: 'Admin Node 2', score: 86 },
                                { name: 'Security Mod', score: 98 }
                            ].map((p, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">{p.name}</span>
                                        <span className="text-white">{p.score}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${p.score}%` }} className="h-full bg-indigo-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
