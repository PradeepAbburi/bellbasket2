import { useApp } from '@/context/AppContext';
import { getAvatarUrl, CHARACTER_AVATARS } from '@/utils/avatars';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, LogOut, ChevronRight, MapPin, Bell, BellRing, Phone, Lock, Edit2, CheckCircle2, X, Loader2, Sparkles, Crown, Zap, Building2, KeyRound, HelpCircle, Languages, Search, Image as ImageIcon, Camera, Upload, Clock, FileText, Eye, EyeOff, XCircle, Moon, Sun, Heart, Settings } from 'lucide-react';
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
    const { user, loading, logout, refreshUser, updateUser, stores, requestPushNotifications, theme, toggleTheme, toggleSaveStore, setIsAnyModalOpen } = useApp();
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
    const [showSettingsModal, setShowSettingsModal] = useState(false);
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

    // Use global modal state to hide nav elements
    useEffect(() => {
        const isModalOpen = !!(
            showEditProfile || 
            showChangePassword || 
            showLanguageSettings || 
            showAvatarSelector ||
            showSettingsModal
        );
        
        setIsAnyModalOpen(isModalOpen);
        return () => setIsAnyModalOpen(false);
    }, [showEditProfile, showChangePassword, showLanguageSettings, showAvatarSelector, showSettingsModal, setIsAnyModalOpen]);

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
            // Immediate local sync
            i18n.changeLanguage(lang);
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
            <main className="pt-24 pb-32 px-4 max-w-lg mx-auto space-y-8 relative">
                {/* Profile Header */}
                <div className="absolute top-24 right-4 z-10">
                    <button 
                        onClick={() => setShowSettingsModal(true)}
                        className="p-3 rounded-2xl bg-secondary/80 backdrop-blur-md border border-border/50 text-foreground shadow-lg active:scale-95 transition-all hover:bg-secondary"
                    >
                        <Settings className="w-6 h-6" />
                    </button>
                </div>

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

                {/* Saved Stores - Customer specific */}
                {user.role === 'customer' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold tracking-wide text-primary/70">Saved Stores</span>
                                <div className="h-[1px] w-8 bg-border/50" />
                            </div>
                            <div className="flex items-center gap-2">
                                {user?.savedStores && user.savedStores.length > 0 && (
                                    <div className="px-2 py-0.5 rounded-full bg-secondary/80 border border-border/50 text-[9px] font-bold text-muted-foreground">
                                        {user.savedStores.length} Total
                                    </div>
                                )}
                                {user?.savedStores && user.savedStores.length > 0 && (
                                    <button 
                                        onClick={() => navigate('/saved-stores')}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[9px] font-bold border border-primary/20 transition-all hover:bg-primary/20 active:scale-95 group"
                                    >
                                        See More
                                        <ChevronRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {user?.savedStores && user.savedStores.length > 0 ? (
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
                                {user.savedStores
                                    .slice(0, 10)
                                    .map(item => {
                                        const storeId = typeof item === 'string' ? item : item.storeId;
                                        const savedAt = typeof item === 'string' ? new Date().toISOString() : item.savedAt;
                                        return { store: stores.find(s => s.id === storeId), savedAt };
                                    })
                                    .filter((item): item is { store: any, savedAt: string } => !!item.store)
                                    .map(({ store, savedAt }) => (
                                        <motion.div
                                            key={store.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex-none w-48 glass rounded-3xl overflow-hidden border border-border/40 group relative"
                                        >
                                            <div 
                                                onClick={() => navigate(`/store/${store.id}`)}
                                                className="cursor-pointer"
                                            >
                                                <div className="h-24 relative">
                                                    <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[8px] font-bold text-white/90">
                                                        {new Date(savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                </div>
                                                <div className="p-3 space-y-1">
                                                    <p className="text-xs font-bold text-foreground truncate">{store.name}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground">{store.category}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSaveStore(store.id);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors"
                                            >
                                                <Heart className="w-3.5 h-3.5 fill-current text-pink-500" />
                                            </button>
                                        </motion.div>
                                    ))}
                            </div>
                        ) : (
                            <div className="glass rounded-3xl p-8 text-center space-y-3 border border-dashed border-border/50">
                                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto text-muted-foreground/50">
                                    <Heart className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-foreground">No saved stores yet</p>
                                    <p className="text-xs text-muted-foreground">Heart your favorite shops to find them quickly!</p>
                                </div>
                                <button 
                                    onClick={() => navigate('/browse')}
                                    className="text-xs font-black uppercase tracking-widest text-primary hover:underline"
                                >
                                    Explore Marketplace
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Settings list moved to modal */}
            </main>

            {/* Modals */}
            <AnimatePresence>
                {showEditProfile && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditProfile(false)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm glass-strong rounded-3xl p-6 shadow-2xl space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">{t('common.account_details')}</h2>
                                <button onClick={() => setShowEditProfile(false)} className="p-2 hover:bg-secondary rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            {/* Avatar Picker Inside Account Details */}
                            <div className="flex flex-col items-center justify-center space-y-3">
                                <div 
                                    onClick={() => setShowAvatarSelector(true)}
                                    className="relative group cursor-pointer"
                                >
                                    <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all shadow-xl">
                                        <img 
                                            src={getAvatarUrl(user?.avatarUrl || user?.id || 'User')} 
                                            alt="Current Avatar" 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-[#202020]">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{t('common.change_avatar')}</p>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">{t('common.full_name')}</label>
                                    <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-secondary/50 rounded-2xl p-4 text-sm font-medium outline-none border border-border/50 focus:border-primary/50" placeholder={t('common.your_name')} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">{t('common.phone_number')}</label>
                                    <input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-secondary/50 rounded-2xl p-4 text-sm font-medium outline-none border border-border/50 focus:border-primary/50" placeholder="+91 XXXX XXXX" />
                                </div>
                                <button disabled={editing} type="submit" className="w-full gradient-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                    {editing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('common.save')} <CheckCircle2 className="w-4 h-4" /></>}
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

                {/* Settings Modal */}
                {showSettingsModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
                        <motion.div 
                            initial={{ y: "100%", opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            exit={{ y: "100%", opacity: 0 }} 
                            className="relative w-full max-w-lg glass-strong rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black tracking-tight">{t('common.settings')}</h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Customize your experience</p>
                                </div>
                                <button onClick={() => setShowSettingsModal(false)} className="p-3 hover:bg-secondary rounded-2xl transition-colors"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="space-y-3">
                                <div
                                    onClick={() => { setShowSettingsModal(false); setShowEditProfile(true); }}
                                    className="bg-secondary/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <Edit2 className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{t('common.account_details')}</p>
                                            <p className="text-xs text-muted-foreground">{t('common.account_details_desc')}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>

                                <div
                                    onClick={() => { setShowSettingsModal(false); setShowChangePassword(true); }}
                                    className="bg-secondary/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                                            <Lock className="w-5 h-5 text-destructive" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{t('common.change_password')}</p>
                                            <p className="text-xs text-muted-foreground">{t('common.change_password_desc')}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>

                                <div
                                    onClick={() => { setShowSettingsModal(false); navigate('/support'); }}
                                    className="bg-secondary/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                            <HelpCircle className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{t('common.help')} & {t('common.support')}</p>
                                            <p className="text-xs text-muted-foreground">{t('common.help_desc')}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>

                                <div
                                    onClick={() => { setShowSettingsModal(false); setShowLanguageSettings(true); }}
                                    className="bg-secondary/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                            <Languages className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{t('common.language')} & Regional</p>
                                            <p className="text-xs text-muted-foreground">{user.language || 'English'}</p>
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
                                        className="bg-secondary/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <BellRing className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{t('common.turn_on_notifications')}</p>
                                                <p className="text-xs text-muted-foreground">{t('common.turn_on_notifications_desc')}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                )}

                                <div
                                    onClick={() => { setShowSettingsModal(false); navigate('/privacy'); }}
                                    className="bg-secondary/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{t('common.privacy_policy')}</p>
                                            <p className="text-xs text-muted-foreground">{t('common.privacy_policy_desc')}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>

                                <div
                                    onClick={() => { setShowSettingsModal(false); navigate('/terms'); }}
                                    className="bg-secondary/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{t('common.terms_and_conditions')}</p>
                                            <p className="text-xs text-muted-foreground">{t('common.terms_and_conditions_desc')}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>

                                {user.role === 'vendor' && (
                                    <div
                                        onClick={() => { setShowSettingsModal(false); navigate('/vendor/config'); }}
                                        className="bg-secondary/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-all group"
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

                                <div className="pt-4">
                                    <button
                                        onClick={() => { 
                                            logout(); 
                                            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
                                            navigate(isMobile ? '/browse' : '/'); 
                                        }}
                                        className="w-full bg-red-500/10 hover:bg-red-500/20 rounded-2xl p-4 flex items-center justify-between text-red-600 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                                <LogOut className="w-5 h-5" />
                                            </div>
                                            <p className="text-sm font-black uppercase tracking-widest">{t('common.logout')}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-red-300 group-hover:text-red-600 transition-colors" />
                                    </button>
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


