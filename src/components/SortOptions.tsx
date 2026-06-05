import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Check, Star, Tag, ChevronDown, Filter, Store } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';

interface SortOptionsProps {
  priceSort: 'none' | 'low-high' | 'high-low';
  onPriceSortChange: (value: 'none' | 'low-high' | 'high-low') => void;
  ratingSort?: 'none' | 'top-rated' | 'low-rated';
  onRatingSortChange?: (value: 'none' | 'top-rated' | 'low-rated') => void;
  showRating?: boolean;
  ratingLabel?: string;
  maxDistance?: number;
  onMaxDistanceChange?: (value: number) => void;
  compact?: boolean;
  className?: string;
}

const SortOptions: React.FC<SortOptionsProps> = ({
  priceSort,
  onPriceSortChange,
  ratingSort,
  onRatingSortChange,
  showRating = false,
  ratingLabel,
  maxDistance = 20,
  onMaxDistanceChange,
  compact = false,
  className
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { setIsAnyModalOpen } = useApp();

  const hasActiveSort = priceSort !== 'none' || (showRating && ratingSort !== 'none');

  const SortTrigger = (
    <button className={cn(
      "group flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-xl border transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 text-foreground",
      hasActiveSort 
        ? "bg-gradient-to-br from-primary to-primary/80 border-primary text-primary-foreground shadow-primary/20" 
        : "bg-white dark:bg-[#202020] border-border/40 text-muted-foreground hover:border-primary/40",
      className
    )}>
      <div className={cn(
        "flex items-center justify-center w-5 h-5 rounded-md transition-colors",
        hasActiveSort ? "bg-white/20" : "bg-primary/10"
      )}>
        <Filter className={cn("w-3 h-3 transition-transform duration-500", hasActiveSort ? "text-primary-foreground" : "text-primary")} />
      </div>
      {hasActiveSort && (
        <motion.span 
          layoutId="activeSortDot"
          className="flex h-1 w-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" 
        />
      )}
      <ChevronDown className={cn("w-3 h-3 transition-transform duration-300 group-data-[state=open]:rotate-180", hasActiveSort ? "text-primary-foreground/60" : "text-muted-foreground/40")} />
    </button>
  );

  const MobileContent = (
    <DrawerContent className="rounded-t-[1.5rem] p-0 border-none bg-white dark:bg-[#202020] pb-4 focus:outline-none">
      <div className="mx-auto mt-2 h-1 w-8 rounded-full bg-muted/30" />
      <DrawerHeader className="px-4 pt-3 pb-0.5 text-left">
        <DrawerTitle className="text-sm font-black text-foreground flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Filter className="w-3 h-3" />
          </div>
          {t('sort.title')}
        </DrawerTitle>
      </DrawerHeader>

      <div className="px-4 py-1.5 space-y-3">
        <section>
          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/70 mb-1.5 block">{t('sort.price')}</label>
          <div className="grid grid-cols-1 gap-1">
            {[
              { id: 'none', label: t('sort.none'), icon: null },
              { id: 'low-high', label: t('sort.low_to_high'), icon: <ArrowUpDown className="w-3 h-3 rotate-180" /> },
              { id: 'high-low', label: t('sort.high_to_low'), icon: <ArrowUpDown className="w-3 h-3" /> },
            ].map((opt) => (
              <DrawerClose key={opt.id} asChild>
                <button
                  onClick={() => onPriceSortChange(opt.id as any)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-300 border text-left",
                    priceSort === opt.id 
                      ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/10" 
                      : "bg-secondary/15 border-transparent text-muted-foreground hover:border-primary/20"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center",
                      priceSort === opt.id ? "bg-white/20" : "bg-white dark:bg-[#333333] shadow-sm"
                    )}>
                      {opt.icon || <span className="text-[9px] font-black">✕</span>}
                    </div>
                    <span className="text-xs font-bold">{opt.label}</span>
                  </div>
                  {priceSort === opt.id && <Check className="w-3 h-3 text-white" />}
                </button>
              </DrawerClose>
            ))}
          </div>
        </section>

        {onMaxDistanceChange && (
          <section className="bg-secondary/5 p-4 rounded-xl border border-border/20 space-y-3">
             <div className="flex items-center justify-between">
               <label className="text-[8px] font-black uppercase tracking-[0.2em] text-primary block">{t('sort.search_range', { defaultValue: 'Search Range' })}</label>
               <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{maxDistance}km</span>
             </div>
             <input 
               type="range"
               min="3"
               max="20"
               step="1"
               value={maxDistance}
               onChange={(e) => onMaxDistanceChange(parseInt(e.target.value))}
               className="w-full h-1.5 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
             />
             <div className="flex justify-between text-[7px] font-black text-muted-foreground uppercase tracking-widest px-1">
               <span>3km</span>
               <span>20km</span>
             </div>
          </section>
        )}

        {showRating && onRatingSortChange && (
          <section>
            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/70 mb-1.5 block">{ratingLabel || t('sort.rating')}</label>
            <div className="grid grid-cols-1 gap-1">
              {[
                { id: 'none', label: t('sort.none'), icon: null },
                { id: 'top-rated', label: ratingLabel ? 'Best First' : t('sort.top_rated'), icon: <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> },
                { id: 'low-rated', label: ratingLabel ? 'Lowest First' : t('sort.low_rated'), icon: <Star className="w-3 h-3 text-muted-foreground/40" /> },
              ].map((opt) => (
                <DrawerClose key={opt.id} asChild>
                  <button
                    onClick={() => onRatingSortChange(opt.id as any)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-300 border text-left",
                      ratingSort === opt.id 
                        ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/10" 
                        : "bg-secondary/15 border-transparent text-muted-foreground hover:border-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center",
                        ratingSort === opt.id ? "bg-white/20" : "bg-white dark:bg-[#333333] shadow-sm"
                      )}>
                        {opt.icon || <span className="text-[9px] font-black">✕</span>}
                      </div>
                      <span className="text-xs font-bold">{opt.label}</span>
                    </div>
                    {ratingSort === opt.id && <Check className="w-3 h-3 text-white" />}
                  </button>
                </DrawerClose>
              ))}
            </div>
          </section>
        )}


      </div>
    </DrawerContent>
  );


  const DesktopContent = (
    <DropdownMenuContent align="end" className="w-52 p-0 rounded-xl shadow-xl border-none overflow-hidden bg-white/95 dark:bg-[#202020]/95 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5 z-50">
      <div className="p-2 bg-secondary/30 border-b border-border/40">
         <DropdownMenuLabel className="flex items-center gap-1 px-1 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          <Filter className="w-2.5 h-2.5" />
          {t('sort.title')}
        </DropdownMenuLabel>
      </div>

      <div className="p-1 space-y-2">
        <section>
          <DropdownMenuLabel className="flex items-center gap-1.5 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-primary/70">
            <Tag className="w-2.5 h-2.5" />
            {t('sort.price')}
          </DropdownMenuLabel>
          <div className="space-y-0.5">
            {[
              { id: 'none', label: t('sort.none'), icon: null },
              { id: 'low-high', label: t('sort.low_to_high'), icon: <ArrowUpDown className="w-2.5 h-2.5 rotate-180" /> },
              { id: 'high-low', label: t('sort.high_to_low'), icon: <ArrowUpDown className="w-2.5 h-2.5" /> },
            ].map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                onClick={() => onPriceSortChange(opt.id as any)}
                className={cn(
                  "group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-300 outline-none",
                  priceSort === opt.id ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" : "hover:bg-primary/5 focus:bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                    priceSort === opt.id ? "bg-white/20" : "bg-secondary text-muted-foreground/40"
                  )}>
                    {opt.icon || <span className="text-[8px] font-black">✕</span>}
                  </div>
                  <span className="text-[10px] font-bold block">{opt.label}</span>
                </div>
                {priceSort === opt.id && <Check className="w-3 h-3 text-white" />}
              </DropdownMenuItem>
            ))}
          </div>
        </section>

        {onMaxDistanceChange && (
          <section className="px-3 py-2 space-y-2 bg-primary/5 mx-1 rounded-lg border border-primary/10">
            <div className="flex items-center justify-between pointer-events-none">
               <label className="text-[8px] font-black uppercase tracking-widest text-primary/70">{t('sort.distance_range', { defaultValue: 'Distance Range' })}</label>
               <span className="text-[10px] font-black text-primary">{maxDistance}km</span>
            </div>
            <input 
              type="range"
              min="3"
              max="20"
              step="1"
              value={maxDistance}
              onChange={(e) => onMaxDistanceChange(parseInt(e.target.value))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full h-1 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </section>
        )}

        {showRating && onRatingSortChange && (
          <section>
            <DropdownMenuSeparator className="my-1.5 bg-border/40 mx-2" />
            <DropdownMenuLabel className="flex items-center gap-1.5 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-primary/70">
              <Star className="w-2.5 h-2.5" />
              {ratingLabel || t('sort.rating')}
            </DropdownMenuLabel>
            <div className="space-y-0.5">
              {[
                { id: 'none', label: t('sort.none'), icon: null },
                { id: 'top-rated', label: ratingLabel ? 'Best First' : t('sort.top_rated'), icon: <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /> },
                { id: 'low-rated', label: ratingLabel ? 'Lowest First' : t('sort.low_rated'), icon: <Star className="w-2.5 h-2.5 text-muted-foreground/40" /> },
              ].map((opt) => (
                <DropdownMenuItem
                  key={opt.id}
                  onClick={() => onRatingSortChange(opt.id as any)}
                  className={cn(
                    "group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-300 outline-none",
                    ratingSort === opt.id ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" : "hover:bg-primary/5 focus:bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-5 h-5 rounded flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                      ratingSort === opt.id ? "bg-white/20" : "bg-secondary text-muted-foreground/40"
                    )}>
                      {opt.icon || <span className="text-[8px] font-black">✕</span>}
                    </div>
                    <span className="text-[10px] font-bold block">{opt.label}</span>
                  </div>
                  {ratingSort === opt.id && <Check className="w-3 h-3 text-white" />}
                </DropdownMenuItem>
              ))}
            </div>
          </section>
        )}


      </div>
    </DropdownMenuContent>
  );


  if (isMobile) {
    return (
      <Drawer onOpenChange={setIsAnyModalOpen}>
        <DrawerTrigger asChild>
          {SortTrigger}
        </DrawerTrigger>
        {MobileContent}
      </Drawer>
    );
  }

  return (
    <DropdownMenu onOpenChange={setIsAnyModalOpen}>
      <DropdownMenuTrigger asChild>
        {SortTrigger}
      </DropdownMenuTrigger>
      {DesktopContent}
    </DropdownMenu>
  );
};

export default SortOptions;
