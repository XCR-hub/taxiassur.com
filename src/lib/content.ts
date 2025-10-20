import { BlogPost, FaqEntry, Review, Offer, BlogPostSchema, FaqEntrySchema, ReviewSchema, OfferSchema } from './schema';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from './env';

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

// Configuration Supabase (optionnelle)
const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseAnonKey();

console.log('🔧 Supabase Config:', {
  url: supabaseUrl,
  keyPrefix: supabaseKey?.substring(0, 20) + '...'
});

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Fonction utilitaire pour lire les fichiers JSON locaux
async function fetchLocalContent<T>(type: string, schema: any): Promise<T[]> {
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
            return knownFiles.map(f => schema.parse(f)).filter((item: any) => item.status === 'published');
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
        console.warn(`Error loading ${type}/index-${index}.json:`, err);
        break;
      }
    }

    return items;
  } catch (error) {
    console.warn(`Failed to load ${type} content:`, error);
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
  const items: any[] = [];

  for (const file of files) {
    try {
      const response = await fetch(`/content/${type}/${file}.json`);
      if (response.ok) {
        const data = await response.json();
        items.push(data);
      }
    } catch (err) {
      console.warn(`Failed to load ${type}/${file}.json:`, err);
    }
  }

  return items;
}

// Fonction pour lire un fichier spécifique
async function fetchLocalItem<T>(type: string, id: string, schema: any): Promise<T | null> {
  try {
    const response = await fetch(`/content/${type}/${id}.json`);
    if (!response.ok) return null;
    
    const data = await response.json();
    const validated = schema.parse(data);
    return validated.status === 'published' ? validated : null;
  } catch (error) {
    console.warn(`Failed to load ${type}/${id}:`, error);
    return null;
  }
}

// Blog Posts
export async function getBlogPosts(): Promise<BlogPost[]> {
  if (supabase) {
    try {
      // Utiliser la fonction SQL pour contourner le cache PostgREST
      console.log('🔍 Fetching blog posts via SQL function...');
      const { data, error } = await supabase.rpc('get_blog_posts');

      if (error) {
        console.error('❌ Supabase RPC error:', error.message, error.code, error.details);
        console.log('Falling back to local content...');
      } else if (data && data.length > 0) {
        console.log(`✅ Loaded ${data.length} blog posts from Supabase`);
        return data.map(item => ({
          id: item.slug,
          title: item.title,
          excerpt: item.excerpt,
          content: item.content,
          author: item.author || 'TaxiAssur',
          coverImage: item.featured_image || null,
          tags: item.tags || [],
          createdAt: item.created_at,
          updatedAt: item.updated_at || item.created_at,
          faq: item.faq || [],
          status: 'published'
        }));
      } else {
        console.log('⚠️ No blog posts found in Supabase, trying local...');
      }
    } catch (error) {
      console.error('❌ Supabase blog fetch exception:', error);
    }
  } else {
    console.log('⚠️ Supabase not configured, using local content');
  }

  console.log('📂 Loading blog posts from local files...');
  const posts = await fetchLocalContent<BlogPost>('blog', BlogPostSchema);
  console.log(`✅ Loaded ${posts.length} blog posts from local files`);
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  if (supabase) {
    try {
      // Utiliser la fonction SQL pour contourner le cache PostgREST
      console.log(`🔍 Fetching blog post "${id}" via SQL function...`);
      const { data, error } = await supabase.rpc('get_blog_post_by_slug', { p_slug: id });

      if (!error && data && data.length > 0) {
        const item = data[0];
        return {
          id: item.slug,
          title: item.title,
          excerpt: item.excerpt,
          content: item.content,
          author: item.author || 'TaxiAssur',
          coverImage: item.featured_image || null,
          tags: item.tags || [],
          createdAt: item.created_at,
          updatedAt: item.updated_at || item.created_at,
          faq: item.faq || [],
          status: 'published'
        };
      }
    } catch (error) {
      console.warn('Supabase blog post fetch failed, falling back to local:', error);
    }
  }

  return await fetchLocalItem<BlogPost>('blog', id, BlogPostSchema);
}

// FAQ Entries
export async function getFaqEntries(): Promise<FaqEntry[]> {
  // Essayer d'abord Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_faq_entries');

      if (!error && data && data.length > 0) {
        console.log('✅ Loaded', data.length, 'FAQ from Supabase');
        return data.map((item: any) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          updatedAt: item.created_at,
          tags: [item.category || 'assurance-taxi'],
          status: 'published' as const
        }));
      }
    } catch (error) {
      console.warn('⚠️ Supabase FAQ fetch failed, falling back to local:', error);
    }
  }

  // Fallback vers fichiers locaux
  return await fetchLocalContent<FaqEntry>('faq', FaqEntrySchema);
}

// City Pages - Chargement dynamique depuis Supabase
export async function getCityPages(): Promise<CityPage[]> {
  // Essayer d'abord Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_city_pages');

      if (!error && data && data.length > 0) {
        console.log('✅ Loaded', data.length, 'city pages from Supabase');
        return data.map((item: any) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          department: item.department,
          region: item.region,
          url: item.url,
          taxis_insured: item.taxis_insured || 0,
          average_savings: item.average_savings || 35,
          satisfied_clients: item.satisfied_clients || 0,
          average_rating: parseFloat(item.average_rating) || 4.8,
          meta_title: item.meta_title,
          meta_description: item.meta_description,
          created_at: item.created_at
        }));
      }
    } catch (error) {
      console.warn('⚠️ Supabase city pages fetch failed, falling back to static:', error);
    }
  }

  // Fallback vers les villes statiques de ping.ts
  const { generateCityPages } = await import('./ping');
  return generateCityPages().map((city: any) => ({
    id: city.slug,
    name: city.city,
    slug: city.slug,
    department: city.department,
    region: city.region,
    url: `/ville/${city.slug}`,
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
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_city_by_slug', { city_slug: slug });

      if (!error && data && data.length > 0) {
        const item = data[0];
        return {
          id: item.id,
          name: item.name,
          slug: item.slug,
          department: item.department,
          region: item.region,
          url: item.url,
          taxis_insured: item.taxis_insured || 0,
          average_savings: item.average_savings || 35,
          satisfied_clients: item.satisfied_clients || 0,
          average_rating: parseFloat(item.average_rating) || 4.8,
          meta_title: item.meta_title,
          meta_description: item.meta_description
        };
      }
    } catch (error) {
      console.warn('⚠️ Supabase city fetch failed:', error);
    }
  }

  // Fallback vers les villes statiques
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
        .order('createdAt', { ascending: false });
      
      if (!error && data) {
        return data.map(item => ReviewSchema.parse(item));
      }
    } catch (error) {
      console.warn('Supabase reviews fetch failed, falling back to local:', error);
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
        .order('updatedAt', { ascending: false });
      
      if (!error && data) {
        return data.map(item => OfferSchema.parse(item));
      }
    } catch (error) {
      console.warn('Supabase offers fetch failed, falling back to local:', error);
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
      console.warn('Supabase offer fetch failed, falling back to local:', error);
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
    console.warn('Failed to get last update date:', error);
    return new Date().toISOString();
  }
}