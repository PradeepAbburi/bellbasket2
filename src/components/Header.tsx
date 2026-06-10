import { useApp } from '@/context/AppContext';
import { getAvatarUrl } from '@/utils/avatars';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Bell, User, LogOut, Store, Menu, X, Search, ShoppingBag, Package, TrendingUp, Crown, Shield, BellRing, FileText, Zap, Settings, Users, Play, Briefcase } from 'lucide-react';
import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MobileMenu = lazy(() => import('./MobileMenu'));
import { useTranslation } from 'react-i18next';
import DesktopBackground from './DesktopBackground';
import { getAudioStatus, onAudioStatusChange, initAudio, playBellSound } from '@/utils/notifications';

const Header = ({ solid = false }: { solid?: boolean }) => {
  const { user, cart, orders, serviceBookings, logout, notifications, markAllNotificationsRead, stores, requestPushNotifications, isAnyModalOpen } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();


  const isDownloadPage = location.pathname === '/download';
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [audioStatus, setAudioStatus] = useState(getAudioStatus());

  useEffect(() => {
    // Sync with audio context state
    const unsub = onAudioStatusChange(setAudioStatus);
    
    // Attempt auto-resume
    if (audioStatus === 'suspended') {
      initAudio();
    }
    
    return unsub;
  }, [audioStatus]);



  const unreadCount = notifications.filter((n: any) => !n.read && n.id !== 'welcome').length;
  
  // High-performance prefetching for navigation
  const prefetchers = {
    browse: () => import('@/pages/CustomerHome'),
    deals: () => import('@/pages/CustomerDeals'),
    receipts: () => import('@/pages/Receipts'),
    cart: () => import('@/pages/Basket'),
    profile: () => import('@/pages/Profile'),
    notifications: () => import('@/pages/Notifications')
  };

  const onHoverPrefetch = (key: keyof typeof prefetchers) => {
    prefetchers[key]().catch(() => {});
  };

  const isVendorView = user?.role === 'vendor';
  const isAdminView = user?.role === 'admin' || user?.role === 'hr';
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const isVendorPage = location.pathname.startsWith('/vendor');
  const isServiceStore = isVendorView && stores?.find(s => s.vendorId === user.id)?.storeType === 'service';

  // Calculate active items for badges
  const activeOrdersCount = orders.filter(o => ['pending', 'accepted', 'packed'].includes(o.status)).length;
  const activeBookingsCount = serviceBookings.filter(b => ['pending', 'accepted'].includes(b.status)).length;
  const vendorBadgeCount = isServiceStore ? activeBookingsCount : activeOrdersCount;

  const activeReceiptsCount = orders.filter(o => !['completed', 'rejected'].includes(o.status)).length +
    serviceBookings.filter(b => !['completed', 'rejected'].includes(b.status)).length;

  let hasValidPlan = false;
  if (user?.plan && user.plan !== 'none') {
    hasValidPlan = true;
    if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
      hasValidPlan = false;
    }
  }

  const buttonBase = "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95";
  const activeBtn = "bg-primary text-primary-foreground shadow-lg shadow-primary/20";
  const normalBtn = "text-muted-foreground hover:bg-primary/10 hover:text-primary";


  return (
    <>
      <DesktopBackground />
      <header className={`fixed top-0 left-0 right-0 z-50 border-b border-border transition-all duration-500 ${isAnyModalOpen ? 'blur-md opacity-0 -translate-y-10 pointer-events-none' : ''} ${(solid || isVendorPage) ? 'bg-white dark:bg-[#202020]' : 'bg-white/80 dark:bg-[#202020]/80 backdrop-blur-md'}`}>


        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to={user?.role === 'hr' ? "/hr" : (user?.role === 'admin' ? "/admin" : (user?.role === 'vendor' ? "/vendor" : "/browse"))} className="group flex-shrink-0">
            <span className="font-black text-2xl tracking-tighter text-foreground hover:text-primary transition-colors">BellBasket</span>
          </Link>

          {/* Right Side Navigation Group */}
          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {isAdminView ? (
                <NavLink to={user?.role === 'hr' ? "/hr" : "/admin"} className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                  <Shield className="w-5 h-5" />
                  <span className="hidden lg:inline">{user?.role === 'hr' ? 'HR Portal' : 'Dashboard'}</span>
                </NavLink>
              ) : !isVendorView ? (
                <>
                  <NavLink 
                    to="/browse" 
                    onMouseEnter={() => onHoverPrefetch('browse')}
                    className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}
                  >
                    <Search className="w-5 h-5" />
                    <span className="hidden lg:inline">{t('home.welcome')}</span>
                  </NavLink>

                  <NavLink 
                    to="/deals" 
                    onMouseEnter={() => onHoverPrefetch('deals')}
                    className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}
                  >
                    <Zap className="w-5 h-5" />
                    <span className="hidden lg:inline">{t('common.deals')}</span>
                  </NavLink>

                  <NavLink 
                    to="/clips" 
                    className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}
                  >
                    <Play className="w-5 h-5" />
                    <span className="hidden lg:inline">Clips</span>
                  </NavLink>

                  <NavLink 
                    to="/receipts" 
                    onMouseEnter={() => onHoverPrefetch('receipts')}
                    className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}
                  >
                    <div className="relative">
                      <ShoppingBag className="w-5 h-5" />
                      <AnimatePresence>
                        {activeReceiptsCount > 0 && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-2 -right-2 flex h-4.5 min-w-[18px] px-1 items-center justify-center bg-primary text-white text-[10px] font-black rounded-full ring-2 ring-white shadow-lg"
                          >
                            {activeReceiptsCount}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="hidden lg:inline">{t('common.orders')} ({activeReceiptsCount})</span>
                  </NavLink>

                  <NavLink 
                    to="/cart" 
                    onMouseEnter={() => onHoverPrefetch('cart')}
                    className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}
                  >
                    <div className="relative">
                      <ShoppingCart className="w-5 h-5" />
                      <AnimatePresence>
                        {cartCount > 0 && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-2 -right-2 flex h-4.5 min-w-[18px] px-1 items-center justify-center bg-primary text-white text-[10px] font-black rounded-full ring-2 ring-white shadow-[0_2px_8_rgba(0,0,0,0.15)] select-none"
                          >
                            {cartCount}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="hidden lg:inline">{t('common.cart')}</span>
                  </NavLink>
                </>
              ) : (
                // Vendor Specific Tools
                <>
                  {hasValidPlan ? (
                    <>
                      <NavLink end to="/vendor" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                        <Store className="w-5 h-5" />
                        <span className="hidden lg:inline">Dashboard</span>
                      </NavLink>
                      <NavLink to="/vendor/clips" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                        <Play className="w-5 h-5" />
                        <span className="hidden lg:inline">Clips</span>
                      </NavLink>
                      <NavLink to="/vendor/notes" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                        <FileText className="w-5 h-5" />
                        <span className="hidden lg:inline">Notes</span>
                      </NavLink>
                      <NavLink to="/vendor/products" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                        <Package className="w-5 h-5" />
                        <span className="hidden lg:inline">Products</span>
                      </NavLink>
                      <NavLink to={isServiceStore ? "/vendor/bookings" : "/vendor/orders"} className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                        <div className="relative">
                          <ShoppingBag className="w-5 h-5" />
                          <AnimatePresence>
                            {vendorBadgeCount > 0 && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute -top-2 -right-2 flex h-4.5 min-w-[18px] px-1 items-center justify-center bg-destructive text-white text-[10px] font-black rounded-full ring-2 ring-white shadow-lg"
                              >
                                {vendorBadgeCount}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <span className="hidden lg:inline">{isServiceStore ? 'Manage Bookings' : 'Manage Orders'}</span>
                      </NavLink>
                      <NavLink to="/vendor/analytics" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                        <TrendingUp className="w-5 h-5" />
                        <span className="hidden lg:inline">Analytics</span>
                      </NavLink>
                      <NavLink to="/vendor/config" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                        <Settings className="w-5 h-5" />
                        <span className="hidden lg:inline">Config</span>
                      </NavLink>
                      <NavLink to="/careers" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                        <Briefcase className="w-5 h-5" />
                        <span className="hidden lg:inline">Post Jobs</span>
                      </NavLink>
                    </>
                  ) : null}
                  <NavLink to="/vendor/subscription" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                    <Crown className="w-5 h-5" />
                    <span className="hidden lg:inline">Subscription</span>
                  </NavLink>
                </>
              )}
            </nav>

            {/* User Auth Section */}
            <div className="flex items-center gap-1">
              <div className="w-px h-6 bg-border mx-2 hidden md:block" />
              {user ? (
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowNotifs(!showNotifs);
                        if (!showNotifs) markAllNotificationsRead();
                      }}
                      onMouseEnter={() => {
                        onHoverPrefetch('notifications');
                        onHoverPrefetch('receipts');
                      }}
                      className={`p-2 rounded-xl transition-all relative ${showNotifs ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                    >
                      <Bell className="w-5.5 h-5.5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-4 h-4 flex items-center justify-center bg-primary text-white text-[8px] font-black rounded-full ring-2 ring-white shadow-sm">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {showNotifs && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute top-full right-0 mt-2 w-80 bg-[#202020] rounded-2xl shadow-xl border border-border/50 overflow-hidden z-50 origin-top-right flex flex-col"
                          >
                            <div className="p-4 border-b border-border/50 flex flex-col gap-2 bg-secondary/20">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-white">Notifications</h3>
                                {unreadCount > 0 && (
                                  <button onClick={markAllNotificationsRead} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                    Mark all read
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto w-full">
                              {notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                  <Bell className="w-8 h-8 opacity-20 mb-2" />
                                  <span className="text-sm font-medium text-white/50">No new notifications</span>
                                </div>
                              ) : (
                                <div className="divide-y divide-border/20">
                                    {notifications.map((notif: any) => (
                                      <div
                                        key={notif.id}
                                        onClick={() => {
                                          setShowNotifs(false);
                                          if (notif.url) {
                                            navigate(notif.url);
                                          } else if (user?.role === 'vendor') {
                                            navigate('/vendor/orders');
                                          } else {
                                            navigate('/receipts');
                                          }
                                        }}
                                        className={`p-4 hover:bg-secondary/30 transition-colors cursor-pointer ${!notif.read && notif.id !== 'welcome' ? 'bg-primary/5' : ''}`}
                                      >
                                        <div className="flex justify-between items-start gap-2">
                                          <p className={`font-bold text-sm text-foreground mb-0.5 ${!notif.read && notif.id !== 'welcome' ? 'text-primary' : ''}`}>
                                            {notif.title}
                                          </p>
                                          {!notif.read && notif.id !== 'welcome' && (
                                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                          )}
                                        </div>
                                        <p className="text-xs text-white/70 leading-snug text-left">{notif.body}</p>
                                        {notif.time && (
                                          <p className="text-[10px] text-white/30 mt-1 uppercase tracking-wider font-bold text-left">
                                            {new Date(notif.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="p-2 border-t border-border/50 bg-secondary/10">
                                <button
                                  onClick={() => {
                                    setShowNotifs(false);
                                    navigate('/notifications');
                                  }}
                                  className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all active:scale-95"
                                >
                                  View All Notifications
                                </button>
                              </div>
                            </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <NavLink 
                    to="/profile" 
                    onMouseEnter={() => onHoverPrefetch('profile')}
                    className={({ isActive }) => `hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all group ${isActive ? 'bg-primary/5' : 'hover:bg-primary/5'}`}
                  >
                    <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-all ${location.pathname === '/profile' ? 'ring-2 ring-primary shadow-md shadow-primary/20 scale-105' : 'bg-primary/10 group-hover:bg-primary'}`}>
                      <img 
                        src={getAvatarUrl(user?.avatarUrl || user?.id || 'User')} 
                        alt={user?.name || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="hidden xl:flex flex-col text-left">
                      <span className="text-sm font-bold text-foreground leading-none">{user?.name?.split(' ')[0] || 'User'}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Profile</span>
                    </div>
                  </NavLink>

                  <button
                    onClick={() => { 
                      logout(); 
                      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
                      navigate('/'); 
                    }}
                    className="hidden md:flex p-2.5 text-red-600 bg-white hover:bg-red-50 rounded-xl transition-all active:scale-95 border border-red-50"
                    title="Sign Out"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Link to="/auth" onClick={() => initAudio()} className="hidden sm:block text-sm font-bold text-muted-foreground hover:text-primary px-3 py-2 transition-colors">Log In</Link>
                  <Link to="/auth" onClick={() => initAudio()} className="text-sm font-black gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95 whitespace-nowrap">
                    Join Now
                  </Link>
                </div>
              )}
            </div>
            {/* Mobile Menu Button */}
            <button
                onClick={() => { initAudio(); setMenuOpen(!menuOpen); }}
                className="md:hidden p-2 rounded-xl hover:bg-secondary transition-colors"
                aria-label={menuOpen ? "Close Menu" : "Open Menu"}
                aria-expanded={menuOpen}
            >
                {menuOpen ? <X className="w-6 h-6 text-foreground" aria-hidden="true" /> : <Menu className="w-6 h-6 text-foreground" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer - Lazy Loaded */}
        <Suspense fallback={null}>
          <MobileMenu 
            isOpen={menuOpen}
            user={user}
            isAdminView={isAdminView}
            isVendorView={isVendorView}
            isServiceStore={isServiceStore}
            hasValidPlan={hasValidPlan}
            vendorBadgeCount={vendorBadgeCount}
            activeReceiptsCount={activeReceiptsCount}
            cartCount={cartCount}
            unreadCount={unreadCount}
            onClose={() => setMenuOpen(false)}
            logout={logout}
            initAudio={initAudio}
          />
        </Suspense>
      </header>
    </>
  );
};

export default Header;
