import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Package, Shield, Key, Phone, KeyRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { Order } from '@/types';
import { useApp } from '@/context/appStore';

import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { sendInAppNotification, playBellSound } from '@/utils/notifications';

const statusFlow = ['pending', 'accepted', 'packed', 'completed'] as const;

const VendorOrders = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, orders: allOrders } = useApp();
  const [customerData, setCustomerData] = useState<Record<string, { name?: string; phone?: string }>>({});
  const [view, setView] = useState<'active' | 'past'>('active');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Memoize filtered orders from global state for live updates
  const orders = useMemo(() => {
    const filtered = allOrders.filter(o => o.storeId === user?.id);
    return filtered.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [allOrders, user?.id]);

  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'rejected');
  const pastOrders = orders.filter(o => o.status === 'completed' || o.status === 'rejected');

  const displayOrders = view === 'active' ? activeOrders : pastOrders;
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;

  useEffect(() => {
    const fetchCustomers = async () => {
      const uids = [...new Set(orders.map(o => o.userId).filter(Boolean))];
      const data: Record<string, { name?: string; phone?: string }> = {};

      for (const uid of uids) {
        if (!uid || typeof uid !== 'string') continue;
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const userData = snap.data();
          data[uid] = userData;
        }
      }
      setCustomerData(data);
    };

    if (orders.length > 0) fetchCustomers();
  }, [orders]);

  const advanceStatus = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const idx = statusFlow.indexOf(order.status as (typeof statusFlow)[number]);
    if (idx < statusFlow.length - 1) {
      const next = statusFlow[idx + 1];

      try {
        await updateDoc(doc(db, 'orders', orderId), { status: next });
        playBellSound(next === 'accepted'); // Play high pitch for acceptance

        // 🔔 Push notification to the customer
        if (order.userId) {
          const statusMessages: Record<string, string> = {
            accepted: `✅ ${order.storeName} accepted your order. We'll update you as it is prepared.`,
            packed: `📦 Your order from ${order.storeName} is packed and ready for pickup.`,
            completed: `🎉 Your order from ${order.storeName} is completed. Thanks for shopping with BellBasket!`,
          };
          const body = statusMessages[next] || `Your order status updated to: ${next}`;
          await sendInAppNotification(order.userId, {
            title: 'BellBasket Order Update',
            body,
            url: '/receipts',
            type: 'order',
            id: `${orderId}-${next}`,
            orderId,
            orderStatus: next,
            storeName: order.storeName,
          });
        }

        toast.success(`${t('vendor_orders.status_updated')}: ${next}`);
        if (next === 'packed' && selectedOrderId === orderId) {
          setSelectedOrderId(null);
        }
      } catch (error) {
        toast.error(t('vendor_orders.failed_update'));
      }
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
          await sendInAppNotification(orderData.userId, {
            title: '❌ Order Cancelled',
            body: `Your order from ${orderData.storeName} has been cancelled by the vendor.`,
            url: '/receipts',
            type: 'order',
            id: `${orderId}-rejected`,
            orderId,
            orderStatus: 'rejected',
            storeName: orderData.storeName,
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

  return (
    <div className="min-h-screen gradient-warm">
      <Header />
      <div className="pt-20 pb-40 px-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/vendor')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('common.dashboard')}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{t('vendor_orders.title')}</h1>
          </div>
          <div className="bg-secondary p-1 rounded-xl flex items-center gap-1 w-fit">
            <button
              onClick={() => setView('active')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'active' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t('vendor_orders.active')} ({activeOrders.length})
            </button>
            <button
              onClick={() => setView('past')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'past' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t('vendor_orders.history')} ({pastOrders.length})
            </button>
          </div>
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
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold bg-secondary px-2 py-0.5 rounded text-muted-foreground">{order.id}</span>
                      <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        {new Date(order.date).toLocaleDateString()}
                        <span className="w-1 h-1 rounded-full bg-border" />
                        {new Date(order.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground text-sm">{order.items.length} {t('common.items')} · ₹{order.total}</p>
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
                  <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize border ${order.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                    order.status === 'packed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      order.status === 'accepted' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        order.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-primary/10 text-primary border-primary/20'
                    }`}>
                    {t(`common.order_status.${order.status}`, { defaultValue: order.status })}
                  </span>
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
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{t('vendor_orders.customer')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${order.userPhone || customerData[order.userId || '']?.phone}`}
                        className="p-2 rounded-lg bg-white shadow-sm text-primary hover:scale-110 transition-transform"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {order.userPhone || customerData[order.userId || '']?.phone || t('common.no_phone')}
                      </span>
                    </div>
                  </div>
                )}


                {/* Order Pickup PIN */}
                {order.pickupCode && (
                  <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-3 flex items-center justify-between border border-amber-200/60 dark:border-amber-700/40">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('common.receipts.pickup_pin')}</p>
                        <p className="text-lg font-black text-foreground tracking-[0.3em] font-mono">{order.pickupCode}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest">
                      {order.status === 'completed' ? `${t('common.verified')} ✓` : t('common.verify_at_pickup')}
                    </span>
                  </div>
                )}

                {/* Items */}
                <div
                  onClick={() => ['pending', 'accepted'].includes(order.status) ? setSelectedOrderId(order.id) : null}
                  className={`space-y-1 mb-3 ${['pending', 'accepted'].includes(order.status) ? 'cursor-pointer p-3 bg-secondary/20 hover:bg-secondary/40 rounded-xl transition-colors border border-border/50' : ''}`}
                >
                  {['pending', 'accepted'].includes(order.status) && (
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-border/50">
                      <span className="text-xs font-bold text-foreground">Products ({order.items.length})</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Tap to view</span>
                    </div>
                  )}
                  {order.items.map(item => (
                    <p key={item.product.id} className="text-xs text-muted-foreground">
                      {t(`products.${item.product.name}`, { defaultValue: item.product.name })}
                      {item.product.quantity && <span className="ml-1 opacity-70">({item.product.quantity.includes(' - ') ? item.product.quantity : item.product.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')})</span>}
                      {" "}× {item.quantity}
                    </p>
                  ))}
                </div>

                {order.status !== 'completed' && order.status !== 'rejected' && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50 w-full justify-end">
                    {order.status === 'packed' ? (
                      <>
                        <button
                          onClick={() => cancelOrderWithPin(order.id, order.pickupCode || '')}
                          className="bg-destructive/10 text-destructive text-xs font-semibold px-4 py-2 rounded-lg hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                        <button
                          onClick={() => advanceStatus(order.id)}
                          className="gradient-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3" />
                          Complete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="gradient-primary text-primary-foreground w-full py-3 text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        {order.status === 'pending' ? 'Review & Accept' : 'Review & Pack'}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Products Modal */}
      {selectedOrder && (
        <>
          <style>{`
            @media (max-width: 768px) {
              #bottom-nav { display: none !important; }
            }
          `}</style>
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-0 bg-background/80 backdrop-blur-sm shadow-2xl">

            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-border flex flex-col max-h-[85vh] sm:max-h-[90vh]"
            >
              <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/30">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Review Order</h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedOrder.id}</p>
                </div>
                <button onClick={() => setSelectedOrderId(null)} className="p-2 hover:bg-secondary rounded-full transition-colors bg-secondary/50">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-sm text-foreground">Items ({selectedOrder.items.length})</h4>
                </div>

                {selectedOrder.items.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center p-3 bg-secondary/20 rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white dark:bg-black rounded-xl flex items-center justify-center overflow-hidden border border-border/50 shadow-sm p-1">
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain rounded-lg" />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground opacity-50" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{t(`products.${item.product.name}`, { defaultValue: item.product.name })}</p>
                        {item.product.quantity && (
                          <p className="text-xs text-muted-foreground font-medium">{item.product.quantity}</p>
                        )}
                      </div>
                    </div>
                    <div className="font-mono font-black text-lg bg-background px-3 py-1.5 rounded-xl border border-border shadow-sm text-primary">
                      x{item.quantity}
                    </div>
                  </div>
                ))}
              </div>

              {selectedOrder.status !== 'completed' && selectedOrder.status !== 'rejected' && (
                <div className="p-5 border-t border-border bg-card/50 flex flex-col sm:flex-row items-center gap-3 backdrop-blur-md">
                  <button
                    onClick={() => cancelOrderWithPin(selectedOrder.id, selectedOrder.pickupCode || '')}
                    className="w-full sm:flex-1 bg-destructive/10 text-destructive font-bold py-3.5 rounded-xl hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Reject
                  </button>

                  <button
                    onClick={() => advanceStatus(selectedOrder.id)}
                    className="w-full sm:flex-1 gradient-primary text-primary-foreground font-black py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Check className="w-5 h-5" />
                    {selectedOrder.status === 'pending' && 'Accept Order'}
                    {selectedOrder.status === 'accepted' && 'Pack Order'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};

export default VendorOrders;
