const {
  fetchUsers,
  sendMulticastPush,
  createInAppNotifications,
  verifyAuthorization,
} = require('./_push');

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRetentionTemplate(campaign) {
  const map = {
    winback: {
      title: '👋 We miss you at BellBasket',
      body: 'Fresh offers are live near you. Tap to order in minutes.',
      url: '/browse',
      type: 'promotion',
    },
    reorder: {
      title: '🛍️ Time to reorder?',
      body: 'Your regular store has new stock today. Tap to place your next order.',
      url: '/browse',
      type: 'promotion',
    },
    offer: {
      title: '🔥 Limited-time BellBasket Offer',
      body: 'Open the app now to unlock today’s best local deals.',
      url: '/browse',
      type: 'promotion',
    },
    flash_sale: {
      title: '⚡ Flash Sale is Live',
      body: 'Prices dropped for a limited time. Shop now before it ends.',
      url: '/browse',
      type: 'promotion',
    },
    price_drop: {
      title: '📉 Price Drop Alert',
      body: 'An item you may like just got cheaper. Tap to buy now.',
      url: '/browse',
      type: 'promotion',
    },
    cart_reminder: {
      title: '🛒 Your cart is waiting',
      body: 'Complete your purchase before items go out of stock.',
      url: '/cart',
      type: 'promotion',
    },
    back_in_stock: {
      title: '📦 Back in stock',
      body: 'Your requested item is available again. Order before it sells out.',
      url: '/browse',
      type: 'promotion',
    },
  };

  return map[campaign] || map.winback;
}

function buildCampaignMessage({ campaign, payload, template }) {
  const productName = payload.productName || payload.product || 'selected products';
  const storeName = payload.storeName || payload.store || 'nearby stores';
  const categoryName = payload.categoryName || payload.category || 'daily essentials';
  const couponCode = payload.couponCode || payload.coupon || '';

  const discountPercent = toNumber(payload.discountPercent);
  const oldPrice = toNumber(payload.oldPrice);
  const newPrice = toNumber(payload.newPrice);
  const expiresInHours = toNumber(payload.expiresInHours);

  let title = template.title;
  let body = template.body;

  if (campaign === 'flash_sale') {
    title = `⚡ Flash Sale: ${discountPercent ? `${discountPercent}% OFF` : 'Top Deals'}`;
    body = `${productName} at ${storeName}.${expiresInHours ? ` Ends in ${expiresInHours}h.` : ''} Buy now.`;
  }

  if (campaign === 'price_drop') {
    if (oldPrice && newPrice && oldPrice > newPrice) {
      const effectiveDiscount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
      title = `📉 ${productName} now ₹${newPrice}`;
      body = `Dropped from ₹${oldPrice} (${effectiveDiscount}% off). Limited inventory available.`;
    } else {
      title = `📉 Price drop on ${productName}`;
      body = `Great deal unlocked at ${storeName}. Tap to grab it now.`;
    }
  }

  if (campaign === 'cart_reminder') {
    title = '🛒 Complete your order';
    body = `Your ${categoryName} cart is pending.${couponCode ? ` Use ${couponCode} for extra savings.` : ''}`;
  }

  if (campaign === 'back_in_stock') {
    title = `📦 ${productName} is back in stock`;
    body = `${storeName} restocked it.${couponCode ? ` Use ${couponCode} at checkout.` : ''}`;
  }

  return {
    title: payload.title || title,
    body: payload.body || body,
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const secret = process.env.RETENTION_NOTIFY_SECRET || process.env.CRON_SECRET || process.env.IMPORTANT_NOTIFY_SECRET;
  const localBypass =
    !secret
    && process.env.NODE_ENV !== 'production'
    && req.headers['x-local-test'] === '1';

  if (!secret && !localBypass) {
    return res.status(500).json({ error: 'Server misconfigured: no retention secret configured' });
  }

  if (secret && !verifyAuthorization(req, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (localBypass) {
    console.warn('[API/notify-retention] Running in local test bypass mode (x-local-test=1).');
  }

  try {
    const {
      campaign = 'winback',
      title,
      body,
      url,
      type,
      roles,
      userIds,
      sendInApp = true,
    } = req.body || {};

    const normalizedCampaign = String(campaign).toLowerCase();
    const template = getRetentionTemplate(normalizedCampaign);

    const resolvedRoles = Array.isArray(roles) && roles.length > 0
      ? roles
      : ['customer'];

    const resolvedUserIds = Array.isArray(userIds) && userIds.length > 0
      ? userIds.filter((entry) => typeof entry === 'string' && entry.length > 0)
      : undefined;

    const users = await fetchUsers({ userIds: resolvedUserIds, roles: resolvedUserIds ? undefined : resolvedRoles });

    if (users.length === 0) {
      return res.status(200).json({ success: true, message: 'No users found', userCount: 0 });
    }

    const campaignMessage = buildCampaignMessage({
      campaign: normalizedCampaign,
      payload: req.body || {},
      template,
    });

    const resolvedTitle = title || campaignMessage.title;
    const resolvedBody = body || campaignMessage.body;
    const resolvedUrl = url || template.url;
    const resolvedType = type || template.type;
    const notificationId = `retention-${normalizedCampaign}-${Date.now()}`;

    const allTokens = users.flatMap((user) => user.tokens);

    const push = allTokens.length > 0
      ? await sendMulticastPush({
          tokens: allTokens,
          title: resolvedTitle,
          body: resolvedBody,
          url: resolvedUrl,
          type: resolvedType,
          notificationId,
        })
      : { successCount: 0, failureCount: 0 };

    const inAppCreated = sendInApp
      ? await createInAppNotifications({
          userIds: users.map((user) => user.id),
          title: resolvedTitle,
          body: resolvedBody,
          url: resolvedUrl,
          type: resolvedType,
          targetId: notificationId,
        })
      : 0;

    return res.status(200).json({
      success: true,
      campaign: normalizedCampaign,
      userCount: users.length,
      tokenCount: allTokens.length,
      push,
      inAppCreated,
      notificationId,
    });
  } catch (error) {
    console.error('❌ [API/notify-retention] Error:', error);
    return res.status(500).json({
      error: 'Backend Failure',
      message: error.message,
    });
  }
};
