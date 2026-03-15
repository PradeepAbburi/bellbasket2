const {
  fetchUsers,
  sendMulticastPush,
  createInAppNotifications,
  verifyAuthorization,
} = require('./_push');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const secret = process.env.IMPORTANT_NOTIFY_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server misconfigured: IMPORTANT_NOTIFY_SECRET not set' });
  }

  if (!verifyAuthorization(req, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const {
      title,
      body,
      url = '/',
      type = 'system',
      id,
      roles,
      userIds,
      sendInApp = true,
    } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'Missing required fields: title, body' });
    }

    if ((!Array.isArray(userIds) || userIds.length === 0) && (!Array.isArray(roles) || roles.length === 0)) {
      return res.status(400).json({ error: 'Provide at least one target filter: userIds or roles' });
    }

    const users = await fetchUsers({ userIds, roles });
    if (users.length === 0) {
      return res.status(200).json({ success: true, message: 'No matching users found', userCount: 0 });
    }

    const allTokens = users.flatMap((user) => user.tokens);
    const pushResult = allTokens.length > 0
      ? await sendMulticastPush({
          tokens: allTokens,
          title,
          body,
          url,
          type,
          notificationId: id || `important-${Date.now()}`,
        })
      : { successCount: 0, failureCount: 0 };

    const inAppCreated = sendInApp
      ? await createInAppNotifications({
          userIds: users.map((user) => user.id),
          title,
          body,
          url,
          type,
          targetId: id || '',
        })
      : 0;

    return res.status(200).json({
      success: true,
      userCount: users.length,
      tokenCount: allTokens.length,
      push: pushResult,
      inAppCreated,
    });
  } catch (error) {
    console.error('❌ [API/notify-important] Error:', error);
    return res.status(500).json({
      error: 'Backend Failure',
      message: error.message,
    });
  }
};
