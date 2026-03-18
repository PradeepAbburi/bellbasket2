const {
  getAdmin,
  fetchUsers,
  sendMulticastPush,
  createInAppNotifications,
  verifyAuthorization,
} = require('./_push');

function parseDiscountValue(discountValue) {
  if (typeof discountValue === 'number') return discountValue;
  if (typeof discountValue !== 'string') return 0;
  const parsed = Number(discountValue.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildOfferFromProduct(productDoc) {
  const product = productDoc.data() || {};
  const name = product.name || 'Featured product';
  const price = Number(product.price) || 0;
  const discountedPrice = Number(product.discountedPrice) || 0;
  const discountPercentFromText = parseDiscountValue(product.discount);

  let finalPrice = discountedPrice;
  let discountPercent = 0;

  if (price > 0 && discountedPrice > 0 && discountedPrice < price) {
    discountPercent = Math.round(((price - discountedPrice) / price) * 100);
  } else if (price > 0 && discountPercentFromText > 0 && discountPercentFromText < 100) {
    discountPercent = Math.round(discountPercentFromText);
    finalPrice = Math.round(price * (100 - discountPercent) / 100);
  }

  if (discountPercent <= 0) return null;

  const vendorId = product.vendorId;
  const url = vendorId ? `/store/${vendorId}` : '/browse';
  const title = `🔥 ${name} at ${discountPercent}% OFF`;
  const body = finalPrice > 0
    ? `Now ₹${finalPrice} (was ₹${price}). Tap to grab today's offer.`
    : `Tap to view today's best price and order now.`;

  return {
    title,
    body,
    url,
    score: discountPercent,
  };
}

async function getDailyOfferPayload() {
  const { db } = getAdmin();
  const snapshot = await db.collection('products').limit(150).get();

  if (snapshot.empty) {
    return null;
  }

  let best = null;
  snapshot.forEach((doc) => {
    const candidate = buildOfferFromProduct(doc);
    if (!candidate) return;
    if (!best || candidate.score > best.score) {
      best = candidate;
    }
  });

  return best;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ error: 'Server misconfigured: CRON_SECRET not set' });
  }

  if (!verifyAuthorization(req, cronSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = req.method === 'POST' ? req.body || {} : {};
    const autoOffer = await getDailyOfferPayload().catch(() => null);
    const title = payload.title || autoOffer?.title || process.env.DAILY_NOTIFY_TITLE || 'Daily BellBasket Offer';
    const body = payload.body || autoOffer?.body || process.env.DAILY_NOTIFY_BODY || 'Check today\'s new offers and store updates.';
    const url = payload.url || autoOffer?.url || process.env.DAILY_NOTIFY_URL || '/browse';
    const roles = Array.isArray(payload.roles) && payload.roles.length > 0
      ? payload.roles
      : ['customer', 'vendor'];
    const type = payload.type || 'system';

    const users = await fetchUsers({ roles });
    if (users.length === 0) {
      return res.status(200).json({ success: true, message: 'No users found for daily notification', userCount: 0 });
    }

    const allTokens = users.flatMap((user) => user.tokens);
    const notificationId = `daily-${new Date().toISOString().slice(0, 10)}`;

    const pushResult = allTokens.length > 0
      ? await sendMulticastPush({
          tokens: allTokens,
          title,
          body,
          url,
          type,
          notificationId,
        })
      : { successCount: 0, failureCount: 0 };

    const inAppCreated = await createInAppNotifications({
      userIds: users.map((user) => user.id),
      title,
      body,
      url,
      type,
      targetId: notificationId,
    });

    return res.status(200).json({
      success: true,
      notificationId,
      userCount: users.length,
      tokenCount: allTokens.length,
      push: pushResult,
      inAppCreated,
    });
  } catch (error) {
    console.error('❌ [API/daily-notify] Error:', error);
    return res.status(500).json({
      error: 'Backend Failure',
      message: error.message,
    });
  }
};
