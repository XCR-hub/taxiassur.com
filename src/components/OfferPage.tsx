import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Phone, Mail } from 'lucide-react';
import { Offer } from '../lib/schema';
import { getOffer } from '../lib/content';
import Seo from './Seo';
import JsonLd from './JsonLd';
import LeadForm from './LeadForm';

const OfferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOffer = async () => {
      if (!id) {
        setError('ID de l\'offre manquant');
        setLoading(false);
        return;
      }

      try {
        const offerData = await getOffer(id);
        if (offerData) {
          setOffer(offerData);
        } else {
          setError('Offre non trouvée');
        }
      } catch (err) {
        console.error('Failed to load offer:', err);
        setError('Erreur lors du chargement de l\'offre');
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded mb-8"></div>
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {error || 'Offre non trouvée'}
            </h1>
            <p className="text-gray-600 mb-8">
              L'offre que vous recherchez n'existe pas ou a été supprimée.
            </p>
            <Link
              to="/offres"
              className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-6 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Voir toutes les offres</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Offres', url: '/offres' },
    { name: offer.title, url: `/offres/${offer.id}` }
  ];

  return (
    <>
      <Seo
        title={offer.title}
        description={offer.body.replace(/<[^>]*>/g, '').substring(0, 160)}
        canonical={`/offres/${offer.id}`}
        keywords="assurance taxi, devis gratuit, couverture professionnelle"
      />
      <JsonLd type="product" data={offer} />
      <JsonLd type="breadcrumb" data={breadcrumbs} />

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-gray-900 to-black text-white py-20">
          <div className="container-max">
            <div className="max-w-4xl mx-auto">
              {/* Breadcrumb */}
              <nav className="mb-8">
                <ol className="flex items-center space-x-2 text-sm text-gray-300">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.url} className="flex items-center">
                      {index > 0 && <span className="mx-2">/</span>}
                      {index === breadcrumbs.length - 1 ? (
                        <span className="text-white font-medium">{crumb.name}</span>
                      ) : (
                        <Link to={crumb.url} className="hover:text-amber-400 transition-colors">
                          {crumb.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>

              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                {offer.title}
              </h1>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="#devis" 
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 text-center"
                >
                  {offer.ctaLabel}
                </a>
                <a 
                  href="tel:0180855786" 
                  className="border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-bold py-4 px-8 rounded-lg transition-all duration-300 text-center flex items-center justify-center space-x-2"
                >
                  <Phone size={20} />
                  <span>01 80 85 57 86</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="section-padding">
          <div className="container-max">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Content */}
                <div className="lg:col-span-2">
                  <div 
                    className="prose prose-lg max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: offer.body }}
                  />
                </div>

                {/* Benefits Sidebar */}
                <div className="lg:col-span-1">
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-8 border border-amber-200 sticky top-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      Avantages Inclus
                    </h3>
                    
                    <ul className="space-y-4 mb-8">
                      {offer.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                          <span className="text-gray-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="space-y-4">
                      <a 
                        href="#devis" 
                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-center block"
                      >
                        {offer.ctaLabel}
                      </a>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">Besoin d'aide ?</p>
                        <div className="flex flex-col space-y-2">
                          <a 
                            href="tel:0180855786" 
                            className="flex items-center justify-center space-x-2 text-gray-700 hover:text-amber-600 transition-colors"
                          >
                            <Phone size={16} />
                            <span>01 80 85 57 86</span>
                          </a>
                          <a 
                            href="mailto:team@taxiassur.com" 
                            className="flex items-center justify-center space-x-2 text-gray-700 hover:text-amber-600 transition-colors"
                          >
                            <Mail size={16} />
                            <span>team@taxiassur.com</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lead Form Section */}
        <LeadForm />
      </div>
    </>
  );
};

export default OfferPage;