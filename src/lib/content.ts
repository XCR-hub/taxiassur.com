import { BlogPost, FaqEntry, Review, Offer, BlogPostSchema, FaqEntrySchema, ReviewSchema, OfferSchema } from './schema';
import { supabase } from '@/lib/supabase';
import { generateCityPages } from './ping';
import { logger } from '@/lib/logger';
import { getD1Content, listD1Content } from '@/lib/d1-public-cache';

// Type pour les pages ville
export interface CityPage {
  id: string;
  name: string;
  slug: string;
  department: string;
  region: string;
  url: string;
  taxis_insured: number;
  average_savings: number;
  satisfied_clients: number;
  average_rating: number;
  meta_title: string;
  meta_description: string;
  created_at?: string;
}

// Use singleton Supabase instance - NEVER create new instances
logger.log('🔧 Content module using singleton Supabase instance');
const UUID_PATTERN = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const CITY_UUID_SLUG_RE = new RegExp(`^(assurance-taxi-)?ville-${UUID_PATTERN}$`, 'i');

export function isIndexableCitySlug(slug?: string | null): boolean {
  const normalized = (slug || '').trim();
  return normalized.length > 0 && !CITY_UUID_SLUG_RE.test(normalized);
}
function getCityPublicUrl(slug: string): string {
  return slug.startsWith('assurance-taxi-') ? `/${slug}` : `/assurance-taxi-${slug}`;
}

type BlogPostRow = {
  id?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  author?: string | null;
  featured_image?: string | null;
  keywords?: string[] | null;
  created_at?: string;
  updated_at?: string | null;
};

type FaqEntryRow = {
  id?: string | number | null;
  question: string;
  answer: string;
  created_at?: string;
  updated_at?: string;
  category?: string | null;
};

type CityPageRow = {
  id: string;
  city?: string | null;
  city_name?: string | null;
  slug: string;
  dept?: string | null;
  department?: string | null;
  region?: string | null;
  taxi_count?: number | null;
  title?: string | null;
  meta_description?: string | null;
  created_at?: string;
};

function mapBlogPostRow(item: BlogPostRow): BlogPost {
  const slug = item.slug || item.id || '';

  return {
    id: slug,
    title: item.title || '',
    excerpt: item.excerpt || '',
    content: item.content || '',
    author: item.author || 'TaxiAssur',
    coverImage: item.featured_image || null,
    tags: item.keywords || [],
    createdAt: item.created_at || new Date().toISOString(),
    updatedAt: item.updated_at || item.created_at || new Date().toISOString(),
    faq: [],
    status: 'published',
  };
}

function mapFaqEntryRow(item: FaqEntryRow): FaqEntry {
  return {
    id: item.id?.toString() || Math.random().toString(),
    question: item.question,
    answer: item.answer,
    updatedAt: item.updated_at || item.created_at,
    tags: [item.category || 'assurance-taxi'],
    status: 'published',
  };
}

function mapCityPageRow(item: CityPageRow): CityPage {
  const cityName = item.city_name || item.city || '';
  const taxiCount = item.taxi_count || 0;

  return {
    id: item.id,
    name: cityName,
    slug: item.slug,
    department: item.department || item.dept || '',
    region: item.region || '',
    url: getCityPublicUrl(item.slug),
    taxis_insured: taxiCount,
    average_savings: 35,
    satisfied_clients: Math.floor(taxiCount * 0.8),
    average_rating: 4.8,
    meta_title: item.title || cityName,
    meta_description: item.meta_description || '',
    created_at: item.created_at,
  };
}
// Fonction utilitaire pour lire les fichiers JSON locaux
async function fetchLocalContent<T extends { status?: string }>(type: string, schema: { parse: (data: unknown) => T }): Promise<T[]> {
  try {
    // Ne pas essayer de lister le répertoire (403 sur IONOS)
    // Lire directement les fichiers index-N.json
    const items: T[] = [];
    let index = 0;

    while (index < 100) { // Limite de sécurité
      try {
        const fileResponse = await fetch(`/content/${type}/index-${index}.json`);
        if (!fileResponse.ok) {
          // Si index-0 n'existe pas, essayer de charger les fichiers individuels connus
          if (index === 0) {
            // Charger tous les fichiers JSON du répertoire (sans listing)
            const knownFiles = await loadKnownFiles(type);
            return knownFiles.map(f => schema.parse(f)).filter((item) => item.status === 'published');
          }
          break;
        }

        // Vérifier que la réponse est bien du JSON
        const contentType = fileResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          if (index === 0) {
            const knownFiles = await loadKnownFiles(type);
            return knownFiles.map(f => schema.parse(f)).filter((item) => item.status === 'published');
          }
          break;
        }

        const data = await fileResponse.json();
        const validated = schema.parse(data);
        if (validated.status === 'published') {
          items.push(validated);
        }
        index++;
      } catch (err) {
        logger.warn(`Error loading ${type}/index-${index}.json:`, err);
        if (index === 0) {
          try {
            const knownFiles = await loadKnownFiles(type);
            return knownFiles.map(f => schema.parse(f)).filter((item) => item.status === 'published');
          } catch (e) {
            logger.error(`Failed to load known files for ${type}:`, e);
          }
        }
        break;
      }
    }

    return items;
  } catch (error) {
    logger.warn(`Failed to load ${type} content:`, error);
    return [];
  }
}

// Liste des fichiers connus (fallback si pas de index-N.json)
async function loadKnownFiles(type: string): Promise<any[]> {
  const knownFiles: Record<string, string[]> = {
    'blog': [
      'assurance-flotte-taxi-guide-complet-2025',
      'assurance-taxi-2024',
      'assurance-taxi-electrique-tesla-2025',
      'assurance-taxi-jeune-conducteur-solutions-2025',
      'assurance-taxi-jeune-conducteur',
      'assurance-taxi-paris-guide-local-2025',
      'assurance-taxi-resilié',
      'assurance-vtc-vs-taxi-differences-2025',
      'changement-assurance-taxi-mode-emploi',
      'choisir-vehicule-taxi-2024',
      'comment-payer-30-moins-cher-assurance-taxi-2025',
      'comparateur-assurance-taxi-guide-2025',
      'comparatif-assurances-taxi-2024',
      'comparatif-assurances-taxi-2025-axa-generali-covea',
      'cout-assurance-taxi-par-ville',
      'devenir-chauffeur-taxi-2024',
      'double-activite-taxi-vtc-assurance',
      'economiser-assurance-taxi-2024',
      'flotte-taxis-assurance',
      'rc-pro-taxi-3-erreurs-eviter-2025',
      'reglementation-taxi-2024',
      'sinistre-taxi-procedure-complete-2025',
      'sinistre-taxi-que-faire',
      'vehicules-electriques-taxi'
    ],
    'faq': [
      'couverture-france',
      'delai-attestation',
      'frais-caches',
      'garanties-incluses',
      'pieces-necessaires',
      'resiliation-assurance',
      'sinistre-procedure',
      'tarifs-assurance'
    ],
    'reviews': [
      'ahmed-k',
      'david-r',
      'fatima-r',
      'jean-pierre-m',
      'marie-l',
      'mohammed-b'
    ],
    'offers': [
      'flotte-vehicules',
      'rc-professionnelle'
    ]
  };

  const files = knownFiles[type] || [];
  const items: unknown[] = [];

  for (const file of files) {
    try {
      const response = await fetch(`/content/${type}/${file}.json`);
      if (response.ok) {
        // Vérifier que c'est bien du JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          items.push(data);
        }
      }
    } catch (err) {
      logger.warn(`Failed to load ${type}/${file}.json:`, err);
    }
  }

  return items;
}

// Fonction pour lire un fichier spécifique
async function fetchLocalItem<T>(type: string, id: string, schema: { parse: (data: unknown) => T }): Promise<T | null> {
  try {
    const response = await fetch(`/content/${type}/${id}.json`);
    if (!response.ok) return null;

    // Vérifier que c'est bien du JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }

    const data = await response.json();
    const validated = schema.parse(data);
    return validated.status === 'published' ? validated : null;
  } catch (error) {
    logger.warn(`Failed to load ${type}/${id}:`, error);
    return null;
  }
}

// Blog Posts
export async function getBlogPosts(): Promise<BlogPost[]> {
  // D1 public cache: blog list. Supabase remains the fallback for CRM/backoffice continuity.
  const d1Posts = await listD1Content<BlogPostRow>('blog_posts', { limit: 100, status: 'published', sort: 'updated_at' });
  if (d1Posts.length > 0) {
    return d1Posts
      .map(mapBlogPostRow)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  if (supabase) {
    try {
      logger.log('🔍 Fetching blog posts from Supabase...');
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ Supabase error:', error.message);
      } else if (data && data.length > 0) {
        logger.log(`✅ Loaded ${data.length} blog posts from Supabase`);
        return data.map(item => ({
          id: item.slug,
          title: item.title,
          excerpt: item.excerpt,
          content: item.content,
          author: item.author || 'TaxiAssur',
          coverImage: item.featured_image || null,
          tags: item.keywords || [],
          createdAt: item.created_at,
          updatedAt: item.updated_at || item.created_at,
          faq: [],
          status: 'published'
        }));
      } else {
        logger.log('⚠️ No blog posts found in Supabase, trying local...');
      }
    } catch (error) {
      logger.error('❌ Supabase blog fetch exception:', error);
    }
  } else {
    logger.log('⚠️ Supabase not configured, using local content');
  }

  logger.log('📂 Loading blog posts from local files...');
  const posts = await fetchLocalContent<BlogPost>('blog', BlogPostSchema);
  logger.log(`✅ Loaded ${posts.length} blog posts from local files`);
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  // D1 public cache: single blog. Supabase remains the fallback.
  const d1Post = await getD1Content<BlogPostRow>('blog_posts', { slug: id });
  if (d1Post) {
    return mapBlogPostRow(d1Post);
  }
  if (supabase) {
    try {
      logger.log(`🔍 Fetching blog post "${id}" from Supabase...`);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', id)
        .eq('published', true)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.slug,
          title: data.title,
          excerpt: data.excerpt,
          content: data.content,
          author: data.author || 'TaxiAssur',
          coverImage: data.featured_image || null,
          tags: data.keywords || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at || data.created_at,
          faq: [],
          status: 'published'
        };
      }
    } catch (error) {
      logger.warn('Supabase blog post fetch failed, falling back to local:', error);
    }
  }

  return await fetchLocalItem<BlogPost>('blog', id, BlogPostSchema);
}

// FAQ Entries
export async function getFaqEntries(): Promise<FaqEntry[]> {
  // D1 public cache: FAQ. Supabase remains the fallback.
  const d1Faqs = await listD1Content<FaqEntryRow>('faq_entries', { limit: 100, status: 'published', sort: 'updated_at' });
  if (d1Faqs.length > 0) {
    return d1Faqs.map(mapFaqEntryRow);
  }
  if (supabase) {
    try {
      logger.log('🔍 Fetching FAQ entries from Supabase...');
      const { data, error } = await supabase
        .from('faq_entries')
        .select('*')
        .order('order_index', { ascending: true });

      if (!error && data && data.length > 0) {
        logger.log('✅ Loaded', data.length, 'FAQ from Supabase');
        return (data as Array<{ id?: string | number | null; question: string; answer: string; created_at?: string; category?: string }>).map((item) => ({
          id: item.id?.toString() || Math.random().toString(),
          question: item.question,
          answer: item.answer,
          updatedAt: item.created_at,
          tags: [item.category || 'assurance-taxi'],
          status: 'published' as const
        }));
      }
    } catch (error) {
      logger.warn('⚠️ Supabase FAQ fetch failed, falling back to local:', error);
    }
  }

  logger.log('📂 Loading FAQ from local files...');
  return await fetchLocalContent<FaqEntry>('faq', FaqEntrySchema);
}

// City Pages - Chargement dynamique depuis Supabase
export async function getCityPages(): Promise<CityPage[]> {
  // D1 public cache: city list. Supabase remains the fallback.
  const d1Cities = await listD1Content<CityPageRow>('city_pages', { limit: 100, status: 'published', sort: 'updated_at' });
  if (d1Cities.length > 0) {
    return d1Cities
      .filter((item) => isIndexableCitySlug(item.slug))
      .map(mapCityPageRow);
  }
  // Mode hybride : Essayer Supabase, sinon fallback vers villes statiques
  const USE_STATIC_CITIES = false;  // ✅ Supabase activé

  // Essayer d'abord Supabase directement (pas de RPC)
  if (supabase && !USE_STATIC_CITIES) {
    try {
      const { data, error } = await supabase
        .from('city_pages')
        .select('*')
        .or('status.eq.published,published.eq.true,is_published.eq.true')
        .order('taxi_count', { ascending: false });

      if (!error && data && data.length > 0) {
        logger.log('✅ Loaded', data.length, 'city pages from Supabase');
        return (data as Array<{ id: string; city: string; slug: string; dept?: string; region?: string; taxi_count?: number; title?: string; meta_description?: string; created_at?: string }>)
          .filter((item) => isIndexableCitySlug(item.slug))
          .map((item) => ({
          id: item.id,
          name: item.city,
          slug: item.slug,
          department: item.dept || '',
          region: item.region || '',
          url: getCityPublicUrl(item.slug),
          taxis_insured: item.taxi_count || 0,
          average_savings: 35,
          satisfied_clients: Math.floor((item.taxi_count || 0) * 0.8),
          average_rating: 4.8,
          meta_title: item.title || item.city,
          meta_description: item.meta_description || '',
          created_at: item.created_at
        }));
      }
    } catch (error) {
      logger.warn('⚠️ Supabase city pages fetch failed, falling back to static:', error);
    }
  }

  // Fallback vers les villes statiques de ping.ts
  logger.log('📍 Using static city pages (safe mode)');
  return (generateCityPages() as Array<{ city: string; slug: string; title: string; description: string; department?: string; region?: string }>).map((city) => ({
    id: city.slug,
    name: city.city,
    slug: city.slug,
    department: city.department || '',
    region: city.region || '',
    url: getCityPublicUrl(city.slug),
    taxis_insured: 0,
    average_savings: 35,
    satisfied_clients: 0,
    average_rating: 4.8,
    meta_title: city.title,
    meta_description: city.description
  }));
}

// Obtenir une ville spécifique par son slug
export async function getCityBySlug(slug: string): Promise<CityPage | null> {
  if (!isIndexableCitySlug(slug)) return null;

  // D1 public cache: single city. Supabase remains the fallback.
  const lookupSlugs = Array.from(new Set([slug, slug.replace(/^assurance-taxi-/, ''), slug.startsWith('assurance-taxi-') ? slug : `assurance-taxi-${slug}`].filter(Boolean)));
  for (const lookupSlug of lookupSlugs) {
    const d1City = await getD1Content<CityPageRow>('city_pages', { slug: lookupSlug });
    if (d1City && isIndexableCitySlug(d1City.slug)) {
      return mapCityPageRow(d1City);
    }
  }
  // Mode hybride : Essayer Supabase, sinon fallback vers villes statiques
  const USE_STATIC_CITIES = false;  // ✅ Supabase activé

  if (supabase && !USE_STATIC_CITIES) {
    try {
      const { data, error } = await supabase
        .from('city_pages')
        .select('*')
        .eq('slug', slug)
        .or('status.eq.published,published.eq.true,is_published.eq.true')
        .single();

      if (!error && data) {
        return {
          id: data.id,
          name: data.city,              // ✅ CORRECTION: city → name
          slug: data.slug,
          department: data.dept || '',  // ✅ CORRECTION: dept → department
          region: data.region || '',
          url: getCityPublicUrl(data.slug),
          taxis_insured: data.taxi_count || 0,  // ✅ CORRECTION: taxi_count → taxis_insured
          average_savings: 35,
          satisfied_clients: Math.floor((data.taxi_count || 0) * 0.8),
          average_rating: 4.8,
          meta_title: data.title || data.city,
          meta_description: data.meta_description || ''
        };
      }
    } catch (error) {
      logger.warn('⚠️ Supabase city fetch failed:', error);
    }
  }

  // Fallback vers les villes statiques
  logger.log('📍 Using static city page for:', slug);
  const allCities = await getCityPages();
  return allCities.find(city => city.slug === slug) || null;
}

// Reviews
export async function getReviews(): Promise<Review[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(item => ReviewSchema.parse(item));
      }
    } catch (error) {
      logger.warn('Supabase reviews fetch failed, falling back to local:', error);
    }
  }

  const reviews = await fetchLocalContent<Review>('reviews', ReviewSchema);
  return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Offers
export async function getOffers(): Promise<Offer[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('status', 'published')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data.map(item => OfferSchema.parse(item));
      }
    } catch (error) {
      logger.warn('Supabase offers fetch failed, falling back to local:', error);
    }
  }

  return await fetchLocalContent<Offer>('offers', OfferSchema);
}

export async function getOffer(id: string): Promise<Offer | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single();
      
      if (!error && data) {
        return OfferSchema.parse(data);
      }
    } catch (error) {
      logger.warn('Supabase offer fetch failed, falling back to local:', error);
    }
  }
  
  return await fetchLocalItem<Offer>('offers', id, OfferSchema);
}

// Fonction utilitaire pour obtenir la dernière date de mise à jour
export async function getLastUpdateDate(): Promise<string> {
  try {
    const [posts, faqs, reviews, offers] = await Promise.all([
      getBlogPosts(),
      getFaqEntries(),
      getReviews(),
      getOffers()
    ]);
    
    const dates = [
      ...posts.map(p => p.updatedAt || p.createdAt),
      ...faqs.map(f => f.updatedAt),
      ...reviews.map(r => r.createdAt),
      ...offers.map(o => o.updatedAt)
    ];
    
    if (dates.length === 0) return new Date().toISOString();
    
    const latestDate = dates.reduce((latest, current) => {
      return new Date(current) > new Date(latest) ? current : latest;
    });
    
    return latestDate;
  } catch (error) {
    logger.warn('Failed to get last update date:', error);
    return new Date().toISOString();
  }
}