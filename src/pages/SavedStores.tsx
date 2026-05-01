import React from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Heart, ShoppingBag, Wrench, MapPin, Star } from 'lucide-react';
import Header from '@/components/Header';
import { useTranslation } from 'react-i18next';
import { CATEGORY_METADATA } from '@/constants/categories';
import { getAvatarUrl } from '@/utils/avatars';

const SavedStores = () => {
  const { user, stores, toggleSaveStore, isStoreSaved } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'product' | 'service'>(() => {
    return (localStorage.getItem('saved_stores_active_tab') as 'product' | 'service') || 'product';
  });

  React.useEffect(() => {
    localStorage.setItem('saved_stores_active_tab', activeTab);
  }, [activeTab]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const savedStoreItems = user.savedStores || [];

  const displayItems = savedStoreItems
    .map(item => {
      const storeId = typeof item === 'string' ? item : item.storeId;
      const savedAt = typeof item === 'string' ? new Date().toISOString() : item.savedAt;
      return { store: stores.find(s => s.id === storeId), savedAt };
    })
    .filter((item): item is { store: any, savedAt: string } => {
      if (!item.store) return false;
      return activeTab === 'product'
        ? (item.store.storeType === 'product' || !item.store.storeType)
        : (item.store.storeType === 'service');
    });

  return (
    <div className="min-h-screen gradient-warm pb-32">
      <Helmet>
        <title>Saved Stores - BellBasket</title>
      </Helmet>
      <Header />

      <main className="pt-24 px-4 max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-full bg-secondary/50 text-foreground hover:bg-secondary transition-all active:scale-95 border border-border/40"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Saved Stores</h1>
          </div>
          <div className="w-10" />
        </div>

        {/* Toggle Switch */}
        <div className="flex justify-center">
          <div className="flex bg-secondary/80 backdrop-blur-md p-1 rounded-[1.25rem] items-center gap-1 border border-border/50 shadow-inner w-fit">
            <button
              onClick={() => setActiveTab('product')}
              className={`px-6 py-2.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-300 flex items-center gap-2 ${activeTab === 'product' ? 'bg-primary text-white shadow-lg scale-105' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Products
            </button>
            <button
              onClick={() => setActiveTab('service')}
              className={`px-6 py-2.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-300 flex items-center gap-2 ${activeTab === 'service' ? 'bg-primary text-white shadow-lg scale-105' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Services
            </button>
          </div>
        </div>

        {/* Display Stores */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-primary/70">
                {activeTab === 'product' ? 'Product Stores' : 'Service Stores'}
              </span>
              <div className="h-[1px] w-8 bg-border/50" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {displayItems.length} {activeTab === 'product' ? 'Shops' : 'Services'} Saved
            </span>
          </div>

          {displayItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayItems.map((item, i) => (
                <StoreCard
                  key={item.store.id}
                  store={item.store}
                  savedAt={item.savedAt}
                  index={i}
                  toggleSaveStore={toggleSaveStore}
                  isStoreSaved={isStoreSaved}
                  navigate={navigate}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={activeTab === 'product' ? <ShoppingBag className="w-8 h-8" /> : <Wrench className="w-8 h-8" />}
              text={activeTab === 'product' ? "No product stores saved yet" : "No service stores saved yet"}
            />
          )}
        </div>
      </main>
    </div>
  );
};

const StoreCard = ({ store, savedAt, index, toggleSaveStore, isStoreSaved, navigate, t }: any) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[9px] font-bold text-muted-foreground tracking-wide">
          Saved {new Date(savedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} at {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate(`/store/${store.id}`)}
        className={`glass rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all group relative will-change-transform ${store.plan === 'pro' ? 'border-2 border-primary shadow-lg shadow-primary/20' : ''}`}
      >
        <div className="relative h-40 overflow-hidden">
          <img loading="lazy" src={store.image} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className={`text-[9.5px] font-bold px-2.5 py-1.5 rounded-full shadow-lg backdrop-blur-md border border-black/5 tracking-wide bg-white text-black flex items-center gap-1.5`}>
              <div className={`w-1.5 h-1.5 rounded-full ${store.isOpen ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              {store.isOpen ? t('home.open_now') : t('home.closed')}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSaveStore(store.id);
              }}
              className={`p-1.5 rounded-full shadow-lg backdrop-blur-md border transition-all active:scale-90 ${isStoreSaved(store.id)
                  ? 'bg-pink-500 text-white border-pink-400'
                  : 'bg-white/80 text-black border-black/5 hover:bg-white'
                }`}
              aria-label={isStoreSaved(store.id) ? "Unsave Store" : "Save Store"}
            >
              <Heart className={`w-3 h-3 ${isStoreSaved(store.id) ? 'fill-current' : ''}`} />
            </button>
          </div>
          <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
            <span className="text-[9.5px] font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1 border border-black/5 bg-white text-black">
              {CATEGORY_METADATA[store.category]?.icon && (() => {
                const Icon = CATEGORY_METADATA[store.category].icon;
                return <Icon className="w-3 h-3" style={{ color: CATEGORY_METADATA[store.category]?.color || 'inherit' }} />;
              })()}
              <span className="tracking-wide">{t(`categories.${store.category}`, { defaultValue: store.category })}</span>
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-bold text-white truncate max-w-[70%] drop-shadow-sm">{store.name}</h3>
            <div className="flex items-center gap-1 shrink-0 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
              <Star className="w-3 h-3 fill-current text-amber-400" />
              <span className="text-[11px] font-black leading-none text-amber-400">
                {(() => {
                  const reviews = store.reviews || [];
                  const avgRating = reviews.length > 0
                    ? reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0) / reviews.length
                    : (store.rating || 0);
                  const finalRating = store.effectiveRating || avgRating;
                  return finalRating.toFixed(1);
                })()}
              </span>
              {store.reviews && store.reviews.length > 0 && (
                <span className="text-[9px] font-bold text-white/60 leading-none">
                  ({store.reviews.length})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              {store.description && (
                <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed mb-1 italic">
                  {store.description}
                </p>
              )}
              <div className="flex items-center gap-1.5 opacity-60">
                <MapPin className="w-2.5 h-2.5 text-primary" />
                <span className="text-[9px] font-bold text-white tracking-tight truncate">{store.address.split(',')[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const EmptyState = ({ icon, text }: any) => (
  <div className="glass rounded-[2rem] p-12 text-center space-y-4 border border-dashed border-border/40">
    <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto text-muted-foreground/30">
      {icon}
    </div>
    <p className="text-sm font-bold text-muted-foreground">{text}</p>
  </div>
);

export default SavedStores;
