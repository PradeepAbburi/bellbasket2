import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Store, ShoppingCart, MapPin, Bell, ShieldCheck, ArrowRight, CheckCircle2, ArrowLeft, HeartHandshake, TrendingUp, Truck, Headphones, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet';

const About = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen gradient-warm">
            <Helmet>
                <title>About BellBasket | How it Works for Shoppers & Vendors</title>
                <meta name="description" content="Discover how BellBasket works. We empower local neighborhood stores to sell online and enable customers to shop fresh groceries and daily essentials directly from kirana shops and local vendors." />
                <meta name="keywords" content="BellBasket, how it works, local shopping app, grocery delivery, support local business, neighborhood kirana stores, become a vendor, sell groceries online" />
                <meta property="og:title" content="About BellBasket | How it Works" />
                <meta property="og:description" content="Discover how BellBasket digitizes neighborhood kirana stores, empowering vendors and giving customers the convenience of local shopping." />
                <meta property="og:url" content="https://bellbasket.com/about" />
                <link rel="canonical" href="https://bellbasket.com/about" />
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "AboutPage",
                        "name": "About BellBasket",
                        "description": "BellBasket is a hyper-local marketplace that empowers local stores to sell online and enables customers to shop fresh groceries and daily essentials directly from their trusted neighborhood vendors.",
                        "url": "https://bellbasket.com/about",
                        "publisher": {
                            "@type": "Organization",
                            "name": "BellBasket"
                        },
                        "mainEntity": {
                            "@type": "ItemList",
                            "itemListElement": [
                                {
                                    "@type": "ListItem",
                                    "position": 1,
                                    "name": "How it Works for Shoppers",
                                    "description": "Shoppers can set their location, browse products from verified local stores, add items to their basket, and choose between fast delivery or store pickup."
                                },
                                {
                                    "@type": "ListItem",
                                    "position": 2,
                                    "name": "How it Works for Vendors",
                                    "description": "Vendors can set up a digital storefront in minutes, manage products and inventory instantly, receive orders securely, and boost visibility using Pro features."
                                },
                                {
                                    "@type": "ListItem",
                                    "position": 3,
                                    "name": "Trust & Security",
                                    "description": "All vendors are verified and transactions are secured using industry-leading encryption to ensure a safe local shopping environment."
                                }
                            ]
                        }
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
                        <span className="text-xs font-black uppercase tracking-widest">About BellBasket Marketplace</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-[1.1] tracking-tight">
                        Connecting Bharat to its <span className="text-gradient">Neighborhood</span>
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto font-medium">
                        BellBasket is India's premier hyper-local marketplace. We empower local neighborhood stores (Kiranas) to sell online, enabling customers to shop fresh groceries and daily essentials directly from their trusted community vendors with fast, reliable delivery.
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

                {/* Section 2: Our Journey Timeline */}
                <section className="space-y-16 py-12">
                   <div className="text-center space-y-4">
                        <h2 className="text-4xl font-black text-foreground">Our Journey So Far</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">From a small idea to a growing hyper-local network. Here are our major milestones.</p>
                    </div>

                    <div className="max-w-4xl mx-auto relative px-4">
                        {/* Vertical Line */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 via-accent/50 to-primary/50 hidden md:block" />

                        <div className="space-y-12">
                            {[
                                { year: "2023", title: "The Inception", desc: "BellBasket was born out of the need to help local vendors survive in a shrinking physical market." },
                                { year: "2024", title: "First 100 Vendors", desc: "Successfully onboarded our first 100 trusted neighborhood stores across South India." },
                                { year: "2025", title: "Nationwide Expansion", desc: "Launched across major metro cities, bringing thousands of daily essential products online." },
                                { year: "2026", title: "AI-Powered Marketplace", desc: "Integrated advanced analytics and AI-driven discovery to help vendors grow 2x faster." }
                            ].map((milestone, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    className="flex flex-col md:flex-row items-center gap-4 md:gap-8"
                                >
                                    {/* Content on Left for Even, Empty for Odd */}
                                    <div className="flex-1 w-full text-center md:text-right">
                                        {idx % 2 === 0 ? (
                                             <div className="glass p-6 md:p-8 rounded-[2rem] border border-primary/20 hover:border-primary/50 transition-all">
                                                <span className="text-primary font-black text-2xl">{milestone.year}</span>
                                                <h3 className="text-xl font-bold mt-2">{milestone.title}</h3>
                                                <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{milestone.desc}</p>
                                             </div>
                                        ) : (
                                            <div className="hidden md:block" />
                                        )}
                                    </div>

                                    {/* Central Number Circle */}
                                    <div className="w-12 h-12 rounded-full gradient-primary border-4 border-background z-10 flex items-center justify-center text-white font-black shadow-xl shrink-0">
                                        {idx + 1}
                                    </div>

                                    {/* Content on Right for Odd, Empty for Even */}
                                    <div className="flex-1 w-full text-center md:text-left">
                                        {idx % 2 !== 0 ? (
                                             <div className="glass p-6 md:p-8 rounded-[2rem] border border-accent/20 hover:border-accent/50 transition-all">
                                                <span className="text-accent font-black text-2xl">{milestone.year}</span>
                                                <h3 className="text-xl font-bold mt-2">{milestone.title}</h3>
                                                <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{milestone.desc}</p>
                                             </div>
                                        ) : (
                                            <div className="hidden md:block" />
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

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

                {/* Section: Meet the Leadership */}
                <section className="py-20 bg-foreground/5 dark:bg-foreground/[0.02] rounded-[4rem] mx-4">
                    <div className="max-w-6xl mx-auto px-8 space-y-20">
                        <div className="flex flex-col md:flex-row items-end justify-between gap-8">
                            <div className="space-y-4">
                                <h2 className="text-4xl md:text-5xl font-black text-foreground">The Minds Behind <br />the <span className="text-primary">Vision.</span></h2>
                                <p className="text-muted-foreground max-w-sm">A diverse team of engineers, designers, and local business advocates.</p>
                            </div>
                            <button onClick={() => navigate('/careers')} className="px-8 py-4 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all">Join the team</button>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12">
                            {[
                                { name: "Pradeep Abburi", role: "Founder & CEO", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80", bio: "Serial entrepreneur with a heart for local commerce." },
                                { name: "Sarah Chen", role: "CTO", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80", bio: "Leading AI and distributed systems architecture." },
                                { name: "Marcus Thorne", role: "Head of Operations", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80", bio: "Streamlining logistics for 10,000+ local partners." }
                            ].map((person, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="group"
                                >
                                    <div className="aspect-[4/5] rounded-[3rem] overflow-hidden mb-6 relative">
                                        <img src={person.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={person.name} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end p-8">
                                            <p className="text-white text-sm italic">"{person.bio}"</p>
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-foreground">{person.name}</h3>
                                    <p className="text-primary font-black uppercase tracking-widest text-xs mt-1">{person.role}</p>
                                </motion.div>
                            ))}
                        </div>
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
