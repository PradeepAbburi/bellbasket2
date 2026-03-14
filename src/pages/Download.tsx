import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, QrCode, Sparkles, Smartphone, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import Header from '@/components/Header';
import QRCodeWithLogo from '@/components/ui/qr-code-with-logo';

const DownloadPage = () => {
    const navigate = useNavigate();

    const handleApkDownload = () => {
        toast.success("Starting Download...", {
            description: "Your BellBasket APK is being downloaded."
        });
        const link = document.createElement('a');
        link.href = '/bellbasket.apk';
        link.download = 'bellbasket.apk';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadUrl = window.location.origin + "/download";

    return (
        <div className="min-h-screen gradient-warm">
            <Helmet>
                <title>Download App - BellBasket</title>
                <meta name="description" content="Download the BellBasket mobile app for Android. Secure APK download for the ultimate neighborhood shopping experience." />
            </Helmet>

            <Header />

            <main className="pt-24 pb-12 px-4 max-w-5xl mx-auto flex flex-col items-center">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(-1)}
                    className="self-start flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors glass px-4 py-2 rounded-full"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </motion.button>

                <section className="w-full text-center space-y-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm border border-primary/10">
                            <Sparkles className="w-3.5 h-3.5" />
                            Official Release
                        </div>
                        <h1 className="text-4xl md:text-7xl font-black text-foreground tracking-tight">
                            Shop Smarter with <span className="text-gradient font-black">BellBasket</span>
                        </h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">
                            Experience the full power of hyperlocal shopping. Download our official Android app for live tracking, instant orders, and exclusive deals.
                        </p>
                    </motion.div>

                    <div className="max-w-4xl mx-auto w-full">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass rounded-[3.5rem] p-12 md:p-20 border border-white/20 shadow-2xl relative overflow-hidden text-center space-y-8"
                        >
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                <Smartphone className="w-48 h-48 rotate-12" />
                            </div>
                            
                            <div className="w-24 h-24 rounded-[2.5rem] gradient-primary flex items-center justify-center text-white shadow-2xl shadow-primary/30 mx-auto">
                                <Sparkles className="w-12 h-12 animate-pulse" />
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">Coming Soon</h2>
                                <p className="text-xl text-muted-foreground font-medium max-w-lg mx-auto leading-relaxed">
                                    We're putting the finishing touches on our mobile experience. Subscribe to be notified when we launch on Android & iOS.
                                </p>
                            </div>

                            <div className="pt-6">
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-10 py-5 rounded-[2rem] gradient-primary text-white font-black text-lg shadow-2xl shadow-primary/40 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
                                >
                                    Back to Home
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-muted-foreground text-xs font-medium max-w-md mx-auto py-12"
                    >
                        <p>Our app is verified and secure. No hidden trackers, just shopping.</p>
                        <div className="flex justify-center gap-4 mt-6">
                            <span className="text-primary hover:underline cursor-pointer" onClick={() => navigate('/privacy')}>Privacy Center</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-primary hover:underline cursor-pointer" onClick={() => navigate('/terms')}>Terms of Use</span>
                        </div>
                    </motion.div>
                </section>
            </main>
        </div>
    );
};

export default DownloadPage;
