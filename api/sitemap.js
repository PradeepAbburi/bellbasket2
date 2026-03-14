const express = require('express');
const cors = require('cors');
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');

// Initialize Firebase Admin (must set env variables in Vercel!)
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}
const db = admin.firestore();

const app = express();
app.use(cors());

app.get('/api/sitemap', async (req, res) => {
    try {
        // Basic static pages
        const links = [
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/browse', changefreq: 'daily', priority: 0.8 },
            { url: '/about', changefreq: 'weekly', priority: 0.8 },
            { url: '/privacy', changefreq: 'monthly', priority: 0.5 },
        ];

        // Fetch dynamic stores from Firestore
        const storesSnapshot = await db.collection('stores').get();
        storesSnapshot.forEach((doc) => {
            const store = doc.data();
            // Use slug if it exists, otherwise use the raw ID
            const path = store.slug ? `/stores/${store.slug}` : `/store/${doc.id}`;
            links.push({ url: path, changefreq: 'weekly', priority: 0.7 });
        });

        // Create a stream to write to
        const stream = new SitemapStream({ hostname: 'https://www.bellbasket.com' });

        // Return the response as XML
        res.header('Content-Type', 'application/xml');
        res.header('Content-Encoding', 'gzip');

        // Convert to promise so we can capture the raw XML
        const sitemapOutput = await streamToPromise(Readable.from(links).pipe(stream));

        // Send it
        res.send(sitemapOutput.toString());
    } catch (error) {
        console.error('Sitemap Error:', error);
        res.status(500).end();
    }
});

module.exports = app;
