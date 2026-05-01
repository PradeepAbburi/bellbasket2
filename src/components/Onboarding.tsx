import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
    Globe,
    Search,
    ArrowRight,
    MapPin,
    ShoppingBag,
    CreditCard,
    Package,
    Map,
    CheckCircle2,
    PlusCircle,
    Bell,
    Languages,
    X
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { ALL_LANGUAGES } from '@/constants/languages';
import { useTranslation } from 'react-i18next';

const Onboarding = () => {
    const { user, updateUser } = useApp();
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [step, setStep] = useState(0); // 0: Language, 1+: Tutorial
    const [selectedLang, setSelectedLang] = useState(user?.language || 'English');
    const [searchQuery, setSearchQuery] = useState('');
    const [isFinishing, setIsFinishing] = useState(false);

    const handleLanguageSelect = (lang: string) => {
        setSelectedLang(lang);
        i18n.changeLanguage(lang);
    };

    if (!user || user.hasCompletedOnboarding) return null;
    
    // Only show onboarding on the main dashboard/home pages
    if (user.role === 'vendor' && location.pathname !== '/vendor') return null;
    if (user.role === 'customer' && location.pathname !== '/browse') return null;

    const filteredLanguages = ALL_LANGUAGES.filter(lang =>
        lang.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => Math.max(0, prev - 1));

    const handleFinish = async () => {
        setIsFinishing(true);
        try {
            await updateUser({
                language: selectedLang,
                hasCompletedOnboarding: true
            });
            toast.success("Welcome aboard!", {
                description: "You can change your language anytime in the profile page."
            });
        } catch (error) {
            toast.error("Failed to save your preferences.");
        } finally {
            setIsFinishing(false);
        }
    };

    const customerSteps = [
        {
            title: "Select Language",
            description: "Choose your preferred language for the app experience.",
            icon: <Globe className="w-12 h-12 text-primary" />,
            content: (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search languages..."
                            className="pl-10"
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto grid grid-cols-2 gap-2 pr-2 custom-scrollbar">
                        {filteredLanguages.map(lang => (
                            <button
                                key={lang}
                                onClick={() => handleLanguageSelect(lang)}
                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${selectedLang === lang
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-secondary/50 border-transparent hover:border-muted-foreground/20'
                                    }`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            )
        },
        {
            title: t('onboarding.customer.location_title'),
            description: t('onboarding.customer.location_desc'),
            icon: <MapPin className="w-12 h-12 text-blue-500" />,
            features: [t('common.pickup'), "Get accurate distances", "Check store availability"]
        },
        {
            title: t('onboarding.customer.search_title'),
            description: t('onboarding.customer.search_desc'),
            icon: <ShoppingBag className="w-12 h-12 text-emerald-500" />,
            features: [t('common.search'), t('common.checkout'), "Simple checkout"]
        },
        {
            title: t('onboarding.customer.wait_title'),
            description: t('onboarding.customer.wait_desc'),
            icon: <Bell className="w-12 h-12 text-amber-500" />,
            features: ["Real-time order status", "In-app alerts", "Ready alert"]
        },
        {
            title: t('onboarding.customer.pickup_title'),
            description: t('onboarding.customer.pickup_desc'),
            icon: <Map className="w-12 h-12 text-indigo-500" />,
            features: ["In-app store map", "Unique 4-digit PIN", t('common.pay')]
        }
    ];

    const vendorSteps = [
        {
            title: t('onboarding.vendor.language_title'),
            description: t('onboarding.vendor.language_desc'),
            icon: <Globe className="w-12 h-12 text-primary" />,
            content: (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('common.search')}
                            className="pl-10"
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto grid grid-cols-2 gap-2 pr-2 custom-scrollbar">
                        {filteredLanguages.map(lang => (
                            <button
                                key={lang}
                                onClick={() => handleLanguageSelect(lang)}
                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${selectedLang === lang
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-secondary/50 border-transparent hover:border-muted-foreground/20'
                                    }`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            )
        },
        {
            title: t('onboarding.vendor.products_title'),
            description: t('onboarding.vendor.products_desc'),
            icon: <PlusCircle className="w-12 h-12 text-primary" />,
            features: ["Add name & price", "Detailed descriptions", "Manage inventory"]
        },
        {
            title: t('onboarding.vendor.orders_title'),
            description: t('onboarding.vendor.orders_desc'),
            icon: <Package className="w-12 h-12 text-emerald-500" />,
            features: ["Accept orders", "Start packing", "Notify customers"]
        },
        {
            title: t('onboarding.vendor.pack_title'),
            description: t('onboarding.vendor.pack_desc'),
            icon: <CheckCircle2 className="w-12 h-12 text-amber-500" />,
            features: ["Write PIN on cover", "Write cost on cover", "Set status to Packed"]
        },
        {
            title: t('onboarding.vendor.handover_title'),
            description: t('onboarding.vendor.handover_desc'),
            icon: <CreditCard className="w-12 h-12 text-indigo-500" />,
            features: ["Verify 4-digit PIN", t('common.pay'), "Complete handover"]
        }
    ];

    const steps = user.role === 'vendor' ? vendorSteps : customerSteps;
    const currentStep = steps[step];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-lg bg-card border shadow-2xl rounded-[2.5rem] overflow-hidden relative"
            >
                <div className="p-8 md:p-12">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center space-y-4 mb-8">
                        <div className="p-4 rounded-3xl bg-secondary/50 ring-1 ring-border">
                            {currentStep.icon}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black">{currentStep.title}</h2>
                            <p className="text-muted-foreground text-sm max-w-[280px]">
                                {currentStep.description}
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="min-h-[300px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {currentStep.content ? (
                                    currentStep.content
                                ) : (
                                    <div className="grid gap-3">
                                        {currentStep.features?.map((f, i) => (
                                            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/30 border border-transparent hover:border-primary/10 transition-colors">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                <span className="text-sm font-semibold">{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 flex items-center justify-between gap-4">
                        <div className="flex gap-1">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary' : 'w-2 bg-muted'
                                        }`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-2">
                            {step > 0 && (
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    className="rounded-xl font-bold"
                                >
                                    {t('common.back')}
                                </Button>
                            )}
                            {step < steps.length - 1 ? (
                                <Button
                                    onClick={handleNext}
                                    className="rounded-xl font-bold gradient-primary shadow-lg shadow-primary/20 px-6"
                                >
                                    {t('common.next')}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleFinish}
                                    disabled={isFinishing}
                                    className="rounded-xl font-bold gradient-primary shadow-lg shadow-primary/20 px-8"
                                >
                                    {isFinishing ? "..." : t('common.finish')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Onboarding;
