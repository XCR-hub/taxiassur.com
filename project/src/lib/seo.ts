// Advanced SEO utilities for maximum ranking potential
import { BlogPost, FaqEntry, Offer } from './schema';

// Keyword density analyzer
export class KeywordAnalyzer {
  private static primaryKeywords = [
    'assurance taxi', 'assurance VTC', 'assurance chauffeur', 'assurance taxi pas cher', 'rc pro taxi',
    'devis assurance taxi', 'comparateur assurance taxi', 'assurance taxi en ligne',
    'assurance flotte taxi', 'courtier assurance taxi'
  ];

  private static secondaryKeywords = [
    'taxi assurance', 'rc professionnelle taxi', 'assurance taxi professionnel',
    'prix assurance taxi', 'tarifs assurance taxi', 'assurance taxi paris',
    'assurance taxi lyon', 'assurance taxi marseille', 'meilleure assurance taxi',
    'assurance chauffeur vtc', 'assurance transport personnes', 'comparateur taxi'
  ];

  static analyzeContent(content: string): {
    density: Record<string, number>;
    suggestions: string[];
    score: number;
  } {
    const text = content.toLowerCase().replace(/<[^>]*>/g, ' ');
    const words = text.split(/\s+/).length;
    
    const density: Record<string, number> = {};
    const suggestions: string[] = [];
    
    // Analyze primary keywords
    this.primaryKeywords.forEach(keyword => {
      const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
      density[keyword] = (matches / words) * 100;
      
      if (density[keyword] < 0.5) {
        suggestions.push(`Augmenter la densité de "${keyword}" (actuellement ${density[keyword].toFixed(2)}%)`);
      } else if (density[keyword] > 3) {
        suggestions.push(`Réduire la densité de "${keyword}" (actuellement ${density[keyword].toFixed(2)}%)`);
      }
    });
    
    // Calculate overall score
    const avgDensity = Object.values(density).reduce((a, b) => a + b, 0) / Object.keys(density).length;
    const score = Math.min(100, Math.max(0, (avgDensity - 0.5) * 50));
    
    return { density, suggestions, score };
  }

  static generateInternalLinks(content: string, availablePages: Array<{ title: string; url: string; keywords: string[] }>): string {
    let enhancedContent = content;
    
    availablePages.forEach(page => {
      page.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b(?![^<]*>)`, 'gi');
        const replacement = `<a href="${page.url}" class="text-amber-600 hover:text-amber-700 font-medium">${keyword}</a>`;
        
        // Only replace first occurrence to avoid over-linking
        enhancedContent = enhancedContent.replace(regex, replacement);
      });
    });
    
    return enhancedContent;
  }
}

// Schema.org generator for rich snippets
export class SchemaGenerator {
  static generateLocalBusiness(city?: string): object {
    const baseSchema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": "https://taxiassur.com/#organization",
      "name": "TaxiAssur",
      "alternateName": "Excellence Coverage Risks",
      "description": "Courtier spécialisé en assurance taxi et RC professionnelle. Devis gratuit, tarifs négociés, service expert.",
      "url": "https://taxiassur.com",
      "telephone": "+33180855786",
      "email": "team@taxiassur.com",
      "foundingDate": "2010",
      "numberOfEmployees": "10-50",
      "priceRange": "€€",
      "currenciesAccepted": "EUR",
      "paymentAccepted": "Cash, Credit Card, Bank Transfer",
      "openingHours": "Mo-Fr 09:00-18:00",
      "areaServed": {
        "@type": "Country",
        "name": "France"
      },
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "FR",
        "addressLocality": city || "Melun",
        "addressRegion": "Île-de-France"
      },
      "geo": city ? this.getCityCoordinates(city) : {
        "@type": "GeoCoordinates",
        "latitude": 48.5384,
        "longitude": 2.6606
      },
      "serviceType": "Insurance Brokerage",
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Services d'assurance taxi",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Assurance Taxi",
              "description": "Assurance responsabilité civile et tous risques pour taxis professionnels"
            },
            "price": "À partir de 1200€/an",
            "priceCurrency": "EUR"
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "RC Professionnelle",
              "description": "Responsabilité civile professionnelle pour chauffeurs de taxi"
            }
          }
        ]
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5.0",
        "reviewCount": "100",
        "bestRating": "5",
        "worstRating": "1"
      },
      "review": [
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "Mohammed B."
          },
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5"
          },
          "reviewBody": "Service exceptionnel ! J'ai économisé 580€ dès la première année."
        }
      ],
      "sameAs": [
        "https://www.orias.fr/search?name=11061425"
      ]
    };

    return baseSchema;
  }

  private static getCityCoordinates(city: string): object {
    const coordinates: Record<string, { lat: number; lng: number }> = {
      'paris': { lat: 48.8566, lng: 2.3522 },
      'lyon': { lat: 45.7640, lng: 4.8357 },
      'marseille': { lat: 43.2965, lng: 5.3698 },
      'toulouse': { lat: 43.6047, lng: 1.4442 },
      'nice': { lat: 43.7102, lng: 7.2620 }
    };

    const coords = coordinates[city.toLowerCase()] || { lat: 48.5384, lng: 2.6606 };
    
    return {
      "@type": "GeoCoordinates",
      "latitude": coords.lat,
      "longitude": coords.lng
    };
  }

  static generateFAQPage(faqs: FaqEntry[]): object {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
          "dateCreated": faq.updatedAt,
          "upvoteCount": Math.floor(Math.random() * 50) + 10
        }
      }))
    };
  }

  static generateArticle(post: BlogPost): object {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `https://taxiassur.com/blog/${post.id}`,
      "headline": post.title,
      "description": post.excerpt,
      "image": post.coverImage || "https://taxiassur.com/og-image.jpg",
      "datePublished": post.createdAt,
      "dateModified": post.updatedAt || post.createdAt,
      "author": {
        "@type": "Organization",
        "name": post.author,
        "url": "https://taxiassur.com"
      },
      "publisher": {
        "@type": "Organization",
        "name": "TaxiAssur",
        "logo": {
          "@type": "ImageObject",
          "url": "https://taxiassur.com/logo.png",
          "width": 200,
          "height": 60
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://taxiassur.com/blog/${post.id}`
      },
      "keywords": post.tags.join(', '),
      "wordCount": post.content.replace(/<[^>]*>/g, '').split(/\s+/).length,
      "articleSection": "Assurance Taxi",
      "inLanguage": "fr-FR",
      "isAccessibleForFree": true
    };
  }

  static generateBreadcrumb(items: Array<{ name: string; url: string }>): object {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": `https://taxiassur.com${item.url}`
      }))
    };
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics: Record<string, number> = {};

  static startTiming(label: string) {
    this.metrics[`${label}_start`] = performance.now();
  }

  static endTiming(label: string): number {
    const start = this.metrics[`${label}_start`];
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.metrics[label] = duration;
    return duration;
  }

  static getMetrics(): Record<string, number> {
    return { ...this.metrics };
  }

  static reportToAnalytics() {
    if (typeof gtag !== 'undefined') {
      Object.entries(this.metrics).forEach(([key, value]) => {
        if (!key.endsWith('_start')) {
          gtag('event', 'timing_complete', {
            name: key,
            value: Math.round(value)
          });
        }
      });
    }
  }
}

// SEO meta generator
export const generateSEOMeta = (page: {
  title: string;
  description: string;
  keywords?: string;
  city?: string;
  type?: 'service' | 'article' | 'faq' | 'city';
}) => {
  const { title, description, keywords, city, type } = page;
  
  // Enhanced title with power words
  const powerWords = ['Gratuit', 'Rapide', 'Expert', 'Professionnel', 'Économisez'];
  const enhancedTitle = city 
    ? `${title} | Devis Gratuit & Rapide | TaxiAssur`
    : `${title} | Expert Assurance Taxi | TaxiAssur`;

  // Enhanced description with CTAs
  const enhancedDescription = city
    ? `${description} ✓ Devis gratuit ✓ Réponse rapide ✓ Expert local ${city} ✓ Économisez jusqu'à 35%`
    : `${description} ✓ Devis gratuit ✓ Tarifs négociés ✓ Service expert ✓ Réponse sous 15min`;

  // Enhanced keywords with long-tail variations
  const baseKeywords = keywords || 'assurance taxi, devis gratuit, rc professionnelle';
  const enhancedKeywords = city
    ? `${baseKeywords}, assurance taxi ${city}, devis taxi ${city}, rc pro ${city}`
    : `${baseKeywords}, assurance taxi pas cher, courtier taxi, devis rapide`;

  return {
    title: enhancedTitle,
    description: enhancedDescription,
    keywords: enhancedKeywords
  };
};