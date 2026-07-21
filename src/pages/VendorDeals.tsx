import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ArrowLeft, Trash2, Package, Trash, Calendar, Clock, Tag, Percent, Zap, ChevronRight, AlertCircle, Package2, Edit2, History, Timer, Loader2, Crown, Search, Check, PackageX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Product, Deal } from '@/types';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, onSnapshot, orderBy } from 'firebase/firestore';

const VendorDeals = () => {
  const navigate = useNavigate();
  const { user, loading: appLoading, refreshData } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isComboMode, setIsComboMode] = useState(false);
  const [selectedComboItems, setSelectedComboItems] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    discountedPrice: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    stockLimit: ''
  });

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Prevent accidental refresh/close
  useEffect(() => {
    if (showCreateModal && selectedProduct) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [showCreateModal, selectedProduct]);

  useEffect(() => {
    if (appLoading) return;
    if (!user || user.role !== 'vendor') {
      navigate('/auth');
      return;
    }
    const canAccessDeals = user.plan === 'growth' || user.plan === 'pro';
    if (!canAccessDeals) {
      toast.error("Growth or Pro Plan Required", {
        description: "Deals are available on Growth and Pro plans. Upgrade to create flash deals and discounts."
      });
      navigate('/vendor/subscription');
      return;
    }

    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), where('vendorId', '==', user.id));
        const snapshot = await getDocs(q);
        const productData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        setProducts(productData);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    const unsubscribeDeals = onSnapshot(
      query(collection(db, 'deals'), where('vendorId', '==', user.id)),
      (snapshot) => {
        const dealsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Deal[];
        dealsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDeals(dealsData);
        setLoading(false);
      },
      (err) => {
        console.error("Vendor Deals snapshot failed:", err);
        setLoading(false);
      }
    );

    fetchProducts();
    return () => unsubscribeDeals();
  }, [user, appLoading, navigate]);

  const handleCreateDeal = async () => {
    if (!selectedProduct || !user) return;
    
    const discPrice = Number(form.discountedPrice);
    if (!discPrice || discPrice >= selectedProduct.price) {
      toast.error("Invalid Price", { description: "Discounted price must be lower than original price." });
      return;
    }

    if (new Date(form.startTime) >= new Date(form.endTime)) {
      toast.error("Invalid Time", { description: "End time must be after start time." });
      return;
    }

    const toastId = toast.loading(editingDeal ? "Updating deal..." : "Publishing deal...");
    try {
      const dealData: any = {
        productId: editingDeal 
          ? editingDeal.productId 
          : (isComboMode ? `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` : selectedProduct.id),
        vendorId: user.id,
        originalPrice: isComboMode 
          ? products.filter(p => selectedComboItems.includes(p.id)).reduce((sum, p) => sum + p.price, 0)
          : selectedProduct.price,
        dealPrice: discPrice,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        status: 'active',
        isCombo: isComboMode,
        createdAt: editingDeal ? editingDeal.createdAt : new Date().toISOString()
      };

      if (form.stockLimit) dealData.stockLimit = Number(form.stockLimit);
      if (isComboMode) dealData.comboItems = selectedComboItems;

      if (editingDeal) {
        await updateDoc(doc(db, 'deals', editingDeal.id), dealData);
        toast.success("Deal Updated!", { id: toastId });
      } else {
        await addDoc(collection(db, 'deals'), dealData);
        toast.success("Deal Published!", { id: toastId });
      }

      setShowCreateModal(false);
      setSelectedProduct(null);
      setSelectedComboItems([]);
      setIsComboMode(false);
      setEditingDeal(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to process deal", { id: toastId });
    }
  };

  const resetForm = () => {
    setForm({
      discountedPrice: '',
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      stockLimit: ''
    });
  };

  const handleDeleteDeal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'deals', id));
      toast.success("Deal removed");
    } catch (e) {
      toast.error("Could not remove deal");
    }
  };

  const handleEditDeal = (deal: Deal) => {
    if (deal.isCombo) {
      setIsComboMode(true);
      setSelectedComboItems(deal.comboItems || []);
      // Create a shim product for the UI
      const firstItem = products.find(p => p.id === (deal.comboItems?.[0]));
      if (firstItem) {
        setSelectedProduct({
           ...firstItem,
           name: `Combo Bundle (${deal.comboItems?.length} items)`,
           price: deal.originalPrice
        });
      }
    } else {
      const product = products.find(p => p.id === deal.productId);
      if (!product) return;
      setIsComboMode(false);
      setSelectedProduct(product);
    }
    setEditingDeal(deal);
    setForm({
      discountedPrice: String(deal.dealPrice),
      startTime: deal.startTime.slice(0, 16),
      endTime: deal.endTime.slice(0, 16),
      stockLimit: deal.stockLimit ? String(deal.stockLimit) : ''
    });
    setShowCreateModal(true);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading || appLoading) return (
    <div className="min-h-screen bg-[#202020] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#202020] text-white pb-40">
      <Header />
      <main className="max-w-4xl mx-auto px-4 pt-28">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
                <button onClick={() => navigate('/vendor')} className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-teal-500 mb-4">
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to Suite
                </button>
                <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">Deal Manager</h1>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-2">Maximum Velocity Flash Sales Engine</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
                <button 
                    onClick={() => { setEditingDeal(null); setSelectedProduct(null); setIsComboMode(true); setShowCreateModal(true); }}
                    className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/10"
                >
                    <Package2 className="w-4 h-4 text-teal-500" />
                    Combo Deal
                </button>
                <button 
                    onClick={() => { setEditingDeal(null); setSelectedProduct(null); setIsComboMode(false); setShowCreateModal(true); }}
                    className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                >
                    <Zap className="w-4 h-4 fill-current" />
                    Launch Flash Deal
                </button>
            </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {[
                { label: 'Active Deals', value: deals.filter(d => new Date(d.endTime) > new Date()).length, icon: Timer },
                { label: 'Expired', value: deals.filter(d => new Date(d.endTime) < new Date()).length, icon: History },
                { label: 'Pro Status', value: 'Active', icon: Crown },
                { label: 'Visibility', value: 'High', icon: Zap },
            ].map((stat, i) => (
                <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-0.5">
                    <stat.icon className="w-3.5 h-3.5 text-teal-500 mb-1.5" />
                    <span className="text-lg font-black">{stat.value}</span>
                    <span className="text-[7px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</span>
                </div>
            ))}
        </div>

        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Inventory Distribution</h2>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-teal-400">Live Engine Ready</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                    {deals.length === 0 ? (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="col-span-full py-20 bg-zinc-900/30 rounded-[3rem] border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-teal-500/5 flex items-center justify-center mb-6">
                                <Zap className="w-10 h-10 text-teal-500/20" />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-400">No deals running</h3>
                            <p className="text-xs text-zinc-600 mt-2 max-w-xs">Launch a limited-time offer to clear stock and attract local shoppers.</p>
                        </motion.div>
                    ) : deals.map((deal) => {
                        let product = products.find(p => p.id === deal.productId);
                        
                        // Synthesize shim for on-the-fly combo deals
                        if (!product && deal.isCombo && deal.comboItems) {
                            const firstItem = products.find(p => p.id === deal.comboItems?.[0]);
                            product = {
                                id: deal.productId,
                                name: `Bundle: ${deal.comboItems.length} Items`,
                                price: deal.originalPrice,
                                image: firstItem?.image || '',
                                category: 'Combo',
                                isCombo: true,
                                comboItems: deal.comboItems
                            } as Product;
                        }

                        if (!product) return null;
                        const isExpired = new Date(deal.endTime) < new Date();
                        const isLive = new Date(deal.startTime) <= new Date() && !isExpired;
                        
                        // Check if any item in the deal is OOS
                        const oosItems = deal.isCombo && deal.comboItems
                          ? deal.comboItems.map(id => products.find(p => p.id === id)).filter(p => p && !p.inStock)
                          : (!product.inStock ? [product] : []);
                        const isOOS = oosItems.length > 0;
                        
                        return (
                            <motion.div 
                                layout
                                key={deal.id} 
                                className={`group relative bg-zinc-900/80 rounded-3xl overflow-hidden border transition-all ${isLive && !isOOS ? 'border-teal-500/30 shadow-md' : 'border-white/5'} ${isOOS ? 'opacity-60 grayscale-[0.5]' : ''}`}
                            >
                                {isOOS && (
                                    <div className="absolute inset-0 z-20 bg-rose-950/20 backdrop-blur-[2px] flex items-center justify-center p-6 text-center pointer-events-none">
                                        <div className="bg-rose-600/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-2xl flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-300">
                                            <div className="flex items-center gap-2">
                                                <PackageX className="w-4 h-4 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Deal Suspended</span>
                                            </div>
                                            <p className="text-[8px] font-bold text-white/80 uppercase tracking-tighter max-w-[150px] truncate">
                                                {oosItems[0]?.name} IS OOS
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="p-3.5 flex gap-4">
                                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 shadow-lg bg-zinc-950">
                                        {deal.isCombo && deal.comboItems && deal.comboItems.length > 0 ? (
                                          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px]">
                                              {deal.comboItems.slice(0, 4).map((id) => {
                                                  const p = products.find(prod => prod.id === id);
                                                  return <img key={id} src={p?.image || ''} className="w-full h-full object-cover" alt="" />;
                                              })}
                                          </div>
                                        ) : (
                                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                        )}
                                        {deal.isCombo && (
                                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-teal-600 text-[6px] font-black uppercase tracking-tight rounded-md shadow-xl">
                                                BUNDLE
                                            </div>
                                        )}
                                        {isLive && !isOOS && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-teal-600/40 to-transparent flex items-end p-1.5">
                                                <div className="bg-white text-teal-600 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xl">
                                                    <div className="w-1 h-1 rounded-full bg-teal-600 animate-pulse" />
                                                    LIVE
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col justify-between py-0.5">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-[13px] text-zinc-100 truncate pr-14">
                                                {deal.isCombo ? `Bundle: ${deal.comboItems?.length} Items` : product.name}
                                            </h4>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-lg font-black text-white italic tracking-tighter">₹{deal.dealPrice}</span>
                                                <span className="text-[10px] text-zinc-600 line-through font-bold">₹{deal.originalPrice}</span>
                                            </div>
                                            <div className="inline-block px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-400 text-[9px] font-black uppercase tracking-tighter">
                                                SAVE {Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100)}%
                                            </div>
                                        </div>

                                        <div className="space-y-1 mt-2">
                                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-500">
                                                <Clock className={`w-2.5 h-2.5 ${isLive ? 'text-teal-500' : 'text-zinc-700'}`} />
                                                <span className={isLive ? 'text-zinc-200' : ''}>
                                                    {isExpired ? 'Ended' : `${isLive ? 'Ends' : 'Starts'} ${new Date(isLive ? deal.endTime : deal.startTime).toLocaleDateString()}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute top-4 right-4 flex items-center gap-1 p-0.5 rounded-xl bg-zinc-950/50 backdrop-blur-md border border-white/5">
                                    <button onClick={() => handleEditDeal(deal)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <div className="w-px h-3 bg-white/5" />
                                    <button onClick={() => handleDeleteDeal(deal.id)} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-500 hover:text-rose-500 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>

        {/* Product Selection Drawer */}
        <AnimatePresence>
            {showCreateModal && !selectedProduct && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-end justify-center">
                    <motion.div 
                        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                        transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
                        className="w-full max-w-2xl bg-zinc-900 rounded-t-[3rem] overflow-hidden flex flex-col max-h-[85vh] border-t border-white/10 will-change-transform"
                    >
                        <div className="p-8 pb-4">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-white italic uppercase">
                                        {isComboMode ? 'Build Bundle' : 'Select Product'}
                                    </h2>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                                        {isComboMode ? 'Choose multiple items for bundle deal' : 'Convert inventory into deal'}
                                    </p>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 transition-all"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="relative group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-teal-500 transition-colors" />
                                <input 
                                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search your inventory..."
                                    className="w-full pl-16 pr-6 py-5 rounded-[2rem] bg-zinc-950 border-0 text-sm font-black text-white focus:ring-4 focus:ring-teal-500/10 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-12 custom-scrollbar">
                            <div className="grid grid-cols-1 gap-2 mt-4">
                                {filteredProducts.map(p => (
                                    <button 
                                        key={p.id} 
                                        onClick={() => {
                                            if (isComboMode) {
                                                setSelectedComboItems(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                                            } else {
                                                setSelectedProduct(p);
                                            }
                                        }}
                                        className={`w-full p-2.5 rounded-2xl transition-all flex items-center gap-4 border ${isComboMode && selectedComboItems.includes(p.id) ? 'bg-teal-500/10 border-teal-500' : 'bg-transparent border-transparent hover:bg-white/5'} group text-left`}
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-zinc-950 overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-[13px] text-zinc-100 truncate">{p.name}</h4>
                                            <span className="text-[10px] font-black text-teal-500 tracking-tighter">Normal: ₹{p.price}</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-600 group-hover:bg-teal-500 group-hover:text-white transition-all">
                                            {isComboMode ? (
                                                selectedComboItems.includes(p.id) ? <Check className="w-4 h-4 text-teal-500" /> : <Plus className="w-4 h-4" />
                                            ) : <Plus className="w-4 h-4" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isComboMode && selectedComboItems.length >= 2 && (
                            <div className="p-8 bg-zinc-950 border-t border-white/5">
                                <button 
                                    onClick={() => {
                                        const selectedProds = products.filter(p => selectedComboItems.includes(p.id));
                                        setSelectedProduct({
                                            id: 'combo',
                                            name: `${selectedComboItems.length} Item Bundle`,
                                            price: selectedProds.reduce((sum, p) => sum + p.price, 0),
                                            image: selectedProds[0]?.image || '',
                                            category: 'Bundle',
                                            description: '',
                                            inStock: true
                                        } as Product);
                                    }}
                                    className="w-full h-16 bg-teal-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    Review Deal Details ({selectedComboItems.length} Items)
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Configuration Modal */}
        <AnimatePresence>
            {showCreateModal && selectedProduct && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                        className="w-full max-w-md bg-[#1A1A1A] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Compact Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowDiscardConfirm(true)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all"><ArrowLeft className="w-4 h-4" /></button>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">Deal Config</h2>
                            </div>
                            <button onClick={() => setShowDiscardConfirm(true)} className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-rose-500 transition-colors">Discard</button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            {/* Summary Header - Side-by-Side Pricing */}
                            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-teal-600/10 blur-[30px] rounded-full" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg bg-zinc-950 shrink-0">
                                        {isComboMode && selectedComboItems.length > 0 ? (
                                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px]">
                                                {selectedComboItems.slice(0, 4).map((id) => {
                                                    const p = products.find(prod => prod.id === id);
                                                    return <img key={id} src={p?.image || ''} className="w-full h-full object-cover" alt="" />;
                                                })}
                                            </div>
                                        ) : (
                                            <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-black text-white tracking-tight leading-tight truncate">{selectedProduct.name}</h3>
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 text-[7px] font-black uppercase tracking-widest">Normal</span>
                                                <span className="text-zinc-400 text-xs font-bold line-through">₹{selectedProduct.price}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-teal-500 text-[7px] font-black uppercase tracking-widest">Deal Target</span>
                                                <div className="relative flex items-center">
                                                    <span className="text-white text-sm font-black italic">₹{form.discountedPrice || '0'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Inputs */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">New Deal Price</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-teal-500">₹</span>
                                            <input 
                                                type="number" value={form.discountedPrice} onChange={(e) => setForm(f => ({ ...f, discountedPrice: e.target.value }))}
                                                className="w-full h-11 bg-zinc-950/50 border border-white/5 rounded-xl pl-8 pr-4 text-sm font-black text-white focus:border-teal-500/50 outline-none transition-all"
                                                placeholder="00"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Stock Limit</label>
                                        <input 
                                            type="number" value={form.stockLimit} onChange={(e) => setForm(f => ({ ...f, stockLimit: e.target.value }))}
                                            className="w-full h-11 bg-zinc-950/50 border border-white/5 rounded-xl px-4 text-sm font-black text-white focus:border-teal-500/50 outline-none transition-all"
                                            placeholder="No Limit"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2">
                                        <Timer className="w-3 h-3 text-teal-500" /> Sale Window
                                    </label>
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                         {/* Start Schedule */}
                                         <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-3 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-teal-500" />
                                                <p className="text-[9px] font-bold text-white uppercase tracking-tight">Ignite Sale</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input 
                                                    type="date" 
                                                    value={form.startTime.split('T')[0]} 
                                                    onChange={(e) => {
                                                        const [date, time] = form.startTime.split('T');
                                                        setForm(f => ({ ...f, startTime: `${e.target.value}T${time}` }));
                                                    }}
                                                    className="bg-zinc-950 border border-white/5 p-2 rounded-lg text-[10px] font-black text-white [color-scheme:dark] focus:ring-0 w-full"
                                                />
                                                <input 
                                                    type="time" 
                                                    value={form.startTime.split('T')[1]} 
                                                    onChange={(e) => {
                                                        const [date, time] = form.startTime.split('T');
                                                        setForm(f => ({ ...f, startTime: `${date}T${e.target.value}` }));
                                                    }}
                                                    className="bg-zinc-950 border border-white/5 p-2 rounded-lg text-[10px] font-black text-white [color-scheme:dark] focus:ring-0 w-full"
                                                />
                                            </div>
                                         </div>

                                         {/* End Schedule */}
                                         <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-3 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-rose-500" />
                                                <p className="text-[9px] font-bold text-white uppercase tracking-tight">Extinguish</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input 
                                                    type="date" 
                                                    value={form.endTime.split('T')[0]} 
                                                    onChange={(e) => {
                                                        const [date, time] = form.endTime.split('T');
                                                        setForm(f => ({ ...f, endTime: `${e.target.value}T${time}` }));
                                                    }}
                                                    className="bg-zinc-950 border border-white/5 p-2 rounded-lg text-[10px] font-black text-white [color-scheme:dark] focus:ring-0 w-full"
                                                />
                                                <input 
                                                    type="time" 
                                                    value={form.endTime.split('T')[1]} 
                                                    onChange={(e) => {
                                                        const [date, time] = form.endTime.split('T');
                                                        setForm(f => ({ ...f, endTime: `${date}T${e.target.value}` }));
                                                    }}
                                                    className="bg-zinc-950 border border-white/5 p-2 rounded-lg text-[10px] font-black text-white [color-scheme:dark] focus:ring-0 w-full"
                                                />
                                            </div>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                            <button 
                                onClick={handleCreateDeal}
                                className="w-full h-12 bg-teal-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-teal-600/20"
                            >
                                <Zap className="w-4 h-4 fill-current" />
                                {editingDeal ? 'Save Changes' : 'Ignite Flash Sale'}
                            </button>
                            <p className="text-center text-[7px] text-zinc-600 font-black uppercase tracking-widest mt-3 italic">Live Deal broadcasted instantly to local shoppers</p>
                        </div>
                    </motion.div>

                    {/* Discard Confirmation Modal */}
                    {showDiscardConfirm && (
                        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-zinc-900 rounded-[2.5rem] p-10 space-y-8 text-center border border-white/10">
                                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Discard Changes?</h3>
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-relaxed">
                                        All deal configuration data will be permanently lost. Are you sure you want to exit?
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowDiscardConfirm(false)} className="flex-1 py-4 rounded-xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest">Cancel</button>
                                    <button 
                                        onClick={() => {
                                            setShowDiscardConfirm(false);
                                            setShowCreateModal(false);
                                            setSelectedProduct(null);
                                            setEditingDeal(null);
                                        }} 
                                        className="flex-1 py-4 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Discard
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default VendorDeals;
