import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Check, ArrowRight, Star, ShieldCheck, Zap, Sparkles, Building2, CreditCard, Lock, Loader2, X, Shield, Ticket, Calendar, Gift, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const VendorPlans = () => {
    const { user, updatePlan, stores, loading } = useApp();
    const navigate = useNavigate();

    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [isClaiming, setIsClaiming] = useState(false);
    const [globalSettings, setGlobalSettings] = useState<{ disableCoupons?: boolean }>({});
    const couponRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchGlobalSettings = async () => {
            try {
                const snap = await getDoc(doc(db, 'config', 'global'));
                if (snap.exists()) {
                    setGlobalSettings(snap.data());
                }
            } catch (e) {
                console.warn("Failed to fetch global settings", e);
            }
        };
        fetchGlobalSettings();

        const params = new URLSearchParams(window.location.search);
        if (params.get('claim') === 'true' && couponRef.current) {
            couponRef.current.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => {
                const input = couponRef.current?.querySelector('input');
                if (input) input.focus();
            }, 500);
        }
    }, []);

    if (loading) return <DashboardSkeleton />;
    const isServiceStore = stores?.find(s => s.vendorId === user?.id)?.storeType === 'service';

    type PricingPlan = {
        id: string;
        tier: string;
        months: number;
        name: string;
        price: string;
        period: string;
        description: string;
        icon: any;
        color: string;
        popular?: boolean;
        features: string[];
        discount?: string;
        originalPrice?: string;
    };

    const productPlans: PricingPlan[] = [
        {
            id: 'basic',
            tier: 'basic',
            months: 1,
            name: 'Basic Plan',
            price: '₹99',
            period: 'for 1 month',
            description: 'For small shops and local sellers.',
            icon: Building2,
            color: 'from-orange-700/50 to-orange-900/50',
            features: [
                '30 Product Listings',
                'Store listing in locality',
                'Digital Inventory',
                'Order management',
                'Pickup order system',
                'Basic sales history',
                'Customer phone visibility'
            ]
        },
        {
            id: 'growth',
            tier: 'growth',
            months: 1,
            name: 'Growth Plan',
            price: '₹199',
            period: 'for 1 month',
            description: 'For stores that want more visibility.',
            icon: Zap,
            color: 'from-blue-500 to-indigo-600',
            popular: true,
            features: [
                'Everything in Basic +',
                '60 Product Listings',
                'Higher ranking in search',
                '“Featured Store” badge',
                'Sales analytics (graphs)',
                'Priority Support (support@bellbasket.com)',
                'Custom store timings'
            ]
        },
        {
            id: 'pro',
            tier: 'pro',
            months: 1,
            name: 'Pro Plan',
            price: '₹399',
            period: 'for 1 month',
            description: 'For serious supermarkets.',
            icon: Crown,
            color: 'from-amber-400 to-yellow-600',
            features: [
                'Everything in Growth +',
                'Unlimited Product Listings',
                'Highlighted listing at top',
                'Sponsored placement',
                'Store Branding (Logo)',
                'Customer repeat analytics',
                'Exportable sales reports',
                'Custom discount tags'
            ]
        }
    ];

    const servicePlans: PricingPlan[] = [
        {
            id: 'monthly',
            tier: 'pro',
            months: 1,
            name: 'Monthly Pro',
            price: '₹399',
            period: 'for 1 month',
            description: 'Essential tools for your digital store.',
            icon: Zap,
            color: 'from-blue-500 to-indigo-600',
            features: [
                'Unlimited Service Listings',
                'Featured Store Badge',
                'Priority Local Ranking',
                'Sales Analytics & Graphs',
                'Customer repeat analytics',
                'Store Branding (Logo/Watermark)',
                'Priority Support (support@bellbasket.com)'
            ]
        },
        {
            id: 'half_yearly',
            tier: 'pro',
            months: 6,
            name: '6 Months Pro',
            price: '₹1999',
            originalPrice: '₹2394',
            period: 'for 6 months',
            discount: 'Save 16%',
            description: 'Best for growing businesses looking for stability.',
            icon: Crown,
            color: 'from-amber-400 to-yellow-600',
            popular: true,
            features: [
                'All Monthly Features',
                'Discounted Pricing',
                'Locked-in Rate',
                'Premium "Verified" Badge',
                'Custom Discount Tags',
                'Exportable Appointment Reports',
                'Advanced SEO visibility'
            ]
        },
        {
            id: 'yearly',
            tier: 'pro',
            months: 12,
            name: 'Annual Pro',
            price: '₹3599',
            originalPrice: '₹4788',
            period: 'for 12 months',
            discount: 'Save 25%',
            description: 'Maximum value for serious businesses.',
            icon: Sparkles,
            color: 'from-purple-500 to-pink-600',
            features: [
                'All 6-Month Features',
                'Highest Discount Rate',
                'Year-long Peace of Mind',
                'Top Spot in Category Search',
                'Early Access to New Features',
                'One-on-one Growth Session',
                'Featured for Full Year'
            ]
        }
    ];

    const plans = isServiceStore ? servicePlans : productPlans;


    const handlePayment = async () => {
        if (!selectedPlan || !user) return;

        setProcessing(true);
        let subscriptionId = '';

        try {
            const subRes = await fetch('/api/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: selectedPlan.id,
                    email: user.email,
                    phone: user.phone || '9999999999'
                })
            });

            const subData = await subRes.json();

            if (subData.error === 'MISSING_RAZORPAY_KEYS') {
                toast.error("Contact Admin: Backend Razorpay Keys Missing");
                setProcessing(false);
                return;
            }

            if (subData.error) {
                toast.error("Subscription Error", { description: subData.details });
                setProcessing(false);
                return;
            }

            subscriptionId = subData.subscription_id;
        } catch (e) {
            toast.error("Network Error: Could not connect to server.");
            setProcessing(false);
            return;
        }

        const options = {
            key: "rzp_live_SOdEdShZkzzIyY",
            subscription_id: subscriptionId,
            name: "BellBasket",
            description: `${selectedPlan.name} Subscription`,
            handler: async function (response: any) {
                try {
                    const isMonthly = selectedPlan.id === 'monthly';
                    await updatePlan(selectedPlan.tier, selectedPlan.months, isMonthly);
                    setShowPayment(false);
                    toast.success(`Welcome to ${selectedPlan.name}!`, {
                        description: `Your subscription is now active for ${selectedPlan.months} months.`
                    });
                    navigate('/vendor');
                } catch (error) {
                    toast.error("Failed to update plan. Please contact support.");
                } finally {
                    setProcessing(false);
                }
            },
            prefill: {
                name: user.name,
                email: user.email,
            },
            theme: {
                color: "#eab308"
            },
            modal: {
                ondismiss: function () {
                    setProcessing(false);
                }
            }
        };

        try {
            await (window as any).loadRazorpay();
            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', (resp: any) => {
                toast.error(resp.error.description);
                setProcessing(false);
            });
            rzp.open();
        } catch (err) {
            toast.error("Payment initialization failed");
            setProcessing(false);
        }
    };

    const handleClaimCoupon = async () => {
        if (globalSettings.disableCoupons) {
            toast.error("Coupons are temporarily disabled.");
            return;
        }

        const inputCode = couponCode.trim().toUpperCase();
        if (!inputCode) {
            toast.error("Please enter a coupon code.");
            return;
        }

        if (!auth.currentUser) {
            toast.error("Authentication required", {
                description: "You must be logged in to redeem coupons. Please try logging in again."
            });
            return;
        }

        setIsClaiming(true);

        try {
            console.log("Attempting to redeem coupon:", inputCode);
            
            let couponData: any = null;
            let couponId: string | null = null;
            let allAvailableCodes = "";

            // 1. Precise Firestore query
            const q = query(collection(db, "coupons"), where("code", "==", inputCode));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const dc = querySnapshot.docs[0];
                couponData = dc.data();
                couponId = dc.id;
            } else {
                // 2. FALLBACK: Fetch all coupons manually (handles common Firestore indexing issues)
                console.log("Precise query found nothing. Running manual fallback match...");
                const allCouponsSnap = await getDocs(collection(db, "coupons"));
                const allCoupons = allCouponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
                
                allAvailableCodes = allCoupons.map(c => c.code).join(", ");
                const manualMatch = allCoupons.find(c => c.code?.trim().toUpperCase() === inputCode);

                if (manualMatch) {
                    couponData = manualMatch;
                    couponId = manualMatch.id;
                }
            }

            if (!couponData) {
                toast.error("Invalid Coupon Code", {
                    description: "This code does not exist in our system. Please check for typos."
                });
                setIsClaiming(false);
                return;
            }

            const currentEmail = auth.currentUser.email || 'unknown';

            // Check usage limits
            if (couponData.usageType === 'multiple') {
                const usedByList = couponData.usedByList || [];
                if (usedByList.includes(currentEmail)) {
                    toast.error("Coupon Already Used", { description: "You have already redeemed this code." });
                    setIsClaiming(false);
                    return;
                }
            } else if (couponData.isUsed) {
                toast.error("Coupon Already Used", { description: "This code has already been redeemed." });
                setIsClaiming(false);
                return;
            }

            // Sync with AppContext - force numbers for months
            try {
                await updatePlan(couponData.plan, Number(couponData.months || 1));
            } catch (planErr: any) {
                console.error("Plan update failed:", planErr);
                throw new Error(`PLAN_UPDATE_FAILED: ${planErr.message || "Permissions blocked."}`);
            }
            
            // Mark as used in database
            try {
                const updateData: any = {
                    redemptionCount: (couponData.redemptionCount || 0) + 1,
                    usedByList: [...(couponData.usedByList || []), currentEmail],
                    usedAt: new Date().toISOString()
                };
                
                if (couponData.usageType !== 'multiple') {
                    updateData.isUsed = true;
                    updateData.usedBy = currentEmail;
                }

                await updateDoc(doc(db, "coupons", couponId!), updateData);
            } catch (writeErr: any) {
                console.error("Coupon write stage failed:", writeErr);
                // We don't throw here so the user sees success (since plan was updated), 
                // but we might want to warn them. Usually better to finish the success flow.
            }

            toast.success("Successfully Redeemed!", {
                description: `Your plan has been upgraded to ${couponData.plan.toUpperCase()} for ${couponData.months} months.`,
                icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
            });
            
            setCouponCode("");
            
            // Optional: redirect to dashboard to see changes
            setTimeout(() => {
                navigate('/vendor');
            }, 2000);

        } catch (e: any) {
            console.error("Redemption error:", e);
            const errorMsg = e.message || "An unexpected error occurred.";
            
            if (errorMsg.includes("PLAN_UPDATE_FAILED")) {
                 toast.error("Upgrade Failed", { description: "We couldn't update your plan. Please check your internet or retry." });
            } else {
                 toast.error("Redemption Failed", { description: errorMsg });
            }
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-24 pb-44 px-4 max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
                        Grow Your <span className="text-primary">Business</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Choose a duration that fits your goals and save more with long-term plans.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`relative flex flex-col glass-strong rounded-[32px] overflow-hidden transition-all duration-500 cursor-pointer ${
                                (selectedPlan?.id === plan.id || user?.plan === plan.tier) 
                                ? 'ring-4 ring-primary ring-offset-4 ring-offset-background scale-[1.05] z-10'
                                : 'hover:scale-[1.02] opacity-80 hover:opacity-100'
                            } ${plan.popular ? 'shadow-2xl shadow-primary/20' : ''}`}
                            onClick={() => setSelectedPlan(plan)}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0">
                                    <div className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-6 py-1.5 rounded-bl-2xl shadow-lg">
                                        Best Value
                                    </div>
                                </div>
                            )}

                            {user?.plan === plan.tier && (
                                <div className="absolute top-0 left-0">
                                    <div className="bg-green-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-1.5 rounded-br-2xl shadow-lg flex items-center gap-1.5">
                                        <Check className="w-3 h-3" />
                                        Current Plan
                                    </div>
                                </div>
                            )}

                            <div className="p-8 pb-0">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white shadow-lg mb-6`}>
                                    <plan.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-2xl font-black text-foreground mb-2">{plan.name}</h3>
                                <div className="flex items-center gap-2 mb-2">
                                    {plan.discount && (
                                        <span className="bg-green-500/10 text-green-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-green-500/20">
                                            {plan.discount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed h-10">{plan.description}</p>
                                {user?.plan === plan.tier && user?.subscriptionExpiry && (
                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Expires: {new Date(user.subscriptionExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-8">
                                <div className="mb-8">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-foreground">{plan.price}</span>
                                        {plan.originalPrice && (
                                            <span className="text-lg text-muted-foreground line-through font-bold">{plan.originalPrice}</span>
                                        )}
                                    </div>
                                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{plan.period}</span>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {plan.features.map(feature => (
                                        <div key={feature} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="w-3 h-3 text-green-500" />
                                            </div>
                                            <span className="text-sm text-muted-foreground font-medium">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPlan(plan);
                                        setShowPayment(true);
                                    }}
                                    className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all group ${
                                        user?.plan === plan.tier
                                        ? 'bg-green-600 text-white'
                                        : plan.popular
                                          ? 'bg-primary text-primary-foreground hover:scale-[1.02]'
                                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                                >
                                    {user?.plan === plan.tier ? "Plan Active" : "Choose Plan"} 
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Coupon Claim Section */}
                <div ref={couponRef} className="mt-20 glass rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 max-w-4xl mx-auto border-white/40">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full md:w-auto text-center sm:text-left">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 shadow-inner">
                            <Ticket className="w-10 h-10" />
                        </div>
                        <div className="flex-1 w-full">
                            <h4 className="text-2xl font-black text-foreground mb-1">Have a Promo Coupon?</h4>
                            {globalSettings.disableCoupons ? (
                                <p className="text-sm text-destructive font-black uppercase tracking-widest mt-2">Redemptions are temporarily disabled.</p>
                            ) : (
                                <p className="text-sm text-muted-foreground mb-6">Enter your secret code to claim free subscription months.</p>
                            )}
                            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto sm:mx-0">
                                <input
                                    type="text"
                                    placeholder="ENTER CODE"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    disabled={globalSettings.disableCoupons}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white border border-border outline-none font-black tracking-widest text-base text-black placeholder:text-black/40"
                                />
                                <button
                                    onClick={handleClaimCoupon}
                                    disabled={isClaiming || !couponCode.trim() || globalSettings.disableCoupons}
                                    className="sm:px-8 py-4 px-6 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Claim Now"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secure Payment Modal */}
            <AnimatePresence>
                {showPayment && selectedPlan && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowPayment(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="glass-strong rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${selectedPlan.color} rounded-t-[2rem]`} />
                            <button onClick={() => setShowPayment(false)} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>

                            {selectedPlan.id === 'monthly' && (
                                <div className="flex items-center gap-3 p-3 mb-6 bg-primary/5 rounded-xl border border-primary/20">
                                    <div className="relative flex items-center">
                                        <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                                            <Check className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground leading-none">Auto-Pay Enforced</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Automatically renews to prevent store downtime.</p>
                                    </div>
                                </div>
                            )}

                            <div className="text-center mb-8 pt-4">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                                    <CreditCard className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-foreground">Secure Payment</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Subscription for <span className="font-bold text-primary">{selectedPlan.name}</span>
                                </p>
                            </div>

                            <div className="bg-secondary/30 rounded-xl p-4 mb-8">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-muted-foreground">Duration</span>
                                    <span className="font-bold text-foreground">{selectedPlan.period}</span>
                                </div>
                                {selectedPlan.originalPrice && (
                                    <div className="flex justify-between items-center text-sm mb-2 text-green-600">
                                        <span className="font-medium">Total Discount</span>
                                        <span className="font-bold">-{selectedPlan.discount}</span>
                                    </div>
                                )}
                                <div className="h-px bg-border my-3" />
                                <div className="flex justify-between items-center font-black text-xl">
                                    <span>To Pay</span>
                                    <span className="text-primary">{selectedPlan.price}</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={processing}
                                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                            >
                                {processing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>Pay {selectedPlan.price} & Upgrade <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>

                            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                100% Encrypted Payment
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VendorPlans;
