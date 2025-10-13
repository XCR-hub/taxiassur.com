/**
 * Générateur d'images AI optimisées SEO pour articles
 * Utilise Unsplash API (gratuit) pour des images de qualité
 */

const UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY'; // À configurer dans .env

interface ImageOptions {
  query: string;
  width?: number;
  height?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
}

interface GeneratedImage {
  url: string;
  downloadUrl: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  optimizedForSEO: boolean;
}

/**
 * Génère une URL d'image optimisée via Unsplash
 * Alternative gratuite et légale sans besoin d'API DALL-E / Midjourney
 */
export async function generateImageForArticle(
  articleTitle: string,
  keywords: string[]
): Promise<GeneratedImage | null> {
  try {
    // Extraire les mots-clés pertinents pour la recherche d'image
    const searchQuery = extractImageQuery(articleTitle, keywords);

    // Option 1: Utiliser Unsplash (GRATUIT, haute qualité)
    if (UNSPLASH_ACCESS_KEY && UNSPLASH_ACCESS_KEY !== 'YOUR_UNSPLASH_ACCESS_KEY') {
      return await fetchUnsplashImage(searchQuery);
    }

    // Option 2: Générer URL Unsplash sans API (toujours légal)
    return generateUnsplashSourceURL(searchQuery);

  } catch (error) {
    console.error('Erreur génération image:', error);
    return generateFallbackImage(searchQuery);
  }
}

/**
 * Extrait les mots-clés pertinents pour recherche d'image
 */
function extractImageQuery(title: string, keywords: string[]): string {
  // Mots-clés prioritaires pour images
  const imageKeywords = [
    'taxi', 'voiture', 'transport', 'ville', 'route', 'conducteur',
    'assurance', 'véhicule', 'chauffeur', 'urbain'
  ];

  // Trouver le premier mot-clé pertinent
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (imageKeywords.some(ik => lowerKeyword.includes(ik))) {
      return lowerKeyword;
    }
  }

  // Par défaut : extraire ville du titre si présente
  const cityMatch = title.match(/(?:à|en|de|dans)\s+([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:-[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)*)/);
  if (cityMatch) {
    return `taxi ${cityMatch[1].toLowerCase()}`;
  }

  // Fallback
  return 'taxi professionnel';
}

/**
 * Récupère une image via API Unsplash (nécessite clé API)
 */
async function fetchUnsplashImage(query: string): Promise<GeneratedImage> {
  const response = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
    {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Unsplash API error');
  }

  const data = await response.json();

  return {
    url: `${data.urls.regular}&w=1200&h=630&fit=crop`, // Optimisé pour OpenGraph
    downloadUrl: data.links.download_location,
    alt: `${data.alt_description || query} - Photo par ${data.user.name}`,
    photographer: data.user.name,
    photographerUrl: data.user.links.html,
    optimizedForSEO: true
  };
}

/**
 * Génère URL Unsplash Source (sans API, toujours légal)
 * Utilise Unsplash Source qui est gratuit et sans limitation
 */
function generateUnsplashSourceURL(query: string): GeneratedImage {
  // Unsplash Source : https://source.unsplash.com/
  // Dimensions optimales SEO : 1200x630 (OpenGraph standard)
  const width = 1200;
  const height = 630;

  const url = `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(query)}`;

  return {
    url,
    downloadUrl: url,
    alt: `Image illustrant ${query} - Assurance taxi professionnelle`,
    photographer: 'Unsplash Contributors',
    photographerUrl: 'https://unsplash.com',
    optimizedForSEO: true
  };
}

/**
 * Image de fallback si échec
 */
function generateFallbackImage(query: string): GeneratedImage {
  // Utiliser image par défaut du projet
  return {
    url: '/logo-600x300.png',
    downloadUrl: '/logo-600x300.png',
    alt: `TaxiAssur - ${query}`,
    photographer: 'TaxiAssur',
    photographerUrl: 'https://taxiassur.com',
    optimizedForSEO: false
  };
}

/**
 * Génère attributs SEO optimaux pour balise <img>
 */
export function generateImageSEOAttributes(
  image: GeneratedImage,
  articleTitle: string
): {
  src: string;
  alt: string;
  title: string;
  loading: 'lazy' | 'eager';
  decoding: 'async';
  width: number;
  height: number;
} {
  return {
    src: image.url,
    alt: image.alt || `Illustration pour ${articleTitle}`,
    title: articleTitle,
    loading: 'lazy',
    decoding: 'async',
    width: 1200,
    height: 630
  };
}

/**
 * Génère HTML d'image optimisée avec crédit photographe
 */
export function generateImageHTML(
  image: GeneratedImage,
  articleTitle: string
): string {
  const attrs = generateImageSEOAttributes(image, articleTitle);

  return `<figure class="article-image">
  <img
    src="${attrs.src}"
    alt="${attrs.alt}"
    title="${attrs.title}"
    loading="${attrs.loading}"
    decoding="${attrs.decoding}"
    width="${attrs.width}"
    height="${attrs.height}"
    class="w-full h-auto rounded-lg shadow-lg"
  />
  ${image.photographer !== 'TaxiAssur' ? `
  <figcaption class="text-sm text-gray-600 mt-2 text-center">
    Photo par <a href="${image.photographerUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${image.photographer}</a>
  </figcaption>
  ` : ''}
</figure>`;
}

/**
 * Génère balises meta OpenGraph pour image
 */
export function generateOpenGraphImageMeta(image: GeneratedImage): string {
  return `<meta property="og:image" content="${image.url}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${image.alt}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${image.url}" />`;
}

/**
 * Alternative: Génère image placeholder avec texte (CSS pure)
 * Utile comme fallback absolu
 */
export function generatePlaceholderImageURL(text: string): string {
  // Utilise un service de placeholder gratuit
  const encodedText = encodeURIComponent(text);
  return `https://via.placeholder.com/1200x630/1e40af/ffffff?text=${encodedText}`;
}

/**
 * Vérifie si une URL d'image est valide
 */
export async function validateImageURL(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Optimise URL d'image (compression, format moderne)
 */
export function optimizeImageURL(url: string): string {
  // Si Unsplash, ajouter paramètres d'optimisation
  if (url.includes('unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}auto=format&fit=crop&w=1200&h=630&q=80`;
  }

  return url;
}

/**
 * Exemple d'utilisation
 */
export async function integrateImageInArticle(
  content: string,
  title: string,
  keywords: string[]
): Promise<string> {
  // Générer l'image
  const image = await generateImageForArticle(title, keywords);

  if (!image) {
    return content; // Pas d'image, retourner contenu original
  }

  // Générer HTML optimisé
  const imageHTML = generateImageHTML(image, title);

  // Insérer après le premier <h2> ou au début
  if (content.includes('<h2>')) {
    return content.replace('<h2>', `${imageHTML}\n\n<h2>`);
  } else {
    return `${imageHTML}\n\n${content}`;
  }
}
