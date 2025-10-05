import React from 'react';
import LazyImage from './LazyImage';

interface ImageOptimizedProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
}

const ImageOptimized: React.FC<ImageOptimizedProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  sizes
}) => {
  // Generate optimized Pexels URLs if it's a Pexels image
  const generatePexelsUrls = (originalSrc: string, targetWidth?: number) => {
    if (!originalSrc.includes('pexels.com')) {
      return { webp: null, optimized: originalSrc };
    }

    const baseUrl = originalSrc.split('?')[0];
    const params = new URLSearchParams();
    
    if (targetWidth) {
      params.set('w', targetWidth.toString());
    }
    params.set('auto', 'compress');
    params.set('cs', 'tinysrgb');
    params.set('fit', 'crop');

    const optimized = `${baseUrl}?${params.toString()}`;
    const webp = `${baseUrl}?${params.toString()}&fm=webp`;

    return { webp, optimized };
  };

  const { webp, optimized } = generatePexelsUrls(src, width);

  // For critical images (priority), render immediately without lazy loading
  if (priority) {
    return (
      <picture className={className}>
        {webp && <source srcSet={webp} type="image/webp" />}
        <img
          src={optimized}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          className="w-full h-full object-cover"
          style={{
            width: width ? `${width}px` : undefined,
            height: height ? `${height}px` : undefined
          }}
        />
      </picture>
    );
  }

  // For non-critical images, use lazy loading
  return (
    <LazyImage
      src={optimized}
      webpSrc={webp || undefined}
      alt={alt}
      className={className}
      width={width}
      height={height}
    />
  );
};

export default ImageOptimized;