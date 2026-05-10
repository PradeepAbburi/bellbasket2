import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, UserCircle, Store, ArrowRight, ArrowLeft, CheckCircle2, Lock, Phone, Zap, Shield, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { auth, db } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import heroBg from '@/assets/hero-bg.jpg';
import { initAudio } from '@/utils/notifications';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [role, setRole] = useState<'customer' | 'vendor'>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const { login, refreshUser } = useApp(); // theme/toggleTheme removed
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const returnTo = searchParams.get('returnTo');

  const isAdminEmail = email.trim().toLowerCase() === 'contact@bellbasket.com' || 
                       email.trim().toLowerCase() === 'ceo@bellbasket.com' ||
                       email.trim().toLowerCase() === 'hr@bellbasket.com';

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      const isAdminEmail = sanitizedEmail === 'contact@bellbasket.com';

      if (isAdminEmail) {
        toast.info("Password reset is disabled for the Master Admin account.");
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, sanitizedEmail);
      toast.success('Password reset link sent! Check your Spam folder if needed.');
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  // Auto-detect unverified state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isAdminOrHr = user?.email?.trim().toLowerCase() === 'contact@bellbasket.com' || 
                          user?.email?.trim().toLowerCase() === 'ceo@bellbasket.com' ||
                          user?.email?.trim().toLowerCase() === 'hr@bellbasket.com';
                          
      if (user && !user.emailVerified && !isAdminOrHr) {
        console.log("Auth: User detected but email not verified:", user.email);
        setNeedsVerification(true);
        setEmail(user.email || '');
      } else if (user && user.emailVerified) {
        console.log("Auth: User detected and email is verified:", user.email);
        setNeedsVerification(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('bb_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleResendLink = async () => {
    if (auth.currentUser) {
      setLoading(true);
      try {
        await sendEmailVerification(auth.currentUser);
        toast.success('Verification link sent! Check your Spam folder if needed.');
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const checkVerificationStatus = async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        console.log("Auth: Checking verification status for", auth.currentUser.email);
        await auth.currentUser.reload();
        console.log("Auth: After reload, emailVerified:", auth.currentUser.emailVerified);
        if (auth.currentUser.emailVerified) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() || {};
            const finalUserData = { ...userData, id: auth.currentUser.uid } as any;

            // Mark as verified in Firestore if not already
            if (!userData.isVerified) {
              await setDoc(doc(db, 'users', auth.currentUser.uid), { isVerified: true }, { merge: true });
            }

            toast.success('Signed in successfully!');
            sessionStorage.setItem('allow_onboarding', 'true');
            login({ ...finalUserData, isVerified: true });

            if (returnTo) {
              navigate(returnTo);
            } else if (finalUserData.role === 'vendor' && !finalUserData.hasSetupStore) {
              navigate('/vendor/setup');
            } else {
              navigate(finalUserData.role === 'vendor' ? '/vendor' : '/browse');
            }
          } else {
            toast.error('User data not found in database.');
          }
        } else {
          toast.error('Still not verified. Please check your Inbox and Spam folder.');
        }
      }
    } catch (error: any) {
      console.error("Verification check error:", error);
      toast.error('Failed to check verification status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      initAudio(); // Initialize audio on user gesture
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isBlocked) {
          toast.error('Your account has been suspended by the administrator.');
          setLoading(false);
          await signOut(auth);
          return;
        }

        const finalUserData = { ...userData, id: user.uid, isVerified: true } as any;
        login(finalUserData);
        toast.success('Welcome back!');

        if (returnTo) {
          navigate(returnTo);
        } else if (finalUserData.role === 'admin' || finalUserData.role === 'hr') {
          navigate(finalUserData.role === 'hr' ? '/hr' : '/admin');
        } else if (finalUserData.role === 'vendor' && !finalUserData.hasSetupStore) {
          navigate('/vendor/setup');
        } else {
          navigate(finalUserData.role === 'vendor' ? '/vendor' : '/browse');
        }
      } else {
        // Sign up logic for Google
        let hasSetupStore = false;

        const isMasterAdminEmail = (user.email?.trim().toLowerCase() === 'contact@bellbasket.com' || 
                                    user.email?.trim().toLowerCase() === 'ceo@bellbasket.com');

        const newUser = {
          id: user.uid,
          name: user.displayName || 'User',
          email: user.email || '',
          phone: '',
          role: isMasterAdminEmail ? 'admin' : role,
          createdAt: new Date().toISOString(),
          isVerified: true,
          hasCompletedOnboarding: role === 'customer',
          referralCode: role === 'vendor' ? referralCode.toUpperCase().trim() : null,
          hasSetupStore: hasSetupStore
        };

        await setDoc(doc(db, 'users', user.uid), newUser);
        login(newUser as any);
        sessionStorage.setItem('allow_onboarding', 'true');
        toast.success('Account created with Google!');

        if (role === 'vendor') {
          navigate('/vendor/setup');
        } else {
          if (returnTo) {
            navigate(returnTo);
          } else {
            navigate('/browse');
          }
        }
      }
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      toast.error(error.message || 'Google Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    initAudio(); // Initialize audio on user gesture
    setLoading(true);

    try {
      const sanitizedEmail = email.trim().toLowerCase();

      if (isLogin) {
        if (rememberMe) {
          localStorage.setItem('bb_remembered_email', sanitizedEmail);
        } else {
          localStorage.removeItem('bb_remembered_email');
        }
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        toast.error('Please enter a valid email address (e.g., name@gmail.com)');
        setLoading(false);
        return;
      }

      if (!isLogin && password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      const isAdminEmail = sanitizedEmail === 'contact@bellbasket.com' || 
                           sanitizedEmail === 'ceo@bellbasket.com' ||
                           sanitizedEmail === 'hr@bellbasket.com';
 
       if (isAdminEmail) {
         toast.info("Administrative Identity Detected", {
           description: "Verifying credentials..."
         });
 
         const isValidAdmin = (sanitizedEmail === 'ceo@bellbasket.com' && password.trim() === 'Pradeep@123') ||
                              (sanitizedEmail === 'contact@bellbasket.com' && password.trim() === 'admin123');
         const isValidHr = (sanitizedEmail === 'hr@bellbasket.com' && password.trim() === 'Vortex@hr');

         if (isValidAdmin || isValidHr) {
           const finalRole = isValidHr ? 'hr' : 'admin';
           // Attempt a real Firebase sign-in/sign-up so security rules work correctly
           try {
             try {
               console.log(`Attempting Firebase Auth for ${finalRole}...`);
               // Use a standard password for master accounts in Firebase if they don't exist
               const firebasePassword = isValidHr ? 'Vortex@hr' : (sanitizedEmail === 'ceo@bellbasket.com' ? 'Pradeep@123' : 'admin123');
               await signInWithEmailAndPassword(auth, sanitizedEmail, firebasePassword);
               console.log(`${finalRole} signed in to Firebase Successfully`);
             } catch (signInError: any) {
               console.log("Firebase Auth failed with code:", signInError.code);
               if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
                 console.log(`Initializing new Cloud Entry for ${finalRole}...`);
                 const firebasePassword = isValidHr ? 'Vortex@hr' : (sanitizedEmail === 'ceo@bellbasket.com' ? 'Pradeep@123' : 'admin123');
                 await createUserWithEmailAndPassword(auth, sanitizedEmail, firebasePassword);
                 if (auth.currentUser) {
                   await setDoc(doc(db, 'users', auth.currentUser.uid), {
                     name: finalRole === 'hr' ? 'HR Manager' : 'System Admin',
                     email: sanitizedEmail,
                     role: finalRole,
                     isVerified: true,
                     createdAt: new Date().toISOString()
                   });
                   console.log("Cloud Entry Created Successfully");
                 }
               } else {
                 throw signInError;
               }
             }
           } catch (e: any) {
             console.error("Admin/HR Firebase Sync Failure:", e);
           }

           if (finalRole === 'admin') {
             localStorage.setItem('bellbasket_admin', 'true');
             localStorage.removeItem('bellbasket_hr');
           } else {
             localStorage.setItem('bellbasket_hr', 'true');
             localStorage.removeItem('bellbasket_admin');
           }
           
           const adminUser = {
             id: auth.currentUser?.uid || `master_${finalRole}`,
             name: finalRole === 'hr' ? 'HR Manager' : 'System Admin',
             email: sanitizedEmail,
             role: finalRole as any,
             isVerified: true,
             createdAt: new Date().toISOString()
           };
           login(adminUser);
           toast.success(`${finalRole.toUpperCase()} Dashboard Access Granted`);
           navigate(finalRole === 'hr' ? '/hr' : '/admin');
           return;
         } else {
           toast.error('Invalid Credentials for Administrative Account');
           setLoading(false);
           return;
         }
       }

      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
          setNeedsVerification(true);
          toast.info('Please verify your email before logging in.');
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          if (userData.isBlocked) {
            toast.error('Your account has been suspended by the administrator.');
            setLoading(false);
            await signOut(auth);
            return;
          }

          const finalUserData = { ...userData, id: user.uid, isVerified: true } as any;
          login(finalUserData);
          toast.success('Welcome back!');

          if (returnTo) {
            navigate(returnTo);
          } else if (finalUserData.role === 'admin' || finalUserData.role === 'hr') {
            navigate('/admin');
          } else if (finalUserData.role === 'vendor' && !finalUserData.hasSetupStore) {
            navigate('/vendor/setup');
          } else {
            navigate(finalUserData.role === 'vendor' ? '/vendor' : '/browse');
          }
        } else {
          // If auth exists but firestore is missing, create a default record
          console.warn("User authenticated but document missing in Firestore. Creating default...");
          const newUser = {
            id: user.uid,
            name: user.displayName || 'User',
            email: user.email || '',
            role: 'customer' as const,
            createdAt: new Date().toISOString(),
            isVerified: true,
            hasCompletedOnboarding: true
          };
          await setDoc(doc(db, 'users', user.uid), newUser);
          login(newUser);
          toast.success('Profile initialized. Welcome!');
          if (returnTo) {
            navigate(returnTo);
          } else {
            navigate('/browse');
          }
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: name });
        await sendEmailVerification(user);

        const newUser = {
          id: user.uid,
          name,
          email: sanitizedEmail,
          phone: phone.trim(),
          role,
          createdAt: new Date().toISOString(),
          isVerified: false,
          hasCompletedOnboarding: false,
          referralCode: role === 'vendor' ? referralCode.toUpperCase().trim() : null,
        };
        await setDoc(doc(db, 'users', user.uid), newUser);

        setNeedsVerification(true);
        toast.success('Account created! Verify your email (check Spam folder if needed).');
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password. Please try again.');
      } else if (error.code === 'auth/user-not-found') {
        toast.error('Account not found. Please sign up instead.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('The email address format is invalid.');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered. Please sign in.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please use at least 6 characters.');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (needsVerification) {
    return (
      <>
        <Helmet>
          <title>Verify Email - BellBasket</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="h-screen overflow-hidden gradient-warm relative flex items-center justify-center px-4 w-full">
          {/* Background Image Setup */}
          <div className="fixed inset-0 z-0">
            <div className="absolute inset-0 bg-slate-900">
              <img src={heroBg} alt="Traditional Indian neighborhood street market" className="w-full h-full object-cover opacity-60 object-center" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/95" />
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm text-center relative z-10 max-h-[90vh] overflow-y-auto scrollbar-hide py-8">
            {/* Back Button */}
            <div className="flex justify-start mb-6 px-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            </div>
            
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <Mail className="w-10 h-10" />
              </div>
            </div>
            <h1 className="text-2xl font-black mb-2 text-foreground">Verify your email</h1>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              We've sent a link to <span className="font-bold text-foreground">{email}</span>.
              Click the link in the email to activate your account.
              <br className="my-2" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 block mt-2 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                ⚠️ If you don't see the email, please check your <strong>Spam</strong> or <strong>Junk</strong> folder.
              </span>
            </p>
            <div className="space-y-3">
              <button
                onClick={checkVerificationStatus}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                {loading ? <span className="animate-pulse tracking-tighter">BellBasket</span> : 'I have verified'}
              </button>
              <button
                onClick={handleResendLink}
                disabled={loading}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-primary hover:underline"
              >
                Resend Code
              </button>
              <button
                onClick={() => { setNeedsVerification(false); signOut(auth); }}
                className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Back to Login
              </button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <div className="h-screen overflow-hidden gradient-warm relative flex items-center justify-center px-4 w-full">

      <Helmet>
        <title>{showForgotPassword ? 'Reset Password' : (isLogin ? 'Sign In' : 'Sign Up')} - BellBasket</title>
        <meta name="description" content="Secure login and register for BellBasket. Join our community marketplace." />
      </Helmet>
      {/* Background Image Setup */}
      <div className="fixed inset-0 z-0">
        <img src={heroBg} alt="Neighborhood grocery shopping setting" className="w-full h-full object-cover opacity-60 object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/95" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10 max-h-[98vh] overflow-y-auto scrollbar-hide py-4 sm:py-8">
        
        {/* Back Button */}
        <div className="flex justify-start mb-6 px-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>

        <div className="text-center mb-6 sm:mb-10">
          <span className="text-2xl sm:text-3xl font-black block tracking-tight">BellBasket</span>
          <p className="text-[10px] sm:text-xs font-bold text-primary uppercase mt-2 opacity-80 tracking-widest">Find It. Grab It.</p>
        </div>

        <div className="glass rounded-[2rem] p-5 sm:p-8 space-y-4 sm:space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              {showForgotPassword ? 'Reset Password' : (isLogin ? 'Sign In' : 'Sign Up')}
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              {showForgotPassword ? 'Enter your email to receive a reset link.' : 'Please enter your credentials to continue.'}
            </p>
          </div>

          {!isLogin && !showForgotPassword && (
            <div className="flex gap-2 p-1.5 bg-secondary/50 rounded-2xl">
              {[
                { value: 'customer' as const, label: 'Customer', icon: UserCircle },
                { value: 'vendor' as const, label: 'Vendor', icon: Store },
              ].map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${role === r.value ? 'bg-white text-primary shadow-sm scale-[1.02]' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <r.icon className="w-4 h-4" />
                  {r.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={showForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl bg-secondary/50 border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                required
              />
              {isAdminEmail && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 scale-90">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-tighter text-primary">Master Admin Detected</span>
                </div>
              )}
            </div>

            {!showForgotPassword && (
              <>
                {!isLogin && (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="relative group">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="fullName"
                        name="fullName"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary/50 border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                        required
                      />
                    </div>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Phone Number (e.g. +91 98XXX XXXXX)"
                        className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl bg-secondary/50 border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                        required
                      />
                    </div>
                  </div>
                )}


                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-2xl bg-secondary/50 border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {!isLogin && role === 'vendor' && (
                  <div className="relative group">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input
                      id="referralCode"
                      name="referralCode"
                      value={referralCode}
                      onChange={e => setReferralCode(e.target.value)}
                      placeholder="Referral ID (Optional)"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-primary/5 border-2 border-primary/10 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:text-muted-foreground/50"
                    />
                  </div>
                )}
              </>
            )}

            {isLogin && !showForgotPassword && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-lg bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/20 text-primary transition-all cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider select-none pt-0.5">Remember Me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {!showForgotPassword && (
              <p className="text-[10px] text-center text-muted-foreground font-medium px-4">
                By continuing, you agree to BellBasket's{' '}
                <button
                  type="button"
                  onClick={() => navigate('/privacy')}
                  className="text-primary hover:underline font-bold"
                >
                  Privacy Policy
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="text-primary hover:underline font-bold"
                >
                  Terms & Conditions
                </button>
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3.5 sm:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md mt-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <span className="animate-pulse tracking-tighter">BellBasket</span> : (showForgotPassword ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Sign Up'))}
              {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
            </button>

            {showForgotPassword && (
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Back to Login
              </button>
            )}

            {!showForgotPassword && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-muted-foreground/30"></div>
                  <span className="flex-shrink-0 mx-4 text-muted-foreground text-[10px] font-black uppercase tracking-widest">OR</span>
                  <div className="flex-grow border-t border-muted-foreground/30"></div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-white text-gray-800 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-sm border border-gray-200 disabled:opacity-50 text-sm"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                  Continue with Google
                </button>
              </div>
            )}
          </form>

          {!showForgotPassword && (
            <div className="pt-2 text-center">
              <p className="text-xs text-muted-foreground font-medium">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 text-primary font-black uppercase tracking-wider hover:underline"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center bg-white/10 backdrop-blur-md rounded-2xl py-3 border border-white/10">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Are you a Staff member?</p>
          <button
            onClick={() => navigate('/team-lead/login')}
            className="text-xs font-black text-primary hover:text-primary/80 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <Shield className="w-3 h-3" />
            Staff Portal
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;

