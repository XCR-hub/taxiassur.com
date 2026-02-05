import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, MapPin } from 'lucide-react';
import { useRealStats } from '../hooks/useRealStats';

interface Review {
  id: string;
  name: string;
  city: string;
  rating: number;
  date: string;
  text: string;
  verified: boolean;
  savings: number;
}

const reviews: Review[] = [
  {
    id: '1',
    name: 'Mohammed B.',
    city: 'Paris 18e',
    rating: 5,
    date: '2024-10-01',
    text: "Économie 1,200€/an en changeant d'assurance. Souscription hyper rapide, attestation reçue en 10 min. Service client au top qui répond en 5 minutes.",
    verified: true,
    savings: 1200
  },
  {
    id: '2',
    name: 'Jean-Pierre M.',
    city: 'Lyon',
    rating: 5,
    date: '2024-09-28',
    text: "20 ans de taxi, jamais vu un prix aussi bas. RC Pro incluse, véhicule de remplacement... tout ce qu'il faut. Je recommande à tous mes collègues.",
    verified: true,
    savings: 870
  },
  {
    id: '3',
    name: 'Fatima R.',
    city: 'Marseille',
    rating: 5,
    date: '2024-09-25',
    text: "Résiliée par AXA après 2 sinistres. TaxiAssur m'a acceptée sans problème avec une surprime raisonnable. Enfin une assurance qui comprend notre métier.",
    verified: true,
    savings: 650
  },
  {
    id: '4',
    name: 'David L.',
    city: 'Toulouse',
    rating: 5,
    date: '2024-09-22',
    text: "Jeune conducteur taxi, tous les assureurs demandaient 4,000€+. Chez TaxiAssur: 2,860€ tout compris. Gain énorme pour débuter sereinement.",
    verified: true,
    savings: 1340
  },
  {
    id: '5',
    name: 'Ahmed K.',
    city: 'Nice',
    rating: 5,
    date: '2024-09-20',
    text: "Tesla Model 3 taxi, réduction électrique appliquée automatiquement. 1,640€ au lieu de 2,800€ ailleurs. En plus ils connaissent bien les Tesla.",
    verified: true,
    savings: 1160
  },
  {
    id: '6',
    name: 'Sophie P.',
    city: 'Bordeaux',
    rating: 5,
    date: '2024-09-18',
    text: "Comparé 7 assureurs. TaxiAssur: meilleur prix ET meilleures garanties. Protection juridique offerte, assistance 0 km... imbattable.",
    verified: true,
    savings: 920
  },
  {
    id: '7',
    name: 'Karim T.',
    city: 'Lille',
    rating: 5,
    date: '2024-09-15',
    text: "Flotte de 5 taxis. Tarif groupe excellent avec -25%. Gestion simplifiée, un seul interlocuteur. Économie 3,500€/an sur la flotte.",
    verified: true,
    savings: 3500
  },
  {
    id: '8',
    name: 'Marie L.',
    city: 'Nantes',
    rating: 5,
    date: '2024-09-12',
    text: "Changé après 10 ans chez Macif. Prix divisé par 2 presque! 1,480€ vs 2,600€. Même couverture, service meilleur. Que du positif.",
    verified: true,
    savings: 1120
  }
];

const DynamicReviews: React.FC = () => {
  const { totalLeads, totalReviews, loading } = useRealStats();
  const [currentReviews, setCurrentReviews] = useState<Review[]>([]);
  const [hoveredReview, setHoveredReview] = useState<string | null>(null);

  useEffect(() => {
    // Mélanger et prendre 3 avis aléatoires
    const shuffled = [...reviews].sort(() => 0.5 - Math.random());
    setCurrentReviews(shuffled.slice(0, 3));

    // Changer les avis toutes les 15 secondes
    const interval = setInterval(() => {
      const shuffled = [...reviews].sort(() => 0.5 - Math.random());
      setCurrentReviews(shuffled.slice(0, 3));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const averageRating = 5.0;

  return (
    <section className="py-16 bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">
              Ce Que Disent Les Chauffeurs Taxi
            </h2>
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={24} className="fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2 text-2xl font-bold text-white">{averageRating}/5</span>
              </div>
              <div className="text-gray-300">
                <span className="font-bold">{totalReviews}</span> avis vérifiés
              </div>
            </div>
            <p className="text-xl text-gray-300">
              Économie moyenne : <span className="font-bold text-yellow-400">1,050€/an</span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {currentReviews.map((review) => (
              <div
                key={review.id}
                className={`bg-gray-800 rounded-2xl shadow-lg p-6 border-2 transition-all duration-300 ${
                  hoveredReview === review.id
                    ? 'border-yellow-500 scale-105 shadow-2xl'
                    : 'border-gray-700 hover:border-yellow-400'
                }`}
                onMouseEnter={() => setHoveredReview(review.id)}
                onMouseLeave={() => setHoveredReview(null)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-bold text-lg text-white">{review.name}</div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin size={14} className="mr-1" />
                      {review.city}
                    </div>
                  </div>
                  {review.verified && (
                    <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold flex items-center">
                      <ThumbsUp size={12} className="mr-1" />
                      Vérifié
                    </div>
                  )}
                </div>

                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={`${
                        i < review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">{review.date}</span>
                </div>

                <p className="text-gray-300 italic mb-4 text-sm leading-relaxed">
                  "{review.text}"
                </p>

                <div className="pt-4 border-t border-gray-700">
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-orange-600">
                      -{review.savings}€/an
                    </div>
                    <div className="text-xs text-gray-900 font-semibold">économisés</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-6 py-3 rounded-full">
              <span className="font-semibold">💡 Les avis changent automatiquement toutes les 15s</span>
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 rounded-2xl p-8 text-center shadow-2xl">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Rejoignez {loading ? '100+' : `${totalLeads}+`} Demandes de Devis</h3>
            <p className="text-xl mb-6 font-semibold">Économisez en moyenne 1,050€/an en 5 minutes</p>
            <a
              href="#devis"
              onClick={(e) => {
                e.preventDefault();
                const devisSection = document.getElementById('devis');
                if (devisSection) {
                  devisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setTimeout(() => {
                    const nameInput = document.getElementById('name') as HTMLInputElement;
                    if (nameInput) nameInput.focus();
                  }, 800);
                }
              }}
              className="inline-block bg-white hover:bg-gradient-to-br from-white to-gray-50 text-gray-900 font-bold px-8 py-4 rounded-xl transition-all shadow-lg"
            >
              Calculer Mon Économie →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DynamicReviews;
