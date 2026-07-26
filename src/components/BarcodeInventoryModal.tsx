import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Barcode, Camera, X, Check, Package, Search, Loader2, Sparkles, AlertCircle, Plus, RotateCcw, RefreshCw } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { cleanObject } from '@/utils/firebase';

interface BarcodeInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  onProductAdded: () => void;
}

const SHELF_CATEGORIES = [
  'Grocery',
  'Fruits & Vegetables',
  'Dairy & Eggs',
  'Snacks & Munchies',
  'Beverages',
  'Bakery & Bread',
  'Personal Care',
  'Household Essentials',
  'Meat & Seafood',
  'Beauty',
  'Fashion',
  'Food',
  'Others'
];

export default function BarcodeInventoryModal({ isOpen, onClose, vendorId, onProductAdded }: BarcodeInventoryModalProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState(0);

  const [productData, setProductData] = useState<{
    name: string;
    image: string;
    quantity: string;
    price: number;
    barcode: string;
  } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (isOpen) {
      startScan(0);
    } else {
      stopScan();
      setProductData(null);
      setBarcodeInput('');
      setSelectedCategory('');
    }
  }, [isOpen]);

  const startScan = async (deviceIdx = 0) => {
    try {
      stopScan();
      setIsScanning(true);
      const codeReader = new BrowserMultiFormatReader();
      readerRef.current = codeReader;

      const devices = await codeReader.listVideoInputDevices();
      setVideoDevices(devices);

      if (devices.length === 0) {
        toast.error('No camera found on this device');
        setIsScanning(false);
        return;
      }

      // Default to back camera (environment) if available
      let targetIdx = deviceIdx;
      if (deviceIdx === 0 && devices.length > 1) {
        const backCamIdx = devices.findIndex(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('rear')
        );
        if (backCamIdx !== -1) targetIdx = backCamIdx;
      }

      setActiveDeviceIndex(targetIdx);
      const selectedDeviceId = devices[targetIdx]?.deviceId || devices[0].deviceId;

      codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result) => {
        if (result) {
          const code = result.getText();
          setBarcodeInput(code);
          stopScan();
          handleLookup(code);
        }
      });
    } catch (err) {
      console.error(err);
      toast.error('Camera access failed');
      setIsScanning(false);
    }
  };

  const switchCamera = () => {
    if (videoDevices.length <= 1) {
      toast.info('Only 1 camera available');
      return;
    }
    const nextIdx = (activeDeviceIndex + 1) % videoDevices.length;
    startScan(nextIdx);
    toast.info(`Switched to camera ${nextIdx + 1}`);
  };

  const stopScan = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleLookup = async (codeToLookup?: string) => {
    const code = (codeToLookup || barcodeInput).trim();
    if (!code) {
      toast.error('Please scan or enter a barcode number');
      return;
    }

    setLoading(true);
    try {
      // 1. Check existing products in Firestore
      const q = query(collection(db, 'products'), where('barcode', '==', code));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const p = snap.docs[0].data();
        setProductData({
          name: p.name || '',
          image: p.image || '',
          quantity: p.quantity || '1 unit',
          price: p.price || 50,
          barcode: code
        });
        if (p.category) setSelectedCategory(p.category);
        toast.success('🎉 Product details loaded!');
        setLoading(false);
        return;
      }

      // 2. Fetch from Open Food Facts API
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const prod = data.product;
          const name = prod.product_name_en || prod.product_name || prod.abbreviated_product_name || 'Scanned Product';
          const image = prod.image_front_url || prod.image_url || prod.image_front_small_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400';
          const quantity = prod.quantity || (prod.net_weight_value ? `${prod.net_weight_value}${prod.net_weight_unit || 'g'}` : '1 unit');

          setProductData({
            name,
            image,
            quantity,
            price: 50,
            barcode: code
          });
          toast.success('🎉 Product details auto-fetched!');
          setLoading(false);
          return;
        }
      }

      // Fallback
      setProductData({
        name: `Scanned Item (${code.slice(-4)})`,
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
        quantity: '1 unit',
        price: 50,
        barcode: code
      });
      toast.info('Barcode recognized! Verify details & choose shelf category.');
    } catch (e) {
      console.error(e);
      toast.error('Product lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToInventory = async () => {
    if (!productData) return;
    if (!selectedCategory) {
      toast.error('Please select a Shelf Category before adding!');
      return;
    }

    setIsAdding(true);
    try {
      const newProductDoc = cleanObject({
        name: productData.name,
        image: productData.image,
        quantity: productData.quantity,
        price: Number(productData.price) || 0,
        category: selectedCategory,
        barcode: productData.barcode,
        vendorId,
        inStock: true,
        description: `${productData.name} (${productData.quantity})`,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'products'), newProductDoc);
      toast.success(`🎉 ${productData.name} added to ${selectedCategory} shelf!`);
      onProductAdded();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add product to inventory');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card dark:bg-[#1A1A1A] w-full max-w-lg rounded-[2.5rem] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-border/50"
        >
          {/* Header */}
          <div className="h-[70px] px-6 flex items-center justify-between bg-secondary/20 border-b border-border/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-foreground uppercase tracking-tight">Barcode Quick Inventory</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Auto-Detect & Add to Shelf</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {!productData ? (
              <div className="space-y-4">
                {/* Camera Scanner Box */}
                <div className="relative rounded-3xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-primary/40 shadow-inner">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  
                  {/* Camera Scanning Line Animation */}
                  {isScanning && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                      <div className="w-full h-0.5 bg-primary/80 shadow-[0_0_15px_#22c55e] animate-pulse" />
                      <p className="text-[10px] font-black text-white bg-black/50 px-3 py-1 rounded-full w-fit mx-auto uppercase tracking-widest backdrop-blur-sm">
                        Point Camera at Barcode
                      </p>
                    </div>
                  )}

                  {/* Camera Rotate / Flip Control Button */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {videoDevices.length > 1 && (
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="p-2.5 rounded-xl bg-black/60 text-white backdrop-blur-md border border-white/20 hover:bg-black/80 transition-all flex items-center gap-1.5 text-xs font-bold"
                        title="Rotate / Flip Camera"
                      >
                        <RotateCcw className="w-4 h-4 text-primary" />
                        <span className="text-[10px] uppercase tracking-wider font-mono">Rotate</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Manual Barcode Input & Lookup */}
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Enter or paste Barcode (e.g. 8901030300000)"
                      value={barcodeInput}
                      onChange={(e) => {
                        setBarcodeInput(e.target.value);
                        if (e.target.value.trim().length >= 8) {
                          handleLookup(e.target.value.trim());
                        }
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                      className="w-full px-4 py-3.5 rounded-2xl bg-secondary/50 border border-border/40 text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <Barcode className="absolute right-4 top-3.5 w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <button
                    onClick={() => handleLookup()}
                    disabled={loading}
                    className="px-5 py-3.5 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Lookup
                  </button>
                </div>
              </div>
            ) : (
              /* Auto-Filled Details & Shelf Category Selection */
              <div className="space-y-5 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-emerald-500" /> Barcode Auto-Detected
                  </div>
                  <button
                    onClick={() => { setProductData(null); startScan(activeDeviceIndex); }}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Rescan Barcode
                  </button>
                </div>

                {/* Auto-Filled Product Preview Card */}
                <div className="p-4 rounded-3xl bg-secondary/20 border border-border/40 flex gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-[#202020] border overflow-hidden shrink-0 flex items-center justify-center p-1">
                    {productData.image ? (
                      <img src={productData.image} alt={productData.name} className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground opacity-40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Product Name</label>
                      <input
                        type="text"
                        value={productData.name}
                        onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                        className="w-full text-xs font-bold text-foreground bg-transparent border-b border-border/50 focus:border-primary focus:outline-none py-0.5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Quantity / Weight</label>
                        <input
                          type="text"
                          value={productData.quantity}
                          onChange={(e) => setProductData({ ...productData, quantity: e.target.value })}
                          className="w-full text-xs font-mono font-bold text-foreground bg-transparent border-b border-border/50 focus:border-primary focus:outline-none py-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Price (₹)</label>
                        <input
                          type="number"
                          value={productData.price}
                          onChange={(e) => setProductData({ ...productData, price: Number(e.target.value) })}
                          className="w-full text-xs font-mono font-bold text-primary bg-transparent border-b border-border/50 focus:border-primary focus:outline-none py-0.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mandatory Shelf Category Selector */}
                <div className="space-y-2.5 p-4 rounded-3xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-primary" /> Select Shelf Category <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Required</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SHELF_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`p-2.5 rounded-xl text-[11px] font-bold text-left transition-all border ${
                          selectedCategory === cat
                            ? 'bg-primary text-primary-foreground border-primary shadow-md font-black scale-[1.02]'
                            : 'bg-card dark:bg-[#202020] text-muted-foreground border-border/40 hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          {productData && (
            <div className="p-4 bg-secondary/20 border-t border-border/10 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => { setProductData(null); startScan(activeDeviceIndex); }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Back to Scan
              </button>
              <button
                onClick={handleAddToInventory}
                disabled={!selectedCategory || isAdding}
                className="px-6 py-3 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-40"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to Inventory
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
