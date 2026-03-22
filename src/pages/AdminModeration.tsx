import { useState, useEffect } from "react";
import { useApp } from "@/context/appStore";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query, where, getDoc } from "firebase/firestore";
import {
    Users,
    Ban,
    CheckCircle2,
    ArrowLeft,
    Search,
    ShieldAlert,
    Activity,
    Mail,
    Phone,
    Shield,
    Trash2,
    Loader2,
    Crown,
    Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import { toast } from "sonner";

const AdminModeration = () => {
    const { user, loading } = useApp();
    const navigate = useNavigate();
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            if (!loading) navigate('/auth');
            return;
        }

        const q = query(collection(db, "users"), where("isBlocked", "==", true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setBlockedUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        }, (err) => {
            console.error("Moderation Sync Error:", err);
            toast.error("Failed to load blocked users");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, loading, navigate]);

    const handleUnblock = async (userId: string) => {
        setIsProcessing(userId);
        try {
            await updateDoc(doc(db, "users", userId), {
                isBlocked: false
            });

            // Also update the store document if it exists
            try {
                const storeRef = doc(db, "stores", userId);
                const storeSnap = await getDoc(storeRef);
                if (storeSnap.exists()) {
                    await updateDoc(storeRef, { isBlocked: false });
                }
            } catch (e) {
                console.error("Failed to sync block status to store:", e);
            }

            toast.success("User access restored successfully", {
                icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
            });
        } catch (e) {
            toast.error("Failed to unblock user");
        } finally {
            setIsProcessing(null);
        }
    };

    const filteredUsers = blockedUsers.filter(u =>
        (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (loading || isLoading) {
        return (
            <div className="min-h-screen gradient-warm flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Opening Vault...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">

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
                            <div className="w-12 h-12 rounded-2xl bg-destructive text-destructive-foreground flex items-center justify-center shadow-xl shadow-destructive/20">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            Restricted Accounts
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2">
                            Review and manage users who have been blocked from the platform.
                            <span className="inline-block w-1 h-1 rounded-full bg-border" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-destructive/60">{blockedUsers.length} Blocked</span>
                        </p>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/50 border border-white focus:border-primary/50 outline-none focus:ring-4 focus:ring-primary/5 text-sm font-medium transition-all"
                        />
                    </div>
                </div>

                {/* Main List */}
                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredUsers.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass rounded-[40px] p-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-border/50"
                            >
                                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="text-2xl font-black text-foreground">Clean Slate</h3>
                                <p className="text-muted-foreground font-medium mt-2 max-w-xs">No blocked users found. Everyone has access to the platform.</p>
                            </motion.div>
                        ) : (
                            filteredUsers.map((u, i) => (
                                <motion.div
                                    key={u.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="glass rounded-[32px] p-6 border border-white/60 bg-white/60 hover:bg-white/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center font-black text-xl">
                                                {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white shadow-md flex items-center justify-center">
                                                <Ban className="w-3 h-3 text-destructive" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-black text-foreground">{u.name || 'Anonymous User'}</h3>
                                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${u.role === 'vendor' ? 'bg-indigo-50 text-indigo-500 border-indigo-200' : 'bg-blue-50 text-blue-500 border-blue-200'}`}>
                                                    {u.role}
                                                </span>
                                                {u.plan === 'pro' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                                                {u.plan === 'growth' && <Zap className="w-3.5 h-3.5 text-blue-500" />}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                                                    <Mail className="w-3 h-3" />
                                                    {u.email}
                                                </p>
                                                {u.phone && (
                                                    <p className="text-xs font-medium text-muted-foreground/60 flex items-center gap-2">
                                                        <Phone className="w-3 h-3" />
                                                        {u.phone}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="hidden md:block text-right mr-4">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Account ID</p>
                                            <p className="text-xs font-mono font-bold text-muted-foreground/40">{u.id.substring(0, 16)}...</p>
                                        </div>
                                        <button
                                            onClick={() => handleUnblock(u.id)}
                                            disabled={isProcessing === u.id}
                                            className="px-6 py-3 rounded-2xl bg-green-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isProcessing === u.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            {isProcessing === u.id ? 'Processing...' : 'Restore Access'}
                                        </button>
                                        <button className="p-3 rounded-2xl bg-secondary/50 text-muted-foreground hover:bg-destructive hover:text-white transition-all">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Insight */}
                {blockedUsers.length > 0 && (
                    <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-12 animate-pulse">
                        Security Clearance: Level 4 Active
                    </p>
                )}
            </div>
        </div>
    );
};

export default AdminModeration;
