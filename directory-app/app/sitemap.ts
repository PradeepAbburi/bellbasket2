import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://bellbasket.com';

  let businesses: { slug: string; updatedAt: Date }[] = [];
  let cities: { city: string }[] = [];
  let categories: { category: string }[] = [];

  try {
    businesses = await prisma.business.findMany({
      select: { slug: true, updatedAt: true },
    });

    cities = await prisma.business.findMany({
      select: { city: true },
      distinct: ['city'],
    });

    categories = await prisma.business.findMany({
      select: { category: true },
      distinct: ['category'],
    });
  } catch (err) {
    console.warn('Prisma sitemap fallback:', err);
  }

  // 1. Business store page URLs
  const storeUrls = businesses.map((b) => ({
    url: `${baseUrl}/store/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  // 2. Distinct City Landing Pages
  const cityUrls = cities.map((c) => ({
    url: `${baseUrl}/city/${c.city.toLowerCase().replace(/\s+/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  // 3. Distinct Category Landing Pages
  const categoryUrls = categories.map((c) => ({
    url: `${baseUrl}/category/${c.category.toLowerCase().replace(/\s+/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  // 4. Multi-tier Category + City pSEO Combinations
  const categoryCityUrls: MetadataRoute.Sitemap = [];
  categories.forEach((cat) => {
    const catSlug = cat.category.toLowerCase().replace(/\s+/g, '-');
    cities.forEach((city) => {
      const citySlug = city.city.toLowerCase().replace(/\s+/g, '-');
      categoryCityUrls.push({
        url: `${baseUrl}/${catSlug}/${citySlug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      });
      categoryCityUrls.push({
        url: `${baseUrl}/best-${catSlug}-in-${citySlug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      });
    });
  });

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...storeUrls,
    ...cityUrls,
    ...categoryUrls,
    ...categoryCityUrls,
  ];
}
