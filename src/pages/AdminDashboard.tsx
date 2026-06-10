import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, setDoc, writeBatch, getDoc, deleteDoc } from "firebase/firestore";
import { Users, FileText, MessageCircle, Search, Shield, Activity, User, AlertCircle, CheckCircle2, Clock, Lock, Store as StoreIcon, ShoppingBag, TrendingUp, Ban, Loader2, Crown, Zap, RefreshCcw, Ticket, Plus, Trash2, Check, UserCircle, BarChart2, Eye, EyeOff, StickyNote } from "lucide-react";
import { PlanTier, Coupon, Store } from "@/types";
import { generateSlug } from "@/utils/seo";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { toast } from "sonner";
import PageLoading from "@/components/PageLoading";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CATEGORY_METADATA } from "@/constants/categories";

const AdminDashboard = () => {
    const { user, loading, logout } = useApp();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'users' | 'stores' | 'reports' | 'support' | 'coupons' | 'referrals' | 'analytics' | 'notes'>('users');
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
    const [syncCountdown, setSyncCountdown] = useState(5);
    const [lastSync, setLastSync] = useState(new Date());
    const [userList, setUserList] = useState<any[]>([]);
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [supportTickets, setSupportTickets] = useState<any[]>([]);
    const [localTickets, setLocalTickets] = useState<any[]>([]);
    const [reportList, setReportList] = useState<any[]>([]);
    const [storeList, setStoreList] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'vendor'>('all');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [couponList, setCouponList] = useState<Coupon[]>([]);
    const [newCouponMonths, setNewCouponMonths] = useState(1);
    const [newCouponPlan, setNewCouponPlan] = useState<PlanTier>('pro');
    const [isGenerating, setIsGenerating] = useState(false);
    const [newCouponUsageType, setNewCouponUsageType] = useState<'single' | 'multiple'>('single');
    const [isSyncingSlugs, setIsSyncingSlugs] = useState(false);
    const [globalSettings, setGlobalSettings] = useState<{ disableCoupons?: boolean }>({});
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
    const [isDeletingCoupon, setIsDeletingCoupon] = useState<string | null>(null);
    const [referralList, setReferralList] = useState<any[]>([]);
    const [newAgentName, setNewAgentName] = useState("");
    const [newReferralId, setNewReferralId] = useState("");
    const [newLoginId, setNewLoginId] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newStaffEmail, setNewStaffEmail] = useState("");
    const [newStaffPhone, setNewStaffPhone] = useState("");
    const [showPartnerPassword, setShowPartnerPassword] = useState(false);
    const [newBankName, setNewBankName] = useState("");
    const [newAccountName, setNewAccountName] = useState("");
    const [newAccountNumber, setNewAccountNumber] = useState("");
    const [newIfsc, setNewIfsc] = useState("");
    const [payingPartnerId, setPayingPartnerId] = useState<string | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [isCreatingReferral, setIsCreatingReferral] = useState(false);
    const [employeeImage, setEmployeeImage] = useState<string | null>(null);
    const [staffSearchQuery, setStaffSearchQuery] = useState("");
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

    const [adminNotes, setAdminNotes] = useState<any[]>([]);
    const [newNoteTitle, setNewNoteTitle] = useState("");
    const [newNoteContent, setNewNoteContent] = useState("");
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [isSavingNote, setIsSavingNote] = useState(false);

    const handleSaveAdminNote = async () => {
        if (!newNoteTitle.trim() || !user) {
            toast.error("Please enter a note title");
            return;
        }
        setIsSavingNote(true);
        try {
            const noteData = {
                vendorId: user.id,
                itemName: newNoteTitle.trim(),
                description: newNoteContent.trim(),
                quantity: "Admin Note",
                type: 'admin_note',
                createdAt: new Date().toISOString()
            };

            if (editingNoteId) {
                await updateDoc(doc(db, "notes", editingNoteId), {
                    itemName: newNoteTitle.trim(),
                    description: newNoteContent.trim(),
                    updatedAt: new Date().toISOString()
                });
                toast.success("Note updated successfully");
            } else {
                await addDoc(collection(db, "notes"), noteData);
                toast.success("Note saved successfully");
            }

            setNewNoteTitle("");
            setNewNoteContent("");
            setEditingNoteId(null);
        } catch (e: any) {
            console.error("Save note failed:", e);
            toast.error("Failed to save note");
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleDeleteAdminNote = async (noteId: string) => {
        if (!window.confirm("Are you sure you want to delete this note?")) return;
        try {
            await deleteDoc(doc(db, "notes", noteId));
            toast.success("Note deleted successfully");
        } catch (e) {
            console.error("Delete note failed:", e);
            toast.error("Failed to delete note");
        }
    };

    const handleDeleteCoupon = async (couponId: string) => {
        if (!window.confirm("Are you sure you want to delete this coupon?")) return;
        setIsDeletingCoupon(couponId);
        try {
            await deleteDoc(doc(db, "coupons", couponId));
            toast.success("Coupon deleted successfully");
        } catch (e) {
            console.error("Delete failed:", e);
            toast.error("Failed to delete coupon");
        } finally {
            setIsDeletingCoupon(null);
        }
    };

    const handleToggleDisableCoupons = async () => {
        setIsUpdatingSettings(true);
        try {
            const newStatus = !globalSettings.disableCoupons;
            await setDoc(doc(db, "config", "global"), {
                disableCoupons: newStatus
            }, { merge: true });
            setGlobalSettings(prev => ({ ...prev, disableCoupons: newStatus }));
            toast.success(newStatus ? "Coupons disabled globally" : "Coupons enabled globally");
        } catch (e) {
            console.error("Failed to update settings:", e);
            toast.error("Failed to update global settings");
        } finally {
            setIsUpdatingSettings(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'hr') {
            navigate('/hr');
        }
    }, [user, navigate]);

    useEffect(() => {
        const fetchGlobalSettings = async () => {
            try {
                const snap = await getDoc(doc(db, "config", "global"));
                if (snap.exists()) {
                    setGlobalSettings(snap.data());
                }
            } catch (e) {
                console.error("Failed to fetch settings:", e);
            }
        };
        fetchGlobalSettings();
    }, []);

    const handleSyncAllSlugs = async () => {
        setIsSyncingSlugs(true);
        try {
            const batch = writeBatch(db);
            const storesSnap = await getDocs(collection(db, "stores"));
            let count = 0;

            storesSnap.docs.forEach(storeDoc => {
                const data = storeDoc.data() as Store;
                if (!data.slug) {
                    const area = data.address?.split(',')[0] || 'area';
                    const slug = generateSlug(data.name, area);
                    batch.update(doc(db, "stores", storeDoc.id), { slug });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                toast.success(`Successfully generated slugs for ${count} stores!`);
            } else {
                toast.info("All stores already have SEO slugs.");
            }
        } catch (e) {
            console.error("Slug sync failed:", e);
            toast.error("Failed to sync store slugs.");
        } finally {
            setIsSyncingSlugs(false);
        }
    };

    const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
        setIsProcessing(userId);
        try {
            const newStatus = !currentStatus;
            await updateDoc(doc(db, "users", userId), {
                isBlocked: newStatus
            });

            // Also update the store document if it exists
            try {
                const storeRef = doc(db, "stores", userId);
                const storeSnap = await getDoc(storeRef);
                if (storeSnap.exists()) {
                    await updateDoc(storeRef, { isBlocked: newStatus });
                }
            } catch (e) {
                console.error("Failed to sync block status to store:", e);
            }

            toast.success(currentStatus ? "User unblocked successfully" : "User blocked successfully", {
                icon: currentStatus ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Ban className="w-4 h-4 text-destructive" />
            });
        } catch (e) {
            toast.error("Failed to update user status");
        } finally {
            setIsProcessing(null);
        }
    };

    useEffect(() => {
        if (!loading && (!user?.id || (user?.role !== 'admin' && user?.role !== 'hr'))) {
            navigate('/auth');
        } else if (user?.role === 'hr') {
            setActiveTab('referrals');
        }
    }, [user?.id, user?.role, loading, navigate]);

    const fetchData = async () => {
        if (!user || (user.role !== 'admin' && user.role !== 'hr')) return;
        setIsLoadingData(true);
        try {
            // Manual fetch for absolute accuracy
            const [usersSnap, ordersSnap, storesSnap, couponsSnap, referralsSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "orders")),
                getDocs(collection(db, "stores")),
                getDocs(collection(db, "coupons")),
                getDocs(collection(db, "referrals"))
            ]);

            const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            const stores = storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const coupons = couponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));

            setUserList(users);
            setAllOrders(orders);
            setStoreList(stores);
            setCouponList(coupons);
            setReferralList(referralsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setReportList(orders.map(o => ({ ...o, createdAt: (o as any).date, type: 'order_report' })));
            setLastSync(new Date());
            toast.success("System data synchronized", {
                icon: <RefreshCcw className="w-4 h-4 text-primary" />
            });
        } catch (e) {
            console.error("Manual sync error:", e);
            toast.error("Manual sync failed");
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        if (!user || (user.role !== 'admin' && user.role !== 'hr')) return;
        
        // Auto-increment Staff ID logic
        if (referralList.length > 0) {
            const numericalIds = referralList
                .map(r => {
                    const idStr = r.referralId || '';
                    const match = idStr.match(/\d+/);
                    return match ? parseInt(match[0]) : NaN;
                })
                .filter(id => !isNaN(id));
            
            const nextId = numericalIds.length > 0 ? Math.max(...numericalIds) + 1 : 1;
            setNewReferralId(nextId.toString());
        } else {
            setNewReferralId("1");
        }
    }, [referralList, user?.role]);

    useEffect(() => {
        if (!user || (user.role !== 'admin' && user.role !== 'hr')) return;
        setIsLoadingData(true);

        const unsubscribes: (() => void)[] = [];

        // 1. Users
        unsubscribes.push(onSnapshot(collection(db, "users"), (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setUserList(users);
        }, (err) => console.error("Users Sync Error:", err)));

        // 2. Orders
        unsubscribes.push(onSnapshot(collection(db, "orders"), (snapshot) => {
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            setAllOrders(orders);
            // Map order.date to report.date/createdAt
            setReportList(orders.map(o => ({ ...o, createdAt: (o as any).date, type: 'order_report' })));
            setLastSync(new Date());
        }, (err) => console.error("Orders Sync Error:", err)));

        // 3. Stores
        unsubscribes.push(onSnapshot(collection(db, "stores"), (snapshot) => {
            setStoreList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error("Stores Sync Error:", err)));

        // 4. Support
        unsubscribes.push(onSnapshot(collection(db, "support_requests"), (snapshot) => {
            const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setSupportTickets(tickets);
            setIsLoadingData(false);
        }, (err) => {
            console.error("Support Sync Error:", err);
            toast.error("Failed to sync support database");
            setIsLoadingData(false);
        }));

        // 5. Coupons
        unsubscribes.push(onSnapshot(collection(db, "coupons"), (snapshot) => {
            const cloudCoupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon))
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setCouponList(cloudCoupons);
        }, (err) => {
            toast.error("Failed to sync coupon database");
        }));

        // 6. Referrals
        unsubscribes.push(onSnapshot(collection(db, "referrals"), (snapshot) => {
            setReferralList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error("Referrals Sync Error:", err)));

        // 7. Admin Notes
        if (user?.id) {
            unsubscribes.push(onSnapshot(
                query(collection(db, "notes"), where("vendorId", "==", user.id)),
                (snapshot) => {
                    const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                    setAdminNotes(fetched);
                },
                (err) => console.error("Admin Notes Sync Error:", err)
            ));
        }

        // Safety timeout to ensure loader eventually disappears
        const safetyLoader = setTimeout(() => setIsLoadingData(false), 3000);

        return () => {
            unsubscribes.forEach(u => u());
            clearTimeout(safetyLoader);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.role]);

    useEffect(() => {
        const loadLocal = () => {
            const stored = localStorage.getItem('bellbasket_local_tickets');
            let parsed: any[] = [];
            if (stored) {
                try {
                    parsed = JSON.parse(stored);
                } catch (e) { console.error("Local ticket parse error", e); }
            }

            const seedEmail = 'contact@bellbasket.com';
            if (!parsed.some((t: any) => t.userEmail === seedEmail)) {
                const seedTicket = {
                    id: 'local-seed-' + Date.now(),
                    userId: 'seed-bellbasket',
                    userName: 'BellBasket Contact',
                    userEmail: seedEmail,
                    plan: 'Pro',
                    status: 'open',
                    details: 'Requesting priority mail assistance for Pro subscription.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    messages: [{
                        id: 's1',
                        text: 'Requesting priority mail assistance for Pro subscription.',
                        senderId: 'seed-bellbasket',
                        senderName: 'BellBasket Contact',
                        role: 'user',
                        timestamp: new Date().toISOString()
                    }]
                };
                parsed = [seedTicket, ...parsed];
                localStorage.setItem('bellbasket_local_tickets', JSON.stringify(parsed));
            }

            setLocalTickets(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(parsed)) return parsed;
                return prev;
            });
        };

        loadLocal();
        const interval = setInterval(loadLocal, 2000);
        const handleStorage = () => loadLocal();
        window.addEventListener('storage', handleStorage);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    useEffect(() => {
        // We rely on onSnapshot for real-time updates.
        // Polling removed to prevent data flicker after updates.
        const timer = setInterval(() => {
            setSyncCountdown(prev => {
                if (prev <= 1) return 5;
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const allSupportTickets = [...supportTickets, ...localTickets].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const filteredUsers = userList.filter(u => {
        const matchesSearch = (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || (u.role || 'customer') === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getUserMetrics = (userId: string, role: string) => {
        const isVendor = (role || 'customer') === 'vendor';
        const userOrders = allOrders.filter(o => isVendor ? o.storeId === userId : o.userId === userId);
        const totalVolume = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        return { count: userOrders.length, volume: totalVolume };
    };

    const handleGenerateCoupon = async () => {
        const months = Number(newCouponMonths);
        if (isNaN(months) || months < 1 || months > 24) {
            toast.error("Invalid duration", {
                description: "Requirement: 1-24 months only"
            });
            return;
        }

        setIsGenerating(true);
        try {
            const code = Math.random().toString(36).substring(2, 10).toUpperCase();

            if (!code || code.length < 3) {
                throw new Error("Code generation failed");
            }

            const couponData = {
                code,
                plan: newCouponPlan,
                months: months,
                usageType: newCouponUsageType,
                redemptionCount: 0,
                usedByList: [],
                isUsed: false,
                createdAt: new Date().toISOString()
            };

            // Check if user context exists
            if (!user) {
                throw new Error("Authentication required (Session lost)");
            }

            // Diagnostic: Check if we are actually authed in Firebase
            const { auth } = await import("@/lib/firebase");
            if (!auth.currentUser) {
                console.warn("Backdoor admin detected: Firestore may block this write if not authenticated in Firebase Auth.");
                toast.info("Unverified Session", {
                    description: "Writing to database without a cloud session. If this fails, please Log Out and Log In again."
                });
            }

            console.log("Adding coupon to database...", couponData);
            // Diagnostic: Ensure we have a REAL Firebase session
            const { auth: authCheck } = await import("@/lib/firebase");
            if (!authCheck.currentUser) {
                throw new Error("UNAUTHENTICATED_BACKDOOR: You are currently using the local bypass. To save to cloud, you must Log Out and Log In again to create a real Firebase session.");
            }

            await addDoc(collection(db, "coupons"), couponData);

            toast.success("Coupon Created (Cloud)", {
                description: `Code: ${code} successfully saved to Firebase.`
            });
        } catch (e: any) {
            console.error("Coupon generation error details:", e);
            const errorMsg = e.message || e.toString();

            if (errorMsg.includes("UNAUTHENTICATED")) {
                toast.error("Cloud Write Blocked", {
                    description: "You are in Backdoor Mode. Please Log Out and Log In again."
                });
            } else if (errorMsg.includes("permission")) {
                toast.error("Permission Denied (Rules)", {
                    description: "Firebase Cloud blocked the write. Please check your Firestore Rules."
                });
            } else {
                toast.error("Generation Failed", {
                    description: errorMsg || "Unknown error occurred."
                });
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveStaff = async () => {
        if (!newAgentName.trim() || !newReferralId.trim() || !newLoginId.trim() || !newPassword.trim()) {
            toast.error("Please fill in all fields (Name, Referral ID, Login ID, Password)");
            return;
        }

        setIsCreatingReferral(true);
        try {
            const rid = newReferralId.toUpperCase().trim();
            
            // If creating new, check if ID already exists
            if (!editingStaffId) {
                const existing = referralList.find(r => r.referralId === rid);
                if (existing) {
                    toast.error("Referral ID already exists");
                    setIsCreatingReferral(false);
                    return;
                }
            }

            const staffData = {
                agentName: newAgentName.trim(),
                referralId: rid,
                loginId: newLoginId.trim(),
                password: newPassword.trim(),
                email: newStaffEmail.trim(),
                phone: newStaffPhone.trim(),
                image: employeeImage,
                bankName: newBankName.trim(),
                accountName: newAccountName.trim(),
                accountNumber: newAccountNumber.trim(),
                ifsc: newIfsc.trim().toUpperCase(),
                updatedAt: new Date().toISOString()
            };

            if (editingStaffId) {
                await updateDoc(doc(db, "referrals", editingStaffId), staffData);
                toast.success("Staff profile updated successfully");
            } else {
                await addDoc(collection(db, "referrals"), {
                    ...staffData,
                    totalPaid: 0,
                    createdAt: new Date().toISOString()
                });
                toast.success("Staff member created successfully");
            }

            // Reset form
            setNewAgentName("");
            setNewReferralId("");
            setNewLoginId("");
            setNewPassword("");
            setNewStaffEmail("");
            setNewStaffPhone("");
            setEmployeeImage(null);
            setNewBankName("");
            setNewAccountName("");
            setNewAccountNumber("");
            setNewIfsc("");
            setEditingStaffId(null);
        } catch (e: any) {
            toast.error(editingStaffId ? "Update failed" : "Creation failed");
        } finally {
            setIsCreatingReferral(false);
        }
    };

    const handleEditStaff = (staff: any) => {
        setEditingStaffId(staff.id);
        setNewAgentName(staff.agentName || "");
        setNewReferralId(staff.referralId || "");
        setNewLoginId(staff.loginId || "");
        setNewPassword(staff.password || "");
        setNewStaffEmail(staff.email || "");
        setNewStaffPhone(staff.phone || "");
        setEmployeeImage(staff.image || null);
        setNewBankName(staff.bankName || "");
        setNewAccountName(staff.accountName || "");
        setNewAccountNumber(staff.accountNumber || "");
        setNewIfsc(staff.ifsc || "");
        
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.info(`Editing ${staff.agentName}`);
    };

    const handleRecordPayment = async (id: string, currentTotalPaid: number) => {
        if (!paymentAmount || paymentAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        try {
            await updateDoc(doc(db, "referrals", id), {
                totalPaid: (currentTotalPaid || 0) + paymentAmount,
                lastPaidAt: new Date().toISOString()
            });
            toast.success(`Successfully recorded ₹${paymentAmount} payment!`);
            setPayingPartnerId(null);
            setPaymentAmount(0);
        } catch (error) {
            toast.error("Failed to record payment");
        }
    };

    const handleDeleteReferral = async (id: string) => {
        if (!window.confirm("Delete this referral?")) return;
        try {
            await deleteDoc(doc(db, "referrals", id));
            toast.success("Referral deleted");
        } catch (e) {
            toast.error("Delete failed");
        }
    };

    const leaderboard = referralList.map(ref => {
        const referredVendors = userList.filter(u => u.role === 'vendor' && u.referralCode === ref.referralId);
        const count = referredVendors.length;

        let totalEarnings = 0;
        referredVendors.forEach(v => {
            const plan = v.plan || 'none';
            let price = 0;
            if (plan === 'basic') price = 99;
            else if (plan === 'growth') price = 199;
            else if (plan === 'pro') price = 399;

            totalEarnings += price * 0.3;
        });

        return {
            ...ref,
            count,
            earnings: totalEarnings
        };
    }).sort((a, b) => b.count - a.count);

    const unknownReferralsCount = userList.filter(u => u.role === 'vendor' && u.referralCode && !referralList.some(r => r.referralId === u.referralCode)).length;

    const filteredStaff = leaderboard.filter(item => 
        (item.agentName?.toLowerCase() || "").includes(staffSearchQuery.toLowerCase()) ||
        (item.referralId?.toLowerCase() || "").includes(staffSearchQuery.toLowerCase()) ||
        (item.loginId?.toLowerCase() || "").includes(staffSearchQuery.toLowerCase()) ||
        (item.email?.toLowerCase() || "").includes(staffSearchQuery.toLowerCase()) ||
        (item.phone?.toLowerCase() || "").includes(staffSearchQuery.toLowerCase())
    );

    if (loading || isLoadingData) return <PageLoading />;

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
                    <div className="text-center lg:text-left">
                        <h1 className="text-3xl font-black text-foreground flex items-center justify-center lg:justify-start gap-3">
                            <Shield className="w-8 h-8 text-primary shrink-0" />
                            Admin Command Center
                        </h1>
                        <div className="flex items-center justify-center lg:justify-start gap-2 mt-2">
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 ${syncCountdown === 5 ? 'scale-150' : ''}`}></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                                Syncing live • last pulse: <span className="text-primary font-black tabular-nums">{lastSync.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        {!loading && (
                            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl w-full sm:w-auto ${auth?.currentUser ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500 border border-red-600 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse'}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${auth?.currentUser ? 'bg-green-500 text-white' : 'bg-white text-red-600'}`}>
                                    {auth?.currentUser ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${auth?.currentUser ? 'text-green-600' : 'text-white'}`}>Cloud Connectivity</p>
                                    <p className={`text-xs font-bold ${auth?.currentUser ? 'text-green-700' : 'text-white'}`}>
                                        {auth?.currentUser ? 'Session Secure' : 'Sync Required'}
                                    </p>
                                </div>
                                {!auth?.currentUser && (
                                    <button
                                        onClick={() => { logout(); navigate('/auth'); }}
                                        className="ml-2 px-3 py-1.5 bg-white text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-white/90 transition-colors"
                                    >
                                        Fix
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="hidden sm:flex items-center gap-3 bg-secondary/50 rounded-2xl p-2 pr-6">
                            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center font-bold text-white shadow-lg shrink-0">{user?.role === 'hr' ? 'H' : 'A'}</div>
                            <div className="hidden xl:block">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Logged in as</p>
                                <p className="font-bold text-foreground">{user?.role === 'hr' ? 'HR Manager' : 'Super Admin'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-3 mb-8">
                    <button onClick={() => navigate('/admin/analytics')} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-border shadow-sm text-foreground font-black text-xs uppercase tracking-widest hover:bg-secondary transition-all">
                        <TrendingUp className="w-4 h-4 text-primary" /> User Analytics
                    </button>
                    <button onClick={() => navigate('/admin/moderation')} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive font-black text-xs uppercase tracking-widest hover:bg-destructive hover:text-white transition-all">
                        <Ban className="w-4 h-4" /> Moderation Center
                    </button>
                    <button onClick={fetchData} disabled={isLoadingData} className={`flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-border shadow-sm text-foreground font-black text-xs uppercase tracking-widest hover:bg-secondary transition-all ${isLoadingData ? 'opacity-50' : ''}`}>
                        <RefreshCcw className={`w-4 h-4 text-primary ${isLoadingData ? 'animate-spin' : ''}`} /> Force Sync
                    </button>
                    <button onClick={handleSyncAllSlugs} disabled={isSyncingSlugs} className={`flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all ${isSyncingSlugs ? 'opacity-50' : ''}`}>
                        <Zap className={`w-4 h-4 ${isSyncingSlugs ? 'animate-spin' : ''}`} /> Sync SEO Slugs
                    </button>
                    <button onClick={() => navigate('/admin/payments')} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                        <TrendingUp className="w-4 h-4" /> Staff Payments
                    </button>
                    <button onClick={() => navigate('/admin/partner-bank')} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                        <TrendingUp className="w-4 h-4" /> Staff Bank
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
                    {[
                        { label: 'Total Vendors', value: storeList.length, icon: StoreIcon, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                        { label: 'Total Stores', value: storeList.length, icon: StoreIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Total Customers', value: userList.filter(u => (u.role || 'customer') === 'customer' && u.role !== 'admin').length, icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'Orders Placed', value: allOrders.length, icon: ShoppingBag, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                        { label: 'Completed', value: allOrders.filter(o => o.status === 'completed').length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
                        { label: 'Revenue/Fees', value: '₹' + Math.floor(allOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0) * 0.05).toLocaleString(), icon: Crown, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                        { label: 'Active Coupons', value: couponList.filter(c => !c.isUsed).length, icon: Ticket, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { label: 'Total Redeemed', value: couponList.reduce((sum, c) => sum + (c.redemptionCount || 0), 0), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    ].map((stat, i) => (
                        <motion.div key={stat.label + i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg transition-all">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
                            <div className="min-w-0">
                                <p className="text-xl font-black text-foreground truncate">{stat.value}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{stat.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Main Tabs */}
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex bg-secondary/50 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto">
                        {[
                            { id: 'users', label: 'Users', icon: Users },
                            { id: 'stores', label: 'Stores', icon: StoreIcon },
                            { id: 'reports', label: 'Reports', icon: FileText },
                            { id: 'support', label: 'Support', icon: MessageCircle },
                            { id: 'coupons', label: 'Coupons', icon: Ticket },
                            { id: 'referrals', label: 'Staff', icon: UserCircle },
                            { id: 'analytics', label: 'Analytics', icon: BarChart2 },
                            { id: 'notes', label: 'Notes', icon: StickyNote },
                        ].filter(tab => user?.role === 'admin' || tab.id === 'referrals').map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-primary shadow-lg scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-white/05'}`}>
                                <tab.icon className="w-4 h-4" /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'users' && (
                        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                            <div className="flex bg-secondary/30 p-1 rounded-xl">
                                {(['all', 'customer', 'vendor'] as const).map(f => (
                                    <button key={f} onClick={() => setRoleFilter(f)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${roleFilter === f ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`}>{f}</button>
                                ))}
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-secondary/50 border-0 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="glass rounded-3xl overflow-hidden min-h-[400px]">
                    {activeTab === 'users' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/50 bg-secondary/30 text-xs font-black uppercase text-muted-foreground">
                                        <th className="p-5 w-20 tracking-widest">ID</th>
                                        <th className="p-5 tracking-widest">Identity</th>
                                        <th className="p-5 tracking-widest">Engagement</th>
                                        <th className="p-5 text-center tracking-widest">Status</th>
                                        <th className="p-5 text-right tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr><td colSpan={5} className="p-10 text-center text-muted-foreground font-bold italic">No users found.</td></tr>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/20">
                                                <td className="p-5 text-[10px] font-mono font-bold text-muted-foreground/60">{u.id.substring(0, 8)}</td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase">{u.name?.charAt(0) || u.email?.charAt(0) || '?'}</div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-foreground text-sm truncate flex items-center gap-1.5">{u.name || 'Anonymous'}{u.role === 'admin' && <Shield className="w-3 h-3 text-rose-500" />}</p>
                                                            <p className="text-[10px] font-bold text-muted-foreground truncate">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border border-blue-500/20">{u.role || 'customer'}</span>
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${u.plan === 'pro' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{u.plan || 'basic'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <button onClick={() => handleToggleBlock(u.id, !!u.isBlocked)} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${u.isBlocked ? 'bg-destructive' : 'bg-green-500'}`}>
                                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${u.isBlocked ? 'translate-x-5.5' : 'translate-x-1'}`} />
                                                    </button>
                                                </td>
                                                <td className="p-5 text-right"><Activity className="w-4 h-4 text-muted-foreground ml-auto" /></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'stores' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/50 bg-secondary/30 text-xs font-black uppercase text-muted-foreground">
                                        <th className="p-5 tracking-widest">Store</th>
                                        <th className="p-5 tracking-widest">Category</th>
                                        <th className="p-5 tracking-widest">Performance</th>
                                        <th className="p-5 text-right tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {storeList.map(s => (
                                        <tr key={s.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">{s.image ? <img src={s.image} className="w-full h-full object-cover" /> : <StoreIcon className="w-5 h-5 text-primary" />}</div>
                                                    <div>
                                                        <p className="font-black text-foreground text-sm">{s.name}</p>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{s.category || 'General'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span 
                                                    className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white text-black flex items-center gap-1.5 w-fit border border-black/5"
                                                >
                                                    {CATEGORY_METADATA[s.category]?.icon && (() => {
                                                        const Icon = CATEGORY_METADATA[s.category].icon;
                                                        return <Icon className="w-2.5 h-2.5" style={{ color: CATEGORY_METADATA[s.category]?.color || 'inherit' }} />;
                                                    })()}
                                                    {s.category || 'General'}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${s.plan === 'pro' ? 'bg-amber-100 text-amber-600 border-amber-200' : s.plan === 'growth' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                        {s.plan || 'none'}
                                                    </span>
                                                    {s.isBlocked && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-red-100 text-red-600 border border-red-200">Blocked</span>}
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${s.isOpen && !s.isBlocked && s.plan !== 'none' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {s.isBlocked ? 'Blocked' : s.plan === 'none' ? 'Expired' : s.isOpen ? 'Active' : 'Closed'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="p-6">
                            <h3 className="text-lg font-black mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> System Activity</h3>
                            <div className="space-y-4">
                                {reportList.map(r => (
                                    <div key={r.id} className="p-4 rounded-2xl bg-secondary/30 border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><ShoppingBag className="w-5 h-5" /></div>
                                            <div>
                                                <p className="font-black text-foreground text-sm">₹{r.total?.toLocaleString()}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground truncate">{r.storeName} • {new Date(r.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${r.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{r.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div className="p-6">
                            <h3 className="text-lg font-black mb-6 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" /> Active Tickets</h3>
                            <div className="grid gap-4">
                                {supportTickets.map(t => (
                                    <div key={t.id} className="p-4 rounded-2xl border border-border group hover:border-primary/30 transition-all bg-white/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-black text-foreground truncate">{t.userEmail}</p>
                                            <p className="text-[10px] text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <p className="text-sm text-foreground/80 line-clamp-2">{t.details || t.messages?.[0]?.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'coupons' && (
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 bg-secondary/30 rounded-3xl border border-border/50">
                                <div>
                                    <h3 className="text-xl font-black text-foreground mb-1">Coupon Controls</h3>
                                    <div className="flex items-center gap-3 mt-2">
                                        <button
                                            onClick={handleToggleDisableCoupons}
                                            disabled={isUpdatingSettings}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalSettings.disableCoupons ? 'bg-destructive' : 'bg-green-500'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalSettings.disableCoupons ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                            {globalSettings.disableCoupons ? "Coupons are Disabled" : "Coupons are Active"}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                    <select value={newCouponPlan} onChange={(e) => setNewCouponPlan(e.target.value as PlanTier)} className="bg-white px-4 py-2.5 rounded-xl text-sm font-bold border-0 outline-none shadow-sm">
                                        <option value="basic">Basic Plan</option>
                                        <option value="growth">Growth Plan</option>
                                        <option value="pro">Pro Merchant</option>
                                    </select>
                                    <select value={newCouponUsageType} onChange={(e) => setNewCouponUsageType(e.target.value as 'single' | 'multiple')} className="bg-white px-4 py-2.5 rounded-xl text-sm font-bold border-0 outline-none shadow-sm">
                                        <option value="single">Single Use</option>
                                        <option value="multiple">Multi Vendor</option>
                                    </select>
                                    <input type="number" value={newCouponMonths} onChange={(e) => setNewCouponMonths(parseInt(e.target.value))} min="1" max="24" className="bg-white px-4 py-2.5 rounded-xl text-sm font-bold w-20 border-0 outline-none shadow-sm" />
                                    <button onClick={handleGenerateCoupon} disabled={isGenerating} className="px-8 py-2.5 rounded-xl gradient-primary text-white font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all disabled:opacity-50">
                                        {isGenerating ? "Wait..." : "Create Code"}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {couponList.map(c => (
                                    <div key={c.id} className={`p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${c.isUsed ? 'bg-secondary/20 opacity-50' : 'bg-white shadow-sm border-primary/10'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${c.isUsed ? 'bg-slate-200' : 'bg-primary/10 text-primary'}`}><Ticket className="w-6 h-6" /></div>
                                            <div>
                                                <div
                                                    className="flex items-center gap-2 cursor-pointer hover:opacity-70 group"
                                                    onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Code copied!"); }}
                                                >
                                                    <p className="text-lg font-black tracking-widest text-foreground">{c.code}</p>
                                                    <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">📋 Copy</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{c.plan} • {c.months} Months • <span className="text-primary">{c.usageType || 'single'}</span></p>
                                                {c.isUsed && (
                                                    <p className="text-[9px] font-medium text-destructive mt-1 italic">
                                                        Redeemed by: {c.usedBy || 'Unknown User'} • {c.usedAt ? new Date(c.usedAt).toLocaleDateString() : 'Date missing'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${c.isUsed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {c.isUsed ? 'Redeemed' : 'Live'}
                                                </span>
                                                <p className="text-[10px] font-black text-muted-foreground tracking-tighter uppercase">
                                                    {c.redemptionCount || 0} Redeemed
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteCoupon(c.id)}
                                                disabled={isDeletingCoupon === c.id}
                                                className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all disabled:opacity-50"
                                            >
                                                {isDeletingCoupon === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'referrals' && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Create Section */}
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="p-6 bg-secondary/30 rounded-3xl border border-border/50">
                                        <h3 className="text-xl font-black text-foreground mb-4">Create Staff Profile</h3>
                                        <div className="space-y-4">
                                            <div className="flex flex-col items-center gap-4 p-4 rounded-2xl bg-white/50 border border-dashed border-primary/20 mb-2">
                                                {employeeImage ? (
                                                    <img src={employeeImage} alt="Preview" className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
                                                ) : (
                                                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                        <UserCircle className="w-10 h-10" />
                                                    </div>
                                                )}
                                                <label className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:scale-105 transition-all">
                                                    Upload Image
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/*" 
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                if (file.size > 200 * 1024) {
                                                                    toast.error("Image too large", { description: "Max size 200KB" });
                                                                    return;
                                                                }
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => setEmployeeImage(reader.result as string);
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Staff Name</label>
                                                <input
                                                    type="text"
                                                    value={newAgentName}
                                                    onChange={(e) => setNewAgentName(e.target.value)}
                                                    placeholder="e.g. Rahul Sharma"
                                                    className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Staff ID</label>
                                                <input
                                                    type="text"
                                                    value={newReferralId}
                                                    onChange={(e) => setNewReferralId(e.target.value.toUpperCase())}
                                                    placeholder="e.g. STAFF001"
                                                    className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Login ID</label>
                                                <input
                                                    type="text"
                                                    value={newLoginId}
                                                    onChange={(e) => setNewLoginId(e.target.value)}
                                                    placeholder="e.g. staff_rahul"
                                                    className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold mt-1"
                                                />
                                            </div>
                                            <div className="relative">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</label>
                                                <input
                                                    type={showPartnerPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Set password"
                                                    className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold mt-1 pr-12"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPartnerPassword(!showPartnerPassword)}
                                                    className="absolute right-4 bottom-3 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                                                >
                                                    {showPartnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-border/50">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Personal & Bank Details</h4>
                                                <div className="space-y-3 mb-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <input type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="Email Address" className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold" />
                                                        <input type="tel" value={newStaffPhone} onChange={(e) => setNewStaffPhone(e.target.value)} placeholder="Phone Number" className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold" />
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <input type="text" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="Bank Name" className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold" />
                                                    <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="Account Holder Name" className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold" />
                                                    <input type="text" value={newAccountNumber} onChange={(e) => setNewAccountNumber(e.target.value)} placeholder="Account Number" className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold" />
                                                    <input type="text" value={newIfsc} onChange={(e) => setNewIfsc(e.target.value)} placeholder="IFSC Code" className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold" />
                                                </div>
                                            </div>

                                            <div className="flex gap-3 mt-2">
                                                <button
                                                    onClick={handleSaveStaff}
                                                    disabled={isCreatingReferral}
                                                    className="flex-1 py-3 rounded-xl gradient-primary text-white font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                                                >
                                                    {isCreatingReferral ? (editingStaffId ? "Updating..." : "Creating...") : (editingStaffId ? "Update Profile" : "Generate Profile")}
                                                </button>
                                                {editingStaffId && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingStaffId(null);
                                                            setNewAgentName("");
                                                            setNewReferralId("");
                                                            setNewLoginId("");
                                                            setNewPassword("");
                                                            setNewStaffEmail("");
                                                            setNewStaffPhone("");
                                                            setEmployeeImage(null);
                                                            setNewBankName("");
                                                            setNewAccountName("");
                                                            setNewAccountNumber("");
                                                            setNewIfsc("");
                                                        }}
                                                        className="px-6 py-3 rounded-xl bg-secondary text-foreground font-black text-xs uppercase tracking-widest hover:bg-secondary/80 transition-all border border-border"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-2">Staff Stats</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-muted-foreground">Active Staff:</span>
                                                <span className="text-sm font-black text-foreground">{referralList.length}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-muted-foreground">Total Referred:</span>
                                                <span className="text-sm font-black text-foreground">{leaderboard.reduce((a, b) => a + b.count, 0)}</span>
                                            </div>
                                            {unknownReferralsCount > 0 && (
                                                <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                                                    <span className="text-xs font-bold text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Untracked IDs:</span>
                                                    <span className="text-sm font-black text-destructive">{unknownReferralsCount}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Directory Section */}
                                <div className="lg:col-span-2">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                        <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-primary" />
                                            Staff Directory
                                        </h3>
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input 
                                                type="text" 
                                                placeholder="Search staff..." 
                                                value={staffSearchQuery}
                                                onChange={(e) => setStaffSearchQuery(e.target.value)}
                                                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-medium" 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {filteredStaff.length === 0 ? (
                                            <div className="p-10 text-center glass rounded-3xl border-dashed border-2">
                                                <p className="text-muted-foreground font-bold italic">No staff members match your search.</p>
                                            </div>
                                        ) : (
                                            filteredStaff.map((item, index) => (
                                                <div key={item.id} className="p-4 rounded-2xl bg-white border border-border shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative">
                                                                {item.image ? (
                                                                    <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover shadow-md" />
                                                                ) : (
                                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-100 text-slate-500' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-secondary text-muted-foreground'}`}>
                                                                        #{index + 1}
                                                                    </div>
                                                                )}
                                                                {item.image && (
                                                                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-[8px] flex items-center justify-center font-bold border-2 border-white">
                                                                        #{index + 1}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-black text-foreground text-sm">{item.agentName}</p>
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-primary/5 text-primary text-[9px] font-black tracking-tighter border border-primary/10">{item.referralId}</span>
                                                                </div>
                                                                <div className="flex flex-col gap-0.5 mt-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</p>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-tighter">ID: {item.loginId}</span>
                                                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">PW: {item.password}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                                        {item.email && <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5"><Search className="w-2.5 h-2.5 opacity-40" /> {item.email}</span>}
                                                                        {item.phone && <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5"><Activity className="w-2.5 h-2.5 opacity-40" /> {item.phone}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <p className="text-xl font-black text-foreground">{item.count}</p>
                                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Vendors</p>
                                                            </div>
                                                            <div className="text-right border-l border-border pl-6">
                                                                <p className="text-xl font-black text-primary">₹{item.earnings?.toFixed(0)}</p>
                                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Earnings</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleEditStaff(item)}
                                                                    className="p-2 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Edit Profile"
                                                                >
                                                                    <Plus className="w-4 h-4 rotate-45" /> 
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteReferral(item.id)}
                                                                    className="p-2 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Delete Profile"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Bank details and payments */}
                                                    <div className="flex flex-col xl:flex-row gap-4 pt-4 border-t border-border/50 bg-secondary/20 p-4 rounded-xl">
                                                        <div className="flex-1 space-y-1">
                                                            <p className="text-[10px] font-black uppercase text-muted-foreground">Bank Details</p>
                                                            {item.bankName ? (
                                                                <>
                                                                    <p className="text-sm font-bold text-foreground">{item.bankName} - {item.accountName}</p>
                                                                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                                                        <span>A/C: <span className="text-foreground tracking-wider">{item.accountNumber}</span></span>
                                                                        <span>IFSC: <span className="text-foreground uppercase">{item.ifsc}</span></span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <p className="text-sm font-bold text-muted-foreground italic">No details provided</p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-4 xl:gap-6 xl:border-l xl:border-border/50 xl:pl-6 shrink-0">
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-green-600">₹{(item.totalPaid || 0).toFixed(0)}</p>
                                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Paid so far</p>
                                                                {item.lastPaidAt && <p className="text-[8px] text-muted-foreground mt-0.5">{new Date(item.lastPaidAt).toLocaleDateString()}</p>}
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-rose-600">₹{Math.max(0, (item.earnings || 0) - (item.totalPaid || 0)).toFixed(0)}</p>
                                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pending</p>
                                                            </div>

                                                            {payingPartnerId === item.id ? (
                                                                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                                                                    <input
                                                                        type="number"
                                                                        value={paymentAmount || ''}
                                                                        onChange={e => setPaymentAmount(Number(e.target.value))}
                                                                        placeholder="Amt..."
                                                                        className="w-16 px-2 py-1 text-sm font-bold outline-none bg-transparent"
                                                                    />
                                                                    <button onClick={() => handleRecordPayment(item.id, item.totalPaid)} className="px-3 py-1 bg-green-500 text-white rounded font-bold text-xs hover:bg-green-600 transition-colors">Pay</button>
                                                                    <button onClick={() => setPayingPartnerId(null)} className="px-3 py-1 bg-slate-100 text-slate-500 rounded font-bold text-xs hover:bg-slate-200 transition-colors">X</button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => { setPayingPartnerId(item.id); setPaymentAmount(Math.max(0, (item.earnings || 0) - (item.totalPaid || 0))); }}
                                                                    className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                                                                >
                                                                    Record Payment
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'analytics' && (() => {
                        const now = new Date();

                        // Robust date parser handles ISO strings and Firestore Timestamps
                        const parseDate = (val: any): Date | null => {
                            if (!val) return null;
                            if (typeof val === 'string') { const d = new Date(val); return isNaN(d.getTime()) ? null : d; }
                            if (val?.toDate) return val.toDate();
                            if (val?.seconds) return new Date(val.seconds * 1000);
                            return null;
                        };

                        type Period = 'day' | 'week' | 'month' | 'year';

                        const buildChartData = (period: Period) => {
                            let points: { label: string; from: Date; to: Date }[] = [];

                            if (period === 'day') {
                                // Last 14 days, one point per day
                                points = Array.from({ length: 14 }, (_, i) => {
                                    const from = new Date(now);
                                    from.setDate(from.getDate() - (13 - i));
                                    from.setHours(0, 0, 0, 0);
                                    const to = new Date(from); to.setHours(23, 59, 59, 999);
                                    return {
                                        label: from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                                        from, to
                                    };
                                });
                            } else if (period === 'week') {
                                // Last 12 weeks
                                points = Array.from({ length: 12 }, (_, i) => {
                                    const monday = new Date(now);
                                    monday.setDate(monday.getDate() - monday.getDay() + 1 - (11 - i) * 7);
                                    monday.setHours(0, 0, 0, 0);
                                    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
                                    return {
                                        label: monday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                                        from: monday, to: sunday
                                    };
                                });
                            } else if (period === 'month') {
                                // Last 12 months
                                points = Array.from({ length: 12 }, (_, i) => {
                                    const from = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
                                    const to = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 0, 23, 59, 59, 999);
                                    return {
                                        label: from.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                                        from, to
                                    };
                                });
                            } else {
                                // Last 5 years
                                points = Array.from({ length: 5 }, (_, i) => {
                                    const yr = now.getFullYear() - (4 - i);
                                    const from = new Date(yr, 0, 1);
                                    const to = new Date(yr, 11, 31, 23, 59, 59, 999);
                                    return { label: String(yr), from, to };
                                });
                            }

                            return points.map(pt => {
                                const orders = allOrders.filter(o => {
                                    const d = parseDate(o.date);
                                    return d && d >= pt.from && d <= pt.to;
                                }).length;
                                const vendors = storeList.filter(s => {
                                    const d = parseDate(s.createdAt);
                                    return d && d >= pt.from && d <= pt.to;
                                }).length;
                                return { name: pt.label, orders, vendors };
                            });
                        };

                        const chartData = buildChartData(analyticsPeriod);
                        const totalOrders = chartData.reduce((s, d) => s + d.orders, 0);
                        const totalVendors = chartData.reduce((s, d) => s + d.vendors, 0);

                        const periods: { id: 'day' | 'week' | 'month' | 'year'; label: string }[] = [
                            { id: 'day', label: 'Day' },
                            { id: 'week', label: 'Week' },
                            { id: 'month', label: 'Month' },
                            { id: 'year', label: 'Year' },
                        ];

                        return (
                            <div className="p-6">
                                {/* Header row */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                                            <BarChart2 className="w-5 h-5 text-primary" />
                                            Platform Analytics
                                        </h3>
                                        <p className="text-[11px] font-bold text-muted-foreground mt-0.5">Orders placed &amp; vendors onboarded over time</p>
                                    </div>
                                    {/* Period toggle */}
                                    <div className="flex bg-secondary/50 p-1 rounded-xl gap-1">
                                        {periods.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setAnalyticsPeriod(p.id)}
                                                className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${analyticsPeriod === p.id
                                                    ? 'bg-white text-primary shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary pills */}
                                <div className="flex gap-4 mb-6">
                                    <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 px-4 py-2 rounded-xl">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                        <span className="text-xs font-black text-rose-600">{totalOrders} Orders</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 px-4 py-2 rounded-xl">
                                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                        <span className="text-xs font-black text-indigo-600">{totalVendors} Vendors</span>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 p-4 shadow-sm">
                                    <ResponsiveContainer width="100%" height={320}>
                                        <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="vendorsGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                                allowDecimals={false}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)',
                                                    fontWeight: 700,
                                                    fontSize: 12
                                                }}
                                                formatter={(value: any, name: string) => [
                                                    value,
                                                    name === 'orders' ? 'Orders' : 'Vendors Onboarded'
                                                ]}
                                            />
                                            <Legend
                                                formatter={(value) => value === 'orders' ? 'Orders' : 'Vendors Onboarded'}
                                                iconType="circle"
                                                iconSize={8}
                                                wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="orders"
                                                stroke="#f43f5e"
                                                strokeWidth={2.5}
                                                fill="url(#ordersGrad)"
                                                dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }}
                                                activeDot={{ r: 5 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="vendors"
                                                stroke="#6366f1"
                                                strokeWidth={2.5}
                                                fill="url(#vendorsGrad)"
                                                dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                    {totalOrders === 0 && totalVendors === 0 && (
                                        <p className="text-center text-sm text-muted-foreground font-medium mt-6">
                                            No data recorded for this period yet.
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {activeTab === 'notes' && (
                        <div className="p-6 text-left">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Create/Edit Note Section */}
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="p-6 bg-secondary/30 rounded-3xl border border-border/50">
                                        <h3 className="text-xl font-black text-foreground mb-4">
                                            {editingNoteId ? "Edit Note" : "Create Admin Note"}
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Title</label>
                                                <input
                                                    type="text"
                                                    value={newNoteTitle}
                                                    onChange={(e) => setNewNoteTitle(e.target.value)}
                                                    placeholder="Note Title"
                                                    className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold mt-1 text-black"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Content</label>
                                                <textarea
                                                    value={newNoteContent}
                                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                                    placeholder="Write your note here..."
                                                    rows={6}
                                                    className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold mt-1 resize-none text-black"
                                                />
                                            </div>
                                            <div className="flex gap-3 mt-2">
                                                <button
                                                    onClick={handleSaveAdminNote}
                                                    disabled={isSavingNote}
                                                    className="flex-1 py-3 rounded-xl gradient-primary text-white font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                                                >
                                                    {isSavingNote ? "Saving..." : (editingNoteId ? "Update Note" : "Save Note")}
                                                </button>
                                                {editingNoteId && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingNoteId(null);
                                                            setNewNoteTitle("");
                                                            setNewNoteContent("");
                                                        }}
                                                        className="px-6 py-3 rounded-xl bg-secondary text-foreground font-black text-xs uppercase tracking-widest hover:bg-secondary/80 transition-all border border-border"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes List Section */}
                                <div className="lg:col-span-2">
                                    <h3 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
                                        <StickyNote className="w-5 h-5 text-primary" />
                                        Admin Notes
                                    </h3>
                                    <div className="space-y-4">
                                        {adminNotes.length === 0 ? (
                                            <div className="p-10 text-center glass rounded-3xl border-dashed border-2">
                                                <p className="text-muted-foreground font-bold italic">No notes saved yet.</p>
                                            </div>
                                        ) : (
                                            adminNotes.map((note) => (
                                                <div key={note.id} className="p-5 rounded-2xl bg-white border border-border shadow-sm flex flex-col gap-3 group hover:shadow-md transition-all">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h4 className="font-black text-foreground text-base">{note.itemName}</h4>
                                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                                {new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(note.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingNoteId(note.id);
                                                                    setNewNoteTitle(note.itemName);
                                                                    setNewNoteContent(note.description || "");
                                                                }}
                                                                className="p-2 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                                title="Edit Note"
                                                            >
                                                                <Plus className="w-4 h-4 rotate-45" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAdminNote(note.id)}
                                                                className="p-2 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                                title="Delete Note"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {note.description && (
                                                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap mt-1">{note.description}</p>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default AdminDashboard;




