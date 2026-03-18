import heroBg from '@/assets/hero-bg.jpg';

const DesktopBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none hidden lg:block -z-50">
            <div className="absolute inset-0">
                <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
            </div>
        </div>
    );
};

export default DesktopBackground;
