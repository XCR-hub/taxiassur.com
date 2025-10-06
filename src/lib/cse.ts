import { z } from 'zod';

export const CseItemSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  snippet: z.string().optional(),
  displayLink: z.string().optional(),
  pagemap: z.record(z.any()).optional()
});

export const CseResultSchema = z.object({
  items: z.array(CseItemSchema).optional(),
  searchInformation: z.object({
    totalResults: z.string().optional(),
    searchTime: z.number().optional()
  }).optional(),
  queries: z.object({
    nextPage: z.array(z.object({
      startIndex: z.number()
    })).optional()
  }).optional()
});

export type CseItem = z.infer<typeof CseItemSchema>;
export type CseResult = z.infer<typeof CseResultSchema>;

const API_KEY = import.meta.env.VITE_GOOGLE_CSE_API_KEY as string;
const CX = import.meta.env.VITE_GOOGLE_CSE_CX as string;

// Rate limiting for CSE API
class CSERateLimiter {
  private static lastCall = 0;
  private static callCount = 0;
  private static dailyLimit = 100; // Google CSE free tier
  
  static async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    const minInterval = 1000; // 1 second between calls
    
    if (timeSinceLastCall < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastCall));
    }
    
    this.lastCall = Date.now();
    this.callCount++;
    
    // Reset daily counter at midnight
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('cse_last_reset');
    if (lastResetDate !== today) {
      this.callCount = 0;
      localStorage.setItem('cse_last_reset', today);
      localStorage.setItem('cse_call_count', '0');
    } else {
      localStorage.setItem('cse_call_count', this.callCount.toString());
    }
  }
  
  static getRemainingQuota(): number {
    const used = parseInt(localStorage.getItem('cse_call_count') || '0');
    return Math.max(0, this.dailyLimit - used);
  }
}

export async function cseSearch(query: string, start = 1): Promise<{
  items: CseItem[];
  totalResults?: number;
  hasNextPage: boolean;
  remainingQuota: number;
}> {
  if (!API_KEY || !CX) {
    console.log("🔍 Partner Finder: Mode simulation (clés API Google non configurées)");
    return {
      items: [
        {
          title: `Résultat simulation pour: ${query}`,
          link: "https://exemple-annuaire-taxi.fr/partenaires",
          snippet: "Exemple de prospect trouvé par Partner Finder. Configurez vos clés API Google pour des résultats réels.",
          displayLink: "exemple-annuaire-taxi.fr"
        },
        {
          title: `Association Taxi - ${query}`,
          link: "https://exemple-federation-taxi.org/contact",
          snippet: "Exemple d'association taxi trouvée. Résultats de simulation Partner Finder.",
          displayLink: "exemple-federation-taxi.org"
        },
        {
          title: `Blog Transport - ${query}`,
          link: "https://exemple-blog-taxi.fr/partenariat",
          snippet: "Exemple de blog taxi trouvé. Données de test Partner Finder.",
          displayLink: "exemple-blog-taxi.fr"
        }
      ],
      hasNextPage: false,
      remainingQuota: 100
    };
  }
  
  const remainingQuota = CSERateLimiter.getRemainingQuota();
  if (remainingQuota <= 0) {
    throw new Error('Quota CSE épuisé pour aujourd\'hui');
  }
  
  await CSERateLimiter.throttle();
  
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("cx", CX);
  url.searchParams.set("q", query);
  url.searchParams.set("start", String(start));
  url.searchParams.set("num", "10");
  url.searchParams.set("gl", "fr"); // France
  url.searchParams.set("hl", "fr"); // French
  url.searchParams.set("safe", "active");

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Limite de taux CSE atteinte');
      }
      throw new Error(`Erreur CSE: ${response.status}`);
    }
    
    const data = await response.json();
    const result = CseResultSchema.parse(data);
    
    const items = result.items || [];
    const totalResults = parseInt(result.searchInformation?.totalResults || '0');
    const hasNextPage = (result.queries?.nextPage?.length || 0) > 0;
    
    return {
      items,
      totalResults,
      hasNextPage,
      remainingQuota: CSERateLimiter.getRemainingQuota()
    };
  } catch (error) {
    console.error('CSE Search Error:', error);
    throw error;
  }
}

export function extractContactUrl(baseUrl: string): string[] {
  const domain = new URL(baseUrl).origin;
  return [
    `${domain}/contact`,
    `${domain}/partenariat`,
    `${domain}/partenaires`,
    `${domain}/mentions-legales`,
    `${domain}/a-propos`,
    `${domain}/nous-contacter`
  ];
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function generateProspectId(domain: string): string {
  return `prospect-${domain.replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
}