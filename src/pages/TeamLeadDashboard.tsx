import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { Users, TrendingUp, Shield, LogOut, Loader2, Store, CreditCard, ChevronRight, CheckCircle2, AlertCircle, Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Header from "@/components/Header";

interface TeamLead {
    id: string;
    agentName: string;
    referralId: string;
    loginId: string;
    password?: string;
    createdAt?: string;
}

const TeamLeadDashboard = () => {
    const navigate = useNavigate();
    const [teamLeadData, setTeamLeadData] = useState<TeamLead | null>(null);
    const [referredVendors, setReferredVendors] = useState<any[]>([]);
    const [allReferrals, setAllReferrals] = useState<TeamLead[]>([]);
    const [allVendors, setAllVendors] = useState<any[]>([]);
    const [allCoupons, setAllCoupons] = useState<any[]>([]);
    const [allStores, setAllStores] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState<'network' | 'analytics' | 'leaderboard' | 'inactive' | 'payouts'>('network');
    const [partnerProfile, setPartnerProfile] = useState<any>(null);

    // Persist login session locally
    useEffect(() => {
        const saved = localStorage.getItem("bellbasket_teamlead_session");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setTeamLeadData(parsed);
            } catch (e) {
                console.error("Session parse error:", e);
                localStorage.removeItem("bellbasket_teamlead_session");
                navigate("/team-lead/login");
            }
        } else {
            navigate("/team-lead/login");
        }
    }, [navigate]);

    useEffect(() => {
        if (!teamLeadData?.referralId) return;

        setIsLoadingData(true);

        // 1. My referred vendors
        const unsubVendors = onSnapshot(
            query(collection(db, "users"), where("referralCode", "==", teamLeadData.referralId)),
            (snapshot) => {
                const vendors = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((u: any) => u.role === "vendor");
                setReferredVendors(vendors);
            }
        );

        // 2. Global Refs for Leaderboard
        const unsubRefs = onSnapshot(collection(db, "referrals"), (snapshot) => {
            setAllReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamLead)));
        });

        // 3. Global Vendors for stats
        const unsubAllVendors = onSnapshot(query(collection(db, "users"), where("role", "==", "vendor")), (snapshot) => {
            setAllVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // 4. Coupons to check referral usage
        const unsubCoupons = onSnapshot(collection(db, "coupons"), (snapshot) => {
            setAllCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // 5. Stores for contact details
        const unsubStores = onSnapshot(collection(db, "stores"), (snapshot) => {
            setAllStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // 6. My Partner Profile (Bank & Payments)
        const unsubProfile = onSnapshot(
            query(collection(db, "referrals"), where("referralId", "==", teamLeadData.referralId)),
            (snapshot) => {
                if (!snapshot.empty) {
                    setPartnerProfile({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
                }
                setIsLoadingData(false);
            }
        );

        return () => {
            unsubVendors();
            unsubRefs();
            unsubAllVendors();
            unsubCoupons();
            unsubStores();
            unsubProfile();
        };
    }, [teamLeadData]);

    const handleLogout = () => {
        setTeamLeadData(null);
        localStorage.removeItem("bellbasket_teamlead_session");
        toast.info("Logged out successfully");
        navigate("/team-lead/login");
    };

    const calculateEarnings = (vendors: any[]) => {
        let total = 0;
        vendors.forEach(v => {
            const plan = v.plan || 'none';
            let price = 0;
            if (plan === 'basic') price = 99;
            else if (plan === 'growth') price = 199;
            else if (plan === 'pro') price = 399;
            total += price * 0.3;
        });
        return total;
    };

    const getGlobalLeaderboard = () => {
        return allReferrals.map(ref => {
            const vendors = allVendors.filter(v => v.referralCode === ref.referralId);
            return {
                ...ref,
                count: vendors.length,
                earnings: calculateEarnings(vendors)
            };
        }).sort((a, b) => b.earnings - a.earnings || b.count - a.count);
    };

    const leaderboard = getGlobalLeaderboard();

    const checkCouponReferral = (vendorEmail: string) => {
        const coupon = allCoupons.find(c => c.usedBy === vendorEmail && c.isUsed);
        if (coupon && coupon.code === teamLeadData?.referralId) {
            return true;
        }
        return false;
    };

    if (!teamLeadData) {
        return (
            <div className="min-h-screen gradient-warm flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8"
                >
                    <div className="text-center lg:text-left">
                        <h1 className="text-4xl font-black text-foreground flex items-center justify-center lg:justify-start gap-4">
                            <Shield className="w-10 h-10 text-primary shrink-0 drop-shadow-sm" />
                            Command Center
                        </h1>
                        <p className="text-muted-foreground font-bold mt-2 flex items-center justify-center lg:justify-start gap-2">
                            Welcome back, <span className="text-primary">{teamLeadData.agentName}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1"></span>
                            <span className="text-[10px] uppercase tracking-widest bg-secondary/50 px-2 py-0.5 rounded-md">Partner Verified</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-white/80 backdrop-blur-sm px-5 py-3 rounded-2xl border border-white shadow-sm text-center">
                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-0.5">Your Referral ID</p>
                            <p className="text-lg font-black text-primary tracking-tighter">{teamLeadData.referralId}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-4 rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm border border-destructive/10 group"
                            title="Log Out"
                        >
                            <LogOut className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="glass-strong rounded-[32px] p-7 flex items-center gap-6 hover:shadow-2xl transition-all border-b-4 border-b-blue-500 group">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-inner">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-4xl font-black text-foreground tracking-tighter">{referredVendors.length}</p>
                            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mt-1">Vendors Joined</p>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="glass-strong rounded-[32px] p-7 flex items-center gap-6 hover:shadow-2xl transition-all border-b-4 border-b-primary group">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-4xl font-black text-foreground tracking-tighter">₹{calculateEarnings(referredVendors).toFixed(0)}</p>
                            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mt-1">Earnings Shared (30%)</p>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="glass-strong rounded-[32px] p-7 flex items-center gap-6 hover:shadow-2xl transition-all border-b-4 border-b-indigo-500 md:col-span-2 lg:col-span-1 group">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform shadow-inner">
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-foreground tracking-tighter">Settled</p>
                            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mt-1">Payment Status</p>
                        </div>
                    </motion.div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-2 mb-8 bg-secondary/10 p-1.5 rounded-[24px] w-fit border border-border/50 backdrop-blur-sm mx-auto md:mx-0">
                    <button
                        onClick={() => setActiveTab('network')}
                        className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'network' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Vendor Network
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'leaderboard' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Leaderboard
                    </button>
                    <button
                        onClick={() => setActiveTab('inactive')}
                        className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'inactive' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Inactive Vendors
                    </button>
                    <button
                        onClick={() => setActiveTab('payouts')}
                        className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'payouts' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Payouts
                    </button>
                </div>

                {activeTab === 'inactive' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="glass-strong rounded-[44px] overflow-hidden border-white/20 shadow-2xl">
                            <div className="p-10 border-b border-border/50 bg-secondary/10">
                                <h3 className="text-3xl font-black text-foreground mb-2 flex items-center gap-4">
                                    <AlertCircle className="w-10 h-10 text-orange-500" />
                                    My Inactive Leads
                                </h3>
                                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Follow up with vendors who joined using your code but haven't subscribed yet</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border/50 bg-secondary/30 text-[11px] font-black uppercase text-muted-foreground tracking-[0.25em]">
                                            <th className="p-8">Vendor & Store</th>
                                            <th className="p-8">Location & Contact</th>
                                            <th className="p-8">Status</th>
                                            <th className="p-8 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {referredVendors.filter(v => !v.plan || v.plan === 'none').length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-24 text-center">
                                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                                                        <CheckCircle2 className="w-8 h-8" />
                                                    </div>
                                                    <h4 className="text-lg font-black text-foreground">All your leads are active!</h4>
                                                    <p className="text-muted-foreground font-bold italic text-xs">Great job keeping your network subscribed.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            referredVendors.filter(v => !v.plan || v.plan === 'none').map((v) => {
                                                const store = allStores.find(s => s.id === v.id);
                                                const phone = v.phone || store?.phone || "No Contact";
                                                const address = store?.address || "Address not provided";

                                                return (
                                                    <tr key={v.id} className="border-b border-border/30 hover:bg-secondary/20 transition-all group">
                                                        <td className="p-8">
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center font-black text-orange-500 text-xl group-hover:scale-105 transition-transform">
                                                                    {v.name?.charAt(0) || "V"}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-foreground text-lg">{v.name || "Anonymous Vendor"}</p>
                                                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                                                        <Store className="w-3 h-3" />
                                                                        {store?.name || "No Store Data"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-start gap-2 text-muted-foreground text-xs font-bold leading-snug max-w-xs">
                                                                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                                                    {address}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-foreground font-black text-sm">
                                                                    <Phone className="w-3.5 h-3.5 text-primary" />
                                                                    {phone}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-8">
                                                            <span className="px-3 py-1.5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-100 flex items-center gap-2 w-fit">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Leads Missing Plan
                                                            </span>
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                                                                <a
                                                                    href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all w-full sm:w-auto text-center"
                                                                >
                                                                    WhatsApp
                                                                </a>
                                                                <a
                                                                    href={`tel:${phone}`}
                                                                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all w-full sm:w-auto text-center"
                                                                >
                                                                    Call Lead
                                                                </a>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Public Leads Section */}
                        <div className="glass-strong rounded-[44px] overflow-hidden border-white/20 shadow-xl opacity-90 grayscale-[0.3] hover:grayscale-0 transition-all">
                            <div className="p-10 border-b border-border/50 bg-indigo-500/5">
                                <h3 className="text-2xl font-black text-foreground mb-2 flex items-center gap-4">
                                    <Users className="w-8 h-8 text-indigo-500" />
                                    Unclaimed Marketplace Leads
                                </h3>
                                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Open leads with no referral code — convince them to use your code or help them subscribe</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border/50 bg-secondary/30 text-[11px] font-black uppercase text-muted-foreground tracking-[0.25em]">
                                            <th className="p-8">Public Lead</th>
                                            <th className="p-8">Store Info</th>
                                            <th className="p-8 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allVendors.filter(v => (!v.referralCode || v.referralCode === '') && (!v.plan || v.plan === 'none')).length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="p-16 text-center text-muted-foreground font-bold italic text-sm">
                                                    No unclaimed leads available at the moment.
                                                </td>
                                            </tr>
                                        ) : (
                                            allVendors.filter(v => (!v.referralCode || v.referralCode === '') && (!v.plan || v.plan === 'none')).slice(0, 10).map((v) => {
                                                const store = allStores.find(s => s.id === v.id);
                                                const phone = v.phone || store?.phone || "No Phone";

                                                return (
                                                    <tr key={v.id} className="border-b border-border/30 hover:bg-white/40 transition-all group">
                                                        <td className="p-8">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center font-black text-indigo-600">
                                                                    {v.name?.charAt(0) || "P"}
                                                                </div>
                                                                <p className="font-bold text-foreground">{v.name || "Vendor"}</p>
                                                            </div>
                                                        </td>
                                                        <td className="p-8">
                                                            <p className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                                                <Store className="w-3.5 h-3.5" />
                                                                {store?.name || "Direct Vendor"}
                                                            </p>
                                                        </td>
                                                        <td className="p-8">
                                                            <div className="flex justify-end">
                                                                <a
                                                                    href={`tel:${phone}`}
                                                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all text-center"
                                                                >
                                                                    Claim & Call
                                                                </a>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
                {activeTab === 'network' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-strong rounded-[44px] overflow-hidden border-white/20 shadow-2xl">
                        <div className="p-8 sm:p-10 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-foreground flex items-center gap-4">
                                    <Store className="w-8 h-8 text-primary" />
                                    Vendor Network
                                </h3>
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-2 ml-12">Performance Tracking</p>
                            </div>
                            <div className="hidden sm:block">
                                <span className="bg-primary/5 text-primary text-[10px] font-black px-4 py-2 rounded-xl border border-primary/10 uppercase tracking-widest">Live Updates</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/50 bg-secondary/30 text-[11px] font-black uppercase text-muted-foreground tracking-[0.25em]">
                                        <th className="p-8">Vendor Profile</th>
                                        <th className="p-8">Service Plan</th>
                                        <th className="p-8">Revenue</th>
                                        <th className="p-8 text-right">Commission</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingData ? (
                                        <tr>
                                            <td colSpan={4} className="p-24 text-center">
                                                <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary opacity-30" />
                                                <p className="text-muted-foreground mt-6 font-bold uppercase tracking-widest text-xs">Accessing Network...</p>
                                            </td>
                                        </tr>
                                    ) : referredVendors.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-32 text-center">
                                                <div className="w-24 h-24 bg-secondary/50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
                                                    <Store className="w-12 h-12" />
                                                </div>
                                                <h4 className="text-xl font-black text-foreground mb-2">Network is Empty</h4>
                                                <p className="text-muted-foreground font-bold italic text-sm">No vendors have used your referral code yet.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        referredVendors.map((v) => {
                                            const plan = v.plan || 'none';
                                            let price = 0;
                                            if (plan === 'basic') price = 99;
                                            else if (plan === 'growth') price = 199;
                                            else if (plan === 'pro') price = 399;
                                            const earning = price * 0.3;
                                            const isReferralCoupon = checkCouponReferral(v.email);

                                            return (
                                                <tr key={v.id} className="border-b border-border/30 hover:bg-secondary/20 transition-all group">
                                                    <td className="p-8">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-black text-primary text-xl shadow-inner group-hover:scale-105 transition-transform">
                                                                {v.name?.charAt(0) || "V"}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-foreground text-lg group-hover:text-primary transition-colors">{v.name || "Anonymous Vendor"}</p>
                                                                <p className="text-[11px] font-bold text-muted-foreground tracking-tight">{v.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-8">
                                                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${plan === 'pro' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                                            plan === 'growth' ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                                                plan === 'basic' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                                    'bg-gray-100 text-gray-400 border-gray-200'
                                                            }`}>
                                                            {plan} Plan
                                                        </span>
                                                    </td>
                                                    <td className="p-8 font-black text-foreground text-lg tracking-tight">
                                                        {isReferralCoupon ? (
                                                            <span className="text-primary bg-primary/10 px-3 py-1 rounded-lg text-[9px] uppercase font-black tracking-tight">Referral Sync</span>
                                                        ) : `₹${price}`}
                                                    </td>
                                                    <td className="p-8 text-right">
                                                        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-green-500/10 text-green-600 rounded-2xl font-black text-base shadow-sm border border-green-500/5">
                                                            <CreditCard className="w-4 h-4" />
                                                            ₹{earning.toFixed(1)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!isLoadingData && referredVendors.length > 0 && (
                            <div className="p-10 bg-secondary/10 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-6">
                                <p className="text-sm font-bold text-muted-foreground flex items-center gap-3">
                                    <ChevronRight className="w-5 h-5 text-primary" />
                                    Commissions are automatically calculated from active vendor subscriptions.
                                </p>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Cumulative Monthly Earning</span>
                                    <span className="text-4xl font-black text-primary tracking-tighter">₹{calculateEarnings(referredVendors).toFixed(0)}</span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'analytics' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="glass-strong rounded-[44px] p-10 flex flex-col items-center justify-center text-center border-b-8 border-b-emerald-500">
                                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 drop-shadow-xl">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <h4 className="text-4xl font-black text-foreground mb-2">
                                    {referredVendors.filter(v => v.plan && v.plan !== 'none').length}
                                </h4>
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-8">Active Subscribers</p>
                                <div className="w-full h-3 bg-secondary/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                        style={{ width: `${(referredVendors.filter(v => v.plan && v.plan !== 'none').length / (referredVendors.length || 1)) * 100}%` }}
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground mt-6 uppercase tracking-widest">Growth Retention</p>
                            </div>

                            <div className="glass-strong rounded-[44px] p-10 flex flex-col items-center justify-center text-center border-b-8 border-b-orange-500">
                                <div className="w-24 h-24 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-6 drop-shadow-xl">
                                    <AlertCircle className="w-12 h-12" />
                                </div>
                                <h4 className="text-4xl font-black text-foreground mb-2">
                                    {referredVendors.filter(v => !v.plan || v.plan === 'none').length}
                                </h4>
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-8">Inactive / Expired</p>
                                <div className="w-full h-3 bg-secondary/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                                        style={{ width: `${(referredVendors.filter(v => !v.plan || v.plan === 'none').length / (referredVendors.length || 1)) * 100}%` }}
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground mt-6 uppercase tracking-widest">Churn Warning</p>
                            </div>
                        </div>

                        <div className="glass-strong rounded-[44px] p-10 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-indigo-500" />
                            <h3 className="text-2xl font-black text-foreground mb-12">Conversion Performance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="p-6 bg-secondary/10 rounded-3xl border border-border/50">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Conversion Rate</p>
                                    <p className="text-4xl font-black text-primary">
                                        {((referredVendors.filter(v => v.plan && v.plan !== 'none').length / (referredVendors.length || 1)) * 100).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="p-6 bg-secondary/10 rounded-3xl border border-border/50">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Revenue Risk</p>
                                    <p className="text-4xl font-black text-orange-500">
                                        {((referredVendors.filter(v => !v.plan || v.plan === 'none').length / (referredVendors.length || 1)) * 100).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="p-6 bg-secondary/10 rounded-3xl border border-border/50">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Avg Earning/Lead</p>
                                    <p className="text-4xl font-black text-blue-500 tracking-tighter">
                                        ₹{(calculateEarnings(referredVendors) / (referredVendors.length || 1)).toFixed(0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'leaderboard' && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-strong rounded-[44px] overflow-hidden shadow-2xl">
                        <div className="p-10 border-b border-border/50 bg-secondary/10 text-center">
                            <h3 className="text-3xl font-black text-foreground mb-2">Partner Leaderboard</h3>
                            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Benchmark your performance against the network</p>
                        </div>
                        <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                            {leaderboard.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`p-6 rounded-[32px] border flex items-center justify-between transition-all ${item.referralId === teamLeadData.referralId
                                        ? 'bg-primary/10 border-primary shadow-xl scale-[1.02]'
                                        : 'bg-white/50 border-border hover:border-primary/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${index === 0 ? 'bg-amber-100 text-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.2)]' :
                                            index === 1 ? 'bg-slate-100 text-slate-500 shadow-[0_0_15px_rgba(100,116,139,0.2)]' :
                                                index === 2 ? 'bg-orange-100 text-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.2)]' :
                                                    'bg-secondary text-muted-foreground'
                                            }`}>
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <p className="font-black text-foreground text-xl flex items-center gap-2">
                                                {item.agentName}
                                                {item.referralId === teamLeadData.referralId && <span className="text-[9px] bg-primary text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">You</span>}
                                            </p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{item.referralId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12 text-right">
                                        <div className="hidden md:block">
                                            <p className="text-2xl font-black text-foreground">{item.count}</p>
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Network</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black text-primary tracking-tighter">₹{item.earnings.toFixed(0)}</p>
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Commission</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
                {activeTab === 'payouts' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="glass-strong rounded-[44px] p-10 border-b-8 border-b-blue-500">
                                <h3 className="text-2xl font-black text-foreground mb-6 flex items-center gap-3">
                                    <CreditCard className="w-8 h-8 text-blue-500" />
                                    Bank Information
                                </h3>
                                {partnerProfile?.bankName ? (
                                    <div className="space-y-4">
                                        <div className="p-5 bg-white/50 rounded-2xl border border-border/50">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Account Holder</p>
                                            <p className="text-lg font-black text-foreground">{partnerProfile.accountName}</p>
                                        </div>
                                        <div className="p-5 bg-white/50 rounded-2xl border border-border/50">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Bank & Account Number</p>
                                            <p className="text-lg font-black text-foreground">{partnerProfile.bankName}</p>
                                            <p className="text-sm font-bold text-muted-foreground mt-1">{partnerProfile.accountNumber}</p>
                                        </div>
                                        <div className="p-5 bg-white/50 rounded-2xl border border-border/50">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">IFSC Code</p>
                                            <p className="text-lg font-black text-primary uppercase">{partnerProfile.ifsc}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-10 text-center bg-gray-500/5 rounded-[32px] border border-dashed border-gray-300">
                                        <p className="text-sm font-bold text-muted-foreground italic">Bank details not provided yet. Please contact admin to update.</p>
                                    </div>
                                )}
                            </div>

                            <div className="glass-strong rounded-[44px] p-10 border-b-8 border-b-emerald-500">
                                <h3 className="text-2xl font-black text-foreground mb-6 flex items-center gap-3">
                                    <TrendingUp className="w-8 h-8 text-emerald-500" />
                                    Payout Summary
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-emerald-500/5 rounded-[32px] border border-emerald-500/10 text-center">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Total Paid</p>
                                        <p className="text-3xl font-black text-emerald-600">₹{(partnerProfile?.totalPaid || 0).toFixed(0)}</p>
                                    </div>
                                    <div className="p-6 bg-orange-500/5 rounded-[32px] border border-orange-500/10 text-center">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Pending</p>
                                        <p className="text-3xl font-black text-orange-600">₹{Math.max(0, calculateEarnings(referredVendors) - (partnerProfile?.totalPaid || 0)).toFixed(0)}</p>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-secondary/10 rounded-3xl">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest">Monthly Cycle Update</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                <TrendingUp className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-foreground">Next Scheduled Payout</p>
                                                <p className="text-[10px] font-bold text-muted-foreground">{partnerProfile?.nextPaymentDate ? new Date(partnerProfile.nextPaymentDate).toLocaleDateString() : 'To be announced'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-strong rounded-[44px] overflow-hidden border-white/20 shadow-2xl">
                            <div className="p-10 border-b border-border/50 bg-secondary/10">
                                <h3 className="text-2xl font-black text-foreground">Payout History</h3>
                                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-1">Date-wise settlement records</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border/50 bg-secondary/30 text-[11px] font-black uppercase text-muted-foreground tracking-[0.25em]">
                                            <th className="p-8">Date</th>
                                            <th className="p-8">Description</th>
                                            <th className="p-8 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!partnerProfile?.payments || partnerProfile.payments.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="p-20 text-center text-muted-foreground font-bold italic text-sm">
                                                    No payout records found.
                                                </td>
                                            </tr>
                                        ) : (
                                            partnerProfile.payments.slice().reverse().map((p: any, idx: number) => (
                                                <tr key={idx} className="border-b border-border/30 hover:bg-secondary/20 transition-all">
                                                    <td className="p-8">
                                                        <p className="font-black text-foreground">{new Date(p.date).toLocaleDateString()}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{new Date(p.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                                                    </td>
                                                    <td className="p-8">
                                                        <p className="text-sm font-bold text-muted-foreground">Monthly Commission Settlement</p>
                                                    </td>
                                                    <td className="p-8 text-right">
                                                        <span className="px-5 py-2.5 bg-green-500/10 text-green-600 rounded-2xl font-black text-lg ">
                                                            ₹{p.amount.toFixed(0)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default TeamLeadDashboard;
