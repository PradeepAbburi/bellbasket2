import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
    LayoutDashboard, Users, CreditCard, UserPlus, 
    LogOut, Menu, X, Bell, Search, Settings, 
    Shield, Briefcase, Activity, Landmark
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const HrLayout = () => {
    const { user, logout } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/hr' },
        { id: 'onboarding', label: 'Create Login', icon: UserPlus, path: '/hr/onboarding' },
        { id: 'staff', label: 'Directory', icon: Users, path: '/hr/staff' },
        { id: 'payments', label: 'Payments', icon: CreditCard, path: '/hr/payments' },
    ];

    const handleLogout = async () => {
        try {
            await logout();
            localStorage.removeItem('bellbasket_hr');
            toast.success('Logged out successfully');
            navigate('/auth');
        } catch (error) {
            toast.error('Logout failed');
        }
    };

    return (
        <div className="min-h-screen gradient-warm flex flex-col lg:flex-row overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-72 glass-strong m-4 rounded-[2.5rem] border border-white/40 shadow-2xl z-20 overflow-hidden">
                <div className="p-8 flex items-center gap-3 border-b border-border/10">
                    <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-foreground tracking-tighter">BellBasket</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">HR Portal</p>
                    </div>
                </div>

                <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all group
                                ${isActive 
                                    ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                                    : 'text-muted-foreground hover:bg-white/05 hover:text-foreground'
                                }
                            `}
                        >
                            <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-white' : 'text-primary'}`} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-6 border-t border-border/10">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                    >
                        <LogOut className="w-5 h-5" />
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative flex flex-col h-screen overflow-hidden">
                {/* Mobile Header (Hidden on LG) */}
                <header className="lg:hidden h-20 flex items-center justify-between px-6 glass border-b border-border/10 z-50 shrink-0">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="w-10 h-10 flex items-center justify-center glass rounded-xl text-primary"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                        <div className="flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            <span className="font-black text-lg tracking-tighter">BellBasket <span className="text-sm font-bold opacity-50">HR</span></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                         <button className="w-10 h-10 flex items-center justify-center glass rounded-xl text-muted-foreground relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-white" />
                        </button>
                    </div>
                </header>

                {/* Mobile Menu Overlay */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[40] lg:hidden"
                            />
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed top-20 left-4 bottom-4 w-72 glass-strong z-[45] rounded-[2rem] border border-white/40 shadow-2xl flex flex-col p-6 lg:hidden"
                            >
                                <nav className="flex-1 space-y-2 overflow-y-auto">
                                    {menuItems.map((item) => (
                                        <NavLink
                                            key={item.id}
                                            to={item.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={({ isActive }) => `
                                                flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                                                ${isActive 
                                                    ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                                                    : 'text-muted-foreground hover:bg-white/05 hover:text-foreground'
                                                }
                                            `}
                                        >
                                            <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-white' : 'text-primary'}`} />
                                            {item.label}
                                        </NavLink>
                                    ))}
                                </nav>
                                <div className="pt-6 border-t border-border/10">
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        Log Out
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Desktop Topbar (Hidden on Mobile) */}
                <header className="hidden lg:flex h-24 items-center justify-between px-10 z-10 shrink-0">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="relative group max-w-md w-full">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search everything..." 
                                className="w-full h-14 bg-white/40 border border-white/60 rounded-2xl pl-12 pr-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all backdrop-blur-md"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="w-12 h-12 flex items-center justify-center glass rounded-2xl text-muted-foreground hover:text-primary hover:bg-white/60 transition-all relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full ring-2 ring-white animate-pulse" />
                        </button>
                        <div className="flex items-center gap-4 glass-strong pl-2 pr-6 py-2 rounded-2xl border border-white/40">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-foreground flex items-center justify-center text-white font-black">
                                {user?.name?.charAt(0) || 'H'}
                            </div>
                            <div className="hidden xl:block">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">{user?.name || 'HR Manager'}</h3>
                                <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] opacity-60">Human Resources</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-10 pt-4 lg:pt-0 pb-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>

            </main>
        </div>
    );
};

export default HrLayout;


