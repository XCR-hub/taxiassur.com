import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Phone, Send, Shield, Clock, Award, TrendingDown, Zap, Target, Star, FileText, MapPin, Users, User, Mail } from 'lucide-react';
import { useRealStats } from '../hooks/useRealStats';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { totalArticles, totalFaqs, totalCities } = useRealStats();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    status: 'taxi',
    immatriculation: '',
    company_website: '' // honeypot
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    // Basic validation
    const newErrors: string[] = [];
    if (!formData.name) newErrors.push('Le nom est requis');
    if (!formData.email) newErrors.push('L\'email est requis');
    if (!formData.phone) newErrors.push('Le téléphone est requis');
    if (!formData.city) newErrors.push('La ville est requise');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Anti-spam check
    if (formData.company_website) {
      // Silent fail for bots
      window.location.href = '/merci';
      return;
    }

    try {
      const { createLead } = await import('@/lib/leads');
      const response = await createLead({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        status: formData.status as 'taxi' | 'vtc' | 'autre',
        immatriculation: formData.immatriculation,
        source: 'website'
      });

      if (response.success) {
        const tokenParam = response.accessToken ? `?token=${response.accessToken}` : '';
        window.location.href = `/merci${tokenParam}`;
      } else {
        setErrors([response.error || 'Erreur lors de l\'envoi. Veuillez réessayer.']);
      }
    } catch (error: any) {
      setErrors([error.message || 'Une erreur est survenue']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="devis" className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-14 sm:py-20 overflow-hidden">
      
      <div className="container-max relative z-20">
        <div className="lg:flex lg:items-center lg:space-x-12">
          {/* Left Column: Content */}
          <div className="lg:w-1/2 mb-8 lg:mb-0 px-3 sm:px-4">
            {/* Badge ORIAS */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <div className="inline-flex items-center space-x-2 bg-amber-900/30 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-xl sm:rounded-2xl border border-amber-500/40">
                <Shield className="text-yellow-500 drop-shadow-lg" size={14} />
                <span className="text-amber-300 font-bold text-xs tracking-wide drop-shadow-md">COURTIER ORIAS</span>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Main Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 lg:mb-6 drop-shadow-lg leading-tight">
              <span>Assurance Taxi</span> <span className="text-gradient">Pas Cher</span>
              <br />
              <span className="text-yellow-500">Devis Gratuit 2 min</span>
            </h1>

            {/* Subtitle with benefits */}
            <p className="text-xs sm:text-sm md:text-base text-amber-300 font-bold mb-3 sm:mb-4 lg:mb-6 drop-shadow-md">
              ORIAS • -35% • RC Pro • 15min
            </p>

            {/* SEO Rich Content - 250+ words */}
            <div className="mb-4 sm:mb-6 lg:mb-8 space-y-2 bg-gray-900/60 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-gray-700/50">
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed hidden sm:block">
                <strong className="text-yellow-500">TaxiAssur</strong> est le <strong className="text-yellow-400">courtier spécialisé en assurance taxi</strong> leader en France.
                Notre expertise unique depuis septembre 2025 nous permet de négocier les <strong className="text-green-400">meilleurs tarifs d'assurance taxi</strong> du marché.
              </p>

              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                Obtenez votre <strong className="text-yellow-400">devis assurance taxi gratuit</strong> en seulement 2 minutes.
                <span className="hidden md:inline"> Nous comparons instantanément les offres de nos 15 partenaires assureurs pour vous garantir une <strong className="text-red-400">assurance taxi pas cher</strong> sans compromis sur les garanties.</span>
              </p>

              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed hidden md:block">
                Notre <strong className="text-cyan-400">assurance professionnelle taxi</strong> inclut systématiquement la RC Pro,
                la protection juridique, l'assistance 0 km et la garantie du conducteur. En tant que <strong className="text-orange-400">courtier ORIAS agréé</strong> (numéro 11 061 425),
                nous vous accompagnons dans toutes vos démarches : souscription, gestion des sinistres, résiliation de votre ancien contrat.
              </p>

              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed hidden lg:block">
                <strong className="text-yellow-400">Prix assurance taxi</strong> transparents : économisez en moyenne 35% par rapport aux tarifs directs assureurs.
                Réponse personnalisée sous 15 minutes par nos experts taxi. Service gratuit, sans engagement.
              </p>

              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed hidden lg:block">
                <strong className="text-orange-400">Insurance for taxi drivers</strong>: TaxiAssur is the leading <strong className="text-yellow-400">insurance broker for taxi</strong> in France.
                We offer <strong className="text-amber-400">cheap taxi insurance</strong> with comprehensive coverage including RC Pro, legal protection, and 24/7 roadside assistance.
                Get your <strong className="text-orange-400">free taxi insurance quote</strong> in 2 minutes.
              </p>
            </div>

            {/* Quick Links - Internal Links for SEO */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Link to="/assurance-taxi" className="flex items-center space-x-1 sm:space-x-2 text-xs text-gray-300 hover:text-yellow-500 transition-colors bg-gray-800/50 hover:bg-gray-700/50 px-2 sm:px-3 py-2 rounded-lg border border-gray-600 hover:border-amber-500/50">
                <FileText className="text-yellow-500 flex-shrink-0" size={14} aria-hidden="true" />
                <span className="text-[10px] sm:text-xs">Guide Complet</span>
              </Link>
              <Link to="/rc-professionnelle" className="flex items-center space-x-1 sm:space-x-2 text-xs text-gray-300 hover:text-yellow-400 transition-colors bg-gray-800/50 hover:bg-gray-700/50 px-2 sm:px-3 py-2 rounded-lg border border-gray-600 hover:border-yellow-500/50">
                <Shield className="text-yellow-400 flex-shrink-0" size={14} aria-hidden="true" />
                <span className="text-[10px] sm:text-xs">RC Pro</span>
              </Link>
              <Link to="/villes" className="flex items-center space-x-1 sm:space-x-2 text-xs text-gray-300 hover:text-green-400 transition-colors bg-gray-800/50 hover:bg-gray-700/50 px-2 sm:px-3 py-2 rounded-lg border border-gray-600 hover:border-green-500/50">
                <MapPin className="text-green-400 flex-shrink-0" size={14} aria-hidden="true" />
                <span className="text-[10px] sm:text-xs">{totalCities > 0 ? `${totalCities} Villes` : 'Villes'}</span>
              </Link>
              <Link to="/blog" className="flex items-center space-x-1 sm:space-x-2 text-xs text-gray-300 hover:text-yellow-400 transition-colors bg-gray-800/50 hover:bg-gray-700/50 px-2 sm:px-3 py-2 rounded-lg border border-gray-600 hover:border-orange-500/50">
                <Users className="text-yellow-400 flex-shrink-0" size={14} aria-hidden="true" />
                <span className="text-[10px] sm:text-xs">{totalArticles > 0 ? `${totalArticles} Articles` : 'Blog'}</span>
              </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center bg-green-600 hover:bg-green-700 rounded-lg sm:rounded-xl p-2 sm:p-4 border-2 border-green-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer">
                <TrendingDown className="mx-auto mb-1 sm:mb-2 text-white drop-shadow-lg" size={16} />
                <div className="text-lg sm:text-2xl font-bold text-green-400 drop-shadow-lg">-35%</div>
                <div className="text-xs text-white font-medium drop-shadow-md hidden sm:block">Économies</div>
              </div>
              <div className="text-center bg-amber-600 hover:bg-amber-700 rounded-lg sm:rounded-xl p-2 sm:p-4 border-2 border-amber-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer">
                <Star className="mx-auto mb-1 sm:mb-2 text-white fill-current drop-shadow-lg" size={16} />
                <div className="text-lg sm:text-2xl font-bold text-yellow-500 drop-shadow-lg">100+</div>
                <div className="text-xs text-white font-medium drop-shadow-md hidden sm:block">Clients</div>
              </div>
              <div className="text-center bg-yellow-500 hover:bg-yellow-600 rounded-lg sm:rounded-xl p-2 sm:p-4 border-2 border-yellow-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer">
                <Zap className="mx-auto mb-1 sm:mb-2 text-white drop-shadow-lg" size={16} />
                <div className="text-lg sm:text-2xl font-bold text-yellow-400 drop-shadow-lg">15min</div>
                <div className="text-xs text-white font-medium drop-shadow-md hidden sm:block">Réponse</div>
              </div>
            </div>

            {/* Phone CTA */}
            <div className="text-center mt-4 sm:mt-6">
              <a
                href="tel:0180855786"
                className="inline-flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-yellow-400 hover:scale-105"
                aria-label="Appeler TaxiAssur au 01 80 85 57 86"
              >
                <Phone size={18} className="flex-shrink-0" aria-hidden="true" />
                <div className="text-left">
                  <div className="text-base sm:text-lg font-bold">01 80 85 57 86</div>
                  <div className="text-xs opacity-90 hidden sm:block">Ligne directe expert</div>
                </div>
              </a>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:w-1/2">
            <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-amber-500/60" data-form="devis">
                {/* Form Header */}
                <div className="text-center mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gradient mb-2 sm:mb-4">
                      Devis Assurance Taxi Gratuit
                    </h2>
                  <p className="text-xs sm:text-sm text-gray-300 drop-shadow-md">
                    Courtier spécialisé • Tarifs négociés • Réponse 15min
                  </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4 lead-form">
                  {/* Honeypot field - hidden */}
                  <input
                    type="text"
                    name="company_website"
                    value={formData.company_website}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {/* Error display */}
                  {errors.length > 0 && (
                    <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3">
                      {errors.map((error, index) => (
                        <p key={index} className="text-red-700 text-sm font-medium">{error}</p>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label htmlFor="name" className="block text-xs sm:text-sm font-semibold text-white mb-1 sm:mb-2">
                        Nom et prénom *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        autoComplete="name"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                        placeholder="Jean Dupont"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-white mb-1 sm:mb-2">
                        Téléphone *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        autoComplete="tel"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-white mb-1 sm:mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                        placeholder="jean@email.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="city" className="block text-xs sm:text-sm font-semibold text-white mb-1 sm:mb-2">
                        Ville *
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        autoComplete="address-level2"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                        placeholder="Paris"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label htmlFor="status" className="block text-xs sm:text-sm font-semibold text-white mb-1 sm:mb-2">
                        Statut *
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        required
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white transition-all duration-300"
                      >
                        <option value="taxi">Taxi</option>
                        <option value="vtc">VTC</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="immatriculation" className="block text-xs sm:text-sm font-semibold text-white mb-1 sm:mb-2">
                        Immatriculation (optionnel)
                      </label>
                      <input
                        type="text"
                        id="immatriculation"
                        name="immatriculation"
                        value={formData.immatriculation}
                        onChange={handleChange}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                        placeholder="AB-123-CD"
                      />
                    </div>
                  </div>

                  {/* Legal consent */}
                  <div className="bg-gray-800/50 p-3 sm:p-4 rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400">
                      En soumettant ce formulaire, j'accepte d'être recontacté par TaxiAssur.com 
                      pour recevoir mon devis personnalisé. Données sécurisées selon notre 
                      <a href="/politique-confidentialite" className="text-amber-600 hover:underline"> politique de confidentialité</a>.
                    </p>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold text-base sm:text-lg rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-black"></div>
                        <span className="text-sm sm:text-base">ENVOI EN COURS...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} className="sm:w-5 sm:h-5" aria-hidden="true" />
                        <span className="text-sm sm:text-base">OBTENIR MON DEVIS GRATUIT</span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs sm:text-sm text-gray-400 drop-shadow-md">
                    Réponse rapide de votre conseiller dédié
                  </p>
                </form>

                {/* Trust indicators */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="flex justify-center space-x-6 text-xs text-gray-600">
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="text-green-400" size={12} />
                      <span>100% Gratuit</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="text-yellow-500" size={12} />
                      <span>Réponse 15min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Shield className="text-yellow-400" size={12} />
                      <span>Sécurisé</span>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;