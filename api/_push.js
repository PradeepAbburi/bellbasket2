const admin = require('firebase-admin');

const MAX_MULTICAST_SIZE = 500;
const MAX_BATCH_WRITES = 450;

function formatPrivateKey(key) {
  if (!key) return key;
  let formattedKey = key;
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }
  return formattedKey.replace(/\\n/g, '\n');
}

function tryParseServiceAccountFromEnv() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const rawB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (rawJson && typeof rawJson === 'string') {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: formatPrivateKey(parsed.private_key),
        };
      }
    } catch {
      console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON.');
    }
  }

  if (rawB64 && typeof rawB64 === 'string') {
    try {
      const decoded = Buffer.from(rawB64, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed && parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: formatPrivateKey(parsed.private_key),
        };
      }
    } catch {
      console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_BASE64 is set but invalid.');
    }
  }

  return null;
}

function looksLikePemPrivateKey(value) {
  if (!value || typeof value !== 'string') return false;
  return value.includes('-----BEGIN PRIVATE KEY-----') && value.includes('-----END PRIVATE KEY-----');
}

function isLikelyCorruptedPem(pem) {
  if (!looksLikePemPrivateKey(pem)) return false;
  try {
    const b64 = pem.replace(/-----(?:BEGIN|END) PRIVATE KEY-----|[\n\r]/g, '');
    const der = Buffer.from(b64, 'base64');
    if (der.length < 4 || der[0] !== 0x30) return true;
    const headerLen = der[1] === 0x82 ? 4 : (der[1] === 0x81 ? 3 : 2);
    const seqLen = der[1] === 0x82
      ? (der[2] << 8) + der[3]
      : der[1] === 0x81 ? der[2] : der[1];
    return der.length - headerLen !== seqLen;
  } catch {
    return true;
  }
}

function getAdmin() {
  if (!admin.apps.length) {
    const serviceAccountFromEnv = tryParseServiceAccountFromEnv();
    const projectId = serviceAccountFromEnv?.projectId || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = serviceAccountFromEnv?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = serviceAccountFromEnv?.privateKey || process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId) {
      throw new Error('Missing FIREBASE_PROJECT_ID env var');
    }

    const formattedKey = formatPrivateKey(privateKey);

    if (!serviceAccountFromEnv && privateKey && !looksLikePemPrivateKey(formattedKey)) {
      throw new Error(
        'FIREBASE_PRIVATE_KEY is not a valid PEM private key.\n' +
        'Expected value starts with -----BEGIN PRIVATE KEY-----.\n' +
        'Fix: regenerate service account key in Firebase Console and set FIREBASE_PRIVATE_KEY with \\n escaped newlines.\n' +
        'If using ADC instead, remove FIREBASE_PRIVATE_KEY from .env.'
      );
    }

    if (clientEmail && formattedKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey: formattedKey }),
        });
        return {
          admin,
          db: admin.firestore(),
          messaging: admin.messaging(),
        };
      } catch (certErr) {
        if (isLikelyCorruptedPem(formattedKey)) {
          console.warn('[Firebase Admin] ⚠️  FIREBASE_PRIVATE_KEY appears corrupted.');
          console.warn('[Firebase Admin]    Fix: Firebase Console → Project Settings → Service Accounts → Generate new private key');
        }
        throw new Error(
          'Firebase Admin service account init failed: ' + certErr.message + '\n' +
          'Fix: Regenerate your Firebase service account private key and update FIREBASE_PRIVATE_KEY in .env (use \\n escaped newlines).'
        );
      }
    }

    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    } catch (adcErr) {
      throw new Error(
        'Firebase Admin init failed.\n' +
        '  • Service account credential failed or missing.\n' +
        '  • Application Default Credentials unavailable: ' + adcErr.message + '\n\n' +
        'Fix one of these:\n' +
        '  1. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY\n' +
        '     OR FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_SERVICE_ACCOUNT_BASE64\n' +
        '  2. Run: gcloud auth application-default login'
      );
    }
  }

  return {
    admin,
    db: admin.firestore(),
    messaging: admin.messaging(),
  };
}

function uniqueValidTokens(rawTokens) {
  if (!Array.isArray(rawTokens)) return [];
  return [...new Set(rawTokens)].filter((token) => typeof token === 'string' && token.length > 10);
}

function chunkArray(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

function normalizeUserDoc(userDoc) {
  const data = userDoc.data() || {};
  const tokens = uniqueValidTokens([
    ...(Array.isArray(data.fcmTokens) ? data.fcmTokens : []),
    ...(data.fcmToken ? [data.fcmToken] : []),
  ]);

  return {
    id: userDoc.id,
    role: data.role || 'customer',
    tokens,
  };
}

async function fetchUsers({ userIds, roles } = {}) {
  const { db } = getAdmin();

  if (Array.isArray(userIds) && userIds.length > 0) {
    const refs = userIds.map((id) => db.collection('users').doc(id));
    const docs = await db.getAll(...refs);
    return docs.filter((doc) => doc.exists).map(normalizeUserDoc);
  }

  const snapshot = await db.collection('users').get();
  let users = snapshot.docs.map(normalizeUserDoc);

  if (Array.isArray(roles) && roles.length > 0) {
    const roleSet = new Set(roles);
    users = users.filter((user) => roleSet.has(user.role));
  }

  return users;
}

async function sendMulticastPush({ tokens, title, body, url = '/', type = 'system', notificationId = 'general-alert' }) {
  const { messaging } = getAdmin();
  const chunks = chunkArray(tokens, MAX_MULTICAST_SIZE);

  let successCount = 0;
  let failureCount = 0;

  for (const tokenChunk of chunks) {
    const response = await messaging.sendEachForMulticast({
      tokens: tokenChunk,
      notification: {
        title,
        body,
      },
      android: {
        priority: 'high',
        ttl: 86400000,
        notification: {
          sound: 'default',
          tag: notificationId,
          channelId: 'orders_channel',
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
          Urgency: 'high',
        },
        notification: {
          title,
          body,
          icon: '/pwa-icon.png',
          badge: '/pwa-icon.png',
          tag: notificationId,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: {
            url,
            id: notificationId,
            type,
          },
        },
        fcmOptions: {
          link: url,
        },
      },
      data: {
        url,
        id: notificationId,
        type,
      },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;
  }

  return { successCount, failureCount };
}

async function createInAppNotifications({ userIds, title, body, url = '/', type = 'system', targetId = '' }) {
  const { admin: adminInstance, db } = getAdmin();
  const users = userIds.filter((id) => typeof id === 'string' && id.length > 0);
  const chunks = chunkArray(users, MAX_BATCH_WRITES);
  let created = 0;

  for (const userChunk of chunks) {
    const batch = db.batch();
    for (const userId of userChunk) {
      const ref = db.collection('notifications').doc();
      batch.set(ref, {
        userId,
        title,
        body,
        url,
        type,
        targetId,
        read: false,
        createdAt: adminInstance.firestore.FieldValue.serverTimestamp(),
      });
      created += 1;
    }
    await batch.commit();
  }

  return created;
}

function verifyAuthorization(req, expectedSecret) {
  if (!expectedSecret) return false;
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const apiKey = req.headers['x-api-key'];
  return bearer === expectedSecret || apiKey === expectedSecret;
}

module.exports = {
  getAdmin,
  fetchUsers,
  sendMulticastPush,
  createInAppNotifications,
  verifyAuthorization,
  uniqueValidTokens,
};
