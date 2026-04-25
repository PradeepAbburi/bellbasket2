import { useApp } from '@/context/AppContext';
import { getAvatarUrl, CHARACTER_AVATARS } from '@/utils/avatars';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, LogOut, ChevronRight, MapPin, Bell, BellRing, Phone, Lock, Edit2, CheckCircle2, X, Loader2, Sparkles, Crown, Zap, Building2, KeyRound, HelpCircle, Languages, Search, Image as ImageIcon, Camera, Upload, Clock, FileText, Eye, EyeOff, XCircle, Moon, Sun } from 'lucide-react';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { ALL_LANGUAGES } from '@/constants/languages';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { playBellSound, initAudio } from '@/utils/notifications';

const Profile = () => {
    const { user, loading, logout, refreshUser, updateUser, stores, requestPushNotifications, theme, toggleTheme } = useApp();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showLanguageSettings, setShowLanguageSettings] = useState(false);
    const [editing, setEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notificationPermission, setNotificationPermission] = useState<string>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);
    const storeFileInputRef = useRef<HTMLInputElement>(null);

    const vendorStore = stores.find(s => s.id === user?.id);


    useEffect(() => {
        if (typeof Notification === 'undefined') return;
        const checkPermission = () => {
            setNotificationPermission(Notification.permission);
        };
        window.addEventListener('focus', checkPermission);
        return () => window.removeEventListener('focus', checkPermission);
    }, []);

    // Profile Edit State
    const [newName, setNewName] = useState(user?.name || '');
    const [newPhone, setNewPhone] = useState(user?.phone || '');

    // Sync state with user data
    useEffect(() => {
        if (user) {
            setNewName(user.name || '');
            setNewPhone(user.phone || '');
        }
    }, [user]);

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);


    if (loading) {
        return (
            <div className="min-h-screen gradient-warm flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        navigate('/auth');
        return null;
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return toast.error('Name is required');
        setEditing(true);
        try {
            await updateDoc(doc(db, 'users', user.id), {
                name: newName,
                phone: newPhone
            });

            // Sync with Store document if user is a vendor
            if (user.role === 'vendor') {
                try {
                    await updateDoc(doc(db, 'stores', user.id), {
                        phone: newPhone
                    });
                } catch (storeErr) {
                    console.log("Could not update store phone (store might not exist yet)");
                }
            }

            await refreshUser();

            toast.success('Profile updated successfully!');
            setShowEditProfile(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setEditing(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPass !== confirmPass) return toast.error('Passwords do not match');
        if (newPass.length < 6) return toast.error('Password must be at least 6 characters');

        setEditing(true);
        try {
            const fbUser = auth.currentUser;
            if (!fbUser || !fbUser.email) throw new Error('User session not found');

            // Re-authenticate user first (required for password sensitive ops)
            const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
            await reauthenticateWithCredential(fbUser, credential);

            await updatePassword(fbUser, newPass);
            toast.success('Password updated successfully!');
            setShowChangePassword(false);
            setCurrentPassword('');
            setNewPass('');
            setConfirmPass('');
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/wrong-password') {
                toast.error('Current password is incorrect');
            } else {
                toast.error(error.message || 'Failed to update password');
            }
        } finally {
            setEditing(false);
        }
    };

    const handleUpdateLanguage = async (lang: string) => {
        setEditing(true);
        try {
            await updateUser({ language: lang });
            toast.success(`Language changed to ${lang}`);
            setShowLanguageSettings(false);
        } catch (error) {
            toast.error("Failed to update language");
        } finally {
            setEditing(false);
        }
    };

    const handleUpdateAvatar = async (url: string | null) => {
        setEditing(true);
        try {
            await updateUser({ avatarUrl: url });
            toast.success('Avatar updated successfully!');
            setShowAvatarSelector(false);
        } catch (error) {
            toast.error("Failed to update avatar");
        } finally {
            setEditing(false);
        }
    };


    const filteredLanguages = ALL_LANGUAGES.filter(lang =>
        lang.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen gradient-warm">
            <Helmet>
                <title>My Account - BellBasket</title>
                <meta name="robots" content="noindex, follow" />
            </Helmet>
            <Header />
            <main className="pt-24 pb-32 px-4 max-w-lg mx-auto space-y-8">
                {/* Profile Header */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center space-y-4">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center p-1 shadow-xl overflow-hidden relative group">
                            <div className="w-full h-full rounded-full bg-background overflow-hidden flex items-center justify-center">
                                <img 
                                    src={getAvatarUrl(user?.avatarUrl || user?.id || 'User')} 
                                    alt={user?.name || 'User'} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <button 
                                onClick={() => setShowAvatarSelector(true)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            >
                                <ImageIcon className="w-6 h-6" />
                            </button>
                        </div>
                        {user.isVerified && (
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white border-4 border-background shadow-lg" title="Email Verified">
                                <Shield className="w-4 h-4 fill-current" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2 text-muted-foreground justify-center">
                                <Mail className="w-3.5 h-3.5" />
                                <span className="text-sm font-medium">{user.email}</span>
                            </div>
                            {user.phone && (
                                <div className="flex items-center gap-2 text-muted-foreground justify-center">
                                    <Phone className="w-3.5 h-3.5" />
                                    <span className="text-sm font-medium">{user.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                            {user.role} Member
                        </span>

                        {user.role === 'vendor' && user.plan && user.plan !== 'none' && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/vendor/subscription')}
                                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${user.plan === 'pro' ? 'bg-amber-400 text-amber-950' :
                                    user.plan === 'growth' ? 'bg-blue-500 text-white' :
                                        'bg-orange-600 text-white'
                                    }`}
                            >
                                {user.plan === 'pro' ? <Crown className="w-3 h-3" /> :
                                    user.plan === 'growth' ? <Zap className="w-3 h-3" /> :
                                        <Building2 className="w-3 h-3" />}
                                {user.plan} Plan
                            </motion.button>
                        )}
                    </div>
                </motion.div>

                {/* Account Settings */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Account Settings</span>
                        <div className="h-[1px] flex-1 bg-border/50" />
                    </div>

                    <div
                        onClick={() => setShowEditProfile(true)}
                        className="glass rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/05 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Edit2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">Account Details</p>
                                <p className="text-xs text-muted-foreground">Name, Phone & Contact</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    <div
                        onClick={() => setShowChangePassword(true)}
                        className="glass rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/05 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">Change Password</p>
                                <p className="text-xs text-muted-foreground">Secure your account</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    <div
                        onClick={() => navigate('/support')}
                        className="glass rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/05 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                <HelpCircle className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">{t('common.help')} & {t('common.support')}</p>
                                <p className="text-xs text-muted-foreground">Contact us for assistance</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>


                    <div
                        onClick={() => setShowLanguageSettings(true)}
                        className="glass rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/05 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                <Languages className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">{t('common.language')} & Regional</p>
                                <p className="text-xs text-muted-foreground">{t('common.total')}: {user.language || 'English'}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>



                    {notificationPermission !== 'granted' && (
                        <div
                            onClick={async () => {
                                await requestPushNotifications();
                                if (typeof Notification !== 'undefined') {
                                    setNotificationPermission(Notification.permission);
                                }
                            }}
                            className="glass rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/05 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <BellRing className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Turn On Notifications</p>
                                    <p className="text-xs text-muted-foreground">Tap to receive instant alerts</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    )}

                    <div
                        onClick={() => navigate('/privacy')}
                        className="glass rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/05 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">Privacy Policy</p>
                                <p className="text-xs text-muted-foreground">How we handle your data</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    <div
                        onClick={() => navigate('/terms')}
                        className="glass rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/05 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">Terms & Conditions</p>
                                <p className="text-xs text-muted-foreground">Legal & usage guidelines</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    {user.role === 'vendor' && (
                        <div
                            onClick={() => navigate('/vendor/config')}
                            className="glass rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/05 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Store Configuration</p>
                                    <p className="text-xs text-muted-foreground">Identity, Hours & Location</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    )}
                </div>

                {/* Sign Out */}
                <button
                    onClick={() => { 
                        logout(); 
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
                        navigate(isMobile ? '/browse' : '/'); 
                    }}
                    className="w-full bg-white dark:bg-white rounded-2xl p-4 flex items-center justify-between text-red-600 hover:bg-red-50 transition-colors group shadow-sm border border-red-100"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                            <LogOut className="w-5 h-5 text-red-600" />
                        </div>
                        <p className="text-sm font-bold">Sign Out</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-300 group-hover:text-red-600 transition-colors" />
                </button>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {showEditProfile && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditProfile(false)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm glass-strong rounded-3xl p-6 shadow-2xl space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">Edit Profile</h2>
                                <button onClick={() => setShowEditProfile(false)} className="p-2 hover:bg-secondary rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Full Name</label>
                                    <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-secondary/50 rounded-2xl p-4 text-sm font-medium outline-none border border-border/50 focus:border-primary/50" placeholder="Your Name" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Phone Number</label>
                                    <input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-secondary/50 rounded-2xl p-4 text-sm font-medium outline-none border border-border/50 focus:border-primary/50" placeholder="+91 XXXX XXXX" />
                                </div>
                                <button disabled={editing} type="submit" className="w-full gradient-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                    {editing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Save Changes <CheckCircle2 className="w-4 h-4" /></>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {showChangePassword && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowChangePassword(false)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm glass-strong rounded-3xl p-6 shadow-2xl space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">Security</h2>
                                <button onClick={() => setShowChangePassword(false)} className="p-2 hover:bg-secondary rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div className="space-y-1.5 relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Current Password</label>
                                    <input
                                        type={showCurrentPass ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        className="w-full bg-secondary/50 rounded-2xl p-4 pr-12 text-sm font-medium outline-none border border-border/50 focus:border-primary/50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                                        className="absolute right-4 bottom-4 text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="space-y-1.5 pt-2 border-t border-border/30 relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">New Password</label>
                                    <input
                                        type={showNewPass ? "text" : "password"}
                                        value={newPass}
                                        onChange={e => setNewPass(e.target.value)}
                                        className="w-full bg-secondary/50 rounded-2xl p-4 pr-12 text-sm font-medium outline-none border border-border/50 focus:border-accent/50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPass(!showNewPass)}
                                        className="absolute right-4 bottom-4 text-muted-foreground hover:text-accent transition-colors"
                                    >
                                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="space-y-1.5 relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Confirm New Password</label>
                                    <input
                                        type={showConfirmPass ? "text" : "password"}
                                        value={confirmPass}
                                        onChange={e => setConfirmPass(e.target.value)}
                                        className="w-full bg-secondary/50 rounded-2xl p-4 pr-12 text-sm font-medium outline-none border border-border/50 focus:border-accent/50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                                        className="absolute right-4 bottom-4 text-muted-foreground hover:text-accent transition-colors"
                                    >
                                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button disabled={editing} type="submit" className="w-full gradient-accent text-white py-4 rounded-2xl font-bold shadow-lg shadow-accent/20 flex items-center justify-center gap-2">
                                    {editing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Update Password <Shield className="w-4 h-4" /></>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
                {showLanguageSettings && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLanguageSettings(false)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm glass-strong rounded-3xl p-6 shadow-2xl space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">Choose Language</h2>
                                <button onClick={() => setShowLanguageSettings(false)} className="p-2 hover:bg-secondary rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search languages..."
                                        className="pl-10"
                                    />
                                </div>
                                <div className="max-h-[300px] overflow-y-auto grid grid-cols-1 gap-2 pr-2 custom-scrollbar">
                                    {filteredLanguages.map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => handleUpdateLanguage(lang)}
                                            disabled={editing}
                                            className={`p-4 rounded-2xl border flex items-center justify-between text-sm font-bold transition-all ${user.language === lang
                                                ? 'bg-primary/10 border-primary text-primary'
                                                : 'bg-secondary/30 border-transparent hover:border-muted-foreground/20 text-foreground'
                                                }`}
                                        >
                                            {lang}
                                            {user.language === lang && <CheckCircle2 className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Avatar Selector Modal */}
                {showAvatarSelector && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-background/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.9, y: 20 }} 
                            className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border/50 space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">Select Avatar</h2>
                                <button onClick={() => setShowAvatarSelector(false)} className="p-2 hover:bg-secondary rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {/* Default Option */}
                                <button
                                    onClick={() => handleUpdateAvatar(null)}
                                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${!user.avatarUrl ? 'border-primary ring-2 ring-primary/20' : 'border-transparent bg-secondary/30'}`}
                                >
                                    <div className="w-full h-full flex items-center justify-center">
                                        <img src={getAvatarUrl(user.id)} className="w-full h-full object-cover" alt="Default" />
                                    </div>
                                    {!user.avatarUrl && <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>}
                                </button>

                                {CHARACTER_AVATARS.map((avatar) => (
                                    <button
                                        key={avatar.id}
                                        onClick={() => handleUpdateAvatar(avatar.url)}
                                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${user.avatarUrl === avatar.url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent bg-secondary/30 hover:bg-secondary'}`}
                                    >
                                        <img src={avatar.url} className="w-full h-full object-cover" alt={avatar.label} />
                                        {user.avatarUrl === avatar.url && (
                                            <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowAvatarSelector(false)}
                                className="w-full py-4 rounded-2xl bg-secondary text-foreground font-bold hover:bg-secondary/80 transition-all"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;


