import React from 'react';
import { Helmet } from 'react-helmet-async';
import { BlogPost, FaqEntry, Offer } from '../lib/schema';

interface JsonLdProps {
  type: 'organization' | 'article' | 'faq' | 'product' | 'breadcrumb';
  data?: any;
}

const JsonLd: React.FC<JsonLdProps> = ({ type, data }) => {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://taxiassur.com';
  const brandName = import.meta.env.VITE_BRAND_NAME || 'TaxiAssur';
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || 'team@taxiassur.com';

  const generateSchema = () => {
    switch (type) {
      case 'organization':
        return {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": brandName,
          "description": "Courtier spécialiste en assurance taxi et RC professionnelle",
          "url": siteUrl,
          "telephone": "0180855786",
          "email": contactEmail,
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "FR",
            "addressLocality": "Melun"
          },
          "openingHours": "Mo-Fr 09:00-18:00",
          "priceRange": "€€",
          "serviceType": "Assurance Taxi",
          "areaServed": "France",
          "review": {
            "@type": "Review",
            "author": {
              "@type": "Person",
              "name": "Client Satisfait"
            },
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5"
            },
            "reviewBody": "Service exceptionnel ! J'ai économisé 580€ dès la première année. Équipe réactive et professionnelle."
          },
          "sameAs": [
            `${siteUrl}/mentions-legales`
          ],
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "reviewCount": "100",
            "name": "Services d'assurance taxi",
            "itemListElement": [
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Assurance Taxi",
                  "description": "Assurance responsabilité civile et tous risques pour taxis"
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "RC Professionnelle",
                  "description": "Responsabilité civile professionnelle pour chauffeurs"
                }
              }
            ]
          }
        };

      case 'article':
        if (!data) return null;
        const post = data as BlogPost;
        return {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.excerpt,
          "image": post.coverImage || `${siteUrl}/og-image.jpg`,
          "author": {
            "@type": "Organization",
            "name": post.author
          },
          "publisher": {
            "@type": "Organization",
            "name": brandName,
            "logo": {
              "@type": "ImageObject",
              "url": `${siteUrl}/logo.png`
            }
          },
          "datePublished": post.createdAt,
          "dateModified": post.updatedAt || post.createdAt,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${siteUrl}/blog/${post.id}`
          },
          "keywords": post.tags.join(', ')
        };

      case 'faq':
        if (!data || !Array.isArray(data)) return null;
        const faqs = data as FaqEntry[];
        return {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        };

      case 'product':
        if (!data) return null;
        const offer = data as Offer;
        return {
          "@context": "https://schema.org",
          "@type": "Service",
          "name": offer.title,
          "description": offer.body.replace(/<[^>]*>/g, '').substring(0, 200),
          "provider": {
            "@type": "Organization",
            "name": brandName
          },
          "areaServed": "France",
          "serviceType": "Insurance",
          "url": `${siteUrl}/offres/${offer.id}`
        };

      case 'breadcrumb':
        if (!data || !Array.isArray(data)) return null;
        return {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": data.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": `${siteUrl}${item.url}`
          }))
        };

      default:
        return null;
    }
  };

  const schema = generateSchema();
  
  if (!schema) return null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default JsonLd;