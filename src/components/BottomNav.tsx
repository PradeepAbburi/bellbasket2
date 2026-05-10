import React, { memo } from 'react';
import { useApp } from '@/context/AppContext';
import { NavLink, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, ShoppingCart, User, ChevronRight, LayoutDashboard, Package, Home, Zap } from 'lucide-react';
import { getAvatarUrl } from '@/utils/avatars';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const BottomNav = () => {
    const { user, cart, orders, serviceBookings, stores, cartSubtotal, isAnyModalOpen } = useApp();
    const { t } = useTranslation();
    const location = useLocation();

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
        <div id="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
            {/* View Cart Banner - Floating above the bottom nav */}


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
