import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface PrefetchOptions {
  enabled?: boolean;
  delay?: number;
  priority?: 'high' | 'low';
}

const prefetchedRoutes = new Set<string>();
const pendingPrefetches = new Map<string, NodeJS.Timeout>();

export function usePrefetch(options: PrefetchOptions = {}) {
  const { enabled = true, delay = 100, priority = 'low' } = options;
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            const href = link.getAttribute('href');

            if (href && !prefetchedRoutes.has(href)) {
              const timeoutId = setTimeout(() => {
                prefetchRoute(href);
                pendingPrefetches.delete(href);
              }, delay);

              pendingPrefetches.set(href, timeoutId);
            }
          } else {
            const link = entry.target as HTMLAnchorElement;
            const href = link.getAttribute('href');

            if (href && pendingPrefetches.has(href)) {
              clearTimeout(pendingPrefetches.get(href)!);
              pendingPrefetches.delete(href);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    const links = document.querySelectorAll('a[data-prefetch]');
    links.forEach((link) => observerRef.current?.observe(link));

    return () => {
      observerRef.current?.disconnect();
      pendingPrefetches.forEach((timeout) => clearTimeout(timeout));
      pendingPrefetches.clear();
    };
  }, [enabled, delay]);

  const prefetchRoute = (path: string) => {
    if (prefetchedRoutes.has(path)) return;

    const link = document.createElement('link');
    link.rel = priority === 'high' ? 'prefetch' : 'dns-prefetch';
    link.href = path;
    link.as = 'document';
    document.head.appendChild(link);

    prefetchedRoutes.add(path);
  };

  const prefetchOnHover = (path: string) => {
    if (prefetchedRoutes.has(path)) return;

    const timeoutId = setTimeout(() => {
      prefetchRoute(path);
    }, delay);

    return () => clearTimeout(timeoutId);
  };

  const prefetchImmediate = (path: string) => {
    prefetchRoute(path);
  };

  return {
    prefetchOnHover,
    prefetchImmediate,
    isPrefetched: (path: string) => prefetchedRoutes.has(path),
  };
}

export function PrefetchLink({
  to,
  children,
  className,
  onMouseEnter,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const { prefetchOnHover } = usePrefetch();
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    cleanupRef.current = prefetchOnHover(to);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  };

  return (
    <a
      href={to}
      className={className}
      data-prefetch
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </a>
  );
}
