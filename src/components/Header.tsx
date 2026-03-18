import { useApp } from '@/context/appStore';

import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Bell, User, LogOut, Store, Menu, X, Search, ShoppingBag, Package, TrendingUp, Crown, Smartphone, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import DesktopBackground from './DesktopBackground';
import { getAudioStatus, onAudioStatusChange, initAudio, playBellSound } from '@/utils/notifications';

const Header = () => {
  const { user, cart, orders, serviceBookings, logout, notifications, markAllNotificationsRead, stores } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isDownloadPage = location.pathname === '/download';
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = notifications.filter((n: any) => !n.read && n.id !== 'welcome').length;

  const isVendorView = user?.role === 'vendor';
  const isAdminView = user?.role === 'admin';
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

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

  return (
    <>
      <DesktopBackground />
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        {/* Audio Muted Alert Banner (Only for Vendors/Admins who need real-time alerts) */}
        <AnimatePresence>
          {(isVendorView || isAdminView) && audioStatus !== 'running' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-amber-500 overflow-hidden"
            >
              <button
                onClick={() => { initAudio(); playBellSound(); }}
                className="w-full py-1 text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                title="Browser prevents sound alerts until you click once."
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Sound Alerts Muted • Tap to enable doorbell chime
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to={isAdminView ? "/admin" : (user?.role === 'vendor' ? "/vendor" : "/browse")} className="group flex-shrink-0">
            <span className="font-black text-2xl tracking-tighter text-foreground hover:text-primary transition-colors">BellBasket</span>
          </Link>

          {/* Right Side Navigation Group */}
          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {isAdminView ? (
                <NavLink to="/admin" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                  <Shield className="w-5 h-5" />
                  <span className="hidden lg:inline">Dashboard</span>
                </NavLink>
              ) : !isVendorView ? (
                !isDownloadPage && (
                  <>
                    <NavLink to="/browse" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                      <Search className="w-5 h-5" />
                      <span className="hidden lg:inline">{t('home.welcome')}</span>
                    </NavLink>

                    <NavLink to="/receipts" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
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
                      <span className="hidden lg:inline">{t('common.orders')}</span>
                    </NavLink>

                    <NavLink to="/cart" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                      <div className="relative">
                        <ShoppingCart className="w-5 h-5" />
                        <AnimatePresence>
                          {cartCount > 0 && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="absolute -top-2 -right-2 flex h-4.5 min-w-[18px] px-1 items-center justify-center bg-primary text-white text-[10px] font-black rounded-full ring-2 ring-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] select-none"
                            >
                              {cartCount}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <span className="hidden lg:inline">{t('common.cart')}</span>
                    </NavLink>

                    <NavLink to="/download" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                      <Smartphone className="w-5 h-5" />
                      <span className="hidden lg:inline">Mobile App</span>
                    </NavLink>
                  </>
                )
              ) : (
                // Vendor Specific Tools
                <>
                  {hasValidPlan && (
                    <>
                      <NavLink end to="/vendor" className={({ isActive }) => `${buttonBase} ${isActive ? activeBtn : normalBtn}`}>
                        <Store className="w-5 h-5" />
                        <span className="hidden lg:inline">Dashboard</span>
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
                    </>
                  )}
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

                  {/* Audio Status & Notifications */}

                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowNotifs(!showNotifs);
                          if (!showNotifs) markAllNotificationsRead();
                        }}
                        className={`p-2.5 rounded-xl transition-all relative ${showNotifs ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                      >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white" />
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
                              className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-border/50 overflow-hidden z-50 origin-top-right flex flex-col"
                            >
                              <div className="p-4 border-b border-border/50 flex flex-col gap-2 bg-secondary/20">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-bold text-foreground">Notifications</h3>
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
                                    <span className="text-sm font-medium">No new notifications</span>
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
                                        <p className="text-xs text-muted-foreground leading-snug">{notif.body}</p>
                                        {notif.time && (
                                          <p className="text-[10px] text-muted-foreground/50 mt-1 uppercase tracking-wider font-bold">
                                            {new Date(notif.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                  <NavLink to="/profile" className={({ isActive }) => `hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all group ${isActive ? 'bg-primary/5' : 'hover:bg-primary/5'}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${location.pathname === '/profile' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div className="hidden xl:flex flex-col text-left">
                      <span className="text-sm font-bold text-foreground leading-none">{user?.name?.split(' ')[0] || 'User'}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Profile</span>
                    </div>
                  </NavLink>

                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="hidden md:flex p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all active:scale-95"
                    title={t('common.logout')}
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
            >
              {menuOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-border overflow-hidden"
            >
              <div className="p-4 space-y-2">
                {isAdminView ? (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 py-2">Admin Tools</p>
                    <Link
                      to="/admin"
                      onClick={() => { initAudio(); setMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                    >
                      <Shield className="w-5 h-5 text-primary" />
                      <span className="font-bold text-sm">Admin Dashboard</span>
                    </Link>
                  </>
                ) : isVendorView ? (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 py-2">Vendor Tools</p>
                    {hasValidPlan && (
                      <>
                        <Link
                          to="/vendor"
                          onClick={() => { initAudio(); setMenuOpen(false); }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                        >
                          <Store className="w-5 h-5 text-primary" />
                          <span className="font-bold text-sm">Dashboard</span>
                        </Link>
                        <Link
                          to={isServiceStore ? "/vendor/bookings" : "/vendor/orders"}
                          onClick={() => { initAudio(); setMenuOpen(false); }}
                          className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <ShoppingBag className="w-5 h-5 text-primary" />
                            <span className="font-bold text-sm">{isServiceStore ? 'Manage Bookings' : 'Manage Orders'}</span>
                          </div>
                          {vendorBadgeCount > 0 && (
                            <span className="bg-destructive text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                              {vendorBadgeCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          to="/vendor/analytics"
                          onClick={() => { initAudio(); setMenuOpen(false); }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                        >
                          <TrendingUp className="w-5 h-5 text-primary" />
                          <span className="font-bold text-sm">Analytics</span>
                        </Link>
                      </>
                    )}
                    <Link
                      to="/vendor/subscription"
                      onClick={() => { initAudio(); setMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                    >
                      <Crown className="w-5 h-5 text-primary" />
                      <span className="font-bold text-sm">Subscription</span>
                    </Link>
                  </>
                ) : (
                  !isDownloadPage && (
                    <>
                      <Link
                        to="/browse"
                        onClick={() => { initAudio(); setMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                      >
                        <Search className="w-5 h-5 text-primary" />
                        <span className="font-bold text-sm">Browse Marketplace</span>
                      </Link>
                      <Link
                        to="/receipts"
                        onClick={() => { initAudio(); setMenuOpen(false); }}
                        className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <ShoppingBag className="w-5 h-5 text-primary" />
                          <span className="font-bold text-sm">My Orders</span>
                        </div>
                        {activeReceiptsCount > 0 && (
                          <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            {activeReceiptsCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/cart"
                        onClick={() => { initAudio(); setMenuOpen(false); }}
                        className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="w-5 h-5 text-primary" />
                          <span className="font-bold text-sm">My Cart</span>
                        </div>
                        {cartCount > 0 && (
                          <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            {cartCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/download"
                        onClick={() => { initAudio(); setMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                      >
                        <Smartphone className="w-5 h-5 text-primary" />
                        <span className="font-bold text-sm">Mobile App</span>
                      </Link>
                    </>
                  )
                )}

                <div className="h-px bg-border my-2 mx-4" />

                {user ? (
                  <>
                    <button
                      onClick={() => { initAudio(); logout(); navigate('/'); setMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/5 text-destructive transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-bold text-sm">Logout</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => { initAudio(); setMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm justify-center"
                  >
                    Get Started
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </header>

    </>
  );
};

export default Header;
