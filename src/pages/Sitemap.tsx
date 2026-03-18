import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const Sitemap = () => {
  const [xml, setXml] = useState('');

  useEffect(() => {
    const fetchStores = async () => {
      const querySnapshot = await getDocs(collection(db, 'stores'));
      const stores = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      const baseUrl = window.location.origin;
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
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

      stores
        .filter(store => !store.isBlocked && store.plan && store.plan !== 'none')
        .forEach(store => {
          const urlId = store.slug || store.id;
          const path = store.slug ? `/stores/${store.slug}` : `/store/${store.id}`;
          sitemap += `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });

      sitemap += `
</urlset>`;
      setXml(sitemap);
    };

    fetchStores();
  }, []);

  // For browsers, show it as text/xml if possible, or just raw text
  return (
    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '20px', fontSize: '12px' }}>
      {xml}
    </pre>
  );
};

export default Sitemap;
