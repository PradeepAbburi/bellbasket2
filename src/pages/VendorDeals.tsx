import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ArrowLeft, Trash2, Package, Trash, Calendar, Clock, Tag, Percent, Zap, ChevronRight, AlertCircle, Package2, Edit2, History, Timer, Loader2, Crown, Search, Check } from 'lucide-react';
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

  useEffect(() => {
    if (appLoading) return;
    if (!user || user.role !== 'vendor') {
      navigate('/auth');
      return;
    }
    if (user.plan !== 'pro') {
      toast.error("Pro Plan Required", {
        description: "Deals are only available for Pro vendors. Upgrade to unlock this feature."
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
      const dealData = {
        productId: isComboMode ? 'combo_bundle' : selectedProduct.id,
        vendorId: user.id,
        originalPrice: isComboMode 
          ? products.filter(p => selectedComboItems.includes(p.id)).reduce((sum, p) => sum + p.price, 0)
          : selectedProduct.price,
        dealPrice: discPrice,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        stockLimit: form.stockLimit ? Number(form.stockLimit) : undefined,
        status: 'active',
        isCombo: isComboMode,
        comboItems: isComboMode ? selectedComboItems : undefined,
        createdAt: editingDeal ? editingDeal.createdAt : new Date().toISOString()
      };

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
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#202020] text-white pb-40">
      <Header />
      <main className="max-w-4xl mx-auto px-4 pt-28">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
                <button onClick={() => navigate('/vendor')} className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-purple-500 mb-4">
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to Suite
                </button>
                <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">Deal Manager</h1>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-2">Maximum Velocity Flash Sales Engine</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <button 
                    onClick={() => { setEditingDeal(null); setSelectedProduct(null); setIsComboMode(true); setShowCreateModal(true); }}
                    className="px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/5"
                >
                    <Package2 className="w-5 h-5 text-purple-500" />
                    Combo Deal
                </button>
                <button 
                    onClick={() => { setEditingDeal(null); setSelectedProduct(null); setIsComboMode(false); setShowCreateModal(true); }}
                    className="px-8 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/20"
                >
                    <Zap className="w-5 h-5 fill-current" />
                    Launch Flash Deal
                </button>
            </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
                { label: 'Active Deals', value: deals.filter(d => new Date(d.endTime) > new Date()).length, icon: Timer },
                { label: 'Expired', value: deals.filter(d => new Date(d.endTime) < new Date()).length, icon: History },
                { label: 'Pro Status', value: 'Active', icon: Crown },
                { label: 'Visibility', value: 'High', icon: Zap },
            ].map((stat, i) => (
                <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-5 flex flex-col gap-1">
                    <stat.icon className="w-4 h-4 text-purple-500 mb-2" />
                    <span className="text-xl font-black">{stat.value}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</span>
                </div>
            ))}
        </div>

        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Inventory Distribution</h2>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">Live Engine Ready</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                    {deals.length === 0 ? (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="col-span-full py-20 bg-zinc-900/30 rounded-[3rem] border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-purple-500/5 flex items-center justify-center mb-6">
                                <Zap className="w-10 h-10 text-purple-500/20" />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-400">No deals running</h3>
                            <p className="text-xs text-zinc-600 mt-2 max-w-xs">Launch a limited-time offer to clear stock and attract local shoppers.</p>
                        </motion.div>
                    ) : deals.map((deal) => {
                        const product = products.find(p => p.id === deal.productId);
                        if (!product) return null;
                        const isExpired = new Date(deal.endTime) < new Date();
                        const isLive = new Date(deal.startTime) <= new Date() && !isExpired;
                        
                        return (
                            <motion.div 
                                layout
                                key={deal.id} 
                                className={`group relative bg-zinc-900/80 rounded-[2.5rem] overflow-hidden border transition-all ${isLive ? 'border-purple-500/30 shadow-md' : 'border-white/5'}`}
                            >
                                <div className="p-5 flex gap-5">
                                    <div className="relative w-28 h-28 rounded-3xl overflow-hidden shrink-0 shadow-2xl bg-zinc-950">
                                        <img src={deal.isCombo ? (products.find(p => p.id === deal.comboItems?.[0])?.image) : product.image} alt={product.name} className="w-full h-full object-cover" />
                                        {deal.isCombo && (
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600 text-[8px] font-black uppercase tracking-tight rounded-lg shadow-xl">
                                                BUNDLE
                                            </div>
                                        )}
                                        {isLive && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-purple-600/40 to-transparent flex items-end p-2">
                                                <div className="bg-white text-purple-600 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-2xl">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                                                    LIVE
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-sm text-zinc-100 truncate pr-16">
                                                {deal.isCombo ? `Bundle: ${deal.comboItems?.length} Items` : product.name}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-black text-white italic tracking-tighter">₹{deal.dealPrice}</span>
                                                <span className="text-xs text-zinc-600 line-through font-bold">₹{deal.originalPrice}</span>
                                            </div>
                                            <div className="inline-block px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-tighter">
                                                SAVE {Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100)}%
                                            </div>
                                            {deal.isCombo && (
                                                <p className="text-[9px] text-zinc-500 truncate max-w-[200px]">
                                                    {deal.comboItems?.map(id => products.find(p => p.id === id)?.name).join(', ')}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                <Clock className={`w-3 h-3 ${isLive ? 'text-purple-500' : 'text-zinc-700'}`} />
                                                <span className={isLive ? 'text-zinc-200' : ''}>
                                                    {isExpired ? 'Ended' : `${isLive ? 'Ends' : 'Starts'} ${new Date(isLive ? deal.endTime : deal.startTime).toLocaleDateString()}`}
                                                </span>
                                            </div>
                                            {deal.stockLimit && (
                                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                    <Package className="w-3 h-3 text-zinc-700" />
                                                    <span>Stock Limit: {deal.stockLimit}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute top-5 right-5 flex items-center gap-1 p-1 rounded-2xl bg-zinc-950/50 backdrop-blur-md border border-white/5">
                                    <button onClick={() => handleEditDeal(deal)} className="p-2 rounded-xl hover:bg-white/10 text-zinc-500 hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
                                    <div className="w-px h-4 bg-white/5" />
                                    <button onClick={() => handleDeleteDeal(deal.id)} className="p-2 rounded-xl hover:bg-rose-500/20 text-zinc-500 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
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
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-purple-500 transition-colors" />
                                <input 
                                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search your inventory..."
                                    className="w-full pl-16 pr-6 py-5 rounded-[2rem] bg-zinc-950 border-0 text-sm font-black text-white focus:ring-4 focus:ring-purple-500/10 transition-all"
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
                                        className={`w-full p-4 rounded-3xl transition-all flex items-center gap-5 border ${isComboMode && selectedComboItems.includes(p.id) ? 'bg-purple-500/10 border-purple-500' : 'bg-transparent border-transparent hover:bg-white/5'} group text-left`}
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-zinc-950 overflow-hidden shrink-0 shadow-xl group-hover:scale-105 transition-transform">
                                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-zinc-100 truncate">{p.name}</h4>
                                            <span className="text-xs font-black text-purple-500 tracking-tighter">Normal: ₹{p.price}</span>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-600 group-hover:bg-purple-500 group-hover:text-white transition-all">
                                            {isComboMode ? (
                                                selectedComboItems.includes(p.id) ? <Check className="w-5 h-5 text-purple-500" /> : <Plus className="w-5 h-5" />
                                            ) : <Plus className="w-5 h-5" />}
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
                                    className="w-full h-16 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
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

        {/* Configuration Full Page */}
        <AnimatePresence>
            {showCreateModal && selectedProduct && (
                <motion.div 
                    initial={{ opacity: 0, x: 100 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 100 }} 
                    transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
                    className="fixed inset-0 z-[110] bg-[#202020] overflow-y-auto will-change-transform"
                >
                    <header className="fixed top-0 left-0 right-0 z-[120] bg-[#202020]/80 backdrop-blur-md border-b border-white/5 px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <button onClick={() => { if (editingDeal) { setShowCreateModal(false); setSelectedProduct(null); setEditingDeal(null); } else setSelectedProduct(null); }} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all"><ArrowLeft className="w-5 h-5" /></button>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white italic">Deal Configuration</h2>
                        </div>
                        <button onClick={() => { setShowCreateModal(false); setSelectedProduct(null); setEditingDeal(null); }} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-rose-500 transition-colors">Discard</button>
                    </header>

                    <div className="max-w-xl mx-auto px-6 pt-32 pb-40 space-y-12">
                        {/* Summary Header */}
                        <div className="bg-zinc-900 rounded-[3rem] p-8 border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[60px] rounded-full" />
                            <div className="flex items-center gap-6 relative z-10">
                                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-24 h-24 rounded-[2rem] object-cover shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-500" />
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight leading-tight">{selectedProduct.name}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Base Listing Price:</span>
                                        <span className="text-zinc-100 font-bold tracking-tighter">₹{selectedProduct.price}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Limited Deal Price</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-xl text-purple-500">₹</span>
                                        <input 
                                            type="number" value={form.discountedPrice} onChange={(e) => setForm(f => ({ ...f, discountedPrice: e.target.value }))}
                                            className="w-full h-18 bg-zinc-900 border-2 border-white/5 rounded-[2rem] pl-12 pr-6 py-5 text-2xl font-black text-white focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all"
                                            placeholder="00"
                                        />
                                        {Number(form.discountedPrice) > 0 && (
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-purple-500 text-[10px] font-black uppercase tracking-widest bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20">
                                                -{Math.round(((selectedProduct.price - Number(form.discountedPrice)) / selectedProduct.price) * 100)}%
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Velocity Limit (Stock)</label>
                                    <input 
                                        type="number" value={form.stockLimit} onChange={(e) => setForm(f => ({ ...f, stockLimit: e.target.value }))}
                                        className="w-full h-18 bg-zinc-900 border-2 border-white/5 rounded-[2rem] px-8 py-5 text-2xl font-black text-white focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all"
                                        placeholder="No Limit"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2">
                                        <Timer className="w-4 h-4 text-purple-500" /> Flash Duration
                                    </label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="bg-zinc-900 p-6 rounded-[2rem] border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3 ml-1">Ignite Deal At</p>
                                        <input 
                                            type="datetime-local" value={form.startTime} onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))}
                                            className="w-full bg-transparent border-0 p-0 text-lg font-black text-white [color-scheme:dark] cursor-pointer"
                                        />
                                     </div>
                                     <div className="bg-zinc-900 p-6 rounded-[2rem] border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3 ml-1">Extinguish At</p>
                                        <input 
                                            type="datetime-local" value={form.endTime} onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))}
                                            className="w-full bg-transparent border-0 p-0 text-lg font-black text-white [color-scheme:dark] cursor-pointer"
                                        />
                                     </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8">
                            <button 
                                onClick={handleCreateDeal}
                                className="w-full h-20 bg-purple-600 text-white rounded-[2.5rem] font-black text-lg uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                            >
                                <Zap className="w-6 h-6 fill-current" />
                                {editingDeal ? 'Sync Live Changes' : 'Ignite Flash Sale'}
                            </button>
                            <p className="text-center text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-6 italic">Live Deal broadcasted instantly to local shoppers</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default VendorDeals;
