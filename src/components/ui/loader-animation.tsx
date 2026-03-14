import { motion } from 'framer-motion';

interface LoaderProps {
    text?: string;
    subtext?: string;
    fullScreen?: boolean;
}

const Loader = ({ text, subtext, fullScreen }: LoaderProps) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 select-none ${fullScreen ? 'fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm' : 'min-h-[200px] w-full'}`}>
            <motion.h2 
                animate={{ 
                    opacity: [0.2, 1, 0.2],
                }}
                transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                }}
                className="text-4xl font-black tracking-tighter text-foreground"
            >
                BellBasket
            </motion.h2>
            {(text || subtext) && (
                <div className="mt-4 space-y-1 text-center">
                    {text && (
                        <p className="text-sm font-bold text-muted-foreground">
                            {text}
                        </p>
                    )}
                    {subtext && (
                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                            {subtext}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Loader;
