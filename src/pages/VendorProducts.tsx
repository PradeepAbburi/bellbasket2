import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, ArrowLeft, Package, Upload, Camera, Loader2, Image as ImageIcon, RotateCcw, AlertCircle, PackageX, ChevronDown, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/context/appStore';
import { Product } from '@/types';
import { CATEGORY_METADATA } from '@/constants/categories';
import { toast } from 'sonner';
import { db, auth, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cleanObject } from '@/utils/firebase';

const VendorProducts = () => {
  const navigate = useNavigate();
  const { user, loading: appLoading, stores } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    image: '',
    discountedPrice: '',
    quantityValue: '',
    quantityUnit: '',
    startTime: '09:00',
    endTime: '21:00',
    availableDays: [0, 1, 2, 3, 4, 5, 6]
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Processing image...');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 500; // Smaller size for instant sync
            let width = img.width;
            let height = img.height;
            if (width > MAX_SIZE || height > MAX_SIZE) {
              if (width > height) {
                height = Math.round(height * MAX_SIZE / width);
                width = MAX_SIZE;
              } else {
                width = Math.round(width * MAX_SIZE / height);
                height = MAX_SIZE;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
            }
            resolve(canvas.toDataURL('image/jpeg', 0.45)); // Balanced quality/size
          };
          img.onerror = () => reject(new Error('Failed to load image into memory.'));
        };
        reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      });
      setForm(f => ({ ...f, image: base64 }));
      toast.success('Image ready!', { id: toastId });
    } catch (error: any) {
      console.error("Image Processing Error:", error);
      toast.error(error.message || 'Processing failed', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!showForm || uploading) return;

      const file = e.clipboardData?.files?.[0];
      if (file && auth.currentUser && file.type.startsWith('image/')) {
        await processImageFile(file);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showForm, uploading]);

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

  if (appLoading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const openNew = () => {
    if (!user?.isVerified) {
      toast.error('Email verification required', {
        description: `Please verify your email in the Profile section to manage ${entityNamePlural.toLowerCase()}.`,
        action: { label: 'Go to Profile', onClick: () => navigate('/profile') }
      });
      return;
    }

    const plan = user?.plan || 'none';
    const limit = plan === 'pro' ? Infinity : plan === 'growth' ? 60 : 30;

    if (plan === 'none') {
      toast.error('Subscription Required', {
        description: 'Your plan has expired or you do not have an active subscription. Please renew to add products.',
        action: { label: 'Go to Plans', onClick: () => navigate('/vendor/subscription') }
      });
      return;
    }

    if (products.length >= limit) {
      toast.error(`${entityName} limit reached!`, {
        description: `Your ${plan.toUpperCase()} plan allows only ${limit} ${entityNamePlural.toLowerCase()}.`,
        action: { label: 'Upgrade Now', onClick: () => navigate('/vendor/subscription') }
      });
      return;
    }

    setEditProduct(null);
    setForm({ 
      name: '', 
      price: '', 
      category: '', 
      description: '', 
      image: '', 
      discountedPrice: '', 
      quantityValue: '', 
      quantityUnit: '',
      startTime: '09:00',
      endTime: '21:00',
      availableDays: [0, 1, 2, 3, 4, 5, 6]
    });
    setIsCustomCategory(false);
    setCustomCategory('');
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    if (!user?.isVerified) {
      toast.error('Email verification required');
      return;
    }
    setEditProduct(p);
    const vendorCategories = [...new Set(products.map(prod => prod.category).filter(Boolean))];
    const isExisting = vendorCategories.includes(p.category);
    setForm({
      name: p.name,
      price: String(p.price),
      category: isExisting ? p.category : 'custom',
      description: p.description,
      image: p.image,
      discountedPrice: p.discountedPrice ? String(p.discountedPrice) : '',
      quantityValue: p.quantity ? p.quantity.replace(/[^0-9.]/g, '').trim() : '',
      quantityUnit: p.quantity ? p.quantity.replace(/[0-9.]/g, '').replace(/[\s-]/g, '').trim() : '',
      startTime: p.availability?.startTime || '09:00',
      endTime: p.availability?.endTime || '21:00',
      availableDays: p.availability?.days || [0, 1, 2, 3, 4, 5, 6]
    });
    setIsCustomCategory(!isExisting);
    setCustomCategory(!isExisting ? p.category : '');
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    await processImageFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file && auth.currentUser) {
      await processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [showCamera]);

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    // Stop any existing stream before starting a new one
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
      setShowCamera(true);
      setFacingMode(mode);
    } catch (err: any) {
      console.error("Camera access failed, trying default:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
        setShowCamera(true);
      } catch (err2) {
        toast.error("Could not access camera. Please check permissions.");
      }
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(newMode);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      const MAX_SIZE = 500;
      let width = canvas.width;
      let height = canvas.height;

      const outputCanvas = document.createElement('canvas');
      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round(height * MAX_SIZE / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round(width * MAX_SIZE / height);
          height = MAX_SIZE;
        }
      }

      outputCanvas.width = width;
      outputCanvas.height = height;
      const outCtx = outputCanvas.getContext('2d');
      outCtx?.drawImage(canvas, 0, 0, width, height);

      const base64 = outputCanvas.toDataURL('image/jpeg', 0.5);
      setForm(f => ({ ...f, image: base64 }));
      stopCamera();
      toast.success("Photo captured!");
    } else {
      toast.error("Camera not ready. Please wait for the video to start.");
    }
  };

  const handleSave = async () => {
    console.log("Saving product. Auth State:", {
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      appUserId: user?.id,
      isVerified: user?.isVerified
    });

    if (!form.name || !form.price) {
      toast.error('Please enter product name and price');
      return;
    }

    if (!user?.id) {
      toast.error('Session expired. Please sign in again.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading(editProduct ? `Updating ${entityName.toLowerCase()}...` : `Adding ${entityName.toLowerCase()}...`);

    try {
      const productData = {
        name: form.name.trim(),
        price: Number(form.price),
        category: (isCustomCategory ? customCategory : form.category) || 'Others',
        description: form.description.trim(),
        image: form.image || 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop',
        inStock: true,
        discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : null,
        quantity: form.quantityValue && form.quantityUnit ? `${form.quantityValue} - ${form.quantityUnit}` : (form.quantityValue || form.quantityUnit || ''),
        availability: isServiceStore ? {
          startTime: form.startTime,
          endTime: form.endTime,
          days: form.availableDays
        } : null,
        vendorId: user.id,
        updatedAt: new Date().toISOString()
      };

      const cleanedData = cleanObject(productData);
      console.log("Submitting to Firestore:", cleanedData);

      if (editProduct) {
        await updateDoc(doc(db, 'products', editProduct.id), cleanedData);
        toast.success(`${entityName} updated successfully`, { id: toastId });
      } else {
        const docRef = await addDoc(collection(db, 'products'), {
          ...cleanedData,
          createdAt: new Date().toISOString()
        });
        console.log("Item added with ID:", docRef.id);
        toast.success(`${entityName} added successfully!`, { id: toastId });
      }
      await fetchProducts();
      setShowForm(false);
    } catch (error: any) {
      console.error("Firestore Save Error Details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      let msg = 'Failed to save product';
      if (error.code === 'permission-denied') msg = 'Permission denied. Check your store setup.';
      else if (error.message?.includes('too large')) msg = 'Image size too large. Try a different one.';

      toast.error(msg, {
        id: toastId,
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  ;

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${entityName.toLowerCase()}?`)) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      await fetchProducts();
      toast.success(`${entityName} removed`);
    } catch (error) {
      toast.error(`Failed to remove ${entityName.toLowerCase()}`);
    }
  };

  const toggleStock = async (product: Product) => {
    try {
      const newStatus = !product.inStock;
      await updateDoc(doc(db, 'products', product.id), { inStock: newStatus });
      await fetchProducts();
      toast.success(newStatus ? `${product.name} is back in stock` : `${product.name} marked as out of stock`);
    } catch (error) {
      toast.error('Failed to update stock status');
    }
  };

  return (
    <div className="min-h-screen gradient-warm">
      <Header />
      <div className="pt-20 pb-40 lg:pb-8 px-4 max-w-4xl mx-auto">
        <button onClick={() => navigate('/vendor')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-foreground">My {entityNamePlural}</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">
              {products.length} / {user?.plan === 'pro' ? '∞' : (user?.plan === 'growth' ? '60' : (user?.plan === 'none' ? '0' : '30'))} items used
            </p>
          </div>
          <button onClick={openNew} className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Add {entityName}
          </button>
        </div>

        <div className="space-y-8">
          {Object.entries(
            products.reduce((acc, p) => {
              const cat = p.category || 'Uncategorized';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(p);
              return acc;
            }, {} as Record<string, Product[]>)
          ).map(([category, items], ci) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                {CATEGORY_METADATA[category] && (
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${CATEGORY_METADATA[category].gradient} text-white shadow-sm ring-4 ring-white`}>
                    {(() => {
                      const Icon = CATEGORY_METADATA[category].icon;
                      return <Icon className="w-4 h-4" />;
                    })()}
                  </div>
                )}
                <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest">{category}</h2>
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {items.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`glass rounded-2xl p-4 flex gap-4 group transition-all ${!p.inStock ? 'ring-2 ring-red-300/50 bg-red-50/30' : 'hover:bg-white/40'}`}
                  >
                    <div className="relative">
                      <img src={p.image} alt={p.name} className={`w-16 h-16 rounded-xl object-cover transition-all ${!p.inStock ? 'opacity-40 grayscale' : ''}`} />
                      {!p.inStock && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <PackageX className="w-6 h-6 text-red-500" />
                        </div>
                      )}
                      {p.quantity && (
                        <div className="absolute -top-1 -right-1 bg-slate-900/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-lg border border-white/20 uppercase tracking-tighter z-10">
                          {p.quantity.includes(' - ') ? p.quantity : p.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <h3 className={`font-semibold text-sm truncate ${!p.inStock ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{p.name}</h3>

                            <button
                              onClick={(e) => { e.stopPropagation(); toggleStock(p); }}
                              className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${p.inStock
                                ? 'bg-emerald-100/50 text-emerald-700 hover:bg-red-100 hover:text-red-600'
                                : 'bg-red-100 text-red-600 hover:bg-emerald-100 hover:text-emerald-700'
                                }`}
                            >
                              <PackageX className="w-2.5 h-2.5" />
                              {p.inStock ? 'Mark Out of Stock' : 'Restore'}
                            </button>
                          </div>
                          {p.discountedPrice && p.price > p.discountedPrice && p.inStock && (
                            <span className="shrink-0 bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                              {Math.round(((p.price - p.discountedPrice) / p.price) * 100)}% OFF
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {p.discountedPrice ? (
                            <>
                              <span className={`font-bold ${!p.inStock ? 'text-muted-foreground' : 'text-foreground'}`}>₹{p.discountedPrice}</span>
                              <span className="text-xs text-muted-foreground line-through">₹{p.price}</span>
                            </>
                          ) : (
                            <span className={`font-bold ${!p.inStock ? 'text-muted-foreground' : 'text-foreground'}`}>₹{p.price}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}

          {products.length === 0 && !loading && (
            <div className="glass rounded-2xl p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
              <p className="text-muted-foreground">You haven't added any products yet.</p>
            </div>
          )}
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm px-4"
              onClick={() => !uploading && setShowForm(false)}
            >
              <style>{`#bottom-nav { display: none !important; }`}</style>
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="glass-strong rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden relative"
              >
                {/* Make header sticky and separate from scrollable body */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/20 bg-white/50 backdrop-blur-xl z-20">
                  <h2 className="text-lg font-bold text-foreground">{editProduct ? `Edit ${entityName}` : `Add ${entityName}`}</h2>
                  <button onClick={() => setShowForm(false)} disabled={uploading} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 text-muted-foreground hover:bg-black/10 hover:text-foreground disabled:opacity-50 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto scrollbar-hide flex-1 space-y-4">
                  {/* Image Upload Area */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{entityName} Image</label>
                    <div className="flex flex-col gap-3">
                      {form.image ? (
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-white shadow-lg group">
                          <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setForm(f => ({ ...f, image: '' }))}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`aspect-video w-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 p-6 text-center cursor-pointer ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 bg-secondary/30 hover:bg-secondary/50'}`}
                          onClick={() => fileInputRef.current?.click()}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">Click, drag & drop, or paste image</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Supports PNG, JPG, JPEG</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-bold transition-colors disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </button>
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => startCamera()}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-bold transition-colors disabled:opacity-50"
                        >
                          <Camera className="w-4 h-4" />
                          Camera
                        </button>
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={`${entityName} name`} className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                    <div className="grid grid-cols-1 gap-3">
                      <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Cost (₹)" type="number" className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 min-w-0">
                      <div className="min-w-0">
                        <input
                          value={form.quantityValue}
                          onChange={e => setForm(f => ({ ...f, quantityValue: e.target.value }))}
                          placeholder="Quantity (e.g. 10)"
                          type="text"
                          className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
                        />
                      </div>
                      <div className="relative min-w-0">
                        <button
                          type="button"
                          onClick={() => setShowUnitModal(true)}
                          className="w-full pl-4 pr-10 py-3 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 text-left truncate flex items-center h-12"
                        >
                          {form.quantityUnit || <span className="text-muted-foreground">Unit</span>}
                        </button>
                        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        value={form.discountedPrice}
                        onChange={e => setForm(f => ({ ...f, discountedPrice: e.target.value }))}
                        placeholder="Discounted Price (Optional, e.g. 500)"
                        type="number"
                        className={`w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30`}
                      />
                    </div>

                    <div className="relative min-w-0">
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="w-full pl-4 pr-10 py-3 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 text-left truncate flex items-center h-12"
                      >
                        {form.category === 'custom' ? '+ Create New Category' : (form.category || <span className="text-muted-foreground">Select Category</span>)}
                      </button>
                      <ChevronDown className="w-5 h-5 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {isCustomCategory && (
                      <motion.input
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        placeholder="Enter your category name..."
                        className="w-full px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    )}
                    {isServiceStore && (
                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Service Availability
                        </label>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Daily Start Time</label>
                            <input 
                              type="time" 
                              value={form.startTime} 
                              onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Daily End Time</label>
                            <input 
                              type="time" 
                              value={form.endTime} 
                              onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Working Days</label>
                          <div className="flex flex-wrap gap-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                              const isSelected = form.availableDays.includes(idx);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const newDays = isSelected 
                                      ? form.availableDays.filter(d => d !== idx)
                                      : [...form.availableDays, idx].sort();
                                    setForm(f => ({ ...f, availableDays: newDays }));
                                  }}
                                  className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Description (Optional)"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-6 border-t border-white/20 bg-white/80 backdrop-blur-xl z-20">
                  <button
                    onClick={handleSave}
                    disabled={uploading || !form.name || !form.price}
                    className="w-full gradient-primary text-primary-foreground py-4 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-50 disabled:scale-100 active:scale-95 transition-transform"
                  >
                    {editProduct ? `Update ${entityName}` : `Add ${entityName}`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Camera Modal */}
          {showCamera && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black backdrop-blur-md p-4"
            >
              <style>{`#bottom-nav { display: none !important; }`}</style>
              <div className="w-full max-w-lg aspect-[3/4] bg-neutral-900 rounded-[40px] overflow-hidden relative shadow-2xl border-4 border-white/10">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* HUD */}
                <div className="absolute inset-0 flex flex-col justify-between p-8">
                  <div className="flex justify-between items-start">
                    <button
                      onClick={switchCamera}
                      className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all"
                      title="Switch Camera"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </button>
                    <button
                      onClick={stopCamera}
                      className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 rounded-full border-4 border-white p-1 hover:scale-110 active:scale-95 transition-all cursor-pointer">
                      <div
                        onClick={capturePhoto}
                        className="w-full h-full rounded-full bg-white"
                      />
                    </div>
                    <p className="text-white/60 text-xs font-black uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                      Align product in frame
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Unit Modal */}
          {showUnitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUnitModal(false)}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0 pt-20"
            >
              <style>{`#bottom-nav { display: none !important; }`}</style>
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm bg-background rounded-3xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[80vh] shadow-xl pb-[env(safe-area-inset-bottom)]"
              >
                <div className="p-5 flex items-center justify-between border-b border-border shrink-0 bg-background/80 backdrop-blur-xl z-10">
                  <h3 className="font-bold text-lg">Select Unit</h3>
                  <button onClick={() => setShowUnitModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-y-auto p-4 scrollbar-hide flex-1 space-y-2">
                  {['ml', 'ltr', 'kg', 'grams', 'piece', 'packet', 'dozen'].map(unit => (
                    <button
                      key={unit}
                      className={`w-full text-left px-5 py-4 rounded-2xl ${form.quantityUnit === unit ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20' : 'bg-secondary/50 hover:bg-secondary'}`}
                      onClick={() => {
                        setForm(f => ({ ...f, quantityUnit: unit }));
                        setShowUnitModal(false);
                      }}
                    >
                      {unit}
                    </button>
                  ))}
                  <button
                    className="w-full text-left px-5 py-4 rounded-2xl mt-4 border-2 border-dashed border-border text-muted-foreground hover:bg-secondary font-semibold flex justify-center items-center"
                    onClick={() => {
                      setForm(f => ({ ...f, quantityUnit: '' }));
                      setShowUnitModal(false);
                    }}
                  >
                    Clear Unit
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Category Modal */}
          {showCategoryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryModal(false)}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0 pt-20"
            >
              <style>{`#bottom-nav { display: none !important; }`}</style>
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm bg-background border border-border rounded-3xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl pb-[env(safe-area-inset-bottom)]"
              >
                <div className="p-5 flex items-center justify-between border-b border-border shrink-0 bg-background/80 backdrop-blur-xl z-10">
                  <h3 className="font-bold text-lg">Select Category</h3>
                  <button onClick={() => setShowCategoryModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-y-auto p-4 scrollbar-hide flex-1 space-y-2">
                  {[...new Set(products.map(p => p.category).filter(Boolean))].map(cat => (
                    <button
                      key={cat}
                      className={`w-full text-left px-5 py-4 rounded-2xl ${form.category === cat && !isCustomCategory ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20' : 'bg-secondary/50 hover:bg-secondary'}`}
                      onClick={() => {
                        setForm(f => ({ ...f, category: cat }));
                        setIsCustomCategory(false);
                        setShowCategoryModal(false);
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    className={`w-full text-left flex justify-center items-center px-5 py-4 rounded-2xl mt-4 border-2 border-dashed border-primary/50 text-primary ${form.category === 'custom' || isCustomCategory ? 'bg-primary/10 font-bold' : 'hover:bg-primary/5 font-semibold'}`}
                    onClick={() => {
                      setForm(f => ({ ...f, category: 'custom' }));
                      setIsCustomCategory(true);
                      setShowCategoryModal(false);
                    }}
                  >
                    + Create New Category
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VendorProducts;
