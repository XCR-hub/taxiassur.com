import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ExternalLink, Zap, TrendingUp, Sparkles, Bot, ArrowRight } from 'lucide-react';
import { ProcessedNews } from '../lib/newsAggregator';
import { formatDate, truncateText } from '../lib/utils';
import Card from './Card';

interface NewsSectionProps {
  limit?: number;
  showTitle?: boolean;
  variant?: 'compact' | 'detailed' | 'ticker';
}

const NewsSection: React.FC<NewsSectionProps> = ({ 
  limit = 6, 
  showTitle = true,
  variant = 'compact'
}) => {
  const [news, setNews] = useState<ProcessedNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadNews();
    
    // Auto-refresh every 30 minutes
    const interval = setInterval(loadNews, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (variant === 'ticker' && news.length > 1) {
      const ticker = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % news.length);
      }, 5000);
      return () => clearInterval(ticker);
    }
  }, [news.length, variant]);

  const loadNews = async () => {
    try {
      const response = await fetch('/content/processed-news.json');
      if (response.ok) {
        const data = await response.json();
        const processedNews = Array.isArray(data) ? data : [];
        
        // Filter published news and sort by date
        const publishedNews = processedNews
          .filter((item: any) => item.status === 'published')
          .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, limit);
        
        setNews(publishedNews);
      }
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <Card className="text-center py-8">
        <TrendingUp className="mx-auto mb-4 text-gray-600" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Actualités en cours de chargement
        </h3>
        <p className="text-gray-600">
          Notre système de veille prépare les dernières actualités taxi
        </p>
      </Card>
    );
  }

  if (variant === 'ticker') {
    const currentNews = news[currentIndex];
    return (
      <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-xl p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
            <span className="text-sm font-bold text-amber-600 drop-shadow-md">🤖 ACTUALITÉ IA</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm drop-shadow-sm">
              {currentNews.synthesizedTitle}
            </h4>
          </div>
          <div className="text-xs text-gray-600">
            {formatDate(currentNews.publishedAt)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                <Bot className="text-black" size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">🤖 Actualités IA Taxi</h3>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-500 via-yellow-500 to-transparent"></div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">Synthèse automatique</span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map(item => (
            <Card key={item.id} hover className="group relative overflow-hidden">
              {/* AI Badge */}
              <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                🤖 IA
              </div>
              
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full shadow-lg animate-pulse"></div>
                <span className="text-xs text-amber-600 font-bold uppercase tracking-wide">
                  {item.taxiAngle.split(' ')[0]}
                </span>
                <span className="text-xs text-gray-600">
                  {formatDate(item.publishedAt)}
                </span>
              </div>
              
              <h4 className="font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors leading-tight">
                {item.synthesizedTitle}
              </h4>
              
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {truncateText(item.synthesizedContent.replace(/<[^>]*>/g, ''), 100)}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-1">
                  {item.seoKeywords.slice(0, 2).map(keyword => (
                    <span key={keyword} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                      {keyword}
                    </span>
                  ))}
                </div>
                <div className="flex items-center space-x-1 text-gray-600 group-hover:text-amber-500 transition-colors">
                  <span className="text-xs">Lire</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Detailed variant
  return (
    <section className="section-padding bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Enhanced AI Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent animate-pulse" style={{animationDelay: '1s'}}></div>
        
        {/* AI Grid Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5">
          <div className="grid grid-cols-12 gap-1 h-full opacity-30">
            {[...Array(144)].map((_, i) => (
              <div 
                key={i} 
                className="bg-amber-400 rounded-full animate-pulse" 
                style={{ 
                  animationDelay: `${i * 0.05}s`,
                  width: '2px',
                  height: '2px',
                  margin: 'auto'
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="container-max relative z-10">
        <div className="space-y-8">
          {showTitle && (
            <div className="text-center mb-16">
              {/* Enhanced AI Header */}
              <div className="relative inline-flex items-center space-x-4 mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-2xl blur-xl animate-pulse"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300">
                  <Bot className="text-black" size={24} />
                </div>
                <div className="relative">
                  <h2 className="text-4xl font-bold text-gray-900 drop-shadow-lg">
                    Actualités <span className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent">IA Taxi</span>
                  </h2>
                  <div className="absolute -top-2 -right-8 w-6 h-6 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles className="text-black animate-pulse" size={12} />
                  </div>
                </div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300">
                  <Zap className="text-black animate-pulse" size={24} />
                </div>
              </div>
              
              <div className="max-w-3xl mx-auto">
                <p className="text-xl text-gray-700 mb-6 leading-relaxed">
                  🤖 Notre <strong className="text-amber-600">Intelligence Artificielle</strong> surveille et synthétise automatiquement 
                  les actualités taxi pour vous tenir informé des évolutions importantes du secteur
                </p>
                
                {/* AI Status Indicators */}
                <div className="flex justify-center items-center space-x-6 mb-8">
                  <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full shadow-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold">Système Actif</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full shadow-lg">
                    <TrendingUp size={14} />
                    <span className="text-sm font-semibold">5 Sources</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full shadow-lg">
                    <Sparkles size={14} />
                    <span className="text-sm font-semibold">Synthèse Auto</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-8">
            {news.map(item => (
              <Card key={item.id} hover className="p-8 relative overflow-hidden group bg-white/95 backdrop-blur-lg shadow-2xl border border-gray-200/60 hover:border-amber-500/40 hover:shadow-amber-500/20">
                {/* Enhanced AI Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
                {/* Enhanced AI Badge */}
                <div className="absolute top-6 right-6 bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center space-x-2 transform group-hover:scale-110 transition-all duration-300 z-20">
                  <Bot size={14} className="animate-pulse" />
                  <span>Synthèse IA</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="flex items-center space-x-4">
                    <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full animate-pulse shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                    </div>
                    <span className="text-sm font-bold text-amber-800 uppercase tracking-wider bg-amber-100 group-hover:bg-amber-200 px-3 py-1 rounded-full shadow-lg transition-colors">
                      {item.taxiAngle}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <Calendar size={16} className="text-gray-600" />
                    <span className="font-medium group-hover:text-gray-700 transition-colors">{formatDate(item.publishedAt)}</span>
                  </div>
                </div>
              
                <h3 className="font-bold text-gray-900 mb-3 group-hover:text-amber-700 transition-colors leading-tight">
                  {item.synthesizedTitle}
                </h3>
              
                <div 
                  className="text-gray-700 group-hover:text-gray-800 mb-8 prose prose-lg max-w-none leading-relaxed relative z-10 transition-colors"
                  dangerouslySetInnerHTML={{ 
                    __html: truncateText(item.synthesizedContent, 400) 
                  }}
                />
              
                <div className="flex items-center justify-between pt-6 border-t border-gray-200 relative z-10">
                  <div className="flex flex-wrap gap-3">
                    {item.seoKeywords.slice(0, 4).map(keyword => (
                      <span key={keyword} className="px-4 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 group-hover:from-amber-200 group-hover:to-yellow-200 text-amber-800 group-hover:text-amber-900 text-sm rounded-full font-semibold shadow-lg transition-all duration-300">
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 bg-purple-100 group-hover:bg-purple-200 text-purple-700 group-hover:text-purple-800 px-3 py-1 rounded-full shadow-lg transition-colors">
                    <Sparkles size={14} className="text-purple-500 animate-pulse" />
                    <span className="font-bold">IA</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;