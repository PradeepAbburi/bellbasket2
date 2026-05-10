import { motion } from 'framer-motion';

interface LoaderProps {
    text?: string;
    subtext?: string;
    fullScreen?: boolean;
}

const Loader = ({ fullScreen }: LoaderProps) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 select-none ${fullScreen ? 'fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm' : 'min-h-[200px] w-full'}`}>
            <div className="animate-pulse">
                <span className="text-xl md:text-2xl font-black tracking-tighter text-foreground">
                    BellBasket
                </span>
            </div>
        </div>
    );
};

export default Loader;
