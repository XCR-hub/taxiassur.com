export function stripHtml(html: string): string {
  if (!html) return '';

  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const text = tmp.textContent || tmp.innerText || '';

  return text
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

export function generateExcerpt(content: string, maxLength: number = 150): string {
  const cleanText = stripHtml(content);

  if (cleanText.length <= maxLength) {
    return cleanText;
  }

  const truncated = cleanText.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }

  return truncated + '...';
}

export function extractTextFromGoogleNewsHtml(html: string): string {
  if (!html) return '';

  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const links = tmp.querySelectorAll('a');
  if (links.length > 0) {
    return links[0].textContent || '';
  }

  return stripHtml(html);
}

export function cleanNewsContent(content: string): string {
  if (!content) return '';

  let cleanContent = stripHtml(content);

  cleanContent = cleanContent
    .replace(/^(https?:\/\/[^\s]+)\s*/gi, '')
    .replace(/\[.*?\]/g, '')
    .trim();

  if (cleanContent.length < 50) {
    return "Consultez l'article complet pour découvrir tous les détails de cette actualité importante du secteur de l'assurance taxi.";
  }

  return cleanContent;
}

export function createSmartExcerpt(title: string, content: string): string {
  const cleanContent = cleanNewsContent(content);

  if (cleanContent.length < 50) {
    const category = detectCategory(title);
    return generateDefaultExcerpt(title, category);
  }

  return generateExcerpt(cleanContent, 160);
}

/**
 * Convertit du Markdown simple en HTML bien structuré pour le SEO
 * Supporte : ##, ###, ####, listes, paragraphes, gras, italique, liens
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Échapper les caractères HTML dangereux
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  // Protéger le contenu déjà en HTML
  const htmlBlocks: string[] = [];
  html = html.replace(/<[^>]+>/g, (match) => {
    htmlBlocks.push(match);
    return `__HTML_BLOCK_${htmlBlocks.length - 1}__`;
  });

  // Convertir les titres avec espaces corrects
  // Important SEO: # devient H2 (pas H1 car le titre de la page est déjà H1)
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="text-base font-bold text-gray-900 mt-6 mb-3">$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="text-xl font-bold text-gray-900 mt-8 mb-4">$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-2xl font-bold text-gray-900 mt-10 mb-5">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-3xl font-bold text-gray-900 mt-12 mb-6">$1</h2>');
  // Convertir # en H2 pour le SEO (un seul H1 par page = titre principal)
  html = html.replace(/^#\s+(.+)$/gm, '<h2 class="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b-2 border-amber-500 pb-3">$1</h2>');

  // Listes non ordonnées (- item)
  html = html.replace(/^-\s+(.+)$/gm, '<li class="ml-6 mb-2">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2">.+<\/li>\n?)+/g, (match) => {
    return `<ul class="list-disc space-y-2 my-6 text-gray-700">${match}</ul>`;
  });

  // Listes ordonnées (1. item, 2. item, etc.)
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-6 mb-2">$1</li>');
  html = html.replace(/(<li class="ml-6 mb-2">.+<\/li>\n?)+/g, (match) => {
    if (!match.includes('list-disc')) {
      return `<ol class="list-decimal space-y-2 my-6 text-gray-700">${match}</ol>`;
    }
    return match;
  });

  // Tableaux Markdown
  html = html.replace(/(\|.+\|\n)+/g, (tableMatch) => {
    const rows = tableMatch.trim().split('\n');
    if (rows.length < 2) return tableMatch;

    // La première ligne est l'entête
    const headerRow = rows[0];
    const headers = headerRow.split('|').filter(cell => cell.trim()).map(h => h.trim());

    // La deuxième ligne contient les séparateurs (|---|---|)
    const separatorRow = rows[1];
    if (!separatorRow.includes('---')) return tableMatch;

    // Les lignes suivantes sont les données
    const dataRows = rows.slice(2);

    let tableHtml = '<table class="min-w-full border-collapse my-6"><thead><tr>';
    headers.forEach(header => {
      tableHtml += `<th class="bg-amber-500 text-white font-bold px-4 py-3 text-left border border-amber-600">${header}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    dataRows.forEach((row, index) => {
      const cells = row.split('|').filter(cell => cell.trim()).map(c => c.trim());
      const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      tableHtml += `<tr class="${rowClass}">`;
      cells.forEach(cell => {
        tableHtml += `<td class="px-4 py-3 border border-gray-300 text-gray-700">${cell}</td>`;
      });
      tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';
    return tableHtml;
  });

  // Checkmarks ✓ en vert
  html = html.replace(/✓\s*\*\*([^*]+)\*\*/g, '<span class="text-green-600 font-bold">✓ $1</span>');
  html = html.replace(/✓/g, '<span class="text-green-600 font-bold">✓</span>');

  // Texte en gras (**texte** ou __texte__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong class="font-bold text-gray-900">$1</strong>');

  // Texte en italique (*texte* ou _texte_)
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');

  // Liens [texte](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-amber-600 hover:text-amber-700 underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>');

  // Diviser en paragraphes (lignes séparées par saut de ligne)
  const lines = html.split('\n');
  const paragraphs: string[] = [];
  let currentParagraph = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Si c'est une balise HTML (titre, liste, etc.), flush le paragraphe en cours
    if (trimmedLine.startsWith('<h') || trimmedLine.startsWith('<ul') ||
        trimmedLine.startsWith('<ol') || trimmedLine.startsWith('</ul') ||
        trimmedLine.startsWith('</ol') || trimmedLine.startsWith('<li')) {
      if (currentParagraph.trim()) {
        paragraphs.push(`<p class="text-gray-700 leading-relaxed mb-6">${currentParagraph.trim()}</p>`);
        currentParagraph = '';
      }
      paragraphs.push(trimmedLine);
    } else if (trimmedLine === '') {
      // Ligne vide : flush le paragraphe
      if (currentParagraph.trim()) {
        paragraphs.push(`<p class="text-gray-700 leading-relaxed mb-6">${currentParagraph.trim()}</p>`);
        currentParagraph = '';
      }
    } else {
      // Ajouter au paragraphe en cours
      if (currentParagraph) currentParagraph += ' ';
      currentParagraph += trimmedLine;
    }
  }

  // Flush le dernier paragraphe
  if (currentParagraph.trim()) {
    paragraphs.push(`<p class="text-gray-700 leading-relaxed mb-6">${currentParagraph.trim()}</p>`);
  }

  html = paragraphs.join('\n');

  // Restaurer les blocs HTML protégés
  htmlBlocks.forEach((block, index) => {
    html = html.replace(`__HTML_BLOCK_${index}__`, block);
  });

  return html;
}

function detectCategory(title: string): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('réglementation') || lowerTitle.includes('loi') || lowerTitle.includes('décret')) {
    return 'réglementation';
  }
  if (lowerTitle.includes('prix') || lowerTitle.includes('tarif') || lowerTitle.includes('économie')) {
    return 'économie';
  }
  if (lowerTitle.includes('électrique') || lowerTitle.includes('innovation') || lowerTitle.includes('technologie')) {
    return 'innovation';
  }

  return 'général';
}

function generateDefaultExcerpt(title: string, category: string): string {
  const excerpts: Record<string, string[]> = {
    'réglementation': [
      'Découvrez les dernières évolutions réglementaires qui impactent le secteur de l\'assurance taxi.',
      'Une nouvelle réglementation vient modifier les obligations des chauffeurs de taxi professionnels.',
      'Restez conforme aux nouvelles exigences légales avec cette mise à jour importante.'
    ],
    'économie': [
      'Analyse détaillée des tendances économiques et tarifaires du secteur des taxis.',
      'Comprendre l\'impact économique de cette évolution sur votre activité de taxi.',
      'Les chiffres clés et analyses pour optimiser votre rentabilité.'
    ],
    'innovation': [
      'Les innovations technologiques qui transforment le métier de chauffeur de taxi.',
      'Découvrez les nouvelles solutions pour moderniser votre activité.',
      'L\'avenir du transport professionnel se dessine avec ces avancées majeures.'
    ],
    'général': [
      'Une actualité importante pour tous les professionnels du secteur des taxis.',
      'Restez informé des dernières nouveautés qui concernent votre métier.',
      'Un sujet d\'actualité essentiel pour les chauffeurs de taxi professionnels.'
    ]
  };

  const options = excerpts[category] || excerpts['général'];
  return options[Math.floor(Math.random() * options.length)];
}
