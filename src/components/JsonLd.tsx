import React from 'react';
import { Helmet } from 'react-helmet-async';
import { BlogPost, FaqEntry, Offer } from '../lib/schema';

const STATIC_FAQS: Pick<FaqEntry, 'question' | 'answer'>[] = [
  {
    question: "Combien coûte une assurance taxi avec TaxiAssur ?",
    answer: "Nos tarifs négociés vous font économiser jusqu'à 35% vs assureurs classiques. Prix selon zone, expérience, véhicule. Moyenne clients : 890-1800€/an au lieu de 1200-2500€. Demandez votre devis personnalisé gratuit !"
  },
  {
    question: "Quelles garanties sont incluses dans l'assurance taxi TaxiAssur ?",
    answer: "RC Pro obligatoire, protection conducteur, dommages collision, vol incendie, bris de glace, assistance 0km, protection juridique, garantie contenu véhicule. Toutes les garanties essentielles en standard."
  },
  {
    question: "TaxiAssur couvre-t-il toute la France ?",
    answer: "Oui ! Notre réseau de partenaires assureurs couvre l'ensemble du territoire français. Paris, Lyon, Marseille, Toulouse, Nice, Bordeaux... Partout en France métropolitaine et DOM-TOM."
  },
  {
    question: "Quel est le délai pour recevoir mon attestation d'assurance taxi ?",
    answer: "Attestation d'assurance émise immédiatement par email après validation du dossier. Envoi postal sous 48h. Effet de garantie : le jour même ou date de votre choix."
  },
  {
    question: "Y a-t-il des frais cachés avec TaxiAssur ?",
    answer: "Non ! Tarifs transparents sans surprises. Pas de frais de dossier, pas de frais de modification, devis 100% gratuit. Le prix annoncé est le prix final, garantie satisfait ou remboursé."
  },
  {
    question: "Quels documents sont nécessaires pour souscrire une assurance taxi ?",
    answer: "Carte grise du véhicule, permis de conduire valide, carte professionnelle taxi ou VTC en cours de validité, relevé d'information de votre ancien assureur si vous en aviez un."
  },
  {
    question: "Comment résilier mon ancienne assurance taxi ?",
    answer: "TaxiAssur s'occupe de tout ! Nous gérons la résiliation de votre ancien contrat selon la loi Hamon (après 1 an) ou échéance annuelle. Vous n'avez rien à faire, nous nous chargeons des démarches administratives."
  },
  {
    question: "Que faire en cas de sinistre avec mon taxi assuré chez TaxiAssur ?",
    answer: "1) Appelez immédiatement le 01 80 85 57 86 (24h/7j). 2) Remplissez le constat amiable. 3) Envoyez-nous les documents sous 5 jours. 4) Notre expert traite votre dossier rapidement. Assistance et véhicule de remplacement disponibles."
  }
];

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
          "@type": "InsuranceAgency",
          "name": brandName,
          "description": "Courtier spécialiste en assurance taxi, VTC et RC professionnelle. Devis gratuit en 2 minutes, économisez jusqu'à 35% sur votre assurance taxi.",
          "url": siteUrl,
          "logo": `${siteUrl}/logo-600x300.png`,
          "telephone": "+33180855786",
          "email": contactEmail,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "824 Avenue du Lys",
            "addressLocality": "Dammarie-les-Lys",
            "postalCode": "77190",
            "addressCountry": "FR"
          },
          "openingHours": "Mo-Fr 09:00-18:00",
          "priceRange": "€€",
          "areaServed": {
            "@type": "Country",
            "name": "France"
          },
          "knowsAbout": [
            "Assurance Taxi",
            "Assurance VTC",
            "RC Professionnelle",
            "Assurance Flotte Taxi",
            "Assurance Véhicule Professionnel"
          ],
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "5.0",
            "reviewCount": "50",
            "bestRating": "5",
            "worstRating": "4"
          },
          "sameAs": [
            "https://www.linkedin.com/company/xcr",
            "https://www.facebook.com/taxiassur",
            `${siteUrl}/mentions-legales`
          ],
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Services d'assurance taxi professionnelle",
            "itemListElement": [
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Assurance Taxi Tous Risques",
                  "description": "Couverture complète RC Pro, dommages tous accidents, protection juridique, assistance 0km",
                  "serviceType": "Insurance"
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Assurance VTC",
                  "description": "Assurance spécifique pour chauffeurs VTC avec garanties adaptées",
                  "serviceType": "Insurance"
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "RC Professionnelle Taxi",
                  "description": "Responsabilité civile professionnelle obligatoire pour chauffeurs de taxi",
                  "serviceType": "Insurance"
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Assurance Flotte Taxi",
                  "description": "Assurance multi-véhicules pour flottes de taxis professionnels",
                  "serviceType": "Insurance"
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
          "image": post.coverImage || `${siteUrl}/logo-600x300.png`,
          "author": {
            "@type": "Organization",
            "name": post.author || brandName,
            "url": siteUrl
          },
          "publisher": {
            "@type": "Organization",
            "name": brandName,
            "url": siteUrl,
            "logo": {
              "@type": "ImageObject",
              "url": `${siteUrl}/logo-600x300.png`,
              "width": 600,
              "height": 300
            }
          },
          "datePublished": post.createdAt,
          "dateModified": post.updatedAt || post.createdAt,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${siteUrl}/blog/${post.id}`
          },
          "keywords": post.tags.join(', '),
          "wordCount": post.content?.replace(/<[^>]*>/g, '').split(/\s+/).length || 0,
          "articleSection": "Assurance Taxi",
          "inLanguage": "fr-FR",
          "isAccessibleForFree": true
        };

      case 'faq':
        const faqItems = (data && Array.isArray(data) && data.length > 0)
          ? data as FaqEntry[]
          : STATIC_FAQS;
        return {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqItems.map(faq => ({
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