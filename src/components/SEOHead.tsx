import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

export interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noIndex?: boolean;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  image = 'https://bellbasket.com/og-default.png',
  type = 'website',
  jsonLd,
  noIndex = false
}) => {
  const location = useLocation();
  const currentUrl = `https://bellbasket.com${location.pathname}`;

  // Smart defaults based on path
  const path = location.pathname.toLowerCase();
  let defaultTitle = 'BellBasket | Local Shopping, Directory & Quick Delivery';
  let defaultDesc = 'Discover top local stores, restaurants, services, and exclusive deals in your area on BellBasket. Read reviews, compare menus, and order directly online.';

  if (path === '/') {
    defaultTitle = 'BellBasket | Local Directory, Stores & Deals Near You';
    defaultDesc = 'Find top-rated local stores, restaurants, cafes, electronics, and pharmacies near you on BellBasket. Browse menus, read verified reviews, and connect instantly.';
  } else if (path.startsWith('/browse')) {
    defaultTitle = 'Browse Local Stores & Products | BellBasket Directory';
    defaultDesc = 'Explore thousands of verified local stores, daily fresh groceries, electronics, and local services in your city on BellBasket.';
  } else if (path.startsWith('/deals')) {
    defaultTitle = 'Best Deals & Discounts Near Me | BellBasket Offers';
    defaultDesc = 'Save money on local restaurants, food delivery, services, and daily essentials with exclusive real-time deals on BellBasket.';
  } else if (path.startsWith('/ask')) {
    defaultTitle = 'Ask BellBasket AI | Intelligent Local Shopping Assistant';
    defaultDesc = 'Get instant recommendations for local stores, product prices, services, and deals with BellBasket AI Assistant.';
  } else if (path.startsWith('/clips')) {
    defaultTitle = 'BellBasket Clips | Discover Local Store Videos & Highlights';
    defaultDesc = 'Watch video clips from local merchants, restaurant specials, new product launches, and store tours on BellBasket Clips.';
  } else if (path.startsWith('/about')) {
    defaultTitle = 'About BellBasket | Connecting Local Merchants & Shoppers';
    defaultDesc = 'Learn how BellBasket empowers local merchants, small businesses, and customers with local directory discovery and quick delivery.';
  } else if (path.startsWith('/faq')) {
    defaultTitle = 'Frequently Asked Questions (FAQ) | BellBasket';
    defaultDesc = 'Find answers to common questions about ordering, local delivery, merchant listings, payments, and store registration on BellBasket.';
  } else if (path.startsWith('/careers') || path.startsWith('/belljobs')) {
    defaultTitle = 'BellJobs & Careers | Local Job Listings & Opportunities';
    defaultDesc = 'Discover local jobs, staff vacancies, store hiring, and career opportunities near you on BellBasket Jobs.';
  } else if (path.startsWith('/saved-stores')) {
    defaultTitle = 'My Saved Stores & Favorite Local Shops | BellBasket';
    defaultDesc = 'Quickly access your saved local stores, favorite restaurants, and preferred merchants on BellBasket.';
  }

  const finalTitle = title ? `${title} | BellBasket` : defaultTitle;
  const finalDesc = description || defaultDesc;
  const defaultKeywords = 'BellBasket, local stores, local directory, restaurants near me, online shopping, food delivery, store reviews, city directory';
  const finalKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;

  // Default Organization & WebSite JSON-LD Schema
  const defaultWebsiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BellBasket',
    url: 'https://bellbasket.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://bellbasket.com/browse?search={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };

  const finalJsonLd = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [defaultWebsiteSchema];

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDesc} />
      <meta name="keywords" content={finalKeywords} />
      <link rel="canonical" href={currentUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* OpenGraph / Facebook */}
      <meta property="og:site_name" content="BellBasket Directory" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={image} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDesc} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Schemas */}
      {finalJsonLd.map((schema, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOHead;
