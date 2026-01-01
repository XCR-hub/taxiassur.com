import { useEffect } from 'react';

interface ResourceHint {
  rel: 'dns-prefetch' | 'preconnect' | 'prefetch' | 'preload' | 'modulepreload';
  href: string;
  as?: string;
  type?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

const defaultHints: ResourceHint[] = [
  { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
  { rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com', crossOrigin: 'anonymous' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  { rel: 'dns-prefetch', href: process.env.VITE_SUPABASE_URL || '' },
  { rel: 'preconnect', href: process.env.VITE_SUPABASE_URL || '', crossOrigin: 'anonymous' },
];

export function ResourceHints({ additionalHints = [] }: { additionalHints?: ResourceHint[] }) {
  useEffect(() => {
    const hints = [...defaultHints, ...additionalHints].filter(hint => hint.href);

    hints.forEach((hint) => {
      const existing = document.querySelector(
        `link[rel="${hint.rel}"][href="${hint.href}"]`
      );

      if (!existing) {
        const link = document.createElement('link');
        link.rel = hint.rel;
        link.href = hint.href;

        if (hint.as) link.setAttribute('as', hint.as);
        if (hint.type) link.setAttribute('type', hint.type);
        if (hint.crossOrigin) link.setAttribute('crossorigin', hint.crossOrigin);

        document.head.appendChild(link);
      }
    });
  }, [additionalHints]);

  return null;
}

export function FontPreload() {
  useEffect(() => {
    const fonts = [
      { href: '/fonts/inter-var.woff2', type: 'font/woff2' },
    ];

    fonts.forEach((font) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = font.type;
      link.href = font.href;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }, []);

  return null;
}
