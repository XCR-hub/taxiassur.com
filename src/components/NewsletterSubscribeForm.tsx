import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Send, CheckCircle, TrendingUp, FileText, Gift, Bell, Star, Users, AlertCircle } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

export default function NewsletterSubscribeForm() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email: email.toLowerCase().trim(),
          first_name: firstName.trim() || null,
          source: 'website_form',
          status: 'active',
          engagement_score: 50,
          categories: ['assurance-taxi', 'actualites'],
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Cet email est déjà inscrit à notre newsletter.');
        } else {
          throw insertError;
        }
      } else {
        setSuccess(true);

        if (typeof gtag !== 'undefined') {
          gtag('event', 'newsletter_subscribe', {
            event_category: 'engagement',
            event_label: 'newsletter_signup'
          });
        }
      }
    } catch (err) {
      console.error('Erreur inscription:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <section className="section-padding bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="container-max">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
              <CheckCircle className="text-white" size={40} />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ✅ Inscription Confirmée !
            </h2>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Bienvenue parmi <strong className="text-green-600">+2500 professionnels</strong> du taxi !
              Vous recevrez désormais nos actualités assurance, conseils d'experts
              et offres exclusives directement dans votre boîte mail.
            </p>
            <div className="bg-white p-8 rounded-2xl shadow-2xl border-2 border-green-200">
              <h3 className="font-bold text-gray-900 mb-6 text-2xl">🎁 Vos Bonus d'Inscription</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Guide PDF Exclusif</p>
                    <p className="text-sm text-gray-600">"Optimiser son Assurance Taxi 2024"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Checklist Complète</p>
                    <p className="text-sm text-gray-600">"Documents Obligatoires Taxi"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Accès Prioritaire</p>
                    <p className="text-sm text-gray-600">Offres spéciales réservées aux abonnés</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Support Expert</p>
                    <p className="text-sm text-gray-600">Conseils personnalisés par email</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-green-200">
                <p className="text-sm text-gray-600">
                  📧 Vérifiez votre boîte mail pour recevoir votre premier email de bienvenue avec vos bonus !
                </p>
              </div>
            </div>

            <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
              <div className="flex justify-center mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="text-yellow-400 fill-current w-5 h-5" />
                ))}
              </div>
              <p className="text-gray-700 italic mb-3">
                "Newsletter indispensable ! Grâce aux conseils TaxiAssur, j'ai optimisé
                mon assurance et économisé 650€ par an."
              </p>
              <p className="text-sm font-semibold text-gray-900">Pierre M. - Chauffeur Taxi Paris</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      <AITaxiBackground section="content" intensity="medium" />

      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse shadow-lg"></div>
        <div className="grid grid-cols-12 gap-1 h-full">
          {[...Array(144)].map((_, i) => (
            <div
              key={i}
              className="bg-amber-400 rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 0.02}s`,
                width: '2px',
                height: '2px',
                margin: 'auto'
              }}
            ></div>
          ))}
        </div>
      </div>

      <div className="container-max relative z-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow animate-pulse">
                <Mail className="text-black drop-shadow-md" size={28} />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                Newsletter <span className="text-gradient">Assurance Taxi</span>
              </h1>
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow animate-pulse">
                <Bell className="text-black drop-shadow-md" size={28} />
              </div>
            </div>

            <p className="text-2xl text-gray-200 mb-6 leading-relaxed drop-shadow-md">
              📧 Recevez <strong className="text-yellow-500">gratuitement</strong> nos actualités assurance taxi,
              conseils d'experts, guides pratiques et offres exclusives.
            </p>
            <div className="flex items-center justify-center gap-2 text-lg text-yellow-300">
              <Users className="w-6 h-6" />
              <strong className="text-2xl">+2500 professionnels</strong> nous font déjà confiance
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white mb-8 drop-shadow-lg">
                🎯 Ce que Vous Recevrez
              </h2>

              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-6 bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-amber-500/30 hover:border-amber-500/60 transition-all duration-300 transform hover:scale-105">
                  <TrendingUp className="text-yellow-500 flex-shrink-0 mt-1 drop-shadow-md w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-white mb-2 text-xl drop-shadow-lg">Actualités Assurance Taxi</h3>
                    <p className="text-sm text-gray-300 drop-shadow-md leading-relaxed">
                      Nouvelles réglementations, évolutions tarifaires, conseils d'optimisation,
                      tout pour rester à jour dans le secteur taxi
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg border-2 border-yellow-200 transform hover:scale-105 transition-all duration-300">
                  <FileText className="text-yellow-600 flex-shrink-0 mt-1 w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 text-xl">Guides Pratiques Exclusifs</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Dossiers complets, checklists détaillées, comparatifs assureurs,
                      documents prêts à l'emploi
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl shadow-lg border-2 border-orange-200 transform hover:scale-105 transition-all duration-300">
                  <Gift className="text-orange-600 flex-shrink-0 mt-1 w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 text-xl">Offres Spéciales Abonnés</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Réductions exclusives négociées pour vous, tarifs préférentiels,
                      avant-premières sur nos services
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 rounded-2xl border-2 border-green-300 shadow-xl">
                <h3 className="font-bold text-green-900 mb-4 text-2xl flex items-center gap-2">
                  <Gift className="w-7 h-7" />
                  Bonus d'Inscription Immédiat
                </h3>
                <ul className="text-sm text-green-800 space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>Guide PDF "Assurance Taxi 2024 : Tout Savoir" (35 pages)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>Checklist "Documents Obligatoires Taxi" (format imprimable)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>Calculateur d'économies personnalisé (Excel)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>Accès prioritaire aux conseils experts par email</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-sm p-10 rounded-2xl shadow-2xl border-2 border-amber-500/50 hover:shadow-amber-500/40 transition-all duration-300 sticky top-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg">
                    <Mail className="text-black" size={20} />
                  </div>
                  <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                    📬 Inscription Gratuite
                  </h2>
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg flex items-center justify-center shadow-lg">
                    <Send className="text-black" size={20} />
                  </div>
                </div>
                <p className="text-gray-300 drop-shadow-md text-lg">
                  Rejoignez +2500 professionnels déjà abonnés
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-white mb-2">
                    Prénom (optionnel)
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/70 border-2 border-gray-600 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                    placeholder="Votre prénom"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                    Adresse email professionnelle *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-800/70 border-2 border-gray-600 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                    placeholder="votre.email@exemple.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-700 disabled:to-gray-700 text-black font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-xl hover:shadow-amber-500/50 transform hover:scale-105 disabled:scale-100 text-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                      <span>Inscription en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send size={22} />
                      <span>S'ABONNER GRATUITEMENT</span>
                    </>
                  )}
                </button>

                <div className="text-xs text-gray-400 text-center space-y-2 drop-shadow-md">
                  <p className="flex items-center justify-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Gratuit
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Pas de spam
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Données sécurisées
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Désinscription facile
                    </span>
                  </p>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-400">Actifs</span>
                    </div>
                    <span className="text-white font-bold text-lg">2500+</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-400">Fréquence</span>
                    </div>
                    <span className="text-white font-bold text-lg">1/semaine</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-400">Satisfaction</span>
                    </div>
                    <span className="text-white font-bold text-lg">4.8/5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
