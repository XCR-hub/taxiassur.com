/**
 * Utilitaire pour formater et structurer le contenu des articles d'actualités
 * Optimisé pour le SEO et la lisibilité
 */

export interface FormattedSection {
  type: 'h2' | 'h3' | 'h4' | 'p' | 'ul' | 'ol';
  content: string;
  id?: string;
}

/**
 * Convertit le contenu brut en sections structurées avec hiérarchie de titres
 */
export function parseArticleContent(content: string): FormattedSection[] {
  if (!content) return [];

  const sections: FormattedSection[] = [];

  // Nettoyer le contenu
  const cleanContent = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // Diviser en lignes
  const lines = cleanContent.split('\n');

  let currentParagraph: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      // Ligne vide - finaliser le paragraphe en cours
      if (currentParagraph.length > 0) {
        sections.push({
          type: 'p',
          content: currentParagraph.join(' ')
        });
        currentParagraph = [];
      }
      continue;
    }

    // Détecter les titres markdown-style
    if (line.startsWith('#### ')) {
      // H4
      if (currentParagraph.length > 0) {
        sections.push({
          type: 'p',
          content: currentParagraph.join(' ')
        });
        currentParagraph = [];
      }
      const title = line.replace(/^####\s+/, '').trim();
      sections.push({
        type: 'h4',
        content: title,
        id: slugify(title)
      });
    } else if (line.startsWith('### ')) {
      // H3
      if (currentParagraph.length > 0) {
        sections.push({
          type: 'p',
          content: currentParagraph.join(' ')
        });
        currentParagraph = [];
      }
      const title = line.replace(/^###\s+/, '').trim();
      sections.push({
        type: 'h3',
        content: title,
        id: slugify(title)
      });
    } else if (line.startsWith('## ')) {
      // H2
      if (currentParagraph.length > 0) {
        sections.push({
          type: 'p',
          content: currentParagraph.join(' ')
        });
        currentParagraph = [];
      }
      const title = line.replace(/^##\s+/, '').trim();
      sections.push({
        type: 'h2',
        content: title,
        id: slugify(title)
      });
    } else {
      // Texte normal - ajouter au paragraphe en cours
      currentParagraph.push(line);
    }
  }

  // Finaliser le dernier paragraphe
  if (currentParagraph.length > 0) {
    sections.push({
      type: 'p',
      content: currentParagraph.join(' ')
    });
  }

  return sections;
}

/**
 * Détecte automatiquement les sections dans un texte sans marqueurs
 * et les structure intelligemment
 */
export function autoStructureContent(content: string): FormattedSection[] {
  if (!content) return [];

  // Si le contenu a déjà des marqueurs ##, utiliser le parser standard
  if (content.includes('##')) {
    return parseArticleContent(content);
  }

  const sections: FormattedSection[] = [];

  // Diviser le contenu en phrases
  const sentences = content
    .split(/\.\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let currentSection: string[] = [];
  let sectionCount = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    // Détecter les débuts de section potentiels (phrases avec mots-clés)
    const isNewSection =
      sentence.match(/^(Introduction|Avec|L'un des|Economie|Les avantages|Image de|Les défis|Infrastructure|Autonomie|Coût|Importance|Protection|En conclusion)/i) ||
      (i > 0 && i % 5 === 0); // Créer une section tous les 5 phrases

    if (isNewSection && currentSection.length > 0) {
      // Finaliser la section précédente
      const sectionText = currentSection.join('. ') + '.';

      if (sectionCount === 0) {
        // Premier paragraphe d'introduction
        sections.push({
          type: 'p',
          content: sectionText
        });
      } else {
        // Extraire le premier mot/phrase comme titre
        const firstWords = sentence.split(' ').slice(0, 6).join(' ');
        const title = extractTitleFromText(firstWords);

        sections.push({
          type: sectionCount % 2 === 0 ? 'h2' : 'h3',
          content: title,
          id: slugify(title)
        });

        sections.push({
          type: 'p',
          content: sectionText
        });
      }

      currentSection = [];
      sectionCount++;
    }

    currentSection.push(sentence);
  }

  // Finaliser la dernière section
  if (currentSection.length > 0) {
    sections.push({
      type: 'p',
      content: currentSection.join('. ') + '.'
    });
  }

  return sections;
}

/**
 * Extrait un titre propre depuis un texte
 */
function extractTitleFromText(text: string): string {
  // Retirer les marqueurs ### s'ils existent
  text = text.replace(/^###\s+/, '');

  // Patterns courants de titres
  const patterns = [
    /^(Introduction|Conclusion|Avantages?|Inconvénients?|Les défis?|Infrastructure|Autonomie|Économie|Coût|Protection|Importance)/i,
    /^([A-ZÉÈÊË][a-zàâäéèêëïîôùûü\s]+(?:de|des|du|et)[a-zàâäéèêëïîôùûü\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  // Par défaut, prendre les 8 premiers mots
  return text.split(' ').slice(0, 8).join(' ').replace(/[,;:]$/, '');
}

/**
 * Crée un slug SEO-friendly à partir d'un titre
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Génère le HTML optimisé SEO à partir des sections
 */
export function generateSEOHTML(sections: FormattedSection[]): string {
  return sections
    .map(section => {
      switch (section.type) {
        case 'h2':
          return `<h2 id="${section.id}" class="text-3xl font-bold text-gray-900 mt-12 mb-6 leading-tight scroll-mt-24">${section.content}</h2>`;
        case 'h3':
          return `<h3 id="${section.id}" class="text-2xl font-bold text-gray-900 mt-10 mb-4 leading-tight scroll-mt-24">${section.content}</h3>`;
        case 'h4':
          return `<h4 id="${section.id}" class="text-xl font-bold text-gray-900 mt-8 mb-3 leading-tight scroll-mt-24">${section.content}</h4>`;
        case 'p':
          return `<p class="text-lg text-gray-800 mb-6 leading-relaxed">${section.content}</p>`;
        case 'ul':
          return `<ul class="list-disc list-inside space-y-2 mb-6 text-gray-800">${section.content}</ul>`;
        case 'ol':
          return `<ol class="list-decimal list-inside space-y-2 mb-6 text-gray-800">${section.content}</ol>`;
        default:
          return `<p class="text-lg text-gray-800 mb-6">${section.content}</p>`;
      }
    })
    .join('\n');
}

/**
 * Génère une table des matières à partir des sections
 */
export function generateTableOfContents(sections: FormattedSection[]): { title: string; id: string; level: number }[] {
  return sections
    .filter(s => ['h2', 'h3', 'h4'].includes(s.type) && s.id)
    .map(s => ({
      title: s.content,
      id: s.id!,
      level: parseInt(s.type.replace('h', ''))
    }));
}

/**
 * Fonction principale pour formater un article complet
 */
export function formatArticleForDisplay(content: string): {
  html: string;
  toc: { title: string; id: string; level: number }[];
} {
  const sections = content.includes('##')
    ? parseArticleContent(content)
    : autoStructureContent(content);

  return {
    html: generateSEOHTML(sections),
    toc: generateTableOfContents(sections)
  };
}
