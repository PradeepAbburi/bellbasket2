import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Star, ShieldCheck, Tag } from 'lucide-react';

interface PageProps {
  params: {
    category: string;
    city: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const cat = params.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const city = params.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const title = `Top 10 Best ${cat} in ${city} | Phone, Reviews, Menu | BellBasket`;
  const description = `Find top ${cat} in ${city}. Read customer reviews, check opening hours, view photos and phone numbers of verified ${cat.toLowerCase()} on BellBasket.`;

  return {
    title,
    description,
    keywords: [`${cat} in ${city}`, `Best ${cat} ${city}`, `${cat} near me`, 'BellBasket'],
    alternates: {
      canonical: `https://bellbasket.com/${params.category}/${params.city}`,
    }
  };
}

export default async function CategoryCityPage({ params }: PageProps) {
  const catName = params.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const cityName = params.city.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const businesses = await prisma.business.findMany({
    where: {
      category: { contains: catName },
      city: { contains: cityName }
    },
    take: 30,
    orderBy: { rating: 'desc' }
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best ${catName} in ${cityName}`,
    itemListElement: businesses.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      url: `https://bellbasket.com/store/${b.slug}`
    }))
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-indigo-900 text-white py-16 px-4 md:px-6 border-b-4 border-black shadow-md text-center">
        <span className="bg-amber-400 text-black text-xs font-black uppercase tracking-widest px-3 py-1 rounded border-2 border-black inline-block mb-3">
          pSEO Local Directory
        </span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase">
          Best {catName} in {cityName}
        </h1>
        <p className="mt-4 font-bold max-w-2xl mx-auto text-lg text-indigo-200">
          Discover verified photos, customer reviews, direct phone numbers, and location details for top {catName.toLowerCase()} across {cityName}.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 space-y-12">
        <div className="flex items-center justify-between border-b-4 border-black pb-2">
          <h2 className="text-2xl font-black uppercase">Top Rated {catName} in {cityName}</h2>
          <span className="font-bold text-gray-500 text-sm">{businesses.length} Stores Listed</span>
        </div>

        {businesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((b) => (
              <Link key={b.id} href={`/store/${b.slug}`} className="block group">
                <div className="bg-white rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden h-full flex flex-col">
                  <div className="h-40 bg-gray-200 relative overflow-hidden border-b-4 border-black">
                    {b.coverImage ? (
                      <img src={b.coverImage} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500" />
                    )}
                    {b.verified && (
                      <div className="absolute top-2 right-2 bg-emerald-400 text-black text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border-2 border-black flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{b.category}</span>
                    <h3 className="text-xl font-black leading-tight mb-2 group-hover:text-indigo-600 transition-colors">{b.name}</h3>
                    <p className="text-sm font-medium text-gray-600 line-clamp-2 mb-4 flex-1">{b.description || b.address}</p>
                    <div className="flex items-center justify-between text-sm font-bold pt-4 border-t-2 border-gray-100">
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-pink-500" /> {b.city}</span>
                      {b.reviewCount > 0 && (
                        <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {b.rating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border-4 border-black border-dashed">
            <h3 className="text-2xl font-black text-gray-400 mb-2">No {catName} listed yet in {cityName}</h3>
            <p className="font-bold text-gray-500">Be the first merchant to list your store in {cityName}!</p>
          </div>
        )}

        {/* Unique Article Section for Google Indexing */}
        <section className="bg-white p-8 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <h3 className="text-xl font-black uppercase border-b-2 border-black pb-2">Guide to {catName} in {cityName}</h3>
          <p className="text-gray-700 font-medium leading-relaxed">
            Finding top-quality {catName.toLowerCase()} in {cityName} is straightforward with BellBasket. Our platform curates authenticated business profiles, complete with operating schedules, user feedback, direct contact details, and location mapping.
          </p>
        </section>
      </div>
    </main>
  );
}
