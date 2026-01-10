import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import { Shield, Users, FileText, AlertTriangle } from 'lucide-react';

const RCProfessionnelle: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'RC Professionnelle', url: '/rc-professionnelle' }
  ];

  return (
    <>
      <SEOHead
        title="RC Professionnelle Taxi - Responsabilité Civile Obligatoire | TaxiAssur"
        description="🛡️ RC Professionnelle taxi obligatoire avec TaxiAssur. Devis gratuit ✓ Couverture 10M€ ✓ Protection juridique ✓ Assistance 24h/24 ✓ Tarifs négociés ✓ Expert taxi"
        canonical="/rc-professionnelle"
        keywords="RC professionnelle taxi, responsabilité civile taxi, assurance responsabilité taxi, protection juridique taxi, RC pro taxi obligatoire, garantie taxi professionnelle"
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
                RC Professionnelle <span className="text-gradient">Taxi</span>
              </h1>
              <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                🛡️ <strong className="text-yellow-400">Protégez votre responsabilité civile professionnelle</strong> avec une 
                <strong className="text-yellow-500">couverture RC taxi adaptée</strong> aux spécificités de votre métier. 
                <strong className="text-green-400">Devis RC Pro gratuit</strong> et expert dédié.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#devis" className="btn-primary">
                  🎯 Demander Mon Devis RC Pro Gratuit
                </a>
                <a href="tel:0180855786" className="btn-outline">
                  📞 Expert RC Pro : 01 80 85 57 86
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Why RC Pro Section */}
        <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="container-max">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-8 text-center drop-shadow-lg">
                Pourquoi la RC Professionnelle est Essentielle ?
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="ai-card p-6 hover:shadow-red-500/40 transition-all duration-300">
                  <div className="flex items-center mb-4">
                    <AlertTriangle className="text-red-400 mr-3 drop-shadow-md" size={24} />
                    <h3 className="text-xl font-bold text-white drop-shadow-lg">Risques RC Taxi</h3>
                  </div>
                  <ul className="space-y-3 text-gray-300 drop-shadow-md">
                    <li>• Dommages causés aux clients</li>
                    <li>• Erreurs dans l'exercice professionnel</li>
                    <li>• Négligence ou faute professionnelle</li>
                    <li>• Dommages aux biens transportés</li>
                  </ul>
                </div>

                <div className="ai-card p-6 hover:shadow-green-500/40 transition-all duration-300">
                  <div className="flex items-center mb-4">
                    <Shield className="text-green-400 mr-3 drop-shadow-md" size={24} />
                    <h3 className="text-xl font-bold text-white drop-shadow-lg">Protection RC Complète</h3>
                  </div>
                  <ul className="space-y-3 text-gray-300 drop-shadow-md">
                    <li>• Défense et recours juridiques</li>
                    <li>• Indemnisation des victimes</li>
                    <li>• Frais d'expertise et d'enquête</li>
                    <li>• Assistance juridique 24h/24</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Coverage Details */}
        <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
          <div className="container-max">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-white mb-8 drop-shadow-lg">
                Une Couverture Sur-Mesure
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="ai-card text-center p-6 hover:shadow-amber-500/40 transition-all duration-300 group">
                  <Users className="text-yellow-500 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                  <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                    Protection Clients
                  </h3>
                  <p className="text-gray-300 drop-shadow-md">
                    Couverture des dommages causés à vos passagers et leurs biens
                  </p>
                </div>

                <div className="ai-card text-center p-6 hover:shadow-yellow-500/40 transition-all duration-300 group">
                  <FileText className="text-yellow-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                  <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                    Assistance Juridique
                  </h3>
                  <p className="text-gray-300 drop-shadow-md">
                    Accompagnement complet en cas de litige ou de réclamation
                  </p>
                </div>

                <div className="ai-card text-center p-6 hover:shadow-green-500/40 transition-all duration-300 group">
                  <Shield className="text-green-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                  <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                    Sérénité Totale
                  </h3>
                  <p className="text-gray-300 drop-shadow-md">
                    Exercez votre métier en toute tranquillité avec notre protection
                  </p>
                </div>
              </div>

              <div className="mt-12 ai-card p-8 taxi-glow">
                <h3 className="text-2xl font-bold text-gradient mb-4 drop-shadow-lg">
                  Montants de Garantie Adaptés
                </h3>
                <p className="text-gray-200 mb-6 text-lg drop-shadow-md">
                  Nous adaptons les montants de garantie selon votre activité et vos besoins spécifiques. 
                  De 150 000€ à plusieurs millions d'euros de couverture.
                </p>
                <a href="#devis" className="btn-primary">
                  🎯 Obtenir Mon Devis RC Pro Personnalisé
                </a>
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

export default RCProfessionnelle;