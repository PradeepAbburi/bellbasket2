import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Helmet } from 'react-helmet';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <Helmet>
        <title>404 - Page Not Found | BellBasket</title>
        <meta name="description" content="The page you are looking for doesn't exist. Return to BellBasket to continue shopping from your neighborhood stores." />
      </Helmet>

      {/* Background Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10"
      >
        <div className="relative inline-block mb-8">
          <motion.h1 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-[12rem] font-black leading-none text-primary/10 select-none"
          >
            404
          </motion.h1>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center shadow-xl shadow-primary/20 rotate-12">
               <Search className="w-10 h-10 text-primary-foreground -rotate-12" />
             </div>
          </div>
        </div>

        <h2 className="text-3xl font-black text-foreground mb-4 uppercase tracking-tight">Oops! Lost in the neighborhood?</h2>
        <p className="text-muted-foreground mb-12 max-w-md mx-auto leading-relaxed">
          The page you're looking for seems to have moved or doesn't exist. Let's get you back to the right store!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-border bg-background hover:bg-secondary text-foreground font-bold transition-all flex items-center justify-center gap-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </motion.div>

      {/* Support Links */}
      <div className="mt-20 grid grid-cols-2 gap-8 text-left z-10">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Quick Links</h4>
          <ul className="space-y-2">
            <li><button onClick={() => navigate('/browse')} className="text-sm font-bold text-foreground/60 hover:text-primary transition-colors">Start Shopping</button></li>
            <li><button onClick={() => navigate('/about')} className="text-sm font-bold text-foreground/60 hover:text-primary transition-colors">About Us</button></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Need Help?</h4>
          <ul className="space-y-2">
             <li><button onClick={() => navigate('/support')} className="text-sm font-bold text-foreground/60 hover:text-primary transition-colors">Contact Support</button></li>
             <li><button onClick={() => navigate('/faq')} className="text-sm font-bold text-foreground/60 hover:text-primary transition-colors">FAQs</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
