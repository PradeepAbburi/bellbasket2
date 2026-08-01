import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { generateSlug } from '@/utils/seo';

const Sitemap = () => {
  const [xml, setXml] = useState('');

  useEffect(() => {
    const fetchStores = async () => {
      let stores: any[] = [];
      try {
        const querySnapshot = await getDocs(collection(db, 'stores'));
        stores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
      } catch (err) {
        console.warn('Sitemap store fetch fallback:', err);
      }

      const baseUrl = 'https://bellbasket.com';
      const date = new Date().toISOString().split('T')[0];

      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/browse</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

      const categories = ['Restaurants', 'Cafes', 'Electronics', 'Pharmacies', 'Grocery', 'Hotels', 'Salons'];
      const cities = ['Geelong', 'Melbourne', 'Sydney', 'Perth', 'Adelaide', 'Brisbane'];
      const subcategories = ['Indian', 'Chinese', 'Italian', 'Pizza'];

      // 1. Store URLs
      stores
        .filter(store => !store.isBlocked)
        .forEach(store => {
          const slug = store.slug || generateSlug(store.name, store.city || 'Geelong');
          const mainPath = `/store/${slug}`;
          const reviewPath = `/store/${slug}/reviews`;
          sitemap += `
  <url>
    <loc>${baseUrl}${mainPath}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}${reviewPath}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });

      // 2. City & Category Landing Page URLs
      cities.forEach(city => {
        const citySlug = generateSlug(city);
        sitemap += `
  <url>
    <loc>${baseUrl}/city/${citySlug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

        categories.forEach(cat => {
          const catSlug = generateSlug(cat);
          sitemap += `
  <url>
    <loc>${baseUrl}/${catSlug}/${citySlug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/best-${catSlug}-in-${citySlug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

          subcategories.forEach(sub => {
            const subSlug = generateSlug(sub);
            sitemap += `
  <url>
    <loc>${baseUrl}/${catSlug}/${citySlug}/${subSlug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
          });
        });
      });

      // 3. Near-Me Intent URLs
      categories.forEach(cat => {
        const catSlug = generateSlug(cat);
        sitemap += `
  <url>
    <loc>${baseUrl}/${catSlug}-near-me</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
      });

      sitemap += `
</urlset>`;
      setXml(sitemap);
    };

    fetchStores();
  }, []);

  return (
    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '20px', fontSize: '12px' }}>
      {xml}
    </pre>
  );
};

export default Sitemap;
