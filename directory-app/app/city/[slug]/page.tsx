import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Star, ShieldCheck } from 'lucide-react';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const city = params.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    title: `Top Businesses in ${city} | BellBasket Directory`,
    description: `Discover the best restaurants, stores, and local services in ${city}. Read reviews, get directions, and connect with verified businesses on BellBasket.`,
    keywords: [`Businesses in ${city}`, `${city} local stores`, `${city} directory`, 'BellBasket'],
    alternates: {
      canonical: `https://bellbasket.com/city/${params.slug}`,
    }
  };
}

export default async function CityPage({ params }: PageProps) {
  const cityName = params.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // In real life, we would fetch businesses where city roughly matches slug (case insensitive)
  const businesses = await prisma.business.findMany({
    where: { 
      // simple hack for demo: we can do a LIKE or exact match
      // Ideally Prisma allows case-insensitive search if configured, or just use exact match if slugs match exactly.
      city: { contains: cityName }
    },
    take: 20,
    orderBy: { rating: 'desc' }
  });

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-indigo-600 text-white py-16 px-4 md:px-6 border-b-4 border-black shadow-[0_4px_0_0_rgba(0,0,0,1)] text-center">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase drop-shadow-md">
          {cityName}
        </h1>
        <p className="mt-4 text-indigo-100 font-bold max-w-2xl mx-auto text-lg">
          Discover {businesses.length > 0 ? businesses.length + '+' : 'top'} local businesses, services, and stores in {cityName}.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <h2 className="text-2xl font-black uppercase mb-8 border-b-4 border-black inline-block pb-1">Top Rated in {cityName}</h2>
        
        {businesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map(b => (
              <Link key={b.id} href={`/business/${b.slug}`} className="block group">
                <div className="bg-white rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden h-full flex flex-col">
                  <div className="h-40 bg-gray-200 relative overflow-hidden border-b-4 border-black">
                     {b.coverImage ? (
                        <img src={b.coverImage} alt={b.name} className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500" />
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
            <h3 className="text-2xl font-black text-gray-400 mb-2">No businesses listed yet</h3>
            <p className="font-bold text-gray-500">Be the first to add a business in {cityName}!</p>
          </div>
        )}
      </div>
    </main>
  );
}
