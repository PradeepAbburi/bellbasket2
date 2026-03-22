import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Check, ArrowRight, Star, ShieldCheck, Zap, Sparkles, Building2, CreditCard, Lock, Loader2, X, Shield, Ticket } from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

const VendorSubscription = () => {
    const { user, updatePlan } = useApp();
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
            // Small delay to allow scroll to start, then focus
            setTimeout(() => {
                const input = couponRef.current?.querySelector('input');
                if (input) input.focus();
            }, 500);
        }
    }, []);

    type PlanId = 'basic' | 'growth' | 'pro';

    const plans: {
        id: PlanId;
        name: string;
        price: string;
        description: string;
        icon: any;
        color: string;
        features: string[];
        popular?: boolean;
        period?: string;
    }[] = [
            {
                id: 'basic',
                name: 'Basic Plan',
                price: '₹99',
                period: 'per month',
                description: 'For small kirana shops.',
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
                name: 'Growth Plan',
                price: '₹199',
                period: 'per month',
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
                    'Priority customer support',
                    'Custom store timings'
                ]
            },
            {
                id: 'pro',
                name: 'Pro Plan',
                price: '₹399',
                period: 'per month',
                description: 'For serious supermarkets.',
                icon: Crown,
                color: 'from-amber-400 to-yellow-600',
                features: [
                    'Everything in Growth +',
                    'Unlimited Product Listings',
                    'Highlighted listing at top',
                    'Sponsored placement',
                    'Store Editor (Theme & Branding)',
                    'Customer repeat analytics',
                    'Downloadable sales reports (PDF)',
                    'Custom discount tags',
                    'Store logo watermark'
                ]
            }
        ];

    const handlePayment = async () => {
        if (!selectedPlan || !user) return;

        setProcessing(true);

        const amountInPaise = parseInt(selectedPlan.price.replace('₹', '')) * 100;
        let subscriptionId = '';

        try {
            // Initiate server-side Subscription creation for Real Auto-Pay mapping
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
                toast.error("Contact Admin: Backend Razorpay Keys Missing", {
                    description: "Auto-pay requires RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET environment variables. Add them in Vercel to launch AutoPay.",
                    duration: 10000
                });
                setProcessing(false);
                return;
            }

            if (subData.error) {
                toast.error("AutoPay Server Error", {
                    description: subData.details || "Failed to create subscription mandate securely. Contact admin.",
                    duration: 10000
                });
                setProcessing(false);
                return;
            }

            subscriptionId = subData.subscription_id;
        } catch (e) {
            toast.error("Network Error: Could not connect to subscription server.");
            setProcessing(false);
            return;
        }

        const options = {
            key: "rzp_live_SOdEdShZkzzIyY", // Live API KEY provided
            subscription_id: subscriptionId, // Forces the Razorpay Checkout to mount the AutoPay mandate
            name: "BellBasket",
            description: `${selectedPlan.name} Subscription`,
            handler: async function (response: any) {
                try {
                    await updatePlan(selectedPlan.id, 1, true); // AutoPay is now mandatory
                    setShowPayment(false);
                    toast.success(`Welcome to ${selectedPlan.name} Plan!`, {
                        description: `Payment ID: ${response.razorpay_payment_id}\nYour subscription is now active.`
                    });
                } catch (error) {
                    toast.error("Failed to update plan after successful payment. Please contact support.");
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
            // First explicitly load the Razorpay script into the DOM
            await (window as any).loadRazorpay();
        } catch (scriptError) {
            toast.error("Ad Blocker Detected", {
                description: "Our secure payment gateway was blocked by your browser/ad-blocker. Please disable ad-blockers for this site to upgrade.",
                duration: 6000
            });
            setProcessing(false);
            return;
        }

        if (typeof (window as any).Razorpay === 'undefined') {
            toast.error("Ad Blocker Detected", {
                description: "Our secure payment gateway was blocked by your browser/ad-blocker. Please disable ad-blockers for this site to upgrade.",
                duration: 6000
            });
            setProcessing(false);
            return;
        }

        try {
            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast.error(response.error.description);
                setProcessing(false);
            });
            rzp.open();
        } catch (error) {
            toast.error("Payment initialization failed", {
                description: "An unexpected error occurred while loading the payment gateway."
            });
            setProcessing(false);
        }
    };

    const handleClaimCoupon = async () => {
        if (globalSettings.disableCoupons) {
            toast.error("Coupons are currently disabled by the administrator.");
            return;
        }
        if (!couponCode.trim() || !auth.currentUser) return;
        setIsClaiming(true);

        try {
            const inputCode = couponCode.trim().toUpperCase();
            console.log("Starting coupon claim for:", inputCode);

            // diagnostic: check auth
            if (!auth.currentUser) {
                console.error("No active Firebase Auth session found.");
                toast.error("Auth Session Required", {
                    description: "You must be logged in with a real account to redeem coupons. Please try logging out and in again."
                });
                setIsClaiming(false);
                return;
            }

            const currentEmail = auth.currentUser.email || 'unknown';

            let couponData: any = null;
            let couponId: string | null = null;
            let isLocal = false;

            let allAvailableCodes = "";

            // 1. Try Firestore with where query
            console.log("Fetching coupon from Firestore...");
            let q = query(collection(db, "coupons"), where("code", "==", inputCode));
            let querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const dc = querySnapshot.docs[0];
                couponData = dc.data();
                couponId = dc.id;
                console.log("Found coupon in Firestore via index:", couponId);
            } else {
                // FALLBACK: Query without index to see if it's an index/cache issue
                console.log("Standard query failed. Fetching all coupons manually...");
                const allCouponsSnap = await getDocs(collection(db, "coupons"));
                const allCoupons = allCouponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

                allAvailableCodes = allCoupons.map(c => c.code).join(", ");
                const manualMatch = allCoupons.find(c => c.code === inputCode);

                if (manualMatch) {
                    couponData = manualMatch;
                    couponId = manualMatch.id;
                    console.log("Found coupon manually via map:", couponId);
                } else {
                    // 2. Try Local Storage fallback
                    console.log("Coupon not in Firestore anywhere, checking local storage...");
                    const localCoupons = JSON.parse(localStorage.getItem('bellbasket_local_coupons') || '[]');
                    const localMatch = localCoupons.find((c: any) => c.code === inputCode);
                    if (localMatch) {
                        couponData = localMatch;
                        couponId = localMatch.id;
                        isLocal = true;
                        console.log("Found coupon in local storage:", couponId);
                    }
                }
            }

            if (!couponData) {
                toast.error("DB Match Failed", {
                    description: `Wanted [${inputCode}]. DB has [${allAvailableCodes.substring(0, 150)}]`,
                    duration: 15000
                });
                setIsClaiming(false);
                return;
            }

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

            // Apply Plan
            console.log("Triggering updatePlan...");
            try {
                await updatePlan(couponData.plan, couponData.months);
                console.log("Plan updated successfully.");
            } catch (planError: any) {
                console.error("Failed at updatePlan stage:", planError);
                throw new Error(`PLAN_UPDATE_FAILED: ${planError.message || "Insufficient permissions to update subscription."}`);
            }

            // Mark coupon as used
            console.log("Marking coupon as used...");
            if (isLocal) {
                const localCoupons = JSON.parse(localStorage.getItem('bellbasket_local_coupons') || '[]');
                const updated = localCoupons.map((c: any) =>
                    c.id === couponId ? { 
                        ...c, 
                        isUsed: c.usageType === 'multiple' ? false : true, 
                        usedBy: currentEmail, 
                        usedByList: [...(c.usedByList || []), currentEmail],
                        redemptionCount: (c.redemptionCount || 0) + 1,
                        usedAt: new Date().toISOString() 
                    } : c
                );
                localStorage.setItem('bellbasket_local_coupons', JSON.stringify(updated));
            } else {
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
                } catch (writeError: any) {
                    console.error("Failed at coupon write stage:", writeError);
                    throw new Error(`COUPON_WRITE_FAILED: ${writeError.message || "Insufficient permissions to mark coupon as used."}`);
                }
            }

            toast.success("Redeemed Successfully!", {
                description: `Success! Your vendor account is now on the ${couponData.plan} plan for ${couponData.months} months.`
            });
            setCouponCode("");
        } catch (e: any) {
            console.error("Coupon claim error details:", e);
            const errorMsg = e.message || e.toString();

            if (errorMsg.includes("PLAN_UPDATE_FAILED")) {
                toast.error("Plan Upgrade Failed", { description: "Cloud permissions blocked your plan update." });
            } else if (errorMsg.includes("COUPON_WRITE_FAILED")) {
                toast.error("Finalization Failed", { description: "Plan granted, but coupon sync failed. Contact Admin." });
            } else if (errorMsg.includes("permission")) {
                toast.error("Access Denied", { description: "Firebase blocked the request. Please check your account session." });
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
                        Choose Your <span className="text-primary">Growth</span> Path
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Scale your business with tools designed for local commerce. Cancel anytime.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`relative flex flex-col glass-strong rounded-[32px] overflow-hidden transition-all duration-500 cursor-pointer ${selectedPlan?.id === plan.id || user?.plan === plan.id
                                ? 'ring-4 ring-primary ring-offset-4 ring-offset-background scale-[1.05] z-10'
                                : 'hover:scale-[1.02] opacity-80 hover:opacity-100'
                                } ${plan.popular ? 'shadow-2xl shadow-primary/20' : ''}`}
                            onClick={() => setSelectedPlan(plan)}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0">
                                    <div className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-6 py-1.5 rounded-bl-2xl shadow-lg">
                                        Most Popular
                                    </div>
                                </div>
                            )}

                            <div className="p-8 pb-0">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white shadow-lg mb-6`}>
                                    <plan.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-2xl font-black text-foreground mb-2">{plan.name}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed h-10">{plan.description}</p>
                            </div>

                            <div className="p-8">
                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-4xl font-black text-foreground">{plan.price}</span>
                                    {plan.period && <span className="text-sm font-bold text-muted-foreground">{plan.period}</span>}
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
                                        if (user?.plan === plan.id) return;
                                        setSelectedPlan(plan);
                                        setShowPayment(true);
                                    }}
                                    className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all group ${user?.plan === plan.id
                                        ? 'bg-green-500 text-white cursor-default shadow-lg shadow-green-500/20'
                                        : plan.popular
                                            ? 'gradient-primary text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-[1.02]'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                        }`}
                                >
                                    {user?.plan === plan.id ? (
                                        <><Check className="w-4 h-4" /> Current Plan</>
                                    ) : (
                                        <>{`Get ${plan.name}`} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                    )}
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
                                <p className="text-sm text-destructive font-black uppercase tracking-widest mt-2">Redemptions are temporarily disabled by admin.</p>
                            ) : (
                                <p className="text-sm text-muted-foreground mb-6">Enter your secret code to claim free subscription months.</p>
                            )}
                            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto sm:mx-0">
                                <input
                                    type="text"
                                    placeholder={globalSettings.disableCoupons ? "LOCKED" : "ENTER CODE"}
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    disabled={globalSettings.disableCoupons}
                                    className={`flex-1 px-6 py-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-border focus:ring-4 focus:ring-primary/10 outline-none font-black tracking-widest text-center sm:text-left text-base ${globalSettings.disableCoupons ? 'opacity-50 grayscale' : ''}`}
                                />
                                <button
                                    onClick={handleClaimCoupon}
                                    disabled={isClaiming || !couponCode.trim() || globalSettings.disableCoupons}
                                    className="sm:px-8 py-4 px-6 rounded-2xl gradient-primary text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : (globalSettings.disableCoupons ? <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Locked</span> : "Claim Now")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Custom Plan / Talk to Sales */}
                <div className="mt-8 glass rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 max-w-4xl mx-auto border-white/40 opacity-80">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                            <Star className="w-8 h-8 text-accent animate-pulse" />
                        </div>
                        <div className="text-center md:text-left">
                            <h4 className="text-xl font-black text-foreground">Need a custom plan?</h4>
                            <p className="text-sm text-muted-foreground">Contact our support team for a tailored solution for your franchise.</p>
                        </div>
                    </div>
                    <button className="px-8 py-3 rounded-xl glass-strong font-bold hover:bg-white transition-colors">
                        Talk to Sales
                    </button>
                </div>
            </div>

            {/* Secure Payment Modal (Generic) */}
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
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-2 gradient-primary" />
                            <button
                                onClick={() => setShowPayment(false)}
                                className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>

                            <div className="text-center mb-8 pt-4">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                                    <CreditCard className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-foreground">Secure Payment</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Upgrading to <span className="font-bold text-primary">{selectedPlan.name}</span>
                                </p>
                            </div>

                            <div className="bg-secondary/30 rounded-xl p-4 mb-8">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-muted-foreground">Subscription</span>
                                    <span className="font-bold text-foreground">{selectedPlan.price}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Billed</span>
                                    <span className="font-bold text-foreground">Monthly</span>
                                </div>
                                <div className="h-px bg-border my-3" />
                                <div className="flex justify-between items-center font-black text-lg">
                                    <span>Total</span>
                                    <span className="text-primary">{selectedPlan.price}</span>
                                </div>
                            </div>

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

                            <button
                                onClick={handlePayment}
                                disabled={processing}
                                className="w-full py-4 rounded-xl gradient-primary text-primary-foreground font-bold shadow-xl hover:shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                {processing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Pay {selectedPlan.price} & Upgrade <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-[10px] text-muted-foreground mt-4 flex items-center justify-center gap-1">
                                <Shield className="w-3 h-3" />
                                Payments are secure and encrypted
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VendorSubscription;
