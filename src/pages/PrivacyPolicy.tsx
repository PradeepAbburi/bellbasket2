import { motion } from 'framer-motion';
import { Shield, ChevronLeft, Lock, Eye, FileText, Database, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    const sections = [
        {
            icon: Eye,
            title: 'Information We Collect',
            content: 'We collect information you provide directly to us, such as when you create an account, place an order, or communicate with us. This includes your name, email address, phone number, and location data to facilitate local shopping. We also automatically collect certain information when you use our services, including device information, IP address, and usage patterns.'
        },
        {
            icon: Database,
            title: 'How We Use Information',
            content: 'We use the information we collect to provide, maintain, and improve our services, including to process transactions, send order updates, and personalize your shopping experience. Specifically, your location helps us show you nearby stores, and your contact details allow vendors to reach out regarding your orders.'
        },
        {
            icon: Shield,
            title: 'Data Sharing & Disclosure',
            content: 'We do not sell your personal information. We share your data only with third-party vendors (like payment processors and store owners) necessary to fulfill your orders, or when required by law. All third-party partners are vetted for security compliance.'
        },
        {
            icon: Globe,
            title: 'Hyperlocal Data Usage',
            content: 'BellBasket is a hyperlocal marketplace. We use your GPS location or selected area to show you nearby stores and calculate delivery/pickup distances. This data is only used during active sessions or saved to your profile for your convenience if you choose.'
        },
        {
            icon: Lock,
            title: 'Your Privacy Rights',
            content: 'You have the right to access, correct, or delete your personal data at any time. You can manage your information through your profile settings or by contacting our support team. You may also opt-out of promotional communications.'
        },
        {
            icon: Shield,
            title: 'Data Security & Retention',
            content: 'We implement industry-standard security measures including SSL encryption and secure cloud storage (Firebase). We retain your information for as long as your account is active or as needed to provide you services and comply with legal obligations.'
        }
    ];

    return (
        <div className="min-h-screen gradient-warm">
            <Helmet>
                <title>Privacy Policy - BellBasket</title>
                <meta name="description" content="Learn about how BellBasket collects, uses, and protects your data. Your privacy is our priority." />
            </Helmet>

            <div className="pt-20 pb-20 px-4 max-w-4xl mx-auto">
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-primary font-bold mb-8 hover:gap-3 transition-all group"
                >
                    <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    Back
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-[2rem] p-8 md:p-12 border border-white/20 shadow-2xl relative overflow-hidden"
                >
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -ml-32 -mb-32" />

                    <div className="flex items-center gap-6 mb-12 relative z-10">
                        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white shrink-0 shadow-lg rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            <Shield className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-foreground tracking-tight">Privacy Policy</h1>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">Last updated: March 12, 2026</p>
                        </div>
                    </div>

                    <div className="space-y-12 relative z-10">
                        {sections.map((section, i) => (
                            <motion.div
                                key={section.title}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="group/item"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all duration-300">
                                        <section.icon className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-2xl font-black text-foreground tracking-tight">{section.title}</h2>
                                </div>
                                <p className="text-muted-foreground leading-relaxed pl-14 text-base md:text-lg">
                                    {section.content}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-20 pt-10 border-t border-border/50 text-center relative z-10">
                        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 inline-block w-full max-w-lg">
                            <p className="text-sm font-bold text-foreground mb-2 italic">
                                "Your trust is the foundation of our community."
                            </p>
                            <p className="text-sm text-muted-foreground">
                                If you have any questions or concerns, please reach out to us at{' '}
                                <a href="mailto:contact@bellbasket.com" className="text-primary font-black hover:underline tracking-tight">
                                    contact@bellbasket.com
                                </a>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};


export default PrivacyPolicy;

