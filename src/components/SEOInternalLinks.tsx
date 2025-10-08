import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { getInternalLinks, getSimilarPages } from '../lib/seo-cluster';

interface SEOInternalLinksProps {
  currentUrl: string;
  variant?: 'sidebar' | 'footer' | 'inline';
  title?: string;
}

const SEOInternalLinks: React.FC<SEOInternalLinksProps> = ({
  currentUrl,
  variant = 'sidebar',
  title = 'Pages connexes'
}) => {
  const internalLinks = getInternalLinks(currentUrl);
  const similarPages = getSimilarPages(currentUrl, 4);

  if (internalLinks.length === 0 && similarPages.length === 0) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <div className="my-8 p-6 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-500/30">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-blue-400" />
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {internalLinks.slice(0, 4).map((link, index) => (
            <Link
              key={index}
              to={link.url}
              className="flex items-center gap-2 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all group"
            >
              <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              <span className="text-sm text-gray-300 group-hover:text-white">
                {link.anchor}
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-white">{title}</h4>
        <ul className="space-y-2">
          {internalLinks.map((link, index) => (
            <li key={index}>
              <Link
                to={link.url}
                className="text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-2 group"
              >
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                {link.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <aside className="space-y-6">
      <div className="ai-card p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-amber-400" />
          {title}
        </h3>
        <ul className="space-y-3">
          {internalLinks.map((link, index) => (
            <li key={index}>
              <Link
                to={link.url}
                className="flex items-start gap-2 text-sm text-gray-300 hover:text-amber-400 transition-colors group"
              >
                <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400 group-hover:translate-x-1 transition-transform" />
                <span>{link.anchor}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {similarPages.length > 0 && (
        <div className="ai-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Voir aussi
          </h3>
          <ul className="space-y-3">
            {similarPages.map((page, index) => (
              <li key={index}>
                <Link
                  to={page.url}
                  className="flex items-start gap-2 text-sm text-gray-300 hover:text-green-400 transition-colors group"
                >
                  <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400 group-hover:translate-x-1 transition-transform" />
                  <span>{page.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
};

export default SEOInternalLinks;
