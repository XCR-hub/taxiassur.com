import React from 'react';

interface ResponsivePictureProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  width?: number;
  height?: number;
}

export default function ResponsivePicture({
  src,
  alt,
  className = '',
  sizes = '100vw',
  loading = 'lazy',
  fetchPriority = 'auto',
  width,
  height,
}: ResponsivePictureProps) {
  const getWebPSrc = (originalSrc: string) => {
    return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  };

  const getAvifSrc = (originalSrc: string) => {
    return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.avif');
  };

  const isImageFormat = /\.(jpg|jpeg|png)$/i.test(src);

  if (!isImageFormat) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        width={width}
        height={height}
      />
    );
  }

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={getAvifSrc(src)}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={getWebPSrc(src)}
        sizes={sizes}
      />
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        fetchPriority={fetchPriority}
        width={width}
        height={height}
        decoding="async"
      />
    </picture>
  );
}

interface ResponsiveBackgroundProps {
  src: string;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveBackground({
  src,
  children,
  className = '',
}: ResponsiveBackgroundProps) {
  const getWebPSrc = (originalSrc: string) => {
    return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  };

  return (
    <div
      className={`relative ${className}`}
      style={{
        backgroundImage: `url(${getWebPSrc(src)}), url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {children}
    </div>
  );
}

interface SrcSetImage {
  src: string;
  width: number;
}

interface ResponsivePictureWithSrcSetProps extends Omit<ResponsivePictureProps, 'src'> {
  images: SrcSetImage[];
  fallbackSrc: string;
}

export function ResponsivePictureWithSrcSet({
  images,
  fallbackSrc,
  alt,
  className = '',
  sizes = '100vw',
  loading = 'lazy',
  fetchPriority = 'auto',
  width,
  height,
}: ResponsivePictureWithSrcSetProps) {
  const generateSrcSet = (images: SrcSetImage[], format?: 'webp' | 'avif') => {
    return images
      .map((img) => {
        let src = img.src;
        if (format === 'webp') {
          src = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        } else if (format === 'avif') {
          src = src.replace(/\.(jpg|jpeg|png)$/i, '.avif');
        }
        return `${src} ${img.width}w`;
      })
      .join(', ');
  };

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={generateSrcSet(images, 'avif')}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={generateSrcSet(images, 'webp')}
        sizes={sizes}
      />
      <source
        srcSet={generateSrcSet(images)}
        sizes={sizes}
      />
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        loading={loading}
        fetchPriority={fetchPriority}
        width={width}
        height={height}
        decoding="async"
      />
    </picture>
  );
}
