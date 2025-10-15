import React from 'react';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import Seo from '../components/Seo';
import JsonLd from '../components/JsonLd';
import Card from '../components/Card';
import AITaxiBackground from '../components/AITaxiBackground';
import StickyCTA from '../components/StickyCTA';
import UltimateConversion from '../components/UltimateConversion';

const Contact: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Contact', url: '/contact' }
  ];

  return (
    <>
      <Seo
        title="Contact TaxiAssur - Experts Assurance Taxi | Réponse 15min Garantie"
        description="📞 Contact TaxiAssur experts assurance taxi : réponse 15min garantie ✓ Devis gratuit ✓ Conseil personnalisé ✓ 01 80 85 57 86 ✓ team@taxiassur.com ✓ Service 7j/7"
        canonical="/contact"
        keywords="contact TaxiAssur, expert assurance taxi, conseil taxi, devis assurance taxi gratuit, téléphone taxi assurance, email taxi assurance, rendez-vous taxi"
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
                  Contactez <span className="text-gradient">TaxiAssur</span>
                </h1>
                <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                  📞 <strong className="text-yellow-400">Nos experts sont à votre disposition</strong> pour répondre à toutes vos questions 
                  et vous accompagner dans votre <strong className="text-yellow-500">projet d'assurance taxi</strong>. 
                  <strong className="text-green-400">Réponse garantie sous 15 minutes</strong>.
                </p>
                
                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-8">
                  <div className="ai-card p-4 hover:shadow-green-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-green-400 drop-shadow-lg">15min</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Réponse</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-yellow-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">7j/7</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Service</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-yellow-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">Expert</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Dédié</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Info */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                <div className="ai-card text-center p-6 hover:shadow-amber-500/40 transition-all duration-300 group">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <Phone className="text-black" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">Téléphone</h3>
                  <p className="text-gray-300 mb-3 drop-shadow-md">Appelez-nous directement</p>
                  <a 
                    href="tel:0180855786" 
                    className="text-yellow-500 hover:text-amber-300 font-semibold transition-colors"
                  >
                    01 80 85 57 86
                  </a>
                </div>

                <div className="ai-card text-center p-6 hover:shadow-yellow-500/40 transition-all duration-300 group">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-indigo-500 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <Mail className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">Email</h3>
                  <p className="text-gray-300 mb-3 drop-shadow-md">Écrivez-nous</p>
                  <a 
                    href="mailto:team@taxiassur.com" 
                    className="text-yellow-400 hover:text-blue-300 font-semibold transition-colors"
                  >
                    team@taxiassur.com
                  </a>
                </div>

                <div className="ai-card text-center p-6 hover:shadow-green-500/40 transition-all duration-300 group">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <MapPin className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">Adresse</h3>
                  <p className="text-gray-300 mb-3 drop-shadow-md">Notre siège social</p>
                  <p className="text-gray-200 font-medium">
                    Melun, France
                  </p>
                </div>

                <div className="ai-card text-center p-6 hover:shadow-yellow-500/40 transition-all duration-300 group">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-800 to-pink-500 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <Clock className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">Horaires</h3>
                  <p className="text-gray-300 mb-3 drop-shadow-md">Nous sommes disponibles</p>
                  <p className="text-gray-200 font-medium">
                    Lun-Ven : 9h-18h
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                  <div className="ai-card p-6 hover:shadow-green-500/40 transition-all duration-300">
                    <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">
                      Réponse Rapide Garantie
                    </h3>
                    <p className="text-gray-300 mb-4 drop-shadow-md">
                      Nous nous engageons à vous recontacter dans les plus brefs délais :
                    </p>
                    <ul className="space-y-2 text-gray-300 drop-shadow-md">
                      <li>• <strong>Téléphone :</strong> Réponse immédiate aux heures d'ouverture</li>
                      <li>• <strong>Email :</strong> Réponse sous 2h en moyenne</li>
                      <li>• <strong>Formulaire :</strong> Rappel sous 15 minutes</li>
                    </ul>
                  </div>

                  <div className="ai-card p-6 hover:shadow-yellow-500/40 transition-all duration-300">
                    <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">
                      Expertise Reconnue
                    </h3>
                    <p className="text-gray-300 mb-4 drop-shadow-md">
                      TaxiAssur, c'est l'assurance d'un service professionnel :
                    </p>
                    <ul className="space-y-2 text-gray-300 drop-shadow-md">
                      <li>• <strong>Courtier agréé ORIAS</strong> 11 061 425</li>
                      <li>• <strong>Spécialiste taxi</strong> depuis septembre 2025</li>
                      <li>• <strong>+100 clients</strong> nous font confiance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Lead Form */}
          <LeadForm />
          
          {/* Section conversion ultime déplacée ici */}
          <UltimateConversion />
        </main>

        <Footer />
        <StickyCTA />
      </div>
    </>
  );
};

export default Contact;