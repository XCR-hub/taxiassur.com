import { useState, useEffect, useRef } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface ImageFormat {
  src: string;
  type: string;
}

interface ImageOptimizedAdvancedProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
}

function generateImageFormats(src: string, quality: number = 80): ImageFormat[] {
  const formats: ImageFormat[] = [];
  const baseSrc = src.replace(/\.[^/.]+$/, '');

  if (supportsWebP()) {
    formats.push({ src: `${baseSrc}.webp?q=${quality}`, type: 'image/webp' });
  }

  if (supportsAvif()) {
    formats.push({ src: `${baseSrc}.avif?q=${quality}`, type: 'image/avif' });
  }

  formats.push({ src, type: 'image/jpeg' });

  return formats;
}

function supportsWebP(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

function supportsAvif(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
}

export function ImageOptimizedAdvanced({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  blurDataURL,
  sizes = '100vw',
  quality = 80,
}: ImageOptimizedAdvancedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(blurDataURL || '');
  const imgRef = useRef<HTMLImageElement>(null);
  const { isIntersecting } = useIntersectionObserver(imgRef, {
    threshold: 0.01,
    rootMargin: '50px',
    freezeOnceVisible: true,
  });

  const shouldLoad = priority || isIntersecting;
  const formats = generateImageFormats(src, quality);

  useEffect(() => {
    if (!shouldLoad) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };

    img.onerror = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
  }, [shouldLoad, src]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
  };

  const imgStyle: React.CSSProperties = {
    transition: 'opacity 0.3s ease-in-out, filter 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0.5,
    filter: isLoaded ? 'none' : 'blur(10px)',
  };

  if (priority) {
    return (
      <picture>
        {formats.map((format, idx) => (
          <source key={idx} srcSet={format.src} type={format.type} sizes={sizes} />
        ))}
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={className}
          width={width}
          height={height}
          style={imgStyle}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    );
  }

  return (
    <div style={containerStyle}>
      {shouldLoad ? (
        <picture>
          {formats.map((format, idx) => (
            <source key={idx} srcSet={format.src} type={format.type} sizes={sizes} />
          ))}
          <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            className={className}
            width={width}
            height={height}
            style={imgStyle}
            loading="lazy"
            decoding="async"
          />
        </picture>
      ) : (
        <div
          ref={imgRef}
          className={className}
          style={{
            width: width || '100%',
            height: height || 'auto',
            backgroundColor: '#f3f4f6',
          }}
        />
      )}
    </div>
  );
}
