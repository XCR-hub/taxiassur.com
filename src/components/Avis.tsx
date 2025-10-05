import React from 'react';
import { Star, Quote, Users } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const Avis: React.FC = () => {
  const testimonials = [
    {
      name: 'Mohammed B.',
      location: 'Paris 75',
      rating: 5,
      text: 'INCROYABLE ! J\'ai économisé 580€ dès la 1ère année avec TaxiAssur. Service client au TOP, conseiller ultra-réactif. Je recommande à 200% !',
      savings: '580€/an'
    },
    {
      name: 'Fatima R.',
      location: 'Lyon 69',
      rating: 5,
      text: 'Après 10 ans chez le même assureur, j\'ai ENFIN trouvé mieux ! Devis reçu en 20 min, contrat signé le lendemain. Efficacité redoutable !',
      savings: '720€/an'
    },
    {
      name: 'Jean-Pierre M.',
      location: 'Marseille 13',
      rating: 5,
      text: 'Service PRO et tarifs IMBATTABLES ! Mon sinistre géré en 48h, remboursement express. TaxiAssur = LA référence taxi !',
      savings: '450€/an'
    },
    {
      name: 'Ahmed K.',
      location: 'Toulouse 31',
      rating: 5,
      text: 'ENFIN un courtier qui COMPREND les taxis ! Couverture 360° + prix qui défie toute concurrence. Merci TaxiAssur !',
      savings: '690€/an'
    }
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="container-max">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-white mb-8 drop-shadow-lg">
            🗣️ Avis Clients Authentiques
          </h3>
          
          {/* Avis plus visibles avec encadré */}
          <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-2 border-amber-500/60 rounded-2xl p-6 max-w-3xl mx-auto mb-8">
            <p className="text-xl text-gray-200 font-medium">
              +100 chauffeurs ont choisi TaxiAssur et ne le regrettent pas ! 
              Découvrez leurs témoignages authentiques.
            </p>
          </div>
          
          {/* Trust indicators */}
          <div className="flex justify-center items-center space-x-8">
            <div className="bg-gray-900/90 border border-amber-500/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-amber-400">4.9/5</div>
              <div className="flex justify-center mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-sm text-gray-300">Note moyenne</p>
            </div>
            <div className="bg-gray-900/90 border border-green-500/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400">100+</div>
              <p className="text-sm text-gray-300">Taxis clients</p>
              <p className="text-xs text-gray-400">Depuis Sept 2025</p>
            </div>
            <div className="bg-gray-900/90 border border-blue-500/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">-35%</div>
              <p className="text-sm text-gray-300">Économie moyenne</p>
            </div>
          </div>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-gray-900/95 border-2 border-amber-500/60 rounded-xl p-8 shadow-2xl relative backdrop-blur-lg"
            >
              {/* Avis plus visibles avec bordure dorée */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
              <Quote className="absolute top-4 right-4 text-amber-500/40" size={32} />
              
              {/* Rating */}
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={18} className="text-yellow-400 fill-current" />
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {testimonial.rating}/5
                </span>
              </div>

              {/* Testimonial text */}
              <p className="text-gray-200 mb-6 leading-relaxed italic text-lg font-medium">
                "{testimonial.text}"
              </p>

              {/* Author info */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-gray-300">
                    📍 {testimonial.location}
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-300 px-4 py-2 rounded-full text-sm font-bold border-2 border-green-500/60">
                    Économie: {testimonial.savings}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <div className="bg-gray-900/95 border-2 border-amber-500/60 rounded-xl p-8 max-w-3xl mx-auto shadow-2xl">
            <h3 className="text-2xl font-bold text-gradient mb-4 shimmer-effect">
              🚀 Rejoignez les Clients Satisfaits TaxiAssur
            </h3>
            <p className="text-gray-200 mb-6 text-lg">
              Découvrez maintenant combien vous allez économiser sur votre assurance taxi avec nos tarifs négociés exclusifs
            </p>
            <a href="#devis" className="btn-primary inline-block">
              🚀 OBTENIR MON DEVIS ASSURANCE TAXI
            </a>
            <p className="text-sm text-gray-300 mt-4">
              ⚡ Rappel garanti sous 15 minutes • Courtier spécialisé assurance taxi • +100 clients satisfaits
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Avis;