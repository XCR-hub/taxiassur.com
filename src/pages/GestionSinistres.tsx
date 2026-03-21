import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import { Phone, Clock, FileText, CheckCircle } from 'lucide-react';

const GestionSinistres: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Gestion Sinistres', url: '/gestion-sinistres' }
  ];

  return (
    <>
      <SEOHead
        title="Gestion Sinistres Taxi - Assistance 24h/24 Expert | TaxiAssur"
        description="Gestion sinistres taxi rapide et simplifiée avec TaxiAssur. Expert dédié, assistance 24h/24, véhicule de remplacement et accompagnement complet de votre dossier."
        canonical="/gestion-sinistres"
        keywords="gestion sinistres taxi, assistance sinistre taxi, déclaration sinistre taxi, expert sinistre taxi, véhicule remplacement taxi, accompagnement sinistre"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />

    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden">
          <AITaxiBackground section="hero" intensity="medium" />
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: `url('https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')`,
            }}
          ></div>
          <div className="container-max relative z-20">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
                Gestion des <span className="text-gradient">Sinistres</span>
              </h1>
              <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                🚨 <strong className="text-red-400">Accompagnement professionnel</strong> pour simplifier la 
                <strong className="text-yellow-500">gestion de vos sinistres taxi</strong>. 
                <strong className="text-green-400">Service rapide 24h/24</strong> et expert dédié.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:0180855786" className="btn-primary">
                  🚨 Déclarer un Sinistre : 01 80 85 57 86
                </a>
                <a href="#devis" className="btn-outline">
                  📋 En Savoir Plus
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="py-12 bg-gradient-to-r from-red-900 via-red-800 to-red-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 animate-pulse"></div>
          <div className="container-max">
            <div className="text-center relative z-10">
              <h2 className="text-3xl font-bold text-white mb-6 drop-shadow-lg">
                🚨 En Cas de Sinistre Urgent
              </h2>
              <div className="flex flex-col md:flex-row justify-center items-center gap-8">
                <div className="flex items-center text-white">
                  <Phone className="mr-3 animate-pulse drop-shadow-md" size={32} />
                  <div>
                    <p className="font-bold text-3xl drop-shadow-lg">01 80 85 57 86</p>
                    <p className="text-lg drop-shadow-md">Disponible 24h/24 - 7j/7</p>
                  </div>
                </div>
                <div className="text-white text-center bg-red-800/50 p-4 rounded-xl backdrop-blur-sm">
                  <p className="font-bold text-xl drop-shadow-lg">Assistance Immédiate</p>
                  <p className="text-lg drop-shadow-md">Dépannage • Remorquage • Véhicule de remplacement</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Process Steps */}
        <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="container-max">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                Comment Nous Gérons Vos Sinistres
              </h2>
              <p className="text-gray-200 max-w-2xl mx-auto drop-shadow-md">
                Un processus optimisé pour une résolution rapide et efficace
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="ai-card text-center p-6 hover:shadow-red-500/40 transition-all duration-300 group">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Phone className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">1. Déclaration</h3>
                <p className="text-gray-300 drop-shadow-md">
                  Appelez-nous immédiatement au 01 80 85 57 86. 
                  Prise en charge immédiate de votre dossier.
                </p>
              </div>

              <div className="ai-card text-center p-6 hover:shadow-amber-500/40 transition-all duration-300 group">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <FileText className="text-black" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">2. Constitution</h3>
                <p className="text-gray-300 drop-shadow-md">
                  Nous vous guidons pour constituer votre dossier. 
                  Aide à la rédaction du constat.
                </p>
              </div>

              <div className="ai-card text-center p-6 hover:shadow-yellow-500/40 transition-all duration-300 group">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Clock className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">3. Traitement</h3>
                <p className="text-gray-300 drop-shadow-md">
                  Suivi personnalisé de votre dossier. 
                  Information régulière sur l'avancement.
                </p>
              </div>

              <div className="ai-card text-center p-6 hover:shadow-green-500/40 transition-all duration-300 group">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <CheckCircle className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">4. Résolution</h3>
                <p className="text-gray-300 drop-shadow-md">
                  Règlement rapide et équitable. 
                  Accompagnement jusqu'à la clôture.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Included */}
        <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
          <div className="container-max">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-8 text-center drop-shadow-lg">
                Services Inclus dans la Gestion
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="ai-card p-6 hover:shadow-red-500/40 transition-all duration-300">
                  <h3 className="text-xl font-bold text-gradient mb-4 drop-shadow-lg">Assistance Immédiate</h3>
                  <ul className="space-y-3 drop-shadow-md">
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Dépannage sur place 24h/24
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Remorquage vers garage agréé
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Véhicule de remplacement
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Rapatriement si nécessaire
                    </li>
                  </ul>
                </div>

                <div className="ai-card p-6 hover:shadow-yellow-500/40 transition-all duration-300">
                  <h3 className="text-xl font-bold text-gradient mb-4 drop-shadow-lg">Accompagnement Administratif</h3>
                  <ul className="space-y-3 drop-shadow-md">
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Aide à la déclaration
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Constitution du dossier
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Suivi personnalisé
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Information régulière
                    </li>
                  </ul>
                </div>
              </div>

              <div className="text-center mt-12">
                <div className="ai-card p-8 taxi-glow">
                  <h3 className="text-2xl font-bold text-gradient mb-4 drop-shadow-lg">
                    Une Équipe Dédiée à Votre Service
                  </h3>
                  <p className="text-gray-200 mb-6 text-lg drop-shadow-md">
                    Nos experts sinistres connaissent parfaitement les spécificités du métier de taxi. 
                    Ils vous accompagnent à chaque étape pour une résolution optimale.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="tel:0180855786" className="btn-primary">
                      📞 01 80 85 57 86
                    </a>
                    <a href="mailto:team@taxiassur.com" className="btn-outline">
                      📧 team@taxiassur.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <LeadForm />
      </main>
      <Footer />
      <StickyCTA />
    </div>
    </>
  );
};

export default GestionSinistres;