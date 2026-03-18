import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Loader2, Navigation, CheckCircle2, ArrowRight, Store, Upload, Camera, X, Ticket } from 'lucide-react';
import { useApp } from '@/context/appStore';

import MapView from '@/components/MapView';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { generateSlug } from '@/utils/seo';

const STORE_CATEGORIES = [
    "Grocery",
    "Dairy & Eggs",
    "Fruits & Vegetables",
    "Bakery",
    "Meat & Seafood",
    "Pharmacy",
    "Beverages",
    "Snacks",
    "Household",
    "Others"
];

const VendorSetup = () => {
    const { user, loading, login, refreshStores } = useApp();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Store details state
    const [storeName, setStoreName] = useState('');
    const [category, setCategory] = useState('Grocery');
    const [storeType, setStoreType] = useState<'product' | 'service'>('product');
    const [gstin, setGstin] = useState('');
    const [imageURL, setImageURL] = useState('');
    const [phone, setPhone] = useState('');
    const [referralCode, setReferralCode] = useState('');

    // Location state
    const [storeLat, setStoreLat] = useState<number>(28.6139);
    const [storeLng, setStoreLng] = useState<number>(77.2090);
    const [storeAddress, setStoreAddress] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [locationResults, setLocationResults] = useState<any[]>([]);
    const [detecting, setDetecting] = useState(false);
    const [saving, setSaving] = useState(false);

    // Update store name when user data loads
    useEffect(() => {
        if (user) {
            if (!storeName && user.name) setStoreName(`${user.name}'s Store`);
            if (!phone && user.phone) setPhone(user.phone);
            if (!referralCode && user.referralCode) setReferralCode(user.referralCode);
        }
    }, [user, storeName, phone, referralCode]);

    // Redirect if not a vendor
    useEffect(() => {
        if (!loading) {
            if (!user || user.role !== 'vendor') {
                navigate('/auth');
            }
        }
    }, [user, loading, navigate]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Firestore limit is 1MB total. 0.7MB for image is safe with base64 overhead.
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

    if (loading) {
        return (
            <div className="min-h-screen gradient-warm flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
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
                const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&lat=${storeLat}&lon=${storeLng}&limit=12`;
                const res = await fetch(photonUrl);
                const data = await res.json();

                const results = data.features.map((f: any) => {
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
                        type: p.osm_value || p.type || 'place'
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
            { timeout: 10000, maximumAge: 0 }
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

            // 1. Update user in Firestore first (this ensures profile has lat/lng and setup flag)
            try {
                await setDoc(doc(db, 'users', user.id), {
                    lat: storeLat,
                    lng: storeLng,
                    phone: phone,
                    hasSetupStore: true,
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
                    plan: user.plan || 'none',
                    isBlocked: user.isBlocked || false,
                    products: []
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

            // 3. Update local state
            login({ ...user, lat: storeLat, lng: storeLng, phone: phone, hasSetupStore: true, referralCode: user.referralCode || referralCode });

            toast.success('Your store is now LIVE!', {
                description: "Map sync complete and shop open. Please select a subscription to continue.",
            });
            navigate('/vendor/subscription');
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

    return (
        <div className="min-h-screen gradient-warm flex flex-col pb-20">
            <header className="p-4 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-foreground uppercase tracking-tight">BellBasket Partner</h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                            Store Registration
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/vendor/subscription?claim=true')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                >
                    <Ticket className="w-3 h-3" /> Have a Coupon?
                </button>
            </header>

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
                <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-black text-foreground tracking-tight">Store Setup</h2>
                    <p className="text-sm text-muted-foreground">Complete your profile to start accepting orders.</p>
                </div>

                <div className="space-y-8">
                    {/* Basic Info Card */}
                    <div className="glass rounded-[32px] p-6 space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Store className="w-4 h-4" /> Basic Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Store Name</label>
                                <input
                                    value={storeName}
                                    onChange={e => setStoreName(e.target.value)}
                                    placeholder="e.g. Sunny Groceries"
                                    className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="+91 98XXX XXXXX"
                                    className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Store Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStoreType('product')}
                                        className={`px-5 py-4 rounded-2xl text-sm font-bold transition-all ${storeType === 'product' ? 'bg-primary text-white shadow-lg' : 'bg-secondary/50 text-foreground hover:bg-secondary/80'}`}
                                    >
                                        Products Store
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStoreType('service')}
                                        className={`px-5 py-4 rounded-2xl text-sm font-bold transition-all ${storeType === 'service' ? 'bg-primary text-white shadow-lg' : 'bg-secondary/50 text-foreground hover:bg-secondary/80'}`}
                                    >
                                        Service Booking
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Business Category</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                                >
                                    {STORE_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">GSTIN Number (Optional)</label>
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
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Referral ID (Optional)</label>
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
                            <Camera className="w-4 h-4" /> Storefront Image
                        </h3>

                        <div className="flex flex-col items-center gap-4">
                            {imageURL ? (
                                <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                                    <img src={imageURL} alt="Storefront" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setImageURL('')}
                                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full aspect-video rounded-3xl border-4 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-3 group hover:bg-primary/10 transition-all"
                                >
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black text-sm text-foreground">Click to Upload Photo</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">PNG, JPG up to 2MB</p>
                                    </div>
                                </button>
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
                            <MapPin className="w-4 h-4" /> Store Location
                        </h3>

                        <div className="space-y-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={locationSearch}
                                    onChange={e => handleLocationSearch(e.target.value)}
                                    placeholder="Search your shop area..."
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
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-border p-3 z-[1000] max-h-64 overflow-y-auto"
                                        >
                                            {locationResults.map(res => (
                                                <button
                                                    key={res.place_id}
                                                    onClick={() => selectLocation(res)}
                                                    className="w-full flex items-start gap-4 p-4 hover:bg-primary/5 transition-all text-left group border-b border-border last:border-0"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                                                        <MapPin className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="font-bold text-sm text-foreground truncate">{res.short_name}</p>
                                                            {res.distanceKm !== undefined && (
                                                                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                                                                    {res.distanceKm < 1 ? '<1 km' : `${Math.round(res.distanceKm)} km`}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-tight">{res.display_name}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* BIGGER MAP WITH SATELLITE SUPPORT */}
                            <div className="relative h-[450px] rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                                <MapView
                                    center={[storeLat, storeLng]}
                                    centerLabel={storeAddress ? storeAddress.split(',')[0] : 'Your Store'}
                                    stores={[]}
                                    onMapClick={(lat, lng) => {
                                        setStoreLat(lat);
                                        setStoreLng(lng);
                                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                                            .then(res => res.json())
                                            .then(data => setStoreAddress(data.display_name));
                                    }}
                                />
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
                        className="w-full gradient-primary text-primary-foreground py-5 rounded-3xl font-black text-sm flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Launch My Store <ArrowRight className="w-5 h-5" /></>}
                    </button>

                    <p className="text-[10px] text-center text-muted-foreground px-8 leading-relaxed">
                        By launching your store, you agree to BellBasket's {' '}
                        <button
                            type="button"
                            onClick={() => navigate('/privacy')}
                            className="text-primary hover:underline font-bold"
                        >
                            Privacy Policy
                        </button>
                        {' '}and{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/terms')}
                            className="text-primary hover:underline font-bold"
                        >
                            Terms & Conditions
                        </button>
                        . We use your location and business details to connect you with nearby customers.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default VendorSetup;
