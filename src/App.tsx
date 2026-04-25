import React, { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLocation, BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};
import { AppProvider, useApp } from "@/context/AppContext";

import { registerPush, addListeners } from "@/utils/push";
import { AlertCircle, MapPin as PinIcon, Bell as BellIcon, ChevronRight as RightIcon } from 'lucide-react';
import { toast } from 'sonner';
import { initAudio } from "@/utils/notifications";

const PageLoading = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#202020] z-[9999]">
    <div className="animate-pulse">
      <span className="text-2xl md:text-3xl font-black tracking-tighter text-foreground">
        BellBasket
      </span>
    </div>
  </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode, name: string }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error(`Error in ${this.props.name}:`, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-card rounded-2xl border border-destructive/20 m-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">The {this.props.name} failed to load.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary text-white rounded-xl">Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy Loaded Pages
const Index = lazy(() => import("./pages/Index"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const ReceiptDetail = lazy(() => import("./pages/ReceiptDetail"));
const About = lazy(() => import("./pages/About"));
const Auth = lazy(() => import("./pages/Auth"));
const CustomerHome = lazy(() => import("./pages/CustomerHome"));
const StoreDetail = lazy(() => import("./pages/StoreDetail"));
const Cart = lazy(() => import("./pages/Basket"));
const Receipts = lazy(() => import("./pages/Receipts"));
const Profile = lazy(() => import("./pages/Profile"));
const VendorDashboard = lazy(() => import("./pages/VendorDashboard"));
const VendorProducts = lazy(() => import("./pages/VendorProducts"));
const VendorOrders = lazy(() => import("./pages/VendorOrders"));
const VendorStoreConfig = lazy(() => import("./pages/VendorStoreConfig"));
const VendorBookings = lazy(() => import("./pages/VendorBookings"));
const VendorSetup = lazy(() => import("./pages/VendorSetup"));
const VendorAnalytics = lazy(() => import("./pages/VendorAnalytics"));
const VendorPlans = lazy(() => import("./pages/VendorPlans"));
const VendorReviews = lazy(() => import("./pages/VendorReviews"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminVendors = lazy(() => import("./pages/admin/AdminVendors"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminAnalyticsNew = lazy(() => import("./pages/admin/AdminAnalytics"));
const SupportChat = lazy(() => import("./pages/SupportChat"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthAction = lazy(() => import("./pages/AuthAction"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const StoreEditor = lazy(() => import("./pages/StoreEditor"));
const Download = lazy(() => import("./pages/Download"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/Terms"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TeamLeadDashboard = lazy(() => import("./pages/TeamLeadDashboard"));
const TeamLeadLogin = lazy(() => import("./pages/TeamLeadLogin"));
const Leadership = lazy(() => import("./pages/Leadership"));
const Careers = lazy(() => import("./pages/Careers"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const ApplyJob = lazy(() => import("./pages/ApplyJob"));
const HrLayout = lazy(() => import("./components/hr/HrLayout"));
const HrOverview = lazy(() => import("./pages/hr/HrOverview"));
const HrStaffDirectory = lazy(() => import("./pages/hr/StaffDirectory"));
const HrStaffOnboarding = lazy(() => import("./pages/hr/StaffOnboarding"));
const HrStaffPayments = lazy(() => import("./pages/hr/StaffPayments"));
const StaffProfile = lazy(() => import("./pages/hr/StaffProfile"));
const AdminPartnerPayments = lazy(() => import("./pages/AdminPartnerPayments"));
const AdminPartnerBank = lazy(() => import("./pages/AdminPartnerBank"));
const BottomNav = lazy(() => import("./components/BottomNav"));
const OnlineStatusProvider = lazy(() => import("./components/OnlineStatusProvider"));
const Onboarding = lazy(() => import("./components/Onboarding"));
const NotificationPrompt = lazy(() => import("./components/NotificationPrompt"));
const VendorDeals = lazy(() => import("./pages/VendorDeals"));
const CustomerDeals = lazy(() => import("./pages/CustomerDeals"));
const BellNotes = lazy(() => import("./pages/BellNotes"));
const VendorEditProduct = lazy(() => import("./pages/VendorEditProduct"));
const FAQ = lazy(() => import("./pages/FAQ"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string | string[] }) => {
  const { user, loading } = useApp();

  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/auth" replace />;

  const isInternal = user.role === 'admin' || user.role === 'hr';
  if (!user.isVerified && !isInternal) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

const VendorProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useApp();

  if (loading) return <PageLoading />;

  // 1. Auth & Admin Privilege
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'admin') return <>{children}</>;

  // 2. Verification check for non-admins
  if (!user.isVerified) return <Navigate to="/auth" replace />;

  // 3. Role check
  if (user.role !== 'vendor') return <Navigate to="/" replace />;

  // 4. Plan & Expiry
  const plan = user.plan;
  let hasValidPlan = !!(plan && plan !== 'none');
  
  if (hasValidPlan && user.subscriptionExpiry) {
    try {
      const expiry = new Date(user.subscriptionExpiry).getTime();
      if (!isNaN(expiry) && Date.now() > expiry) {
        hasValidPlan = false;
      }
    } catch (e) {}
  }

  // 5. Hard redirect only if no plan at all (not even none/expired)
  if (!plan || plan === 'none') {
    return <Navigate to="/vendor/subscription" replace />;
  }

  return <>{children}</>;
};

const TeamLeadProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const saved = localStorage.getItem("bellbasket_teamlead_session");
  if (!saved) {
    return <Navigate to="/team-lead/login" replace />;
  }
  return <>{children}</>;
};

const AppContent = () => {
  const { user } = useApp();

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/__/auth/action" element={<AuthAction />} />
            <Route path="/auth/action" element={<AuthAction />} />

            <Route path="/browse" element={<CustomerHome />} />
            <Route path="/store/:id" element={<StoreDetail />} />
            <Route path="/stores/:slug" element={<StoreDetail />} />
            <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
            <Route path="/receipt/:id" element={<ReceiptDetail />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/deals" element={<CustomerDeals />} />

            <Route path="/vendor" element={<ErrorBoundary name="VendorDashboard"><VendorProtectedRoute><VendorDashboard /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/products" element={<ErrorBoundary name="VendorProducts"><VendorProtectedRoute><VendorProducts /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/products/new" element={<ErrorBoundary name="VendorNewProduct"><VendorProtectedRoute><VendorEditProduct /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/products/edit/:id" element={<ErrorBoundary name="VendorEditProduct"><VendorProtectedRoute><VendorEditProduct /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/orders" element={<ErrorBoundary name="VendorOrders"><VendorProtectedRoute><VendorOrders /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/config" element={<ErrorBoundary name="VendorStoreConfig"><VendorProtectedRoute><VendorStoreConfig /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/bookings" element={<ErrorBoundary name="VendorBookings"><VendorProtectedRoute><VendorBookings /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/setup" element={<ProtectedRoute><VendorSetup /></ProtectedRoute>} />
            <Route path="/vendor/analytics" element={<ErrorBoundary name="VendorAnalytics"><VendorProtectedRoute><VendorAnalytics /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/subscription" element={<VendorPlans />} />
            <Route path="/vendor/reviews" element={<ErrorBoundary name="VendorReviews"><VendorProtectedRoute><VendorReviews /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/editor" element={<ErrorBoundary name="VendorEditor"><VendorProtectedRoute><StoreEditor /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/deals" element={<ErrorBoundary name="VendorDeals"><VendorProtectedRoute><VendorDeals /></VendorProtectedRoute></ErrorBoundary>} />
            <Route path="/vendor/notes" element={<ErrorBoundary name="VendorNotes"><VendorProtectedRoute><BellNotes /></VendorProtectedRoute></ErrorBoundary>} />

            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminOverview />} />
              <Route path="vendors" element={<AdminVendors />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="analytics" element={<AdminAnalyticsNew />} />
              <Route path="partner-payments" element={<AdminPartnerPayments />} />
              <Route path="partner-bank" element={<AdminPartnerBank />} />
            </Route>
            
            <Route path="/team-lead" element={<TeamLeadProtectedRoute><TeamLeadDashboard /></TeamLeadProtectedRoute>} />
            <Route path="/team-lead/login" element={<TeamLeadLogin />} />
            <Route path="/support/chat/:id" element={<ProtectedRoute><SupportChat /></ProtectedRoute>} />
            <Route path="/support" element={<HelpSupport />} />
            <Route path="/download" element={<Download />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/leadership" element={<Leadership />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/careers/job/:id" element={<JobDetail />} />
            <Route path="/careers/apply/:id" element={<ApplyJob />} />
            
            <Route path="/hr" element={<ProtectedRoute requiredRole="hr"><HrLayout /></ProtectedRoute>}>
              <Route index element={<HrOverview />} />
              <Route path="staff" element={<HrStaffDirectory />} />
              <Route path="staff/:id" element={<StaffProfile />} />
              <Route path="onboarding" element={<HrStaffOnboarding />} />
              <Route path="payments" element={<HrStaffPayments />} />
            </Route>

            <Route path="/sitemap.xml" element={<Sitemap />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
          {user && user.isVerified && user.role !== 'admin' && !user.hasCompletedOnboarding && sessionStorage.getItem('allow_onboarding') === 'true' && <Onboarding />}
          <NotificationPrompt />
        </Suspense>
      </div>
    </BrowserRouter>
  );
};

const App = () => {
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
    };
    
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    // Initialize Native Push - Disabled for Web-Only
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <OnlineStatusProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </OnlineStatusProvider>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
