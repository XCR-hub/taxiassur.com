import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { formatArticleForDisplay } from '@/lib/article-formatter';
import '@/styles/blog.css';

interface ArticleContentProps {
  content: string;
  showTableOfContents?: boolean;
}

export default function ArticleContent({ content, showTableOfContents = true }: ArticleContentProps) {
  const [formattedContent, setFormattedContent] = useState<{ html: string; toc: any[] }>({ html: '', toc: [] });
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    if (content) {
      const formatted = formatArticleForDisplay(content);
      setFormattedContent(formatted);
    }
  }, [content]);

  useEffect(() => {
    // Observer pour détecter la section active lors du scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-100px 0px -80% 0px'
      }
    );

    // Observer tous les titres
    const headings = document.querySelectorAll('h2[id], h3[id], h4[id]');
    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [formattedContent]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  if (!formattedContent.html) {
    return (
      <div className="text-gray-600">
        <p>Chargement du contenu...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Table des matières - Desktop */}
      {showTableOfContents && formattedContent.toc.length > 0 && (
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24 bg-gradient-to-br from-yellow-50 to-white border border-yellow-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="text-yellow-600" size={20} />
              <h3 className="text-lg font-bold text-gray-900">
                Table des matières
              </h3>
            </div>
            <nav className="space-y-1">
              {formattedContent.toc.map((item, index) => (
                <button
                  key={index}
                  onClick={() => scrollToSection(item.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg transition-all text-sm
                    ${item.level === 2 ? 'font-semibold' : 'font-medium'}
                    ${item.level === 3 ? 'pl-6' : ''}
                    ${item.level === 4 ? 'pl-9' : ''}
                    ${activeSection === item.id
                      ? 'bg-yellow-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-yellow-100 hover:text-yellow-900'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    {item.level === 2 && (
                      <ChevronRight size={16} className={activeSection === item.id ? 'text-white' : 'text-yellow-600'} />
                    )}
                    <span className="line-clamp-2">{item.title}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </aside>
      )}

      {/* Table des matières - Mobile */}
      {showTableOfContents && formattedContent.toc.length > 0 && (
        <div className="lg:hidden mb-8 bg-gradient-to-br from-yellow-50 to-white border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="text-yellow-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900">
              Table des matières
            </h3>
          </div>
          <nav className="space-y-1">
            {formattedContent.toc.map((item, index) => (
              <button
                key={index}
                onClick={() => scrollToSection(item.id)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg transition-all text-sm
                  ${item.level === 2 ? 'font-semibold' : 'font-medium'}
                  ${item.level === 3 ? 'pl-6' : ''}
                  ${item.level === 4 ? 'pl-9' : ''}
                  ${activeSection === item.id
                    ? 'bg-yellow-500 text-white shadow-md'
                    : 'text-gray-700 hover:bg-yellow-100'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  {item.level === 2 && (
                    <ChevronRight size={16} className={activeSection === item.id ? 'text-white' : 'text-yellow-600'} />
                  )}
                  <span className="line-clamp-2">{item.title}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Contenu principal */}
      <div className={showTableOfContents && formattedContent.toc.length > 0 ? 'lg:col-span-9' : 'lg:col-span-12'}>
        <article
          className="
            prose prose-lg max-w-none
            [&>h2]:text-3xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-12 [&>h2]:mb-6 [&>h2]:leading-tight
            [&>h3]:text-2xl [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mt-10 [&>h3]:mb-4 [&>h3]:leading-tight
            [&>h4]:text-xl [&>h4]:font-bold [&>h4]:text-gray-900 [&>h4]:mt-8 [&>h4]:mb-3 [&>h4]:leading-tight
            [&>p]:text-lg [&>p]:text-gray-800 [&>p]:mb-6 [&>p]:leading-relaxed
            [&>ul]:space-y-2 [&>ul]:mb-6 [&>ul]:text-gray-800
            [&>ol]:space-y-2 [&>ol]:mb-6 [&>ol]:text-gray-800
            [&>ul>li]:text-lg [&>ul>li]:text-gray-800
            [&>ol>li]:text-lg [&>ol>li]:text-gray-800
            [&_strong]:font-bold [&_strong]:text-gray-900
            [&_em]:italic
            [&_a]:text-yellow-600 [&_a]:underline [&_a:hover]:text-yellow-700
          "
          dangerouslySetInnerHTML={{ __html: formattedContent.html }}
        />
      </div>
    </div>
  );
}
