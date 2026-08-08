import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();
dotenv.config({ path: '.env.local' });

function generateSlug(name = '', location = '') {
    const combined = location ? `${name} ${location}` : name;
    return combined
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function fetchStoresFromFirestore() {
    const stores = [];

    // Approach 1: Try Firebase Admin SDK
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'bellbasket-app';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && privateKey) {
        try {
            const formattedKey = privateKey.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1');
            if (!getApps().length) {
                initializeApp({
                    credential: cert({
                        projectId,
                        clientEmail,
                        privateKey: formattedKey
                    })
                });
            }
            const db = getFirestore();
            const snapshot = await db.collection('stores').get();
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.isBlocked) {
                    stores.push({ id: doc.id, ...data });
                }
            });
            if (stores.length > 0) return stores;
        } catch (err) {
            console.warn('[Sitemap API] Admin SDK fetch error, falling back to REST:', err?.message || err);
        }
    }

    // Approach 2: Fallback to Firestore REST API
    try {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stores?pageSize=1000`;
        const resp = await fetch(url);
        if (resp.ok) {
            const json = await resp.json();
            if (json.documents && Array.isArray(json.documents)) {
                for (const doc of json.documents) {
                    const fields = doc.fields || {};
                    const id = doc.name ? doc.name.split('/').pop() : '';
                    const isBlocked = fields.isBlocked?.booleanValue || false;
                    if (isBlocked) continue;

                    const name = fields.name?.stringValue || '';
                    const slug = fields.slug?.stringValue || '';
                    const city = fields.city?.stringValue || '';
                    const category = fields.category?.stringValue || '';
                    const updatedAt = fields.updatedAt?.timestampValue || fields.createdAt?.timestampValue || null;

                    stores.push({ id, name, slug, city, category, updatedAt });
                }
            }
        }
    } catch (err) {
        console.error('[Sitemap API] REST API fetch fallback failed:', err);
    }

    return stores;
}

export default async function handler(req, res) {
    try {
        const baseUrl = 'https://bellbasket.com';
        const today = new Date().toISOString().split('T')[0];

        // Static core routes
        const links = [
            { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily', lastmod: today },
            { loc: `${baseUrl}/browse`, priority: '0.9', changefreq: 'daily', lastmod: today },
            { loc: `${baseUrl}/sitemap`, priority: '0.8', changefreq: 'daily', lastmod: today },
            { loc: `${baseUrl}/about`, priority: '0.7', changefreq: 'weekly', lastmod: today },
            { loc: `${baseUrl}/privacy`, priority: '0.5', changefreq: 'monthly', lastmod: today },
            { loc: `${baseUrl}/deals`, priority: '0.8', changefreq: 'daily', lastmod: today },
        ];

        // Known cities & categories for pSEO pages
        const presetCategories = ['Restaurants', 'Grocery', 'Electronics', 'Pharmacies', 'Cafes', 'Hotels', 'Salons', 'Clothing'];
        const presetCities = [
            'Kakinada', 'Rajahmundry', 'Visakhapatnam', 'Vijayawada', 'Guntur',
            'Tirupati', 'Nellore', 'Kurnool', 'Eluru', 'Ongole', 'Anantapur',
            'Amalapuram', 'Samalkot', 'Peddapuram', 'Mandapeta', 'Ramachandrapuram',
            'Tuni', 'Bhimavaram', 'Tenali', 'Machilipatnam', 'Vizianagaram', 'Kadapa',
            'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam',
            'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Siddipet', 'Suryapet',
            'Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata', 'Ahmedabad',
            'Geelong', 'Melbourne', 'Sydney'
        ];

        const fetchedStores = await fetchStoresFromFirestore();

        // 1. Add Stores
        fetchedStores.forEach(store => {
            const slug = store.slug || generateSlug(store.name, store.city || 'local');
            const lastmod = store.updatedAt ? new Date(store.updatedAt).toISOString().split('T')[0] : today;

            // Main canonical store URL
            links.push({
                loc: `${baseUrl}/stores/${slug}`,
                priority: '1.0',
                changefreq: 'daily',
                lastmod
            });

            // ID-based legacy URL
            if (store.id) {
                links.push({
                    loc: `${baseUrl}/store/${store.id}`,
                    priority: '0.9',
                    changefreq: 'daily',
                    lastmod
                });
            }

            // Reviews page
            links.push({
                loc: `${baseUrl}/stores/${slug}/reviews`,
                priority: '0.7',
                changefreq: 'weekly',
                lastmod
            });
        });

        // 2. Add City & Category pSEO pages
        presetCities.forEach(city => {
            const citySlug = generateSlug(city);
            links.push({ loc: `${baseUrl}/city/${citySlug}`, priority: '0.9', changefreq: 'daily', lastmod: today });

            presetCategories.forEach(cat => {
                const catSlug = generateSlug(cat);
                links.push({ loc: `${baseUrl}/${catSlug}/${citySlug}`, priority: '0.9', changefreq: 'daily', lastmod: today });
                links.push({ loc: `${baseUrl}/best-${catSlug}-in-${citySlug}`, priority: '0.9', changefreq: 'daily', lastmod: today });
            });
        });

        // 3. Category Near-Me pages
        presetCategories.forEach(cat => {
            const catSlug = generateSlug(cat);
            links.push({ loc: `${baseUrl}/category/${catSlug}`, priority: '0.9', changefreq: 'daily', lastmod: today });
            links.push({ loc: `${baseUrl}/${catSlug}-near-me`, priority: '0.8', changefreq: 'daily', lastmod: today });
        });

        // Construct XML
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${links.map(link => `  <url>
    <loc>${link.loc}</loc>
    <lastmod>${link.lastmod}</lastmod>
    <changefreq>${link.changefreq}</changefreq>
    <priority>${link.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).send(xml);
    } catch (error) {
        console.error('[Sitemap API Error]:', error);
        return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal Server Error</error>');
    }
}
