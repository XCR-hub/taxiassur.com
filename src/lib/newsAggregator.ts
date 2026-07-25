import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const NewsSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  type: z.enum(['rss', 'api', 'scraping']),
  enabled: z.boolean().default(true),
  keywords: z.array(z.string()).default([]),
  lastCheck: z.string().optional(),
  checkInterval: z.number().default(3600), // seconds
  priority: z.number().min(1).max(10).default(5),
  apiKey: z.string().optional(),
  headers: z.record(z.string()).optional()
});

export const RawNewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  url: z.string().url(),
  publishedAt: z.string(),
  source: z.string(),
  keywords: z.array(z.string()).default([]),
  relevanceScore: z.number().min(0).max(100).default(0),
  processed: z.boolean().default(false)
});

export const ProcessedNewsSchema = z.object({
  id: z.string(),
  originalTitle: z.string(),
  synthesizedTitle: z.string(),
  originalContent: z.string(),
  synthesizedContent: z.string(),
  taxiAngle: z.string(), // Angle spécifique taxi
  seoKeywords: z.array(z.string()),
  publishedAt: z.string(),
  sources: z.array(z.string()),
  relevanceScore: z.number(),
  status: z.enum(['draft', 'ready', 'published']).default('draft'),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type NewsSource = z.infer<typeof NewsSourceSchema>;
export type RawNewsItem = z.infer<typeof RawNewsItemSchema>;
export type ProcessedNews = z.infer<typeof ProcessedNewsSchema>;

// Sources d'actualités taxi configurées
export const DEFAULT_NEWS_SOURCES: NewsSource[] = [
  {
    id: 'taxi-mag',
    name: 'Taxi Magazine',
    url: 'https://www.taximag.fr/feed',
    type: 'rss',
    enabled: true,
    keywords: ['taxi', 'vtc', 'transport', 'réglementation', 'assurance'],
    priority: 9
  },
  {
    id: 'mobilite-magazine',
    name: 'Mobilité Magazine',
    url: 'https://www.mobilitemagazine.fr/feed',
    type: 'rss',
    enabled: true,
    keywords: ['mobilité', 'transport', 'taxi', 'urbain'],
    priority: 7
  },
  {
    id: 'transport-info',
    name: 'Transport Info',
    url: 'https://www.transportinfo.fr/rss',
    type: 'rss',
    enabled: true,
    keywords: ['transport', 'professionnel', 'réglementation'],
    priority: 6
  },
  {
    id: 'legifrance-taxi',
    name: 'Légifrance Transport',
    url: 'https://www.legifrance.gouv.fr/search/jorf?tab_selection=jorf&query=taxi&nature=DECRET',
    type: 'scraping',
    enabled: true,
    keywords: ['décret', 'arrêté', 'taxi', 'transport'],
    priority: 10
  },
  {
    id: 'google-news-taxi',
    name: 'Google News Taxi',
    url: 'https://news.google.com/rss/search?q=taxi+france&hl=fr&gl=FR&ceid=FR:fr',
    type: 'rss',
    enabled: true,
    keywords: ['taxi', 'france', 'actualité'],
    priority: 8
  }
];

// Classe principale pour l'agrégation de news
export class NewsAggregator {
  private sources: NewsSource[] = [];
  private rawNews: RawNewsItem[] = [];
  private processedNews: ProcessedNews[] = [];

  constructor() {
    this.sources = DEFAULT_NEWS_SOURCES;
  }

  async initialize(): Promise<void> {
    await this.loadSources();
    await this.loadProcessedNews();
  }

  private async loadSources(): Promise<void> {
    try {
      const response = await fetch('/content/news-sources.json');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          this.sources = Array.isArray(data) ? data.map(item => NewsSourceSchema.parse(item)) : DEFAULT_NEWS_SOURCES;
        }
      }
    } catch (error) {
      logger.warn('Failed to load news sources, using defaults:', error);
      this.sources = DEFAULT_NEWS_SOURCES;
    }
  }

  private async loadProcessedNews(): Promise<void> {
    try {
      const response = await fetch('/content/processed-news.json');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          this.processedNews = Array.isArray(data) ? data.map(item => ProcessedNewsSchema.parse(item)) : [];
        }
      }
    } catch (error) {
      logger.warn('Failed to load processed news:', error);
      this.processedNews = [];
    }
  }

  async fetchFromRSS(source: NewsSource): Promise<RawNewsItem[]> {
    try {
      // CORS proxy désactivé temporairement car allorigins.win retourne des erreurs
      // TODO: Utiliser une Edge Function Supabase pour récupérer les flux RSS
      logger.warn(`RSS fetch désactivé temporairement pour ${source.name} (problème CORS)`);
      return [];

      /* Ancienne implémentation avec allorigins.win
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(source.url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) return [];

      const data = await response.json();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data.contents, 'text/xml');

      const items = xmlDoc.querySelectorAll('item');
      const newsItems: RawNewsItem[] = [];

      items.forEach((item, index) => {
        if (index >= 10) return;

        const title = item.querySelector('title')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();

        if (title && link && this.isRelevantToTaxi(title, description)) {
          newsItems.push({
            id: `${source.id}-${Date.now()}-${index}`,
            title,
            content: description,
            url: link,
            publishedAt: new Date(pubDate).toISOString(),
            source: source.name,
            keywords: this.extractKeywords(title + ' ' + description),
            relevanceScore: this.calculateRelevanceScore(title, description, source.keywords),
            processed: false
          });
        }
      });

      return newsItems;
      */
    } catch (error) {
      logger.error(`Failed to fetch RSS from ${source.name}:`, error);
      return [];
    }
  }

  private isRelevantToTaxi(title: string, content: string): boolean {
    const text = (title + ' ' + content).toLowerCase();
    const taxiKeywords = [
      'taxi', 'vtc', 'chauffeur', 'transport de personnes', 'mobilité urbaine',
      'assurance taxi', 'rc professionnelle', 'véhicule de transport',
      'licence taxi', 'carte professionnelle', 'réglementation transport'
    ];
    
    return taxiKeywords.some(keyword => text.includes(keyword));
  }

  private extractKeywords(text: string): string[] {
    const keywords = new Set<string>();
    const taxiTerms = [
      'taxi', 'vtc', 'assurance', 'réglementation', 'transport',
      'chauffeur', 'véhicule', 'licence', 'professionnel', 'urbain',
      'mobilité', 'sécurité', 'tarif', 'économie', 'électrique'
    ];
    
    const lowerText = text.toLowerCase();
    taxiTerms.forEach(term => {
      if (lowerText.includes(term)) {
        keywords.add(term);
      }
    });
    
    return Array.from(keywords);
  }

  private calculateRelevanceScore(title: string, content: string, sourceKeywords: string[]): number {
    const text = (title + ' ' + content).toLowerCase();
    let score = 0;
    
    // Score based on source keywords
    sourceKeywords.forEach(keyword => {
      const matches = (text.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      score += matches * 10;
    });
    
    // Bonus for taxi-specific terms
    const taxiSpecificTerms = ['assurance taxi', 'rc professionnelle', 'licence taxi'];
    taxiSpecificTerms.forEach(term => {
      if (text.includes(term)) score += 20;
    });
    
    // Bonus for recent news
    score += 10; // Base score for being recent
    
    return Math.min(100, score);
  }

  async aggregateNews(): Promise<RawNewsItem[]> {
    const allNews: RawNewsItem[] = [];
    
    for (const source of this.sources.filter(s => s.enabled)) {
      try {
        let sourceNews: RawNewsItem[] = [];
        
        switch (source.type) {
          case 'rss':
            sourceNews = await this.fetchFromRSS(source);
            break;
          case 'api':
            sourceNews = await this.fetchFromAPI(source);
            break;
          case 'scraping':
            sourceNews = await this.fetchFromScraping(source);
            break;
        }
        
        allNews.push(...sourceNews);
        
        // Update last check time
        source.lastCheck = new Date().toISOString();
      } catch (error) {
        logger.error(`Error fetching from ${source.name}:`, error);
      }
    }
    
    // Sort by relevance score and recency
    return allNews
      .sort((a, b) => {
        const scoreA = a.relevanceScore + (new Date(a.publishedAt).getTime() / 1000000);
        const scoreB = b.relevanceScore + (new Date(b.publishedAt).getTime() / 1000000);
        return scoreB - scoreA;
      })
      .slice(0, 20); // Keep top 20 most relevant
  }

  private async fetchFromAPI(source: NewsSource): Promise<RawNewsItem[]> {
    // Implementation for API sources (NewsAPI, etc.)
    return [];
  }

  private async fetchFromScraping(source: NewsSource): Promise<RawNewsItem[]> {
    // Implementation for web scraping (respectful and legal)
    return [];
  }

  async saveRawNews(news: RawNewsItem[]): Promise<boolean> {
    try {
      const response = await fetch('/webhooks/make.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MAKE-SECRET': ''
        },
        body: JSON.stringify({
          type: 'raw_news',
          action: 'batch_save',
          payload: news
        })
      });
      
      return response.ok;
    } catch (error) {
      logger.error('Failed to save raw news:', error);
      return false;
    }
  }
}

// Rate limiting for news aggregation
export class NewsRateLimiter {
  private static lastFetch = new Map<string, number>();
  private static readonly MIN_INTERVAL = 3600000; // 1 hour

  static canFetch(sourceId: string): boolean {
    const lastTime = this.lastFetch.get(sourceId) || 0;
    return Date.now() - lastTime > this.MIN_INTERVAL;
  }

  static recordFetch(sourceId: string): void {
    this.lastFetch.set(sourceId, Date.now());
  }
}

// Hook React pour utiliser le système de news
export function useNewsSystem() {
  const [aggregator] = useState(() => new NewsAggregator());
  const [isRunning, setIsRunning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [newsCount, setNewsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startNewsSystem = useCallback(async () => {
    try {
      setIsRunning(true);
      setError(null);

      // Persister l'état actif dans localStorage
      localStorage.setItem('news_system_active', 'true');
      localStorage.removeItem('news_system_disabled');

      await aggregator.initialize();
      const news = await aggregator.aggregateNews();

      if (news.length > 0) {
        await aggregator.saveRawNews(news);
        setNewsCount(news.length);
        setLastUpdate(new Date().toISOString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setIsRunning(false);
    }
  }, [aggregator]);

  const stopNewsSystem = useCallback(() => {
    setIsRunning(false);

    // Persister l'état arrêté dans localStorage
    localStorage.setItem('news_system_active', 'false');
    localStorage.setItem('news_system_disabled', 'true');
  }, []);

  useEffect(() => {
    // Vérifier l'état précédent et démarrer si pas explicitement désactivé
    const wasActive = localStorage.getItem('news_system_active') === 'true';
    const isDisabled = localStorage.getItem('news_system_disabled') === 'true';
    
    if (wasActive && !isDisabled) {
      startNewsSystem();
    }
    
    // Interval pour vérifier toutes les 6 heures
    const interval = setInterval(startNewsSystem, 6 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [startNewsSystem]);

  return {
    isRunning,
    lastUpdate,
    newsCount,
    error,
    startNewsSystem,
    stopNewsSystem
  };
}