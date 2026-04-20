import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Package2, Search, X, Check, ChevronDown, Zap, Plus, Pencil, Trash2, Loader2, RotateCcw, PackageX, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Product } from '@/types';
import { CATEGORY_METADATA } from '@/constants/categories';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { ProductListSkeleton } from '@/components/SkeletonLoader';
import { cleanObject } from '@/utils/firebase';

const VendorProducts = () => {
  const navigate = useNavigate();
  const { user, loading: appLoading, stores } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [showComboModal, setShowComboModal] = useState(false);
  const [comboSearch, setComboSearch] = useState('');
  const [comboForm, setComboForm] = useState({
    name: '',
    price: '',
    category: '',
    selectedItems: [] as string[]
  });
  const [showCategorySelect, setShowCategorySelect] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'delete' | 'discard' | null;
    product: Product | null;
  }>({ show: false, type: null, product: null });

  const fetchProducts = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const q = query(collection(db, 'products'), where('vendorId', '==', user.id));
      const snapshot = await getDocs(q);
      const productData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Product[];
      setProducts(productData);
    } catch (error) {
      console.error("Vendor products fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appLoading) return;
    if (!user || user.role !== 'vendor') {
      navigate('/auth');
      return;
    }
    fetchProducts();
  }, [user, appLoading, navigate]);

  const vendorStore = stores.find(s => s.vendorId === user?.id);
  const isServiceStore = vendorStore?.storeType === 'service';
  const entityName = isServiceStore ? 'Service' : 'Product';
  const entityNamePlural = isServiceStore ? 'Services' : 'Products';

  const openNew = () => {
    if (!user?.isVerified) {
      toast.error('Verification Required', { description: 'Please verify your email to add items.' });
      return;
    }
    const plan = user?.plan || 'none';
    const limit = plan === 'pro' ? Infinity : plan === 'growth' ? 60 : 30;
    if (plan === 'none') {
        toast.error('Subscription Required', { action: { label: 'Plans', onClick: () => navigate('/vendor/subscription') } });
        return;
    }
    if (products.length >= limit) {
      toast.error('Limit reached', { action: { label: 'Upgrade', onClick: () => navigate('/vendor/subscription') } });
      return;
    }
    navigate('/vendor/products/new');
  };

  const openEdit = (p: Product) => {
    if (!user?.isVerified) {
      toast.error('Verification Required');
      return;
    }
    navigate(`/vendor/products/edit/${p.id}`);
  };

  const deleteProduct = (p: Product) => {
    setConfirmModal({ show: true, type: 'delete', product: p });
  };

  const confirmDelete = async () => {
    const p = confirmModal.product;
    if (!p) return;
    try {
      await deleteDoc(doc(db, 'products', p.id));
      setProducts(products.filter(item => item.id !== p.id));
      toast.success(`${entityName} deleted`);
    } catch (e) {
      toast.error('Failed to delete');
    } finally {
      setConfirmModal({ show: false, type: null, product: null });
    }
  };

  const handleCloseCombo = () => {
    const hasData = comboForm.name || comboForm.price || comboForm.selectedItems.length > 0;
    if (hasData) {
      setConfirmModal({ show: true, type: 'discard', product: null });
    } else {
      setShowComboModal(false);
    }
  };

  const toggleStock = async (product: Product, inStock: boolean) => {
    try {
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, { inStock });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, inStock } : p));
      toast.success(inStock ? 'Stock Restored' : 'OOS');
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const createCombo = async () => {
    if (!comboForm.name || !comboForm.price || !comboForm.category || comboForm.selectedItems.length < 2) {
      toast.error("Invalid Combo", { description: "Please provide name, price, category and at least 2 items." });
      return;
    }

    const toastId = toast.loading("Assembling combo pack...");
    try {
      const selectedProducts = products.filter(p => comboForm.selectedItems.includes(p.id));
      const comboPrice = parseFloat(comboForm.price);

      const newCombo: Partial<Product> = {
        name: comboForm.name,
        price: comboPrice,
        category: comboForm.category,
        description: `Bundle of: ${selectedProducts.map(p => p.name).join(', ')}`,
        image: selectedProducts[0]?.image || '',
        vendorId: user?.id,
        isCombo: true,
        comboItems: comboForm.selectedItems,
        comboItemsData: selectedProducts.map(p => ({
            id: p.id,
            name: p.name,
            image: p.image,
            price: p.price
        })),
        inStock: true,
        lat: vendorStore?.lat,
        lng: vendorStore?.lng,
        mandal: vendorStore?.mandal,
        district: vendorStore?.district,
        state: vendorStore?.state,
        country: vendorStore?.country,
        storeName: vendorStore?.name,
        storeType: vendorStore?.storeType || 'product'
      };

      const docRef = await addDoc(collection(db, 'products'), cleanObject(newCombo));
      setProducts([{ id: docRef.id, ...newCombo } as Product, ...products]);
      
      toast.success("Combo Pack Registered!", { id: toastId });
      setShowComboModal(false);
      setComboForm({ name: '', price: '', category: '', selectedItems: [] });
    } catch (error: any) {
      console.error("Combo creation error:", error);
      toast.error("Failed to create combo", { 
        id: toastId,
        description: error.message || "An unexpected error occurred during registry."
      });
    }
  };

  if (appLoading || loading) return <ProductListSkeleton />;

  return (
    <div className="min-h-screen bg-[#202020] pb-32">
      <Header />
      <main className="max-w-4xl mx-auto px-4 pt-24 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner"><Package className="w-7 h-7" /></div>
            <div>
              <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">{entityNamePlural}</h1>
              <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Shelf Inventory Registry</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => {
                if (!user?.isVerified) { toast.error('Verification Required'); return; }
                setComboForm(f => ({ ...f, selectedItems: [] }));
                setShowComboModal(true);
              }} 
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all border border-white/10"
            >
              <Package2 className="w-5 h-5 text-primary" /> Create Combo
            </button>
            <button onClick={openNew} className="bg-primary text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20"><Plus className="w-5 h-5" /> Add New</button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="glass rounded-[3rem] p-20 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary/40"><PackageX className="w-10 h-10" /></div>
            <div><h3 className="text-xl font-black uppercase">No active listings</h3><p className="text-sm text-muted-foreground mt-2 max-w-xs">Start your shelf registry by adding items.</p></div>
            <button onClick={openNew} className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Launch First Listing</button>
          </div>
        ) : (
          <div className="space-y-16">
            {Object.entries(products.reduce((acc, p) => {
              const cat = p.category || 'Uncategorized';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(p);
              return acc;
            }, {} as Record<string, Product[]>)).map(([category, items]) => (
              <div key={category} className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                  <h2 className="text-sm font-black text-foreground uppercase tracking-widest">{category}</h2>
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{items.length} Units</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {items.map(p => {
                    const isCombo = p.isCombo;
                    const constituentItems = isCombo 
                      ? products.filter(item => p.comboItems?.includes(item.id)).slice(0, 4)
                      : [];

                    return (
                      <motion.div 
                        key={p.id} layout 
                        className={`glass rounded-[2.5rem] p-3 sm:p-4 flex gap-3 sm:gap-5 border group hover:shadow-2xl hover:shadow-primary/5 transition-all ${!p.inStock ? 'opacity-70' : ''} ${isCombo ? 'border-primary/30 bg-primary/[0.03] shadow-lg shadow-primary/5' : 'border-border/50'}`}
                      >
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[1.5rem] sm:rounded-3xl overflow-hidden relative shadow-lg bg-secondary/20 shrink-0">
                          {isCombo && constituentItems.length > 0 ? (
                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px] bg-primary/20">
                              {constituentItems.map((c, i) => (
                                <img key={c.id} src={c.image} className="w-full h-full object-cover" alt="" />
                              ))}
                              {constituentItems.length < 4 && (
                                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                  <Package2 className="w-4 h-4 text-primary/20" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
                            </div>
                          ) : (
                            <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="" />
                          )}
                          {!p.inStock && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"><span className="bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase truncate">OOS</span></div>}
                          {isCombo && <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-primary text-[6px] font-black uppercase text-white shadow-lg tracking-wider">Bundle</div>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <h3 className={`font-black text-sm uppercase truncate tracking-tight ${isCombo ? 'text-primary' : 'text-foreground'}`}>{p.name}</h3>
                            {isCombo && (
                              <p className="text-[8px] text-zinc-500 font-bold uppercase truncate mt-0.5 tracking-tighter">
                                Includes: {constituentItems.map(c => c.name).join(' + ')}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 sm:mt-2">
                              <span className="text-sm font-black text-foreground">₹{p.price}</span>
                              {p.discountedPrice && <span className="text-[11px] text-muted-foreground line-through opacity-50">₹{p.discountedPrice}</span>}
                              {p.quantity && <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full uppercase tracking-tighter ml-auto">{p.quantity}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
                            <button onClick={() => openEdit(p)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-secondary/50 flex items-center justify-center text-foreground hover:bg-secondary active:scale-90 transition-all border border-border/50"><Pencil className="w-4 h-4" /></button>
                            {p.inStock !== false ? (
                              <button onClick={() => toggleStock(p, false)} className="flex-1 h-10 sm:h-11 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 border border-rose-500/20"><PackageX className="w-3.5 h-3.5" /><span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Mark OOS</span></button>
                            ) : (
                              <button onClick={() => toggleStock(p, true)} className="flex-1 h-10 sm:h-11 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 border border-emerald-500/20"><RotateCcw className="w-3.5 h-3.5" /><span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Restore</span></button>
                            )}
                            <button onClick={() => deleteProduct(p)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-500/5 hover:bg-rose-500 hover:text-white text-muted-foreground flex items-center justify-center active:scale-90 transition-all border border-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showComboModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex flex-col md:items-center md:justify-center">
            <motion.div 
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              className="w-full max-w-2xl h-full md:h-[90vh] bg-[#202020] md:rounded-[3rem] flex flex-col shadow-2xl border-t md:border border-white/10 overflow-hidden"
            >
              <header className="p-8 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase flex items-center gap-3">
                    <Package2 className="w-8 h-8 text-primary" />
                    New Combo Pack
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Multi-item Discount Bundle</p>
                </div>
                <button onClick={handleCloseCombo} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 transition-all"><X className="w-6 h-6" /></button>
              </header>

              <div className="flex-1 overflow-y-auto px-8 py-4 space-y-10 custom-scrollbar pb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Combo Pack Name</label>
                    <input 
                      type="text" value={comboForm.name} onChange={e => setComboForm({...comboForm, name: e.target.value})}
                      placeholder="e.g. Breakfast Essentials"
                      className="w-full px-6 py-4 rounded-2xl bg-zinc-950 border-0 text-sm font-bold text-white focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Combo Bundle Price</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black">₹</span>
                      <input 
                        type="number" value={comboForm.price} onChange={e => setComboForm({...comboForm, price: e.target.value})}
                        placeholder="00"
                        className="w-full pl-10 pr-6 py-4 rounded-2xl bg-zinc-950 border-0 text-lg font-black text-white focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Assign Shelf Category</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowCategorySelect(!showCategorySelect)}
                      className="flex-1 px-6 py-4 rounded-2xl bg-zinc-950 border-0 text-sm font-bold text-white flex items-center justify-between hover:bg-zinc-900 transition-all"
                    >
                      <span className={comboForm.category ? '' : 'text-zinc-600'}>{comboForm.category || "Choose high-visibility category..."}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showCategorySelect ? 'rotate-180' : ''}`} />
                    </button>
                    {comboForm.category && (
                        <input 
                            type="text" 
                            value={comboForm.category} 
                            onChange={e => setComboForm({...comboForm, category: e.target.value})}
                            placeholder="Type new category..."
                            className="w-1/3 px-4 py-4 rounded-2xl bg-zinc-950 border border-white/5 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {showCategorySelect && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-2 max-h-60 overflow-y-auto custom-scrollbar">
                        <div className="p-2 border-b border-white/5 mb-2">
                            <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest px-2">Existing Categories</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                            {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                                <button 
                                    key={cat} onClick={() => { setComboForm({...comboForm, category: cat}); setShowCategorySelect(false); }}
                                    className={`p-3 rounded-xl text-[10px] font-black uppercase text-left transition-all hover:bg-white/5 ${comboForm.category === cat ? 'bg-primary/10 text-primary' : 'text-zinc-400'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                            {Object.keys(CATEGORY_METADATA).filter(k => CATEGORY_METADATA[k].type === (isServiceStore ? 'service' : 'product') && !products.some(p => p.category === k)).map(cat => (
                                <button 
                                    key={cat} onClick={() => { setComboForm({...comboForm, category: cat}); setShowCategorySelect(false); }}
                                    className={`p-3 rounded-xl text-[10px] font-black uppercase text-left transition-all hover:bg-white/5 ${comboForm.category === cat ? 'bg-primary/10 text-primary' : 'text-zinc-400'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => { setComboForm({...comboForm, category: 'New Category'}); setShowCategorySelect(false); }}
                            className="w-full mt-2 p-3 rounded-xl text-[10px] font-black uppercase text-center bg-white/5 text-zinc-400 hover:bg-primary hover:text-white transition-all"
                        >
                            + Create Custom Category
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pick Included Items ({comboForm.selectedItems.length})</label>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                      <input 
                        type="text" value={comboSearch} onChange={e => setComboSearch(e.target.value)}
                        placeholder="Filter list..."
                        className="pl-9 pr-4 py-2 bg-zinc-950 border-0 text-[10px] uppercase font-black tracking-widest rounded-xl text-white w-40 focus:w-56 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {products.filter(p => !p.isCombo && p.name.toLowerCase().includes(comboSearch.toLowerCase())).map(p => {
                      const isSelected = comboForm.selectedItems.includes(p.id);
                      return (
                        <button 
                          key={p.id} 
                          onClick={() => {
                            const newItems = isSelected 
                              ? comboForm.selectedItems.filter(id => id !== p.id)
                              : [...comboForm.selectedItems, p.id];
                            setComboForm({...comboForm, selectedItems: newItems});
                          }}
                          className={`w-full p-3 rounded-2xl border transition-all flex items-center gap-4 text-left ${isSelected ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                            <img src={p.image} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-xs font-black uppercase truncate ${isSelected ? 'text-primary' : 'text-zinc-300'}`}>{p.name}</h4>
                            <span className="text-[10px] font-bold text-zinc-500">₹{p.price}</span>
                          </div>
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-white scale-110' : 'bg-white/10 text-zinc-700'}`}>
                            {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 bg-gradient-to-t from-[#202020] via-[#202020] to-transparent">
                  <button 
                    onClick={createCombo}
                    className="w-full h-12 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    Register Combo Pack
                  </button>
                  <p className="text-center text-[8px] font-black uppercase text-zinc-600 mt-4 tracking-widest italic">Bundled items will be sold as a single registry entry</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {confirmModal.show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
             <style>{`#bottom-nav { display: none !important; }`}</style>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[3rem] p-10 space-y-8 text-center border border-border/50">
              <div className={`w-20 h-20 rounded-[2rem] mx-auto flex items-center justify-center shadow-inner ${confirmModal.type === 'delete' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {confirmModal.type === 'delete' ? <Trash2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {confirmModal.type === 'delete' ? 'Expunge Listing?' : 'Discard Progress?'}
                </h3>
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.1em] leading-relaxed">
                  {confirmModal.type === 'delete' 
                    ? 'This action is irreversible. All associated data will be purged from the registry.'
                    : 'Unsaved changes in this combo pack will be lost. Proceed to close?'}
                </p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setConfirmModal({ show: false, type: null, product: null })} className="flex-1 py-4 rounded-2xl bg-secondary text-foreground text-[11px] font-black uppercase tracking-widest transition-all">Cancel</button>
                <button 
                  onClick={() => {
                    if (confirmModal.type === 'delete') {
                      confirmDelete();
                    } else {
                      setShowComboModal(false);
                      setComboForm({ name: '', price: '', category: '', selectedItems: [] });
                      setConfirmModal({ show: false, type: null, product: null });
                    }
                  }} 
                  className={`flex-1 py-4 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all ${confirmModal.type === 'delete' ? 'bg-rose-500' : 'bg-amber-500'}`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorProducts;
