import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BlogList from '../components/BlogList';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import StickyCTA from '../components/StickyCTA';
import NewsSection from '../components/NewsSection';
import Newsletter from '../components/Newsletter';
import { useRealStats } from '../hooks/useRealStats';

const Blog: React.FC = () => {
  const { totalArticles, totalFaqs } = useRealStats();
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Blog', url: '/blog' }
  ];

  return (
    <>
      <SEOHead
        title="Blog Assurance Taxi - Conseils, Comparatifs et Actualités Expert | TaxiAssur"
        description="Blog expert assurance taxi : conseils pratiques, comparatifs de garanties, réglementation taxi 2026 et guides pour réduire vos cotisations. Contenu rédigé par des spécialistes."
        canonical="/blog"
        keywords="meilleure assurance taxi pas chere France, assurance taxi comparatif prix conseils, best cheap taxi insurance France, taxi insurance tips pricing France, blog assurance taxi, actualites assurance taxi, conseils expert taxi, guides pratiques taxi, reglementation taxi 2025, optimisation assurance taxi, cheap taxi insurance tips"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-20 overflow-hidden">
            <AITaxiBackground section="hero" intensity="medium" />
            <div className="container-max">
              <div className="max-w-5xl mx-auto text-center relative z-20">
                <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
                  Blog <span className="text-gradient">TaxiAssur</span>
                </h1>
                <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                  📰 <strong className="text-yellow-400">Actualités assurance taxi</strong>,
                  <strong className="text-yellow-500">conseils d'experts</strong> et
                  <strong className="text-green-400">guides pratiques</strong> pour optimiser votre activité professionnelle.
                  <strong className="text-yellow-400">Contenu exclusif</strong> par nos spécialistes.
                </p>
                
                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-8">
                  <div className="ai-card p-4 hover:shadow-yellow-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">{totalArticles || 45}+</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Articles</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-green-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-green-400 drop-shadow-lg">2k+</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Mots/article</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-yellow-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">Expert</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Contenu</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Blog Content */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <BlogList showPagination showFilters />
            </div>
          </section>

          {/* Actualités IA déplacées ici */}
          <NewsSection limit={6} showTitle={true} variant="detailed" />
          
          {/* Newsletter pour engagement */}
          <Newsletter />
        </main>

        <Footer />
        <StickyCTA />
      </div>
    </>
  );
};

export default Blog;