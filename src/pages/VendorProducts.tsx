import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Package, Loader2, RotateCcw, PackageX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Product } from '@/types';
import { CATEGORY_METADATA } from '@/constants/categories';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ProductListSkeleton } from '@/components/SkeletonLoader';

const VendorProducts = () => {
  const navigate = useNavigate();
  const { user, loading: appLoading, stores } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'delete' | null;
    product: Product | null;
  }>({ show: false, type: null, product: null });

  const fetchProducts = async () => {
    if (!user?.id || typeof user.id !== 'string') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const q = query(collection(db, 'products'), where('vendorId', '==', user.id));
      const snapshot = await getDocs(q);
      const productData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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

  const isServiceStore = stores.find(s => s.vendorId === user?.id)?.storeType === 'service';
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
      toast.success(inStock ? 'Stock Restored' : 'Out of Stock');
    } catch (error) {
      toast.error('Update failed');
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
          <button onClick={openNew} className="bg-primary text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus className="w-5 h-5" /> Add New</button>
        </div>

        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
        ) : products.length === 0 ? (
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
                  {items.map(p => (
                    <motion.div key={p.id} layout className={`glass rounded-[2.5rem] p-3 sm:p-4 flex gap-3 sm:gap-5 border border-border/50 group hover:shadow-2xl hover:shadow-primary/5 transition-all ${!p.inStock ? 'opacity-70' : ''}`}>
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[1.5rem] sm:rounded-3xl overflow-hidden relative shadow-lg bg-secondary/20 shrink-0">
                        <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="" />
                        {!p.inStock && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"><span className="bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase truncate">Out of Stock</span></div>}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h3 className="font-black text-sm text-foreground uppercase truncate tracking-tight">{p.name}</h3>
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {confirmModal.show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
             <style>{`#bottom-nav { display: none !important; }`}</style>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[3rem] p-10 space-y-8 text-center border border-border/50">
              <div className="w-20 h-20 rounded-[2rem] mx-auto flex items-center justify-center bg-rose-500/10 text-rose-500 shadow-inner"><Trash2 className="w-10 h-10" /></div>
              <div className="space-y-3">
                <h3 className="text-xl font-black uppercase tracking-tight">Expunge Listing?</h3>
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.1em] leading-relaxed">This action is irreversible. All associated data will be purged from the registry.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setConfirmModal({ show: false, type: null, product: null })} className="flex-1 py-4 rounded-2xl bg-secondary text-foreground text-[11px] font-black uppercase tracking-widest transition-all">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl bg-rose-500 text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">Confirm</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorProducts;
