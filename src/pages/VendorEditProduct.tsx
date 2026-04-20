import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, ArrowLeft, Package, Upload, Camera, Loader2, Image as ImageIcon, RotateCcw, AlertCircle, PackageX, ChevronDown, Clock, Check, Maximize } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Product, ProductVariant } from '@/types';
import { toast } from 'sonner';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { cleanObject } from '@/utils/firebase';

const CropModal = ({ src, onCancel, onComplete }: { src: string, onCancel: () => void, onComplete: (base64: string) => void }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleCrop = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SIZE = 1200;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = img.naturalWidth / (img.width * zoom);
    const scaleY = img.naturalHeight / (img.height * zoom);

    const windowSize = 280;
    const scrollX = (img.width * zoom - windowSize) / 2 - position.x;
    const scrollY = (img.height * zoom - windowSize) / 2 - position.y;

    const sourceX = scrollX * scaleX;
    const sourceY = scrollY * scaleY;
    const sourceSize = windowSize * scaleX;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, SIZE, SIZE);
    
    onComplete(canvas.toDataURL('image/jpeg', 0.95));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4"
    >
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
            <div>
                <h3 className="text-white font-black uppercase tracking-widest text-xs">Crop Image</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Focus on your product</p>
            </div>
            <button onClick={onCancel} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white ring-1 ring-white/10"><X className="w-5 h-5" /></button>
        </div>

        <div 
          ref={containerRef}
          className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden bg-neutral-900 border-2 border-white/10 cursor-move touch-none flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <div className="absolute inset-0 z-20 pointer-events-none">
            <div className="absolute inset-0 bg-black/40" style={{ clipPath: 'evenodd, polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 10px 10px, 10px calc(100% - 10px), calc(100% - 10px) calc(100% - 10px), calc(100% - 10px) 10px, 10px 10px)' }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] border-2 border-primary shadow-[0_0_0_1000px_rgba(0,0,0,0.6)] rounded-2xl" />
          </div>

          <motion.img
            ref={imageRef}
            src={src}
            alt="To crop"
            className="max-w-none select-none pointer-events-none"
            initial={false}
            animate={{ scale: zoom, x: position.x, y: position.y }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          />
        </div>

        <div className="glass rounded-3xl p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <div className="flex items-center gap-2"><Maximize className="w-3 h-3" /> Zoom Control</div>
                <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onCancel}
              className="py-4 rounded-2xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 border border-white/5"
            >
              Cancel
            </button>
            <button 
              onClick={handleCrop}
              className="py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Crop
            </button>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
};

const VendorEditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user, loading: appLoading, stores } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [minLoadingTimePassed, setMinLoadingTimePassed] = useState(false);
  const [form, setForm] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    image: '',
    image2: '',
    discountedPrice: '',
    quantityValue: '',
    quantityUnit: '',
    startTime: '09:00',
    endTime: '21:00',
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    hasVariants: false,
    variants: [] as ProductVariant[]
  });
  
  const [showCamera, setShowCamera] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [imageTarget, setImageTarget] = useState<'image' | 'image2'>('image');
  const [showImage2Field, setShowImage2Field] = useState(false);
  const [cropModal, setCropModal] = useState<{show: boolean, src: string, field: 'image' | 'image2' | null}>({show: false, src: '', field: null});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState('');
  const [initialFormState, setInitialFormState] = useState<any>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinLoadingTimePassed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (id) {
       const fetchProduct = async () => {
          try {
             const docRef = doc(db, 'products', id);
             const docSnap = await getDoc(docRef);
             if (docSnap.exists()) {
                const p = docSnap.data() as Product;
                const loadedForm = {
                   name: p.name,
                   price: String(p.price),
                   category: p.category || '',
                   description: p.description || '',
                   image: p.image,
                   image2: p.image2 || '',
                   discountedPrice: p.discountedPrice ? String(p.discountedPrice) : '',
                   quantityValue: p.quantity ? p.quantity.replace(/[^0-9.]/g, '').trim() : '',
                   quantityUnit: p.quantity ? p.quantity.replace(/[0-9.]/g, '').replace(/[\s-]/g, '').trim() : '',
                   startTime: p.availability?.startTime || '09:00',
                   endTime: p.availability?.endTime || '21:00',
                   availableDays: p.availability?.days || [0, 1, 2, 3, 4, 5, 6],
                   hasVariants: p.hasVariants || false,
                   variants: p.variants || []
                };
                setForm(loadedForm);
                setInitialFormState(loadedForm);
                setShowImage2Field(!!p.image2);
             } else {
                toast.error("Listing not found");
                navigate('/vendor/products');
             }
          } catch (e) {
             toast.error("Error fetching listing");
          } finally {
             setInitialLoading(false);
          }
       };
       fetchProduct();
    } else {
      setInitialFormState({...form});
      setInitialLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchCats = async () => {
      try {
        const q = query(collection(db, 'products'), where('vendorId', '==', user.id));
        const snap = await getDocs(q);
        const cats = new Set<string>();
        snap.forEach(doc => {
          const data = doc.data();
          if (data.category) cats.add(data.category);
        });
        setCategories(Array.from(cats).sort());
      } catch (e) {}
    };
    fetchCats();
  }, [user?.id]);

  const isServiceStore = stores.find(s => s.vendorId === user?.id)?.storeType === 'service';
  const entityName = isServiceStore ? 'Service' : 'Product';

  const processImageFile = async (file: File, field: 'image' | 'image2' = 'image') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        setCropModal({ show: true, src: event.target?.result as string, field });
    };
  };

  const startCamera = async (mode: 'user' | 'environment' = 'environment') => {
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
        toast.error("Could not access camera.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setShowCamera(false);
  };

  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(newMode);
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.95);
        setCropModal({ show: true, src: base64, field: imageTarget });
        stopCamera();
    }
  };

  const handleCropComplete = (croppedBase64: string) => {
    if (cropModal.field) {
        setForm(f => ({ ...f, [cropModal.field as string]: croppedBase64 }));
        toast.success("Image ready!");
    }
    setCropModal({ show: false, src: '', field: null });
  };

  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(console.error);
    }
  }, [showCamera]);


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category || !form.image) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    const toastId = toast.loading(`Saving ${entityName.toLowerCase()}...`);
    try {
      const vendorStore = stores.find(s => s.vendorId === user?.id);
      
      const productData = cleanObject({
        ...form,
        vendorId: user?.id,
        price: parseFloat(form.price),
        discountedPrice: form.discountedPrice ? parseFloat(form.discountedPrice) : null,
        quantity: `${form.quantityValue} ${form.quantityUnit}`.trim(),
        availability: {
            startTime: form.startTime,
            endTime: form.endTime,
            days: form.availableDays
        },
        // Denormalize store location for better searching
        lat: vendorStore?.lat,
        lng: vendorStore?.lng,
        mandal: vendorStore?.mandal,
        district: vendorStore?.district,
        state: vendorStore?.state,
        country: vendorStore?.country,
        storeName: vendorStore?.name,
        storeType: vendorStore?.storeType || 'product',
        hasVariants: form.hasVariants,
        variants: form.variants
      });

      if (id) {
        await updateDoc(doc(db, 'products', id), productData);
        toast.success(`${entityName} updated`, { id: toastId });
      } else {
        const docRef = await addDoc(collection(db, 'products'), productData);
        toast.success(`${entityName} added`, { id: toastId });
      }
      navigate('/vendor/products');
    } catch (error) {
      toast.error('Save failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

    if (initialLoading || !minLoadingTimePassed) {
        return (
           <div className="min-h-screen bg-[#202020] flex items-center justify-center">
              <div className="flex flex-col items-center gap-6">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] animate-pulse">BellBasket</h2>
                  <div className="h-0.5 w-12 bg-primary/30 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="h-full w-full bg-primary"
                    />
                  </div>
                </div>
              </div>
           </div>
        );
    }

  return (
    <div className="min-h-screen bg-[#202020] pb-32">
      <Header />
      
      <main className="max-w-xl mx-auto px-4 pt-24 space-y-8">
        <div className="flex items-center gap-4">
           <button 
                type="button"
                onClick={() => {
                    const isChanged = JSON.stringify(form) !== JSON.stringify(initialFormState);
                    if (isChanged) {
                        setShowDiscardModal(true);
                    } else {
                        navigate('/vendor/products');
                    }
                }} 
                className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center text-foreground hover:bg-secondary transition-all active:scale-90"
            >
              <ArrowLeft className="w-6 h-6" />
           </button>
           <div>
              <h1 className="text-xl font-black text-foreground uppercase tracking-tight">
                 {id ? 'Edit Listing' : `New ${entityName}`}
              </h1>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Storefront Inventory Management</p>
           </div>
        </div>

        <form onSubmit={handleSave} className="space-y-10">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Images</label>
              <button 
                  type="button" 
                  onClick={() => setShowImage2Field(!showImage2Field)}
                  className="text-[9px] font-bold text-primary hover:underline uppercase tracking-wider"
              >
                  {showImage2Field ? '- Remove Extra View' : '+ Add Extra View'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest ml-1">Main View</p>
                  <div className="relative group overflow-hidden rounded-[2.5rem] bg-secondary/30 aspect-square border-2 border-dashed border-border/50 flex items-center justify-center">
                      {form.image ? (
                          <>
                              <img src={form.image} alt="Primary" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 px-4">
                                      <button type="button" onClick={() => { setImageTarget('image'); fileInputRef.current?.click(); }} className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center"><Upload className="w-4 h-4" /></button>
                                      <button type="button" onClick={() => { setImageTarget('image'); startCamera(); }} className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center"><Camera className="w-4 h-4" /></button>
                              </div>
                          </>
                      ) : (
                          <div className="flex flex-col items-center gap-3">
                              <div className="flex gap-2">
                                  <button type="button" onClick={() => { setImageTarget('image'); fileInputRef.current?.click(); }} className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center"><Upload className="w-5 h-5" /></button>
                                  <button type="button" onClick={() => { setImageTarget('image'); startCamera(); }} className="w-12 h-12 rounded-2xl bg-white text-primary flex items-center justify-center ring-1 ring-border"><Camera className="w-5 h-5" /></button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              {(showImage2Field || form.image2) && (
                   <div className="space-y-2">
                      <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest ml-1">Extra View</p>
                      <div className="relative group overflow-hidden rounded-[2.5rem] bg-secondary/30 aspect-square border-2 border-dashed border-border/50 flex items-center justify-center">
                          {form.image2 ? (
                              <>
                                  <img src={form.image2} alt="Secondary" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 px-4">
                                      <button type="button" onClick={() => { setImageTarget('image2'); fileInputRef.current?.click(); }} className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center shadow-xl"><Upload className="w-4 h-4" /></button>
                                      <button type="button" onClick={() => { setImageTarget('image2'); startCamera(); }} className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center shadow-xl"><Camera className="w-4 h-4" /></button>
                                      <button type="button" onClick={() => setForm(f => ({ ...f, image2: '' }))} className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xl"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                              </>
                          ) : (
                              <div className="flex flex-col items-center gap-3">
                                  <div className="flex gap-2">
                                      <button type="button" onClick={() => { setImageTarget('image2'); fileInputRef.current?.click(); }} className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl"><Upload className="w-5 h-5" /></button>
                                      <button type="button" onClick={() => { setImageTarget('image2'); startCamera(); }} className="w-12 h-12 rounded-2xl bg-white text-primary flex items-center justify-center shadow-xl ring-1 ring-border"><Camera className="w-5 h-5" /></button>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Core Information</label>
              <input 
                type="text" 
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Item Name (e.g. Fresh Tomatoes)"
                className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Base Price</label>
                  <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-foreground/40">₹</span>
                      <input 
                          type="number" 
                          value={form.price}
                          onChange={e => setForm({ ...form, price: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-9 pr-4 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground"
                      />
                  </div>
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Sale Price</label>
                  <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-primary">₹</span>
                      <input 
                          type="number" 
                          value={form.discountedPrice}
                          onChange={e => setForm({ ...form, discountedPrice: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-9 pr-4 py-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border-2 border-primary/20 text-sm font-bold text-foreground"
                      />
                  </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Shelf Category</label>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground text-left hover:bg-secondary transition-all flex items-center justify-between"
              >
                <span className={form.category ? 'text-foreground' : 'text-muted-foreground/30'}>
                    {form.category || 'Select or create category...'}
                </span>
                <ChevronDown className="w-4 h-4 text-primary" />
              </button>
            </div>

            {!isServiceStore && (
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Quantity/Weight</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={form.quantityValue}
                        onChange={e => setForm({ ...form, quantityValue: e.target.value })}
                        placeholder="Value (e.g. 500)"
                        className="flex-1 px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUnitModal(true)}
                        className="px-6 rounded-2xl bg-secondary/50 border-0 text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:bg-secondary transition-all"
                      >
                        {form.quantityUnit || 'Unit'}
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                </div>
            )}

            {isServiceStore && (
              <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Start Time</label>
                        <input 
                            type="time" 
                            value={form.startTime}
                            onChange={e => setForm({ ...form, startTime: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">End Time</label>
                        <input 
                            type="time" 
                            value={form.endTime}
                            onChange={e => setForm({ ...form, endTime: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Availability</label>
                   <div className="flex flex-wrap gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                          const isActive = form.availableDays.includes(idx);
                          return (
                              <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                      const newDays = isActive 
                                          ? form.availableDays.filter(d => d !== idx)
                                          : [...form.availableDays, idx];
                                      setForm({ ...form, availableDays: newDays });
                                  }}
                                  className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all ${isActive ? 'bg-primary text-white shadow-lg' : 'bg-secondary/50 text-muted-foreground'}`}
                              >
                                  {day[0]}
                              </button>
                          );
                      })}
                   </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Additional description</label>
              <textarea 
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Share more about this listing..."
                rows={4}
                className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all resize-none"
              />
            </div>

            {/* Variants Section */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Multi-Price Options</label>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight ml-1">Add multiple quantities & prices</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setForm(f => ({ ...f, hasVariants: !f.hasVariants, variants: !f.hasVariants && f.variants.length === 0 ? [{ id: Date.now().toString(), quantity: `${f.quantityValue} ${f.quantityUnit}`.trim(), price: Number(f.price), discountedPrice: Number(f.discountedPrice) || undefined }] : f.variants }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${form.hasVariants ? 'bg-primary' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.hasVariants ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {form.hasVariants && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  {form.variants.map((v, i) => (
                    <div key={v.id} className="glass rounded-3xl p-4 space-y-3 border border-white/5 relative">
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <label className="text-[8px] font-black uppercase text-zinc-500 ml-1">Quantity/Size</label>
                          <input 
                            type="text" 
                            value={v.quantity}
                            onChange={e => {
                              const newVariants = [...form.variants];
                              newVariants[i].quantity = e.target.value;
                              setForm({ ...form, variants: newVariants });
                            }}
                            placeholder="e.g. 500g"
                            className="w-full px-4 py-3 rounded-xl bg-secondary/30 border-0 text-xs font-bold text-foreground"
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <label className="text-[8px] font-black uppercase text-zinc-500 ml-1">Price</label>
                          <input 
                            type="number" 
                            value={v.price || ''}
                            onChange={e => {
                              const val = e.target.value;
                              const newVariants = [...form.variants];
                              newVariants[i].price = val === '' ? 0 : Number(val);
                              setForm({ ...form, variants: newVariants });
                            }}
                            className="w-full px-4 py-3 rounded-xl bg-secondary/30 border-0 text-xs font-black text-foreground"
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <label className="text-[8px] font-black uppercase text-zinc-500 ml-1">Sale</label>
                          <input 
                            type="number" 
                            value={v.discountedPrice || ''}
                            onChange={e => {
                              const val = e.target.value;
                              const newVariants = [...form.variants];
                              newVariants[i].discountedPrice = val === '' ? undefined : Number(val);
                              setForm({ ...form, variants: newVariants });
                            }}
                            className="w-full px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-xs font-black text-foreground"
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setForm(f => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }))}
                          className="mt-6 w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => setForm(f => ({ ...f, variants: [...f.variants, { id: Date.now().toString(), quantity: '', price: 0 }] }))}
                    className="w-full py-4 rounded-2xl bg-secondary/30 border border-dashed border-border/50 text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-center gap-2 hover:bg-secondary/50 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Price Variant
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6">
              <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-lg hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
              >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (id ? 'Confirm Changes' : 'Launch Listing')}
              </button>
          </div>
        </form>

        <input type="file" ref={fileInputRef} onChange={e => { const file = e.target.files?.[0]; if (file) processImageFile(file, imageTarget); }} accept="image/*" className="hidden" />

        <AnimatePresence>
          {showCamera && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black flex flex-col">
                  <div className="flex-1 relative">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-12 flex items-center justify-center gap-10 px-8">
                          <button onClick={stopCamera} className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"><X className="w-7 h-7" /></button>
                          <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform"><div className="w-16 h-16 rounded-full border-4 border-black/5" /></button>
                          <button onClick={switchCamera} className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"><RotateCcw className="w-7 h-7" /></button>
                      </div>
                  </div>
              </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cropModal.show && (
              <CropModal src={cropModal.src} onCancel={() => setCropModal({ show: false, src: '', field: null })} onComplete={handleCropComplete} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showUnitModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-end justify-center">
                  <motion.div 
                    initial={{ y: "100%" }} 
                    animate={{ y: 0 }} 
                    exit={{ y: "100%" }}
                    transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
                    className="w-full max-w-xl bg-[#202020] rounded-t-[3rem] p-8 pb-12 space-y-6 shadow-2xl border-t border-white/10 will-change-transform"
                  >
                      <div className="flex items-center justify-between mb-2">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Measurement Unit</h3>
                          <button onClick={() => setShowUnitModal(false)} className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center"><X className="w-5 h-5 text-muted-foreground" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          {['kg', 'gm', 'ltr', 'ml', 'unit', 'pack', 'pair', 'pc', 'dz', 'set'].map(unit => (
                              <button key={unit} onClick={() => { setForm({ ...form, quantityUnit: unit }); setShowUnitModal(false); }} className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${form.quantityUnit === unit ? 'bg-primary text-white shadow-lg' : 'bg-secondary/40 text-foreground hover:bg-secondary'}`}>{unit}</button>
                          ))}
                      </div>
                  </motion.div>
              </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showCategoryModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-end justify-center">
                  <motion.div 
                    initial={{ y: "100%" }} 
                    animate={{ y: 0 }} 
                    exit={{ y: "100%" }}
                    transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
                    className="w-full max-w-xl bg-[#202020] rounded-t-[3rem] p-8 pb-12 space-y-8 shadow-2xl border-t border-white/10 will-change-transform"
                  >
                      <div className="flex items-center justify-between">
                          <div>
                              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Shelf Category</h3>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Select existing or create new</p>
                          </div>
                          <button onClick={() => setShowCategoryModal(false)} className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center"><X className="w-5 h-5 text-muted-foreground" /></button>
                      </div>

                      <div className="space-y-6">
                          <div className="relative">
                              <input 
                                  type="text" 
                                  value={newCat} 
                                  onChange={e => setNewCat(e.target.value)}
                                  placeholder="Type new category..."
                                  className="w-full px-6 py-5 rounded-2xl bg-secondary/40 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
                              />
                              {newCat.trim() && !categories.includes(newCat.trim()) && (
                                  <button 
                                      onClick={() => { setForm({ ...form, category: newCat.trim() }); setCategories(prev => [...prev, newCat.trim()].sort()); setNewCat(''); setShowCategoryModal(false); }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-6 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                  >
                                      Create
                                  </button>
                              )}
                          </div>

                          {categories.length > 0 && (
                              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                  <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] ml-2">Already Kept Shelves</p>
                                  <div className="grid grid-cols-1 gap-2">
                                      {categories.map(cat => (
                                          <button 
                                              key={cat} 
                                              onClick={() => { setForm({ ...form, category: cat }); setShowCategoryModal(false); }}
                                              className={`w-full text-left px-6 py-5 rounded-2xl text-xs font-extrabold transition-all border ${form.category === cat ? 'bg-primary/10 border-primary text-primary shadow-[inset_0_0_0_1px_rgba(255,94,0,0.2)]' : 'bg-secondary/20 border-transparent text-foreground/80 hover:bg-secondary/40'}`}
                                          >
                                              {cat}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </motion.div>
              </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showDiscardModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[3rem] p-10 space-y-8 text-center border border-border/50">
                <div className="w-20 h-20 rounded-[2rem] mx-auto flex items-center justify-center bg-amber-500/10 text-amber-500 shadow-inner">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black uppercase tracking-tight">Discard Progress?</h3>
                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.1em] leading-relaxed">
                    Unsaved changes in this {entityName.toLowerCase()} will be lost. Proceed to exit?
                  </p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setShowDiscardModal(false)} className="flex-1 py-4 rounded-2xl bg-secondary text-foreground text-[11px] font-black uppercase tracking-widest transition-all">Cancel</button>
                  <button onClick={() => navigate('/vendor/products')} className="flex-1 py-4 rounded-2xl bg-amber-500 text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">Confirm</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default VendorEditProduct;
