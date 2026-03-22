import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Palette, Layout, Smartphone, Eye, Save, RotateCcw, ArrowLeft, ArrowRight, Check, Plus, Trash2, X, Upload, ImageIcon } from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/appStore';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateSlug } from '@/utils/seo';
import DesktopBackground from '@/components/DesktopBackground';

const StoreEditor = () => {
    const { user, stores, loading, allProducts, refreshStores } = useApp();
    const navigate = useNavigate();
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

    const [isSaving, setIsSaving] = useState(false);

    // Editor State
    const [config, setConfig] = useState({
        brandText: '', // Keep for alt text / fallback
        logo: '', // New field for logo image URL/Base64
        promoBanner: '',
        showDiscountedPrice: false,
        useWatermark: false
    });


    const vendorStore: any = stores.find(s => s.vendorId === user?.id || s.id === user?.id);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'vendor')) {
            navigate('/auth');
        } else if (user?.plan !== 'pro') {
            toast.error("Store Editor is a Pro feature.");
            navigate('/vendor/dashboard');
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if (vendorStore) {
            setConfig({
                brandText: vendorStore.brandText || vendorStore.name || '',
                logo: vendorStore.logo || '',
                promoBanner: vendorStore.promoBanner || '',
                showDiscountedPrice: vendorStore.showDiscountedPrice || false,
                useWatermark: vendorStore.useWatermark || false
            });
        }
    }, [vendorStore]);

    const handleSave = async () => {
        if (!user?.id || !vendorStore) return;
        setIsSaving(true);
        try {
            const area = vendorStore.address?.split(',')[0] || '';
            const slug = generateSlug(config.brandText || vendorStore.name, area);

            await updateDoc(doc(db, 'stores', user.id), {
                ...config,
                slug,
                updatedAt: new Date().toISOString()
            });

            toast.success("Store customization saved successfully");
        } catch (error) {
            console.error("Save failed:", error);
            toast.error("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };


    const previewProducts = (vendorStore?.products?.length > 0)
        ? vendorStore.products
        : (allProducts || []).filter((p: any) => p.vendorId === (vendorStore?.id || user?.id));

    return (
        <div className="min-h-screen bg-secondary/30 flex flex-col">
            <DesktopBackground />

            {/* Top Toolbar */}
            <div className="h-16 bg-white/80 backdrop-blur-md border-b border-border fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 lg:px-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/vendor')} className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                            Visual Editor
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex bg-secondary p-1 rounded-lg">
                        <button
                            onClick={() => setPreviewMode('mobile')}
                            className={`p-2 rounded-md transition-all ${previewMode === 'mobile' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPreviewMode('desktop')}
                            className={`p-2 rounded-md transition-all ${previewMode === 'desktop' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Layout className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="h-6 w-px bg-border mx-2" />
                    <button
                        onClick={() => {
                            window.open(`/store/${user?.id}?preview=true`, '_blank');
                        }}
                        className="hidden md:flex items-center gap-2 px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-xl transition-all"
                    >
                        <Eye className="w-4 h-4" /> Live Preview
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-foreground text-background rounded-xl font-bold hover:opacity-90 transition-all shadow-lg active:scale-95"
                    >
                        {isSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="flex flex-1 pt-16 overflow-hidden">
                {/* Sidebar Controls */}
                <div className="w-80 bg-white/50 backdrop-blur-sm border-r border-border overflow-y-auto hidden md:block">
                    <div className="p-6 space-y-8 animate-in slide-in-from-left-4 duration-300">
                        {/* Branding Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Palette className="w-4 h-4 text-primary" /> Brand Identity
                            </h3>

                            <div className="space-y-3">
                                <label className="text-xs font-medium text-muted-foreground">Store Logo & Name</label>

                                {/* Logo Upload */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-white group hover:border-primary/50 transition-colors relative cursor-pointer"
                                            onClick={() => document.getElementById('logo-upload')?.click()}
                                        >
                                            {config.logo ? (
                                                <img src={config.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary/50" />
                                            )}
                                            {config.logo && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfig(prev => ({ ...prev, logo: '' }));
                                                    }}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4 text-white" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label
                                                htmlFor="logo-upload"
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-bold rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
                                            >
                                                <Upload className="w-3.5 h-3.5" /> Upload Image
                                            </label>
                                            <input
                                                id="logo-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleLogoUpload}
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1.5">Recommended: Square PNG/JPG, max 2MB</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Alt Text Input */}
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        value={config.brandText}
                                        onChange={e => setConfig(prev => ({ ...prev, brandText: e.target.value }))}
                                        className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                                        placeholder="Store Name (for SEO/Alt text)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">Content & Promotions</h3>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Announcement Banner</label>
                                <textarea
                                    value={config.promoBanner}
                                    onChange={e => setConfig(prev => ({ ...prev, promoBanner: e.target.value }))}
                                    className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-none shadow-sm"
                                    placeholder="Free delivery on orders above ₹500!"
                                />
                            </div>
                        </div>

                        {/* Product Card Customization */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Layout className="w-4 h-4 text-primary" /> Product Card
                            </h3>

                            <div className="bg-white border border-border rounded-xl divide-y divide-border shadow-sm">
                                <div className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Smart Pricing</p>
                                        <p className="text-xs text-muted-foreground">Show percentage off</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={config.showDiscountedPrice}
                                            onChange={e => setConfig(prev => ({ ...prev, showDiscountedPrice: e.target.checked }))}
                                        />
                                        <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Watermark Images</p>
                                        <p className="text-xs text-muted-foreground">Protect product photos</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={config.useWatermark}
                                            onChange={e => setConfig(prev => ({ ...prev, useWatermark: e.target.checked }))}
                                        />
                                        <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Preview Area */}
                <div className="flex-1 overflow-y-auto bg-gradient-to-br from-secondary/50 to-background p-8 flex justify-center items-start">
                    {/* Page Preview */}
                    <div
                        className={`transition-all duration-500 shadow-2xl overflow-hidden bg-white relative ${previewMode === 'mobile'
                            ? 'w-[375px] h-[750px] rounded-[40px] border-[8px] border-slate-900'
                            : 'w-full max-w-5xl h-fit min-h-[600px] rounded-xl border border-border/50'
                            }`}
                    >
                        {/* Simulated Mobile/Web Store View */}
                        <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50 relative">
                            {/* Header Image Background */}
                            <div className="absolute top-0 left-0 right-0 h-48 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop')` }}>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            </div>

                            <div className="p-4 relative z-10 pt-32">
                                {/* Back Button Simulation */}
                                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white">
                                    <ArrowLeft className="w-5 h-5" />
                                </div>

                                {/* Store Info Card */}
                                <div className="glass rounded-2xl p-4 shadow-xl border border-white/50 bg-white/80 backdrop-blur-md mb-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            {config.logo && (
                                                <div className="w-14 h-14 rounded-xl bg-white border border-border/40 shadow-sm overflow-hidden flex-shrink-0 p-1">
                                                    <img src={config.logo} alt="Store Logo" className="w-full h-full object-contain" />
                                                </div>
                                            )}
                                            <div>
                                                <h1 className="text-2xl font-black text-primary">{config.brandText || 'Store Name'}</h1>
                                                <p className="text-xs text-muted-foreground font-medium">Grocery & Essentials • 0.3 km</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                                            <div className="flex items-center gap-1 text-green-700 font-bold text-sm">
                                                4.8 <span className="text-[10px]">★</span>
                                            </div>
                                            <span className="text-[9px] text-green-600 uppercase font-bold tracking-wider">Rating</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-4">
                                        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Open Now</span>
                                        {config.useWatermark && (
                                            <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                                Authentic
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Promo Banner */}
                                {config.promoBanner && (
                                    <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-xl shadow-sm">
                                        <p className="text-sm font-bold text-slate-800">{config.promoBanner}</p>
                                    </div>
                                )}

                                {/* Search Bar */}
                                <div className="mb-8 relative">
                                    <input
                                        disabled
                                        placeholder={`Search in ${config.brandText || 'store'}...`}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm text-sm"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Eye className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Categories & Products */}
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-bold text-slate-900">Featured Items</h2>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">See All</span>
                                        </div>

                                        {/* Horizontal Scroll Area */}
                                        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                                            {previewProducts.length === 0 ? (
                                                <div className="w-full text-center py-8 text-xs text-muted-foreground italic">
                                                    No products found. Add products in dashboard to see them here.
                                                </div>
                                            ) : (
                                                previewProducts.map((p: any) => {
                                                    const discountVal = p.discount ? parseInt(p.discount) : 0;
                                                    const oldPrice = discountVal > 0 ? Math.round(p.price / (1 - discountVal / 100)) : 0;

                                                    return (
                                                        <div key={p.id} className="flex-shrink-0 w-48 h-[265px] bg-white/70 dark:bg-slate-900/80 backdrop-blur-md rounded-[2.5rem] border border-white/40 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] hover:border-primary/30 transition-all duration-500 group flex flex-col overflow-hidden relative">
                                                            <div className="relative h-[120px] shrink-0 overflow-hidden p-2">
                                                                <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-gradient-to-br from-secondary/20 to-secondary/5 relative">
                                                                    <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" alt={p.name} />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                                </div>

                                                                {config.useWatermark && (
                                                                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                                                        {config.logo ? (
                                                                            <img
                                                                                src={config.logo}
                                                                                alt="Watermark"
                                                                                className="w-9 h-9 object-contain opacity-10 -rotate-12 mix-blend-multiply grayscale"
                                                                            />
                                                                        ) : (
                                                                            <span className="text-[9px] font-black uppercase -rotate-12 bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm shadow-sm text-primary opacity-20">
                                                                                {config.brandText || 'BellBasket'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {config.showDiscountedPrice && discountVal > 0 && (
                                                                    <div className="absolute top-3 left-3 z-20 bg-primary/90 backdrop-blur-md text-primary-foreground text-[8px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg border border-white/20 uppercase tracking-tighter">
                                                                        {discountVal}% OFF
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-col flex-1 px-4 pb-4 pt-0 z-10 min-w-0">
                                                                <div className="flex flex-col min-h-[38px] justify-center">
                                                                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs line-clamp-1 group-hover:text-primary transition-colors tracking-tight leading-none mb-1">{p.name}</h3>
                                                                    <p className="text-[8px] text-muted-foreground/50 line-clamp-1 leading-relaxed font-bold uppercase tracking-tighter">
                                                                        {p.description || "Quality Assured Product"}
                                                                    </p>
                                                                </div>

                                                                <div className="mt-auto pt-2 border-t border-slate-100/50">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex flex-col">
                                                                            <div className="flex items-center gap-1.5 h-6">
                                                                                <span className="font-black text-sm text-slate-900 dark:text-white leading-none">₹{p.price}</span>
                                                                                {config.showDiscountedPrice && oldPrice > 0 && (
                                                                                    <span className="text-[9px] text-slate-400 line-through leading-tight font-bold opacity-40">₹{oldPrice}</span>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-[7px] font-black text-muted-foreground/30 uppercase tracking-[0.1em] -mt-0.5">Net Price</span>
                                                                        </div>
                                                                        <button className="bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] font-bold h-8 px-3 rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-sm shrink-0 border border-primary/20">
                                                                            <Plus className="w-3 h-3" /> <span className="pt-0.5 uppercase tracking-wider text-[9px]">Add</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Another Category for visual fullness */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-bold text-slate-900">Bestsellers</h2>
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                                            {previewProducts.length === 0 ? (
                                                <div className="w-full text-center py-4 text-xs text-muted-foreground italic">
                                                    No products available.
                                                </div>
                                            ) : (
                                                previewProducts.slice(0, 4).map((p: any) => (
                                                    <div key={`bs-${p.id}`} className="flex-shrink-0 w-48 h-[265px] bg-white/70 dark:bg-slate-900/80 backdrop-blur-md rounded-[2.5rem] border border-white/40 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] hover:border-primary/30 transition-all duration-500 group flex flex-col overflow-hidden relative">
                                                        <div className="relative h-[120px] shrink-0 overflow-hidden p-2">
                                                            <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-gradient-to-br from-secondary/20 to-secondary/5 relative">
                                                                <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" alt={p.name} />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                            </div>
                                                            {config.useWatermark && (
                                                                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                                                    {config.logo ? (
                                                                        <img
                                                                            src={config.logo}
                                                                            alt="Watermark"
                                                                            className="w-9 h-9 object-contain opacity-10 -rotate-12 mix-blend-multiply grayscale"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-[9px] font-black uppercase -rotate-12 bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm shadow-sm text-primary opacity-20">
                                                                            {config.brandText || 'BellBasket'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col flex-1 px-4 pb-4 pt-0 z-10 min-w-0">
                                                            <div className="flex flex-col min-h-[38px] justify-center">
                                                                <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs line-clamp-1 group-hover:text-primary transition-colors tracking-tight leading-none mb-1">{p.name}</h3>
                                                                <p className="text-[8px] text-muted-foreground/50 line-clamp-1 leading-relaxed font-bold uppercase tracking-tighter">
                                                                    {p.description || "Quality Assured Product"}
                                                                </p>
                                                            </div>
                                                            <div className="mt-auto pt-2 border-t border-slate-100/50">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-1.5 h-6">
                                                                            <span className="font-black text-sm text-slate-900 dark:text-white leading-none">₹{p.price}</span>
                                                                        </div>
                                                                        <span className="text-[7px] font-black text-muted-foreground/30 uppercase tracking-[0.1em] -mt-0.5">Net Price</span>
                                                                    </div>
                                                                    <button className="bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] font-bold h-8 px-3 rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-sm shrink-0 border border-primary/20">
                                                                        <Plus className="w-3 h-3" /> <span className="pt-0.5 uppercase tracking-wider text-[9px]">Add</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StoreEditor;
