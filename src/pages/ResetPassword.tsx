import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Loader2, CheckCircle2, ShoppingBasket, Eye, EyeOff } from 'lucide-react';
import Loader from '@/components/ui/loader-animation';
import { auth } from '@/lib/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { toast } from 'sonner';
import PageLoading from '@/components/PageLoading';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const oobCode = searchParams.get('oobCode');
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [isValidCode, setIsValidCode] = useState<boolean | null>(null);

    useEffect(() => {
        if (!oobCode) {
            toast.error('Invalid or missing reset code.');
            navigate('/auth');
            return;
        }

        // Verify the password reset code
        verifyPasswordResetCode(auth, oobCode)
            .then((userEmail) => {
                setEmail(userEmail);
                setIsValidCode(true);
            })
            .catch((error) => {
                console.error("Invalid reset code:", error);
                setIsValidCode(false);
                toast.error('This reset link has expired or already been used.');
            });
    }, [oobCode, navigate]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode!, newPassword);
            toast.success('Password reset successfully! Please login with your new password.');
            navigate('/auth');
        } catch (error: any) {
            toast.error(error.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (isValidCode === false) {
        return (
            <div className="min-h-screen gradient-warm flex items-center justify-center px-4">
                <div className="text-center space-y-4">
                    <h1 className="text-xl font-bold">Invalid Reset Link</h1>
                    <button onClick={() => navigate('/auth')} className="text-primary font-bold hover:underline">
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    if (isValidCode === null) return <PageLoading />;

    return (
        <div className="min-h-screen gradient-warm flex items-center justify-center px-4 py-12">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
                <div className="text-center mb-10">
                    <span className="text-3xl font-black block tracking-tight">BellBasket</span>
                    <p className="text-xs font-bold text-primary uppercase mt-2 opacity-80 tracking-widest">Find It. Grab It.</p>
                </div>

                <div className="glass rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="text-center space-y-1">
                        <h2 className="text-xl font-bold text-foreground">Create New Password</h2>
                        <p className="text-xs font-medium text-muted-foreground whitespace-pre-wrap">
                            Resetting password for: <span className="text-foreground font-bold">{email}</span>
                        </p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-4">
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="New Password"
                                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-secondary/50 border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Confirm New Password"
                                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-secondary/50 border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full gradient-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 mt-6 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                            {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
