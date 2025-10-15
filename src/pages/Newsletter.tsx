import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Newsletter from '../components/Newsletter';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import { Mail, TrendingUp, FileText, Users, Clock, CheckCircle, Star } from 'lucide-react';

const NewsletterPage: React.FC = () => {
  const [stats, setStats] = useState({
    subscribers: 2500,
    articlesPublished: 45,
    averageRating: 4.8
  });

  useEffect(() => {
    // Simulate real-time stats
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        subscribers: prev.subscribers + Math.floor(Math.random() * 3)
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Newsletter', url: '/newsletter' }
  ];

  const recentArticles = [
    {
      title: "Assurance Taxi 2024 : Nouvelles Réglementations",
      excerpt: "Découvrez les changements majeurs qui impactent votre assurance taxi cette année.",
      date: "2024-01-20",
      readTime: "5 min"
    },
    {
      title: "RC Professionnelle Taxi : Guide Complet",
      excerpt: "Tout savoir sur la responsabilité civile professionnelle obligatoire pour les taxis.",
      date: "2024-01-18",
      readTime: "7 min"
    },
    {
      title: "Véhicules Électriques : Nouvelles Opportunités",
      excerpt: "Les avantages et spécificités de l'assurance pour taxis électriques.",
      date: "2024-01-15",
      readTime: "6 min"
    }
  ];

  const newsletterBenefits = [
    {
      icon: TrendingUp,
      title: "Actualités Secteur Taxi",
      description: "Restez informé des évolutions réglementaires, nouvelles technologies et tendances du marché taxi"
    },
    {
      icon: FileText,
      title: "Guides Pratiques Exclusifs",
      description: "Recevez nos dossiers complets : optimisation assurance, gestion sinistres, conseils d'experts"
    },
    {
      icon: Users,
      title: "Conseils Personnalisés",
      description: "Bénéficiez de recommandations adaptées à votre profil et votre zone d'activité"
    },
    {
      icon: Clock,
      title: "Veille Réglementaire",
      description: "Anticipez les changements : nouvelles obligations, délais, démarches administratives"
    }
  ];

  return (
    <>
      <SEOHead
        title="Newsletter Assurance Taxi - Actualités et Conseils Experts"
        description="Abonnez-vous à la newsletter TaxiAssur : actualités assurance taxi, conseils d'experts, guides pratiques. +2500 professionnels abonnés. Gratuit."
        canonical="/newsletter"
        keywords="newsletter assurance taxi, actualités taxi, conseils assurance, guides pratiques taxi"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />

      <div className="min-h-screen bg-white">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-orange-900 to-yellow-900 text-white py-20">
            <div className="container-max">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Newsletter <span className="text-gradient">Assurance Taxi</span>
                </h1>
                <p className="text-xl text-yellow-100 mb-8">
                  Restez informé des actualités assurance taxi, recevez nos conseils d'experts 
                  et bénéficiez d'offres exclusives. Gratuit et sans spam.
                </p>
                
                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-300">{stats.subscribers.toLocaleString()}</div>
                    <div className="text-sm text-yellow-200">Abonnés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-300">{stats.articlesPublished}</div>
                    <div className="text-sm text-yellow-200">Articles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-300">{stats.averageRating}/5</div>
                    <div className="text-sm text-yellow-200">Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Newsletter Subscription */}
          <Newsletter />

          {/* Benefits */}
          <section className="section-padding bg-white border border-yellow-100">
            <div className="container-max">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 font-semibold mb-12 text-center">
                  Pourquoi S'Abonner à Notre Newsletter ?
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {newsletterBenefits.map((benefit, index) => {
                    const IconComponent = benefit.icon;
                    return (
                      <div key={index} className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl mb-4 shadow-lg">
                          <IconComponent className="text-white" size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 font-semibold mb-3">
                          {benefit.title}
                        </h3>
                        <p className="text-gray-600">
                          {benefit.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Recent Articles Preview */}
          <section className="section-padding">
            <div className="container-max">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 font-semibold mb-8 text-center">
                  Derniers Articles Newsletter
                </h2>
                
                <div className="space-y-6">
                  {recentArticles.map((article, index) => (
                    <div key={index} className="bg-white border border-yellow-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-900 font-semibold flex-1">
                          {article.title}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 ml-4">
                          <Clock size={14} />
                          <span>{article.readTime}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {new Date(article.date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-yellow-600 hover:text-yellow-700 font-medium text-sm">
                          Lire l'article →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="section-padding bg-gradient-to-br from-amber-50 to-yellow-50">
            <div className="container-max">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl font-bold text-gray-900 font-semibold mb-8">
                  Ce que Disent Nos Abonnés
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex justify-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="text-yellow-400 fill-current" size={20} />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-4 italic">
                      "Newsletter indispensable ! Grâce aux conseils TaxiAssur, j'ai optimisé 
                      mon assurance et économisé 650€. Contenu de qualité, toujours utile."
                    </p>
                    <div className="text-sm text-gray-600">
                      <p className="font-semibold">Pierre M.</p>
                      <p>Chauffeur taxi Paris • Abonné depuis 2 ans</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex justify-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="text-yellow-400 fill-current" size={20} />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-4 italic">
                      "Enfin une newsletter qui comprend les vrais enjeux taxi ! 
                      Actualités pertinentes, conseils pratiques. Je recommande à tous mes collègues."
                    </p>
                    <div className="text-sm text-gray-600">
                      <p className="font-semibold">Fatima R.</p>
                      <p>Gérante flotte taxi Lyon • Abonnée depuis 1 an</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default NewsletterPage;