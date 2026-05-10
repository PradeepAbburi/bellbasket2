import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Package2, Search, X, Check, ChevronDown, Zap, Plus, Pencil, Trash2, Loader2, RotateCcw, PackageX, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Product } from '@/types';
import { CATEGORY_METADATA } from '@/constants/categories';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, addDoc } from 'firebase/firestore';
import PageLoading from '@/components/PageLoading';
import { cleanObject } from '@/utils/firebase';
import { useTranslation } from 'react-i18next';

const VendorCombos = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: appLoading, stores, setIsAnyModalOpen } = useApp();
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
  const [editingComboId, setEditingComboId] = useState<string | null>(null);

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

  useEffect(() => {
    setIsAnyModalOpen(!!(showComboModal || confirmModal.show));
    return () => setIsAnyModalOpen(false);
  }, [showComboModal, confirmModal.show, setIsAnyModalOpen]);

  const vendorStore = stores.find(s => s.vendorId === user?.id);
  const isServiceStore = vendorStore?.storeType === 'service';

  const combos = products.filter(p => p.isCombo);
  const regularProducts = products.filter(p => !p.isCombo);

  const deleteCombo = (p: Product) => {
    setConfirmModal({ show: true, type: 'delete', product: p });
  };

  const confirmDelete = async () => {
    const p = confirmModal.product;
    if (!p) return;
    try {
      await deleteDoc(doc(db, 'products', p.id));
      setProducts(products.filter(item => item.id !== p.id));
      toast.success(`Combo pack deleted`);
    } catch (e) {
      toast.error('Failed to delete');
    } finally {
      setConfirmModal({ show: false, type: null, product: null });
    }
  };

  const handleCloseCombo = () => {
    const hasData = comboForm.name || comboForm.price || comboForm.selectedItems.length > 0;
    if (hasData && !editingComboId) {
      setConfirmModal({ show: true, type: 'discard', product: null });
    } else {
      setShowComboModal(false);
      setEditingComboId(null);
      setComboForm({ name: '', price: '', category: '', selectedItems: [] });
    }
  };

  const handleEditCombo = (p: Product) => {
    setEditingComboId(p.id);
    setComboForm({
      name: p.name,
      price: p.price.toString(),
      category: p.category || '',
      selectedItems: p.comboItems || []
    });
    setShowComboModal(true);
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
            price: p.price,
            category: p.category || '',
            description: p.description || '',
            inStock: p.inStock ?? true
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

      if (editingComboId) {
        await updateDoc(doc(db, 'products', editingComboId), cleanObject(newCombo));
        setProducts(prev => prev.map(p => p.id === editingComboId ? { ...p, ...newCombo } : p));
        toast.success("Combo pack updated!", { id: toastId });
      } else {
        const docRef = await addDoc(collection(db, 'products'), cleanObject(newCombo));
        setProducts(prev => [{ id: docRef.id, ...newCombo } as Product, ...prev]);
        toast.success("Combo pack registered!", { id: toastId });
      }
      
      setShowComboModal(false);
      setEditingComboId(null);
      setComboForm({ name: '', price: '', category: '', selectedItems: [] });
    } catch (e) {
      toast.error("Failed to create combo", { id: toastId });
    }
  };

  const toggleStock = async (product: Product, inStock: boolean) => {
    try {
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, { inStock });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, inStock } : p));
      toast.success(inStock ? 'Combo Restored' : 'Combo OOS');
    } catch (error) {
      toast.error('Update failed');
    }
  };
  if (appLoading || loading) return <PageLoading />;

  return (
    <div className="min-h-screen bg-[#151515] pb-32">
      <Header />
      <main className="max-w-4xl mx-auto px-4 pt-24 space-y-8">
        {/* Back and Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => navigate('/vendor')}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 transition-all"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Combo Packs</h1>
              <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Bundle Management</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (!user?.isVerified) { toast.error('Verification Required'); return; }
              setComboForm(f => ({ ...f, selectedItems: [] }));
              setShowComboModal(true);
            }} 
            className="bg-primary text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> Create New Combo
          </button>
        </div>

        {loading ? (
          <PageLoading />
        ) : combos.length === 0 ? (
          <div className="bg-white/5 border border-white/5 rounded-[3rem] p-20 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary/40"><Package2 className="w-10 h-10" /></div>
            <div>
                <h3 className="text-xl font-black uppercase">No combos found</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">Create multi-item bundles with special pricing to attract more customers.</p>
            </div>
            <button 
                onClick={() => setShowComboModal(true)}
                className="bg-primary/10 text-primary border border-primary/20 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
            >
                Create Your First Combo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {combos.map(p => {
              const constituentItems = regularProducts.filter(item => p.comboItems?.includes(item.id)).slice(0, 4);
              return (
                <motion.div 
                  key={p.id} layout 
                  className={`relative overflow-hidden bg-[#202020] rounded-3xl p-4 border border-white/5 group hover:border-primary/30 transition-all ${!p.inStock ? 'opacity-70' : ''}`}
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden relative bg-black/40 border border-white/5 shrink-0">
                        {constituentItems.length > 0 ? (
                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px]">
                                {constituentItems.map(c => (
                                    <img key={c.id} src={c.image} className="w-full h-full object-cover" alt="" />
                                ))}
                                {constituentItems.length < 4 && <div className="w-full h-full bg-zinc-900" />}
                            </div>
                        ) : (
                            <img src={p.image} className="w-full h-full object-cover" alt="" />
                        )}
                        {!p.inStock && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                                <span className="text-[10px] font-black text-white uppercase bg-rose-600 px-2 py-0.5 rounded-lg">OOS</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-black text-sm text-white uppercase truncate pr-8">{p.name}</h3>
                                <p className="text-[8px] text-zinc-500 font-bold uppercase mt-1 tracking-wider">{p.category}</p>
                            </div>
                            <div className="flex gap-1 absolute top-4 right-4">
                                <button 
                                    onClick={() => handleEditCombo(p)}
                                    className="p-2 rounded-xl bg-white/5 text-zinc-500 hover:text-primary hover:bg-primary/10 transition-all"
                                    title="Edit Combo"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => deleteCombo(p)}
                                    className="p-2 rounded-xl bg-white/5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                    title="Delete Combo"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="mt-auto pt-3 flex items-center justify-between">
                            <span className="text-lg font-black text-primary">₹{p.price}</span>
                            <div className="flex gap-1.5">
                                <button 
                                    onClick={() => toggleStock(p, !p.inStock)}
                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${p.inStock ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}
                                >
                                    {p.inStock ? 'Mark OOS' : 'Restore'}
                                </button>
                            </div>
                        </div>
                    </div>
                  </div>
                  
                  {/* Items List */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                     {constituentItems.map(c => (
                        <span key={c.id} className="px-2 py-1 bg-white/5 rounded-lg text-[8px] font-black text-zinc-400 uppercase tracking-tighter">
                            {c.name}
                        </span>
                     ))}
                     {p.comboItems && p.comboItems.length > 4 && (
                        <span className="px-2 py-1 bg-primary/10 rounded-lg text-[8px] font-black text-primary uppercase tracking-tighter">
                            + {p.comboItems.length - 4} More
                        </span>
                     )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Combo Creation Modal */}
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
                    {editingComboId ? 'Edit Combo Pack' : 'New Combo Pack'}
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
                    {regularProducts.filter(p => p.name.toLowerCase().includes(comboSearch.toLowerCase())).map(p => {
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
                    {editingComboId ? 'Update Combo Pack' : 'Register Combo Pack'}
                  </button>
                  <p className="text-center text-[8px] font-black uppercase text-zinc-600 mt-4 tracking-widest italic">Bundled items will be sold as a single registry entry</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Confirmation Modal */}
        {confirmModal.show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[3rem] p-10 space-y-8 text-center border border-border/50">
              <div className={`w-20 h-20 rounded-[2rem] mx-auto flex items-center justify-center shadow-inner ${confirmModal.type === 'delete' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {confirmModal.type === 'delete' ? <Trash2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {confirmModal.type === 'delete' ? 'Expunge Combo?' : 'Discard Progress?'}
                </h3>
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.1em] leading-relaxed">
                  {confirmModal.type === 'delete' 
                    ? 'This combo pack and its bundle definition will be purged. Constituent items will remain unaffected.'
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
                      setConfirmModal({ show: false, type: null, product: null });
                      setComboForm({ name: '', price: '', category: '', selectedItems: [] });
                    }
                  }}
                  className={`flex-[1.5] py-4 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest transition-all ${confirmModal.type === 'delete' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'}`}
                >
                  {confirmModal.type === 'delete' ? 'Expunge' : 'Discard'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorCombos;
