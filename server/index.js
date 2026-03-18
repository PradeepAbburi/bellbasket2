/**
 * BellBasket local API development server.
 *
 * Mounts every /api/* Vercel handler as Express routes so the frontend
 * (running on :8080 via Vite) can reach them through the /api proxy.
 *
 * Usage:
 *   node server/index.js          # starts on port 3000 (default)
 *   API_PORT=4000 node server/index.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const os = require('os');

const app  = express();
const PORT = process.env.API_PORT || 3000;
const HOST = process.env.API_HOST || '0.0.0.0';

function getLanUrls(port) {
  const interfaces = os.networkInterfaces();
  const urls = [];

  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.internal) return;
      if (entry.family !== 'IPv4') return;
      urls.push(`http://${entry.address}:${port}`);
    });
  });

  return [...new Set(urls)];
}

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────────────────────
// Health-check
app.get('/api/hello', require('../api/hello'));

// Push notifications
app.post('/api/notify',           require('../api/notify'));
app.post('/api/notify-important', require('../api/notify-important'));
app.post('/api/notify-order',     require('../api/notify-order'));
app.post('/api/notify-retention', require('../api/notify-retention'));
app.all( '/api/daily-notify',     require('../api/daily-notify'));

// Subscriptions / payments
app.all('/api/create-subscription', require('../api/create-subscription'));

// Sitemap (already an Express sub-app)
app.use(require('../api/sitemap'));

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`\x1b[32m🚀 BellBasket API  →  http://localhost:${PORT}\x1b[0m`);
  const lanUrls = getLanUrls(PORT);
  if (lanUrls.length > 0) {
    console.log('📱 LAN API URLs (use these on phone):');
    lanUrls.forEach((url) => console.log(`   ${url}`));
  }
  console.log(`   /api/hello, /api/notify, /api/notify-important, /api/notify-order, /api/notify-retention, /api/daily-notify`);
  console.log(`   /api/create-subscription, /api/sitemap`);
});
