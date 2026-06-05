import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Store, ShoppingCart, MapPin, Bell, ShieldCheck, ArrowRight, CheckCircle2, ArrowLeft, HeartHandshake, TrendingUp, Truck, Headphones, Sparkles, Clock, Lock, MessageSquare, ExternalLink } from 'lucide-react';
import { Helmet } from 'react-helmet';

const About = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen gradient-warm">
            <Helmet>
                <title>About BellBasket | Premium Hyper-Local Digital Marketplace</title>
                <meta name="description" content="Discover BellBasket, India's leading hyper-local digital marketplace. Digitizing neighborhood kirana stores, fresh groceries, and verified local home services (AC repair, plumbing, salons) under a strict 15km hyperlocal radius." />
                <meta name="keywords" content="hyper-local digital marketplace, hyperlocal marketplace near me, neighborhood stores, neighborhood shops, local grocery shopping, neighborhood kirana stores, AC repair near me, local plumber service, salon near me, local marketplace app, digital India shop, support local business" />
                <meta property="og:title" content="About BellBasket | The Leading Hyper-Local Digital Marketplace" />
                <meta property="og:description" content="Discover how BellBasket empowers neighborhood shops and essential service providers to build online storefronts, giving customers ultimate local convenience." />
                <meta property="og:url" content="https://bellbasket.com/about" />
                <link rel="canonical" href="https://bellbasket.com/about" />
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "AboutPage",
                        "name": "About BellBasket - Hyper-Local Digital Marketplace",
                        "description": "BellBasket is India's premium hyper-local digital marketplace that digitizes neighborhood kirana stores and verified local home services, empowering vendors to grow while providing customers safe, fast local pickup options.",
                        "url": "https://bellbasket.com/about",
                        "publisher": {
                            "@type": "Organization",
                            "name": "BellBasket"
                        },
                        "mainEntity": [
                            {
                                "@type": "Question",
                                "name": "What is BellBasket?",
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": "BellBasket is a premium hyper-local digital marketplace that enables customers to browse, order, and schedule services directly from verified neighborhood vendors and home service technicians."
                                }
                            },
                            {
                                "@type": "Question",
                                "name": "What is the 'Ask' AI Assistant?",
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": "Ask is BellBasket's natural-language conversational AI assistant that helps neighborhood customers locate verified shops, repair services, or specific products and compares prices locally using advanced semantic search."
                                }
                            }
                        ]
                    })}
                </script>
            </Helmet>

            <div className="pt-8 pb-32 px-4 max-w-6xl mx-auto space-y-24">

                {/* Back Button & Logo */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <div className="text-2xl font-black text-foreground tracking-tighter glass px-4 py-2 rounded-full border border-white/20">
                        BellBasket
                    </div>
                </div>

                {/* Intro Section */}
                <div className="text-center space-y-6 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 glass rounded-full px-5 py-2.5 border border-primary/20 bg-primary/5 text-primary">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Premium Hyper-local Digital Marketplace</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-[1.1] tracking-tight">
                        Connecting Bharat to its <span className="text-gradient">Hyper-local</span> neighborhood
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto font-medium">
                        BellBasket is India's leading **hyper-local digital marketplace** for neighborhood stores and essential services. We empower local neighborhood vendors (Kirana shops, medical dispensaries, home repair, salons) to build online storefronts, enabling neighborhood communities to buy fresh products and schedule local services instantly with high convenience.
                    </p>
                </div>

                {/* Section 1: The Core Mission & Vision */}
                <div className="grid md:grid-cols-2 gap-8">
                    <section className="bg-white/40 dark:bg-slate-900/40 rounded-[3rem] p-8 md:p-12 border border-white/50 shadow-xl overflow-hidden relative">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                        <div className="space-y-6 relative z-10">
                            <h2 className="text-3xl font-black text-foreground underline decoration-primary/30 underline-offset-8">Mission</h2>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                To revolutionize local commerce by bridging the gap between neighborhood vendors and modern consumers, ensuring every kirana store has the power of a global marketplace.
                            </p>
                            <div className="flex items-center gap-4 text-primary font-bold bg-primary/5 px-4 py-2 rounded-xl w-fit">
                                <HeartHandshake className="w-6 h-6" /> Support Local
                            </div>
                        </div>
                    </section>

                    <section className="bg-white/40 dark:bg-slate-900/40 rounded-[3rem] p-8 md:p-12 border border-white/50 shadow-xl overflow-hidden relative">
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />
                        <div className="space-y-6 relative z-10">
                            <h2 className="text-3xl font-black text-foreground underline decoration-accent/30 underline-offset-8">Vision</h2>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                To build a world where the convenience of digital shopping strengthens rather than replaces local neighborhoods, creating a sustainable and prosperous ecosystem for all.
                            </p>
                            <div className="flex items-center gap-4 text-accent font-bold bg-accent/5 px-4 py-2 rounded-xl w-fit">
                                <TrendingUp className="w-6 h-6" /> Empowering Bharat
                            </div>
                        </div>
                    </section>
                </div>



                {/* Section: Our Core Values */}
                <section className="py-20 px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-4xl md:text-5xl font-black text-foreground">Our Core Values</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">The principles that drive every decision we make at BellBasket.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { icon: HeartHandshake, title: "Community First", color: "text-red-500", bg: "bg-red-500/10" },
                                { icon: ShieldCheck, title: "Absolute Trust", color: "text-blue-500", bg: "bg-blue-500/10" },
                                { icon: Sparkles, title: "Hyper Innovation", color: "text-purple-500", bg: "bg-purple-500/10" },
                                { icon: TrendingUp, title: "Owner Empowerment", color: "text-green-500", bg: "bg-green-500/10" }
                            ].map((value, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ y: -5 }}
                                    className="glass p-8 rounded-[2.5rem] text-center border-t-4 border-primary/20 space-y-4"
                                >
                                    <div className={`w-14 h-14 rounded-2xl ${value.bg} flex items-center justify-center ${value.color} mx-auto`}>
                                        <value.icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-black">{value.title}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">Dedicated to preserving and growing local commerce through technology.</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Section 3: How Shoppers Use BellBasket */}
                <section className="space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-black text-foreground">How Shoppers Use BellBasket</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Everything you need, available instantly from the stores right around your corner. Here's how to get started:</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="glass rounded-[2rem] p-8 space-y-4 hover:border-primary/30 transition-all text-center">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                                <MapPin className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Set Location</h3>
                            <p className="text-sm text-muted-foreground">Pin your exact location or search your area to discover all the verified local stores near you.</p>
                        </div>

                        <div className="glass rounded-[2rem] p-8 space-y-4 hover:border-primary/30 transition-all text-center">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                                <ShoppingCart className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Fill Your Basket</h3>
                            <p className="text-sm text-muted-foreground">Browse through live catalogs of local stores, compare prices, and seamlessly add items to your cart.</p>
                        </div>

                        <div className="glass rounded-[2rem] p-8 space-y-4 hover:border-primary/30 transition-all text-center">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                                <Clock className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Self Pickup</h3>
                            <p className="text-sm text-muted-foreground">Currently we support Store Pickup exclusively. Place your order and visit the store at your convenience to collect your items.</p>
                        </div>
                    </div>
                </section>

                {/* Section: Meet 'Ask' — Your Local AI Assistant */}
                <section className="space-y-16 py-12 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
                    
                    <div className="text-center space-y-4 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-500 dark:text-purple-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-purple-500/20">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Conversational Commerce
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-foreground">Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 animate-gradient">"Ask"</span> — Your Local AI Assistant</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                            Say goodbye to complicated filters. BellBasket's next-generation "Ask" assistant brings advanced AI models to hyper-local commerce, making neighborhood shopping as simple as sending a chat message.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
                        {/* Interactive Feature Cards */}
                        <div className="space-y-6">
                            {[
                                { 
                                    icon: MessageSquare, 
                                    title: "Natural Language Queries", 
                                    desc: "Ask naturally, just like speaking to a friendly shopkeeper: 'Which pharmacy nearby has pediatric cough syrup in stock?' or 'Cheapest organic grocery stores around.'", 
                                    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" 
                                },
                                { 
                                    icon: Sparkles, 
                                    title: "Typo-Tolerant Fuzzy Match", 
                                    desc: "No spelling stress. Whether you spell it 'restrant', 'biriyani', or 'kirana', our intelligent spelling engine identifies the correct search terms instantly.", 
                                    color: "text-amber-500 bg-amber-500/10 border-amber-500/20" 
                                },
                                { 
                                    icon: MapPin, 
                                    title: "Strict 15km Hyper-local Limit", 
                                    desc: "Absolute neighborhood focus. Your search queries strictly target stores and home services within a 15km delivery/pickup radius, keeping options extremely relevant.", 
                                    color: "text-rose-500 bg-rose-500/10 border-rose-500/20" 
                                },
                                { 
                                    icon: Clock, 
                                    title: "Live Web & Catalog Fusion", 
                                    desc: "Fresh, real-time results. Ask integrates active neighborhood store catalogs with real-time web scraping so you get immediate, up-to-date availability and general advice.", 
                                    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" 
                                }
                            ].map((feature, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ x: 8 }}
                                    className="flex gap-4 p-5 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-white/5 shadow-md transition-all group"
                                >
                                    <div className={`w-12 h-12 rounded-2xl ${feature.color} border flex items-center justify-center shrink-0`}>
                                        <feature.icon className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-black text-sm uppercase tracking-wide text-foreground group-hover:text-primary transition-colors">{feature.title}</h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Visual Mockup Frame */}
                        <div className="relative p-1">
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-amber-500/20 rounded-[3rem] blur-2xl" />
                            <div className="relative bg-black rounded-[2.5rem] border border-white/10 shadow-2xl p-6 overflow-hidden flex flex-col h-[520px]">
                                {/* Chat Header */}
                                <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                            <Sparkles className="w-5 h-5 animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-xs uppercase tracking-wider text-white">Ask AI Assistant</h4>
                                            <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Online & Ready</p>
                                        </div>
                                    </div>
                                    <Link 
                                        to="/ask"
                                        className="text-[9px] font-black uppercase tracking-widest bg-white/10 hover:bg-primary hover:text-black border border-white/10 px-3 py-2 rounded-xl transition-all flex items-center gap-1 text-white/80"
                                    >
                                        Try Now <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>

                                {/* Chat Bubbles */}
                                <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left scrollbar-thin">
                                    <div className="flex flex-col gap-1 max-w-[85%]">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-white/30 ml-2">Customer</span>
                                        <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3.5 text-xs text-white/90 font-medium leading-relaxed">
                                            Hi! I need to fix my cooling issues. Can you find an AC repair service near me?
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 max-w-[85%] ml-auto items-end">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-purple-400 mr-2">Ask AI</span>
                                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl rounded-tr-none p-3.5 text-xs text-purple-200 font-medium leading-relaxed">
                                            Hello! 🛠️ I found 3 highly-rated AC Repair technicians within 10km of your location:
                                            <ul className="list-disc pl-4 mt-2 space-y-1.5 text-white/80">
                                                <li><span className="font-extrabold text-white">CoolTech Solutions</span> (1.2 km) - 4.9 ★</li>
                                                <li><span className="font-extrabold text-white">QuickFix Electricals</span> (4.5 km) - 4.7 ★</li>
                                            </ul>
                                            You can book a home visit instantly below!
                                        </div>
                                    </div>

                                    {/* Inline Interactive Card Mockup */}
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 max-w-[85%] ml-auto">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <div className="truncate">
                                                <h5 className="text-[10px] font-black text-white truncate">CoolTech AC Servicing</h5>
                                                <p className="text-[8px] text-muted-foreground font-bold">₹499 &bull; Available Today</p>
                                            </div>
                                        </div>
                                        <Link to="/ask" className="bg-primary text-black font-black uppercase tracking-wider text-[8px] px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                            Request
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Technology & Innovation */}
                <section className="relative py-20 overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 -skew-y-3" />
                    <div className="relative max-w-6xl mx-auto px-4 text-center space-y-12">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20">
                            Engineering Excellence
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-foreground">Powered by Innovation</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-5xl font-black text-primary">0.5s</h3>
                                <p className="font-bold uppercase tracking-widest text-xs">Search Latency</p>
                                <p className="text-sm text-muted-foreground">Lightning-fast discovery using hyper-optimized indexing.</p>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-5xl font-black text-accent">99.9%</h3>
                                <p className="font-bold uppercase tracking-widest text-xs">Uptime</p>
                                <p className="text-sm text-muted-foreground">High availability infrastructure for seamless shopping.</p>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-5xl font-black text-primary">256-bit</h3>
                                <p className="font-bold uppercase tracking-widest text-xs">Encryption</p>
                                <p className="text-sm text-muted-foreground">Military-grade protection for every transaction.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Community Impact */}
                <section className="py-20 px-4">
                    <div className="max-w-6xl mx-auto bg-foreground text-background rounded-[4rem] p-8 md:p-20 relative overflow-hidden">
                        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
                        <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
                            <div className="space-y-8">
                                <h2 className="text-4xl lg:text-5xl font-black leading-tight">Beyond just a <br /><span className="text-primary">Marketplace.</span></h2>
                                <p className="text-lg opacity-80 leading-relaxed">
                                    We are committed to the social and economic welfare of our vendors. From specialized health insurance for store staff to micro-loans for shop modernization, we grow together.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold opacity-90">Staff Welfare Programs</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold opacity-90">Clean Energy Initatives</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold opacity-90">Digital Literacy Workshops</span>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800" alt="Local Market Scene" className="rounded-[2.5rem] shadow-2xl h-[400px] w-full object-cover" />
                                <div className="absolute -bottom-6 -left-6 glass text-foreground p-6 rounded-2xl border-2 border-primary/20 hidden lg:block">
                                    <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">Impact Goal 2026</p>
                                    <p className="text-xl font-bold">1 Million Stores Digitized</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Trust & Safety */}
                <section className="py-12">
                    <div className="text-center space-y-4 mb-12 px-4">
                        <h2 className="text-4xl font-black text-foreground tracking-tight">Trust & <span className="text-primary">Safety</span></h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">Building the foundation of a secure marketplace for everyone.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                        {[
                            { icon: Lock, title: "Secure Data", desc: "Your data is encrypted and never shared with third-party advertisers." },
                            { icon: ShieldCheck, title: "Verified Vendors", desc: "Every shop on our platform undergoes a rigorous 15-point verification process." },
                            { icon: MessageSquare, title: "Open Reviews", desc: "Real reviews from real neighborhood shoppers ensure transparent quality." },
                            { icon: ExternalLink, title: "Buyer Protection", desc: "We ensure your orders are fulfilled accurately or we make it right." }
                        ].map((item, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="glass rounded-3xl p-8 space-y-4 border-2 border-transparent hover:border-primary/20 transition-all"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-black text-foreground">{item.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>



                {/* Call to Action for Vendors */}
                <section className="bg-foreground text-background rounded-[3rem] p-8 md:p-16 text-center relative overflow-hidden shadow-2xl">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
                    <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                            <Store className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black leading-tight">
                            Ready to take your store <span className="text-primary">online?</span>
                        </h2>
                        <p className="text-lg opacity-80">
                            Join thousands of smart local businesses scaling up with BellBasket today. Setup takes just 5 minutes.
                        </p>
                        <button
                            onClick={() => navigate('/auth?role=vendor')}
                            className="px-8 py-5 rounded-2xl bg-primary text-white font-black text-lg hover:scale-105 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-3 mx-auto mt-8 w-full sm:w-auto"
                        >
                            Sign Up as Vendor
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default About;
