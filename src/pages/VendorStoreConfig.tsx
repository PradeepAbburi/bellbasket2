import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Settings, 
  Clock, 
  Phone, 
  Package, 
  Store as StoreIcon, 
  Search, 
  Image as ImageIcon, 
  Upload, 
  Camera, 
  X, 
  MapPin, 
  Navigation, 
  Save, 
  Lock,
  ArrowRight,
  XCircle,
  Building,
  LandPlot,
  Globe
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import Header from '@/components/Header';
import MapView from '@/components/MapView';
import { CATEGORY_METADATA } from '@/constants/categories';
import { generateSlug } from '@/utils/seo';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { Helmet } from 'react-helmet';

const VendorStoreConfig = () => {
  const { user, loading, stores, updateUser, refreshData } = useApp();
  const navigate = useNavigate();
  const [vendorStore, setVendorStore] = useState<any>(null);
  
  // Settings State
  const [tempTimings, setTempTimings] = useState({ open: '09:00', close: '22:00' });
  const [tempPhone, setTempPhone] = useState('');
  const [tempOffersDelivery, setTempOffersDelivery] = useState(false);
  const [tempDeliveryFee, setTempDeliveryFee] = useState(50);
  const [tempBanner, setTempBanner] = useState('');
  const [tempAutoClose, setTempAutoClose] = useState(false);
  const [tempStoreType, setTempStoreType] = useState<'product' | 'service'>('product');
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const storeFileInputRef = useRef<HTMLInputElement>(null);

  const [tempLat, setTempLat] = useState<number>(28.6139);
  const [tempLng, setTempLng] = useState<number>(77.2090);
  const [tempAddress, setTempAddress] = useState('');
  const [tempName, setTempName] = useState('');
  const [tempCategory, setTempCategory] = useState('');

  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (!loading && user) {
      if (user.role !== 'vendor') {
        navigate('/auth');
      } else if (!user.hasSetupStore) {
        navigate('/vendor/setup');
      }
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || stores.length === 0) return;
    const store = stores.find(s => s.vendorId === user.id || s.id === user.id);
    if (store) {
      setVendorStore(store);
      if (store.timings) setTempTimings(store.timings);
      if (store.phone !== undefined) setTempPhone(store.phone);
      if (store.offersDelivery !== undefined) setTempOffersDelivery(store.offersDelivery);
      if (store.deliveryFee !== undefined) setTempDeliveryFee(store.deliveryFee);
      if (store.image) setTempBanner(store.image);
      if (store.lat) setTempLat(store.lat);
      if (store.lng) setTempLng(store.lng);
      if (store.address) setTempAddress(store.address);
      if (store.storeType) setTempStoreType(store.storeType);
      if (store.autoClose !== undefined) setTempAutoClose(store.autoClose);
      if (store.name) setTempName(store.name);
      if (store.category) setTempCategory(store.category);
    }
  }, [user, stores]);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) {
        toast.error("Image too large. Please select an image under 700KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempBanner(reader.result as string);
        toast.success("New banner preview loaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocationSearch = (val: string) => {
    setLocationSearch(val);
    if (val.length < 2) {
      setLocationResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&lat=${tempLat}&lon=${tempLng}&limit=12`;
        const res = await fetch(photonUrl);
        const data = await res.json();

        const results = data.features.map((f: any) => {
          const p = f.properties;
          const dist = Math.sqrt(Math.pow(f.geometry.coordinates[1] - tempLat, 2) + Math.pow(f.geometry.coordinates[0] - tempLng, 2)) * 111.32;

          let namePart = p.name || p.street || p.district || p.city || '';
          const context = p.district || p.city || p.locality || '';
          if (context && namePart !== context && !namePart.includes(context)) {
            namePart = `${namePart}, ${context}`;
          }

          const addressParts = [];
          if (p.street) addressParts.push(p.street);
          if (p.district) addressParts.push(p.district);
          if (p.city) addressParts.push(p.city);
          if (p.state) addressParts.push(p.state);

          const fullName = [p.name, ...addressParts.filter(part => part !== p.name)].filter(Boolean).join(', ');

          return {
            place_id: f.properties.osm_id || Math.random(),
            display_name: fullName,
            short_name: namePart,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            distanceKm: dist,
            type: p.osm_value || p.type || 'place'
          };
        });

        setLocationResults(results);
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectLocation = (res: any) => {
    setTempLat(res.lat);
    setTempLng(res.lon);
    setTempAddress(res.display_name);
    setLocationSearch('');
    setLocationResults([]);
    toast.success('Location updated!');
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setTempLat(lat);
        setTempLng(lng);
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            setTempAddress(data.display_name);
            toast.success('Location detected!');
          })
          .catch(() => {
            setTempAddress('Detected Location');
          });
        setDetecting(false);
      },
      () => {
        setDetecting(false);
        toast.error('Could not detect location');
      }
    );
  };

  const saveSettings = async () => {
    if (!user?.id) return;
    const loadingToast = toast.loading('Saving configuration...');
    try {
      const area = tempAddress ? tempAddress.split(',')[0] : '';
      const slug = generateSlug(tempName || vendorStore?.name || 'store', area);

      await updateDoc(doc(db, 'stores', user.id), {
        timings: tempTimings,
        phone: tempPhone,
        offersDelivery: tempOffersDelivery,
        deliveryFee: tempDeliveryFee,
        image: tempBanner,
        lat: tempLat,
        lng: tempLng,
        address: tempAddress,
        storeType: tempStoreType,
        autoClose: tempAutoClose,
        name: tempName,
        category: tempCategory,
        slug
      });

      await updateUser({
        storeBanner: tempBanner,
        lat: tempLat,
        lng: tempLng,
        address: tempAddress
      });

      toast.dismiss(loadingToast);
      toast.success('Store configured successfully!');
      refreshData();
      navigate('/vendor');
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to save settings');
    }
  };

  const handleDeleteStore = async () => {
    if (deleteConfirmText !== 'DELETE MY STORE') return;
    setIsDeleting(true);
    const loadingToast = toast.loading('Deleting store...');
    try {
      await deleteDoc(doc(db, 'stores', user!.id));
      await updateDoc(doc(db, 'users', user!.id), { hasSetupStore: false });
      toast.dismiss(loadingToast);
      toast.success('Store deleted');
      window.location.href = '/vendor/setup';
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error('Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const startCamera = () => {
    if ((window as any).startStoreCamera) {
      (window as any).startStoreCamera();
    }
  };
  if (loading || !vendorStore) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground">
      <Helmet>
        <title>Store Configuration - BellBasket</title>
      </Helmet>
      <Header />
      
      <main className="pt-24 pb-32 px-4 max-w-5xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => navigate('/vendor')}
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 border border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Store Config</h1>
              <p className="text-xs text-white/40 font-bold uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
                <Settings className="w-3 h-3 text-primary" /> Management Console
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/vendor/editor')}
              className="hidden md:flex px-6 py-4 rounded-2xl bg-indigo-500/10 text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
            >
              Pro Editor
            </button>
            <button
              onClick={saveSettings}
              className="flex-1 md:flex-none px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-primary/20"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>

        {/* Hero Visual Branding */}
        <section className="relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
           <div className="relative bg-[#111111] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                       <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="text-lg font-black text-white">Visual Storefront</h3>
                       <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">Hero Banner & Branding</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => storeFileInputRef.current?.click()} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all"><Upload className="w-4 h-4" /></button>
                    <button onClick={startCamera} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all"><Camera className="w-4 h-4" /></button>
                 </div>
              </div>

              <div className="p-4 sm:p-8">
                 {tempBanner ? (
                    <div className="relative aspect-[21/9] sm:aspect-[3/1] rounded-[2rem] overflow-hidden border border-white/10 group shadow-2xl">
                       <img src={tempBanner} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Banner" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-center pb-8 gap-4">
                          <button onClick={() => setTempBanner('')} className="px-6 py-3 rounded-2xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95">
                             <XCircle className="w-4 h-4" /> Remove Banner
                          </button>
                       </div>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <button onClick={() => storeFileInputRef.current?.click()} className="h-64 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/[0.01] flex flex-col items-center justify-center gap-4 hover:bg-white/[0.03] hover:border-primary/50 transition-all group">
                         <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8" />
                         </div>
                         <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Upload High-Res Banner</p>
                      </button>
                      <button onClick={startCamera} className="h-64 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/[0.01] flex flex-col items-center justify-center gap-4 hover:bg-white/[0.03] hover:border-indigo-500/50 transition-all group">
                         <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                            <Camera className="w-8 h-8" />
                         </div>
                         <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Capture Storefront Live</p>
                      </button>
                    </div>
                 )}
                 <input type="file" ref={storeFileInputRef} className="hidden" accept="image/*" onChange={handleBannerUpload} />
              </div>
           </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Identity Section */}
          <div className="bg-[#111111] rounded-[2.5rem] p-8 border border-white/5 space-y-8 md:col-span-2 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-[0.02] -mr-8 -mt-8">
               <StoreIcon className="w-48 h-48 text-white rotate-12" />
             </div>
             
             <div className="flex items-center gap-3 relative">
               <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                 <StoreIcon className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-white">Identity</h3>
                 <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">Store Branding Details</p>
               </div>
             </div>

             <div className="grid md:grid-cols-2 gap-8 relative">
                <div className="space-y-4">
                   <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Official Store Name</label>
                      <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-md">Required</span>
                   </div>
                   <input
                     type="text"
                     value={tempName}
                     onChange={e => setTempName(e.target.value)}
                     className="w-full bg-white/[0.03] border border-white/10 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none transition-all placeholder:text-white/10"
                     placeholder="e.g. The Coffee House"
                   />
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Business Niche</label>
                   <button
                     onClick={() => setShowCategoryPopup(true)}
                     className="w-full flex items-center justify-between p-2 pl-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all group"
                   >
                     <div className="flex items-center gap-4 text-left">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110 bg-gradient-to-br ${CATEGORY_METADATA[tempCategory]?.gradient || 'from-neutral-700 to-neutral-800'}`}>
                         {(() => {
                           const Icon = CATEGORY_METADATA[tempCategory]?.icon || StoreIcon;
                           return <Icon className="w-6 h-6" />;
                         })()}
                       </div>
                       <div>
                         <p className="text-sm font-black text-white">{tempCategory}</p>
                         <p className="text-[9px] uppercase tracking-widest text-white/30">Tap to browse categories</p>
                       </div>
                     </div>
                     <div className="p-3">
                       <Search className="w-5 h-5 text-white/20 group-hover:text-primary transition-colors" />
                     </div>
                   </button>
                </div>
             </div>
          </div>

          {/* Core Operations (Combined Left) */}
          <div className="space-y-8">
            <div className="bg-[#111111] rounded-[2.5rem] p-8 border border-white/5 space-y-6 shadow-2xl">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                     <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Operational Hours</h3>
                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Active Schedule</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Opening Time</label>
                     <input type="time" value={tempTimings.open} onChange={e => setTempTimings(t => ({...t, open: e.target.value}))} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm font-black text-white focus:border-amber-500/50 outline-none transition-all" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Closing Time</label>
                     <input type="time" value={tempTimings.close} onChange={e => setTempTimings(t => ({...t, close: e.target.value}))} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm font-black text-white focus:border-amber-500/50 outline-none transition-all" />
                  </div>
               </div>

               <button 
                 onClick={() => setTempAutoClose(!tempAutoClose)}
                 className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all border ${tempAutoClose ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}
               >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tempAutoClose ? 'bg-amber-500 text-white' : 'bg-white/5 text-white/40'}`}>
                       <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                       <p className="text-xs font-black text-white uppercase tracking-tight">Smart Auto-Status</p>
                       <p className="text-[9px] text-white/30 uppercase tracking-widest">Toggle Auto Open/Close</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${tempAutoClose ? 'bg-amber-500' : 'bg-white/10'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${tempAutoClose ? 'left-7' : 'left-1'}`} />
                  </div>
               </button>
            </div>

            <div className="bg-[#111111] rounded-[2.5rem] p-8 border border-white/5 space-y-6 shadow-2xl">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                     <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Hotline</h3>
                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Public Contact</p>
                  </div>
               </div>
               
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Public Display Number</label>
                  <input
                    type="tel"
                    value={tempPhone}
                    onChange={e => setTempPhone(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-blue-500/50 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none transition-all placeholder:text-white/10"
                    placeholder="+91 XXXX XXX XXX"
                  />
               </div>
            </div>

            <div className="bg-[#111111] rounded-[2.5rem] p-8 border border-white/5 space-y-6 shadow-2xl">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                     <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Delivery Service</h3>
                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Logistics Control</p>
                  </div>
               </div>

               <button 
                 onClick={() => setTempOffersDelivery(!tempOffersDelivery)}
                 className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all border ${tempOffersDelivery ? 'bg-purple-500/10 border-purple-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}
               >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tempOffersDelivery ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40'}`}>
                       <Package className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                       <p className="text-xs font-black text-white uppercase tracking-tight">Home Delivery</p>
                       <p className="text-[9px] text-white/30 uppercase tracking-widest">{tempOffersDelivery ? 'Activated' : 'Disabled'}</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${tempOffersDelivery ? 'bg-purple-500' : 'bg-white/10'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${tempOffersDelivery ? 'left-7' : 'left-1'}`} />
                  </div>
               </button>

               <AnimatePresence>
                 {tempOffersDelivery && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="overflow-hidden space-y-3"
                   >
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Flat Delivery Fee (₹)</label>
                     <div className="relative">
                       <input
                         type="number"
                         value={tempDeliveryFee}
                         onChange={e => setTempDeliveryFee(Number(e.target.value))}
                         className="w-full bg-white/[0.03] border border-white/10 focus:border-purple-500/50 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none transition-all"
                         placeholder="50"
                       />
                       <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-white/20 uppercase tracking-widest">Rupees</span>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          </div>

          {/* Location Section (Right) */}
          <div className="bg-[#111111] rounded-[2.5rem] p-8 border border-white/5 space-y-8 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Store Location</h3>
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Geographical Point</p>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={e => handleLocationSearch(e.target.value)}
                      placeholder="Search for your business landmark..."
                      className="w-full pl-12 pr-14 py-5 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all placeholder:text-white/10"
                    />
                    <button onClick={detectLocation} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/5 border border-white/10 text-primary hover:bg-white/10 transition-all">
                      {detecting ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Navigation className="w-4 h-4" />}
                    </button>
                    
                    <AnimatePresence>
                      {locationResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 right-0 mt-4 z-[2000] bg-[#141414] border border-white/10 rounded-[2.5rem] p-3 shadow-2xl overflow-hidden overflow-y-auto max-h-80 backdrop-blur-2xl">
                          {locationResults.map(res => (
                            <button key={res.place_id} onClick={() => selectLocation(res)} className="w-full text-left p-4 hover:bg-white/5 rounded-2xl transition-all group flex items-start gap-4 border-b border-white/[0.03] last:border-0 mb-1">
                               <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                                  {res.type === 'building' || res.type === 'house' ? <Building className="w-5 h-5" /> : 
                                   res.type === 'park' || res.type === 'forest' ? <LandPlot className="w-5 h-5" /> :
                                   res.type === 'city' || res.type === 'town' ? <Globe className="w-5 h-5" /> :
                                   <MapPin className="w-5 h-5" />}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                     <p className="font-black text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">{res.short_name}</p>
                                     <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter whitespace-nowrap">{res.distanceKm.toFixed(1)} km</span>
                                  </div>
                                  <p className="text-[10px] text-white/40 line-clamp-2 mt-1 font-medium leading-relaxed">{res.display_name}</p>
                               </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </div>

                 <div className="h-[280px] rounded-[2rem] overflow-hidden border border-white/10 relative shadow-inner">
                    <MapView center={[tempLat, tempLng]} stores={[]} centerLabel="Shop Point" onMapClick={(lat, lng) => { setTempLat(lat); setTempLng(lng); }} />
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] pointer-events-none">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full scale-150 animate-pulse"></div>
                          <MapPin className="w-10 h-10 text-primary relative drop-shadow-2xl" strokeWidth={2.5} />
                        </div>
                     </div>
                  </div>
               </div>
           </div>

           {/* Infrastructure Zone */}
           <div className="bg-red-500/[0.02] rounded-[2.5rem] p-10 border border-red-500/10 md:col-span-2 mt-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                 <div className="space-y-3 text-center md:text-left">
                    <h3 className="text-xl font-black text-red-500 flex items-center justify-center md:justify-start gap-3 uppercase tracking-tighter italic">
                      <Lock className="w-5 h-5" /> Danger Zone
                    </h3>
                    <p className="text-sm text-white/40 font-bold">To permanently remove your store, type <span className="text-red-500/60 font-black">"DELETE MY STORE"</span> below.</p>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      className="flex-1 md:w-80 bg-red-500/5 border border-red-500/10 rounded-2xl px-6 py-5 text-sm font-black text-red-500 placeholder:text-red-500/20 outline-none focus:ring-4 focus:ring-red-500/5 transition-all"
                      placeholder="Confirmation phrase..."
                    />
                     <button
                       onClick={handleDeleteStore}
                       disabled={deleteConfirmText !== 'DELETE MY STORE' || isDeleting}
                       className="px-10 py-5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] disabled:opacity-20 active:scale-95 transition-all hover:bg-red-600 hover:text-white shadow-xl"
                     >
                       Confirm Delete
                     </button>
                  </div>
               </div>
            </div>
        </div>
      </main>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryPopup && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                onClick={() => { setShowCategoryPopup(false); setCatSearch(''); }}
            >
                <style>{`#bottom-nav { display: none !important; } body { overflow: hidden !important; }`}</style>
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#1A1A1A] rounded-[2.5rem] w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/10"
                >
                    <div className="p-8 border-b border-white/5 shrink-0 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-foreground tracking-tight">Select Category</h3>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Search all industry types</p>
                            </div>
                            <button
                                onClick={() => { setShowCategoryPopup(false); setCatSearch(''); }}
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search categories..."
                                value={catSearch}
                                onChange={(e) => setCatSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-transparent focus:border-primary/30 outline-none font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-8">
                            {Object.keys(CATEGORY_METADATA)
                                .filter(cat => 
                                    (cat.toLowerCase().includes(catSearch.toLowerCase()) || catSearch === '')
                                )
                                .map(catName => {
                                    const metadata = CATEGORY_METADATA[catName];
                                    const Icon = metadata?.icon || StoreIcon;
                                    const isSelected = tempCategory === catName;
                                    
                                    return (
                                        <button
                                            key={catName}
                                            type="button"
                                            onClick={() => {
                                                setTempCategory(catName);
                                                setShowCategoryPopup(false);
                                                setCatSearch('');
                                            }}
                                            className={`flex flex-col items-center gap-3 p-5 rounded-3xl transition-all relative overflow-hidden group ${isSelected ? 'bg-indigo-600 text-white shadow-sm scale-105 ring-2 ring-indigo-400' : 'bg-white/5 hover:bg-white/10'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-white/20' : `bg-gradient-to-br ${metadata?.gradient || 'from-gray-400 to-gray-500'} text-white`}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className={`text-[11px] font-black uppercase tracking-tight text-center line-clamp-1`}>
                                                {catName}
                                            </span>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <StoreCameraModal onCapture={setTempBanner} />
    </div>
  );
};

const StoreCameraModal = ({ onCapture }: { onCapture: (base64: string) => void }) => {
    const [show, setShow] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
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
            setShow(true);
            setFacingMode(mode);
        } catch (err: any) {
            console.error("Camera access failed:", err);
            toast.error("Could not access camera.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShow(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && videoRef.current.videoWidth > 0) {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);

            const MAX_SIZE = 800;
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

            const base64 = outputCanvas.toDataURL('image/jpeg', 0.6);
            onCapture(base64);
            stopCamera();
            toast.success("Storefront snap captured!");
        }
    };

    useEffect(() => {
        (window as any).startStoreCamera = () => startCamera();
        return () => { delete (window as any).startStoreCamera; };
    }, [facingMode]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1001] flex items-center justify-center bg-black backdrop-blur-md p-4"
                >
                    <style>{`#bottom-nav { display: none !important; } body { overflow: hidden !important; }`}</style>
                    <div className="w-full max-w-lg aspect-[3/4] bg-neutral-900 rounded-[40px] overflow-hidden relative shadow-2xl border-4 border-white/10">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        <div className="absolute inset-0 flex flex-col justify-between p-8">
                            <div className="flex justify-between items-start">
                                <button
                                    onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')}
                                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/05"
                                >
                                    <Camera className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={stopCamera}
                                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/05"
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
                                    Snap Banner
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default VendorStoreConfig;
