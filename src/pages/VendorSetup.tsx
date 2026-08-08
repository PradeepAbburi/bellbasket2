import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Loader2, Navigation, CheckCircle2, ArrowRight, Store, Upload, Camera, X, Ticket, Building, LandPlot, Globe } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from 'react-i18next';
import { lazy, Suspense } from 'react';
const MapView = lazy(() => import('@/components/MapView'));
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { generateSlug, triggerAutoSitemapUpdate } from '@/utils/seo';
import { CATEGORY_METADATA } from '@/constants/categories';
import PageLoading from '@/components/PageLoading';

const PRODUCT_CATEGORIES = Object.keys(CATEGORY_METADATA).filter(
    cat => CATEGORY_METADATA[cat].type === 'product'
);

const SERVICE_CATEGORIES = Object.keys(CATEGORY_METADATA).filter(
    cat => CATEGORY_METADATA[cat].type === 'service'
);

const VendorSetup = () => {
    const { t } = useTranslation();
    const { user, loading, login, refreshStores } = useApp();
    console.log("VendorSetup: Render", { loading, hasUser: !!user, role: user?.role });
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Store details state
    const [storeName, setStoreName] = useState('');
    const [category, setCategory] = useState('');
    const [storeType, setStoreType] = useState<'product' | 'service'>('product');
    const [defaultsLoaded, setDefaultsLoaded] = useState(false);
    const [gstin, setGstin] = useState('');
    const [imageURL, setImageURL] = useState('');
    const [phone, setPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [referralCode, setReferralCode] = useState('');
    
    // UI states
    const [showCamera, setShowCamera] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [uploading, setUploading] = useState(false);

    // Location state
    const [storeLat, setStoreLat] = useState<number>(28.6139);
    const [storeLng, setStoreLng] = useState<number>(77.2090);
    const [storeAddress, setStoreAddress] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [locationResults, setLocationResults] = useState<any[]>([]);
    const [detecting, setDetecting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mandal, setMandal] = useState('');
    const [district, setDistrict] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');

    // UI states
    const [showCategoryPopup, setShowCategoryPopup] = useState(false);
    const [catSearch, setCatSearch] = useState('');

    // Update store details when user data loads - only ONCE
    useEffect(() => {
        if (user && !defaultsLoaded) {
            if (!storeName && user.name) setStoreName(`${user.name}'s Store`);
            if (!phone && user.phone) setPhone(user.phone);
            if (!referralCode && user.referralCode) setReferralCode(user.referralCode);
            
            // Set initial category based on first available for product
            if (!category) setCategory(PRODUCT_CATEGORIES[0]);
            
            setDefaultsLoaded(true);
        }
    }, [user, defaultsLoaded, storeName, phone, referralCode, category]);

    // Handle Category change when Store Type changes
    useEffect(() => {
        if (storeType === 'product') {
            if (!PRODUCT_CATEGORIES.includes(category)) {
                setCategory(PRODUCT_CATEGORIES[0]);
            }
        } else {
            if (!SERVICE_CATEGORIES.includes(category)) {
                setCategory(SERVICE_CATEGORIES[0]);
            }
        }
    }, [storeType]);

    // Redirect if not a vendor
    useEffect(() => {
        if (!loading) {
            console.log("VendorSetup: Auth check", { user: !!user, role: user?.role });
            if (!user || user.role !== 'vendor') {
                console.log("VendorSetup: Not a vendor, redirecting to /auth");
                navigate('/auth');
            }
        }
    }, [user, loading, navigate]);

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
            console.error("Camera access failed:", err);
            toast.error("Could not access camera. Please check permissions.");
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

            // Resize for Firestore optimization (under 700KB)
            const MAX_SIZE = 1200;
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

            const base64 = outputCanvas.toDataURL('image/jpeg', 0.95);
            setImageURL(base64);
            stopCamera();
            toast.success("Storefront photo captured!");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 700 * 1024) {
                toast.error("Image too large. Please select an image under 700KB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageURL(reader.result as string);
                toast.success("Storefront image uploaded!");
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        if (showCamera && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(console.error);
        }
    }, [showCamera]);

    if (loading) {
        return <PageLoading />;
    }

    const [searching, setSearching] = useState(false);
    const searchTimeout = useRef<any>(null);

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
                const query = val.toUpperCase() === 'HYD' ? 'Hyderabad, India' : val;
                const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${storeLat}&lon=${storeLng}&limit=12`;
                const res = await fetch(photonUrl);
                const data = await res.json();

                const results = data.features
                    .filter((f: any) => {
                        const country = f.properties.countrycode?.toUpperCase();
                        return country !== 'BD' && country !== 'PK';
                    })
                    .map((f: any) => {
                        const p = f.properties;

                    // Simple distance calc for sorting/display
                    const dist = Math.sqrt(Math.pow(f.geometry.coordinates[1] - storeLat, 2) + Math.pow(f.geometry.coordinates[0] - storeLng, 2)) * 111.32; // Approx km

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
                        type: p.osm_value || p.type || 'place',
                        mandal: p.suburb || p.locality || (p.osm_value === 'suburb' ? p.name : ''),
                        district: p.district || p.city || (p.osm_value === 'city' ? p.name : ''),
                        state: p.state || (p.osm_value === 'state' ? p.name : ''),
                        country: p.country || (p.osm_value === 'country' ? p.name : '')
                    };
                });

                // Sort by distance if they are reasonably close
                const sorted = results.sort((a, b) => {
                    if (a.distanceKm < 5 && b.distanceKm > 5) return -1;
                    if (b.distanceKm < 5 && a.distanceKm > 5) return 1;
                    return 0;
                });

                setLocationResults(sorted);
            } catch (e) {
                console.error('Search failed', e);
                // Fallback to nominatim
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=in&limit=6&addressdetails=1`);
                    const data = await res.json();
                    setLocationResults(data.map((r: any) => ({ ...r, short_name: r.display_name.split(',')[0] })));
                } catch (fallbackErr) {
                    console.error('Fallback search failed', fallbackErr);
                }
            } finally {
                setSearching(false);
            }
        }, 400);
    };

    const selectLocation = (res: any) => {
        const lat = typeof res.lat === 'string' ? parseFloat(res.lat) : res.lat;
        const lng = typeof res.lon === 'string' ? parseFloat(res.lon) : res.lon;
        const shortName = res.short_name || res.display_name.split(',')[0];

        setStoreLat(lat);
        setStoreLng(lng);
        setStoreAddress(res.display_name);
        setMandal(res.mandal || '');
        setDistrict(res.district || '');
        setState(res.state || '');
        setCountry(res.country || '');
        setLocationSearch('');
        setLocationResults([]);
        toast.success('Location set to ' + shortName);
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
                setStoreLat(lat);
                setStoreLng(lng);
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then(res => res.json())
                    .then(data => {
                        setStoreAddress(data.display_name);
                        setMandal(data.address?.suburb || data.address?.locality || data.address?.city_district || '');
                        setDistrict(data.address?.district || data.address?.city || '');
                        setState(data.address?.state || '');
                        setCountry(data.address?.country || '');
                        toast.success('Location detected!');
                    })
                    .catch(() => {
                        setStoreAddress('Detected Location');
                    });
                setDetecting(false);
            },
            () => {
                setDetecting(false);
                toast.error('Could not detect location');
            },
            { 
                enableHighAccuracy: true,
                timeout: 15000, 
                maximumAge: 0 
            }
        );
    };

    const handleSave = async () => {
        if (!storeAddress || !user) {
            toast.error('Please select your store location');
            return;
        }
        if (!storeName) {
            toast.error('Please enter store name');
            return;
        }
        if (!phone) {
            toast.error('Please enter phone number');
            return;
        }
        setSaving(true);
        try {
            console.log("Launching store for user:", user.id);

            const oneMonthFromNow = new Date();
            oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
            const initialPlan = (user.plan && user.plan !== 'none') ? user.plan : 'pro';
            const initialExpiry = user.subscriptionExpiry || oneMonthFromNow.toISOString();

            // 1. Update user in Firestore first (this ensures profile has lat/lng and setup flag)
            try {
                await setDoc(doc(db, 'users', user.id), {
                    lng: storeLng,
                    phone: phone,
                    hasSetupStore: true,
                    plan: initialPlan,
                    subscriptionExpiry: initialExpiry,
                    mandal,
                    district,
                    state,
                    country,
                    ...(referralCode && !user.referralCode ? { referralCode: referralCode.toUpperCase().trim() } : {})
                }, { merge: true });
                console.log("User document verified and updated");
            } catch (err: any) {
                console.error("User update failed:", err);
                if (err.code === 'permission-denied') {
                    throw new Error("Profile Update Blocked: Check your Firestore Security Rules for the 'users' collection.");
                }
                throw err;
            }

            // 1.5 Give Firestore rules a moment to propagate the user state change
            console.log("Waiting for propagation...");
            await new Promise(resolve => setTimeout(resolve, 800));

            // 2. Create the store document
            try {
                // Minimal data to pass standard rules, let ID be inferred from doc ID
                const area = storeAddress.split(',')[0];
                const slug = generateSlug(storeName, area);

                const minimalStoreData = {
                    id: user.id,
                    name: storeName,
                    slug: slug,
                    category: category,
                    address: storeAddress,
                    lat: storeLat,
                    lng: storeLng,
                    vendorId: user.id,
                    isOpen: true,
                    rating: 0,
                    image: imageURL || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
                    gstin: gstin || "",
                    phone: phone,
                    storeType: storeType,
                    plan: initialPlan,
                    isBlocked: user.isBlocked || false,
                    products: [],
                    mandal,
                    district,
                    state,
                    country,
                    website: website || ""
                };


                console.log("Creating store with data:", minimalStoreData);
                await setDoc(doc(db, 'stores', user.id), minimalStoreData, { merge: true });
                await refreshStores();
                console.log("Store creation successful");
            } catch (err: any) {
                console.error("Store creation failed:", err);
                if (err.code === 'permission-denied') {
                    throw new Error(`Store Creation Blocked.\n\nPlease fix your Firebase rules to allow writes to 'stores/${user.id}'.\n\nSuggestion: match /stores/{id} { allow read: if true; allow write: if request.auth != null && request.auth.uid == id; }`);
                }
                throw err;
            }

            // 2.5 Automatically update sitemap and ping search engines
            triggerAutoSitemapUpdate({
                id: user.id,
                name: storeName,
                category: category,
                city: district || mandal || storeAddress.split(',')[0] || 'Kakinada',
                address: storeAddress,
                phone: phone,
                website: website
            });

            // 3. Update local state
            login({ ...user, lat: storeLat, lng: storeLng, phone: phone, hasSetupStore: true, plan: initialPlan, subscriptionExpiry: initialExpiry, referralCode: user.referralCode || referralCode, mandal, district, state, country });

            toast.success('Your store is now LIVE!', {
                description: "Enjoy your free month of Pro! Start adding products now.",
            });
            sessionStorage.setItem('just_finished_setup', 'true');
            navigate('/vendor');
        } catch (error: any) {
            console.error("Launch Error Trace:", error);
            toast.error('Launch Error', {
                description: error.message,
                duration: 10000
            });
        } finally {
            setSaving(false);
        }
    };
    if (loading) return <PageLoading />;

    return (
        <div className="min-h-screen gradient-warm flex flex-col pb-20">
            <header className="p-4 border-b border-white/5 bg-neutral-900/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-[1000] shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                        <Store className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white uppercase tracking-tight">{t('vendor_dashboard.partner')}</h1>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">
                            {t('vendor_dashboard.registration')}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/vendor/subscription?claim=true')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                >
                    <Ticket className="w-3 h-3" /> {t('vendor_dashboard.have_coupon')}
                </button>
            </header>

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
                <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-black text-foreground tracking-tight">{t('vendor_dashboard.setup_title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('vendor_dashboard.setup_desc')}</p>
                </div>

                <div className="space-y-8">
                    {/* Basic Info Card */}
                    <div className="glass rounded-[32px] p-6 space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Store className="w-4 h-4" /> {t('vendor_dashboard.basic_info')}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('vendor_dashboard.store_name')} <span className="text-red-500">*</span></label>
                                <input
                                    value={storeName}
                                    onChange={e => setStoreName(e.target.value)}
                                    placeholder="e.g. Sunny Groceries"
                                    required
                                    className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('vendor_dashboard.phone_number')} <span className="text-red-500">*</span></label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="+91 98XXX XXXXX"
                                    required
                                    className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Store Website (Optional)</label>
                                <input
                                    type="url"
                                    value={website}
                                    onChange={e => setWebsite(e.target.value)}
                                    placeholder="https://yourstore.com"
                                    className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('vendor_dashboard.store_type')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStoreType('product')}
                                        className={`px-5 py-4 rounded-2xl text-sm font-bold transition-all ${storeType === 'product' ? 'bg-primary text-white' : 'bg-secondary/50 text-foreground hover:bg-secondary/80'}`}
                                    >
                                        {t('vendor_dashboard.products_store')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStoreType('service')}
                                        className={`px-5 py-4 rounded-2xl text-sm font-bold transition-all ${storeType === 'service' ? 'bg-primary text-white' : 'bg-secondary/50 text-foreground hover:bg-secondary/80'}`}
                                    >
                                        {t('vendor_dashboard.service_booking')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex justify-between items-center">
                                    {t('vendor_dashboard.biz_category')}
                                    <span className="text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-full lowercase tracking-normal">{t('vendor_dashboard.cat_select_desc')}</span>
                                </label>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {(storeType === 'product' ? PRODUCT_CATEGORIES : SERVICE_CATEGORIES).map(catName => {
                                        const metadata = CATEGORY_METADATA[catName];
                                        const Icon = metadata?.icon || Store;
                                        const isSelected = category === catName;
                                        
                                        return (
                                            <button
                                                key={catName}
                                                type="button"
                                                onClick={() => setCategory(catName)}
                                                className={`flex flex-col items-center gap-3 p-4 rounded-3xl transition-all relative overflow-hidden group border-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary/50 hover:bg-secondary'}`}
                                            >
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-primary/20 text-primary shadow-inner' : `bg-gradient-to-br ${metadata?.gradient || 'from-gray-400 to-gray-500'} text-white shadow-sm ring-4 ring-white`}`}>
                                                    <Icon className={`w-6 h-6 ${isSelected ? 'animate-pulse' : ''}`} />
                                                </div>
                                                <span className={`text-[11px] font-black uppercase tracking-widest text-center line-clamp-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                                    {t(`categories.${catName}`, { defaultValue: catName })}
                                                </span>
                                                
                                                {isSelected && (
                                                    <motion.div
                                                        layoutId="activeCategory"
                                                        className="absolute top-2 right-2"
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20" />
                                                    </motion.div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('vendor_dashboard.gstin')}</label>
                                </div>
                                <input
                                    value={gstin}
                                    onChange={e => setGstin(e.target.value)}
                                    placeholder="Enter GSTIN for tax benefits"
                                    className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('vendor_dashboard.referral')}</label>
                                </div>
                                <input
                                    value={referralCode}
                                    onChange={e => setReferralCode(e.target.value)}
                                    placeholder="Enter Referral ID"
                                    disabled={!!user?.referralCode}
                                    className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Storefront Image Card */}
                    <div className="glass rounded-[32px] p-6 space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Camera className="w-4 h-4" /> {t('vendor_dashboard.storefront_img')}
                        </h3>

                        <div className="flex flex-col gap-4">
                            {imageURL ? (
                                <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-white shadow-xl group">
                                    <img src={imageURL} alt="Storefront" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <button
                                        onClick={() => setImageURL('')}
                                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-colors z-10"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full aspect-video rounded-3xl border-4 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-3 group hover:bg-primary/10 transition-all cursor-pointer"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Upload className="w-8 h-8 text-primary" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-black text-sm text-foreground">{t('vendor_dashboard.add_img')}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{t('vendor_dashboard.img_desc')}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                        >
                                            <Upload className="w-4 h-4" /> {t('common.upload')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => startCamera()}
                                            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                        >
                                            <Camera className="w-4 h-4" /> {t('common.camera')}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Location Card */}
                    <div className="glass rounded-[32px] p-6 space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> {t('vendor_dashboard.store_location')} <span className="text-red-500">*</span>
                        </h3>

                        <div className="space-y-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={locationSearch}
                                    onChange={e => handleLocationSearch(e.target.value)}
                                    placeholder={t('vendor_dashboard.search_area')}
                                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={detectLocation}
                                    disabled={detecting || searching}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm active:scale-95 transition-all"
                                >
                                    {detecting || searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                </button>

                                {/* Search Results Dropdown */}
                                <AnimatePresence>
                                    {locationResults.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute top-full left-0 right-0 mt-4 z-[2500] bg-[#141414] border border-white/10 rounded-[2.5rem] p-3 shadow-2xl overflow-hidden overflow-y-auto max-h-80 backdrop-blur-2xl"
                                        >
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
                                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter whitespace-nowrap">{res.distanceKm?.toFixed(1) || '0.0'} km</span>
                                                        </div>
                                                        <p className="text-[10px] text-white/40 line-clamp-2 mt-1 font-medium leading-relaxed">{res.display_name}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* BIGGER MAP WITH SATELLITE SUPPORT */}
                             <div className="relative h-[450px] rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                                <Suspense fallback={<div className="h-full w-full bg-muted animate-pulse flex items-center justify-center text-xs font-black uppercase tracking-widest text-muted-foreground rotate-12">{t('vendor_dashboard.calibrating_sat')}</div>}>
                                    <MapView
                                        center={[storeLat, storeLng]}
                                        centerLabel={storeAddress ? storeAddress.split(',')[0] : t('vendor_dashboard.your_store')}
                                        stores={[]}
                                        onMapClick={(lat, lng) => {
                                            setStoreLat(lat);
                                            setStoreLng(lng);
                                            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                                                .then(res => res.json())
                                                .then(data => {
                                                    setStoreAddress(data.display_name);
                                                    setMandal(data.address?.suburb || data.address?.locality || data.address?.city_district || '');
                                                    setDistrict(data.address?.district || data.address?.city || '');
                                                    setState(data.address?.state || '');
                                                    setCountry(data.address?.country || '');
                                                });
                                        }}
                                    />
                                </Suspense>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[400]">
                                    <MapPin className="w-10 h-10 text-primary fill-primary/20 -mt-5 filter drop-shadow-lg" />
                                </div>
                            </div>

                            {storeAddress && (
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                                    <p className="text-xs font-bold text-foreground leading-relaxed">{storeAddress}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || !storeAddress}
                        className="w-full bg-primary text-primary-foreground py-5 rounded-3xl font-black text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('vendor_dashboard.launch_store')} <ArrowRight className="w-5 h-5" /></>}
                    </button>

                     <p className="text-[10px] text-center text-muted-foreground px-8 leading-relaxed">
                        {t('vendor_dashboard.terms_note')} {' '}
                        <button
                            type="button"
                            onClick={() => navigate('/privacy')}
                            className="text-primary hover:underline font-bold"
                        >
                            {t('vendor_dashboard.privacy_policy')}
                        </button>
                        {' '}{t('common.and')}{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/terms')}
                            className="text-primary hover:underline font-bold"
                        >
                            {t('vendor_dashboard.terms_conditions')}
                        </button>
                        . {t('vendor_dashboard.location_usage_note')}
                    </p>
                </div>

                {/* Camera Modal */}
                <AnimatePresence>
                    {showCamera && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black backdrop-blur-md p-4"
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
                                            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/05 transition-all"
                                            title="Switch Camera"
                                        >
                                            <Camera className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={stopCamera}
                                            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/05 transition-all"
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
                                            Capture Storefront
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Category Search Popup */}
                <AnimatePresence>
                    {showCategoryPopup && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                            onClick={() => { setShowCategoryPopup(false); setCatSearch(''); }}
                        >
                            <style>{`#bottom-nav { display: none !important; }`}</style>
                            <motion.div
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-background rounded-[2.5rem] w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/10"
                            >
                                <div className="p-8 border-b border-border/50 shrink-0 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black text-foreground tracking-tight">Select Category</h3>
                                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Search all {storeType} types</p>
                                        </div>
                                        <button
                                            onClick={() => { setShowCategoryPopup(false); setCatSearch(''); }}
                                            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
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
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary/50 border border-transparent focus:border-primary/30 outline-none font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-8">
                                        {(storeType === 'product' ? PRODUCT_CATEGORIES : SERVICE_CATEGORIES)
                                            .filter(cat =>
                                                cat.toLowerCase().includes(catSearch.toLowerCase()) || catSearch === ''
                                            )
                                            .map(catName => {
                                                const metadata = CATEGORY_METADATA[catName];
                                                const Icon = metadata?.icon || Store;
                                                const isSelected = category === catName;

                                                return (
                                                    <button
                                                        key={catName}
                                                        type="button"
                                                        onClick={() => {
                                                            setCategory(catName);
                                                            setShowCategoryPopup(false);
                                                            setCatSearch('');
                                                        }}
                                                        className={`flex flex-col items-center gap-3 p-5 rounded-3xl transition-all relative overflow-hidden group ${isSelected ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-105 ring-2 ring-indigo-400' : 'bg-secondary/30 text-foreground hover:bg-secondary hover:scale-[1.02]'}`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-white/20' : `bg-gradient-to-br ${metadata?.gradient || 'from-gray-400 to-gray-500'} text-white shadow-md ring-4 ring-white`}`}>
                                                            <Icon className="w-6 h-6" />
                                                        </div>
                                                        <span className={`text-[11px] font-black uppercase tracking-tight text-center line-clamp-1 ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
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
            </main>
        </div>
    );
};

export default VendorSetup;
