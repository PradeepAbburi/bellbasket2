const { getAdmin, uniqueValidTokens } = require('./_push');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { db, messaging: fcm } = getAdmin();
    const { vendorId, title, body, url, orderId, id, type } = req.body;
    const notificationId = id || orderId || 'general-alert';
    const notificationType = type || (orderId ? 'order' : 'system');

    if (!vendorId) {
      return res.status(400).json({ error: 'Missing vendorId in request body' });
    }

    // ... (Lookup vendor tokens shortened for context) ...
    // 1. Get vendor's FCM token from Firestore
    const userDoc = await db.collection('users').doc(vendorId).get();
    if (!userDoc.exists) {
      console.warn(`⚠️ [API/Notify] User ${vendorId} not found in Firestore`);
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const tokens = uniqueValidTokens([
      ...(Array.isArray(userData.fcmTokens) ? userData.fcmTokens : []),
      ...(userData.fcmToken ? [userData.fcmToken] : []),
    ]);

    if (!tokens || tokens.length === 0) {
      console.log(`ℹ️ [API/Notify] No FCM tokens found for user ${vendorId}`);
      return res.status(200).json({ success: false, message: 'No FCM tokens for user' });
    }

    // 2. Send Multicast Notification to all devices
    const multicastMessage = {
      tokens,
      notification: {
        title: title || (notificationType === 'booking' ? 'New Booking!' : 'New Order!'),
        body: body || 'You have a new update on BellBasket.',
      },
      android: {
        priority: 'high',
        ttl: 86400000,
        notification: {
          icon: 'stock_ticker_update',
          color: '#ff4f00',
          sound: 'default',
          tag: notificationId,
          channelId: 'orders_channel'
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title: title || 'BellBasket Update',
          body: body || 'You have a new alert.',
          icon: '/pwa-icon.png',
          badge: '/pwa-icon.png',
          tag: notificationId,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: {
            url: url || '/vendor',
            id: notificationId,
            type: notificationType
          }
        },
        fcmOptions: {
          link: url || '/vendor'
        }
      },
      data: {
        url: url || '/vendor',
        id: notificationId,
        type: notificationType,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sound: 'default',
        notification_foreground: 'true'
      }
    };

    if (multicastMessage.tokens.length === 0) {
      return res.status(200).json({ success: false, message: 'No valid FCM tokens found' });
    }

    const response = await fcm.sendEachForMulticast(multicastMessage);
    console.log(`🚀 [API/Notify] Sent ${response.successCount} messages; ${response.failureCount} failed for user ${vendorId}`);

    return res.status(200).json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    });

  } catch (error) {
    console.error('❌ [API/Notify] fatal error:', error);
    return res.status(500).json({
      error: 'Backend Failure',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
