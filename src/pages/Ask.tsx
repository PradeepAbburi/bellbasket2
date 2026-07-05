import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, Star, MapPin, Heart, ArrowRight, Loader2, CornerDownLeft, Sparkles, Bell, ArrowLeft, CheckCircle2, Compass, Zap, Search,
  Mic, MicOff, RefreshCw, Layers, ShieldCheck, Cpu, Volume2, Globe, HelpCircle, ShoppingBag, User, Plus, Minus, Brush, Wrench
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { useTranslation } from 'react-i18next';
import { getAvatarUrl } from '@/utils/avatars';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  stores?: any[];
  products?: any[];
  suggestions?: string[];
  mode?: 'products' | 'services';
}

const parseMarkdownText = (text: string) => {
  return text.split('\n').map((line, lineIdx) => {
    let content = line;
    let isHeader3 = false;
    let isHeader4 = false;
    let isListItem = false;

    if (line.startsWith('### ')) {
      isHeader3 = true;
      content = line.substring(4);
    } else if (line.startsWith('#### ')) {
      isHeader4 = true;
      content = line.substring(5);
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      isListItem = true;
      content = line.substring(2);
    }

    // Split and find any bold markdown text like **word**
    const parts = content.split(/(\*\*.*?\*\*)/);
    const parsedLine = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={partIdx} className="font-black text-foreground">{part.substring(2, part.length - 2)}</strong>;
      }
      return part;
    });

    if (isHeader3) {
      return <h3 key={lineIdx} className="text-xs font-black uppercase tracking-wider text-primary mt-3 mb-1.5">{parsedLine}</h3>;
    }
    if (isHeader4) {
      return <h4 key={lineIdx} className="text-[11px] font-black text-foreground/80 mt-2 mb-1">{parsedLine}</h4>;
    }
    if (isListItem) {
      return (
        <div key={lineIdx} className="flex gap-2 text-xs text-muted-foreground pl-2 py-0.5">
          <span>•</span>
          <span>{parsedLine}</span>
        </div>
      );
    }
    return <p key={lineIdx} className="mb-1">{parsedLine}</p>;
  });
};

const AskPage = () => {
  const apiBase = '';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, stores, toggleSaveStore, isStoreSaved, addToCart, requestPushNotifications, cart, updateQuantity, removeFromCart, serviceBookings } = useApp();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Dynamic layout check for bottom nav positioning
  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);
  const isVendor = user?.role === 'vendor';
  const showCartBanner = !isVendor && cartCount > 0;
  const hasBottomNav = user && user.isVerified && user.role !== 'hr' && user.role !== 'admin';
  const bottomPositionClass = hasBottomNav
    ? (showCartBanner
        ? "bottom-[calc(99px+max(env(safe-area-inset-bottom),6px))]"
        : "bottom-[calc(55px+max(env(safe-area-inset-bottom),6px))]")
    : "bottom-4 md:bottom-1";

  // Ask Chatbot State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [aiStatus, setAiStatus] = useState<'idle' | 'intent' | 'retrieval_db' | 'retrieval_web' | 'synthesizing'>('idle');
  const [mode, setMode] = useState<'products' | 'services'>('products');
  const sendMessageRef = useRef<(text: string) => void>(() => {});

  // Speech Recognition State
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const recognitionRef = useRef<any>(null);

  // Audio Visualizer State & Refs
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startAudioAnalysis = async () => {
    try {
      // Clean up any existing analyzer first
      stopAudioAnalysis();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;
      
      const updateVolume = () => {
        if (!analyserRef.current || !dataArrayRef.current) {
          // Fallback smooth simulation
          setVolume(prev => {
            const target = Math.random() * 30;
            return prev + (target - prev) * 0.15;
          });
          animationFrameRef.current = requestAnimationFrame(updateVolume);
          return;
        }
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
        
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
        }
        const average = sum / dataArrayRef.current.length;
        setVolume(average);
        
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
    } catch (err) {
      console.warn("Could not access microphone for real-time visualizer, falling back to simulated volume:", err);
      // Run updateVolume in fallback mode
      const updateVolumeSimulated = () => {
        setVolume(prev => {
          const target = Math.random() * 40;
          return prev + (target - prev) * 0.15;
        });
        animationFrameRef.current = requestAnimationFrame(updateVolumeSimulated);
      };
      updateVolumeSimulated();
    }
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setVolume(0);
  };

  useEffect(() => {
    return () => {
      stopAudioAnalysis();
    };
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-IN';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsRecording(true);
        startAudioAnalysis();
        toast.success('🎤 Listening... Speak now!');
      };

      rec.onresult = (e: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript) {
          setChatInput(interimTranscript.trim());
        }

        if (finalTranscript) {
          setChatInput(finalTranscript.trim());
          toast.success(`Voice captured: "${finalTranscript.trim()}"`);
          // Auto-send the voice message after a short delay using ref for latest handler
          setTimeout(() => {
            sendMessageRef.current(finalTranscript.trim());
          }, 300);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e.error);
        setIsRecording(false);
        stopAudioAnalysis();
        
        if (e.error === 'no-speech') {
          toast.error("No speech detected. Please try again and speak clearly.");
        } else if (e.error === 'audio-capture') {
          toast.error("No microphone found. Please check your microphone settings.");
        } else if (e.error === 'not-allowed') {
          toast.error("Microphone access denied. Please allow microphone permission in your browser.");
        } else if (e.error !== 'aborted') {
          toast.error("Speech recognition failed. Please try again.");
        }
      };

      rec.onend = () => {
        setIsRecording(false);
        stopAudioAnalysis();
      };

      recognitionRef.current = rec;
      setRecognition(rec);
    }
  }, []);

  const toggleVoiceSearch = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      toast.error("Speech recognition is not supported in this browser. Try Chrome or Edge!");
      return;
    }

    if (isRecording) {
      rec.stop();
      setIsRecording(false);
    } else {
      try {
        // Abort any lingering session before starting fresh
        try { rec.abort(); } catch (_) {}
        rec.start();
      } catch (err: any) {
        console.error("Failed to start voice recognition:", err);
        if (err.message?.includes('already started')) {
          rec.stop();
          setTimeout(() => {
            try { rec.start(); } catch (_) {}
          }, 200);
        } else {
          toast.error("Could not start microphone. Please try again.");
        }
      }
    }
  };

  // Load shelf inventory for context-aware product search
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const q = query(collection(db, 'products'));
        const snapshot = await getDocs(q);
        const fetchedProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching all products for chatbot", error);
      }
    };
    fetchAllProducts();
  }, []);

  // Load and clean chat history persisted in localStorage (5-day expiry)
  useEffect(() => {
    const savedMessagesStr = localStorage.getItem('bellbasket_ask_messages');
    const savedTimestampStr = localStorage.getItem('bellbasket_ask_messages_timestamp');

    if (savedMessagesStr && savedTimestampStr) {
      const savedTime = new Date(savedTimestampStr).getTime();
      const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (now - savedTime > fiveDaysInMs) {
        localStorage.removeItem('bellbasket_ask_messages');
        localStorage.removeItem('bellbasket_ask_messages_timestamp');
        initializeWelcomeMessage();
      } else {
        try {
          const parsed = JSON.parse(savedMessagesStr);
          const restored = parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          if (restored.length > 0) {
            setMessages(restored);
          } else {
            initializeWelcomeMessage();
          }
        } catch (e) {
          console.error("Failed to parse saved chat history", e);
          initializeWelcomeMessage();
        }
      }
    } else {
      initializeWelcomeMessage();
    }
  }, [user]);

  const initializeWelcomeMessage = () => {
    setMessages(prev => {
      const hasWelcomeForMode = prev.some(m => m.id === `welcome_${mode}`);
      if (hasWelcomeForMode) return prev;
      
      const newWelcome: ChatMessage = {
        id: `welcome_${mode}`,
        sender: 'bot',
        text: `Hello ${user?.name || 'there'}! 👋 I am Ask, your assistant. I am currently operating in **${mode.toUpperCase()}** mode. You can ask me to find local ${mode === 'products' ? 'restaurants, grocery stores, and products' : 'salons, AC repair, plumbing, and other home services'} in your neighborhood.`,
        timestamp: new Date(),
        mode: mode,
        suggestions: mode === 'products' ? [
          "Best restaurant near me 🍔",
          "Show grocery stores 🍎",
          "Fruits & vegetables 🥦",
          "Clear conversation 🧹"
        ] : [
          "AC repair services near me 🛠️",
          "Electrician near me ⚡",
          "Plumber service 🚰",
          "Clear conversation 🧹"
        ]
      };
      return [...prev, newWelcome];
    });
  };

  useEffect(() => {
    const hasWelcomeForMode = messages.some(m => m.id === `welcome_${mode}`);
    if (!hasWelcomeForMode) {
      initializeWelcomeMessage();
    }
  }, [mode, messages.length]);

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => msg.mode === mode);
  }, [messages, mode]);

  // Sync state changes with localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('bellbasket_ask_messages', JSON.stringify(messages));
      if (!localStorage.getItem('bellbasket_ask_messages_timestamp')) {
        localStorage.setItem('bellbasket_ask_messages_timestamp', new Date().toISOString());
      }
    }
  }, [messages]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages, isTyping]);

  // Haversine Distance helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Process user chat messages
  const handleSendChatMessage = async (textToSend?: string) => {
    const queryText = (textToSend || chatInput).trim();
    if (!queryText) return;

    if (!textToSend) setChatInput('');

    // Handle "Clear" query locally and immediately
    const lowerQuery = queryText.toLowerCase();
    if (lowerQuery === 'clear' || lowerQuery.includes('clear conversation') || lowerQuery.includes('sweep') || lowerQuery.includes('reset')) {
      setMessages(prev => {
        const remaining = prev.filter(m => m.mode !== mode);
        const newWelcome: ChatMessage = {
          id: `welcome_${mode}`,
          sender: 'bot',
          text: `Conversation swept! 🧹 I am Ask, your assistant. I am operating in **${mode.toUpperCase()}** mode. What can I locate for you in the neighborhood today?`,
          timestamp: new Date(),
          mode: mode,
          suggestions: mode === 'products' ? [
            "Best restaurant near me 🍔",
            "Show grocery stores 🍎",
            "Fruits & vegetables 🥦",
            "Clear conversation 🧹"
          ] : [
            "AC repair services near me 🛠️",
            "Electrician near me ⚡",
            "Plumber service 🚰",
            "Clear conversation 🧹"
          ]
        };
        return [...remaining, newWelcome];
      });
      return;
    }

    // Dynamic Intent/Mode Switch Check
    let activeMode = mode;
    let switchedModeMessage = '';

    // Check if query is service-related
    const hasServiceKeywords = Object.values(SERVICE_KEYWORDS).some(keywords =>
      keywords.some(kw => lowerQuery.includes(kw))
    ) || /repair|plumb|electr|salon|barber|spa|cleanup|paint|mechanic|service/i.test(lowerQuery);

    // Check if query is product/store-related
    const hasProductKeywords = Object.values(CATEGORY_KEYWORDS).some(keywords =>
      keywords.some(kw => lowerQuery.includes(kw))
    ) || Object.keys(SYNONYM_MAP).some(kw => lowerQuery.includes(kw)) ||
       /food|restaurant|grocery|shop|store|buy|price|stock|order|burger|pizza|biryani|milk|paneer|fruit|veg|medicine/i.test(lowerQuery);

    // Switch mode dynamically if needed
    if (hasServiceKeywords && !hasProductKeywords && mode === 'products') {
      activeMode = 'services';
      setMode('services');
      switchedModeMessage = "🔄 *Switched to Services mode to find local experts for your request.*\n\n";
    } else if (hasProductKeywords && !hasServiceKeywords && mode === 'services') {
      activeMode = 'products';
      setMode('products');
      switchedModeMessage = "🔄 *Switched to Products mode to find local items and stores for your request.*\n\n";
    }

    // Append User Message
    const userMsgId = Math.random().toString();
    const newMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: queryText,
      timestamp: new Date(),
      mode: activeMode
    };
    
    setMessages(prev => [...prev, newMsg]);
    setIsTyping(true);

    // Brief delay to simulate thinking
    await new Promise(resolve => setTimeout(resolve, 600));

    // Search local database for matching products and stores using activeMode
    const matchedProducts = processLocalProductMatches(queryText, activeMode);
    const matchedStores = processLocalStoreMatches(queryText, activeMode);

    // Build product display cards
    const productsDisplay = matchedProducts.map(p => {
      const store = stores.find(s => s.vendorId === p.vendorId || s.id === p.vendorId);
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        storeName: store ? store.name : 'Local Store',
        storeId: store ? store.id : p.vendorId,
        storePhone: store ? (store.phone || '') : '',
        inStock: p.inStock !== false,
        rawProduct: p
      };
    });

    // Build system prompt for context-aware bot responses
    let systemPromptText = `You are Ask, the smart hyperlocal conversational assistant built for BellBasket, currently operating in ${activeMode.toUpperCase()} mode.

Your goal is to provide highly accurate, friendly, and structured responses based ONLY on the local stores and products provided below.

INSTRUCTIONS:
1. STRICT GROUNDING: You must ONLY suggest, mention, or recommend stores and products that are explicitly listed in the search results below. Never hallucinate or recommend names of stores, websites, or products not provided in the context.
2. If no stores or products are provided in the list, you must clearly state that "I couldn't find matching items or stores near your location." Do not make up fake names. Suggest relevant alternative categories if appropriate (e.g. if looking for a specific electronic item, suggest looking at 'Electronics' stores).
3. If stores or products are found:
   - Keep your text response engaging and brief.
   - Point the user to the interactive cards displayed below the chat bubble.
   - Summarize the top matching stores/products: mention key details like price, store name, distance, and ratings using clean bold text and bullet points.
4. If a product is out of stock, do not recommend it as a primary choice.
5. Use markdown formatting like bold (**item**), bullet points (*), and headers (###) to make your response visually appealing and easy to read.

Here are the search results from the user's neighborhood:
`;

    if (matchedStores.length > 0) {
      systemPromptText += `\nMatching Stores near the user:\n`;
      matchedStores.forEach(s => {
        systemPromptText += `- **${s.name}** (${s.category}): ${s.distance ? s.distance.toFixed(1) : '?'} km away, Rated ${s.rating || '4.5'}/5.\n`;
      });
    }

    if (productsDisplay.length > 0) {
      systemPromptText += `\nRelevant Products matching the query:\n`;
      productsDisplay.forEach(p => {
        systemPromptText += `- **${p.name}** for **₹${p.price}** at store **${p.storeName}** (${p.inStock ? 'In Stock' : 'Out of Stock'}).\n`;
      });
    }

    if (matchedStores.length === 0 && productsDisplay.length === 0) {
      systemPromptText += `\n[NO LOCAL MATCHES FOUND]: Explicitly state that nothing was found near them. Do not recommend external or wrong products.\n`;
    }

    systemPromptText += `\nProvide a concise and helpful response following these rules.`;

    let botText = '';
    let botStores = matchedStores;
    let botProducts = productsDisplay;
    let botSuggestions: string[] | undefined = undefined;

    try {
      setAiStatus('synthesizing');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: queryText,
          systemPrompt: systemPromptText
        })
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.text) {
        botText = data.text;
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      console.warn("Failed to fetch response from chat API, using local fallback engine:", err);
      // Fallback to local response generation
      const localResponse = processBotResponseFallback(queryText, productsDisplay.length > 0, activeMode, matchedStores);
      botText = localResponse.text;
      botStores = localResponse.stores || matchedStores;
      botSuggestions = localResponse.suggestions;
    }

    if (switchedModeMessage) {
      botText = switchedModeMessage + botText;
    }

    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      sender: 'bot',
      text: botText,
      timestamp: new Date(),
      stores: botStores,
      products: botProducts,
      mode: activeMode,
      suggestions: botSuggestions || (activeMode === 'products' ? [
        "Show grocery stores 🍎",
        "Best restaurant near me 🍔",
        "Clear conversation 🧹"
      ] : [
        "AC repair services near me 🛠️",
        "Electrician near me ⚡",
        "Clear conversation 🧹"
      ])
    }]);

    setIsTyping(false);
    setAiStatus('idle');
  };

  // Keep sendMessageRef in sync so speech recognition always uses the latest handler
  useEffect(() => {
    sendMessageRef.current = handleSendChatMessage;
  });

  // --- FUZZY SPELLING CORRECTION AND LEVENSHTEIN LOGIC ---
  const levenshtein = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const normalizePhonetic = (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .map(word => {
        if (word.length <= 1) return word;
        let normalized = word;
        
        // Normalize common abbreviations
        if (normalized === 'ac' || normalized === 'a.c') return 'ac';
        if (normalized === 'tv' || normalized === 't.v') return 'tv';

        // Strip trailing plural endings
        if (normalized.endsWith('es')) {
          normalized = normalized.slice(0, -2);
        } else if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
          normalized = normalized.slice(0, -1);
        }

        // Simplify double letters (e.g., grocerry -> grocery)
        normalized = normalized.replace(/(.)\1+/g, '$1');

        // Metaphone / Soundex-like adjustments for high-accuracy phonetic alignment
        // 1. Silent letters
        if (normalized.startsWith('kn')) normalized = normalized.substring(1);
        if (normalized.startsWith('gn')) normalized = normalized.substring(1);
        if (normalized.startsWith('pn')) normalized = normalized.substring(1);
        if (normalized.startsWith('wr')) normalized = normalized.substring(1);

        // 2. Sound-alike consonants mappings
        normalized = normalized.replace(/ph/g, 'f');
        normalized = normalized.replace(/ck/g, 'k');
        normalized = normalized.replace(/q/g, 'k');
        normalized = normalized.replace(/x/g, 'ks');
        
        // 3. Indian / English phonetic overlap (w/v, z/s, j/z)
        normalized = normalized.replace(/w/g, 'v');
        normalized = normalized.replace(/z/g, 's');
        normalized = normalized.replace(/dg/g, 'j');

        // 4. Soft/Hard C mappings
        // 'c' before 'e', 'i', 'y' sounds like 's' (e.g. center, city, cycle)
        // 'c' otherwise sounds like 'k' (e.g. cat, cut)
        normalized = normalized.replace(/c([eiy])/g, 's$1');
        normalized = normalized.replace(/c/g, 'k');

        // 5. Common vowel sound alignments (ee/oo/y/ea/oo etc.)
        normalized = normalized.replace(/ee/g, 'i');
        normalized = normalized.replace(/ea/g, 'i');
        normalized = normalized.replace(/y/g, 'i');
        normalized = normalized.replace(/oo/g, 'u');
        normalized = normalized.replace(/ou/g, 'u');
        
        // 6. Common suffix contractions
        normalized = normalized.replace(/cian/g, 'sian')
                               .replace(/tian/g, 'sian')
                               .replace(/ch/g, 's')
                               .replace(/sh/g, 's')
                               .replace(/tion/g, 'sian')
                               .replace(/sion/g, 'sian')
                               .replace(/[aeiou]r$/g, 'r');

        // Remove duplicates again in case substitutions created them
        normalized = normalized.replace(/(.)\1+/g, '$1');
                               
        return normalized;
      })
      .join(' ')
      .trim();
  };

  const isFuzzyPhoneticMatch = (wordA: string, wordB: string): boolean => {
    const cleanA = wordA.toLowerCase().trim();
    const cleanB = wordB.toLowerCase().trim();
    if (cleanA === cleanB) return true;
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;

    const normA = normalizePhonetic(cleanA);
    const normB = normalizePhonetic(cleanB);
    if (normA === normB) return true;
    if (normA.includes(normB) || normB.includes(normA)) return true;

    const minLen = Math.min(normA.length, normB.length);
    if (minLen <= 2) return normA === normB;

    const dist = levenshtein(normA, normB);
    // Adaptive edit distance: scale allowed edits based on word length
    const maxEdits = minLen <= 4 ? 1 : minLen <= 7 ? 2 : 3;
    return dist <= maxEdits;
  };

  const textContainsFuzzyWords = (text: string, queryWords: string[]): boolean => {
    const cleanText = text.toLowerCase();
    const textWords = cleanText.split(/[\s,./\-()]+/).filter(w => w.length >= 2);
    
    return queryWords.some(qw => 
      cleanText.includes(qw) || 
      textWords.some(tw => isFuzzyPhoneticMatch(qw, tw))
    );
  };

  const STOP_WORDS = [
    'near', 'nearby', 'close', 'closest', 'around', 'here', 'me', 'my', 'the', 'and', 'for', 'best', 'top', 'good', 'show', 'find', 'search', 'looking', 'want', 'need', 'get', 'please', 'can', 'you', 'where', 'how', 'what', 'which', 'from', 'with', 'this', 'that',
    'a', 'an', 'in', 'on', 'at', 'to', 'of', 'by', 'about', 'some', 'any', 'all', 'shop', 'store', 'service', 'services', 'order', 'buy', 'give', 'want', 'tell', 'do', 'does', 'have', 'has', 'is', 'are', 'was', 'were', 'i'
  ];

  const SERVICE_KEYWORDS: Record<string, string[]> = {
    'AC Repair': ['ac', 'repair', 'servicing', 'fix', 'cooler', 'conditioner', 'repaer', 'repare', 'servce', 'cooling', 'aircon', 'split', 'window', 'hvac', 'gas', 'refill'],
    'Electrician': ['electrician', 'electric', 'wiring', 'light', 'fan', 'switch', 'electrican', 'electrisian', 'electri', 'mcb', 'fuse', 'socket', 'plug', 'inverter', 'ups'],
    'Plumber': ['plumber', 'plumbing', 'pipe', 'tap', 'leak', 'drain', 'plumer', 'plumbir', 'piple', 'water', 'toilet', 'flush', 'bathroom', 'sink', 'geyser', 'tank'],
    'Mobile Repair': ['mobile', 'phone', 'screen', 'display', 'battery', 'charging', 'repaer', 'repare', 'iphone', 'android', 'samsung', 'redmi', 'oneplus', 'realme', 'vivo', 'oppo'],
    'Laptop Repair': ['laptop', 'computer', 'desktop', 'keyboard', 'screen', 'repaer', 'repare', 'macbook', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'motherboard', 'ram', 'ssd', 'printer'],
    'Saloon & Spa': ['salon', 'saloon', 'spa', 'haircut', 'shave', 'facial', 'beauty', 'parlor', 'parlour', 'grooming', 'massage', 'hair', 'manicure', 'pedicure', 'bridal', 'makeup', 'threading', 'waxing', 'trim', 'barber'],
    'Pest Control': ['pest', 'cockroach', 'termite', 'mosquito', 'rat', 'ant', 'bedbug', 'fumigation'],
    'Cleaning': ['cleaning', 'deep', 'sofa', 'carpet', 'house', 'home', 'office', 'wash', 'sanitize'],
    'Painting': ['painting', 'paint', 'wall', 'whitewash', 'interior', 'exterior', 'waterproof', 'waterproofing']
  };

  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Food': ['restaurant', 'food', 'biryani', 'pizza', 'burger', 'bakery', 'sweets', 'cafe', 'hotel', 'dhaba', 'restrant', 'resturant', 'biriyani', 'briyani', 'eat', 'dinner', 'lunch', 'breakfast', 'dosa', 'idli', 'paratha', 'naan', 'tandoori', 'shawarma', 'momos', 'noodles', 'thali', 'meals', 'tiffin', 'snack', 'snacks', 'chaat', 'juice', 'icecream', 'cake', 'pastry', 'chinese', 'italian', 'south', 'north', 'mughlai', 'fast'],
    'Grocery': ['grocery', 'groceries', 'supermarket', 'mart', 'milk', 'vegetables', 'fruits', 'kirana', 'provision', 'dairy', 'egg', 'grocerry', 'grocry', 'paneer', 'oil', 'essentials', 'rice', 'wheat', 'flour', 'atta', 'dal', 'pulses', 'sugar', 'salt', 'spice', 'spices', 'masala', 'ghee', 'butter', 'curd', 'yogurt', 'bread', 'biscuit', 'chips', 'chocolate', 'tea', 'coffee', 'water', 'juice', 'detergent', 'soap', 'shampoo', 'toothpaste', 'onion', 'potato', 'tomato', 'chicken', 'mutton', 'fish', 'meat', 'frozen', 'organic', 'fresh'],
    'Pharmacy': ['pharmacy', 'medicine', 'medical', 'chemist', 'drugstore', 'pills', 'tablet', 'pharmcy', 'medicin', 'medecal', 'health', 'wellness', 'vitamin', 'supplement', 'ayurvedic', 'homeopathy', 'syrup', 'bandage', 'first', 'aid', 'sanitizer', 'mask', 'thermometer'],
    'Clothes & Accessories': ['clothes', 'clothing', 'apparel', 'boutique', 'fashion', 'wear', 'dress', 'tailor', 'cloths', 'shirt', 'pant', 'jeans', 'saree', 'kurti', 'kurta', 'ethnic', 'western', 'formal', 'casual', 'tshirt', 'shoe', 'shoes', 'footwear', 'sandal', 'chappal', 'bag', 'purse', 'watch', 'jewellery', 'jewelry', 'accessories', 'sunglasses', 'belt', 'wallet'],
    'Electronics': ['electronics', 'tv', 'television', 'fridge', 'refrigerator', 'washing', 'machine', 'microwave', 'oven', 'mixer', 'grinder', 'iron', 'cooker', 'induction', 'heater', 'camera', 'speaker', 'headphone', 'earphone', 'earbuds', 'smartwatch', 'tablet', 'charger', 'cable', 'adapter', 'led'],
    'Stationery': ['stationery', 'stationary', 'pen', 'pencil', 'notebook', 'paper', 'book', 'books', 'school', 'college', 'office', 'supply', 'supplies', 'xerox', 'print', 'printing', 'copy'],
    'Pet': ['pet', 'pets', 'dog', 'cat', 'fish', 'bird', 'puppy', 'kitten', 'food', 'veterinary', 'vet'],
    'Sports': ['sports', 'gym', 'fitness', 'cricket', 'football', 'badminton', 'tennis', 'yoga', 'equipment', 'bat', 'ball', 'shoes']
  };

  // Synonym expansion for common product search terms
  const SYNONYM_MAP: Record<string, string[]> = {
    'milk': ['dairy', 'curd', 'paneer', 'yogurt', 'buttermilk', 'lassi', 'cream', 'cheese'],
    'rice': ['basmati', 'sona', 'masuri', 'brown', 'grain', 'biryani'],
    'chicken': ['poultry', 'meat', 'nonveg', 'tandoori', 'grilled'],
    'mutton': ['goat', 'meat', 'nonveg', 'keema'],
    'fish': ['seafood', 'prawns', 'shrimp'],
    'vegetables': ['veggies', 'sabzi', 'greens', 'fresh'],
    'fruits': ['fruit', 'fresh', 'mango', 'banana', 'apple', 'orange', 'grapes'],
    'oil': ['cooking', 'sunflower', 'mustard', 'coconut', 'olive', 'refined', 'groundnut'],
    'phone': ['mobile', 'smartphone', 'cell', 'handset'],
    'laptop': ['computer', 'notebook', 'pc', 'desktop'],
    'ac': ['cooler', 'air conditioner', 'conditioner', 'ventilation', 'heating', 'cooling', 'hvac'],
    'tv': ['television', 'led', 'display', 'screen', 'monitor'],
    'fridge': ['refrigerator', 'cooler', 'freezer'],
    'washing': ['dryer', 'laundry', 'washer'],
    'medicine': ['tablet', 'pill', 'capsule', 'syrup', 'ointment', 'painkiller'],
    'groceries': ['grocery', 'mart', 'food', 'provisions', 'kirana'],
    'salon': ['haircut', 'spa', 'massage', 'grooming', 'barber', 'parlor', 'shave'],
    'repair': ['service', 'fixing', 'maintenance', 'installation', 'plumber', 'electrician', 'mechanic'],
  };

  const processLocalProductMatches = (query: string, activeMode: 'products' | 'services'): any[] => {
    if (activeMode === 'services') return [];
    const lower = query.toLowerCase();
    
    // Split query into words and remove common stop words
    let words = lower.split(/[\s,./\-()]+/).filter(w => w.length >= 2 && !STOP_WORDS.includes(w));
    if (words.length === 0) return [];

    // Indian food/biryani ingredient expansions and synonym expansions
    const expandedWords = [...words];
    for (const word of words) {
      // Direct exact word synonyms
      const synonyms = SYNONYM_MAP[word];
      if (synonyms) {
        expandedWords.push(...synonyms);
      }
      // Expand fuzzy matching synonyms
      for (const [key, synList] of Object.entries(SYNONYM_MAP)) {
        if (isFuzzyPhoneticMatch(word, key)) {
          expandedWords.push(key, ...synList);
        }
      }
    }
    
    if (lower.includes('biryani') || lower.includes('biriyani') || lower.includes('briyani')) {
      expandedWords.push('rice', 'basmati', 'masala', 'chicken', 'mutton', 'ghee', 'oil', 'onion', 'garlic', 'ginger', 'paste', 'curd');
    }

    const uniqueWords = [...new Set(expandedWords)];

    const userLat = user?.lat || parseFloat(localStorage.getItem('user_lat') || '17.6868');
    const userLng = user?.lng || parseFloat(localStorage.getItem('user_lng') || '83.2185');

    // Score products
    const scored = allProducts.map(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const tags = (p.tags || p.brand || '').toLowerCase();
      const combined = `${name} ${desc} ${cat} ${tags}`;
      const combinedWords = combined.split(/[\s,./\-()]+/).filter(w => w.length >= 2);

      let relevanceScore = 0;

      // 1. Check exact product name match (highest priority)
      if (name === lower || name.includes(lower)) {
        relevanceScore += 30;
      }

      // 2. Score word match relevance
      let matchedQueryWordsCount = 0;
      for (const qw of uniqueWords) {
        let matched = false;
        if (name.includes(qw)) {
          relevanceScore += 12; // Match in product name
          matched = true;
        } else if (combined.includes(qw)) {
          relevanceScore += 6;  // Match in description/category
          matched = true;
        } else if (combinedWords.some(tw => isFuzzyPhoneticMatch(qw, tw))) {
          relevanceScore += 4;  // Fuzzy phonetic match
          matched = true;
        }
        if (matched) {
          matchedQueryWordsCount++;
        }
      }

      // 3. Multi-word query coverage boost (highly favor products matching multiple parts of query)
      if (matchedQueryWordsCount > 1) {
        relevanceScore += matchedQueryWordsCount * 15;
      }

      // 4. In-stock boost (prioritize active stock)
      const inStock = p.inStock !== false && (p.stock === undefined || p.stock > 0);
      if (inStock) {
        relevanceScore += 10;
      } else {
        relevanceScore -= 10; // penalty for out of stock items
      }

      // 5. Proximity Boost & Store Rating integration
      const store = stores.find(s => s.vendorId === p.vendorId || s.id === p.vendorId);
      if (store) {
        const distance = calculateDistance(userLat, userLng, store.lat, store.lng);
        let finalScore = relevanceScore;
        if (relevanceScore > 0) {
          // Distance weights
          if (distance <= 2) finalScore += 10;
          else if (distance <= 5) finalScore += 5;
          else if (distance <= 10) finalScore += 2;

          // Store rating boost
          finalScore += (store.rating || 4.0) * 2;
        }
        return { product: p, score: finalScore, distance, store };
      }
      
      return { product: p, score: 0, distance: 999, store: null };
    })
    .filter(item => item.score > 0 && item.store && !item.store.isBlocked && item.distance <= 15);

    // Sort by score descending, then by distance ascending
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.distance - b.distance;
    });

    return scored.map(item => item.product).slice(0, 8);
  };

  const SERVICE_CATEGORIES = ['AC Repair', 'Electrician', 'Plumber', 'Saloon & Spa', 'Mobile Repair', 'Laptop Repair', 'All Repairs'];

  const processLocalStoreMatches = (query: string, activeMode: 'products' | 'services'): any[] => {
    const lower = query.toLowerCase();
    const words = lower.split(/[\s,./\-()]+/).filter(w => w.length >= 2 && !STOP_WORDS.includes(w));
    
    // Find matching categories based on service/category keywords
    let matchedCategory = '';
    let isService = false;

    for (const [categoryName, keywords] of Object.entries(SERVICE_KEYWORDS)) {
      if (words.some(word => keywords.some(kw => isFuzzyPhoneticMatch(word, kw))) || lower.includes(categoryName.toLowerCase())) {
        matchedCategory = categoryName;
        isService = true;
        break;
      }
    }
    
    if (!matchedCategory) {
      for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (words.some(word => keywords.some(kw => isFuzzyPhoneticMatch(word, kw))) || lower.includes(categoryName.toLowerCase())) {
          matchedCategory = categoryName;
          break;
        }
      }
    }

    let matches = [...stores].filter(s => !s.isBlocked);

    // Filter by mode
    if (activeMode === 'products') {
      matches = matches.filter(s => s.storeType !== 'service' && !SERVICE_CATEGORIES.includes(s.category || ''));
    } else if (activeMode === 'services') {
      matches = matches.filter(s => s.storeType === 'service' || SERVICE_CATEGORIES.includes(s.category || ''));
    }

    const userLat = user?.lat || parseFloat(localStorage.getItem('user_lat') || '17.6868');
    const userLng = user?.lng || parseFloat(localStorage.getItem('user_lng') || '83.2185');

    const scored = matches.map(s => {
      const name = (s.name || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();
      const distance = calculateDistance(userLat, userLng, s.lat, s.lng);
      
      let relevanceScore = 0;

      // 1. Exact match on name
      if (name === lower || name.includes(lower)) {
        relevanceScore += 30;
      }

      // 2. Category match
      if (matchedCategory && cat === matchedCategory.toLowerCase()) {
        relevanceScore += 20;
      }

      // 3. Keyword matches
      for (const qw of words) {
        if (name.includes(qw)) relevanceScore += 10;
        else if (desc.includes(qw)) relevanceScore += 5;
        else if (cat.includes(qw)) relevanceScore += 5;
        else if (isFuzzyPhoneticMatch(qw, name) || isFuzzyPhoneticMatch(qw, cat)) relevanceScore += 3;
      }

      let finalScore = relevanceScore;
      if (relevanceScore > 0) {
        // 4. Proximity Boost (only applied if store matches search query)
        if (distance <= 2) finalScore += 8;
        else if (distance <= 5) finalScore += 4;
        else if (distance <= 10) finalScore += 1;

        // 5. Rating Boost
        finalScore += (s.rating || 4.0) * 2;
      }

      return { store: s, score: finalScore, distance };
    })
    .filter(item => item.score > 0 && item.distance <= 15);

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // If "best", "top", "rated" is in query, prioritize rating first
    if (lower.includes('best') || lower.includes('rating') || lower.includes('top')) {
      scored.sort((a, b) => {
        const ratingA = a.store.rating || 0;
        const ratingB = b.store.rating || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return b.score - a.score;
      });
    }

    return scored.map(item => ({
      ...item.store,
      distance: item.distance
    })).slice(0, 6);
  };

  const processBotResponseFallback = (
    query: string, 
    hasProducts: boolean = false, 
    activeMode: 'products' | 'services' = 'products', 
    matchedStores: any[] = []
  ): { text: string; stores?: any[]; suggestions?: string[] } => {
    const lower = query.toLowerCase();
    
    // Mode-specific suggestions
    const modeSuggestions = activeMode === 'products' 
      ? ["Show grocery stores 🍎", "Best restaurant near me 🍔", "Clear conversation 🧹"]
      : ["AC repair services near me 🛠️", "Electrician near me ⚡", "Clear conversation 🧹"];

    // --- Greetings ---
    if (/^(hi|hello|hey|hii+|heyy*|yo|namaste|namaskar|howdy|sup|good\s*(morning|afternoon|evening|night))/.test(lower)) {
      return {
        text: `Hello! 👋 Welcome! I'm Ask, your personal neighborhood assistant.\n\nI can help you find ${activeMode === 'products' ? 'restaurants, grocery stores, and local products' : 'salons, repair services, plumbing, and other home services'}. What are you looking for today?`,
        suggestions: modeSuggestions
      };
    }
    // --- Telugu Support ---
    else if (/telugu|telugoo|తెలుగు|తెలుగో/.test(lower)) {
      return {
        text: `### Telugu Language Support (తెలుగు మద్దతు) 🇮🇳\n\nఅవును! నేను తెలుగులో మాట్లాడగలను. మీకు ఏ సహాయం కావాలి? \n\nనేను మీ ఏరియాలో ఉన్న ఉత్తమ ${activeMode === 'products' ? 'దుకాణాలు మరియు ఉత్పత్తులను' : 'సేవలను'} కనుగొనగలను. \n\n*ఉదాహరణకు: ${activeMode === 'products' ? '"కిరాణా దుకాణాలు", లేదా "ఉత్తమ బిర్యానీ"' : '"AC repair సేవలు", లేదా "ప్లంబర్"'}.*`,
        suggestions: modeSuggestions
      };
    }
    // --- Hindi Support ---
    else if (/hindi|hindee|हिंदी/.test(lower)) {
      return {
        text: `### Hindi Language Support (हिंदी समर्थन) 🇮🇳\n\nहाँ! मैं हिंदी में बात कर सकता हूँ। मैं आपकी क्या मदद कर सकता हूँ?\n\nमैं आपके क्षेत्र में सर्वोत्तम ${activeMode === 'products' ? 'दुकानों और उत्पादों' : 'सेवाओं'} को खोजने में आपकी मदद कर सकता हूँ।\n\n*जैसे कि: ${activeMode === 'products' ? '"किराना दुकान", या "सर्वोत्तम बिरयानी"' : '"मेरे पास एसी मरम्मत", या "प्लंबर"'}.*`,
        suggestions: modeSuggestions
      };
    }
    // --- Personal Inquiries / How are you ---
    else if (/how\s*are\s*you|how\s*r\s*u|how('s| is)\s*it\s*going|what('s| is)\s*up|hru/.test(lower)) {
      return {
        text: `I'm doing great, thank you for asking! 😊 I'm always energized when I get to help people discover and shop from local businesses. How are you doing today? What can I help you find?`,
        suggestions: modeSuggestions.slice(0, 2)
      };
    }
    // --- Identity / Who are you ---
    else if (/who\s*are\s*you|what\s*are\s*you|your\s*name|about\s*you|tell\s*me\s*about\s*(yourself|you)/.test(lower)) {
      return {
        text: `I'm **Ask** — your smart hyperlocal assistant! 🤖✨\n\nCurrently operating in **${activeMode.toUpperCase()}** mode.\n\nI can help you:\n${
          activeMode === 'products'
            ? '• 🍔 Find restaurants and cafes\n• 🍎 Locate grocery and provision stores\n• 📱 Search local catalog inventory (e.g. "best phones under ₹20,000")'
            : '• 💇‍♀️ Discover salons and beauty spas\n• 🛠️ Book AC repair, plumbing, and electricians\n• 💻 Book laptop or mobile repair technicians'
        }\n• 🌐 Search the web for general knowledge\n\nHow can I help you today?`,
        suggestions: modeSuggestions.slice(0, 2)
      };
    }
    // --- Phones under 20,000 RAG ---
    else if (/phone|mobile|20,000|20000/.test(lower) && (lower.includes('under') || lower.includes('below') || lower.includes('best'))) {
      return {
        text: `### Mobile Search under ₹20,000 📱\n\nWhen you search for products like **"best phones under ₹20,000"**, we scan nearby store inventories for in-stock mobile phones matching your budget.\n\n*If matched local products are found in the store catalogs, they will be displayed as interactive cards below so you can add them to your cart or inspect their details!*`,
        suggestions: modeSuggestions
      };
    }
    // --- Recipe / Cooking ---
    else if (/recipe|how\s*to\s*(make|cook|prepare|bake)|ingredients?\s*for|cooking\s*tips?/.test(lower)) {
      if (/biryani/.test(lower)) {
        return {
          text: `### Biryani Recipe 🍚🍗\n\n* **Ingredients**: Basmati Rice, Chicken/Mutton, Onions, Curd, Biryani Masala, Ginger-Garlic paste, Ghee, Mint.\n* **Steps**: Marinate meat, cook rice 70%, layer meat and rice in a pot, seal and cook on low flame (dum) for 25 mins.\n\n*You can search for these ingredients at nearby grocery stores!*`,
          suggestions: ["Show grocery stores 🍎", "Clear conversation 🧹"]
        };
      } else {
        return {
          text: `I'd love to help with that recipe! 🍳 Tell me what dish you're planning, and I can share a recipe and search for the ingredients at grocery stores near you!`,
          suggestions: ["Show grocery stores 🍎", "Clear conversation 🧹"]
        };
      }
    }

    // --- Products Found Fallback ---
    if (hasProducts) {
      return {
        text: `I found products matching "${query}" near you! 🛒 Check out the item cards below. You can add them directly to your cart or visit their stores!`,
        suggestions: ["Show grocery stores 🍎", "Clear conversation 🧹"]
      };
    }

    // --- Stores Found Fallback ---
    if (matchedStores.length > 0) {
      let botGreeting = `I found matching stores/services in your area! 📍\n\nHere are the top matches found near you:`;
      if (lower.includes('best') || lower.includes('rating') || lower.includes('top')) {
        botGreeting = `I filtered by the highest aggregate ratings in your vicinity! ⭐\n\nHere are the absolute best-rated stores matching your request:`;
      }

      return {
        text: botGreeting,
        stores: matchedStores,
        suggestions: [
          "Show grocery stores 🍎",
          "Book home services 🛠️",
          "Clear conversation 🧹"
        ]
      };
    }

    // --- Thank you ---
    if (lower.includes('thank') || lower.includes('thanks') || lower.includes('cool') || lower.includes('perfect')) {
      return {
        text: "You are very welcome! 😊 Helping you find quality items and services is what I do best. Is there anything else you'd like me to look up?",
        suggestions: ["Show grocery stores 🍎", "Salons & spas nearby 💇‍♀️"]
      };
    }

    // --- Default Conversational Response ---
    const queryWord = lower.replace(/[?!.,]/g, '').trim();
    if (queryWord.length < 3) {
      return {
        text: `I didn't quite catch that! 😅 Could you type a bit more? For example:\n\n• "Best restaurant near me"\n• "Grocery shops nearby"\n• "AC repair service"\n• "How to make biryani?"\n\nI'm here to help! 💛`,
        suggestions: ["Show grocery stores 🍎", "AC repair services near me 🛠️"]
      };
    }

    return {
      text: `### Not found near you 📍\n\nI scanned our local database but couldn't find matching products or stores for "${query}" near you. \n\nIf you meant to search for a category, try:\n• "AC Repair", "Plumber", "Salon", "Grocery", or "Restaurant".`,
      suggestions: [
        "Show grocery stores 🍎",
        "AC repair services near me 🛠️"
      ]
    };
  };

  const handleAddToCart = (p: any) => {
    const success = addToCart({
      product: p.rawProduct || p,
      storeId: p.storeId || p.vendorId,
      storeName: p.storeName || 'Local Store',
      storePhone: p.storePhone || '',
      quantity: 1
    });
    if (success) {
      toast.success(`${p.name} added to cart! 🛒`);
    }
  };

  const getProductCartCount = (productId: string) => {
    if (!cart) return 0;
    const item = cart.find((c: any) => c.product.id === productId);
    return item ? item.quantity : 0;
  };

  const handleUpdateCartQuantity = (p: any, newQty: number) => {
    updateQuantity(p.id, newQty);
  };

  const handleRemoveFromCart = (p: any) => {
    removeFromCart(p.id);
    toast.success(`${p.name} removed from cart! 🛒`);
  };

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col relative overflow-hidden">
      <Header solid />
      
      <main className={`fixed top-16 ${bottomPositionClass} left-0 right-0 w-full max-w-4xl mx-auto px-4 md:px-6 flex flex-col z-10 overflow-hidden`}>
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 border-b border-border/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Ask AI</h2>
                </div>
              </div>
            </div>
            
            <div className="flex bg-secondary p-1 rounded-xl border border-border/40 shrink-0 shadow-inner">
              <button
                type="button"
                onClick={() => setMode('products')}
                className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'products'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Products
              </button>
              <button
                type="button"
                onClick={() => setMode('services')}
                className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'services'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Services
              </button>
            </div>
          </div>


          {/* Messages viewport */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
            {/* Service Bookings List (visible in services mode) */}
            {mode === 'services' && serviceBookings && serviceBookings.length > 0 && (
              <div className="bg-secondary/40 border border-border/40 rounded-3xl p-5 mb-4 max-w-full backdrop-blur-md">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Wrench className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Your Active Service Bookings</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 max-w-full">
                  {serviceBookings
                    .filter(b => !['completed', 'rejected'].includes(b.status) && !b.deletedByUser)
                    .map((booking) => (
                      <div key={booking.id} className="bg-background/80 border border-border/50 rounded-2xl p-4 flex flex-col gap-2 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-xs text-foreground line-clamp-1">{booking.serviceName}</h4>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase truncate">{booking.storeName}</p>
                          </div>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                            booking.status === 'accepted' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground space-y-1 mt-1 font-medium">
                          <p>📅 {booking.date}</p>
                          <p>🕒 {booking.timeSlot}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/receipts?bookingId=${booking.id}`)}
                          className="mt-2 w-full py-1.5 bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground font-bold uppercase text-[9px] tracking-wider rounded-xl transition-all text-center cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    ))}
                  {serviceBookings.filter(b => !['completed', 'rejected'].includes(b.status) && !b.deletedByUser).length === 0 && (
                    <p className="text-[10px] text-muted-foreground font-medium pl-1">No active service bookings found.</p>
                  )}
                </div>
              </div>
            )}

            {filteredMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}>
                  {/* Sender title */}
                  <div className="flex items-center gap-1.5 mb-1.5 px-2">
                    {!isUser && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-primary">Ask AI</span>
                    )}
                    {isUser && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">You</span>
                    )}
                    <span className="text-[9px] text-muted-foreground/50 font-bold">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div className={`p-4 rounded-2xl max-w-[85%] border shadow-sm font-medium text-xs md:text-sm leading-relaxed text-left whitespace-pre-line ${
                    isUser 
                      ? 'bg-primary text-primary-foreground border-primary/20 rounded-tr-none' 
                      : 'bg-secondary/40 border-border/40 text-foreground rounded-tl-none backdrop-blur-md'
                  }`}>
                    {msg.text.includes('###') || msg.text.includes('*') || msg.text.includes('#') || msg.text.includes('**') || msg.text.includes('-') ? (
                      <div className="prose prose-invert prose-xs max-w-none text-foreground/90">
                        {parseMarkdownText(msg.text)}
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>

                  {/* Inline Stores Matched */}
                  {msg.stores && msg.stores.length > 0 && (
                    <div className="w-full mt-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2 pl-2">Matching Stores Found ({msg.stores.length})</p>
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide max-w-full">
                        {msg.stores.map((s) => (
                          <div key={s.id} className="w-64 shrink-0 bg-secondary/30 border border-border/40 hover:border-primary/30 rounded-3xl p-4 flex flex-col gap-3 transition-all">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h4 className="font-bold text-xs text-foreground line-clamp-1">{s.name}</h4>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">{s.category}</p>
                              </div>
                              <div className="flex items-center gap-1 bg-secondary border border-border/40 px-1.5 py-0.5 rounded-lg shrink-0">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-[10px] font-black text-foreground">{s.rating || '4.5'}</span>
                              </div>
                            </div>
                            
                            <p className="text-[10px] text-muted-foreground line-clamp-2 h-7">{s.description || 'Quality local store on BellBasket.'}</p>
                            
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="flex items-center gap-1 text-muted-foreground font-bold">
                                <MapPin className="w-3 h-3 text-primary" /> {s.distance ? `${s.distance.toFixed(1)} km away` : 'Within 15 km'}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                const basePath = s.slug ? `/stores/${s.slug}` : `/store/${s.id}`;
                                navigate(basePath, { state: { from: '/ask', store: s } });
                              }}
                              className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[9px] tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform text-center"
                            >
                              Visit Store
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline Products Matched */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="w-full mt-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2 pl-2">Matching Products Found ({msg.products.length})</p>
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide max-w-full">
                        {msg.products.map((p) => {
                          const count = getProductCartCount(p.id);
                          return (
                            <div key={p.id} className="w-56 shrink-0 bg-secondary/30 border border-border/40 hover:border-primary/30 rounded-3xl p-4 flex flex-col gap-3 transition-all">
                              <div className="w-full h-24 bg-secondary/50 rounded-2xl overflow-hidden flex items-center justify-center shrink-0">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                                )}
                              </div>

                              <div>
                                <h4 className="font-bold text-xs text-foreground line-clamp-1">{p.name}</h4>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase truncate">{p.storeName}</p>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-primary">£{parseFloat(p.price).toFixed(2)}</span>
                                {!p.inStock && (
                                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">OUT OF STOCK</span>
                                )}
                              </div>

                              <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
                                {!p.inStock ? (
                                  <button disabled className="w-full py-2 bg-muted text-muted-foreground text-[9px] font-black flex items-center justify-center uppercase tracking-widest cursor-not-allowed rounded-xl">
                                    OOS
                                  </button>
                                ) : count === 0 ? (
                                  <button
                                    onClick={() => handleAddToCart(p)}
                                    className="w-full py-2 bg-secondary border border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary font-black uppercase text-[9px] tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-center"
                                  >
                                    + Add to Cart
                                  </button>
                                ) : (
                                  <div className="w-full h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-between px-1.5 shadow-lg shadow-primary/20">
                                    <button 
                                      onClick={() => count > 1 ? handleUpdateCartQuantity(p, count - 1) : handleRemoveFromCart(p)} 
                                      className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                      <Minus className="w-3 h-3 text-primary-foreground" />
                                    </button>
                                    <span className="text-[11px] font-black text-primary-foreground">{count}</span>
                                    <button 
                                      onClick={() => handleUpdateCartQuantity(p, count + 1)} 
                                      className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                      <Plus className="w-3 h-3 text-primary-foreground" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggestion Chips */}
                  {msg.suggestions && msg.id === messages[messages.length - 1]?.id && (
                    <div className="flex flex-wrap gap-2 mt-4 max-w-full justify-start">
                      {msg.suggestions.map((sug) => (
                        <button
                          key={sug}
                          onClick={() => handleSendChatMessage(sug.replace(/[🍔🍎🛠️🚚📊💻💳🗺️🧹💇‍♀️]/g, '').trim())}
                          className="px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/10 border border-border/50 hover:border-primary/20 text-[10px] text-muted-foreground hover:text-primary transition-all font-bold cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Loader Indicator */}
            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 mb-1.5 px-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">Ask AI</span>
                </div>
                <div className="p-4 rounded-2xl rounded-tl-none bg-secondary/40 border border-border/40 text-muted-foreground/60 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input field */}
          <div className="p-4 bg-transparent border-t border-border/40 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="relative flex items-center bg-secondary/30 border border-border/50 hover:border-border focus-within:border-primary/50 rounded-2xl p-2.5 transition-all w-full max-w-4xl mx-auto"
            >
              <button
                type="button"
                onClick={toggleVoiceSearch}
                className={`p-2.5 rounded-xl border transition-all shrink-0 ${
                  isRecording 
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-500 animate-pulse' 
                    : 'bg-secondary border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about AC repair, grocery items, recipes, or BellBasket business roadmap..."
                disabled={isTyping}
                className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/50 pl-4 pr-12 py-2"
              />

              <button
                type="submit"
                disabled={isTyping || !chatInput.trim()}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-lg shadow-primary/20"
              >
                <Send className="w-4 h-4" />
              </button>

              <div className="absolute right-16 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-40 pointer-events-none hidden md:flex">
                <CornerDownLeft className="w-3 h-3 text-foreground" />
                <span className="text-[9px] font-black text-foreground">ENTER</span>
              </div>
            </form>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isRecording && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121212]/95 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center flex flex-col items-center relative"
            >
              {/* Voice visualizer animation */}
              <div className="relative w-40 h-40 flex items-center justify-center mb-6 mt-4">
                {/* Glow ring */}
                <motion.div
                  animate={{
                    scale: 1 + (Math.min(volume, 120) / 60),
                    opacity: 0.15 + (Math.min(volume, 120) / 150),
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
                />
                
                {/* Concentric rings */}
                <motion.div
                  animate={{
                    scale: 1 + (Math.min(volume, 120) / 100),
                  }}
                  transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                  className="absolute w-32 h-32 rounded-full border border-primary/20 flex items-center justify-center"
                >
                  <motion.div
                    animate={{
                      scale: 1 + (Math.min(volume, 120) / 120),
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                    className="w-24 h-24 rounded-full border border-primary/20 flex items-center justify-center"
                  />
                </motion.div>
                
                {/* Central animated ball with morphing border radius */}
                <motion.div
                  animate={{
                    scale: 1 + (Math.min(volume, 120) / 80),
                    borderRadius: volume > 10 
                      ? ["50%", "45% 55% 48% 52%", "52% 48% 55% 45%", "50%"] 
                      : "50%"
                  }}
                  transition={{
                    scale: { type: 'spring', stiffness: 450, damping: 10 },
                    borderRadius: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
                  }}
                  className="w-16 h-16 bg-gradient-to-tr from-primary via-amber-500 to-yellow-500 shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)] flex items-center justify-center relative z-10"
                >
                  <Mic className="w-6 h-6 text-primary-foreground" />
                </motion.div>
              </div>

              {/* Text instructions / transcript */}
              <div className="space-y-2 mb-6 w-full px-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
                  Listening
                </p>
                <div className="h-12 flex items-center justify-center">
                  <p className="text-sm font-bold text-white leading-snug line-clamp-2">
                    {chatInput ? `"${chatInput}"` : "Speak now..."}
                  </p>
                </div>
              </div>

              {/* Stop button */}
              <button
                type="button"
                onClick={toggleVoiceSearch}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-rose-500/20 text-white hover:text-rose-400 border border-white/10 hover:border-rose-500/30 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AskPage;
