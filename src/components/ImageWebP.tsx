import React, { useState, useEffect } from 'react';

interface ImageWebPProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
}

/**
 * Composant Image avec support WebP automatique
 * - Détecte support WebP navigateur
 * - Fallback automatique vers format original
 * - Lazy loading natif
 * - Optimisations performance
 */
export const ImageWebP: React.FC<ImageWebPProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  priority = false
}) => {
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null);
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoaded, setIsLoaded] = useState(false);

  // Détecter support WebP
  useEffect(() => {
    const checkWebPSupport = async () => {
      // Check cache localStorage
      const cached = localStorage.getItem('webp-support');
      if (cached !== null) {
        setSupportsWebP(cached === 'true');
        return;
      }

      // Test WebP support
      const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
      const img = new Image();

      img.onload = img.onerror = () => {
        const supported = img.height === 1;
        setSupportsWebP(supported);
        localStorage.setItem('webp-support', String(supported));
      };

      img.src = webpData;
    };

    checkWebPSupport();
  }, []);

  // Générer URL WebP si supporté
  useEffect(() => {
    if (supportsWebP === null) return;

    if (supportsWebP && !src.endsWith('.webp')) {
      // Transformer URL pour version WebP
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');

      // Vérifier si le fichier WebP existe
      const img = new Image();
      img.onload = () => setImageSrc(webpSrc);
      img.onerror = () => setImageSrc(src); // Fallback
      img.src = webpSrc;
    } else {
      setImageSrc(src);
    }
  }, [src, supportsWebP]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Placeholder pendant chargement
  const placeholderStyle = !isLoaded ? {
    backgroundColor: '#f3f4f6',
    minHeight: height || '200px'
  } : {};

  return (
    <picture>
      {supportsWebP && !src.endsWith('.webp') && (
        <source
          srcSet={imageSrc}
          type="image/webp"
        />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        decoding="async"
        onLoad={handleLoad}
        style={placeholderStyle}
      />
    </picture>
  );
};

export default ImageWebP;
