import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const { t } = useTranslation();
    const location = useLocation();

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            
            // Check if user has already dismissed it this session
            const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
            if (!isDismissed) {
                // Show the prompt after a short delay
                setTimeout(() => setIsVisible(true), 3000);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setIsVisible(false);
            console.log('PWA was installed');
        });

        // Also show if it's mobile and NOT standalone (and prompt isn't supported/fired yet)
        // This acts as a fallback for browsers that don't support beforeinstallprompt (like iOS Safari)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        
        if (isMobile && !isStandalone && !sessionStorage.getItem('pwa_prompt_dismissed')) {
            // Wait a bit to see if beforeinstallprompt fires (Chrome/Android)
            // If it doesn't fire within 5 seconds, we show the generic instructions
            const timer = setTimeout(() => {
                if (!deferredPrompt && !isVisible) {
                    setIsVisible(true);
                }
            }, 5000);
            return () => clearTimeout(timer);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [deferredPrompt, isVisible]);

    const handleApkDownload = () => {
        const link = document.createElement('a');
        link.href = '/bellbasket.apk';
        link.download = 'bellbasket.apk';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            setDeferredPrompt(null);
            setIsVisible(false);
        } else {
            // Check if Android for direct APK download
            const isAndroid = /Android/i.test(navigator.userAgent);
            if (isAndroid) {
                handleApkDownload();
                return;
            }

            // Fallback for iOS - show instructions
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                alert('To install BellBasket on your iPhone: tap the Share button (square with arrow) and then "Add to Home Screen".');
            } else {
                alert('To install: open your browser menu and select "Install App" or "Add to Home Screen".');
            }
            setIsVisible(false);
            sessionStorage.setItem('pwa_prompt_dismissed', 'true');
        }
    };

    const dismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-20 left-4 right-4 z-[100] md:hidden"
            >
                <div className="glass rounded-[2rem] p-5 shadow-2xl border border-primary/20 relative overflow-hidden group">
                    {/* Background decoration */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
                    
                    <button 
                        onClick={dismiss}
                        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-muted-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                            <Smartphone className="w-7 h-7 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">Mobile App</span>
                                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                            </div>
                            <h3 className="text-sm font-black text-foreground leading-tight truncate">Install BellBasket App</h3>
                            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed line-clamp-2">
                                Download official Android APK or install web app.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                        <div className="flex gap-2">
                            <button
                                onClick={handleApkDownload}
                                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download APK
                            </button>
                            {deferredPrompt && (
                                <button
                                    onClick={handleInstall}
                                    className="flex-1 h-11 rounded-xl bg-secondary text-foreground font-bold text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1"
                                >
                                    PWA Install
                                </button>
                            )}
                            <button
                                onClick={dismiss}
                                className="px-3 h-11 rounded-xl bg-secondary/50 text-foreground font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PWAInstallPrompt;
