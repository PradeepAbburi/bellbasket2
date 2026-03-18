#!/usr/bin/env node

import 'dotenv/config';

/**
 * Send real push notification tests for a single user.
 *
 * Examples:
 *   node test/user-notification-test.mjs --userId=<USER_ID>
 *   node test/user-notification-test.mjs --userId=<USER_ID> --mode=order-flow --storeName="BellBasket Mart"
 *   node test/user-notification-test.mjs --userId=<USER_ID> --mode=retention --secret=$RETENTION_NOTIFY_SECRET
 *   node test/user-notification-test.mjs --userId=<USER_ID> --mode=promotion --campaign=flash_sale --discountPercent=40 --productName="Basmati Rice"
 *
 * Modes:
 *   order       -> one order status update via /api/notify-order
 *   order-flow  -> accepted -> packed -> completed sequence
 *   retention   -> one retention campaign message via /api/notify-retention (requires secret)
 *   promotion   -> ecommerce promo push (flash_sale/price_drop/cart_reminder/back_in_stock)
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  })
);

const mode = args.mode || 'order';
const baseUrl = (args.baseUrl || process.env.NOTIFY_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const userId = args.userId || args.userIds;
const orderId = args.orderId || `ORD-TEST-${Date.now()}`;

if (!userId) {
  console.error('❌ Missing --userId=<FIREBASE_USER_ID>');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${JSON.stringify(data)}`);
  }
  return data;
}

async function ensureApiUp() {
  const res = await fetch(`${baseUrl}/api/hello`).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(`API not reachable at ${baseUrl}. Start backend with: pnpm dev:api`);
  }
}

async function sendOrderStatus(status) {
  const storeName = args.storeName || 'BellBasket Store';
  const sendInApp = args.sendInApp ? args.sendInApp === 'true' : true;

  return requestJson(`${baseUrl}/api/notify-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      orderId,
      orderStatus: status,
      storeName,
      type: 'order',
      url: '/receipts',
      sendInApp,
    }),
  });
}

async function runOrderOnce() {
  const status = args.orderStatus || 'accepted';
  const response = await sendOrderStatus(status);
  console.log(`✅ Order notification sent (${status})`, response);
}

async function runOrderFlow() {
  const statuses = ['accepted', 'packed', 'completed'];
  const delayMs = Number(args.delayMs || 1500);

  for (let index = 0; index < statuses.length; index += 1) {
    const status = statuses[index];
    const response = await sendOrderStatus(status);
    console.log(`✅ Order flow step: ${status}`, response);
    if (index < statuses.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(`🎯 Completed order-flow test for user ${userId}, order ${orderId}`);
}

async function runRetention() {
  const secret = args.secret || process.env.RETENTION_NOTIFY_SECRET || process.env.CRON_SECRET || process.env.IMPORTANT_NOTIFY_SECRET;
  const sendInApp = args.sendInApp ? args.sendInApp === 'true' : true;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  } else {
    headers['x-local-test'] = '1';
    console.warn('⚠️ No retention secret found. Using local test bypass header.');
  }

  const campaign = args.campaign || 'winback';
  const payload = {
    campaign,
    userIds: [userId],
    sendInApp,
  };

  const optionalFields = [
    'title',
    'body',
    'url',
    'type',
    'productName',
    'storeName',
    'categoryName',
    'couponCode',
    'discountPercent',
    'oldPrice',
    'newPrice',
    'expiresInHours',
  ];

  for (const field of optionalFields) {
    if (args[field] !== undefined) {
      payload[field] = args[field];
    }
  }

  const response = await requestJson(`${baseUrl}/api/notify-retention`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  console.log(`✅ Retention notification sent (${campaign})`, response);
}

async function main() {
  await ensureApiUp();

  console.log(`🚀 Running user notification test`);
  console.log(`🌐 Base URL: ${baseUrl}`);
  console.log(`👤 User ID: ${userId}`);
  console.log(`🧪 Mode: ${mode}`);

  if (mode === 'order') {
    await runOrderOnce();
    return;
  }

  if (mode === 'order-flow') {
    await runOrderFlow();
    return;
  }

  if (mode === 'retention') {
    await runRetention();
    return;
  }

  if (mode === 'promotion') {
    if (!args.campaign) {
      args.campaign = 'flash_sale';
    }
    await runRetention();
    return;
  }

  throw new Error('Unknown mode. Use --mode=order | --mode=order-flow | --mode=retention | --mode=promotion');
}

main().catch((error) => {
  console.error('❌ User notification test failed:', error.message);
  process.exit(1);
});
