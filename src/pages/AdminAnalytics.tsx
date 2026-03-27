import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import {
    Users,
    Ban,
    CheckCircle2,
    TrendingUp,
    UserPlus,
    ShieldAlert,
    MousePointer2,
    ArrowLeft,
    Search,
    Filter,
    MoreVertical,
    BarChart3,
    Loader2,
    Store,
    ShoppingBag,
    Activity,
    PieChart as PieChartIcon,
    Crown,
    Zap,
    MapPin,
    CreditCard,
    Globe,
    Coins,
    DollarSign,
    Ticket,
    Eye,
    Calendar
} from "lucide-react";
import { PlanTier, Coupon } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import { toast } from "sonner";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const AdminAnalytics = () => {
    const { user, loading } = useApp();
    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [storeVisits, setStoreVisits] = useState<any[]>([]);
    const [visitTimeRange, setVisitTimeRange] = useState<'day' | 'month' | 'year'>('day');
    const [searchTerm, setSearchTerm] = useState("");
    const [geoSearchTerm, setGeoSearchTerm] = useState("");
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [lastSync, setLastSync] = useState<Date>(new Date());

    const fetchData = async (showToast = true) => {
        if (!user || user.role !== 'admin') return;
        setIsLoadingData(true);
        try {
            const [usersSnap, ordersSnap, storesSnap, couponsSnap, visitsSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "orders")),
                getDocs(collection(db, "stores")),
                getDocs(collection(db, "coupons")),
                getDocs(collection(db, "store_visits"))
            ]);

            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setStores(storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setCoupons(couponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon)));
            setStoreVisits(visitsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLastSync(new Date());
            if (showToast) toast.success("Analytics data synchronized");
        } catch (e) {
            console.error("Manual sync error:", e);
            if (showToast) toast.error("Failed to sync data manually");
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        if (!user || user.role !== 'admin') return;
        fetchData(false); // Initial load without toast
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
        setIsProcessing(userId);
        try {
            await updateDoc(doc(db, "users", userId), {
                isBlocked: !currentStatus
            });
            toast.success(currentStatus ? "User unblocked successfully" : "User blocked successfully", {
                icon: currentStatus ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Ban className="w-4 h-4 text-destructive" />
            });
        } catch (e) {
            toast.error("Failed to update user status");
        } finally {
            setIsProcessing(null);
        }
    };

    // Analytics Calculations
    const totalUsers = users.length;
    const liveStoresCount = stores.length;
    const vendorsCount = users.filter(u => u.role === 'vendor').length;
    const customersCount = users.filter(u => (u.role || 'customer') === 'customer' && u.role !== 'admin').length;
    const blockedCount = users.filter(u => u.isBlocked).length;
    const verifiedCount = users.filter(u => u.isVerified).length;
    const completedOrdersCount = orders.filter(o => o.status === 'completed').length;

    const roleData = [
        { name: 'Vendors', value: vendorsCount, color: '#6366f1' },
        { name: 'Customers', value: customersCount, color: '#3b82f6' }
    ];

    // Geographic Analysis Logic
    const parseGeo = (address: string) => {
        if (!address) return { area: "Unknown", state: "N/A", country: "N/A", pincode: "" };
        const pinRegex = /\b\d{5,7}\b/;
        const pinMatch = address.match(pinRegex);
        const pincode = pinMatch ? pinMatch[0] : "";

        const parts = address.replace(pincode, "").split(',').map(p => p.trim()).filter(p => !!p);
        const country = parts.length > 0 ? parts[parts.length - 1] : "N/A";
        const state = parts.length > 1 ? parts[parts.length - 2] : "N/A";
        const area = parts.length > 2 ? parts.slice(0, parts.length - 2).join(", ") : (parts[0] || "Unknown");

        return { area, state, country, pincode };
    };

    const getGeoAnalytics = () => {
        const areaMap: Record<string, { vendors: number; orders: number; customers: number; state: string; country: string; pincode: string }> = {};

        stores.forEach(s => {
            const { area, state, country, pincode } = parseGeo(s.address);
            const key = `${area}-${pincode}`;
            if (!areaMap[key]) areaMap[key] = { vendors: 0, orders: 0, customers: 0, state, country, pincode };
            areaMap[key].vendors += 1;
        });

        orders.forEach(o => {
            const store = stores.find(s => s.id === o.storeId);
            const { area, state, country, pincode } = parseGeo(store?.address || "");
            const key = `${area}-${pincode}`;
            if (!areaMap[key]) areaMap[key] = { vendors: 0, orders: 0, customers: 0, state, country, pincode };
            areaMap[key].orders += 1;
        });

        const areaCustomerMap: Record<string, Set<string>> = {};

        orders.forEach(o => {
            const store = stores.find(s => s.id === o.storeId);
            const { area, pincode } = parseGeo(store?.address || "");
            const key = `${area}-${pincode}`;

            if (area !== "Unknown" && areaMap[key]) {
                if (!areaCustomerMap[key]) areaCustomerMap[key] = new Set();
                if (o.userId) areaCustomerMap[key].add(o.userId);
            }
        });

        // Apply unique customer counts
        Object.keys(areaCustomerMap).forEach(key => {
            if (areaMap[key]) {
                areaMap[key].customers = areaCustomerMap[key].size;
            }
        });

        return Object.entries(areaMap)
            .map(([nameKey, stats]) => ({ name: nameKey.split('-')[0], ...stats }))
            .filter(a =>
                a.name.toLowerCase().includes(geoSearchTerm.toLowerCase()) ||
                a.state.toLowerCase().includes(geoSearchTerm.toLowerCase()) ||
                a.country.toLowerCase().includes(geoSearchTerm.toLowerCase()) ||
                a.pincode.includes(geoSearchTerm)
            )
            .sort((a, b) => b.orders - a.orders || b.vendors - a.vendors);
    };

    const geoStats = getGeoAnalytics();

    // Subscription & Revenue Logic
    const PLAN_PRICES = { none: 0, basic: 99, growth: 199, pro: 399 };
    const getSubscriptionStats = () => {
        const stats = {
            pro: { count: 0, revenue: 0 },
            growth: { count: 0, revenue: 0 },
            basic: { count: 0, revenue: 0 },
            no_plan: { count: 0, revenue: 0 }
        };

        users.forEach(u => {
            if (u.plan === 'pro') {
                stats.pro.count++;
                stats.pro.revenue += PLAN_PRICES.pro;
            } else if (u.plan === 'growth') {
                stats.growth.count++;
                stats.growth.revenue += PLAN_PRICES.growth;
            } else if (u.plan === 'basic') {
                stats.basic.count++;
                stats.basic.revenue += PLAN_PRICES.basic;
            } else {
                stats.no_plan.count++;
            }
        });

        return [
            { name: 'Pro Merchant', count: stats.pro.count, revenue: stats.pro.revenue, color: '#f59e0b', icon: Crown },
            { name: 'Growth Merchant', count: stats.growth.count, revenue: stats.growth.revenue, color: '#3b82f6', icon: Zap },
            { name: 'Basic Merchant', count: stats.basic.count, revenue: stats.basic.revenue, color: '#10b981', icon: Store },
            { name: 'None/Guest', count: stats.no_plan.count, revenue: 0, color: '#94a3b8', icon: Users }
        ];
    };

    const subStats = getSubscriptionStats();
    const platformFeeRevenue = Math.floor(orders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + (curr.total || 0), 0) * 0.05);
    const totalRevenue = subStats.reduce((acc, curr) => acc + curr.revenue, 0) + platformFeeRevenue;

    // Derived trend data (Last 7 Days signups)
    const getTrendData = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return {
                date: d.toDateString(),
                name: days[d.getDay()],
                signups: users.filter(u => {
                    const created = new Date(u.createdAt);
                    return created.toDateString() === d.toDateString();
                }).length
            };
        }).reverse();
        return last7Days;
    };

    const trendData = getTrendData();

    // Store Visits Chart Data
    const getVisitChartData = () => {
        const now = new Date();

        if (visitTimeRange === 'day') {
            const hours = Array.from({ length: 24 }, (_, h) => {
                const count = storeVisits.filter(v => {
                    const ts = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
                    return ts.toDateString() === now.toDateString() && ts.getHours() === h;
                }).length;
                const displayHour = h % 12 || 12;
                const amPm = h < 12 ? 'AM' : 'PM';
                return { name: `${displayHour} ${amPm}`, visits: count };
            });
            return hours.filter((_, i) => i % 2 === 0); // every 2 hours for readability
        } else if (visitTimeRange === 'month') {
            return Array.from({ length: 30 }, (_, i) => {
                const d = new Date(now);
                d.setDate(now.getDate() - (29 - i));
                const count = storeVisits.filter(v => {
                    const ts = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
                    return ts.toDateString() === d.toDateString();
                }).length;
                return { name: `${d.getDate()}/${d.getMonth() + 1}`, visits: count };
            });
        } else {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return Array.from({ length: 12 }, (_, i) => {
                const count = storeVisits.filter(v => {
                    const ts = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
                    return ts.getMonth() === i && ts.getFullYear() === now.getFullYear();
                }).length;
                return { name: months[i], visits: count };
            });
        }
    };

    const visitChartData = getVisitChartData();

    // Top visited stores
    const topVisitedStores: [string, { name: string; count: number }][] = Object.entries(
        storeVisits.reduce((acc, v) => {
            if (!v.storeId) return acc;
            if (!acc[v.storeId]) acc[v.storeId] = { name: v.storeName || v.storeId, count: 0 };
            acc[v.storeId].count++;
            return acc;
        }, {} as Record<string, { name: string; count: number }>)
    ).sort((a, b) => (b[1] as { count: number }).count - (a[1] as { count: number }).count).slice(0, 5) as [string, { name: string; count: number }][];

    const totalVisits = storeVisits.length;
    const todayVisits = storeVisits.filter(v => {
        const ts = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
        return ts.toDateString() === new Date().toDateString();
    }).length;

    const filteredUsers = users.filter(u =>
        (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (loading || (isLoadingData && users.length === 0)) {
        return (
            <div className="min-h-screen gradient-warm flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Hydrating Analytics...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">

                {/* Breadcrumb */}
                <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Command Center
                </button>

                {/* Title Section */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-foreground flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            User Analytics & Moderation
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2">
                            Deep insights into user growth and system-wide moderation tools.
                            <span className="inline-block w-1 h-1 rounded-full bg-border" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/50">Last synced: {lastSync.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                        </p>
                    </div>

                    <button
                        onClick={() => fetchData(true)}
                        disabled={isLoadingData}
                        className="group relative flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-border/50 hover:border-primary/50 text-foreground transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isLoadingData ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                            <Activity className="w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-500" />
                        )}
                        <span className="text-sm font-bold">Force Sync</span>
                        {isLoadingData && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />
                        )}
                    </button>
                </div>

                {/* Stats Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-10">
                    {[
                        { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 'Global footprint' },
                        { label: 'Live Stores', value: liveStoresCount, icon: Store, color: 'text-indigo-500', bg: 'bg-indigo-500/10', trend: 'Active merchants' },
                        { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-rose-500', bg: 'bg-rose-500/10', trend: 'Lifetime volume' },
                        { label: 'Redeemed Coupons', value: coupons.filter(c => c.isUsed).length, icon: Ticket, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: 'Activation rate' },
                        { label: 'Total Visits', value: totalVisits, icon: Eye, color: 'text-purple-500', bg: 'bg-purple-500/10', trend: 'All-time store views' },
                        { label: 'Today\'s Visits', value: todayVisits, icon: Calendar, color: 'text-green-500', bg: 'bg-green-500/10', trend: 'Live today' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass rounded-[32px] p-6 border border-white/40 bg-white/40 group hover:shadow-2xl hover:shadow-primary/5 transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                                    <stat.icon className="w-7 h-7" />
                                </div>
                                <div className="p-2 rounded-xl bg-secondary/30">
                                    <Activity className="w-4 h-4 text-muted-foreground/40" />
                                </div>
                            </div>
                            <p className="text-3xl font-black text-foreground tracking-tight">{stat.value}</p>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
                            <p className="text-[10px] font-bold text-green-500 mt-4 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {stat.trend}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Analytics Visualization */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">

                    {/* User Growth Chart */}
                    <div className="lg:col-span-2 glass rounded-[40px] p-8 border border-white/40 bg-white/40">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    Growth Trajectory
                                </h3>
                                <p className="text-xs font-bold text-muted-foreground">New accounts registered daily</p>
                            </div>
                            <select className="bg-secondary/50 border-0 rounded-xl px-4 py-2 text-xs font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-primary/20">
                                <option>Last 7 Days</option>
                                <option>Last 30 Days</option>
                            </select>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)',
                                            fontWeight: 700
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="signups"
                                        stroke="#6366f1"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorSignups)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Role Distribution Pie */}
                    <div className="glass rounded-[40px] p-8 border border-white/40 bg-white/40 flex flex-col items-center">
                        <div className="self-start mb-8">
                            <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                                <PieChartIcon className="w-5 h-5 text-primary" />
                                Role Split
                            </h3>
                            <p className="text-xs font-bold text-muted-foreground">Vendor vs Customer ratio</p>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={roleData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {roleData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full mt-6">
                            {roleData.map(role => (
                                <div key={role.name} className="p-4 rounded-3xl bg-secondary/30 flex flex-col items-center text-center">
                                    <p className="text-lg font-black text-foreground">{role.value}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{role.name}</p>
                                    <div className="w-8 h-1 rounded-full mt-2" style={{ backgroundColor: role.color }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Store Visits Analytics */}
                <div className="glass rounded-[40px] p-8 border border-white/40 bg-white/40 mb-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                                <Eye className="w-5 h-5 text-purple-500" />
                                Store Visits
                            </h3>
                            <p className="text-xs font-bold text-muted-foreground">Page visits tracked across all stores</p>
                        </div>
                        <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-xl">
                            {(['day', 'month', 'year'] as const).map(r => (
                                <button
                                    key={r}
                                    onClick={() => setVisitTimeRange(r)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${visitTimeRange === r ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {r === 'day' ? 'Today' : r === 'month' ? 'Last 30 Days' : 'This Year'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Chart */}
                        <div className="lg:col-span-2 h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={visitChartData}>
                                    <defs>
                                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', fontWeight: 700 }} />
                                    <Area type="monotone" dataKey="visits" name="Visits" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top Stores */}
                        <div className="space-y-3">
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Most Visited Stores</p>
                            {topVisitedStores.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No visits recorded yet</p>
                            ) : topVisitedStores.map(([storeId, info], idx) => (
                                <div key={storeId} className="flex items-center justify-between p-3 rounded-2xl bg-white/60 border border-white hover:border-purple-200 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center font-black text-sm">
                                            {idx + 1}
                                        </div>
                                        <p className="text-sm font-bold text-foreground line-clamp-1">{(info as { name: string; count: number }).name}</p>
                                    </div>
                                    <span className="text-xs font-black text-purple-500 bg-purple-50 px-2.5 py-1 rounded-full ml-2 shrink-0">{(info as { name: string; count: number }).count} visits</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Geographic & Subscription Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">

                    {/* Geographic Footprint */}
                    <div className="glass rounded-[40px] p-8 border border-white/40 bg-white/40">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-indigo-500" />
                                    Geographic Footprint
                                </h3>
                                <p className="text-xs font-bold text-muted-foreground">Market penetration by area</p>
                            </div>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search Area..."
                                    value={geoSearchTerm}
                                    onChange={(e) => setGeoSearchTerm(e.target.value)}
                                    className="w-full md:w-48 pl-10 pr-4 py-2 rounded-xl bg-secondary/30 border-0 outline-none focus:ring-2 focus:ring-primary/20 text-[10px] font-bold transition-all"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            <div className="grid gap-3">
                                {geoStats.map((geo, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-4 rounded-2xl bg-white/50 border border-white hover:border-primary/20 transition-all group"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-bold">
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-foreground text-sm flex items-center gap-2">
                                                        {geo.name}
                                                        {geo.pincode && <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-600 text-[9px]">{geo.pincode}</span>}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                                        {geo.state}, {geo.country}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-6">
                                                <div className="text-center">
                                                    <p className="text-xs font-black text-foreground">{geo.vendors}</p>
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase">Vendors</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-black text-primary">{geo.orders}</p>
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase">Orders</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-black text-indigo-500">{geo.customers}</p>
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase">Usage</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                {geoStats.length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground font-bold italic">No geographic data found for "{geoSearchTerm}"</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Subscription Revenue Breakdown */}
                    <div className="glass rounded-[40px] p-8 border border-white/40 bg-white/40">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-amber-500" />
                                    Revenue Streams
                                </h3>
                                <p className="text-xs font-bold text-muted-foreground">Estimated earnings from subscriptions</p>
                            </div>
                            <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-black text-amber-600">₹{totalRevenue.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {subStats.map((sub, idx) => (
                                <motion.div
                                    key={sub.name}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="p-6 rounded-[28px] bg-white/60 border border-white flex items-center justify-between hover:shadow-lg transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: sub.color }}>
                                            <sub.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-black text-foreground">{sub.name}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{sub.count} Active Users</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-foreground">₹{sub.revenue.toLocaleString()}</p>
                                        <p className="text-[9px] font-black text-green-500 uppercase tracking-tighter">Subscription</p>
                                    </div>
                                </motion.div>
                            ))}
                            {/* New: Platform Fee Revenue Row */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="p-6 rounded-[28px] bg-primary/5 border border-primary/10 flex items-center justify-between hover:shadow-lg transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary text-white shadow-lg">
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-foreground">Platform Earnings</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">5% Fee on Orders</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-primary">₹{platformFeeRevenue.toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-primary uppercase tracking-tighter">Usage Revenue</p>
                                </div>
                            </motion.div>
                        </div>

                        {/* Visual Progress/Comparison */}
                        <div className="mt-8 p-6 rounded-[32px] bg-secondary/20 border border-border/10">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Plan Distribution</p>
                                <span className="text-[10px] font-bold text-primary">Live Tracking</span>
                            </div>
                            <div className="h-3 w-full bg-white rounded-full flex overflow-hidden border border-border/10">
                                {subStats.map(sub => (
                                    <div
                                        key={sub.name + 'bar'}
                                        style={{
                                            width: `${(sub.count / totalUsers) * 100}%`,
                                            backgroundColor: sub.color
                                        }}
                                        className="h-full transition-all duration-1000"
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between mt-3">
                                {subStats.map(sub => (
                                    <div key={sub.name + 'leg'} className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{Math.round((sub.count / totalUsers) * 100) || 0}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Management List */}
                <div className="glass rounded-[48px] overflow-hidden border border-white/40 bg-white/40">
                    <div className="p-8 border-b border-border/50 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-foreground">Account Management</h3>
                            <p className="text-sm font-bold text-muted-foreground mt-1">Review activity and perform moderation actions.</p>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search user record..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-secondary/50 border-0 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-all"
                                />
                            </div>
                            <button className="p-4 rounded-2xl bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
                                <Filter className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary/30">
                                    <th className="p-6 text-xs font-black uppercase tracking-widest text-muted-foreground">User</th>
                                    <th className="p-6 text-xs font-black uppercase tracking-widest text-muted-foreground">Role & Plan</th>
                                    <th className="p-6 text-xs font-black uppercase tracking-widest text-muted-foreground">Business Detail</th>
                                    <th className="p-6 text-xs font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                    <th className="p-6 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Moderation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                <AnimatePresence>
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-muted-foreground font-bold italic">
                                                No account records found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((u, i) => (
                                            <motion.tr
                                                key={u.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: i * 0.05 }}
                                                className={`hover:bg-primary/[0.02] transition-colors ${u.isBlocked ? 'bg-destructive/5 grayscale-[0.5]' : ''}`}
                                            >
                                                <td className="p-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${u.isBlocked ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                                                            }`}>
                                                            {u.name?.charAt(0) || u.email?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-foreground flex items-center gap-2">
                                                                {u.name || 'Anonymous User'}
                                                                {u.isVerified && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                                                            </p>
                                                            <p className="text-xs font-bold text-muted-foreground">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={`w-fit px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${u.role === 'vendor' ? 'bg-indigo-50 text-indigo-500 border-indigo-200' : (u.role === 'admin' ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-blue-50 text-blue-500 border-blue-200')
                                                            }`}>
                                                            {u.role || 'customer'}
                                                        </span>
                                                        <span className={`w-fit px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 ${u.plan === 'pro' ? 'bg-amber-100 text-amber-700' :
                                                            u.plan === 'growth' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            {u.plan === 'pro' && <Crown className="w-2.5 h-2.5" />}
                                                            {u.plan === 'growth' && <Zap className="w-2.5 h-2.5" />}
                                                            {u.plan || 'No Plan'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    {u.role === 'vendor' ? (
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-bold text-foreground">
                                                                {stores.find(s => s.vendorId === u.id || s.id === u.id)?.name || 'Store Pending Setup'}
                                                            </p>
                                                            <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                                                <Store className="w-3 h-3" />
                                                                {stores.find(s => s.vendorId === u.id || s.id === u.id)?.id?.slice(-8) || 'N/A'}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-medium text-muted-foreground italic">Individual Account</span>
                                                    )}
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2">
                                                        {u.isBlocked ? (
                                                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20">
                                                                <Ban className="w-3 h-3" />
                                                                Blocked
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-green-500 bg-green-50/50 px-3 py-1.5 rounded-lg border border-green-200">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Active
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <button
                                                            onClick={() => {
                                                                if (u.role !== 'admin' && u.email !== 'contact@bellbasket.com') {
                                                                    handleToggleBlock(u.id, !!u.isBlocked);
                                                                }
                                                            }}
                                                            disabled={isProcessing === u.id || u.role === 'admin' || u.email === 'contact@bellbasket.com'}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${u.isBlocked ? 'bg-destructive' : 'bg-green-500'} ${isProcessing === u.id || u.role === 'admin' ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.isBlocked ? 'translate-x-6' : 'translate-x-1'}`}
                                                            />
                                                        </button>
                                                        <span className={`text-[8px] font-black uppercase ${u.isBlocked ? 'text-destructive' : 'text-green-600'}`}>
                                                            {u.isBlocked ? 'Locked' : 'Unlocked'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminAnalytics;

