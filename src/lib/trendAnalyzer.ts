/**
 * Trend Analyzer - Analyse automatique des tendances SEO
 * Utilise plusieurs APIs gratuites pour optimiser le contenu
 */

import { supabase } from './supabase';

// =====================================================
// 1. GOOGLE TRENDS API (Via Serper.dev ou SerpAPI)
// =====================================================

interface TrendData {
  keyword: string;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  trend: 'rising' | 'stable' | 'falling';
  relatedQueries: string[];
  timestamp: string;
}

/**
 * Analyse les tendances via Google Trends
 * API gratuite : https://serpapi.com (100 requêtes/mois gratuit)
 */
export async function analyzeGoogleTrends(keyword: string): Promise<TrendData | null> {
  // API bloquée par CORS depuis le navigateur
  // TODO: Créer une Edge Function Supabase pour proxy les requêtes API
  console.warn('⚠️ Google Trends API désactivée (problème CORS) - utilisation de données simulées');
  return getMockTrendData(keyword);

  /* Code désactivé temporairement
  const SERP_API_KEY = import.meta.env.VITE_SERP_API_KEY;

  if (!SERP_API_KEY) {
    console.log('⚠️ SERP API key not configured - using mock data');
    return getMockTrendData(keyword);
  }

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(keyword)}&data_type=TIMESERIES&geo=FR&api_key=${SERP_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Serp API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      keyword,
      searchVolume: estimateSearchVolume(data),
      competition: analyzeCompetition(data),
      trend: analyzeTrend(data),
      relatedQueries: data.related_queries?.top?.slice(0, 10).map((q: any) => q.query) || [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Google Trends error:', error);
    return getMockTrendData(keyword);
  }
  */
}

// =====================================================
// 2. ANSWER THE PUBLIC API (Gratuit avec limite)
// =====================================================

interface QuestionData {
  questions: string[];
  prepositions: string[];
  comparisons: string[];
  alphabeticals: string[];
}

/**
 * Récupère les questions populaires via AnswerThePublic
 * Alternative gratuite : https://answerthepublic.com API
 */
export async function getPopularQuestions(keyword: string): Promise<QuestionData> {
  // AnswerThePublic n'a pas d'API publique officielle
  // Alternative : scraping éthique ou service alternatif

  // Pour l'instant, utilisons les patterns courants français
  return generateQuestionPatterns(keyword);
}

function generateQuestionPatterns(keyword: string): QuestionData {
  const questions = [
    `Combien coûte ${keyword} ?`,
    `Comment obtenir ${keyword} ?`,
    `Pourquoi ${keyword} est obligatoire ?`,
    `Quelle est la meilleure ${keyword} ?`,
    `${keyword} : comment ça marche ?`,
    `Où trouver ${keyword} pas cher ?`,
    `${keyword} : quelles garanties ?`,
    `Est-ce que ${keyword} est obligatoire ?`,
    `${keyword} : quel prix en 2024 ?`,
    `Comment comparer ${keyword} ?`
  ];

  const prepositions = [
    `${keyword} pour taxi`,
    `${keyword} avec RC professionnelle`,
    `${keyword} sans engagement`,
    `${keyword} en ligne`,
    `${keyword} à Paris`
  ];

  const comparisons = [
    `${keyword} vs assurance standard`,
    `${keyword} ou RC Pro seule`,
    `${keyword} : AXA vs autres`
  ];

  const alphabeticals = [
    `${keyword} annuelle`,
    `${keyword} bon marché`,
    `${keyword} comparateur`,
    `${keyword} devis gratuit`,
    `${keyword} économique`
  ];

  return { questions, prepositions, comparisons, alphabeticals };
}

// =====================================================
// 3. GOOGLE SEARCH CONSOLE API
// =====================================================

interface SearchConsoleData {
  topQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  topPages: { page: string; clicks: number; impressions: number }[];
  avgPosition: number;
}

/**
 * Récupère les données Search Console pour optimisation
 * Nécessite authentification OAuth2 Google
 */
export async function getSearchConsoleData(): Promise<SearchConsoleData | null> {
  // Cette API nécessite une authentification OAuth2
  // Pour l'instant, on stocke les données manuellement dans Supabase

  try {
    const { data, error } = await supabase
      .from('search_console_data')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.metrics as SearchConsoleData;
  } catch (error) {
    console.error('Search Console data error:', error);
    return null;
  }
}

// =====================================================
// 4. GOOGLE SUGGEST API (Autocomplete)
// =====================================================

/**
 * Récupère les suggestions Google Autocomplete
 * API gratuite et sans clé
 */
export async function getGoogleSuggestions(keyword: string): Promise<string[]> {
  // API bloquée par CORS depuis le navigateur
  // TODO: Créer une Edge Function Supabase pour proxy les requêtes
  console.warn('⚠️ Google Suggest API désactivée (problème CORS) - utilisation de suggestions génériques');

  // Retourne des suggestions génériques basées sur le keyword
  return [
    `${keyword} pas cher`,
    `${keyword} en ligne`,
    `${keyword} comparateur`,
    `${keyword} devis gratuit`,
    `${keyword} meilleur prix`,
    `${keyword} avis`,
    `${keyword} 2024`
  ];

  /* Code désactivé temporairement
  try {
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}&hl=fr&gl=fr`
    );

    if (!response.ok) {
      throw new Error('Google Suggest API error');
    }

    const data = await response.json();
    return data[1] || []; // Returns array of suggestions
  } catch (error) {
    console.error('Google Suggest error:', error);
    return [];
  }
  */
}

// =====================================================
// 5. SYSTÈME D'ANALYSE AUTOMATIQUE
// =====================================================

export interface ContentOpportunity {
  keyword: string;
  priority: 'high' | 'medium' | 'low';
  searchVolume: number;
  competition: string;
  trend: string;
  suggestedTitle: string;
  suggestedQuestions: string[];
  estimatedTraffic: number;
  difficulty: number;
}

/**
 * Analyse complète et génère des opportunités de contenu
 */
export async function analyzeContentOpportunities(baseKeywords: string[]): Promise<ContentOpportunity[]> {
  const opportunities: ContentOpportunity[] = [];

  for (const keyword of baseKeywords) {
    // 1. Analyse tendances
    const trends = await analyzeGoogleTrends(keyword);

    // 2. Questions populaires
    const questions = await getPopularQuestions(keyword);

    // 3. Suggestions Google
    const suggestions = await getGoogleSuggestions(keyword);

    if (trends) {
      opportunities.push({
        keyword: trends.keyword,
        priority: calculatePriority(trends),
        searchVolume: trends.searchVolume,
        competition: trends.competition,
        trend: trends.trend,
        suggestedTitle: generateTitle(trends.keyword, questions.questions[0]),
        suggestedQuestions: questions.questions.slice(0, 5),
        estimatedTraffic: estimateTraffic(trends.searchVolume, trends.competition),
        difficulty: calculateDifficulty(trends.competition, trends.trend)
      });
    }

    // Ajouter les variations
    for (const suggestion of suggestions.slice(0, 5)) {
      const suggestionTrends = await analyzeGoogleTrends(suggestion);
      if (suggestionTrends) {
        opportunities.push({
          keyword: suggestionTrends.keyword,
          priority: calculatePriority(suggestionTrends),
          searchVolume: suggestionTrends.searchVolume,
          competition: suggestionTrends.competition,
          trend: suggestionTrends.trend,
          suggestedTitle: generateTitle(suggestionTrends.keyword, questions.questions[0]),
          suggestedQuestions: questions.questions.slice(0, 5),
          estimatedTraffic: estimateTraffic(suggestionTrends.searchVolume, suggestionTrends.competition),
          difficulty: calculateDifficulty(suggestionTrends.competition, suggestionTrends.trend)
        });
      }
    }
  }

  // Trier par priorité et trafic estimé
  return opportunities
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.estimatedTraffic - a.estimatedTraffic;
    })
    .slice(0, 50); // Top 50 opportunités
}

/**
 * Sauvegarde les opportunités dans Supabase
 */
export async function saveContentOpportunities(opportunities: ContentOpportunity[]) {
  const { error } = await supabase
    .from('content_opportunities')
    .upsert(
      opportunities.map(opp => ({
        keyword: opp.keyword,
        priority: opp.priority,
        search_volume: opp.searchVolume,
        competition: opp.competition,
        trend: opp.trend,
        suggested_title: opp.suggestedTitle,
        suggested_questions: opp.suggestedQuestions,
        estimated_traffic: opp.estimatedTraffic,
        difficulty: opp.difficulty,
        analyzed_at: new Date().toISOString()
      })),
      { onConflict: 'keyword' }
    );

  if (error) {
    console.error('Error saving opportunities:', error);
  }
}

// =====================================================
// HELPERS
// =====================================================

function getMockTrendData(keyword: string): TrendData {
  return {
    keyword,
    searchVolume: Math.floor(Math.random() * 5000) + 500,
    competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
    trend: ['rising', 'stable', 'falling'][Math.floor(Math.random() * 3)] as any,
    relatedQueries: [
      `${keyword} pas cher`,
      `${keyword} devis`,
      `meilleure ${keyword}`,
      `${keyword} en ligne`,
      `${keyword} comparatif`
    ],
    timestamp: new Date().toISOString()
  };
}

function estimateSearchVolume(data: any): number {
  // Logique d'estimation basée sur les données trends
  return Math.floor(Math.random() * 5000) + 500;
}

function analyzeCompetition(data: any): 'low' | 'medium' | 'high' {
  // Analyse de la compétition
  return 'medium';
}

function analyzeTrend(data: any): 'rising' | 'stable' | 'falling' {
  // Analyse de la tendance
  return 'rising';
}

function calculatePriority(trends: TrendData): 'high' | 'medium' | 'low' {
  if (trends.trend === 'rising' && trends.competition === 'low') {
    return 'high';
  }
  if (trends.trend === 'stable' && trends.competition === 'medium') {
    return 'medium';
  }
  return 'low';
}

function generateTitle(keyword: string, question: string): string {
  return question || `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} : Guide Complet 2024`;
}

function estimateTraffic(volume: number, competition: string): number {
  const competitionFactor = {
    low: 0.3,
    medium: 0.15,
    high: 0.05
  }[competition] || 0.15;

  return Math.floor(volume * competitionFactor);
}

function calculateDifficulty(competition: string, trend: string): number {
  const baseScore = {
    low: 3,
    medium: 6,
    high: 9
  }[competition] || 6;

  const trendAdjustment = {
    rising: -1,
    stable: 0,
    falling: 1
  }[trend] || 0;

  return Math.max(1, Math.min(10, baseScore + trendAdjustment));
}
