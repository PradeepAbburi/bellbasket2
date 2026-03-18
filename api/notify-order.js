const {
  fetchUsers,
  sendMulticastPush,
  createInAppNotifications,
} = require('./_push');

const ORDER_STATUS_COPY = {
  pending: {
    title: '🛒 New BellBasket Order',
    body: 'Your order is placed successfully. We will keep you updated.',
  },
  accepted: {
    title: '✅ Order Accepted',
    body: 'Your store has accepted the order and started preparing it.',
  },
  packed: {
    title: '📦 Order Packed',
    body: 'Your order is packed and ready for pickup.',
  },
  completed: {
    title: '🎉 Order Completed',
    body: 'Order completed successfully. Come back for today’s fresh offers.',
  },
  rejected: {
    title: '❌ Order Cancelled',
    body: 'Your order was cancelled by the store. You can place a new order anytime.',
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      userId,
      userIds,
      orderId,
      orderStatus,
      storeName,
      title,
      body,
      url = '/receipts',
      type = 'order',
      id,
      sendInApp = true,
    } = req.body || {};

    const explicitUserIds = Array.isArray(userIds)
      ? userIds.filter((entry) => typeof entry === 'string' && entry.length > 0)
      : [];

    if (typeof userId === 'string' && userId.length > 0) {
      explicitUserIds.push(userId);
    }

    const targetUserIds = [...new Set(explicitUserIds)];

    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: 'Missing required target: userId or userIds[]' });
    }

    const normalizedStatus = typeof orderStatus === 'string' ? orderStatus.toLowerCase() : '';
    const fallbackCopy = ORDER_STATUS_COPY[normalizedStatus] || ORDER_STATUS_COPY.pending;
    const resolvedTitle = title || fallbackCopy.title;

    let resolvedBody = body || fallbackCopy.body;
    if (!body && storeName && normalizedStatus && ORDER_STATUS_COPY[normalizedStatus]) {
      if (normalizedStatus === 'accepted') {
        resolvedBody = `✅ ${storeName} accepted your order. We will update you as it is prepared.`;
      } else if (normalizedStatus === 'packed') {
        resolvedBody = `📦 Your order from ${storeName} is packed and ready for pickup.`;
      } else if (normalizedStatus === 'completed') {
        resolvedBody = `🎉 Your order from ${storeName} is completed. Check new offers for your next order.`;
      } else if (normalizedStatus === 'rejected') {
        resolvedBody = `❌ Your order from ${storeName} was cancelled by the vendor.`;
      }
    }

    const notificationId = id
      || (orderId && normalizedStatus ? `${orderId}-${normalizedStatus}` : '')
      || `order-${Date.now()}`;

    const users = await fetchUsers({ userIds: targetUserIds });
    if (users.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No matching users found',
        userCount: 0,
      });
    }

    const allTokens = users.flatMap((user) => user.tokens);

    const push = allTokens.length > 0
      ? await sendMulticastPush({
          tokens: allTokens,
          title: resolvedTitle,
          body: resolvedBody,
          url,
          type,
          notificationId,
        })
      : { successCount: 0, failureCount: 0 };

    const inAppCreated = sendInApp
      ? await createInAppNotifications({
          userIds: users.map((user) => user.id),
          title: resolvedTitle,
          body: resolvedBody,
          url,
          type,
          targetId: orderId || notificationId,
        })
      : 0;

    return res.status(200).json({
      success: true,
      userCount: users.length,
      tokenCount: allTokens.length,
      push,
      inAppCreated,
      notificationId,
      orderStatus: normalizedStatus || undefined,
    });
  } catch (error) {
    console.error('❌ [API/notify-order] Error:', error);
    return res.status(500).json({
      error: 'Backend Failure',
      message: error.message,
    });
  }
};
