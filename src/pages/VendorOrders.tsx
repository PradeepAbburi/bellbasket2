import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Package, Shield, Key, Phone, KeyRound, X, Trash2, RefreshCcw, MapPin, Clock, Share2 } from 'lucide-react';

import PullToRefresh from '@/components/ui/PullToRefresh';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { Order } from '@/types';
import { useApp } from '@/context/AppContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { sendInAppNotification, playBellSound } from '@/utils/notifications';
import PageLoading from '@/components/PageLoading';

const pickupFlow = ['pending', 'accepted', 'packed', 'completed'] as const;
const deliveryFlow = ['pending', 'accepted', 'packed', 'out_for_delivery', 'completed'] as const;

const VendorOrders = () => {
    const { user, orders: allOrders, loading, refreshData, setIsAnyModalOpen } = useApp();
    const navigate = useNavigate();
    const { t } = useTranslation();

    if (loading) return <PageLoading />;
  const [customerData, setCustomerData] = useState<Record<string, any>>({});
  const [view, setView] = useState<'active' | 'past'>('active');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Selection Mode State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<any>(null);
  const [orderToReject, setOrderToReject] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);
  const [rejectionsToHideInSession, setRejectionsToHideInSession] = useState<Set<string>>(new Set());

  // Use global modal state to hide nav elements
  useEffect(() => {
    setIsAnyModalOpen(!!(selectedOrderId || orderToReject));
    return () => setIsAnyModalOpen(false);
  }, [selectedOrderId, orderToReject, setIsAnyModalOpen]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast.info("Refreshing orders...");
    window.location.reload();
  };

  // Memoize filtered orders from global state for live updates
  const orders = useMemo(() => {
    const filtered = allOrders.filter(o => o.storeId === user?.id);
    
    const getTime = (d: any) => {
      if (!d) return 0;
      const time = new Date(d).getTime();
      return isNaN(time) ? 0 : time;
    };

    return filtered.sort((a, b) => {
      const dateA = getTime(a.date);
      const dateB = getTime(b.date);
      return dateB - dateA;
    });
  }, [allOrders, user?.id]);

  const activeOrders = orders.filter(o => {
    if (o.status !== 'completed' && o.status !== 'rejected') return true;
    if (o.status === 'rejected') {
      if (rejectionsToHideInSession.has(o.id)) return false;
      const rejectedAt = o.rejectedAt ? new Date(o.rejectedAt).getTime() : 0;
      return (Date.now() - rejectedAt) < 5000; // Stay in active for 5 seconds or until refresh
    }
    return false;
  });

  const pastOrders = orders.filter(o => {
    if (o.status === 'completed') return true;
    if (o.status === 'rejected') {
      if (rejectionsToHideInSession.has(o.id)) return true;
      const rejectedAt = o.rejectedAt ? new Date(o.rejectedAt).getTime() : 0;
      return (Date.now() - rejectedAt) >= 5000;
    }
    return false;
  });

  const displayOrders = view === 'active' ? activeOrders : pastOrders;
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;

  useEffect(() => {
    const fetchCustomers = async () => {
      const missingUids = [...new Set(orders.filter(o => !o.userName || !o.userPhone).map(o => o.userId).filter(Boolean))];
      if (missingUids.length === 0) return;
      
      const data: Record<string, any> = { ...customerData };
      let changed = false;

      for (const uid of missingUids) {
        if (!uid || typeof uid !== 'string' || data[uid]) continue;
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const userData = snap.data();
          data[uid] = userData;
          changed = true;
        }
      }
      if (changed) setCustomerData(data);
    };

    if (orders.length > 0) fetchCustomers();
  }, [orders]);

  const advanceStatus = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const flow = order.deliveryMethod === 'delivery' ? deliveryFlow : pickupFlow;
    const idx = flow.indexOf(order.status as any);
    
    if (idx < flow.length - 1) {
      const next = flow[idx + 1];

      try {
        const updateData: any = { status: next };
        if (next === 'completed') {
          updateData.completedAt = new Date().toISOString();
        }
        await updateDoc(doc(db, 'orders', orderId), updateData);
        playBellSound(next === 'accepted'); // Play high pitch for acceptance

        // 🔔 Push notification to the customer
        if (order.userId) {
          const statusMessages: Record<string, string> = {
            accepted: `✅ Your ${order.deliveryMethod === 'delivery' ? 'delivery ' : ''}order from ${order.storeName} has been accepted!`,
            packed: order.deliveryMethod === 'pickup'
              ? `📦 Your order from ${order.storeName} is ready for pickup!`
              : `📦 Your order from ${order.storeName} has been packed!`,
            out_for_delivery: `🚚 Your order from ${order.storeName} is out for delivery!`,
            ready: `🔔 Your order from ${order.storeName} is ready for pickup!`,
            completed: `🎉 Your order from ${order.storeName} has been ${order.deliveryMethod === 'delivery' ? 'delivered' : 'completed'}!`,
          };
          const body = statusMessages[next] || `Your order status updated to: ${next}`;
          sendInAppNotification(order.userId, {
            title: 'BellBasket Order Update',
            body,
            url: '/receipts',
            type: 'order',
            id: orderId
          });
        }

        toast.success(`${t('vendor_orders.status_updated')}: ${next.replace(/_/g, ' ')}`);
        if (selectedOrderId === orderId) {
          setSelectedOrderId(null);
        }
      } catch (error) {
        toast.error(t('vendor_orders.failed_update'));
      }
    }
  };

  const rejectOrder = async (orderId: string) => {
    setOrderToReject(orderId);
    setRejectionReasonInput('');
  };

  const confirmRejection = async () => {
    if (!orderToReject) return;
    
    setIsSubmittingRejection(true);
    try {
      const order = orders.find(o => o.id === orderToReject);
      await updateDoc(doc(db, 'orders', orderToReject), {
        status: 'rejected',
        rejectionReason: rejectionReasonInput || "No reason provided",
        rejectedAt: new Date().toISOString()
      });

      // 🔔 Push notification to the customer with reason
      if (order?.userId) {
        sendInAppNotification(order.userId, {
          title: '❌ Order Rejected',
          body: `Order from ${order.storeName} was rejected. Reason: ${rejectionReasonInput || "Not specified"}`,
          url: '/receipts',
          type: 'order',
          id: orderToReject
        });
      }

      toast.success("Order rejected");
      
      // 🕒 Start a 5-second timer to move to HISTORY
      const currentOrderId = orderToReject;
      setTimeout(() => {
        setRejectionsToHideInSession(prev => {
          const next = new Set(prev);
          next.add(currentOrderId);
          return next;
        });
      }, 5000);

      setOrderToReject(null);
      setSelectedOrderId(null);
    } catch (e) {
      toast.error("Failed to reject order");
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const toggleItemRejection = async (orderId: string, itemProductId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map(item => {
      if (item.product.id === itemProductId) {
        const isRejected = item.status === 'rejected';
        return {
          ...item,
          status: isRejected ? 'accepted' : 'rejected',
          rejectionReason: isRejected ? undefined : 'Out of stock'
        };
      }
      return item;
    });

    const allRejected = updatedItems.every(item => item.status === 'rejected');

    try {
      if (allRejected) {
        await updateDoc(doc(db, 'orders', orderId), {
          items: updatedItems,
          status: 'rejected',
          rejectionReason: 'All items were rejected by vendor (out of stock)',
          rejectedAt: new Date().toISOString()
        });
        toast.info("All items in order rejected. Order marked as rejected.");
      } else {
        await updateDoc(doc(db, 'orders', orderId), {
          items: updatedItems
        });
        if (order.userId) {
          const rejectedCount = updatedItems.filter(i => i.status === 'rejected').length;
          sendInAppNotification(order.userId, {
            title: '⚠️ Order Item Status Updated',
            body: `${rejectedCount} item(s) from ${order.storeName} marked out of stock. Receipt updated.`,
            url: `/receipt/${orderId}`,
            type: 'order',
            id: orderId
          });
        }
        toast.success("Item status updated");
      }
    } catch (err) {
      toast.error("Failed to update item status");
    }
  };

  const cancelOrderWithPin = async (orderId: string, correctPin: string) => {
    const inputPin = window.prompt("To cancel this order, please enter the Customer's Order PIN:");

    if (inputPin === null) return; // User cancelled prompt

    if (inputPin.trim() === correctPin) {
      try {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        const orderData = orderSnap.data();
        await updateDoc(doc(db, 'orders', orderId), {
          status: 'rejected',
          rejectedAt: new Date().toISOString()
        });

        // 🔔 Push notification to the customer
        if (orderData?.userId) {
          sendInAppNotification(orderData.userId, {
            title: '❌ Order Cancelled',
            body: `Your order from ${orderData.storeName} has been cancelled by the vendor.`,
            url: '/receipts',
            type: 'order',
            id: orderId
          });
        }

        toast.success("Order cancelled successfully");
        if (selectedOrderId === orderId) {
          setSelectedOrderId(null);
        }
      } catch (e) {
        toast.error(t('vendor_orders.failed_update'));
      }
    } else {
      toast.error("Incorrect PIN. Please ask the customer for the correct PIN shown on their receipt.");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Remove this order from your history? It will still be visible to the customer.")) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), { deletedByVendor: true });
      toast.success("Order removed from your view");
    } catch (e) {
      toast.error("Failed to remove order");
    }
  };

  // Selection Logic
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      if (newSelected.size === 0) setIsSelectionMode(false);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const startLongPress = (id: string) => {
    const timer = setTimeout(() => {
      setIsSelectionMode(true);
      toggleSelection(id);
      if (window.navigator.vibrate) window.navigator.vibrate(50); // Haptic feedback if supported
    }, 600);
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === displayOrders.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(displayOrders.map(o => o.id)));
      setIsSelectionMode(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Permanently remove ${selectedIds.size} ${view} items from your view?`)) return;

    const loadingToast = toast.loading(`Deleting ${selectedIds.size} items...`);
    try {
      const promises = Array.from(selectedIds).map(id =>
        updateDoc(doc(db, 'orders', id), { deletedByVendor: true })
      );
      await Promise.all(promises);
      toast.dismiss(loadingToast);
      toast.success(`${selectedIds.size} items removed`);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error("Deletion failed");
    }
  };

  return (
    <div className="min-h-screen gradient-warm">
      <Header />
      <PullToRefresh onRefresh={refreshData} className="pt-20 pb-40 px-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/vendor')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('common.dashboard')}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {isSelectionMode ? `Selected (${selectedIds.size})` : `${t('vendor_orders.title')} (${activeOrders.length})`}
              </h1>
              {!isSelectionMode && (
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`p-2 rounded-full bg-secondary text-primary hover:bg-primary hover:text-white transition-all shadow-sm ${isRefreshing ? 'opacity-50' : 'active:scale-95'}`}
                >
                  <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
          
          {isSelectionMode ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-black uppercase tracking-widest hover:bg-secondary/80 transition-all border border-border/50"
              >
                {selectedIds.size === displayOrders.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-xl bg-destructive text-white text-xs font-black uppercase tracking-widest hover:bg-destructive/90 transition-all"
              >
                Delete ({selectedIds.size})
              </button>
              <button
                onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
                className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-secondary p-1.5 rounded-2xl flex items-center gap-1 w-fit shadow-inner">
            <button
              onClick={() => setView('active')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t('vendor_orders.active')} ({activeOrders.length})
            </button>
            <button
              onClick={() => setView('past')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === 'past' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t('vendor_orders.history')} ({pastOrders.length})
            </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {displayOrders.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
              <p className="text-muted-foreground">No {view} orders found.</p>
            </div>
          ) : (
            displayOrders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onPointerDown={() => !isSelectionMode && startLongPress(order.id)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleSelection(order.id);
                  } else {
                    navigate(`/receipt/${order.id}`);
                  }
                }}
                className={`rounded-2xl p-5 border shadow-sm transition-all cursor-pointer relative overflow-hidden ${
                  selectedIds.has(order.id) 
                    ? 'bg-primary/5 border-primary ring-2 ring-primary/20' 
                    : 'bg-card dark:bg-[#202020] border-border/50 hover:border-border'
                }`}
              >
                {isSelectionMode && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(order.id) ? 'bg-primary border-primary' : 'bg-transparent border-muted-foreground/30'
                    }`}>
                      {selectedIds.has(order.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-[10px] font-black font-mono tracking-tighter bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-md border border-border/40 shadow-sm transition-all hover:bg-secondary">
                        {order.id.slice(-8).toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1.5 bg-secondary/40 px-2 py-0.5 rounded-md border border-border/20">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                           {new Date(order.date).toLocaleDateString()}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="text-[10px] font-black text-foreground uppercase tracking-wider whitespace-nowrap">
                           {new Date(order.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </div>
                    <p className="font-semibold text-foreground text-sm">
                      {order.items.filter(i => i.status !== 'rejected').length} of {order.items.length} {t('common.items')} · ₹{(() => {
                        const itemsTotal = order.items.reduce((sum, item) => sum + (item.status === 'rejected' ? 0 : item.product.price * item.quantity), 0);
                        return itemsTotal + (order.deliveryFee || 0);
                      })()}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-primary">
                      <div className="flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        <span>My Vendor Phone: {user?.phone || 'Not Set'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                      {order.paymentMethod === 'online' ? `💳 ${t('common.pay_online')}` : order.deliveryMethod === 'delivery' ? `💵 ${t('common.pay_on_delivery')}` : `💵 ${t('common.pay_on_pickup')}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${
                      order.status === 'packed' || order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      order.status === 'accepted' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                      order.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {order.status === 'out_for_delivery' ? 'OUT FOR DELIVERY' :
                       t(`common.order_status.${order.status}`, { defaultValue: order.status.toUpperCase() })}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                {(order.userId || order.userName) && (
                  <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {(order.userName || customerData[order.userId || '']?.name || 'C').charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {order.userName || customerData[order.userId || '']?.name || t('common.anonymous_customer')}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{t('common.customer')}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${order.customerPhone || order.userPhone || customerData[order.userId || '']?.phone}`}
                          className="p-2 rounded-lg bg-white shadow-sm text-primary hover:scale-110 transition-transform"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {order.customerPhone || order.userPhone || customerData[order.userId || '']?.phone || t('common.no_phone')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Information Box */}
                {(order.customerAddress || order.deliveryMethod === 'delivery') && (
                  <div className="mb-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <Package className="w-4 h-4" />
                      </div>
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Delivery Details</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Contact Person</p>
                          <p className="text-xs font-black text-foreground">{order.customerName || order.userName || t('common.customer')}</p>
                          <a 
                            href={`tel:${order.customerPhone || order.userPhone}`} 
                            className="text-[10px] font-bold text-primary flex items-center gap-1.5"
                            onClick={e => e.stopPropagation()}
                          >
                            <Phone className="w-2.5 h-2.5" />
                            {order.customerPhone || order.userPhone}
                          </a>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Delivery Address</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const addr = order.customerAddress || customerData[order.userId || '']?.address;
                              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr || '')}`, '_blank');
                            }}
                            className="text-left group"
                          >
                             <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-start gap-1.5">
                                <MapPin className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{order.customerAddress || customerData[order.userId || '']?.address}</span>
                             </p>
                          </button>
                       </div>
                    </div>
                  </div>
                )}


                {/* Order Pickup PIN */}
                {order.pickupCode && (
                  <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl flex border border-amber-200/60 dark:border-amber-700/40 shadow-sm overflow-hidden">
                    <div className="flex-1 p-3 flex items-center gap-3 border-r border-amber-200/40 dark:border-amber-700/30">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                        <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Order PIN</p>
                        <p className="text-lg font-black text-foreground tracking-[0.2em] font-mono leading-none">{order.pickupCode}</p>
                      </div>
                    </div>
                    <div className="flex-1 p-3 bg-white/10 dark:bg-black/20 flex flex-col justify-center items-end relative">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Total Pay</p>
                      <p className="text-xl font-black text-primary leading-none">
                        ₹{(() => {
                          const itemsTotal = order.items.reduce((sum, item) => sum + (item.status === 'rejected' ? 0 : item.product.price * item.quantity), 0);
                          return itemsTotal + (order.deliveryFee || 0);
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Items */}
                <div
                  className={`space-y-1 mb-3 ${['pending', 'accepted'].includes(order.status) ? 'p-3 bg-secondary/20 rounded-xl border border-border/50' : ''}`}
                >
                  <div 
                    className="flex justify-between items-center mb-2 pb-2 border-b border-border/50 cursor-pointer group/view"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrderId(order.id);
                    }}
                  >
                    <span className="text-xs font-bold text-foreground">Products ({order.items.length})</span>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-widest group-hover/view:scale-105 transition-transform">Tap to view</span>
                  </div>
                  <div 
                    className="space-y-1 cursor-pointer hover:bg-primary/5 p-2 -m-2 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrderId(order.id);
                    }}
                  >
                    {order.items.slice(0, 2).map(item => (
                      <p key={item.product.id} className="text-xs text-muted-foreground flex justify-between">
                        <span>
                          {t(`products.${item.product.name}`, { defaultValue: item.product.name })}
                          {item.product.quantity && <span className="ml-1 opacity-70">({item.product.quantity.includes(' - ') ? item.product.quantity : item.product.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')})</span>}
                        </span>
                        <span className="font-bold text-foreground">× {item.quantity}</span>
                      </p>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mt-2 border-t border-primary/5 pt-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                        + {order.items.length - 2} More {order.items.length - 2 === 1 ? 'Product' : 'Products'}
                      </p>
                    )}
                  </div>
                </div>

          {order.status === 'completed' || order.status === 'rejected' ? null : (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50 w-full justify-end">
                    {order.status === 'out_for_delivery' ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelOrderWithPin(order.id, order.pickupCode || ''); }}
                          className="bg-destructive/10 text-destructive text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); advanceStatus(order.id); }}
                          className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3" />
                          Complete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderId(order.id);
                        }}
                        className="bg-primary text-primary-foreground w-full py-2.5 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        {order.status === 'pending' ? 'Review & Accept' : 
                         order.status === 'accepted' ? 'Pack Order' :
                          order.status === 'packed' ? (order.deliveryMethod === 'delivery' ? 'Out for Delivery' : 'Complete Order') :
                         'Continue'}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-3xl" onClick={() => setSelectedOrderId(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card dark:bg-[#1A1A1A] w-full max-w-lg rounded-[2.5rem] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-border/50"
            >
              {/* Modal Header - Fixed Compact Height */}
              <div className="h-[70px] px-6 flex items-center justify-between bg-secondary/20 border-b border-border/10 shrink-0">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-black text-foreground tracking-tight uppercase">
                    {['completed', 'rejected'].includes(selectedOrder.status) ? 'Order Items' : 'Review Order'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-background/50 px-2 py-0.5 rounded-md w-fit">#{selectedOrder.id.slice(-6).toUpperCase()}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/receipt/${selectedOrder.id}`);
                      }}
                      className="text-[10px] text-primary font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      View Receipt
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="p-2 rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-all active:scale-90 border border-black/5 flex items-center justify-center"
                >
                  <X className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                {/* Customer Details */}
                {(selectedOrder.userId || selectedOrder.userName) && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {(selectedOrder.userName || customerData[selectedOrder.userId || '']?.name || 'C').charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {selectedOrder.userName || customerData[selectedOrder.userId || '']?.name || t('common.anonymous_customer')}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{t('common.customer')}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${selectedOrder.customerPhone || selectedOrder.userPhone || customerData[selectedOrder.userId || '']?.phone}`}
                          className="p-2 rounded-lg bg-white shadow-sm text-primary hover:scale-110 transition-transform"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {selectedOrder.customerPhone || selectedOrder.userPhone || customerData[selectedOrder.userId || '']?.phone || t('common.no_phone')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Information Box */}
                {(selectedOrder.customerAddress || selectedOrder.deliveryMethod === 'delivery') && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <Package className="w-4 h-4" />
                      </div>
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Delivery Details</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                       <div className="space-y-1">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Delivery Address</p>
                          <div className="text-left group">
                             <p className="text-xs font-bold text-foreground transition-colors flex items-start gap-1.5">
                                <MapPin className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                                <span className="">{selectedOrder.customerAddress || customerData[selectedOrder.userId || '']?.address}</span>
                             </p>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* Product Review List */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-primary" />
                    <h3 className="font-black text-[10px] text-foreground uppercase tracking-[0.2em]">Order Products ({selectedOrder.items.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedOrder.items.map(item => (
                      <div key={item.product.id} className={`p-3 rounded-[1.5rem] border shadow-sm transition-all ${item.status === 'rejected' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-secondary/5 border-border/20 hover:bg-secondary/10'}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center overflow-hidden border border-border/20 shadow-sm p-1 shrink-0">
                              {item.product.image ? (
                                <img src={item.product.image} alt={item.product.name} className={`w-full h-full object-contain rounded-lg ${item.status === 'rejected' ? 'grayscale opacity-60' : ''}`} />
                              ) : (
                                <Package className="w-6 h-6 text-muted-foreground opacity-30" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-bold text-xs leading-tight break-words ${item.status === 'rejected' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                  {t(`products.${item.product.name}`, { defaultValue: item.product.name })}
                                </p>
                                {item.status === 'rejected' && (
                                  <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Rejected / Out of Stock
                                  </span>
                                )}
                              </div>
                              {item.product.quantity && (
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-80">{item.product.quantity}</p>
                              )}
                              <p className="text-[9px] font-black text-primary mt-1.5 opacity-90">
                                ₹{item.product.price} / unit
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0 ml-4">
                            <div className="font-mono font-black text-sm text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                              x{item.quantity}
                            </div>
                            <p className={`text-[10px] font-bold ${item.status === 'rejected' ? 'line-through text-rose-400' : 'text-muted-foreground'}`}>
                              {item.status === 'rejected' ? '₹0 (Excluded)' : `₹${item.product.price * item.quantity}`}
                            </p>
                          </div>
                        </div>

                        {!['completed', 'rejected'].includes(selectedOrder.status) && (
                          <div className="mt-2.5 pt-2 border-t border-border/10 flex justify-between items-center">
                            <span className="text-[9px] text-muted-foreground font-medium">
                              {item.status === 'rejected' ? 'Item excluded from bill' : 'Item available in stock'}
                            </span>
                            <button
                              onClick={() => toggleItemRejection(selectedOrder.id, item.product.id)}
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                item.status === 'rejected'
                                  ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                              }`}
                            >
                              {item.status === 'rejected' ? (
                                <>
                                  <Check className="w-3 h-3" /> Re-include Item
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3" /> Reject Item (Out of Stock)
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                   {/* Summary Info - In Scroll View */}
                   <div className="p-4 rounded-[1.5rem] bg-primary/5 border border-primary/10 space-y-2 mt-4 mb-6">
                      {(() => {
                        const itemsTotal = selectedOrder.items.reduce((sum, item) => sum + (item.status === 'rejected' ? 0 : item.product.price * item.quantity), 0);
                        const deliveryFee = selectedOrder.deliveryFee || 0;
                        return (
                          <>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-muted-foreground uppercase tracking-[0.2em]">Subtotal</span>
                              <span className="text-foreground">₹{itemsTotal}</span>
                            </div>
                            {deliveryFee > 0 && (
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-muted-foreground uppercase tracking-[0.2em]">Delivery Fee</span>
                                <span className="text-foreground">+ ₹{deliveryFee}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-xs font-black pt-2 border-t border-primary/10">
                              <span className="text-primary uppercase tracking-[0.2em]">Order Total</span>
                              <span className="text-primary text-base">₹{itemsTotal + deliveryFee}</span>
                            </div>
                          </>
                        );
                      })()}
                   </div>
                </div>
              </div>

              {/* Modal Footer - Compact Sticky Action Bar */}
              {!['completed', 'rejected'].includes(selectedOrder.status) && (
                <div className="p-4 border-t border-border/10 bg-card/50 shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (selectedOrder.status === 'pending') {
                          rejectOrder(selectedOrder.id);
                        } else {
                          cancelOrderWithPin(selectedOrder.id, selectedOrder.pickupCode || '');
                        }
                      }}
                      className="flex-1 bg-destructive/10 text-destructive font-bold py-4 rounded-2xl hover:bg-destructive/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest border border-destructive/20 shadow-sm active:scale-95"
                    >
                      <X className="w-5 h-5" />
                      Reject
                    </button>
                    <button
                      onClick={() => advanceStatus(selectedOrder.id)}
                      className="flex-[2] bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest active:scale-[0.98]"
                    >
                      <Check className="w-5 h-5" />
                      {selectedOrder.status === 'pending' ? 'Accept' : 
                       selectedOrder.status === 'accepted' ? 'Pack Order' :
                       selectedOrder.status === 'packed' ? (selectedOrder.deliveryMethod === 'delivery' ? 'Dispatch' : 'Complete Order') :
                       'Proceed'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Reason Modal */}
      <AnimatePresence>
        {orderToReject && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#202020] w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5"
            >
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                    <X className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Reject Order</h3>
                  <p className="text-sm text-white/50">Please provide a reason for the customer.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {['OOS', 'Store closed', 'Too busy', 'Price mismatch'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setRejectionReasonInput(preset)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                          rejectionReasonInput === preset 
                            ? 'bg-rose-500 text-white border-rose-500' 
                            : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="Type a custom reason here..."
                    className="w-full min-h-[120px] p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-white focus:border-rose-500/50 outline-none transition-all resize-none shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setOrderToReject(null)}
                    disabled={isSubmittingRejection}
                    className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-white/5 text-white/60 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRejection}
                    disabled={isSubmittingRejection || !rejectionReasonInput.trim()}
                    className={`flex-[2] py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] ${
                      rejectionReasonInput.trim() 
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20 hover:bg-rose-500' 
                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    {isSubmittingRejection ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </PullToRefresh>
    </div>
  );
};

export default VendorOrders;
