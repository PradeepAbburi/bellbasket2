import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Sparkles, Smartphone, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import Header from '@/components/Header';
import QRCodeWithLogo from '@/components/ui/qr-code-with-logo';

const DownloadPage = () => {
    const navigate = useNavigate();



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
                                <Smartphone className="w-12 h-12" />
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">BellBasket for Android</h2>
                                <p className="text-lg text-muted-foreground font-medium max-w-lg mx-auto leading-relaxed">
                                    Direct official APK release. Experience ultra-fast neighborhood shopping, live tracking, and instant store connectivity.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto py-4">
                                <div className="p-3 glass rounded-2xl border border-white/10 text-center">
                                    <div className="text-xs text-muted-foreground font-semibold">Version</div>
                                    <div className="text-base font-black text-primary">v1.0.0</div>
                                </div>
                                <div className="p-3 glass rounded-2xl border border-white/10 text-center">
                                    <div className="text-xs text-muted-foreground font-semibold">File Size</div>
                                    <div className="text-base font-black text-foreground">7.6 MB</div>
                                </div>
                                <div className="p-3 glass rounded-2xl border border-white/10 text-center">
                                    <div className="text-xs text-muted-foreground font-semibold">Requires</div>
                                    <div className="text-base font-black text-foreground">Android 6+</div>
                                </div>
                                <div className="p-3 glass rounded-2xl border border-white/10 text-center">
                                    <div className="text-xs text-muted-foreground font-semibold">Security</div>
                                    <div className="text-base font-black text-emerald-500 flex items-center justify-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full sm:w-auto px-10 py-5 rounded-[2rem] gradient-primary text-white font-black text-lg shadow-2xl shadow-primary/40 hover:scale-[1.03] active:scale-95 transition-all"
                                >
                                    Use Web Version
                                </button>
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/10 flex flex-col items-center gap-4">
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <QrCode className="w-4 h-4 text-primary" /> Scan QR Code to Download on Mobile
                                </div>
                                <div className="p-4 bg-white rounded-3xl shadow-xl border border-border">
                                    <QRCodeWithLogo value={downloadUrl} size={160} logoSize={35} />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* How to Install Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-3xl mx-auto text-left glass rounded-3xl p-8 border border-white/10 space-y-4"
                    >
                        <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" /> How to install the APK:
                        </h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground font-medium">
                            <li>Open the APK installer file on your device.</li>
                            <li>Open your device's <strong>Downloads</strong> folder or tap the notification when download completes.</li>
                            <li>If prompted, allow your browser to <strong>"Install unknown apps"</strong> or enable "Allow from this source".</li>
                            <li>Tap <strong>Install</strong> and enjoy BellBasket on your Android phone!</li>
                        </ol>
                    </motion.div>

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
