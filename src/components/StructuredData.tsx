import React from 'react';
import { Helmet } from 'react-helmet-async';

interface Article {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  image?: string;
  url: string;
}

interface LocalBusiness {
  name: string;
  description: string;
  telephone: string;
  email: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
}

interface Review {
  author: string;
  datePublished: string;
  reviewBody: string;
  ratingValue: number;
}

interface FAQItem {
  question: string;
  answer: string;
}

export function ArticleStructuredData({ article }: { article: Article }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': article.title,
    'description': article.description,
    'datePublished': article.datePublished,
    'dateModified': article.dateModified || article.datePublished,
    'author': {
      '@type': 'Organization',
      'name': article.author || 'TaxiAssur',
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'TaxiAssur',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://taxiassur.com/logo-600x300.png',
      },
    },
    'image': article.image || 'https://taxiassur.com/logo-600x300.png',
    'url': `https://taxiassur.com${article.url}`,
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `https://taxiassur.com${article.url}`,
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

export function LocalBusinessStructuredData({ business }: { business: LocalBusiness }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'InsuranceAgency',
    'name': business.name,
    'description': business.description,
    'telephone': business.telephone,
    'email': business.email,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': business.address.streetAddress,
      'addressLocality': business.address.addressLocality,
      'postalCode': business.address.postalCode,
      'addressCountry': business.address.addressCountry,
    },
    'geo': business.geo ? {
      '@type': 'GeoCoordinates',
      'latitude': business.geo.latitude,
      'longitude': business.geo.longitude,
    } : undefined,
    'url': 'https://taxiassur.com',
    'logo': 'https://taxiassur.com/logo-600x300.png',
    'priceRange': '€€',
    'areaServed': {
      '@type': 'Country',
      'name': 'France',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

export function ReviewStructuredData({ reviews }: { reviews: Review[] }) {
  const aggregateRating = {
    '@type': 'AggregateRating',
    'ratingValue': (reviews.reduce((sum, r) => sum + r.ratingValue, 0) / reviews.length).toFixed(1),
    'reviewCount': reviews.length,
    'bestRating': '5',
    'worstRating': '1',
  };

  const reviewSchemas = reviews.map((review) => ({
    '@type': 'Review',
    'author': {
      '@type': 'Person',
      'name': review.author,
    },
    'datePublished': review.datePublished,
    'reviewBody': review.reviewBody,
    'reviewRating': {
      '@type': 'Rating',
      'ratingValue': review.ratingValue,
      'bestRating': '5',
      'worstRating': '1',
    },
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'TaxiAssur',
    'aggregateRating': aggregateRating,
    'review': reviewSchemas,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

export function FAQStructuredData({ faqs }: { faqs: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map((faq) => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

export function BreadcrumbStructuredData({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': `https://taxiassur.com${item.url}`,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

export function ServiceStructuredData() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    'serviceType': 'Assurance Taxi Professionnelle',
    'provider': {
      '@type': 'InsuranceAgency',
      'name': 'TaxiAssur',
      'telephone': '01 80 85 57 86',
      'email': 'team@taxiassur.com',
    },
    'areaServed': {
      '@type': 'Country',
      'name': 'France',
    },
    'hasOfferCatalog': {
      '@type': 'OfferCatalog',
      'name': 'Services d\'assurance taxi',
      'itemListElement': [
        {
          '@type': 'Offer',
          'itemOffered': {
            '@type': 'Service',
            'name': 'Assurance RC Professionnelle Taxi',
          },
        },
        {
          '@type': 'Offer',
          'itemOffered': {
            '@type': 'Service',
            'name': 'Assurance Flotte de Véhicules Taxi',
          },
        },
        {
          '@type': 'Offer',
          'itemOffered': {
            '@type': 'Service',
            'name': 'Gestion de Sinistres Taxi',
          },
        },
      ],
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
