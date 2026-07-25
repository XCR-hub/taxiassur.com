import { RawNewsItem, ProcessedNews } from './newsAggregator';
import { BlogPostSchema } from './schema';
import { logger } from '@/lib/logger';

// Système de synthèse IA pour transformer les actualités en contenu TaxiAssur
export class AISynthesizer {
  private static readonly TAXI_ANGLES = [
    'impact sur les assurances taxi',
    'conséquences pour les professionnels',
    'nouvelles obligations réglementaires',
    'opportunités d\'économies',
    'évolutions technologiques',
    'sécurité et protection',
    'formation et certification'
  ];

  static async synthesizeNews(rawNews: RawNewsItem[]): Promise<ProcessedNews[]> {
    const processed: ProcessedNews[] = [];
    
    for (const news of rawNews.slice(0, 5)) { // Process top 5 most relevant
      try {
        const synthesis = await this.generateSynthesis(news);
        if (synthesis) {
          processed.push(synthesis);
        }
      } catch (error) {
        logger.error('Failed to synthesize news:', error);
      }
    }
    
    return processed;
  }

  private static async generateSynthesis(news: RawNewsItem): Promise<ProcessedNews | null> {
    try {
      // Simulate AI synthesis (in production, use OpenAI API or similar)
      const taxiAngle = this.selectTaxiAngle(news.title, news.content);
      const synthesizedTitle = this.generateTaxiTitle(news.title, taxiAngle);
      const synthesizedContent = this.generateTaxiContent(news, taxiAngle);
      const seoKeywords = this.generateSEOKeywords(news, taxiAngle);

      return {
        id: `processed-${news.id}`,
        originalTitle: news.title,
        synthesizedTitle,
        originalContent: news.content,
        synthesizedContent,
        taxiAngle,
        seoKeywords,
        publishedAt: news.publishedAt,
        sources: [news.source],
        relevanceScore: news.relevanceScore,
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Synthesis error:', error);
      return null;
    }
  }

  private static selectTaxiAngle(title: string, content: string): string {
    const text = (title + ' ' + content).toLowerCase();
    
    if (text.includes('assurance') || text.includes('couverture')) {
      return 'impact sur les assurances taxi';
    }
    if (text.includes('réglementation') || text.includes('loi') || text.includes('décret')) {
      return 'nouvelles obligations réglementaires';
    }
    if (text.includes('électrique') || text.includes('technologie') || text.includes('innovation')) {
      return 'évolutions technologiques';
    }
    if (text.includes('tarif') || text.includes('prix') || text.includes('économie')) {
      return 'opportunités d\'économies';
    }
    if (text.includes('formation') || text.includes('certification')) {
      return 'formation et certification';
    }
    if (text.includes('sécurité') || text.includes('accident')) {
      return 'sécurité et protection';
    }
    
    return 'conséquences pour les professionnels';
  }

  private static generateTaxiTitle(originalTitle: string, angle: string): string {
    const templates = {
      'impact sur les assurances taxi': [
        'Impact Assurance : {{title}}',
        'Assurance Taxi : {{title}}',
        'Nouvelles Conditions : {{title}}'
      ],
      'nouvelles obligations réglementaires': [
        'Réglementation 2024 : {{title}}',
        'Nouvelles Obligations : {{title}}',
        'Taxi 2024 : {{title}}'
      ],
      'évolutions technologiques': [
        'Innovation Taxi : {{title}}',
        'Technologie 2024 : {{title}}',
        'Évolution Taxi : {{title}}'
      ],
      'opportunités d\'économies': [
        'Économies Taxi : {{title}}',
        'Optimisation : {{title}}',
        'Réduction Coûts : {{title}}'
      ],
      'formation et certification': [
        'Formation Taxi : {{title}}',
        'Certification 2024 : {{title}}',
        'Compétences : {{title}}'
      ],
      'sécurité et protection': [
        'Sécurité Taxi : {{title}}',
        'Protection : {{title}}',
        'Prévention : {{title}}'
      ],
      'conséquences pour les professionnels': [
        'Professionnels Taxi : {{title}}',
        'Impact Métier : {{title}}',
        'Taxi Pro : {{title}}'
      ]
    };

    const angleTemplates = templates[angle as keyof typeof templates] || templates['conséquences pour les professionnels'];
    const template = angleTemplates[Math.floor(Math.random() * angleTemplates.length)];
    
    // Clean and shorten original title
    const cleanTitle = originalTitle
      .replace(/[^\w\s\-àâäéèêëïîôöùûüÿç]/gi, '')
      .substring(0, 60)
      .trim();
    
    return template.replace('{{title}}', cleanTitle);
  }

  private static generateTaxiContent(news: RawNewsItem, angle: string): string {
    const intro = this.generateIntro(news, angle);
    const analysis = this.generateAnalysis(news, angle);
    const taxiImpact = this.generateTaxiImpact(news, angle);
    const conclusion = this.generateConclusion(angle);

    return `${intro}\n\n${analysis}\n\n${taxiImpact}\n\n${conclusion}`;
  }

  private static generateIntro(news: RawNewsItem, angle: string): string {
    const intros = {
      'impact sur les assurances taxi': `<h2>Impact sur l'Assurance Taxi</h2><p>Cette actualité du secteur transport pourrait influencer les conditions d'assurance pour les professionnels du taxi.</p>`,
      'nouvelles obligations réglementaires': `<h2>Nouvelles Réglementations 2024</h2><p>Les évolutions réglementaires impactent directement l'activité des chauffeurs de taxi et leurs obligations d'assurance.</p>`,
      'évolutions technologiques': `<h2>Innovation et Technologie Taxi</h2><p>Les avancées technologiques transforment le secteur du taxi et influencent les besoins en assurance.</p>`,
      'opportunités d\'économies': `<h2>Optimisation des Coûts Taxi</h2><p>Cette évolution du marché présente de nouvelles opportunités d'économies pour les professionnels du taxi.</p>`,
      'formation et certification': `<h2>Formation et Certification Taxi</h2><p>L'évolution des exigences de formation impacte les professionnels du taxi et leurs assurances.</p>`,
      'sécurité et protection': `<h2>Sécurité et Protection Taxi</h2><p>Les questions de sécurité sont au cœur des préoccupations des professionnels du taxi.</p>`,
      'conséquences pour les professionnels': `<h2>Impact sur les Professionnels</h2><p>Cette actualité concerne directement l'activité des chauffeurs de taxi professionnels.</p>`
    };

    return intros[angle as keyof typeof intros] || intros['conséquences pour les professionnels'];
  }

  private static generateAnalysis(news: RawNewsItem, angle: string): string {
    return `<h3>Analyse TaxiAssur</h3><p>Selon nos experts, cette évolution ${angle.includes('réglementaires') ? 'réglementaire' : 'du secteur'} ${angle.includes('économies') ? 'présente des opportunités d\'optimisation' : 'nécessite une adaptation'} pour les professionnels du taxi.</p><p>Les principales implications concernent ${angle.includes('assurance') ? 'les conditions d\'assurance et de couverture' : angle.includes('technologie') ? 'l\'adaptation des garanties aux nouvelles technologies' : 'l\'évolution des besoins en protection professionnelle'}.</p>`;
  }

  private static generateTaxiImpact(news: RawNewsItem, angle: string): string {
    const impacts = {
      'impact sur les assurances taxi': `<h3>Conséquences pour Votre Assurance</h3><p>Cette évolution pourrait modifier :</p><ul><li>Les conditions de couverture RC professionnelle</li><li>Les tarifs d'assurance selon votre zone d'activité</li><li>Les garanties obligatoires ou recommandées</li><li>Les démarches administratives</li></ul><p><strong>Notre conseil :</strong> Vérifiez que votre contrat actuel reste adapté à ces évolutions.</p>`,
      'nouvelles obligations réglementaires': `<h3>Nouvelles Obligations</h3><p>Les professionnels du taxi doivent désormais :</p><ul><li>Respecter les nouvelles exigences réglementaires</li><li>Adapter leur couverture d'assurance si nécessaire</li><li>Mettre à jour leurs documents professionnels</li><li>Vérifier leur conformité</li></ul><p><strong>TaxiAssur vous accompagne</strong> dans ces démarches de mise en conformité.</p>`,
      'évolutions technologiques': `<h3>Adaptation Technologique</h3><p>Ces innovations impactent :</p><ul><li>Les besoins en assurance des nouveaux équipements</li><li>La couverture des technologies embarquées</li><li>Les garanties cyber-sécurité</li><li>Les formations requises</li></ul><p><strong>Anticipez ces évolutions</strong> avec une assurance adaptée aux nouvelles technologies.</p>`
    };

    return impacts[angle as keyof typeof impacts] || `<h3>Impact Professionnel</h3><p>Cette actualité concerne les professionnels du taxi et peut influencer leurs besoins en assurance et protection.</p><p><strong>Restez informé</strong> avec TaxiAssur pour adapter votre couverture aux évolutions du secteur.</p>`;
  }

  private static generateConclusion(angle: string): string {
    return `<h3>L'Expertise TaxiAssur</h3><p>En tant que courtier spécialisé taxi depuis 15 ans, TaxiAssur suit de près toutes les évolutions du secteur pour vous proposer les meilleures conditions d'assurance.</p><p><strong>Besoin de conseils ?</strong> Nos experts analysent l'impact de ces évolutions sur votre situation personnelle.</p><div class="cta-box"><p><strong>📞 01 80 85 57 86</strong> | <strong>📧 team@taxiassur.com</strong></p><p><a href="/contact">Demander un conseil personnalisé</a></p></div>`;
  }

  private static generateSEOKeywords(news: RawNewsItem, angle: string): string[] {
    const baseKeywords = ['actualité taxi', 'news taxi', 'information taxi'];
    const angleKeywords = {
      'impact sur les assurances taxi': ['assurance taxi actualité', 'news assurance taxi', 'évolution assurance'],
      'nouvelles obligations réglementaires': ['réglementation taxi 2024', 'obligations taxi', 'loi taxi'],
      'évolutions technologiques': ['innovation taxi', 'technologie taxi', 'taxi électrique'],
      'opportunités d\'économies': ['économies taxi', 'optimisation coûts', 'tarifs taxi'],
      'formation et certification': ['formation taxi', 'certification chauffeur', 'compétences taxi'],
      'sécurité et protection': ['sécurité taxi', 'protection chauffeur', 'prévention taxi'],
      'conséquences pour les professionnels': ['professionnels taxi', 'métier taxi', 'activité taxi']
    };

    const specificKeywords = angleKeywords[angle as keyof typeof angleKeywords] || angleKeywords['conséquences pour les professionnels'];
    
    return [...baseKeywords, ...specificKeywords, ...news.keywords];
  }

  static async convertToBlogPost(processedNews: ProcessedNews): Promise<any> {
    const blogPost = {
      id: `actualite-${Date.now()}`,
      title: processedNews.synthesizedTitle,
      excerpt: this.generateExcerpt(processedNews.synthesizedContent),
      content: processedNews.synthesizedContent,
      tags: processedNews.seoKeywords.slice(0, 5),
      coverImage: this.selectCoverImage(processedNews.taxiAngle),
      author: 'TaxiAssur',
      createdAt: new Date().toISOString(),
      status: 'published',
      category: 'actualité',
      source: 'automated',
      originalSources: processedNews.sources
    };

    return BlogPostSchema.parse(blogPost);
  }

  private static generateExcerpt(content: string): string {
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return textContent.substring(0, 160) + (textContent.length > 160 ? '...' : '');
  }

  private static selectCoverImage(angle: string): string {
    const images = {
      'impact sur les assurances taxi': 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800',
      'nouvelles obligations réglementaires': 'https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg?auto=compress&cs=tinysrgb&w=800',
      'évolutions technologiques': 'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=800',
      'opportunités d\'économies': 'https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=800',
      'formation et certification': 'https://images.pexels.com/photos/1181533/pexels-photo-1181533.jpeg?auto=compress&cs=tinysrgb&w=800',
      'sécurité et protection': 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800'
    };

    return images[angle as keyof typeof images] || images['impact sur les assurances taxi'];
  }
}

// Planificateur pour l'exécution automatique
export class NewsScheduler {
  private static isRunning = false;
  private static interval: NodeJS.Timeout | null = null;

  static start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.log('🤖 Démarrage du système de veille actualités taxi');
    
    // Exécution immédiate
    this.runNewsAggregation();
    
    // Puis toutes les 6 heures
    this.interval = setInterval(() => {
      this.runNewsAggregation();
    }, 6 * 60 * 60 * 1000);
  }

  static stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    logger.log('⏹️ Arrêt du système de veille actualités');
  }

  private static async runNewsAggregation(): Promise<void> {
    try {
      logger.log('🔍 Recherche de nouvelles actualités taxi...');
      
      const aggregator = new NewsAggregator();
      await aggregator.initialize();
      
      const rawNews = await aggregator.aggregateNews();
      logger.log(`📰 ${rawNews.length} actualités trouvées`);
      
      if (rawNews.length > 0) {
        const processedNews = await AISynthesizer.synthesizeNews(rawNews);
        logger.log(`🤖 ${processedNews.length} actualités synthétisées`);
        
        // Convert to blog posts and publish
        for (const news of processedNews) {
          try {
            const blogPost = await AISynthesizer.convertToBlogPost(news);
            await this.publishBlogPost(blogPost);
            logger.log(`✅ Article publié : ${blogPost.title}`);
          } catch (error) {
            logger.error('Failed to publish blog post:', error);
          }
        }
      }
    } catch (error) {
      logger.error('News aggregation error:', error);
    }
  }

  private static async publishBlogPost(blogPost: Record<string, unknown>): Promise<boolean> {
    try {
      const response = await fetch('/webhooks/make.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MAKE-SECRET': ''
        },
        body: JSON.stringify({
          type: 'blog',
          payload: blogPost
        })
      });
      
      return response.ok;
    } catch (error) {
      logger.error('Failed to publish blog post:', error);
      return false;
    }
  }
}

// Hook React pour utiliser le système de news
export function useNewsSystem() {
  const [isActive, setIsActive] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalProcessed: 0,
    publishedToday: 0,
    lastRun: null as string | null
  });

  const startSystem = () => {
    NewsScheduler.start();
    setIsActive(true);
    localStorage.setItem('news_system_active', 'true');
  };

  const stopSystem = () => {
    NewsScheduler.stop();
    setIsActive(false);
    localStorage.setItem('news_system_active', 'false');
  };

  React.useEffect(() => {
    const wasActive = localStorage.getItem('news_system_active') === 'true';
    if (wasActive) {
      setIsActive(true);
      NewsScheduler.start();
    }
  }, []);

  return {
    isActive,
    stats,
    startSystem,
    stopSystem
  };
}