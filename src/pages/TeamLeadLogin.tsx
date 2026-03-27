import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { UserCircle, Loader2, ArrowLeft, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import Header from "@/components/Header";

const TeamLeadLogin = () => {
    const { theme, toggleTheme } = useApp();
    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const saved = localStorage.getItem("bellbasket_teamlead_session");
        if (saved) {
            navigate("/team-lead");
        }
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedLoginId = loginId.trim();
        const trimmedPassword = password.trim();

        if (!trimmedLoginId || !trimmedPassword) {
            toast.error("Please enter both Login ID and Password");
            return;
        }

        setIsLoggingIn(true);
        try {
            console.log("Team Lead Login Attempt:", trimmedLoginId);

            // 1. Direct Query (Check Login ID first)
            let q = query(
                collection(db, "referrals"),
                where("loginId", "==", trimmedLoginId),
                where("password", "==", trimmedPassword)
            );
            let snap = await getDocs(q);

            if (snap.empty) {
                // Try Staff ID query
                q = query(
                    collection(db, "referrals"),
                    where("referralId", "==", trimmedLoginId.toUpperCase()),
                    where("password", "==", trimmedPassword)
                );
                snap = await getDocs(q);
            }

            let matchedData = null;

            if (!snap.empty) {
                matchedData = { id: snap.docs[0].id, ...snap.docs[0].data() };
            } else {
                // 2. Manual Fallback (Case Insensitive for ID, Exact for Password)
                console.log("Direct queries failed, checking all referrals...");
                const allSnap = await getDocs(collection(db, "referrals"));
                const match = allSnap.docs.find(doc => {
                    const d = doc.data();
                    // Allow Login ID or Staff ID to be case insensitive for user convenience
                    const isIdMatch = d.loginId?.toLowerCase() === trimmedLoginId.toLowerCase() || 
                                     d.referralId?.toLowerCase() === trimmedLoginId.toLowerCase();
                    return isIdMatch && d.password === trimmedPassword;
                });

                if (match) {
                    matchedData = { id: match.id, ...match.data() };
                }
            }

            if (matchedData) {
                localStorage.setItem("bellbasket_teamlead_session", JSON.stringify(matchedData));
                toast.success(`Welcome, ${matchedData.agentName}!`);
                navigate("/team-lead");
            } else {
                // Check if they are trying to use Admin credentials on the Staff page
                const isAdminCreds = (trimmedLoginId.toLowerCase() === 'ceo@bellbasket.com' && trimmedPassword === 'Pradeep@123') ||
                                     (trimmedLoginId.toLowerCase() === 'hr@bellbasket.com' && trimmedPassword === 'Vortex@hr') ||
                                     (trimmedLoginId.toLowerCase() === 'contact@bellbasket.com' && trimmedPassword === 'admin123');

                if (isAdminCreds) {
                    toast.error("Administrative Login Detected", {
                        description: "You are attempting to use Admin credentials on the Staff page. Please use the main Administrative Login."
                    });
                    setTimeout(() => navigate('/auth'), 2000);
                    return;
                }

                console.warn("Login failed for:", trimmedLoginId);
                toast.error("Invalid Login ID or Password", {
                    description: "Double check your credentials and try again."
                });
            }
        } catch (error: any) {
            console.error("Login error:", error);
            toast.error("Database connection error", {
                description: error.message || "Failed to reach servers."
            });
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen gradient-warm flex flex-col">
            <Header />
            <div className="flex-1 flex items-center justify-center p-4 pt-20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-strong rounded-[40px] p-8 sm:p-12 w-full max-w-lg shadow-2xl border-white/20 relative overflow-hidden"
                >
                    {/* Theme Toggle Button */}
                    <div className="absolute top-6 right-6 z-50">
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-xl glass flex items-center justify-center text-foreground hover:bg-primary/10 transition-all border border-white/20"
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-primary" />}
                        </button>
                    </div>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <UserCircle className="w-32 h-32" />
                    </div>

                    <div className="mb-10 text-center sm:text-left">
                        <button onClick={() => navigate("/")} className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft className="w-3 h-3" /> Back to Home
                        </button>
                        <h1 className="text-4xl font-black text-foreground mb-3">Staff Login</h1>
                        <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-xs">Staff Management Portal</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Login ID</label>
                            <input
                                type="text"
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                placeholder="Required"
                                className="w-full px-6 py-4 sm:py-5 rounded-2xl bg-white/60 border border-border outline-none focus:ring-4 focus:ring-primary/10 font-bold transition-all text-lg"
                            />
                        </div>
                        <div className="space-y-2 relative">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-6 py-4 sm:py-5 rounded-2xl bg-white/60 border border-border outline-none focus:ring-4 focus:ring-primary/10 font-bold transition-all text-lg pr-16"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-6 bottom-5 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full py-5 rounded-2xl gradient-primary text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                        >
                            {isLoggingIn ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Authenticating...
                                </>
                            ) : "Enter Dashboard"}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-border/50 text-center">
                        <p className="text-xs text-muted-foreground font-medium">
                            Don't have credentials? Contact your Administrator.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TeamLeadLogin;

