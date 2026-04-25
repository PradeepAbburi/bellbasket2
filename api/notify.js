import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Validate environment variables early
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Robust key formatting for Vercel
  const formattedKey = privateKey 
    ? privateKey.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1')
    : undefined;

  const apps = getApps();
  if (!apps.length) {
    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ [API/Notify] Missing Firebase Admin credentials in environment variables.');
    } else {
      try {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: formattedKey,
          }),
        });
        console.log('✅ [API/Notify] Firebase Admin Initialized for project:', projectId);
      } catch (e) {
        console.error('❌ [API/Notify] Firebase Admin Initialization Failed:', e.message);
      }
    }
  }

  if (!getApps().length) {
    const missing = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    
    console.error('❌ [API/Notify] Critical: Firebase Admin not initialized. Missing:', missing.join(', '));
    return res.status(500).json({ 
      error: 'Firebase Admin not initialized properly',
      missingConfig: missing,
      projectId: projectId || 'MISSING',
      clientEmail: clientEmail || 'MISSING',
      hasPrivateKey: !!privateKey
    });
  }

  const db = getFirestore();

  try {
    const { vendorId, title, body, url, orderId, id, type } = req.body;
    const notificationId = id || orderId || 'general-alert';
    const notificationType = type || (orderId ? 'order' : 'system');

    if (!vendorId) {
      return res.status(400).json({ error: 'Missing vendorId in request body' });
    }

    // 1. Get user's push tokens from Firestore (stored in fcmTokens field)
    const userDoc = await db.collection('users').doc(vendorId).get();
    if (!userDoc.exists) {
      console.warn(`⚠️ [API/Notify] User ${vendorId} not found in Firestore`);
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const tokens = userData.fcmTokens || (userData.fcmToken ? [userData.fcmToken] : []);

    // Filter tokens: Strictly only valid OneSignal player/subscription IDs (UUID format)
    // Filter tokens: Strictly only valid OneSignal player/subscription IDs (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validOneSignalIds = [...new Set(tokens)]
      .map(t => typeof t === 'string' ? t.trim() : t)
      .filter(t => typeof t === 'string' && uuidRegex.test(t));

    console.log(`🔍 [OneSignal] Scanning tokens for ${vendorId}: Found ${tokens.length} total, ${validOneSignalIds.length} valid UUIDs.`);

    if (validOneSignalIds.length === 0) {
      console.log(`ℹ️ [OneSignal] No valid UUIDs found for user ${vendorId}. Skipping push. Found ${tokens.length} total raw tokens.`);
      return res.status(200).json({ 
        success: true, 
        message: 'No valid OneSignal IDs for user (Zero UUIDs found)',
        recipientCount: 0,
        debugTokens: tokens.length,
        skipped: true 
      });
    }

  const appId = (process.env.ONESIGNAL_APP_ID || "").trim();
  const apiKey = (process.env.ONESIGNAL_REST_API_KEY || "").trim();

  if (!getApps().length || !appId || !apiKey) {
    const missing = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    if (!appId) missing.push('ONESIGNAL_APP_ID');
    if (!apiKey) missing.push('ONESIGNAL_REST_API_KEY');
    
    return res.status(500).json({ 
      error: 'Environment Configuration Incomplete',
      missingFields: missing,
      advice: 'Please add these variables to your Vercel Project Settings -> Environment Variables.'
    });
  }

    const dataUrl = url || (userData.role === 'vendor' ? '/vendor/orders' : '/receipts');
    const authHeader = apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const absoluteBase = process.env.APP_URL || `${protocol}://${host}`;
    const safeUrl = (typeof dataUrl === 'string' && dataUrl) ? dataUrl : '/';
    const fullWebUrl = safeUrl.startsWith('http') ? safeUrl : `${absoluteBase}${safeUrl}`;

    const notificationPayload = {
      app_id: appId,
      // Target by both specific subscription IDs and the user's unique Firestore ID (External ID)
      // This provides a robust fallback if the subscription ID has changed in the browser.
      include_subscription_ids: validOneSignalIds,
      include_external_user_ids: [vendorId], 
      headings: { 
        en: title || (notificationType === 'booking' ? 'New Booking!' : 'New Order!') 
      },
      contents: { 
        en: body || 'You have a new update on BellBasket.' 
      },
      data: {
        url: safeUrl,
        id: notificationId,
        type: notificationType,
        orderId: orderId || id
      },
      web_url: fullWebUrl,
      chrome_web_badge: '/pwa-icon.png',
      chrome_web_icon: '/pwa-icon.png',
      ios_sound: 'default',
      android_sound: 'default'
    };

    console.log(`🚀 [OneSignal] Posting notification to user ${vendorId} (${validOneSignalIds.length} IDs)`);

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': authHeader
      },
      body: JSON.stringify(notificationPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ [OneSignal] API Error Response:', result);
      return res.status(response.status).json({ 
        success: false, 
        error: result,
        status: response.status,
        debug: {
          appIdUsed: appId.substring(0, 8) + '...',
          authType: authHeader.split(' ')[0],
          tokenCount: validOneSignalIds.length
        }
      });
    }

    // result.recipients = number of successfully matched recipients
    // result.id = notification ID
    console.log('✅ [OneSignal] Success:', result);
    return res.status(200).json({ 
      success: true, 
      recipientCount: result.recipients || 0,
      notificationId: result.id,
      errors: result.errors,
      debug: {
        validIdsSent: validOneSignalIds.length,
        totalTokensChecked: tokens.length
      }
    });

  } catch (error) {
    console.error('❌ [API/Notify] fatal error:', error);
    return res.status(500).json({ 
      error: 'Backend Failure', 
      message: error.message,
      code: error.code,
      configStatus: {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
        privateKeyLength: privateKey ? privateKey.length : 0,
        appsCount: getApps().length
      },
      stack: error.stack
    });
  }
}
