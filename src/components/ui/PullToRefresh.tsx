import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

const PULL_THRESHOLD = 80;

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, className = "" }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isAtTop = useRef(true);

  useEffect(() => {
    const handleScroll = () => {
      isAtTop.current = window.scrollY <= 0;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    startY.current = e.touches[0].pageY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing || !isAtTop.current) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Apply resistance
      const distance = Math.min(diff * 0.4, PULL_THRESHOLD + 20);
      setPullDistance(distance);
      
      // Prevent browser pull-to-refresh if we are handling it
      if (distance > 10 && e.cancelable) {
        // e.preventDefault(); // Don't prevent default yet, let it scroll if it can
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (isRefreshing) return;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div 
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh Indicator */}
      <div 
        className="absolute left-0 right-0 z-40 flex justify-center pointer-events-none"
        style={{ 
          top: -40, 
          height: 100,
          transform: `translateY(${pullDistance}px)`,
          opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
        }}
      >
        <div className="flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              rotate: isRefreshing ? 360 : pullDistance * 2,
            }}
            transition={{ 
              rotate: isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0 }
            }}
            className="p-2 rounded-full bg-white dark:bg-slate-900 shadow-lg border border-primary/20 text-primary"
          >
            <RefreshCw className="w-5 h-5" />
          </motion.div>
          {pullDistance > PULL_THRESHOLD / 2 && !isRefreshing && (
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 mt-2">
              {pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull down'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 transition-transform duration-200" style={{ transform: pullDistance > 0 ? `translateY(${pullDistance * 0.5}px)` : 'none' }}>
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
