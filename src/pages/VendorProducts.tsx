import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Package2, Search, X, Check, ChevronDown, Zap, Plus, Pencil, Trash2, Loader2, RotateCcw, PackageX, AlertCircle, Barcode } from 'lucide-react';
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
import BarcodeInventoryModal from '@/components/BarcodeInventoryModal';

const VendorProducts = () => {
  const navigate = useNavigate();
  const { user, loading: appLoading, stores, setIsAnyModalOpen } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'delete' | null;
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

  // Use global modal state to hide nav elements
  useEffect(() => {
    setIsAnyModalOpen(!!confirmModal.show || isBarcodeModalOpen);
    return () => setIsAnyModalOpen(false);
  }, [confirmModal.show, isBarcodeModalOpen, setIsAnyModalOpen]);

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


  if (appLoading || loading) return <PageLoading />;

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
          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              onClick={() => setIsBarcodeModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
            >
              <Barcode className="w-4 h-4" /> Barcode Scan
            </button>
            <button 
              onClick={() => navigate('/vendor/combos')}
              className="bg-secondary/50 text-foreground px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all border border-border/40"
            >
              <Package2 className="w-4 h-4" /> Combos
            </button>
            <button onClick={openNew} className="bg-primary text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus className="w-4 h-4" /> Add New</button>
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
                        className={`glass rounded-3xl p-2.5 sm:p-3 flex gap-3 sm:gap-4 border group hover:shadow-xl hover:shadow-primary/5 transition-all ${!p.inStock ? 'opacity-70' : ''} ${isCombo ? 'border-primary/30 bg-primary/[0.03] shadow-lg shadow-primary/5' : 'border-border/50'}`}
                      >
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden relative shadow-md bg-secondary/20 shrink-0">
                          {isCombo && constituentItems.length > 0 ? (
                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px] bg-primary/20">
                              {constituentItems.map((c, i) => (
                                <img key={c.id} src={c.image} className="w-full h-full object-cover" alt="" />
                              ))}
                              {constituentItems.length < 4 && (
                                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                  <Package2 className="w-3 h-3 text-primary/20" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
                            </div>
                          ) : (
                            <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="" />
                          )}
                          {!p.inStock && (
                             <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
                               <div className="bg-red-600/80 backdrop-blur-md px-2 py-1 rounded-xl border border-white/20 shadow-2xl flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                 <PackageX className="w-3 h-3 text-white" />
                                 <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">OOS</span>
                               </div>
                             </div>
                           )}
                          {isCombo && <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-primary text-[5px] font-black uppercase text-white shadow-lg tracking-wider">Bundle</div>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <h3 className={`font-black text-[13px] uppercase truncate tracking-tight ${isCombo ? 'text-primary' : 'text-foreground'}`}>{p.name}</h3>
                            {isCombo && (
                              <p className="text-[7px] text-zinc-500 font-bold uppercase truncate mt-0.5 tracking-tighter">
                                {constituentItems.map(c => c.name).join(' + ')}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[13px] font-black text-foreground">₹{p.price}</span>
                              {p.discountedPrice && <span className="text-[10px] text-muted-foreground line-through opacity-50 font-bold">₹{p.discountedPrice}</span>}
                              {p.quantity && <span className="text-[8px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-lg uppercase tracking-tighter ml-auto">{p.quantity}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
                            <button onClick={() => openEdit(p)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-foreground hover:bg-white/10 active:scale-90 transition-all border border-white/10"><Pencil className="w-4 h-4 opacity-70" /></button>
                            {p.inStock !== false ? (
                              <button onClick={() => toggleStock(p, false)} className="flex-1 h-9 bg-[#cc2d4a]/5 hover:bg-[#cc2d4a]/10 text-[#cc2d4a] rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-[#cc2d4a]/20">
                                <PackageX className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Mark OOS</span>
                              </button>
                            ) : (
                              <button onClick={() => toggleStock(p, true)} className="flex-1 h-9 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-emerald-500/20">
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Restore</span>
                              </button>
                            )}
                            <button onClick={() => deleteProduct(p)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 active:scale-90 transition-all border border-white/10"><Trash2 className="w-4 h-4 opacity-40" /></button>
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

        {confirmModal.show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
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

        <BarcodeInventoryModal 
          isOpen={isBarcodeModalOpen} 
          onClose={() => setIsBarcodeModalOpen(false)} 
          vendorId={user?.id || ''} 
          onProductAdded={fetchProducts} 
        />
    </div>
  );
};

export default VendorProducts;
