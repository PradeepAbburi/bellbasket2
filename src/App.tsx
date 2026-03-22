import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import Index from "./pages/Index";
import About from "./pages/About";
import Auth from "./pages/Auth";
import CustomerHome from "./pages/CustomerHome";
import StoreDetail from "./pages/StoreDetail";
import Cart from "./pages/Basket";
import Receipts from "./pages/Receipts";
import Profile from "./pages/Profile";
import VendorDashboard from "./pages/VendorDashboard";
import VendorProducts from "./pages/VendorProducts";
import VendorOrders from "./pages/VendorOrders";
import VendorBookings from "./pages/VendorBookings";
import VendorSetup from "./pages/VendorSetup";
import VendorAnalytics from "./pages/VendorAnalytics";
import VendorPlans from "./pages/VendorPlans";
import VendorReviews from "./pages/VendorReviews";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminVendors from "./pages/admin/AdminVendors";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminAnalyticsNew from "./pages/admin/AdminAnalytics";
import SupportChat from "./pages/SupportChat";
import ResetPassword from "./pages/ResetPassword";
import HelpSupport from "./pages/HelpSupport";
import StoreEditor from "./pages/StoreEditor";
import Download from "./pages/Download";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/Terms";
import Sitemap from "./pages/Sitemap";
import NotFound from "./pages/NotFound";
import TeamLeadDashboard from "./pages/TeamLeadDashboard";
import TeamLeadLogin from "./pages/TeamLeadLogin";
import Leadership from "./pages/Leadership";
import Careers from "./pages/Careers";
import JobDetail from "./pages/JobDetail";
import ApplyJob from "./pages/ApplyJob";
import HrLayout from "./components/hr/HrLayout";
import HrOverview from "./pages/hr/HrOverview";
import HrStaffDirectory from "./pages/hr/StaffDirectory";
import HrStaffOnboarding from "./pages/hr/StaffOnboarding";
import HrStaffPayments from "./pages/hr/StaffPayments";
import StaffProfile from "./pages/hr/StaffProfile";
import AdminPartnerPayments from "./pages/AdminPartnerPayments";
import AdminPartnerBank from "./pages/AdminPartnerBank";
import BottomNav from "./components/BottomNav";
import OnlineStatusProvider from "./components/OnlineStatusProvider";
import Onboarding from "./components/Onboarding";
import NotificationPrompt from "./components/NotificationPrompt";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string | string[] }) => {
  const { user, loading } = useApp();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  // Special verification bypass for admin/hr is kept as per business logic
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

  if (loading) return null;

  if (!user || (!user.isVerified && user.role !== 'admin')) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role !== 'vendor') {
    return <Navigate to="/" replace />;
  }

  let hasValidPlan = user.plan && user.plan !== 'none';
  if (hasValidPlan && user.subscriptionExpiry) {
    const expiryDate = new Date(user.subscriptionExpiry);
    if (new Date() > expiryDate) {
      hasValidPlan = false;
    }
  }

  if (!hasValidPlan) {
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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex flex-col min-h-screen">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public Routes */}
          <Route path="/browse" element={<CustomerHome />} />
          <Route path="/store/:id" element={<StoreDetail />} />
          <Route path="/stores/:slug" element={<StoreDetail />} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="/vendor" element={<VendorProtectedRoute><VendorDashboard /></VendorProtectedRoute>} />
          <Route path="/vendor/products" element={<VendorProtectedRoute><VendorProducts /></VendorProtectedRoute>} />
          <Route path="/vendor/orders" element={<VendorProtectedRoute><VendorOrders /></VendorProtectedRoute>} />
          <Route path="/vendor/bookings" element={<VendorProtectedRoute><VendorBookings /></VendorProtectedRoute>} />
          <Route path="/vendor/setup" element={<ProtectedRoute><VendorSetup /></ProtectedRoute>} />
          <Route path="/vendor/analytics" element={<VendorProtectedRoute><VendorAnalytics /></VendorProtectedRoute>} />
          <Route path="/vendor/subscription" element={<VendorPlans />} />
          <Route path="/vendor/reviews" element={<VendorProtectedRoute><VendorReviews /></VendorProtectedRoute>} />
          <Route path="/vendor/editor" element={<VendorProtectedRoute><StoreEditor /></VendorProtectedRoute>} />

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
          <Route path="/support" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
          <Route path="/download" element={<Download />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/leadership" element={<Leadership />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/careers/job/:id" element={<JobDetail />} />
          <Route path="/careers/apply/:id" element={<ApplyJob />} />
          
          {/* HR Routes */}
          <Route path="/hr" element={<ProtectedRoute requiredRole="hr"><HrLayout /></ProtectedRoute>}>
            <Route index element={<HrOverview />} />
            <Route path="staff" element={<HrStaffDirectory />} />
            <Route path="staff/:id" element={<StaffProfile />} />
            <Route path="onboarding" element={<HrStaffOnboarding />} />
            <Route path="payments" element={<HrStaffPayments />} />
          </Route>

          <Route path="/sitemap.xml" element={<Sitemap />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
        {user && user.isVerified && user.role !== 'admin' && !user.hasCompletedOnboarding && sessionStorage.getItem('allow_onboarding') === 'true' && <Onboarding />}
        <NotificationPrompt />
      </div>
    </BrowserRouter>
  );
};

import { initAudio } from "@/utils/notifications";

const App = () => {
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
    };
    
    // Listen for any interaction to unlock/resume audio
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    
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
