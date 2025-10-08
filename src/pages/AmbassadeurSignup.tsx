import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import AITaxiBackground from '../components/AITaxiBackground';
import {
  Users, Star, Trophy, Gift, Share2, Download,
  CheckCircle, Award, Target, Zap, TrendingUp,
  Phone, Mail, MapPin, Camera, Crown
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const AmbassadeurSignup: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    bio: ''
  });
  const [ambassadorData, setAmbassadorData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const generateReferralCode = (name: string) => {
    const cleaned = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    const random = Math.random().toString(36).substring(2, 6);
    return `${cleaned}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const referralCode = generateReferralCode(formData.name);
      const badgeUrl = `https://taxiassur.com/api/badge?name=${encodeURIComponent(formData.name)}&code=${referralCode}`;
      const qrCodeUrl = `https://taxiassur.com/api/qr?ref=${referralCode}`;

      const { data, error: insertError } = await supabase
        .from('ambassadors')
        .insert([{
          ...formData,
          referral_code: referralCode,
          badge_url: badgeUrl,
          qr_code_url: qrCodeUrl,
          status: 'active'
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setAmbassadorData(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: Star,
      title: 'Visibilité',
      description: 'Photo + bio sur notre site avec lien vers vos profils',
      color: 'from-amber-500 to-yellow-500'
    },
    {
      icon: Award,
      title: 'Badge Digital',
      description: 'Badge "Ambassadeur TaxiAssur" à afficher sur vos réseaux',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Crown,
      title: 'Accès VIP',
      description: 'Support prioritaire et canal Telegram exclusif',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Trophy,
      title: 'Classement',
      description: 'Top parrains du mois publiés + reconnaissance',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  const whatsappMessages = [
    `Salut ! J'utilise TaxiAssur pour mon assurance taxi et je recommande leur service. Devis gratuit en 2min : https://taxiassur.com/devis?ref=${ambassadorData?.referral_code || 'XXXXX'}`,
    `Hey ! Tu cherches une assurance taxi moins chère ? TaxiAssur m'a fait économiser 35%. Essaie leur simulateur : https://taxiassur.com/devis?ref=${ambassadorData?.referral_code || 'XXXXX'}`,
    `Salut ! TaxiAssur propose des tarifs négociés pour nous les taxis. J'ai déjà économisé des centaines d'euros. Teste ici : https://taxiassur.com/devis?ref=${ambassadorData?.referral_code || 'XXXXX'}`
  ];

  return (
    <>
      <Seo
        title="Devenir Ambassadeur TaxiAssur | Programme de Parrainage Taxi"
        description="Rejoignez le programme ambassadeur TaxiAssur : visibilité, badge digital, accès VIP. Recommandez TaxiAssur et aidez d'autres chauffeurs à économiser !"
        canonical="/ambassadeur"
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />

        <main>
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-12 sm:py-20 overflow-hidden">
            <AITaxiBackground section="hero" intensity="high" />

            <div className="container-max relative z-20">
              <div className="max-w-4xl mx-auto text-center px-4">
                <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl">
                    <Users className="text-black" size={24} />
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold drop-shadow-lg leading-tight">
                    Devenez <span className="text-gradient">Ambassadeur</span>
                  </h1>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-2xl">
                    <Trophy className="text-black animate-pulse" size={24} />
                  </div>
                </div>

                <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-6 sm:mb-8 leading-relaxed">
                  🚀 <strong className="text-amber-400">Recommandez TaxiAssur</strong> et aidez d'autres chauffeurs à économiser.
                  En échange : <strong className="text-blue-400">visibilité</strong>,
                  <strong className="text-green-400">badge digital</strong>, et
                  <strong className="text-purple-400">accès VIP</strong>. <strong>Sans engagement</strong>.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="ai-card p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1">100+</div>
                    <div className="text-xs sm:text-sm text-gray-300">Ambassadeurs</div>
                  </div>
                  <div className="ai-card p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-1">0€</div>
                    <div className="text-xs sm:text-sm text-gray-300">Sans frais</div>
                  </div>
                  <div className="ai-card p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-400 mb-1">VIP</div>
                    <div className="text-xs sm:text-sm text-gray-300">Accès prioritaire</div>
                  </div>
                  <div className="ai-card p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-purple-400 mb-1">Badge</div>
                    <div className="text-xs sm:text-sm text-gray-300">Digital inclus</div>
                  </div>
                </div>

                <a
                  href="#formulaire"
                  className="btn-primary inline-block text-sm sm:text-base"
                >
                  🎯 Rejoindre le Programme (30 secondes)
                </a>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
            <AITaxiBackground section="content" intensity="medium" />

            <div className="container-max">
              <div className="text-center mb-8 sm:mb-12 px-4">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 leading-tight">
                  <span className="text-gradient">Avantages</span> Ambassadeur
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-gray-200 max-w-2xl mx-auto">
                  Des récompenses qui ont de la valeur, sans contrepartie financière
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 px-4 mb-8 sm:mb-12">
                {benefits.map((benefit, index) => {
                  const IconComponent = benefit.icon;
                  return (
                    <div key={index} className="ai-card p-4 sm:p-6 text-center hover:shadow-amber-500/40 transition-all duration-300 group">
                      <div className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${benefit.color} mb-3 sm:mb-4 shadow-2xl group-hover:scale-110 transition-transform`}>
                        <IconComponent className="text-white" size={28} />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-300">
                        {benefit.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Additional Benefits List */}
              <div className="ai-card p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
                  Ce Que Vous Recevez Immédiatement
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {[
                    'Lien de parrainage personnalisé',
                    'Badge digital téléchargeable',
                    'QR code pour votre véhicule',
                    'Messages WhatsApp prêts à copier',
                    'Accès canal Telegram VIP',
                    'Publication sur notre site',
                    'Certificat d\'ambassadeur PDF',
                    'Suivi temps réel de vos stats'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-2 sm:space-x-3">
                      <CheckCircle className="text-green-400 flex-shrink-0" size={18} />
                      <span className="text-xs sm:text-sm text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Form Section */}
          {step === 1 ? (
            <section id="formulaire" className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900 relative overflow-hidden">
              <AITaxiBackground section="content" intensity="low" />

              <div className="container-max">
                <div className="max-w-2xl mx-auto ai-card p-6 sm:p-8 md:p-12">
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
                      Inscription Ambassadeur
                    </h2>
                    <p className="text-sm sm:text-base text-gray-300">
                      Remplissez ce formulaire en 30 secondes
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        <Users className="inline mr-2" size={16} />
                        Nom Complet *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Jean Dupont"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        <Mail className="inline mr-2" size={16} />
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="jean.dupont@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        <Phone className="inline mr-2" size={16} />
                        Téléphone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="06 12 34 56 78"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        <MapPin className="inline mr-2" size={16} />
                        Ville *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Paris"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Mini Bio (optionnel)
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Ex: Chauffeur taxi depuis 10 ans à Paris..."
                      />
                    </div>

                    {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-300 text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary text-base sm:text-lg disabled:opacity-50"
                    >
                      {isSubmitting ? 'Inscription en cours...' : '🚀 Devenir Ambassadeur'}
                    </button>

                    <p className="text-xs text-gray-400 text-center">
                      En vous inscrivant, vous acceptez nos <Link to="/mentions-legales" className="text-amber-400 hover:underline">conditions</Link> et
                      notre <Link to="/politique-confidentialite" className="text-amber-400 hover:underline">politique de confidentialité</Link>.
                    </p>
                  </form>
                </div>
              </div>
            </section>
          ) : (
            <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900 relative overflow-hidden">
              <AITaxiBackground section="content" intensity="low" />

              <div className="container-max">
                <div className="max-w-4xl mx-auto">
                  {/* Success Message */}
                  <div className="ai-card p-6 sm:p-8 md:p-12 text-center mb-6 sm:mb-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <CheckCircle className="text-white" size={40} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
                      🎉 Bienvenue Ambassadeur !
                    </h2>
                    <p className="text-base sm:text-lg text-gray-300 mb-4 sm:mb-6">
                      Votre inscription est confirmée. Voici vos outils pour commencer à partager.
                    </p>
                    <div className="inline-flex items-center space-x-3 bg-gray-800/50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl border border-amber-500/50">
                      <Star className="text-amber-400" size={24} />
                      <div className="text-left">
                        <div className="text-xs text-gray-400">Votre code parrain</div>
                        <div className="text-lg sm:text-xl font-bold text-amber-400">{ambassadorData?.referral_code}</div>
                      </div>
                    </div>
                  </div>

                  {/* Share Links */}
                  <div className="ai-card p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                      📲 Messages WhatsApp Prêts à Copier
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {whatsappMessages.map((msg, i) => (
                        <div key={i} className="bg-gray-800/50 p-3 sm:p-4 rounded-lg border border-gray-700">
                          <p className="text-xs sm:text-sm text-gray-300 mb-3">{msg}</p>
                          <button
                            onClick={() => navigator.clipboard.writeText(msg)}
                            className="btn-outline text-xs sm:text-sm w-full"
                          >
                            📋 Copier le message
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div className="ai-card p-4 sm:p-6 md:p-8">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                      🚀 Prochaines Étapes
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                            <span className="text-black font-bold">1</span>
                          </div>
                          <h4 className="text-base sm:text-lg font-bold text-white">Partagez</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-300">
                          Envoyez vos messages WhatsApp à vos contacts chauffeurs
                        </p>
                      </div>

                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                            <span className="text-black font-bold">2</span>
                          </div>
                          <h4 className="text-base sm:text-lg font-bold text-white">Suivez</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-300">
                          Consultez vos stats en temps réel sur votre dashboard
                        </p>
                      </div>

                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <span className="text-black font-bold">3</span>
                          </div>
                          <h4 className="text-base sm:text-lg font-bold text-white">Gagnez</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-300">
                          Accumulez des récompenses et montez dans le classement
                        </p>
                      </div>

                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                            <span className="text-black font-bold">4</span>
                          </div>
                          <h4 className="text-base sm:text-lg font-bold text-white">Brillez</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-300">
                          Soyez mis en avant sur notre site et réseaux sociaux
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="text-center mt-6 sm:mt-8">
                    <Link to="/backoffice/ambassadeur" className="btn-primary inline-block text-sm sm:text-base">
                      📊 Accéder à Mon Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AmbassadeurSignup;
