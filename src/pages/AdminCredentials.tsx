import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import {
    Shield,
    Key,
    Clock,
    Lock,
    Unlock,
    Trash2,
    Copy,
    CheckCircle2,
    AlertTriangle,
    Fingerprint,
    RefreshCcw,
    ArrowLeft,
    ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import { toast } from "sonner";
import PageLoading from "@/components/PageLoading";

interface AdminCred {
    id: string;
    label: string;
    email: string;
    pass: string;
    lastUsed: string;
    role: 'super_admin' | 'moderator' | 'support';
    status: 'active' | 'rotated' | 'revoked';
}

const AdminCredentials = () => {
    const { user, loading } = useApp();
    const navigate = useNavigate();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Mock data for "Past Credentials"
    const [creds, setCreds] = useState<AdminCred[]>([
        {
            id: '1',
            label: 'Main Deployment Admin',
            email: 'contact@bellbasket.com',
            pass: 'admin123',
            lastUsed: '2026-02-19T10:00:00Z',
            role: 'super_admin',
            status: 'active'
        },
        {
            id: '2',
            label: 'Cleanup Script Utility',
            email: 'cleanup@bellbasket.sys',
            pass: 'cln_sys_992x',
            lastUsed: '2026-02-18T15:30:00Z',
            role: 'super_admin',
            status: 'rotated'
        },
        {
            id: '3',
            label: 'Support Moderator (Alpha)',
            email: 'support_mod_1@bellbasket.local',
            pass: 'mod_v1_secure',
            lastUsed: '2026-02-15T08:20:00Z',
            role: 'moderator',
            status: 'revoked'
        },
        {
            id: '4',
            label: 'Database Migration Guest',
            email: 'migrator@bellbasket.cloud',
            pass: 'mig_guest_2026',
            lastUsed: '2026-02-10T22:15:00Z',
            role: 'super_admin',
            status: 'rotated'
        }
    ]);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            navigate('/auth');
        }
    }, [user, loading, navigate]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Credential copied to clipboard", {
            icon: <Copy className="w-4 h-4" />
        });
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            toast.success("Credential vault synchronized", {
                icon: <RefreshCcw className="w-4 h-4" />
            });
        }, 1500);
    };

    const getStatusColor = (status: AdminCred['status']) => {
        switch (status) {
            case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'rotated': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'revoked': return 'bg-destructive/10 text-destructive border-destructive/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    if (loading) return <PageLoading />;

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-24 pb-12 px-4 max-w-5xl mx-auto">

                {/* Breadcrumb / Back */}
                <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Control Center
                </button>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-foreground flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20">
                                <Lock className="w-6 h-6" />
                            </div>
                            Past Credentials
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium max-w-md">
                            Secure ledger of historical administrative credentials and access tokens used within the BellBasket ecosystem.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-border font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Sync Vault
                        </button>
                        <button className="flex items-center gap-2 px-5 py-3 rounded-2xl gradient-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95">
                            <Key className="w-4 h-4" />
                            Generate Token
                        </button>
                    </div>
                </div>

                {/* Info Alert */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-4 items-center"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 flex-shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-900">Historical Security Notice</p>
                        <p className="text-xs text-amber-700 font-medium">Rotated or Revoked credentials remain visible for audit purposes for 30 days before permanent erasure.</p>
                    </div>
                </motion.div>

                {/* Credentials Grid */}
                <div className="grid gap-4">
                    <AnimatePresence>
                        {creds.map((cred, i) => (
                            <motion.div
                                key={cred.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass rounded-[32px] p-6 group hover:shadow-xl hover:shadow-primary/5 transition-all border border-white/40 bg-white/40"
                            >
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                                    {/* Left Side: Identity */}
                                    <div className="flex items-center gap-5 flex-1">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cred.status === 'active' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {cred.role === 'super_admin' ? <Shield className="w-6 h-6" /> : <Fingerprint className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-black text-foreground text-lg">{cred.label}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusColor(cred.status)}`}>
                                                    {cred.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Last Used: {new Date(cred.lastUsed).toLocaleDateString()}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                <span className="flex items-center gap-1 capitalize">
                                                    {cred.role.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Center Section: Credentials */}
                                    <div className="flex flex-col md:flex-row items-center gap-3 bg-secondary/30 p-2 rounded-2xl border border-border/50">
                                        <div className="px-4 py-2 border-r border-border/50 last:border-0">
                                            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground mb-0.5">Administrative ID</p>
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-bold text-foreground">{cred.email}</code>
                                                <button
                                                    onClick={() => handleCopy(cred.email)}
                                                    className="p-1 hover:bg-white rounded transition-colors"
                                                >
                                                    <Copy className="w-3 h-3 text-primary" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-4 py-2 border-r border-border/50 last:border-0">
                                            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground mb-0.5">Secret Key</p>
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-bold text-foreground">{cred.pass}</code>
                                                <button
                                                    onClick={() => handleCopy(cred.pass)}
                                                    className="p-1 hover:bg-white rounded transition-colors"
                                                >
                                                    <Unlock className="w-3 h-3 text-primary" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Actions */}
                                    <div className="flex items-center gap-2">
                                        <button className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                        <button className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all shadow-sm">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Empty State Mock */}
                {creds.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
                            <Lock className="w-10 h-10 text-muted-foreground opacity-20" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Vault is Empty</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">No past credentials found for this system period.</p>
                    </div>
                )}

                {/* Footer Summary */}
                <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-2xl font-black text-foreground">12</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Issued</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-green-500">1</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Now</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-amber-500">2</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rotated</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/10">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-primary">System Integrity: 100% Secure</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminCredentials;

