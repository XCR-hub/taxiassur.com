import React, { useState } from 'react';
import { Plus, Minus, MessageCircle } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: '💰 Combien coûte une assurance taxi avec TaxiAssur ?',
      answer: 'EXCELLENTE nouvelle ! Nos tarifs négociés vous font économiser jusqu\'à 35% vs assureurs classiques. Prix selon zone, expérience, véhicule. Moyenne clients : 890-1800€/an au lieu de 1200-2500€. Demandez VOTRE devis personnalisé GRATUIT !'
    },
    {
      question: '📋 Quelles pièces pour souscrire mon assurance taxi ?',
      answer: 'SIMPLE ! Préparez : Carte professionnelle taxi + Permis de conduire + Carte d\'identité + Carte grise taxi + Relevé d\'informations. Notre équipe vous guide étape par étape. Envoi par email accepté !'
    },
    {
      question: '🔄 Puis-je résilier mon assurance taxi actuelle ?',
      answer: 'OUI, 100% LÉGAL ! Loi Hamon : résiliation GRATUITE après 1 an de contrat, sans frais ni pénalités. BONUS : Nous nous occupons de TOUTES les démarches de résiliation pour vous. Zéro stress !'
    },
    {
      question: '🛡️ Quelles garanties dans mon contrat taxi TaxiAssur ?',
      answer: 'Couverture 360° PREMIUM : RC obligatoire + Dommages tous accidents + Protection juridique + Assistance 0km + Garantie conducteur + Accessoires pro (compteur, TPE). Sérénité TOTALE !'
    },
    {
      question: '⚡ Délai pour recevoir mon attestation taxi ?',
      answer: 'ULTRA-RAPIDE ! Attestation par email sous 2h ouvrées après validation. Original courrier sous 48h. URGENCE ? Transmission IMMÉDIATE possible ! Roulez en toute légalité dès aujourd\'hui !'
    },
    {
      question: '🔍 Y a-t-il des frais cachés chez TaxiAssur ?',
      answer: 'ZÉRO frais caché, PROMIS ! Transparence TOTALE : devis = prix final (prime + taxes + frais). Ce que vous voyez = ce que vous payez. Aucune mauvaise surprise, que des bonnes !'
    },
    {
      question: '🚨 Que faire en cas de sinistre taxi ?',
      answer: 'SERVICE PREMIUM 24h/24 ! Appelez le 01 80 85 57 86. Expert TAXI dédié prend en charge TOUT votre dossier + guide étape par étape. Véhicule de remplacement disponible. Sérénité maximale !'
    },
    {
      question: '🇫🇷 TaxiAssur couvre-t-il toute la France ?',
      answer: 'COUVERTURE NATIONALE ! Tous départements français + DOM-TOM inclus. Tarifs adaptés par zone géographique pour des conditions OPTIMALES selon votre secteur. Paris, Lyon, Marseille... Partout en France !'
    }
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      <AITaxiBackground section="content" intensity="low" />
      <div className="container-max">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
              <MessageCircle className="text-black drop-shadow-md" size={24} />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              ❓ FAQ Assurance Taxi : Toutes Vos Réponses
            </h2>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
              <Plus className="text-black animate-pulse drop-shadow-md" size={24} />
            </div>
          </div>
            ❓ FAQ Assurance Taxi : Toutes Vos Réponses
          <p className="text-xl text-gray-200 max-w-2xl mx-auto drop-shadow-md">
            Réponses expertes à vos questions sur l'assurance taxi, les tarifs, les garanties et les démarches. 
            Nos conseillers spécialisés restent disponibles 7j/7.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="ai-card overflow-hidden hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300"
              >
                <button
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-800/50 transition-colors duration-200"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                >
                  <h3 className="text-lg font-semibold text-gray-100 pr-4">
                    {faq.question}
                  </h3>
                  {openIndex === index ? (
                    <Minus className="text-amber-400 flex-shrink-0" size={20} />
                  ) : (
                    <Plus className="text-gray-600 flex-shrink-0" size={20} />
                  )}
                </button>
                
                {openIndex === index && (
                  <div className="px-6 pb-4 pt-2">
                    <p className="text-gray-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 text-center">
            <div className="ai-card p-8 max-w-3xl mx-auto taxi-glow">
              <h3 className="text-lg font-semibold text-gradient mb-2">
                🤔 Une Question Spécifique sur Votre Assurance Taxi ?
              </h3>
              <p className="text-gray-200 mb-4 drop-shadow-md">
                Nos experts assurance taxi disponibles pour toutes vos questions spécialisées
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="#devis" className="btn-primary">
                  🎯 DEMANDER UN DEVIS ASSURANCE TAXI
                </a>
                <a href="tel:0180855786" className="btn-outline">
                  📞 01 80 85 57 86
                </a>
              </div>
              <p className="text-sm text-gray-300 mt-4 drop-shadow-md">
                🏆 Experts disponibles 7j/7 • ⚡ Réponse garantie • 🎯 Conseil personnalisé
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;