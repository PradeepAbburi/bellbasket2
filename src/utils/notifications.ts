import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

/**
 * Global audio context to be reused and unlocked via user interaction
 */
let sharedAudioCtx: AudioContext | null = null;
let isAudioPrimed = false;
let audioStatusListeners: ((status: 'running' | 'suspended' | 'closed' | 'non-interactive') => void)[] = [];

/**
 * Get current audio context state
 */
export const getAudioStatus = () => {
    if (!sharedAudioCtx) return 'non-interactive';
    return sharedAudioCtx.state as any;
};

/**
 * Subscribe to audio status changes
 */
export const onAudioStatusChange = (cb: (status: any) => void) => {
    audioStatusListeners.push(cb);
    return () => {
        audioStatusListeners = audioStatusListeners.filter(l => l !== cb);
    };
};

const notifyListeners = () => {
    const status = getAudioStatus();
    audioStatusListeners.forEach(l => l(status));
};

/**
 * Initialize and unlock audio context on mobile/modern browsers.
 * Self-corrects and primes the hardware with a silent buffer.
 */
export const initAudio = async () => {
    try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        if (!sharedAudioCtx) {
            sharedAudioCtx = new AudioContextClass();
        }

        if (sharedAudioCtx.state === 'suspended') {
            await sharedAudioCtx.resume();
        }

        // 🌡️ Hardware Priming: Play a short, silent buffer to wake up the DAC on mobile
        // This is a known fix for iOS Safari and some silent Android devices
        const silentBuf = sharedAudioCtx.createBuffer(1, 1, 22050);
        const source = sharedAudioCtx.createBufferSource();
        source.buffer = silentBuf;
        source.connect(sharedAudioCtx.destination);
        source.start(0);
        
        if (!isAudioPrimed) {
            isAudioPrimed = true;
            console.log('🔊 [Audio] System Primed and Ready');
        }
        notifyListeners();
    } catch (e) {
        console.warn('❌ [Audio] Init failed:', e);
    }
};

/**
 * Synthesize a clean, robust bell sound.
 * Enhanced for visibility and persistence on mobile.
 */
export const playBellSound = async (forceSound = false) => {
    try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        console.log(`🔔 [Notifications] Triggering bell sound (Force: ${forceSound})`);
        
        // 📳 Haptic feedback for mobile - only if user has interacted (primed)
        if ('vibrate' in navigator && isAudioPrimed) {
            try {
                navigator.vibrate([100, 50, 100]); 
            } catch (e) {
                // Silent fail for vibration restrictions
            }
        }

        // Re-init if missing
        if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
            await initAudio();
        }
        
        const ctx = sharedAudioCtx!;
        
        // 🔄 Aggressive Context Management:
        // Attempt to resume if suspended - many browsers block this unless it's a direct user action,
        // but we've added global listeners to App.tsx to prime this.
        if (ctx.state !== 'running') {
            try {
                await ctx.resume();
            } catch (e) {
                console.warn('⚠️ [Audio] Context resume failed (likely backgrounded or blocked):', e);
                // Fallback: If we're on mobile and it's blocked, not much we can do without interaction,
                // but at least we tried.
            }
        }

        const now = ctx.currentTime;
        
        // Define frequency based on priority
        const freq1 = forceSound ? 1046.50 : 880.00; // C6 or A5
        const freq2 = forceSound ? 830.61 : 659.25;  // Ab5 or E5

        const playChime = (freq: number, startTime: number, duration: number, vol = 0.5) => {
            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);

            // Envelope
            masterGain.gain.setValueAtTime(0, startTime);
            masterGain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
            masterGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            // Oscillators for a "rich" bell sound
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            
            const overtone = ctx.createOscillator();
            overtone.type = 'sine';
            overtone.frequency.setValueAtTime(freq * 2.1, startTime);
            const overtoneGain = ctx.createGain();
            overtoneGain.gain.setValueAtTime(vol * 0.3, startTime);
            overtoneGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.8);

            osc.connect(masterGain);
            overtone.connect(overtoneGain);
            overtoneGain.connect(masterGain);

            osc.start(startTime);
            overtone.start(startTime);
            osc.stop(startTime + duration);
            overtone.stop(startTime + duration);
        };

        // Standard "Ding-Dong" pattern
        playChime(freq1, now + 0.05, 1.2, 0.8); 
        playChime(freq2, now + 0.5, 1.5, 0.9);

        console.log('✅ [Notifications] Sound dispatched');
        notifyListeners();

    } catch (e) {
        console.warn('⚠️ [Audio] Playback exception:', e);
    }
};

/**
 * Sends an in-app notification by adding it to the user's notification collection in Firestore.
 */
export const sendInAppNotification = async (
    targetUserId: string,
    notification: {
        title: string;
        body: string;
        url?: string;
        type?: 'order' | 'booking' | 'system' | 'review';
        id?: string;
    }
) => {
    try {
        const notificationData = {
            userId: targetUserId,
            title: notification.title,
            body: notification.body,
            url: notification.url || '/',
            type: notification.type || 'system',
            targetId: notification.id || '',
            createdAt: serverTimestamp(),
            read: false
        };

        // Send as a new document each time to bypass update permissions restrictors 
        // and ensure the customer gets a historical record of status updates.
        await addDoc(collection(db, 'notifications'), notificationData);
        console.log(`[Notification] In-app alert queued for user ${targetUserId} (Type: ${notification.type})`);

        // Attempt push notification via backend. 
        // Note: This 404s on local 'npm run dev' unless 'vercel dev' is used.
        const isLocal = window.location.hostname === 'localhost';
        
        fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vendorId: targetUserId,
                title: notification.title,
                body: notification.body,
                url: notification.url,
                orderId: notification.id
            })
        }).then(async (res) => {
            if (!res.ok) {
                if (res.status === 404 && isLocal) {
                    console.info('ℹ️ [Push] Backend notified: 404 (Local dev skip). Tip: Run "vercel dev" to test local push notifications.');
                    return;
                }
                const errData = await res.json().catch(() => ({ error: 'Unknown Error' }));
                console.warn('⚠️ [Push] Backend skipped/failed:', res.status, errData);
                // 🛠️ Debug Alert: Remove after fixing the 500 error
                alert(`Push Notification Error (${res.status}): ${JSON.stringify(errData)}`);
            } else {
                console.log('✅ [Push] Backend notified successfully');
            }
        }).catch(err => {
            if (isLocal) {
                console.info('ℹ️ [Push] Backend unreachable (Local dev).');
            } else {
                console.error('❌ [Push] Network/Fetch failed:', err);
            }
        });

    } catch (err) {
        console.error('[Notification] Failed to send in-app alert:', err);
    }
};
