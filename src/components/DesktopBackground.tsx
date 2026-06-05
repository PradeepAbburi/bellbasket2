import heroBg from '@/assets/hero-bg.jpg';

const DesktopBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none hidden lg:block -z-50 overflow-hidden bg-background">
            {/* Ambient floating colored glow blobs */}
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[130px] animate-float-ambient pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full bg-indigo-500/5 blur-[160px] animate-float-ambient-slow pointer-events-none" />
            
            <div className="absolute inset-0">
                <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
            </div>
        </div>
    );
};

export default DesktopBackground;
