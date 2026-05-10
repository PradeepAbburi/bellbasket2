import React, { memo } from 'react';
import { useApp } from '@/context/AppContext';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, ShoppingCart, User, ChevronRight, LayoutDashboard, Package, Home, Zap } from 'lucide-react';
import { getAvatarUrl } from '@/utils/avatars';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const BottomNav = () => {
    const { user, cart, orders, serviceBookings, stores, cartSubtotal, isAnyModalOpen } = useApp();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const cartCount = React.useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);

    // Calculate active items for badges
    const activeOrdersCount = React.useMemo(() => orders.filter(o => ['pending', 'accepted', 'packed'].includes(o.status)).length, [orders]);
    const activeBookingsCount = React.useMemo(() => serviceBookings.filter(b => ['pending', 'accepted'].includes(b.status)).length, [serviceBookings]);

    // For customers, show combined active receipts (orders + bookings)
    const activeReceiptsCount = React.useMemo(() => 
        orders.filter(o => !['completed', 'rejected'].includes(o.status)).length +
        serviceBookings.filter(b => !['completed', 'rejected'].includes(b.status)).length,
    [orders, serviceBookings]);


    
    // Hide if not logged in, not verified, or on auth/setup pages, or for HR/Admin roles
    if (!user || !user.isVerified || user.role === 'hr' || user.role === 'admin' || location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/vendor/setup') return null;

    // Hide BottomNav on add/edit product, subscription, notes, and deals page
    if (
        location.pathname === '/vendor/subscription' || 
        location.pathname === '/vendor/notes' || 
        location.pathname === '/vendor/deals' || 
        location.pathname === '/vendor/combos' ||
        location.pathname === '/vendor/config' ||
        location.pathname === '/vendor/products/new' ||
        location.pathname.startsWith('/vendor/products/edit/')
    ) return null;

    const isVendor = user.role === 'vendor';
    const isServiceStore = isVendor && stores?.find(s => s.vendorId === user.id)?.storeType === 'service';
    
    // Check for valid plan
    const hasValidPlan = user?.plan && user.plan !== 'none' && (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) > new Date());

    // Hide BottomNav if vendor has no valid plan
    if (isVendor && !hasValidPlan) return null;

    return (
        <div id="bottom-nav" className="fixed bottom-0 left-0 right-0 z-[110] md:hidden pointer-events-none">
            {/* View Cart Banner - Floating above the bottom nav */}
            <AnimatePresence>
                {!isVendor && cartCount > 0 && location.pathname !== '/cart' && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        onClick={() => navigate('/cart')}
                        className="pointer-events-auto mx-4 mb-3 cursor-pointer bg-primary dark:bg-primary/90 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-primary/20 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-5 py-3.5">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <ShoppingCart className="w-4 h-4 text-primary-foreground" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[14px] font-black text-primary-foreground leading-tight">
                                        {cartCount} {cartCount === 1 ? 'Item' : 'Items'} &middot; ₹{cartSubtotal.toFixed(0)}
                                    </span>
                                    <p className="text-[10px] font-bold text-primary-foreground/70 uppercase tracking-widest leading-tight mt-0.5">
                                        In your basket
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl text-primary-foreground text-[11px] font-black uppercase tracking-widest">
                                View Cart
                                <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative pointer-events-auto bg-white dark:bg-[#0D0D0D]">
                
                <nav className={`${(location.pathname.startsWith('/vendor')) ? '' : 'bg-white/95 dark:bg-[#0D0D0D]/95 backdrop-blur-md'} border-t border-border flex items-center justify-around pb-[max(env(safe-area-inset-bottom),6px)] pt-1 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]`}>
                    {isVendor ? (
                        <>
                            <NavItem
                                to="/vendor"
                                end
                                icon={LayoutDashboard}
                                label={t('common.dashboard')}
                            />
                            <NavItem
                                to="/vendor/products"
                                icon={Package}
                                label={isServiceStore ? 'Services' : t('common.products')}
                            />
                            <NavItem
                                to={isServiceStore ? "/vendor/bookings" : "/vendor/orders"}
                                icon={ShoppingBag}
                                label={isServiceStore ? 'Bookings' : t('common.orders')}
                                badge={isServiceStore ? activeBookingsCount : activeOrdersCount}
                            />
                        </>
                    ) : (
                        <>
                            <NavItem
                                to="/browse"
                                icon={Home}
                                label={t('common.home')}
                            />
                            <NavItem
                                to="/deals"
                                icon={Zap}
                                label={t('common.deals')}
                            />
                            <NavItem
                                to="/receipts"
                                icon={ShoppingBag}
                                label={t('common.orders')}
                                badge={activeReceiptsCount + cartCount}
                            />
                        </>
                    )}

                    <NavItem
                        to="/profile"
                        icon={User}
                        label={t('common.profile')}
                        avatarUrl={getAvatarUrl(user?.avatarUrl || user?.id || 'User')}
                    />
                </nav>
            </div>

            <AnimatePresence>
                {cartConflictItem && <CartConflictModal item={cartConflictItem} />}
            </AnimatePresence>
        </div>
    );
};

const CartConflictModal = ({ item }: { item: any }) => {
    const { setCartConflictItem, addToCart, cart } = useApp();
    
    const currentStoreName = cart[0]?.storeName || 'another store';
    const newStoreName = item.storeName || 'this store';

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4 sm:p-6 pointer-events-none">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCartConflictItem(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl pointer-events-auto border-t sm:border border-border/50"
            >
                <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-foreground leading-tight uppercase tracking-tight">Replace Cart?</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Store Conflict Detected</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                You already have items from <span className="font-black text-foreground">{currentStoreName}</span> in your cart.
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                                Would you like to clear your cart and add items from <span className="font-black text-primary">{newStoreName}</span> instead?
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => addToCart(item, true)}
                            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            Continue with {newStoreName}
                        </button>
                        <button
                            onClick={() => setCartConflictItem(null)}
                            className="w-full py-4 rounded-xl bg-secondary text-foreground font-black text-xs uppercase tracking-widest hover:bg-secondary/80 active:scale-95 transition-all"
                        >
                            Discard & Keep Current
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const NavItem = memo(({ to, icon: Icon, label, badge, end = false, avatarUrl }: { to: string, icon: any, label: string, badge?: number, end?: boolean, avatarUrl?: string }) => {
    const location = useLocation();
    const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

    return (
        <NavLink
            to={to}
            end={end}
            className="relative flex flex-col items-center justify-center py-1.5 flex-1 group hover:bg-muted/30 transition-colors"
        >
            <div className={`relative transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                {avatarUrl ? (
                    <div className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-transparent bg-muted/50'}`}>
                        <img src={avatarUrl} className="w-full h-full object-cover" alt={label} />
                    </div>
                ) : (
                    <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-primary fill-primary/20' : 'text-muted-foreground'} `} strokeWidth={isActive ? 2.5 : 2} />
                )}
                {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center bg-primary text-white text-[10px] font-black rounded-full ring-2 ring-background">
                        {badge}
                    </span>
                )}
            </div>
            <span className={`text-[10px] font-semibold tracking-tight transition-colors duration-300 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
            </span>
        </NavLink>
    );
});

export default BottomNav;
