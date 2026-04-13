import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, query, collection, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import { Order } from '@/types';
import Header from '@/components/Header';
import { RenderOrderCard, RenderBookingCard } from '@/components/ReceiptCards';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, AlertCircle, ShoppingBag, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { sendInAppNotification } from '@/utils/notifications';

const ReceiptDetailPage = () => {
    const params = useParams<{ id: string }>();
    const id = params.id;
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, stores, loading: appLoading, refreshData } = useApp();
    const userCoords: [number, number] = [
        Number(localStorage.getItem('user_lat')) || 28.6139,
        Number(localStorage.getItem('user_lng')) || 77.2090
    ];
    const [data, setData] = useState<any>(null);
    const [type, setType] = useState<'order' | 'booking' | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [threadOrders, setThreadOrders] = useState<Order[]>([]);

    // Review local state
    const [review, setReview] = useState({ rating: 0, text: '', isAnonymous: false, submitted: false, submittedAt: '' });

    useEffect(() => {
        const fetchReceipt = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // Try orders first
                let docRef = doc(db, 'orders', id);
                let docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const orderData = { id: docSnap.id, ...docSnap.data() } as any;
                    setData(orderData);
                    setType('order');
                    if (orderData.review) {
                        setReview({ ...orderData.review, submitted: true });
                    }
                } else {
                    // Try bookings
                    docRef = doc(db, 'serviceBookings', id);
                    docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const bookingData = { id: docSnap.id, ...docSnap.data() } as any;
                        setData(bookingData);
                        setType('booking');
                        if (bookingData.review) {
                            setReview({ ...bookingData.review, submitted: true });
                        }
                    } else {
                        setError("Receipt not found. It might have been deleted or the link is incorrect.");
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch receipt details.");
            } finally {
                setLoading(false);
            }
        };

        fetchReceipt();
    }, [id]);

    useEffect(() => {
        if (type === 'order' && data?.threadId) {
            setLoading(true);
            const q = query(collection(db, 'orders'), where('threadId', '==', data.threadId));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
                setThreadOrders(orders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
                setLoading(false);
            }, (err) => {
                console.error("Thread fetch error:", err);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setThreadOrders([]);
        }
    }, [type, data?.threadId]);

    const handleReviewSubmit = async () => {
        if (!id || !type || !data) return;
        if (review.rating === 0) {
            toast.error(t('common.select_rating_message'));
            return;
        }

        const loadingToast = toast.loading(t('common.saving_review'));

        try {
            const collectionName = type === 'order' ? 'orders' : 'serviceBookings';
            const itemRef = doc(db, collectionName, id);
            
            const reviewData = {
                rating: review.rating,
                text: review.text || '',
                submittedAt: new Date().toISOString(),
                isAnonymous: review.isAnonymous || false
            };

            await updateDoc(itemRef, {
                review: reviewData
            });

            // Update store's public reviews array
            if (data.storeId) {
                const storeRef = doc(db, 'stores', data.storeId);
                const publicReview = {
                    id: `rev-${id}-${Date.now()}`,
                    userName: review.isAnonymous ? t('common.anonymous_customer') : (user?.name || t('common.customer')),
                    rating: Number(review.rating),
                    comment: review.text?.trim() || '',
                    date: new Date().toISOString(),
                    isAnonymous: review.isAnonymous
                };

                try {
                    await updateDoc(storeRef, {
                        reviews: arrayUnion(publicReview)
                    });
                } catch (e) {
                    console.error("Store review update failed:", e);
                }

                // Notify Vendor
                sendInAppNotification(data.storeId, {
                    title: '⭐ New Review Received!',
                    body: `${user?.name || 'A customer'} just rated you ${review.rating} stars for ${type === 'order' ? 'order' : 'booking'} #${id.slice(-6)}`,
                    url: '/vendor'
                });
            }

            setReview(prev => ({ ...prev, submitted: true, submittedAt: reviewData.submittedAt }));
            toast.dismiss(loadingToast);
            toast.success(t('common.review_saved_successfully'));
            
            // Sync with global state if possible
            refreshData();
        } catch (error) {
            console.error('Error submitting review:', error);
            toast.dismiss(loadingToast);
            toast.error(t('common.failed_to_save_review'));
        }
    };

    const getStoreForOrder = (storeId: string) => {
        return stores.find(s => s.id === storeId);
    };

    if (loading || appLoading) {
        return (
            <div className="min-h-screen gradient-warm flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Receipt...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen gradient-warm flex flex-col items-center justify-center p-4 text-center">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <h1 className="text-2xl font-black text-foreground mb-2">Oops!</h1>
                <p className="text-muted-foreground max-w-xs mb-8">{error || "Something went wrong."}</p>
                <button onClick={() => navigate('/browse')} className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95">
                    Return to Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-warm pb-20">
            <Header />
            <main className="pt-24 px-4 max-w-xl mx-auto">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl bg-white/50 backdrop-blur-sm border border-border/50 hover:bg-white transition-all shadow-sm">
                            <ArrowLeft className="w-5 h-5 text-foreground" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-foreground tracking-tight">Receipt Details</h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Standalone View</p>
                        </div>
                    </div>

                    <div className="relative space-y-8 pb-10">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl -z-10" />
                        
                        {type === 'order' ? (
                            threadOrders.length > 1 ? (
                                <div className="space-y-12">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                            <Navigation className="w-5 h-5 text-primary animate-pulse" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-primary uppercase tracking-[0.2em]">Connected Route</h2>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{threadOrders.length} Shop Stops Scheduled</p>
                                        </div>
                                    </div>

                                    <div className="relative space-y-6">
                                        <div className="absolute left-[38px] top-10 bottom-10 w-1 bg-primary/10 rounded-full" />
                                        
                                        {threadOrders.map((order, idx) => (
                                            <div key={order.id} className="relative">
                                                <div className={`absolute -left-2 top-8 w-4 h-4 rounded-full border-4 border-background z-20 ${order.id === id ? 'bg-primary scale-125 shadow-lg shadow-primary/40' : 'bg-primary/20'}`} />
                                                
                                                <RenderOrderCard
                                                    order={order}
                                                    i={idx}
                                                    review={order.id === id ? review : (order.review ? { ...order.review, submitted: true } as any : { rating: 0, text: '', submitted: false })}
                                                    onRate={(rating) => order.id === id && setReview(prev => ({ ...prev, rating }))}
                                                    onReviewChange={(text) => order.id === id && setReview(prev => ({ ...prev, text }))}
                                                    onAnonymous={(isAnonymous) => order.id === id && setReview(prev => ({ ...prev, isAnonymous }))}
                                                    onSubmit={order.id === id ? handleReviewSubmit : () => {}}
                                                    t={t}
                                                    getStoreForOrder={getStoreForOrder}
                                                    userCoords={userCoords}
                                                    standalone={true}
                                                    hasReviewedStore={Array.isArray(getStoreForOrder(order.storeId)?.reviews) && getStoreForOrder(order.storeId)!.reviews!.some((r: any) => r.userId === user?.id)}
                                                />

                                                {idx < threadOrders.length - 1 && (
                                                    <div className="absolute -bottom-4 left-[38px] w-1 h-4 bg-primary/20" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <RenderOrderCard
                                    order={data}
                                    i={0}
                                    review={review}
                                    onRate={(rating) => setReview(prev => ({ ...prev, rating }))}
                                    onReviewChange={(text) => setReview(prev => ({ ...prev, text }))}
                                    onAnonymous={(isAnonymous) => setReview(prev => ({ ...prev, isAnonymous }))}
                                    onSubmit={handleReviewSubmit}
                                    t={t}
                                    getStoreForOrder={getStoreForOrder}
                                    userCoords={userCoords}
                                    standalone={true}
                                    hasReviewedStore={Array.isArray(getStoreForOrder(data.storeId)?.reviews) && getStoreForOrder(data.storeId)!.reviews!.some((r: any) => r.userId === user?.id)}
                                />
                            )
                        ) : (
                            <RenderBookingCard
                                booking={data}
                                i={0}
                                review={review}
                                onRate={(rating) => setReview(prev => ({ ...prev, rating }))}
                                onReviewChange={(text) => setReview(prev => ({ ...prev, text }))}
                                onAnonymous={(isAnonymous) => setReview(prev => ({ ...prev, isAnonymous }))}
                                onSubmit={handleReviewSubmit}
                                t={t}
                                getStoreForOrder={getStoreForOrder}
                                userCoords={userCoords}
                                standalone={true}
                                hasReviewedStore={Array.isArray(getStoreForOrder(data.storeId)?.reviews) && getStoreForOrder(data.storeId)!.reviews!.some((r: any) => r.userId === user?.id)}
                            />
                        )}
                    </div>

                    <div className="flex flex-col gap-4 mt-4">
                        <div className="p-6 glass rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-indigo-500" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold">Verified by BellBasket</h3>
                                <p className="text-xs text-muted-foreground">This receipt is a verified proof of your transaction.</p>
                            </div>
                            <button onClick={() => navigate('/browse')} className="w-full py-3 rounded-2xl bg-white border border-border text-[#202020] text-xs font-black uppercase tracking-widest hover:bg-secondary transition-all shadow-sm">
                                Browse Marketplace
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReceiptDetailPage;
