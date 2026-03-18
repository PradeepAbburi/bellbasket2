#!/usr/bin/env node

/**
 * Real-time notification tester for BellBasket.
 *
 * Local-first examples:
 * 1) Start local API (recommended):
 *    vercel dev
 *
 * 2) Send real-time test to one user locally (no secret needed, uses /api/notify fallback)
 *    node test/realtime-notification-test.mjs --mode=important --userIds=<USER_ID>
 *
 * 3) Simulate order tracking flow locally (accepted -> packed -> completed)
 *    node test/realtime-notification-test.mjs --mode=order-flow --userIds=<USER_ID> --storeName="BellBasket Mart"
 *
 * 4) Test secure daily endpoint (requires CRON_SECRET)
 *    CRON_SECRET=xxx node test/realtime-notification-test.mjs --mode=daily --baseUrl=http://localhost:8080
 *
 * 5) Test order endpoint directly (uses /api/notify-order)
 *    node test/realtime-notification-test.mjs --mode=order --userIds=<USER_ID> --orderStatus=accepted --storeName="BellBasket Mart"
 *
 * 6) Test retention endpoint (requires RETENTION_NOTIFY_SECRET / CRON_SECRET / IMPORTANT_NOTIFY_SECRET)
 *    RETENTION_NOTIFY_SECRET=xxx node test/realtime-notification-test.mjs --mode=retention --roles=customer --campaign=winback
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  })
);

const mode = args.mode || 'important';

const now = new Date().toISOString();
const defaultOrderId = args.orderId || `ORD-TEST-${Date.now()}`;
let resolvedBaseUrl = '';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeBaseUrl(value) {
  return (value || '').replace(/\/$/, '');
}

function isLocalhostUrl(url) {
  return /localhost|127\.0\.0\.1/.test(url);
}

async function canReachApi(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/hello`);
    return res.ok;
  } catch {
    return false;
  }
}

async function endpointAcceptsPost(baseUrl, path) {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ probe: true }),
    });
    return res.status !== 404;
  } catch {
    return false;
  }
}

async function findBaseUrlForEndpoint(path) {
  const candidates = [
    resolvedBaseUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  const uniqueCandidates = [...new Set(candidates)];
  for (const candidate of uniqueCandidates) {
    if (await endpointAcceptsPost(candidate, path)) {
      if (candidate !== resolvedBaseUrl) {
        console.warn(`⚠️ ${path} not available at ${resolvedBaseUrl}. Using ${candidate} instead.`);
      }
      return candidate;
    }
  }

  throw new Error(`Could not find local endpoint ${path}. Start backend API (for example with vercel dev).`);
}

async function requestJson(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${JSON.stringify(body)}`);
  }
  return body;
}

function parseUserIds(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseRoles(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

async function pickBaseUrl() {
  const explicit = normalizeBaseUrl(process.env.NOTIFY_BASE_URL || args.baseUrl);
  const candidates = [
    ...(explicit ? [explicit] : []),
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  const uniqueCandidates = [...new Set(candidates)];

  for (const candidate of uniqueCandidates) {
    if (await canReachApi(candidate)) {
      if (explicit && candidate !== explicit) {
        console.warn(`⚠️ API not found at ${explicit}. Using ${candidate} instead.`);
      }
      return candidate;
    }
  }

  throw new Error(
    'Could not detect local API. Start your local server and/or pass --baseUrl=http://localhost:8080'
  );
}

async function sendViaLocalNotify({ title, body, url, type = 'system', userIds, id }) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('Local fallback (/api/notify) requires --userIds=<id1,id2>');
  }

  const notifyBaseUrl = await findBaseUrlForEndpoint('/api/notify');

  const results = [];
  for (const userId of userIds) {
    const response = await requestJson(`${notifyBaseUrl}/api/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vendorId: userId,
        title,
        body,
        url,
        type,
        id,
      }),
    });
    results.push({ userId, response });
  }

  return {
    mode: 'local-fallback',
    count: results.length,
    results,
  };
}

async function sendImportant({ title, body, url, type = 'system', userIds, roles, id }) {
  const secret = process.env.IMPORTANT_NOTIFY_SECRET || args.secret;
  const canUseLocalFallback = isLocalhostUrl(resolvedBaseUrl);

  if (!secret) {
    if (canUseLocalFallback) {
      if (roles.length > 0 && userIds.length === 0) {
        throw new Error('Local fallback does not support roles. Pass explicit --userIds=<id1,id2>.');
      }
      return sendViaLocalNotify({ title, body, url, type, userIds, id });
    }
    throw new Error('Missing IMPORTANT_NOTIFY_SECRET (or --secret) for /api/notify-important');
  }

  const payload = {
    title,
    body,
    url,
    type,
    id,
    sendInApp: true,
  };

  if (userIds.length > 0) payload.userIds = userIds;
  if (roles.length > 0 && userIds.length === 0) payload.roles = roles;

  return requestJson(`${resolvedBaseUrl}/api/notify-important`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });
}

async function runImportantMode() {
  const userIds = parseUserIds(args.userIds);
  const roles = parseRoles(args.roles);

  if (userIds.length === 0 && roles.length === 0) {
    throw new Error('Provide --userIds=u1,u2 (for local fallback) or --roles=customer,vendor (with IMPORTANT_NOTIFY_SECRET)');
  }

  const title = args.title || '🔔 Real-time Notification Test';
  const body = args.body || `Push test fired at ${now}`;
  const url = args.url || '/';

  const response = await sendImportant({
    title,
    body,
    url,
    type: args.type || 'system',
    userIds,
    roles,
    id: args.id || `test-important-${Date.now()}`,
  });

  console.log('✅ Important notification sent:', response);
}

async function runOrderFlowMode() {
  const userIds = parseUserIds(args.userIds);
  if (userIds.length === 0) {
    throw new Error('Order flow requires --userIds=<customerUserId>');
  }

  const storeName = args.storeName || 'BellBasket Store';
  const delayMs = Number(args.delayMs || 2000);

  const stages = [
    {
      status: 'accepted',
      title: 'BellBasket Order Update',
      body: `✅ ${storeName} accepted your order.`,
    },
    {
      status: 'packed',
      title: 'BellBasket Order Update',
      body: `📦 Your order from ${storeName} is packed and ready for pickup.`,
    },
    {
      status: 'completed',
      title: 'BellBasket Order Update',
      body: `🎉 Your order from ${storeName} is completed.`,
    },
  ];

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];

    const response = await sendImportant({
      title: stage.title,
      body: `${stage.body} (test ${stage.status})`,
      url: '/receipts',
      type: 'order',
      userIds,
      roles: [],
      id: `${defaultOrderId}-${stage.status}`,
    });

    console.log(`✅ Sent ${stage.status}:`, response);

    if (index < stages.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(`🎯 Order flow simulation complete for order ${defaultOrderId}`);
}

async function runOrderMode() {
  const userIds = parseUserIds(args.userIds);
  if (userIds.length === 0) {
    throw new Error('Order mode requires --userIds=<customerUserId>');
  }

  const notifyBaseUrl = await findBaseUrlForEndpoint('/api/notify-order');
  const orderStatus = args.orderStatus || 'accepted';
  const storeName = args.storeName || 'BellBasket Store';
  const orderId = args.orderId || defaultOrderId;

  const response = await requestJson(`${notifyBaseUrl}/api/notify-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userIds,
      orderId,
      orderStatus,
      storeName,
      title: args.title,
      body: args.body,
      url: args.url || '/receipts',
      type: args.type || 'order',
      sendInApp: Boolean(args.sendInApp === 'true'),
    }),
  });

  console.log('✅ Order notification sent:', response);
}

async function runDailyMode() {
  const secret = process.env.CRON_SECRET || args.cronSecret;
  if (!secret) {
    throw new Error('Missing CRON_SECRET (or --cronSecret) for /api/daily-notify');
  }

  const response = await requestJson(`${resolvedBaseUrl}/api/daily-notify`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  console.log('✅ Daily notifier response:', response);
}

async function runRetentionMode() {
  const secret = process.env.RETENTION_NOTIFY_SECRET || process.env.CRON_SECRET || process.env.IMPORTANT_NOTIFY_SECRET || args.secret;
  if (!secret) {
    throw new Error('Missing RETENTION_NOTIFY_SECRET (or CRON_SECRET / IMPORTANT_NOTIFY_SECRET / --secret) for /api/notify-retention');
  }

  const notifyBaseUrl = await findBaseUrlForEndpoint('/api/notify-retention');
  const roles = parseRoles(args.roles);
  const userIds = parseUserIds(args.userIds);

  const payload = {
    campaign: args.campaign || 'winback',
    title: args.title,
    body: args.body,
    url: args.url,
    type: args.type || 'retention',
    sendInApp: args.sendInApp ? args.sendInApp === 'true' : true,
  };

  if (roles.length > 0) payload.roles = roles;
  if (userIds.length > 0) payload.userIds = userIds;

  const response = await requestJson(`${notifyBaseUrl}/api/notify-retention`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });

  console.log('✅ Retention notification sent:', response);
}

async function main() {
  resolvedBaseUrl = await pickBaseUrl();
  console.log(`🚀 Running mode: ${mode}`);
  console.log(`🌐 Base URL: ${resolvedBaseUrl}`);

  if (mode === 'important') {
    await runImportantMode();
    return;
  }

  if (mode === 'order-flow') {
    await runOrderFlowMode();
    return;
  }

  if (mode === 'daily') {
    await runDailyMode();
    return;
  }

  if (mode === 'order') {
    await runOrderMode();
    return;
  }

  if (mode === 'retention') {
    await runRetentionMode();
    return;
  }

  throw new Error('Unknown mode. Use --mode=important | --mode=order-flow | --mode=order | --mode=retention | --mode=daily');
}

main().catch((error) => {
  console.error('❌ Notification test failed:', error.message);
  process.exit(1);
});
