import { useEffect, useState } from "react";
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
import AdminDashboard from "./pages/AdminDashboard";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminCredentials from "./pages/AdminCredentials";
import AdminModeration from "./pages/AdminModeration";
import AdminPartnerBank from "./pages/AdminPartnerBank";
import AdminPartnerPayments from "./pages/AdminPartnerPayments";
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
import BottomNav from "./components/BottomNav";
import OnlineStatusProvider from "./components/OnlineStatusProvider";
import Onboarding from "./components/Onboarding";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useApp();

  if (loading) return null;
  if (!user || (!user.isVerified && user.role !== 'admin')) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const VendorProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useApp();

  if (loading) return null;

  if (!user || !user.isVerified) {
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

const AppContent = () => {
  const { user, requestPushNotifications, installPrompt, installPWA } = useApp();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId || typeof window === 'undefined' || !("Notification" in window)) {
      setShowPushPrompt(false);
      return;
    }

    const isSecure = window.isSecureContext || window.location.hostname === 'localhost';
    if (!isSecure) {
      setShowPushPrompt(false);
      return;
    }

    const shouldShow = Notification.permission === 'default';
    setShowPushPrompt(shouldShow);
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!installPrompt) {
      setShowInstallPrompt(false);
      return;
    }

    const dismissed = localStorage.getItem('bellbasket_install_prompt_dismissed') === '1';
    setShowInstallPrompt(!dismissed);
  }, [installPrompt]);

  const handleEnableNotifications = async () => {
    await requestPushNotifications();
    setShowPushPrompt(false);
  };

  const handleMaybeLater = () => {
    setShowPushPrompt(false);
  };

  const handleInstallNow = async () => {
    await installPWA();
    setShowInstallPrompt(false);
  };

  const handleInstallLater = () => {
    localStorage.setItem('bellbasket_install_prompt_dismissed', '1');
    setShowInstallPrompt(false);
  };

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex flex-col min-h-screen">
        <Dialog open={showPushPrompt} onOpenChange={setShowPushPrompt}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Enable notifications</DialogTitle>
              <DialogDescription>
                Turn on notifications to get live order updates, booking alerts, and important announcements.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleMaybeLater}>Later</Button>
              <Button onClick={handleEnableNotifications}>Enable</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 w-72">
          {showInstallPrompt && (
            <div className="rounded-lg border bg-background p-4 shadow-lg">
              <p className="text-sm text-foreground mb-3">
                Install BellBasket for a faster, app-like experience.
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleInstallLater}>Later</Button>
                <Button size="sm" onClick={handleInstallNow}>Install app</Button>
              </div>
            </div>
          )}
        </div>
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

          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/credentials" element={<ProtectedRoute><AdminCredentials /></ProtectedRoute>} />
          <Route path="/admin/moderation" element={<ProtectedRoute><AdminModeration /></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute><AdminPartnerPayments /></ProtectedRoute>} />
          <Route path="/admin/partner-bank" element={<ProtectedRoute><AdminPartnerBank /></ProtectedRoute>} />
          <Route path="/team-lead" element={<TeamLeadDashboard />} />
          <Route path="/team-lead/login" element={<TeamLeadLogin />} />
          <Route path="/support/chat/:id" element={<ProtectedRoute><SupportChat /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
          <Route path="/download" element={<Download />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/leadership" element={<Leadership />} />
          <Route path="/sitemap.xml" element={<Sitemap />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
        {user && user.isVerified && user.role !== 'admin' && !user.hasCompletedOnboarding && sessionStorage.getItem('allow_onboarding') === 'true' && <Onboarding />}
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
