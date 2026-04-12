import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, MapPin, ShoppingCart, Store, ArrowRight, Sparkles, Smartphone, ChevronRight, Menu, X, Sun, Moon } from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';
import { useApp } from '@/context/AppContext';
import QRCodeWithLogo from '@/components/ui/qr-code-with-logo';
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';

const Index = () => {
  const navigate = useNavigate();
  const { } = useApp(); // theme/toggleTheme removed
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) {
      navigate('/browse', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen gradient-warm">
      <Helmet>
        <title>BellBasket - Pick It. Grab It.</title>
        <meta name="description" content="Discover BellBasket: Pick It. Grab It. Connect with neighborhood stores. Set your location, fill your basket with local groceries, and enjoy fast delivery or pickup." />
        <meta name="keywords" content="BellBasket, local shopping, hyper-local marketplace, support local vendors, grocery delivery" />
        <meta property="og:title" content="BellBasket - Pick It. Grab It." />
        <meta property="og:description" content="Pick It. Grab It. Find local vendors, grab fresh groceries, and get quick delivery." />
        <meta property="og:url" content="https://bellbasket.com/" />
        <link rel="canonical" href="https://bellbasket.com/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "How do I order from local stores?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Simply authorize your location or select your area. BellBasket will show you all the nearby grocery stores, bakeries, and essential shops. Add items to your cart and choose between home delivery or store pickup."
                }
              },
              {
                "@type": "Question",
                "name": "Is BellBasket available in my city?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "We are rapidly expanding across India! Currently, we are live in major neighborhoods in Delhi NCR and Andhra Pradesh. You can check availability by simply visiting the browse page."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      <header className="absolute top-24 left-0 right-0 z-0 text-center opacity-0 pointer-events-none">
        <h1>BellBasket - Hyper-local Marketplace for Neighborhood Stores | Grocery Delivery & Pick-up</h1>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-60 object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/95" />
        </div>

        {/* Landing Header */}
        <div className="absolute top-0 left-0 right-0 z-50 p-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-full border border-white/20">
              <span className="text-xl font-black text-foreground tracking-tighter">BellBasket</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">


              {/* Desktop Menu */}
              <div className="hidden md:flex items-center gap-3">
                <Link to="/careers" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors glass px-4 py-2 rounded-full border border-primary/20">
                  Careers
                </Link>
                <Link to="/about" className="text-sm font-bold text-foreground/80 hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20">
                  About
                </Link>
                <Link to="/auth" className="text-sm font-bold text-foreground/80 hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20">
                  Sign In
                </Link>
              </div>

              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl glass border border-white/20 text-foreground active:scale-95 transition-all"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Drawer */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-2 glass rounded-2xl overflow-hidden border border-white/20 max-w-[200px] ml-auto"
              >
                <div className="p-2 flex flex-col">
                  <Link to="/careers" className="px-4 py-2.5 rounded-xl hover:bg-primary/5 font-bold text-sm text-foreground transition-colors">Careers</Link>
                  <Link to="/about" className="px-4 py-2.5 rounded-xl hover:bg-white/05 font-bold text-sm text-foreground transition-colors">About</Link>
                  <Link to="/auth" className="mt-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs text-center uppercase tracking-widest">Sign In</Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 border border-white/20">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Find It. Grab It.</span>
              </div>
              <Link to="/careers" className="hidden sm:inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 border border-primary/20 hover:bg-primary/20 transition-all border-dashed">
                <span className="text-[10px] font-black uppercase tracking-widest">We're Hiring!</span>
              </Link>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-foreground leading-tight mb-6">
              Shop from<br />
              <span className="text-gradient">your neighborhood</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Discover local stores near you. Support your community vendors and get fresh products delivered or ready for pickup.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/auth')}
                className="gradient-primary text-primary-foreground px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/auth?role=vendor')}
                className="glass text-foreground px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
              >
                <Store className="w-4 h-4" /> Become a Vendor
              </button>
            </div>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={() => navigate('/download')}
              className="mt-8 flex items-center gap-2 text-sm font-bold text-foreground/60 hover:text-primary transition-colors group"
            >
              <Smartphone className="w-4 h-4" /> Download BellBasket App <ArrowRight className="w-4 h-4 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-foreground text-center mb-12"
          >
            How it works
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: 'Set Location', desc: 'Pin your location and discover stores within your neighborhood' },
              { icon: ShoppingCart, title: 'Fill Your Basket', desc: 'Browse products, add to cart and choose your payment method' },
              { icon: Bell, title: 'Get Notified', desc: 'Track your order status and pick up when ready' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass rounded-2xl p-8 text-center"
              >
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Download App Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

            <div className="flex-1 space-y-6 text-center md:text-left z-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm border border-primary/10">
                <Smartphone className="w-3.5 h-3.5" />
                Mobile App
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                Shop on-the-go with <br />
                <span className="text-gradient">BellBasket Mobile</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg">
                Get the best neighborhood shopping experience. Scanning the QR code will take you directly to our download page.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="gradient-primary text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-primary/30 flex items-center justify-center gap-3 cursor-default">
                  Coming Soon <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 z-10">
              <QRCodeWithLogo value="https://bellbasket.com/download" size={200} logoSize={45} />
              <div className="flex items-center gap-2 px-6 py-2 bg-white/10 text-foreground rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Scan to Go to Download Page
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace Backlinks Section - Discover Stores */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-foreground">Discover Our Partner Stores</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Supporting local entrepreneurs and neighborhood kirana stores. Explore the best vendors in your community.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-[2.5rem] border border-primary/10 space-y-4 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Groceries & Essentials</h3>
              <p className="text-sm text-muted-foreground">Fresh daily needs, dairy, and snacks from your trusted local kiranas.</p>
              <Link to="/browse?q=grocery" className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline pt-2">
                Explore Grocery Stores <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="glass p-8 rounded-[2.5rem] border border-blue-500/10 space-y-4 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Bakery & Sweets</h3>
              <p className="text-sm text-muted-foreground">Freshly baked bread, cakes, and traditional sweets from neighborhood bakeries.</p>
              <Link to="/browse?q=bakery" className="inline-flex items-center gap-2 text-blue-500 font-bold text-sm hover:underline pt-2">
                Explore Bakeries <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="glass p-8 rounded-[2.5rem] border border-green-500/10 space-y-4 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Fruits & Vegetables</h3>
              <p className="text-sm text-muted-foreground">Farm fresh organic produce delivered directly to your kitchen.</p>
              <Link to="/browse?q=vegetables" className="inline-flex items-center gap-2 text-green-500 font-bold text-sm hover:underline pt-2">
                Explore Fresh Markets <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Local Markets Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">Shop by Area</h2>
              <p className="text-muted-foreground">Quickly find the best groceries and essentials in these popular local areas across South India and major metros.</p>
            </div>
            <Link to="/browse" className="text-primary font-bold flex items-center gap-2 hover:underline">
              View all stores <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
              { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
              { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
              { name: "Chennai", lat: 13.0827, lng: 80.2707 },
              { name: "Kochi", lat: 9.9312, lng: 76.2673 },
              { name: "Vijayawada", lat: 16.5062, lng: 80.6480 },
              { name: "Guntur", lat: 16.3067, lng: 80.4365 },
              { name: "Warangal", lat: 17.9689, lng: 79.5941 },
              { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
              { name: "Mysuru", lat: 12.2958, lng: 76.6394 },
              { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
              { name: "Madurai", lat: 9.9252, lng: 78.1198 },
              { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
              { name: "Delhi", lat: 28.6139, lng: 77.2090 },
              { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
              { name: "Pune", lat: 18.5204, lng: 73.8567 }
            ].map(area => (
              <button
                key={area.name}
                onClick={() => {
                  localStorage.setItem('user_location_name', area.name);
                  localStorage.setItem('user_lat', area.lat.toString());
                  localStorage.setItem('user_lng', area.lng.toString());
                  navigate('/browse');
                }}
                className="glass p-6 rounded-2xl hover:border-primary/50 transition-all group text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{area.name}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white/5 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="glass p-6 rounded-2xl group cursor-pointer">
              <summary className="font-bold text-lg list-none flex justify-between items-center text-foreground">
                How do I order from local stores?
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Simply authorize your location or select your area. BellBasket will show you all the nearby grocery stores, bakeries, and essential shops. Add items to your cart and choose between home delivery or store pickup.
              </p>
            </details>
            <details className="glass p-6 rounded-2xl group cursor-pointer">
              <summary className="font-bold text-lg list-none flex justify-between items-center text-foreground">
                Is BellBasket available in my city?
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                We are rapidly expanding across India! Currently, we are live in major neighborhoods across South India (AP, TS, TN, KA, KL) and India's top metros. You can check availability by simply visiting the browse page and setting your location.
              </p>
            </details>
            <details className="glass p-6 rounded-2xl group cursor-pointer">
              <summary className="font-bold text-lg list-none flex justify-between items-center text-foreground">
                How can I list my shop on BellBasket?
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                It's easy! Click on "Become a Vendor", create your account, and set up your store profile. You can start listing products immediately. We offer Basic (Free), Growth, and Pro plans to suit your business needs.
              </p>
            </details>
            <details className="glass p-6 rounded-2xl group cursor-pointer">
              <summary className="font-bold text-lg list-none flex justify-between items-center text-foreground">
                What are the benefits of the Pro Plan for vendors?
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                The Pro Plan offers top-tier visibility with "Sponsored" tags, featured placement at the top of search results, advanced sales analytics, and the ability to add custom discount tags to products.
              </p>
            </details>
          </div>
        </div>
      </section>

      <footer className="py-12 md:py-20 px-4 border-t border-border bg-transparent">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2 md:col-span-1 space-y-4">
            <span className="font-extrabold text-2xl text-foreground tracking-tighter">BellBasket</span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your neighborhood's favorite local marketplace. Shopping local has never been easier.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">Top Stores & Areas</h4>
            <ul className="space-y-2">
              {[
                { name: "SVR Supermarket, VSP", path: "/browse?q=SVR" },
                { name: "Heritage Fresh, HYD", path: "/browse?q=Heritage" },
                { name: "Nilgiris, BLR", path: "/browse?q=Nilgiris" },
                { name: "Ratnadeep, HYD", path: "/browse?q=Ratnadeep" },
                { name: "Big Bazaar, VJW", path: "/browse?q=Bazaar" }
              ].map(store => (
                <li key={store.name}>
                  <Link to={store.path} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {store.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/leadership" className="text-sm text-muted-foreground hover:text-primary transition-colors">Leadership</Link></li>
              <li><Link to="/careers" className="text-sm text-muted-foreground hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sign In</Link></li>
              <li><Link to="/auth?role=vendor" className="text-sm text-muted-foreground hover:text-primary transition-colors">Become a Vendor</Link></li>
              <li><Link to="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">Newsletter</h4>
            <p className="text-xs text-muted-foreground mb-4">Get updates on new local stores in your area.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email" className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary" />
              <button className="bg-primary text-white p-2 rounded-lg"><ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border/10">
          <p className="text-xs text-muted-foreground">© 2026 BellBasket. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Proudly Made in India</span>
          </div>
        </div>
      </footer>
    </div >
  );
};

export default Index;


