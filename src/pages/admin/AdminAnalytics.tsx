import React, { useState, useEffect } from 'react';
import { 
    BarChart3, TrendingUp, Users, ShoppingBag, 
    Calendar, ArrowUpRight, ArrowDownRight,
    Target, Zap, Globe, PieChart, Activity,
    ChevronDown, Download, Filter, Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart as RePieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const DataMetric = ({ label, value, trend, icon: Icon, color }: any) => (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-600`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className={`flex items-center gap-1 text-xs font-black ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend > 0 ? '+' : ''}{trend}%
            </div>
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{value}</h3>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full bg-${color}-500`} style={{ width: '70%' }} />
        </div>
    </div>
);

const AdminAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState<any[]>([]);

    useEffect(() => {
        // Mock data for sophisticated visualization
        const mockData = [
            { week: 'W1', users: 120, revenue: 4500, growth: 12 },
            { week: 'W2', users: 150, revenue: 5200, growth: 15 },
            { week: 'W3', users: 180, revenue: 4800, growth: 10 },
            { week: 'W4', users: 220, revenue: 6100, growth: 18 },
            { week: 'W5', users: 280, revenue: 5900, growth: 14 },
            { week: 'W6', users: 310, revenue: 7500, growth: 22 },
        ];
        setPerformanceData(mockData);
        setLoading(false);
    }, []);

    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E'];

    return (
        <div className="space-y-10 pb-20">
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Performance Intelligence</h2>
                    </div>
                    <p className="text-slate-500 font-medium text-sm">Deep learning analysis of network-wide operational nodes.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="w-4 h-4" /> Global Intelligence Report
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <DataMetric label="Conversion Velocity" value="12.4%" trend={8.2} icon={Zap} color="indigo" />
                <DataMetric label="Retention Index" value="84/100" trend={2.1} icon={Target} color="emerald" />
                <DataMetric label="Network Reach" value="4.2k" trend={15.4} icon={Globe} color="amber" />
                <DataMetric label="Engagement Delta" value="1.8x" trend={-4.5} icon={Activity} color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Growth Velocity */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Growth Projection</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Multi-vector analysis of expansion nodes</p>
                        </div>
                    </div>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={performanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff', padding: '20px' }}
                                    itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                                />
                                <Area type="monotone" dataKey="users" stroke="#4F46E5" strokeWidth={5} fill="#4F46E5" fillOpacity={0.05} />
                                <Area type="monotone" dataKey="growth" stroke="#10B981" strokeWidth={5} fill="#10B981" fillOpacity={0.05} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Regional Distribution (Mocked) */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl flex flex-col">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Node Distribution</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Operational density mapping</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Live Telemetry</span>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row items-center gap-10">
                        <div className="h-[300px] w-full md:w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={[
                                            { name: 'Node A', value: 400 },
                                            { name: 'Node B', value: 300 },
                                            { name: 'Node C', value: 300 },
                                            { name: 'Node D', value: 200 },
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {COLORS.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry} stroke="none" />
                                        ))}
                                    </Pie>
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 grid grid-cols-1 gap-4">
                            {['Northern Hub', 'Southern Grid', 'Eastern Sector', 'Western Node'].map((label, i) => (
                                <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 font-black">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                        <span className="text-xs uppercase tracking-widest text-slate-600">{label}</span>
                                    </div>
                                    <span className="text-sm text-slate-900">{25 + i * 5}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
