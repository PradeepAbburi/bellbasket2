import React, { useEffect, useState, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/context/AppProvider";
import { useApp } from "./context/appStore";
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

// 1. Lazy-load all page components to drastically reduce initial bundle size
const Index = lazy(() => import("./pages/Index"));
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
const VendorBookings = lazy(() => import("./pages/VendorBookings"));
const VendorSetup = lazy(() => import("./pages/VendorSetup"));
const VendorAnalytics = lazy(() => import("./pages/VendorAnalytics"));
const VendorPlans = lazy(() => import("./pages/VendorPlans"));
const VendorReviews = lazy(() => import("./pages/VendorReviews"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminCredentials = lazy(() => import("./pages/AdminCredentials"));
const AdminModeration = lazy(() => import("./pages/AdminModeration"));
const AdminPartnerBank = lazy(() => import("./pages/AdminPartnerBank"));
const AdminPartnerPayments = lazy(() => import("./pages/AdminPartnerPayments"));
const SupportChat = lazy(() => import("./pages/SupportChat"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
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

const queryClient = new QueryClient();

// Simple loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="flex h-[50vh] w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useApp((state) => state.user);
  const loading = useApp((state) => state.loading);

  if (loading) return null;
  if (!user || (!user.isVerified && user.role !== "admin")) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const VendorProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useApp((state) => state.user);
  const loading = useApp((state) => state.loading);

  if (loading) return null;

  if (!user || !user.isVerified) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role !== "vendor") {
    return <Navigate to="/" replace />;
  }

  let hasValidPlan = user.plan && user.plan !== "none";
  if (hasValidPlan && user.subscriptionExpiry) {
    // Optimized date comparison directly using numeric values
    if (Date.now() > new Date(user.subscriptionExpiry).getTime()) {
      hasValidPlan = false;
    }
  }

  if (!hasValidPlan) {
    return <Navigate to="/vendor/subscription" replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const user = useApp((state) => state.user);
  const requestPushNotifications = useApp((state) => state.requestPushNotifications);
  const installPrompt = useApp((state) => state.installPrompt);
  const installPWA = useApp((state) => state.installPWA);

  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const userId = user?.id;

  useEffect(() => {
    if (!userId || typeof window === "undefined" || !("Notification" in window)) {
      setShowPushPrompt(false);
      return;
    }

    const isSecure = window.isSecureContext || window.location.hostname === "localhost";
    if (!isSecure) {
      setShowPushPrompt(false);
      return;
    }

    setShowPushPrompt(Notification.permission === "default");
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!installPrompt) {
      setShowInstallPrompt(false);
      return;
    }

    const dismissed = localStorage.getItem("bellbasket_install_prompt_dismissed") === "1";
    setShowInstallPrompt(!dismissed);
  }, [installPrompt]);

  const handleEnableNotifications = async () => {
    await requestPushNotifications();
    setShowPushPrompt(false);
  };

  const handleInstallNow = async () => {
    await installPWA();
    setShowInstallPrompt(false);
  };

  const handleInstallLater = () => {
    localStorage.setItem("bellbasket_install_prompt_dismissed", "1");
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
              <Button variant="outline" onClick={() => setShowPushPrompt(false)}>Later</Button>
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

        {/* 2. Wrap Routes in Suspense to handle the lazy loading state */}
        <Suspense fallback={<PageLoader />}>
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

            {/* Vendor Routes */}
            <Route path="/vendor" element={<VendorProtectedRoute><VendorDashboard /></VendorProtectedRoute>} />
            <Route path="/vendor/products" element={<VendorProtectedRoute><VendorProducts /></VendorProtectedRoute>} />
            <Route path="/vendor/orders" element={<VendorProtectedRoute><VendorOrders /></VendorProtectedRoute>} />
            <Route path="/vendor/bookings" element={<VendorProtectedRoute><VendorBookings /></VendorProtectedRoute>} />
            <Route path="/vendor/setup" element={<ProtectedRoute><VendorSetup /></ProtectedRoute>} />
            <Route path="/vendor/analytics" element={<VendorProtectedRoute><VendorAnalytics /></VendorProtectedRoute>} />
            <Route path="/vendor/subscription" element={<VendorPlans />} />
            <Route path="/vendor/reviews" element={<VendorProtectedRoute><VendorReviews /></VendorProtectedRoute>} />
            <Route path="/vendor/editor" element={<VendorProtectedRoute><StoreEditor /></VendorProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/credentials" element={<ProtectedRoute><AdminCredentials /></ProtectedRoute>} />
            <Route path="/admin/moderation" element={<ProtectedRoute><AdminModeration /></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute><AdminPartnerPayments /></ProtectedRoute>} />
            <Route path="/admin/partner-bank" element={<ProtectedRoute><AdminPartnerBank /></ProtectedRoute>} />

            {/* Other Routes */}
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
        </Suspense>

        <BottomNav />
        {user?.isVerified && user.role !== "admin" && !user.hasCompletedOnboarding && sessionStorage.getItem("allow_onboarding") === "true" && <Onboarding />}
      </div>
    </BrowserRouter>
  );
};

const App = () => {
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