/**
 * Système Anti-Détection IA pour Google
 *
 * Humanise le contenu généré par IA pour éviter la détection
 * et améliorer l'indexation Google
 */

// Patterns d'humanisation
const HUMAN_TRANSITIONS = [
  "En fait,", "D'ailleurs,", "Notamment,", "Par exemple,", "En effet,",
  "Cependant,", "Toutefois,", "Néanmoins,", "D'autre part,", "En revanche,",
  "À ce propos,", "D'une manière générale,", "Pour être précis,", "Concrètement,"
];

const HUMAN_CONNECTORS = [
  "qui permet de", "ce qui signifie que", "dans le but de", "afin de",
  "pour cette raison", "c'est pourquoi", "de ce fait", "en conséquence"
];

const HUMAN_EXPRESSIONS = [
  "il faut savoir que", "sachez que", "notez bien que", "retenez que",
  "gardez à l'esprit que", "n'oubliez pas que", "pensez à", "prenez en compte"
];

// Erreurs naturelles intentionnelles (mineures)
const NATURAL_TYPOS = {
  "évenement": "événement",
  "dévelopement": "développement",
  "déveloper": "développer",
  // Ces erreurs sont corrigées 95% du temps, 5% laissées pour paraître humain
};

// Styles d'écriture variés
export const WRITING_STYLES = [
  {
    name: "professionnel",
    tone: "formal",
    vocabulary: "expert",
    sentenceLength: "long",
    emoji: 0
  },
  {
    name: "accessible",
    tone: "friendly",
    vocabulary: "simple",
    sentenceLength: "medium",
    emoji: 1
  },
  {
    name: "expert",
    tone: "authoritative",
    vocabulary: "technical",
    sentenceLength: "long",
    emoji: 0
  },
  {
    name: "conversationnel",
    tone: "casual",
    vocabulary: "everyday",
    sentenceLength: "short",
    emoji: 2
  },
  {
    name: "pédagogique",
    tone: "educational",
    vocabulary: "clear",
    sentenceLength: "medium",
    emoji: 1
  }
];

interface HumanizationConfig {
  addTransitions: boolean;
  addTypos: boolean;
  varyStructure: boolean;
  addEmojis: boolean;
  styleIndex: number;
  errorRate: number; // 0-5% (0.00-0.05)
}

/**
 * Génère une configuration de variabilité aléatoire
 */
export function generateVariabilityConfig(): HumanizationConfig {
  return {
    addTransitions: Math.random() > 0.3, // 70% du temps
    addTypos: Math.random() > 0.95, // 5% du temps (très rare)
    varyStructure: true,
    addEmojis: Math.random() > 0.6, // 40% du temps
    styleIndex: Math.floor(Math.random() * WRITING_STYLES.length),
    errorRate: Math.random() * 0.05 // 0-5%
  };
}

/**
 * Ajoute des transitions naturelles dans le texte
 */
export function addHumanTransitions(content: string, rate: number = 0.3): string {
  const paragraphs = content.split('\n\n');

  return paragraphs.map((para, index) => {
    // Ne pas modifier les titres
    if (para.startsWith('#') || para.startsWith('<h')) {
      return para;
    }

    // Ajouter une transition aléatoire au début de certains paragraphes
    if (Math.random() < rate && index > 0) {
      const transition = HUMAN_TRANSITIONS[Math.floor(Math.random() * HUMAN_TRANSITIONS.length)];
      return `${transition} ${para.charAt(0).toLowerCase()}${para.slice(1)}`;
    }

    return para;
  }).join('\n\n');
}

/**
 * Varie la longueur des phrases
 */
export function varyContentLength(baseLength: number): number {
  // Variation de -300 à +500 mots
  const variation = Math.floor(Math.random() * 800) - 300;
  return Math.max(1500, baseLength + variation);
}

/**
 * Ajoute des connecteurs naturels
 */
export function addNaturalConnectors(content: string): string {
  // Remplace certains connecteurs basiques par des versions plus naturelles
  let humanized = content;

  const replacements = [
    { basic: "Cela permet de", natural: HUMAN_CONNECTORS },
    { basic: "Il est important de", natural: HUMAN_EXPRESSIONS },
    { basic: "Vous devez", natural: ["il faut", "pensez à", "n'oubliez pas de"] }
  ];

  replacements.forEach(({ basic, natural }) => {
    if (humanized.includes(basic) && Math.random() > 0.5) {
      const replacement = natural[Math.floor(Math.random() * natural.length)];
      humanized = humanized.replace(basic, replacement);
    }
  });

  return humanized;
}

/**
 * Ajoute des emojis de manière naturelle (pas systématique)
 */
export function addNaturalEmojis(content: string, count: number = 0): string {
  if (count === 0) return content;

  const emojis = ['✅', '📝', '💡', '⚠️', '👉', '🔍', '💰', '📊', '🎯', '⏰'];
  const paragraphs = content.split('\n\n');

  let emojiCount = 0;
  const maxEmojis = Math.min(count, 3);

  return paragraphs.map((para, index) => {
    // Ajouter emoji uniquement dans certains paragraphes
    if (emojiCount < maxEmojis && Math.random() > 0.7 && !para.startsWith('#')) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      emojiCount++;

      // Ajouter au début ou dans le texte
      if (Math.random() > 0.5) {
        return `${emoji} ${para}`;
      } else {
        const sentences = para.split('. ');
        if (sentences.length > 1) {
          const insertIndex = Math.floor(Math.random() * sentences.length);
          sentences[insertIndex] = `${emoji} ${sentences[insertIndex]}`;
          return sentences.join('. ');
        }
      }
    }
    return para;
  }).join('\n\n');
}

/**
 * Génère un timestamp de publication naturel
 * Entre 6h et 23h, avec espacement 2-8 heures
 */
export function generateNaturalPublishTime(lastPublish?: Date): Date {
  const now = new Date();

  if (!lastPublish) {
    // Première publication : aujourd'hui entre 6h-23h
    const hour = 6 + Math.floor(Math.random() * 17); // 6-22h
    const minute = Math.floor(Math.random() * 60);
    now.setHours(hour, minute, 0, 0);
    return now;
  }

  // Prochaine publication : 2-8 heures après la dernière
  const hoursDelay = 2 + Math.floor(Math.random() * 6); // 2-8h
  const nextPublish = new Date(lastPublish.getTime() + hoursDelay * 60 * 60 * 1000);

  // S'assurer que c'est entre 6h-23h
  const hour = nextPublish.getHours();
  if (hour < 6) {
    nextPublish.setHours(6 + Math.floor(Math.random() * 3)); // 6-9h
  } else if (hour > 23) {
    nextPublish.setDate(nextPublish.getDate() + 1);
    nextPublish.setHours(6 + Math.floor(Math.random() * 4)); // 6-10h lendemain
  }

  return nextPublish;
}

/**
 * Varie la structure du contenu
 */
export function varyContentStructure(content: string): string {
  // Alterne entre différentes structures
  const structures = [
    'h2-list-h2-text',
    'h2-text-h3-list',
    'h2-text-table-h2',
    'h2-text-h3-text'
  ];

  // Cette fonction serait appelée lors de la génération
  // Elle influence le prompt envoyé à l'IA
  return content;
}

/**
 * Fonction principale : Humanise le contenu généré par IA
 */
export function humanizeContent(
  content: string,
  config: HumanizationConfig
): string {
  let humanized = content;

  // 1. Ajouter transitions naturelles
  if (config.addTransitions) {
    humanized = addHumanTransitions(humanized);
  }

  // 2. Ajouter connecteurs naturels
  humanized = addNaturalConnectors(humanized);

  // 3. Ajouter emojis (si configuré)
  if (config.addEmojis) {
    const emojiCount = WRITING_STYLES[config.styleIndex].emoji;
    humanized = addNaturalEmojis(humanized, emojiCount);
  }

  // 4. Ajouter erreurs mineures (très rare)
  if (config.addTypos && Math.random() < config.errorRate) {
    // Laisser 1-2 erreurs mineures intentionnelles (5% du temps)
    // En production, on pourrait même ne pas corriger certaines fautes courantes
  }

  return humanized;
}

/**
 * Génère un prompt optimisé pour éviter la détection IA
 */
export function generateAntiAIPrompt(
  keyword: string,
  city: string,
  style: typeof WRITING_STYLES[0]
): string {
  const styleInstructions = {
    professionnel: "Adopte un ton professionnel et formel. Utilise un vocabulaire expert.",
    accessible: "Écris de manière accessible et amicale. Utilise des mots simples.",
    expert: "Écris comme un expert du domaine. Utilise des termes techniques précis.",
    conversationnel: "Adopte un ton conversationnel et décontracté. Phrases courtes.",
    pédagogique: "Écris de manière pédagogique et claire. Explique chaque concept."
  };

  return `Tu es un rédacteur professionnel spécialisé en assurance taxi.

IMPÉRATIF : Écris comme un HUMAIN, pas comme une IA !

Style d'écriture : ${style.name}
${styleInstructions[style.name as keyof typeof styleInstructions]}

RÈGLES D'HUMANISATION :
1. Varie la longueur des phrases (courtes ET longues)
2. Utilise des transitions naturelles ("En fait", "D'ailleurs", "Notamment")
3. Ajoute des expressions humaines ("il faut savoir que", "notez bien que")
4. Varie la structure (ne suis PAS un template rigide)
5. Inclus des exemples concrets et des chiffres précis
6. Utilise le "vous" de manière naturelle
7. Ajoute des nuances ("généralement", "souvent", "dans la plupart des cas")

Sujet : ${keyword} à ${city}

Écris un article UNIQUE, personnel, qui ressemble à un article écrit par un humain.
Ne suis PAS un template IA. Varie ta structure. Sois naturel.`;
}

/**
 * Calcule un score de "naturalité" du contenu (0-100)
 */
export function calculateNaturalnessScore(content: string): number {
  let score = 50; // Base

  // +10 si contient des transitions naturelles
  const hasTransitions = HUMAN_TRANSITIONS.some(t => content.includes(t));
  if (hasTransitions) score += 10;

  // +10 si contient des connecteurs naturels
  const hasConnectors = HUMAN_CONNECTORS.some(c => content.includes(c));
  if (hasConnectors) score += 10;

  // +10 si longueur variée (pas exactement 2000 mots)
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 1900 || wordCount > 2100) score += 10;

  // +10 si contient des chiffres précis
  const hasPreciseNumbers = /\d{2,4}/.test(content);
  if (hasPreciseNumbers) score += 10;

  // +10 si contient des exemples concrets
  const hasExamples = /par exemple|notamment|tel que|comme/i.test(content);
  if (hasExamples) score += 10;

  return Math.min(100, score);
}

export default {
  generateVariabilityConfig,
  humanizeContent,
  generateAntiAIPrompt,
  generateNaturalPublishTime,
  varyContentLength,
  calculateNaturalnessScore,
  WRITING_STYLES
};
