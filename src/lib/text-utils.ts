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
