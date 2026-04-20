import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Zap, ShoppingBag, ShoppingCart, LogOut, Shield, Store, FileText, Package, Crown, X } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  user: any;
  isAdminView: boolean;
  isVendorView: boolean;
  isServiceStore: boolean;
  hasValidPlan: boolean;
  vendorBadgeCount: number;
  activeReceiptsCount: number;
  cartCount: number;
  onClose: () => void;
  logout: () => void;
  initAudio: () => void;
}

const MobileMenu = ({
  isOpen,
  user,
  isAdminView,
  isVendorView,
  isServiceStore,
  hasValidPlan,
  vendorBadgeCount,
  activeReceiptsCount,
  cartCount,
  onClose,
  logout,
  initAudio
}: MobileMenuProps) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-white dark:bg-[#202020] border-b border-border overflow-hidden"
        >
          <div className="p-4 space-y-2">
            {isAdminView ? (
              <>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 py-2">Admin Tools</p>
                <Link
                  to={user?.role === 'hr' ? "/hr" : "/admin"}
                  onClick={() => { initAudio(); onClose(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                >
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm">{user?.role === 'hr' ? 'HR Portal' : 'Admin Dashboard'}</span>
                </Link>
              </>
            ) : isVendorView ? (
              <>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 py-2">Vendor Tools</p>
                {hasValidPlan && (
                  <>
                    <Link
                      to="/vendor"
                      onClick={() => { initAudio(); onClose(); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                    >
                      <Store className="w-5 h-5 text-primary" />
                      <span className="font-bold text-sm">Dashboard</span>
                    </Link>
                    <Link
                      to="/vendor/notes"
                      onClick={() => { initAudio(); onClose(); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                    >
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="font-bold text-sm">Bell Notes</span>
                    </Link>
                    <Link
                      to="/vendor/deals"
                      onClick={() => { initAudio(); onClose(); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                    >
                      <Zap className="w-5 h-5 text-primary" />
                      <span className="font-bold text-sm">Deal Manager</span>
                    </Link>
                    <Link
                      to="/vendor/products"
                      onClick={() => { initAudio(); onClose(); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                    >
                      <Package className="w-5 h-5 text-primary" />
                      <span className="font-bold text-sm">Products</span>
                    </Link>
                    <Link
                      to={isServiceStore ? "/vendor/bookings" : "/vendor/orders"}
                      onClick={() => { initAudio(); onClose(); }}
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
                  </>
                )}
                <Link
                  to="/vendor/subscription"
                  onClick={() => { initAudio(); onClose(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                >
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm">Subscription</span>
                </Link>
              </>
            ) : (
                <>
                  <Link
                    to="/browse"
                    onClick={() => { initAudio(); onClose(); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                  >
                    <Search className="w-5 h-5 text-primary" />
                    <span className="font-bold text-sm">Browse Marketplace</span>
                  </Link>
                  <Link
                    to="/deals"
                    onClick={() => { initAudio(); onClose(); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-foreground transition-colors"
                  >
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="font-bold text-sm">Flash Deals Nearby</span>
                  </Link>
                  <Link
                    to="/receipts"
                    onClick={() => { initAudio(); onClose(); }}
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
                    onClick={() => { initAudio(); onClose(); }}
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
                </>
            )}

            <div className="h-px bg-border my-2 mx-4" />

            {user ? (
              <>
                <button
                  onClick={() => { 
                  initAudio(); 
                  logout(); 
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
                  navigate(isMobile ? '/browse' : '/'); 
                  onClose(); 
                }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-red-600 border border-red-100 hover:bg-red-50 transition-colors shadow-sm"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold text-sm">Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => { initAudio(); onClose(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm justify-center"
              >
                Get Started
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
