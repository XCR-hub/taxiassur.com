import React, { useState } from 'react';
import { Calculator, TrendingDown, Shield, Check, ArrowRight } from 'lucide-react';

interface QuoteResult {
  basePrice: number;
  finalPrice: number;
  savings: number;
  guarantees: string[];
}

const InstantQuoteCalculator: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    vehicleType: '',
    city: '',
    experience: '',
    claims: '',
    coverage: ''
  });
  const [quote, setQuote] = useState<QuoteResult | null>(null);

  const vehicleTypes = [
    { value: 'berline', label: 'Berline', icon: '🚗' },
    { value: 'break', label: 'Break', icon: '🚙' },
    { value: 'van', label: 'Van/Minibus', icon: '🚐' },
    { value: 'electrique', label: 'Électrique', icon: '⚡' },
    { value: 'moto', label: 'Moto-Taxi', icon: '🏍️' }
  ];

  const cities = [
    { value: 'paris', label: 'Paris', multiplier: 1.45 },
    { value: 'lyon', label: 'Lyon', multiplier: 1.18 },
    { value: 'marseille', label: 'Marseille', multiplier: 1.22 },
    { value: 'toulouse', label: 'Toulouse', multiplier: 1.08 },
    { value: 'nice', label: 'Nice', multiplier: 1.27 },
    { value: 'bordeaux', label: 'Bordeaux', multiplier: 1.11 },
    { value: 'lille', label: 'Lille', multiplier: 1.14 },
    { value: 'autres', label: 'Autre ville', multiplier: 1.0 }
  ];

  const calculateQuote = () => {
    let basePrice = 1430; // Prix de base

    // Ajustement par type véhicule
    const vehicleMultipliers: Record<string, number> = {
      'berline': 1.0,
      'break': 1.05,
      'van': 1.25,
      'electrique': 0.95,
      'moto': 0.91
    };

    // Ajustement ville
    const cityMultiplier = cities.find(c => c.value === formData.city)?.multiplier || 1.0;

    // Ajustement expérience
    const experienceMultipliers: Record<string, number> = {
      '0-2': 1.35,
      '3-5': 1.15,
      '6-10': 1.0,
      '10+': 0.92
    };

    // Ajustement sinistres
    const claimsMultipliers: Record<string, number> = {
      '0': 0.95,
      '1': 1.1,
      '2': 1.25,
      '3+': 1.45
    };

    // Ajustement couverture
    const coverageMultipliers: Record<string, number> = {
      'tiers': 0.65,
      'intermediaire': 0.85,
      'tous-risques': 1.0
    };

    const vehicleMult = vehicleMultipliers[formData.vehicleType] || 1.0;
    const expMult = experienceMultipliers[formData.experience] || 1.0;
    const claimsMult = claimsMultipliers[formData.claims] || 1.0;
    const coverageMult = coverageMultipliers[formData.coverage] || 1.0;

    const marketPrice = Math.round(basePrice * cityMultiplier * vehicleMult * expMult * claimsMult * coverageMult);
    const ourPrice = Math.round(marketPrice * 0.65); // -35% TaxiAssur
    const savings = marketPrice - ourPrice;

    const guarantees = [
      'RC Professionnelle illimitée',
      'Assurance véhicule ' + (formData.coverage === 'tous-risques' ? 'tous risques' : formData.coverage),
      'Protection juridique offerte',
      'Assistance 0 km 24/7',
      'Véhicule de remplacement',
      'Garantie conducteur'
    ];

    setQuote({
      basePrice: marketPrice,
      finalPrice: ourPrice,
      savings,
      guarantees
    });
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      calculateQuote();
      setStep(6);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return formData.vehicleType !== '';
      case 2: return formData.city !== '';
      case 3: return formData.experience !== '';
      case 4: return formData.claims !== '';
      case 5: return formData.coverage !== '';
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-center text-white">Type de véhicule taxi ?</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {vehicleTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setFormData({ ...formData, vehicleType: type.value })}
                  className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                    formData.vehicleType === type.value
                      ? 'border-yellow-500 bg-yellow-500/20 shadow-lg text-white'
                      : 'border-gray-600 hover:border-yellow-400 bg-gray-700 text-white'
                  }`}
                >
                  <div className="text-4xl mb-2">{type.icon}</div>
                  <div className="font-bold">{type.label}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-center text-white">Ville d'activité principale ?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cities.map(city => (
                <button
                  key={city.value}
                  onClick={() => setFormData({ ...formData, city: city.value })}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    formData.city === city.value
                      ? 'border-yellow-500 bg-yellow-500/20 shadow-lg text-white'
                      : 'border-gray-600 hover:border-yellow-400 bg-gray-700 text-white'
                  }`}
                >
                  <div className="font-bold text-lg">{city.label}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-center text-white">Années d'expérience taxi ?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: '0-2', label: '0-2 ans' },
                { value: '3-5', label: '3-5 ans' },
                { value: '6-10', label: '6-10 ans' },
                { value: '10+', label: '10+ ans' }
              ].map(exp => (
                <button
                  key={exp.value}
                  onClick={() => setFormData({ ...formData, experience: exp.value })}
                  className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                    formData.experience === exp.value
                      ? 'border-yellow-500 bg-yellow-500/20 shadow-lg'
                      : 'border-gray-600 hover:border-yellow-400 bg-gray-700'
                  }`}
                >
                  <div className="font-bold text-xl text-white">{exp.label}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-center text-white">Sinistres 3 dernières années ?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: '0', label: '0 sinistre', emoji: '✅' },
                { value: '1', label: '1 sinistre', emoji: '⚠️' },
                { value: '2', label: '2 sinistres', emoji: '🔶' },
                { value: '3+', label: '3+ sinistres', emoji: '🔴' }
              ].map(claim => (
                <button
                  key={claim.value}
                  onClick={() => setFormData({ ...formData, claims: claim.value })}
                  className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                    formData.claims === claim.value
                      ? 'border-yellow-500 bg-yellow-500/20 shadow-lg'
                      : 'border-gray-600 hover:border-yellow-400 bg-gray-700'
                  }`}
                >
                  <div className="text-3xl mb-2">{claim.emoji}</div>
                  <div className="font-bold text-white">{claim.label}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-center text-white">Niveau de couverture souhaité ?</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <button
                onClick={() => setFormData({ ...formData, coverage: 'tiers' })}
                className={`p-8 rounded-xl border-2 transition-all hover:scale-105 ${
                  formData.coverage === 'tiers'
                    ? 'border-green-500 bg-green-500/20 shadow-lg'
                    : 'border-gray-600 hover:border-green-400 bg-gray-700'
                }`}
              >
                <div className="text-3xl font-black text-green-400 mb-2">ECO</div>
                <div className="font-bold text-lg mb-4 text-white">Au Tiers</div>
                <ul className="text-sm text-left space-y-2 text-gray-300">
                  <li>✓ RC Pro incluse</li>
                  <li>✓ Assistance basique</li>
                  <li>✓ Protection juridique</li>
                </ul>
              </button>

              <button
                onClick={() => setFormData({ ...formData, coverage: 'intermediaire' })}
                className={`p-8 rounded-xl border-2 transition-all hover:scale-105 relative ${
                  formData.coverage === 'intermediaire'
                    ? 'border-yellow-500 bg-yellow-500/20 shadow-lg'
                    : 'border-gray-600 hover:border-yellow-400 bg-gray-700'
                }`}
              >
                <div className="absolute top-2 right-2 bg-yellow-500 text-gray-900 text-xs px-2 py-1 rounded-full font-bold">
                  Populaire
                </div>
                <div className="text-3xl font-black text-yellow-400 mb-2">CONFORT</div>
                <div className="font-bold text-lg mb-4 text-white">Intermédiaire</div>
                <ul className="text-sm text-left space-y-2 text-gray-300">
                  <li>✓ Tout ECO +</li>
                  <li>✓ Vol + Incendie</li>
                  <li>✓ Bris de glace</li>
                  <li>✓ Assistance 0 km</li>
                </ul>
              </button>

              <button
                onClick={() => setFormData({ ...formData, coverage: 'tous-risques' })}
                className={`p-8 rounded-xl border-2 transition-all hover:scale-105 ${
                  formData.coverage === 'tous-risques'
                    ? 'border-orange-500 bg-orange-500/20 shadow-lg'
                    : 'border-gray-600 hover:border-orange-400 bg-gray-700'
                }`}
              >
                <div className="text-3xl font-black text-orange-400 mb-2">PREMIUM</div>
                <div className="font-bold text-lg mb-4 text-white">Tous Risques</div>
                <ul className="text-sm text-left space-y-2 text-gray-300">
                  <li>✓ Tout CONFORT +</li>
                  <li>✓ Tous accidents</li>
                  <li>✓ Véhicule remplacement</li>
                  <li>✓ Garantie conducteur max</li>
                </ul>
              </button>
            </div>
          </div>
        );

      case 6:
        return quote ? (
          <div className="text-center">
            <div className="mb-8">
              <Calculator className="mx-auto text-yellow-600 mb-4" size={64} />
              <h3 className="text-3xl font-black mb-2 text-white">Votre Devis Instantané</h3>
              <p className="text-gray-300 font-semibold">Estimation basée sur vos réponses</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-700 border-2 border-gray-600 rounded-2xl p-8">
                <div className="text-sm text-gray-300 font-semibold mb-2">Prix Marché</div>
                <div className="text-4xl font-black text-gray-300 mb-2 line-through">{quote.basePrice}€</div>
                <div className="text-sm text-gray-300 font-medium">par an</div>
              </div>

              <div className="bg-yellow-500/20 border-2 border-yellow-500 rounded-2xl p-8 relative shadow-lg">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-gray-900 px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  -35% TaxiAssur
                </div>
                <div className="text-sm text-orange-400 font-semibold mb-2">Votre Prix</div>
                <div className="text-5xl font-black text-orange-400 mb-2">{quote.finalPrice}€</div>
                <div className="text-sm text-white font-medium">par an</div>
              </div>
            </div>

            <div className="bg-orange-500/20 border-2 border-orange-500 p-6 rounded-xl mb-8">
              <div className="flex items-center justify-center">
                <TrendingDown className="text-orange-400 mr-3" size={32} />
                <div>
                  <div className="text-2xl font-black text-orange-400">
                    Économie : {quote.savings}€/an
                  </div>
                  <div className="text-sm text-white font-semibold">
                    Soit {Math.round(quote.savings / 12)}€/mois économisés
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-2xl shadow-xl p-8 mb-8 text-left border-2 border-gray-600">
              <div className="flex items-center mb-4">
                <Shield className="text-yellow-600 mr-3" size={32} />
                <h4 className="text-xl font-bold text-white">Garanties Incluses</h4>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {quote.guarantees.map((guarantee, idx) => (
                  <div key={idx} className="flex items-start">
                    <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                    <span className="text-gray-200 font-medium">{guarantee}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 rounded-2xl p-8 shadow-2xl">
              <h4 className="text-2xl font-bold mb-4 text-gray-900">Obtenez ce Tarif Maintenant</h4>
              <p className="mb-6 font-semibold">Souscription 100% en ligne • Attestation en 10 min</p>
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
                className="inline-flex items-center bg-white hover:bg-gradient-to-br from-white to-gray-50 text-gray-900 font-bold px-8 py-4 rounded-xl transition-all shadow-lg"
              >
                Souscrire à {quote.finalPrice}€/an
                <ArrowRight className="ml-2" size={20} />
              </a>
              <p className="text-sm mt-4 font-medium">Aucun engagement • Sans frais cachés</p>
            </div>

            <button
              onClick={() => {
                setStep(1);
                setQuote(null);
                setFormData({
                  vehicleType: '',
                  city: '',
                  experience: '',
                  claims: '',
                  coverage: ''
                });
              }}
              className="mt-6 text-orange-600 hover:underline font-semibold"
            >
              ← Recommencer le calcul
            </button>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-black py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {step < 6 && (
            <>
              <div className="text-center mb-8 md:mb-12">
                <div className="inline-flex items-center bg-yellow-400 text-gray-900 px-6 py-3 rounded-full mb-4 shadow-lg text-base md:text-lg font-bold">
                  <Calculator size={24} className="mr-2" />
                  Calculateur Gratuit
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-4 text-white leading-tight px-4">
                  Calculez Votre Tarif en 2 Minutes
                </h2>
                <p className="text-lg md:text-xl text-gray-300 px-4 font-semibold">
                  Devis instantané personnalisé • 100% gratuit • Sans engagement
                </p>
              </div>

              <div className="mb-6 md:mb-8 px-4 md:px-0">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm md:text-base font-bold text-white">Étape {step}/5</span>
                  <span className="text-sm md:text-base font-bold text-yellow-600">{Math.round((step / 5) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-yellow-500 h-4 rounded-full transition-all duration-300 shadow-inner"
                    style={{ width: `${(step / 5) * 100}%` }}
                  />
                </div>
              </div>
            </>
          )}

          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12 border-2 border-gray-700">
            {renderStep()}
          </div>

          {step < 6 && (
            <div className="mt-6 md:mt-8 flex justify-between px-4 md:px-0 gap-4">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-4 border-2 border-gray-600 rounded-xl font-bold hover:bg-gray-700 transition-colors text-base md:text-lg text-white bg-gray-800"
                >
                  ← Retour
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className={`ml-auto px-8 py-4 rounded-xl font-bold transition-all text-base md:text-lg shadow-lg ${
                  isStepValid()
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 hover:scale-105'
                    : 'bg-gray-700 text-gray-300 cursor-not-allowed'
                }`}
              >
                {step === 5 ? 'Calculer mon devis →' : 'Suivant →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstantQuoteCalculator;
