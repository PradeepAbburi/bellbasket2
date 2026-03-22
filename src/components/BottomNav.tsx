import { useApp } from '@/context/AppContext';
import { NavLink, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, ShoppingCart, User, ChevronRight, LayoutDashboard, Package, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const BottomNav = () => {
    const { user, cart, orders, serviceBookings, stores } = useApp();
    const { t } = useTranslation();
    const location = useLocation();
    const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

    // Calculate active items for badges
    const activeOrdersCount = orders.filter(o => ['pending', 'accepted', 'packed'].includes(o.status)).length;
    const activeBookingsCount = serviceBookings.filter(b => ['pending', 'accepted'].includes(b.status)).length;

    // For customers, show combined active receipts (orders + bookings)
    const activeReceiptsCount = orders.filter(o => !['completed', 'rejected'].includes(o.status)).length +
        serviceBookings.filter(b => !['completed', 'rejected'].includes(b.status)).length;

    // Hide if not logged in, not verified, or on auth/setup pages, or for HR/Admin roles
    if (!user || !user.isVerified || user.role === 'hr' || user.role === 'admin' || location.pathname === '/auth' || location.pathname === '/vendor/setup') return null;

    // Hide BottomNav on subscription page
    if (location.pathname === '/vendor/subscription') return null;

    const isVendor = user.role === 'vendor';
    const isServiceStore = isVendor && stores?.find(s => s.vendorId === user.id)?.storeType === 'service';
    let hasValidPlan = false;
    if (user?.plan && user.plan !== 'none') {
        hasValidPlan = true;
        if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
            hasValidPlan = false;
        }
    }

    // Hide BottomNav if vendor has no valid plan
    if (isVendor && !hasValidPlan) return null;

    const NavItem = ({ to, icon: Icon, label, badge, end = false }: { to: string, icon: any, label: string, badge?: number, end?: boolean }) => {
        const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

        return (
            <NavLink
                to={to}
                end={end}
                className="relative flex flex-col items-center justify-center py-2 flex-1 group hover:bg-muted/30 transition-colors"
            >
                <div className={`relative transition-transform duration-300 ${isActive ? 'scale-110 text-primary' : 'text-muted-foreground group-hover:scale-105'}`}>
                    <Icon className={`w-5 h-5 mb-1 ${isActive ? 'fill-primary/20' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
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
    };

    return (
        <div id="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
            {/* View Cart Banner - Floating above the bottom nav */}
            <AnimatePresence>
                {!isVendor && cart.length > 0 && location.pathname !== '/cart' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-full mb-4 left-4 right-4 pointer-events-auto md:hidden"
                    >
                        <NavLink
                            to="/cart"
                            className="flex items-center justify-between bg-primary text-primary-foreground h-14 px-6 rounded-2xl shadow-lg shadow-primary/20"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm">{cartCount} {cartCount === 1 ? 'Item' : 'Items'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs">
                                {t('common.cart')} <ChevronRight className="w-4 h-4" />
                            </div>
                        </NavLink>
                    </motion.div>
                )}
            </AnimatePresence>

            <nav className="bg-white dark:bg-[#0D0D0D]/95 dark:backdrop-blur-md border-t border-border flex items-center justify-around pointer-events-auto pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
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
                            icon={Search}
                            label={t('common.browse')}
                        />
                        <NavItem
                            to="/receipts"
                            icon={ShoppingBag}
                            label={t('common.orders')}
                            badge={activeReceiptsCount}
                        />
                        <NavItem
                            to="/cart"
                            icon={ShoppingCart}
                            label={t('common.cart')}
                            badge={cartCount}
                        />
                    </>
                )}

                <NavItem
                    to="/profile"
                    icon={User}
                    label={t('common.profile')}
                />
            </nav>
        </div>
    );
};

export default BottomNav;
