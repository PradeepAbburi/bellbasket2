import React, { useState } from 'react';
import { 
    LayoutDashboard, Users, Store, Ticket, 
    LifeBuoy, BarChart3, ShieldCheck, LogOut, 
    Bell, Search, Menu, X, ChevronRight,
    Settings, Sparkles, UserCircle
} from 'lucide-react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = () => {
    const { user, logout } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/admin', exact: true },
        { icon: Store, label: 'Vendors', path: '/admin/vendors' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: Ticket, label: 'Coupons', path: '/admin/coupons' },
        { icon: LifeBuoy, label: 'Support', path: '/admin/support' },
        { icon: BarChart3, label: 'Stats', path: '/admin/analytics' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const activeItem = menuItems.find(item => 
        item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row overflow-hidden">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 border-r border-slate-200 bg-white z-50">
                <div className="p-8">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tighter">BellBasket</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 opacity-60">Master Admin</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all group
                                ${isActive 
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                            `}
                        >
                            <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                            {item.label}
                            {(item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)) && (
                                <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-6">
                    <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden">
                                <UserCircle className="w-full h-full text-slate-300" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">{user?.name || 'Administrator'}</p>
                                <p className="text-[9px] font-bold text-slate-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
                        >
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:pl-72 flex flex-col min-w-0 relative h-screen">
                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-6 sm:px-10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 lg:hidden">
                         <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl text-indigo-600 focus:outline-none"
                         >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                         </button>
                         <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                 <ShieldCheck className="w-4 h-4 text-white" />
                             </div>
                             <h1 className="text-lg font-black text-slate-900 tracking-tighter">Admin</h1>
                         </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{activeItem?.label || 'Dashboard'}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                        <span className="text-xs font-bold text-slate-900">Live Management</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Global search..." 
                                className="bg-slate-100 border-none rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold w-48 xl:w-64 focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                            />
                        </div>
                        <button className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white"></span>
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
                                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] lg:hidden"
                            />
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed top-20 left-4 bottom-4 w-72 bg-white z-[60] rounded-[2rem] border border-slate-200 shadow-2xl flex flex-col p-6 lg:hidden"
                            >
                                <nav className="flex-1 space-y-1.5 overflow-y-auto">
                                    {menuItems.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            end={item.exact}
                                            className={({ isActive }) => `
                                                flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all
                                                ${isActive 
                                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                                            `}
                                        >
                                            <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-white' : 'text-slate-400'}`} />
                                            {item.label}
                                        </NavLink>
                                    ))}
                                </nav>
                                <div className="pt-6 border-t border-slate-100 mt-4">
                                     <div className="flex items-center gap-3 mb-6 px-2">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                                            <UserCircle className="w-full h-full text-slate-300" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-slate-900 truncate">{user?.name || 'Administrator'}</p>
                                            <p className="text-[9px] font-bold text-slate-500 truncate">{user?.email}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Page Content */}
                <div className="flex-1 p-4 sm:p-10 pb-10 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
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

export default AdminLayout;
