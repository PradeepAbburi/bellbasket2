import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, ShoppingBag, DollarSign, ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Activity, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { DashboardSkeleton } from '@/components/SkeletonLoader';

const VendorAnalytics = () => {
    const { user, orders: allOrders, loading } = useApp();
    const navigate = useNavigate();

    const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

    if (loading) return <DashboardSkeleton />;

    const vendorOrders = allOrders.filter(o => o.storeId === user?.id);
    const activeOrders = vendorOrders.filter(o => o.status !== 'pending' && o.status !== 'rejected');
    const hasAnalytics = user?.plan && user.plan !== 'basic' && user.plan !== 'none';

    // ── TIME-RANGE FILTER ──────────────────────────────────────────
    // Filter orders based on selected time range so ALL stats update
    const now = new Date();
    const getFilteredOrders = () => {
        return activeOrders.filter(o => {
            try {
                const orderDate = new Date(o.date);
                if (timeRange === 'weekly') {
                    const sevenDaysAgo = new Date(now);
                    sevenDaysAgo.setDate(now.getDate() - 7);
                    sevenDaysAgo.setHours(0, 0, 0, 0);
                    return orderDate >= sevenDaysAgo;
                } else if (timeRange === 'monthly') {
                    const thirtyDaysAgo = new Date(now);
                    thirtyDaysAgo.setDate(now.getDate() - 30);
                    thirtyDaysAgo.setHours(0, 0, 0, 0);
                    return orderDate >= thirtyDaysAgo;
                } else {
                    // yearly — last 365 days
                    const oneYearAgo = new Date(now);
                    oneYearAgo.setFullYear(now.getFullYear() - 1);
                    oneYearAgo.setHours(0, 0, 0, 0);
                    return orderDate >= oneYearAgo;
                }
            } catch {
                return false;
            }
        });
    };

    const filteredOrders = getFilteredOrders();

    // ── 1. CORE STATS (use filtered orders) ──────────────────────
    const revenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalItemsSold = filteredOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const avgOrderValue = filteredOrders.length > 0 ? (revenue / filteredOrders.length).toFixed(0) : '0';

    // Compare to previous period
    const getPreviousPeriodOrders = () => {
        return activeOrders.filter(o => {
            try {
                const orderDate = new Date(o.date);
                if (timeRange === 'weekly') {
                    const fourteenDaysAgo = new Date(now);
                    fourteenDaysAgo.setDate(now.getDate() - 14);
                    const sevenDaysAgo = new Date(now);
                    sevenDaysAgo.setDate(now.getDate() - 7);
                    return orderDate >= fourteenDaysAgo && orderDate < sevenDaysAgo;
                } else if (timeRange === 'monthly') {
                    const sixtyDaysAgo = new Date(now);
                    sixtyDaysAgo.setDate(now.getDate() - 60);
                    const thirtyDaysAgo = new Date(now);
                    thirtyDaysAgo.setDate(now.getDate() - 30);
                    return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
                } else {
                    const twoYearsAgo = new Date(now);
                    twoYearsAgo.setFullYear(now.getFullYear() - 2);
                    const oneYearAgo = new Date(now);
                    oneYearAgo.setFullYear(now.getFullYear() - 1);
                    return orderDate >= twoYearsAgo && orderDate < oneYearAgo;
                }
            } catch {
                return false;
            }
        });
    };

    const prevOrders = getPreviousPeriodOrders();
    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.total, 0);

    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100).toFixed(1) : (revenue > 0 ? '+100' : '0');
    const orderCountChange = prevOrders.length > 0 ? ((filteredOrders.length - prevOrders.length) / prevOrders.length * 100).toFixed(1) : (filteredOrders.length > 0 ? '+100' : '0');

    const rangeLabel = timeRange === 'weekly' ? 'This Week' : timeRange === 'monthly' ? 'This Month' : 'This Year';

    const mainStats = [
        { label: `Revenue (${rangeLabel})`, value: `₹${revenue.toLocaleString()}`, change: `${Number(revenueChange) >= 0 ? '+' : ''}${revenueChange}%`, icon: DollarSign, trend: Number(revenueChange) >= 0 ? 'up' : 'down' },
        { label: `Orders (${rangeLabel})`, value: filteredOrders.length, change: `${Number(orderCountChange) >= 0 ? '+' : ''}${orderCountChange}%`, icon: ShoppingBag, trend: Number(orderCountChange) >= 0 ? 'up' : 'down' },
        { label: 'Avg Order Value', value: `₹${avgOrderValue}`, change: '', icon: Activity, trend: 'up' },
        { label: 'Items Sold', value: totalItemsSold, change: '', icon: Users, trend: 'up' },
    ];

    // ── 2. SALES CHART DATA (use filtered orders) ────────────────
    const getSalesData = () => {
        if (timeRange === 'weekly') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            // Build keys by actual date string for accurate grouping
            const data: { label: string; value: number }[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);
                const key = d.toDateString(); // unique per day
                const dayLabel = `${days[d.getDay()]} ${d.getDate()}`;
                let total = 0;
                filteredOrders.forEach(order => {
                    try {
                        const od = new Date(order.date);
                        if (od.toDateString() === key) total += order.total;
                    } catch { /* skip */ }
                });
                data.push({ label: dayLabel, value: total });
            }
            return data;
        } else if (timeRange === 'monthly') {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            // 4 weeks of the current month with date ranges
            const weekRanges = [
                { start: 1, end: 7 },
                { start: 8, end: 14 },
                { start: 15, end: 21 },
                { start: 22, end: new Date(currentYear, currentMonth + 1, 0).getDate() }, // last day of month
            ];

            return weekRanges.map((range) => {
                let total = 0;
                filteredOrders.forEach(order => {
                    try {
                        const od = new Date(order.date);
                        if (od.getMonth() === currentMonth && od.getFullYear() === currentYear) {
                            const day = od.getDate();
                            if (day >= range.start && day <= range.end) total += order.total;
                        }
                    } catch { /* skip */ }
                });
                return {
                    label: `${range.start}-${range.end} ${monthNames[currentMonth]}`,
                    value: total
                };
            });
        } else {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const data: { label: string; value: number }[] = [];

            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthIdx = d.getMonth();
                const year = d.getFullYear();
                const yearShort = `'${String(year).slice(2)}`;
                let total = 0;
                filteredOrders.forEach(order => {
                    try {
                        const od = new Date(order.date);
                        if (od.getMonth() === monthIdx && od.getFullYear() === year) total += order.total;
                    } catch { /* skip */ }
                });
                data.push({ label: `${monthNames[monthIdx]} ${yearShort}`, value: total });
            }
            return data;
        }
    };

    const salesData = getSalesData();
    const maxSales = Math.max(...salesData.map(d => d.value), 100);

    // ── 3. TOP PERFORMING ITEM & PEAK TIME (filtered) ────────────
    const itemSales: Record<string, { count: number, revenue: number }> = {};
    const hourSales: Record<number, number> = {};

    filteredOrders.forEach(o => {
        o.items.forEach(item => {
            const name = item.product.name;
            const itemPrice = (item.product.discountedPrice !== undefined && item.product.discountedPrice > 0) 
                ? item.product.discountedPrice 
                : item.product.price;
                
            if (!itemSales[name]) itemSales[name] = { count: 0, revenue: 0 };
            itemSales[name].count += item.quantity;
            itemSales[name].revenue += (itemPrice * item.quantity);
        });

        try {
            const hour = new Date(o.date).getHours();
            hourSales[hour] = (hourSales[hour] || 0) + 1;
        } catch { /* skip invalid dates */ }
    });

    const topItemName = Object.entries(itemSales).sort((a, b) => b[1].revenue - a[1].revenue)[0]?.[0] || 'No sales yet';
    const topItemRevenue = Object.entries(itemSales).sort((a, b) => b[1].revenue - a[1].revenue)[0]?.[1].revenue || 0;

    const peakHour = Object.entries(hourSales).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const peakTimeString = peakHour !== 'N/A' ? `${peakHour}:00 - ${Number(peakHour) + 2}:00` : 'No orders yet';

    // ── 4. CATEGORY POPULARITY (filtered) ────────────────────────
    const catSales: Record<string, number> = {};
    filteredOrders.forEach(o => {
        o.items.forEach(item => {
            const cat = item.product.category || 'Other';
            catSales[cat] = (catSales[cat] || 0) + item.quantity;
        });
    });

    const totalQty = Object.values(catSales).reduce((s, v) => s + v, 0);
    const catColors = ['bg-primary', 'bg-accent', 'bg-indigo-400', 'bg-pink-400', 'bg-teal-400'];
    const sortedCats = Object.entries(catSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, qty], i) => ({
            name,
            value: totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0,
            color: catColors[i % catColors.length]
        }));

    const categoryData = sortedCats.length > 0 ? sortedCats : [
        { name: 'No data', value: 0, color: 'bg-slate-300' },
    ];

    // ── 5. REPEAT CUSTOMERS (filtered, Pro) ──────────────────────
    const userOrderCounts: Record<string, number> = {};
    filteredOrders.forEach(o => {
        if (o.userId) userOrderCounts[o.userId] = (userOrderCounts[o.userId] || 0) + 1;
    });
    const repeatCustomers = Object.values(userOrderCounts).filter(count => count > 1).length;
    const totalCustomers = Object.keys(userOrderCounts).length;
    const repeatRate = totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : '0';

    // ── DOWNLOAD REPORT ──────────────────────────────────────────
    const handleDownloadReport = () => {
        if (user?.plan !== 'pro') return toast.error("Pro plan required for PDF reports");

        const reportContent = `
BELLBASKET VENDOR BUSINESS REPORT
Store: ${user.name}
Date: ${new Date().toLocaleString()}
Range: ${timeRange.toUpperCase()} (${rangeLabel})
----------------------------------
STATISTICS SUMMARY:
Total Revenue (Verified): ₹${revenue.toLocaleString()}
Total Orders (Success/Active): ${filteredOrders.length}
Items Sold: ${totalItemsSold}
Avg Order Value: ₹${avgOrderValue}
Peak Activity window: ${peakTimeString}
----------------------------------
PERFORMANCE INSIGHTS:
Top Performing Item: ${topItemName} (₹${topItemRevenue.toLocaleString()})
Customer Retention Rate: ${repeatRate}%
Unique Customers Reach: ${totalCustomers}
----------------------------------
PRODUCT CATEGORY PERFORMANCE:
${sortedCats.map(c => `- ${c.name}: ${c.value}% sales share`).join('\n')}
----------------------------------
Thank you for using BellBasket Pro.
        `;

        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Store_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Report downloaded!", { description: `${rangeLabel} sales summary saved.` });
    };

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-20 pb-40 px-3 sm:px-4 max-w-5xl mx-auto relative">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 transition-opacity ${!hasAnalytics ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Performance Analytics</h1>
                        <p className="text-sm text-muted-foreground">Deep dive into your store's growing metrics</p>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-white/50 dark:bg-secondary/20 backdrop-blur-sm p-1.5 rounded-xl border border-white/20 flex-wrap">
                        <button
                            onClick={() => setTimeRange('weekly')}
                            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${timeRange === 'weekly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setTimeRange('monthly')}
                            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${timeRange === 'monthly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setTimeRange('yearly')}
                            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${timeRange === 'yearly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Yearly
                        </button>

                        <button
                            disabled={user?.plan !== 'pro'}
                            onClick={handleDownloadReport}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${user?.plan === 'pro'
                                ? 'bg-amber-400 text-amber-950 shadow-sm hover:scale-105 active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Report
                            {user?.plan !== 'pro' && <span className="text-[8px] bg-slate-300 px-1 rounded ml-1">PRO</span>}
                        </button>
                    </div>
                </div>

                {!hasAnalytics && (
                    <div className="absolute inset-x-4 top-[120px] bottom-8 z-20 flex flex-col items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-strong rounded-[40px] p-10 max-w-lg w-full text-center shadow-2xl border-2 border-primary/20 bg-[#202020]/80 backdrop-blur-xl"
                        >
                            <div className="w-20 h-20 rounded-[30px] bg-primary flex items-center justify-center mx-auto mb-6">
                                <TrendingUp className="w-10 h-10 text-primary-foreground" />
                            </div>
                            <h2 className="text-3xl font-black text-foreground mb-4 leading-tight">Unlock Powerful Sales Insights</h2>
                            <p className="text-muted-foreground mb-8 text-sm font-medium leading-relaxed">
                                Get access to revenue graphs, customer reach metrics, conversion rates, and repeat customer analytics with our <span className="text-primary font-bold">Growth Plan</span>.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate('/vendor/subscription')}
                                    className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                >
                                    Upgrade to Growth <ArrowUpRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => navigate('/vendor')}
                                    className="w-full py-4 rounded-2xl bg-secondary/50 text-foreground font-bold text-sm hover:bg-secondary/80 transition-all"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                <div className={`transition-all duration-700 ${!hasAnalytics ? 'opacity-10 blur-xl pointer-events-none grayscale select-none' : ''}`}>
                    {/* Top Metrics */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-6 sm:mb-8">
                        {mainStats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass rounded-2xl p-3 sm:p-5 group hover:scale-[1.02] transition-transform"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <div className={`flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                        {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {stat.change}
                                    </div>
                                </div>
                                <p className="text-lg sm:text-2xl font-black text-foreground truncate">{stat.value}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                        {/* Sales Chart Mockup */}
                        <div className="lg:col-span-2 glass rounded-2xl sm:rounded-3xl p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4 sm:mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                        <BarChart3 className="w-4 h-4 text-primary-foreground" />
                                    </div>
                                    <h3 className="font-bold text-foreground">Sales Revenue</h3>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <span>Gross Sales</span>
                                    </div>
                                </div>
                            </div>

                            {salesData.every(d => d.value === 0) ? (
                                <div className="h-64 flex items-center justify-center text-muted-foreground">
                                    <div className="text-center space-y-2">
                                        <BarChart3 className="w-8 h-8 mx-auto opacity-30" />
                                        <p className="text-sm font-medium">No sales data for {rangeLabel.toLowerCase()}</p>
                                        <p className="text-xs opacity-60">Orders will appear here once confirmed</p>
                                    </div>
                                </div>
                            ) : (
                                <div className={`h-48 sm:h-64 flex items-end gap-1 sm:gap-2 md:gap-4 px-1 sm:px-2 ${timeRange === 'yearly' ? 'overflow-x-auto pb-2' : 'justify-between'}`} key={timeRange}>
                                    {salesData.map((data, i) => {
                                        const heightPercentage = maxSales > 0 ? (data.value / maxSales) * 100 : 0;
                                        return (
                                            <div key={`${timeRange}-${data.label}`} className={`flex flex-col items-center gap-1 sm:gap-2 group h-full justify-end ${timeRange === 'yearly' ? 'min-w-[40px] sm:min-w-[48px]' : 'flex-1'}`}>
                                                <div className="relative w-full flex-1 flex items-end justify-center">
                                                    {/* Tooltip */}
                                                    <div className="absolute -top-8 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none mb-2">
                                                        ₹{data.value.toLocaleString()}
                                                    </div>

                                                    {/* Bar */}
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${Math.max(heightPercentage, data.value > 0 ? 2 : 0)}%` }}
                                                        transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                                                        className={`w-full max-w-[40px] rounded-t-lg bg-gradient-to-t ${data.value > 0 ? 'from-primary/80 to-primary' : 'from-transparent to-transparent'}`}
                                                        style={{ minHeight: data.value > 0 ? '4px' : '0px' }}
                                                    />
                                                </div>
                                                <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center leading-tight whitespace-nowrap">
                                                    {timeRange === 'yearly' ? data.label : data.label.split(' ')[0]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Popular Categories */}
                        <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
                                    <PieChart className="w-4 h-4 text-accent-foreground" />
                                </div>
                                <h3 className="font-bold text-foreground">Popularity</h3>
                            </div>

                            <div className="space-y-6">
                                {categoryData.map((cat, i) => (
                                    <div key={cat.name} className="space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-muted-foreground uppercase tracking-widest">{cat.name}</span>
                                            <span className="text-foreground">{cat.value}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-secondary dark:bg-[#333333] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${cat.value}%` }}
                                                transition={{ duration: 1, delay: i * 0.2 }}
                                                className={`h-full ${cat.color}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {categoryData.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic text-center py-4">No category data yet</p>
                                )}
                            </div>

                            <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-wider">Repeat Customers</p>
                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{user?.plan === 'pro' ? 'PRO' : 'Locked'}</span>
                                </div>
                                {user?.plan === 'pro' ? (
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-xl font-black text-foreground">{repeatCustomers}</p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">{repeatRate}% Retention Rate</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-muted-foreground font-medium italic leading-tight">Customers who ordered<br />more than once.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground leading-relaxed italic">Upgrade to Pro to see your repeat customer analytics and retention data.</p>
                                )}
                            </div>

                            <div className="mt-4 p-4 glass rounded-2xl border-l-4 border-accent">
                                <p className="text-[10px] font-black text-accent uppercase tracking-wider mb-1">Growth Forecast</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">Based on current trends, your reach is expected to grow by <span className="text-primary font-bold">{activeOrders.length > 0 ? '12%' : '0%'}</span> next month.</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Detailed Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="glass rounded-3xl p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">Top Performing Item</h4>
                                <p className="text-sm text-muted-foreground">{topItemName} {topItemRevenue > 0 ? `generated ₹${topItemRevenue.toLocaleString()}` : 'has no sales yet'}.</p>
                            </div>
                        </div>
                        <div className="glass rounded-3xl p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-6 h-6 text-accent" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">Peak Order Time</h4>
                                <p className="text-sm text-muted-foreground">{peakTimeString}.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorAnalytics;
