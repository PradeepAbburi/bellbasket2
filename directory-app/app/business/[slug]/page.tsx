import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import { MapPin, Phone, Globe, Clock, Star, Verified, Heart, Share2, AlertTriangle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: {
    slug: string;
  };
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
  });

  if (!business) return { title: 'Not Found' };

  const title = `${business.name} | ${business.category} in ${business.city} | BellBasket`;
  const description = `${business.name} is a ${business.verified ? 'verified ' : ''}${business.category} in ${business.city}. View photos, reviews, timings, phone number, location and products on BellBasket.`;

  return {
    title,
    description,
    keywords: [business.name, `${business.category} ${business.city}`, `${business.category} near me`, 'BellBasket', business.city],
    alternates: {
      canonical: `https://bellbasket.com/business/${business.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://bellbasket.com/business/${business.slug}`,
      siteName: 'BellBasket Directory',
      images: [
        {
          url: business.coverImage || 'https://bellbasket.com/og-default.png',
          width: 1200,
          height: 630,
          alt: business.name,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [business.coverImage || 'https://bellbasket.com/og-default.png'],
    },
  };
}

export default async function BusinessPage({ params }: PageProps) {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
    include: { reviews: { orderBy: { createdAt: 'desc' }, take: 5 } }
  });

  if (!business) {
    notFound();
  }

  // Generate JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    image: business.coverImage ? [business.coverImage] : [],
    '@id': `https://bellbasket.com/business/${business.slug}`,
    url: `https://bellbasket.com/business/${business.slug}`,
    telephone: business.phone || '',
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressLocality: business.city,
      addressRegion: business.state || '',
      postalCode: business.postalCode || '',
      addressCountry: business.country,
    },
    geo: business.latitude && business.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: business.latitude,
      longitude: business.longitude,
    } : undefined,
    aggregateRating: business.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: business.rating,
      reviewCount: business.reviewCount,
    } : undefined,
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Inject JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero / Cover */}
      <div className="relative w-full h-64 md:h-80 lg:h-96 bg-gray-900 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-b-4 border-black">
        {business.coverImage ? (
           <Image src={business.coverImage} alt={business.name} fill className="object-cover opacity-60" priority />
        ) : (
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
        )}
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 bg-gradient-to-t from-black/90 to-transparent flex items-end gap-6">
           {business.logo && (
             <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-xl border-4 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
               <Image src={business.logo} alt={`${business.name} Logo`} width={128} height={128} className="object-cover w-full h-full" />
             </div>
           )}
           <div className="text-white">
             <div className="flex items-center gap-2 mb-2">
               <span className="bg-indigo-600 text-white text-xs font-black uppercase tracking-wider px-2 py-1 rounded-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                 {business.category}
               </span>
               {business.verified && (
                 <span className="flex items-center gap-1 bg-emerald-500 text-white text-xs font-black uppercase tracking-wider px-2 py-1 rounded-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                   <ShieldCheck className="w-3 h-3" /> Verified
                 </span>
               )}
             </div>
             <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-md">{business.name}</h1>
             <div className="flex items-center gap-4 mt-3 text-sm md:text-base font-bold text-gray-200">
               <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-pink-400" /> {business.city}</span>
               {business.reviewCount > 0 && (
                 <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {business.rating.toFixed(1)} ({business.reviewCount} Reviews)</span>
               )}
             </div>
           </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* About Section */}
          <section className="bg-white p-6 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-black uppercase tracking-tight border-b-2 border-black pb-3 mb-4">About</h2>
            <p className="text-gray-700 font-medium leading-relaxed">
              {business.description || `${business.name} is a top-rated ${business.category.toLowerCase()} located in ${business.city}. Visit us for the best service and quality.`}
            </p>
          </section>

          {/* Quick Actions (Mobile) */}
          <div className="lg:hidden grid grid-cols-2 gap-4">
             <button className="bg-emerald-400 p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all font-black flex items-center justify-center gap-2">
               <Phone className="w-5 h-5" /> Call Now
             </button>
             <button className="bg-yellow-400 p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all font-black flex items-center justify-center gap-2">
               <MapPin className="w-5 h-5" /> Directions
             </button>
          </div>

          {/* Reviews Section */}
          <section className="bg-white p-6 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">Reviews</h2>
              <button className="bg-black text-white px-4 py-2 text-sm font-bold border-2 border-black hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(100,100,100,1)]">Write Review</button>
            </div>
            
            {business.reviews.length > 0 ? (
              <div className="space-y-6">
                {business.reviews.map(review => (
                  <div key={review.id} className="border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold">{review.userName}</h4>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-amber-400' : 'text-gray-300 fill-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                    {review.text && <p className="text-gray-600 text-sm font-medium">{review.text}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 font-medium italic text-center py-8">No reviews yet. Be the first to review {business.name}!</p>
            )}
          </section>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Contact Info Card */}
          <div className="bg-amber-100 p-6 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-black uppercase mb-4">Contact Info</h3>
            <ul className="space-y-4 font-bold text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{business.address}<br/>{business.city}{business.postalCode ? `, ${business.postalCode}` : ''}</span>
              </li>
              {business.phone && (
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 shrink-0" />
                  <a href={`tel:${business.phone}`} className="hover:underline">{business.phone}</a>
                </li>
              )}
              {business.website && (
                <li className="flex items-center gap-3">
                  <Globe className="w-5 h-5 shrink-0" />
                  <a href={business.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 line-clamp-1">{business.website}</a>
                </li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 hidden lg:block">
             <button className="w-full bg-emerald-400 p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all font-black flex items-center justify-center gap-2 text-lg">
               <Phone className="w-6 h-6" /> Call Business
             </button>
             <button className="w-full bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all font-black flex items-center justify-center gap-2 text-lg">
               <Share2 className="w-6 h-6" /> Share Profile
             </button>
          </div>

          <div className="text-center">
            <button className="text-xs font-bold text-gray-500 hover:text-black underline uppercase tracking-wider flex items-center justify-center gap-1 mx-auto">
              <ShieldCheck className="w-3 h-3" /> Own this business? Claim it now
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}
