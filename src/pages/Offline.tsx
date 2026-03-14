import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

const Offline = () => {
    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen gradient-warm flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            <div className="relative mb-12">
                {/* Animated Background Circles */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute inset-0 -m-20 bg-primary/20 rounded-full blur-3xl"
                />

                {/* SVG Outline Animation Design */}
                <div className="relative z-10">
                    <svg
                        width="200"
                        height="200"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary/40"
                    >
                        <motion.path
                            d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: 1,
                                opacity: 1,
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                repeatType: "loop",
                                ease: "easeInOut",
                                repeatDelay: 1
                            }}
                        />
                    </svg>

                    <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/50">
                            <WifiOff className="w-12 h-12 text-primary" />
                        </div>
                    </motion.div>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-6 max-w-sm relative z-10"
            >
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-foreground tracking-tight underline decoration-primary/30 decoration-4 underline-offset-8">
                        You're Offline
                    </h1>
                    <p className="text-muted-foreground font-medium pt-4">
                        It looks like your connection has been interrupted. Check your internet settings to continue shopping.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleRetry}
                        className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry Connection
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <AlertCircle className="w-3 h-3" />
                        Automatic reconnection in progress
                    </div>
                </div>
            </motion.div>

            {/* Modern UI Decorations */}
            <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-between items-end pointer-events-none opacity-20">
                <div className="text-[120px] font-black leading-none select-none">OFF</div>
                <div className="text-right space-y-2 pb-4">
                    <div className="w-32 h-1 bg-foreground rounded-full" />
                    <div className="w-20 h-1 bg-foreground rounded-full ml-auto" />
                </div>
            </div>
        </div>
    );
};

export default Offline;
