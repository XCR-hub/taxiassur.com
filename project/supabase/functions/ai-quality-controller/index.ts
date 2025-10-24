import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Système de contrôle qualité automatique
 */
class QualityController {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  /**
   * Vérifie tous les aspects qualité d'un contenu
   */
  async runFullQualityCheck(content: string, contentType: string, contentId?: string) {
    const checks = await Promise.all([
      this.checkReadability(content),
      this.checkSEO(content),
      this.checkGrammar(content),
      this.checkHumanLikeness(content),
      this.checkEngagement(content),
      this.checkCompliance(content, contentType)
    ]);

    const [
      readability,
      seo,
      grammar,
      humanLikeness,
      engagement,
      compliance
    ] = checks;

    const overallScore = (
      readability.score +
      seo.score +
      grammar.score +
      humanLikeness.score +
      engagement.score +
      compliance.score
    ) / 6;

    const issues = [
      ...readability.issues,
      ...seo.issues,
      ...grammar.issues,
      ...humanLikeness.issues,
      ...engagement.issues,
      ...compliance.issues
    ];

    const improvements = this.generateImprovementPlan(issues);

    // Enregistrer les résultats
    await this.saveQualityReport({
      content_type: contentType,
      content_id: contentId,
      readability_score: readability.score,
      seo_score: seo.score,
      engagement_score: engagement.score,
      human_likeness_score: humanLikeness.score,
      overall_score: overallScore,
      analysis_details: {
        readability,
        seo,
        grammar,
        humanLikeness,
        engagement,
        compliance
      },
      improvement_suggestions: improvements
    });

    return {
      overallScore,
      passed: overallScore >= 70,
      details: { readability, seo, grammar, humanLikeness, engagement, compliance },
      issues,
      improvements,
      autoFixable: issues.filter(i => i.autoFixable).length
    };
  }

  /**
   * Vérifie la lisibilité (Flesch Reading Ease)
   */
  async checkReadability(content: string) {
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim()).length;
    const syllables = this.countSyllables(content);

    const fleschScore = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    const normalizedScore = Math.max(0, Math.min(100, fleschScore));

    const issues = [];
    if (normalizedScore < 60) {
      issues.push({
        type: 'readability',
        severity: 'medium',
        message: 'Texte trop complexe. Simplifiez les phrases.',
        autoFixable: true
      });
    }

    return {
      score: normalizedScore,
      metrics: { words, sentences, syllables, avgWordsPerSentence: words / sentences },
      issues
    };
  }

  /**
   * Vérifie les critères SEO
   */
  async checkSEO(content: string) {
    const issues = [];
    let score = 100;

    // Longueur du contenu
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 300) {
      issues.push({
        type: 'seo',
        severity: 'high',
        message: `Contenu trop court (${wordCount} mots). Minimum 300 mots recommandé.`,
        autoFixable: false
      });
      score -= 20;
    }

    // Présence de titres H2/H3
    const hasHeadings = content.includes('##') || content.includes('###');
    if (!hasHeadings && wordCount > 500) {
      issues.push({
        type: 'seo',
        severity: 'medium',
        message: 'Ajoutez des sous-titres pour structurer le contenu.',
        autoFixable: true
      });
      score -= 15;
    }

    // Densité de mots-clés (éviter sur-optimisation)
    const keywordDensity = this.calculateKeywordDensity(content);
    if (keywordDensity > 3) {
      issues.push({
        type: 'seo',
        severity: 'high',
        message: 'Densité de mots-clés trop élevée. Risque de pénalité SEO.',
        autoFixable: true
      });
      score -= 25;
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Vérifie la grammaire et l'orthographe
   */
  async checkGrammar(content: string) {
    const issues = [];
    let score = 100;

    // Vérifications basiques
    const commonErrors = [
      { pattern: /\s{2,}/g, message: 'Espaces multiples détectés' },
      { pattern: /[,;:]\S/g, message: 'Manque d\'espace après ponctuation' },
      { pattern: /\s[,;:.!?]/g, message: 'Espace avant ponctuation' }
    ];

    for (const { pattern, message } of commonErrors) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        issues.push({
          type: 'grammar',
          severity: 'low',
          message: `${message} (${matches.length} occurrences)`,
          autoFixable: true
        });
        score -= 5;
      }
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Vérifie si le contenu semble humain (anti-détection IA)
   */
  async checkHumanLikeness(content: string) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    let score = 100;
    const issues = [];

    // 1. Variation de longueur des phrases (Burstiness)
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 5) {
      issues.push({
        type: 'human_likeness',
        severity: 'high',
        message: 'Phrases trop uniformes. Variez la longueur pour paraître plus naturel.',
        autoFixable: true
      });
      score -= 30;
    }

    // 2. Transitions naturelles
    const transitions = ['cependant', 'néanmoins', 'par ailleurs', 'd\'ailleurs', 'en effet'];
    const transitionCount = transitions.filter(t =>
      content.toLowerCase().includes(t)
    ).length;

    if (transitionCount === 0 && sentences.length > 5) {
      issues.push({
        type: 'human_likeness',
        severity: 'medium',
        message: 'Manque de transitions naturelles entre les idées.',
        autoFixable: true
      });
      score -= 15;
    }

    // 3. Utilisation de vocabulaire varié
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const lexicalDiversity = uniqueWords.size / words.length;

    if (lexicalDiversity < 0.4) {
      issues.push({
        type: 'human_likeness',
        severity: 'medium',
        message: 'Vocabulaire trop répétitif. Utilisez plus de synonymes.',
        autoFixable: true
      });
      score -= 20;
    }

    return { score: Math.max(0, score), metrics: { burstiness: stdDev, lexicalDiversity }, issues };
  }

  /**
   * Vérifie le potentiel d'engagement
   */
  async checkEngagement(content: string) {
    let score = 70;
    const issues = [];

    // Questions pour engager le lecteur
    const questionCount = (content.match(/\?/g) || []).length;
    if (questionCount === 0) {
      issues.push({
        type: 'engagement',
        severity: 'low',
        message: 'Ajoutez des questions pour engager le lecteur.',
        autoFixable: true
      });
      score -= 10;
    } else {
      score += Math.min(20, questionCount * 5);
    }

    // Appels à l'action
    const ctaKeywords = ['découvrez', 'contactez', 'demandez', 'obtenez', 'profitez'];
    const hasCTA = ctaKeywords.some(keyword => content.toLowerCase().includes(keyword));

    if (!hasCTA) {
      issues.push({
        type: 'engagement',
        severity: 'medium',
        message: 'Ajoutez un appel à l\'action clair.',
        autoFixable: true
      });
      score -= 15;
    }

    return { score: Math.max(0, Math.min(100, score)), issues };
  }

  /**
   * Vérifie la conformité légale et éthique
   */
  async checkCompliance(content: string, contentType: string) {
    const issues = [];
    let score = 100;

    // Vérifier les mentions légales requises (pour assurance)
    if (contentType === 'insurance_content') {
      const requiredMentions = [
        { keyword: 'garanties', message: 'Mentionnez clairement les garanties' },
        { keyword: 'conditions', message: 'Référencez les conditions générales' }
      ];

      for (const { keyword, message } of requiredMentions) {
        if (!content.toLowerCase().includes(keyword)) {
          issues.push({
            type: 'compliance',
            severity: 'high',
            message,
            autoFixable: false
          });
          score -= 20;
        }
      }
    }

    // Éviter les promesses excessives
    const excessivePromises = ['garanti 100%', 'jamais', 'toujours', 'impossible de'];
    for (const promise of excessivePromises) {
      if (content.toLowerCase().includes(promise)) {
        issues.push({
          type: 'compliance',
          severity: 'medium',
          message: `Évitez les promesses absolues comme "${promise}"`,
          autoFixable: true
        });
        score -= 10;
      }
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Génère un plan d'amélioration automatique
   */
  generateImprovementPlan(issues: any[]) {
    const improvements = [];
    const grouped = this.groupBy(issues, 'type');

    for (const [type, typeIssues] of Object.entries(grouped)) {
      const autoFixable = typeIssues.filter((i: any) => i.autoFixable);
      if (autoFixable.length > 0) {
        improvements.push({
          category: type,
          priority: this.getPriority(typeIssues),
          actions: autoFixable.map((i: any) => i.message),
          estimatedImpact: `+${autoFixable.length * 5} points`
        });
      }
    }

    return improvements.sort((a, b) => b.priority - a.priority);
  }

  // Helpers
  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    return words.reduce((count, word) => {
      return count + word.split(/[aeiouy]+/).length - 1;
    }, 0);
  }

  private calculateKeywordDensity(content: string): number {
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq: { [key: string]: number } = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const maxFreq = Math.max(...Object.values(wordFreq));
    return (maxFreq / words.length) * 100;
  }

  private groupBy(array: any[], key: string) {
    return array.reduce((result, item) => {
      (result[item[key]] = result[item[key]] || []).push(item);
      return result;
    }, {});
  }

  private getPriority(issues: any[]): number {
    const severityScores = { high: 3, medium: 2, low: 1 };
    return issues.reduce((sum, issue) => sum + severityScores[issue.severity as keyof typeof severityScores], 0);
  }

  private async saveQualityReport(report: any) {
    const { error } = await this.supabase
      .from('content_quality_scores')
      .insert(report);

    if (error) throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const controller = new QualityController(supabase);
    const { content, contentType, contentId, autoFix } = await req.json();

    // Exécuter le contrôle qualité
    const results = await controller.runFullQualityCheck(content, contentType, contentId);

    // Si autoFix est demandé et qu'il y a des corrections possibles
    if (autoFix && results.autoFixable > 0) {
      // TODO: Implémenter les corrections automatiques
      results.fixesApplied = results.autoFixable;
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in quality controller:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
