import React, { useEffect } from 'react';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
}

const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({ children }) => {
  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      // Preload hero image
      const heroImage = new Image();
      heroImage.src = 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop';

      // Preload fonts
      const fontLink = document.createElement('link');
      fontLink.rel = 'preload';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
      fontLink.as = 'style';
      document.head.appendChild(fontLink);
    };

    // Optimize images on scroll
    const optimizeImagesOnScroll = () => {
      const images = document.querySelectorAll('img[loading="lazy"]');
      
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            
            // Add fade-in animation
            img.style.transition = 'opacity 0.3s ease';
            img.style.opacity = '0';
            
            img.onload = () => {
              img.style.opacity = '1';
            };
            
            imageObserver.unobserve(img);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '50px'
      });

      images.forEach(img => imageObserver.observe(img));
    };

    // Reduce layout shifts
    const preventLayoutShifts = () => {
      // Reserve space for images without dimensions
      const images = document.querySelectorAll('img:not([width]):not([height])');
      images.forEach(img => {
        const element = img as HTMLImageElement;
        if (!element.style.aspectRatio) {
          element.style.aspectRatio = '16/9'; // Default aspect ratio
        }
      });
    };

    // Initialize optimizations
    preloadCriticalResources();
    optimizeImagesOnScroll();
    preventLayoutShifts();

    // Performance monitoring
    const measurePerformance = () => {
      if ('performance' in window) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const paint = performance.getEntriesByType('paint');
            
            const metrics = {
              loadTime: navigation.loadEventEnd - navigation.loadEventStart,
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
              firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
            };

            // Send to analytics if configured
            if (typeof gtag !== 'undefined') {
              gtag('event', 'page_performance', {
                event_category: 'performance',
                load_time: Math.round(metrics.loadTime),
                fcp: Math.round(metrics.firstContentfulPaint)
              });
            }

            console.log('Performance metrics:', metrics);
          }, 1000);
        });
      }
    };

    measurePerformance();

  }, []);

  return <>{children}</>;
};

export default PerformanceOptimizer;