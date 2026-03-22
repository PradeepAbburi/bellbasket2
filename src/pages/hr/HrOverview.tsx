import React, { useState, useEffect } from 'react';
import { 
    Users, Briefcase, CreditCard, Activity, 
    TrendingUp, UserPlus, Clock, ArrowUpRight,
    Search, Filter, Plus, Calendar, Landmark, User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Staff } from '@/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ label, value, icon: Icon, color, trend }: any) => (
    <motion.div 
        whileHover={{ y: -5 }}
        className="glass-strong p-8 rounded-[2.5rem] border border-white/40 shadow-xl relative overflow-hidden group"
    >
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:scale-110`} />
        <div className="flex items-start justify-between relative z-10">
            <div className="space-y-4">
                <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${color}-500`} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                    <h3 className="text-3xl font-black text-foreground mt-1">{value}</h3>
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full w-fit">
                        <ArrowUpRight className="w-3 h-3" /> {trend}
                    </div>
                )}
            </div>
        </div>
    </motion.div>
);

const HrOverview = () => {
    const [stats, setStats] = useState({
        totalStaff: 0,
        activeLogins: 0,
        pendingPayments: 0,
        totalPayout: 0
    });
    const [recentStaff, setRecentStaff] = useState<Staff[]>([]);

    useEffect(() => {
        const unsubStaff = onSnapshot(collection(db, "referrals"), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setStats(prev => ({
                ...prev,
                totalStaff: list.length,
                pendingPayments: list.reduce((acc, curr) => acc + (curr.totalEarnings || 0), 0)
            }));
            
            // Get 5 most recent
            const sorted = [...list].sort((a, b) => {
                const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
                const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
                return dateB - dateA;
            });
            setRecentStaff(sorted.slice(0, 5));
        });

        return () => unsubStaff();
    }, []);

    const chartData = [
        { name: 'Mon', count: 4 },
        { name: 'Tue', count: 7 },
        { name: 'Wed', count: 5 },
        { name: 'Thu', count: 12 },
        { name: 'Fri', count: 9 },
        { name: 'Sat', count: 15 },
        { name: 'Sun', count: 11 },
    ];


    return (
        <div className="space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-foreground tracking-tight">Dashboard Overview</h2>
                    <p className="text-muted-foreground font-medium mt-1">Welcome back! Here's what's happening with your staff today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3 border border-white/40">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-xs font-black uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Staff" value={stats.totalStaff} icon={Users} color="blue" trend="+12% growth" />
                <StatCard label="Active Logins" value={stats.totalStaff} icon={Activity} color="emerald" trend="Live Sync" />
                <StatCard label="Pending Payments" value={`\u20B9${stats.pendingPayments}`} icon={CreditCard} color="amber" trend="3 due soon" />
                <StatCard label="Total Payouts" value="\u20B945,280" icon={Landmark} color="purple" trend="+5.4% vs last mo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Onboarding Chart */}
                <div className="lg:col-span-2 glass-strong p-8 rounded-[3rem] border border-white/40 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-foreground tracking-tight">Staff Recruitment</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">New hires over the last 7 days</p>
                        </div>
                        <select className="bg-white/50 border border-border/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 900, fill: '#6B7280'}} 
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                                        backdropFilter: 'blur(10px)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                        padding: '12px'
                                    }}
                                    itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#8B5CF6" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorCount)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Hires */}
                <div className="glass-strong p-8 rounded-[3rem] border border-white/40 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-foreground tracking-tight">Recent Hires</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Latest staff additions</p>
                        </div>
                        <button className="text-primary hover:underline text-[10px] font-black uppercase tracking-widest">View All</button>
                    </div>
                    
                    <div className="space-y-6">
                        {recentStaff.map((staff, i) => (
                            <motion.div 
                                key={staff.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-4 group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-lg shadow-black/5">
                                    {staff.image ? (
                                        <img src={staff.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-6 h-6 text-primary/40" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-black text-foreground truncate">{staff.agentName}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">{staff.referralId}</span>
                                        <span className="text-[9px] font-bold text-muted-foreground truncate opacity-60">
                                            {staff.createdAt?.toDate?.() ? new Date(staff.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                                        </span>
                                    </div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <section className="glass-strong p-10 rounded-[4rem] border border-white/40 shadow-2xl bg-gradient-to-br from-white/40 to-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="relative z-10 grid md:grid-cols-3 gap-12 items-center">
                    <div className="md:col-span-2 space-y-6">
                        <h2 className="text-4xl font-black text-foreground tracking-tight leading-tight">Empower your workforce<br/><span className="text-gradient">with next-gen tools.</span></h2>
                        <p className="text-lg text-muted-foreground font-medium max-w-xl">
                            Ready to expand your team? Our new onboarding flow is 2x faster and automatically generates secure credentials.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <button className="gradient-primary text-white px-10 py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                                <UserPlus className="w-5 h-5" /> Onboard New Staff
                            </button>
                            <button className="glass bg-white/60 text-foreground px-10 py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-white shadow-xl transition-all border border-white/40">
                                Learn the flow
                            </button>
                        </div>
                    </div>
                    <div className="hidden md:flex justify-center items-center">
                        <div className="w-64 h-64 rounded-full bg-primary/10 flex items-center justify-center relative">
                            <div className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-full animate-[spin_20s_linear_infinite]" />
                            <TrendingUp className="w-32 h-32 text-primary opacity-20" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HrOverview;
