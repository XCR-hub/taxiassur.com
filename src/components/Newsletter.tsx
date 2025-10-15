import React, { useState } from 'react';
import { Mail, Send, CheckCircle, TrendingUp, FileText, Bell, Gift } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/newsletter.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          source: 'website_newsletter',
          interests: ['assurance-taxi', 'actualites', 'conseils']
        })
      });

      if (response.ok) {
        setIsSubscribed(true);
        setEmail('');
        
        // Track newsletter subscription
        if (typeof gtag !== 'undefined') {
          gtag('event', 'newsletter_subscribe', {
            event_category: 'engagement',
            event_label: 'newsletter_signup'
          });
        }
      } else {
        alert('Erreur lors de l\'inscription. Veuillez réessayer.');
      }
    } catch (error) {
      alert('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <section className="section-padding bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="container-max">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-white" size={32} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ✅ Inscription Confirmée !
            </h2>
            <p className="text-gray-700 mb-6">
              Vous recevrez désormais nos actualités assurance taxi, conseils d'experts 
              et offres exclusives directement dans votre boîte mail.
            </p>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-green-200">
              <h3 className="font-bold text-gray-900 mb-3">🎁 Bonus d'Inscription</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• Guide "Optimiser son Assurance Taxi 2024" (PDF)</li>
                <li>• Checklist "Documents Obligatoires Taxi"</li>
                <li>• Accès prioritaire aux offres spéciales</li>
                <li>• Conseils personnalisés par email</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      <AITaxiBackground section="content" intensity="medium" />
      {/* Background pattern */}
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
                <Mail className="text-black drop-shadow-md" size={24} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                Newsletter <span className="text-gradient">Assurance Taxi</span>
              </h2>
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
                <Bell className="text-black animate-pulse drop-shadow-md" size={24} />
              </div>
            </div>
            
            <p className="text-xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
              📧 Recevez <strong className="text-yellow-500">gratuitement</strong> nos actualités assurance taxi, 
              conseils d'experts, guides pratiques et offres exclusives. 
              <strong className="text-yellow-400">+2500 professionnels</strong> nous font déjà confiance.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Benefits */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white mb-6 drop-shadow-lg">
                🎯 Ce que Vous Recevrez
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 ai-card rounded-xl shadow-lg border border-gray-700/60 hover:border-amber-500/40 transition-all duration-300">
                  <TrendingUp className="text-yellow-500 flex-shrink-0 mt-1 drop-shadow-md" size={20} />
                  <div>
                    <h4 className="font-bold text-white mb-1 drop-shadow-lg">Actualités Assurance Taxi</h4>
                    <p className="text-sm text-gray-300 drop-shadow-md">Nouvelles réglementations, évolutions tarifaires, conseils d'optimisation</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-white rounded-xl shadow-lg border border-indigo-200">
                  <FileText className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Guides Pratiques Exclusifs</h4>
                    <p className="text-sm text-gray-600">Dossiers complets, checklists, comparatifs assureurs</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-white rounded-xl shadow-lg border border-purple-200">
                  <Gift className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Offres Spéciales Abonnés</h4>
                    <p className="text-sm text-gray-600">Réductions exclusives, tarifs négociés, avant-premières</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <h4 className="font-bold text-green-900 mb-3">🎁 Bonus d'Inscription Immédiat</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Guide PDF "Assurance Taxi 2024 : Tout Savoir"</li>
                  <li>• Checklist "Documents Obligatoires Taxi"</li>
                  <li>• Calculateur d'économies personnalisé</li>
                  <li>• Accès prioritaire aux conseils experts</li>
                </ul>
              </div>
            </div>

            {/* Right: Subscription form */}
            <div className="ai-card p-8 shadow-2xl border-2 border-amber-500/40 hover:shadow-amber-500/40 transition-all duration-300">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg">
                    <Mail className="text-black" size={16} />
                  </div>
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                    📬 Inscription Gratuite
                  </h3>
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg flex items-center justify-center shadow-lg">
                    <Send className="text-black" size={16} />
                  </div>
                </div>
                  📬 Inscription Gratuite
                <p className="text-gray-300 drop-shadow-md">
                  Rejoignez +2500 professionnels du taxi déjà abonnés
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="newsletter-email" className="block text-sm font-medium text-white mb-2">
                    Votre adresse email professionnelle
                  </label>
                  <input
                    type="email"
                    id="newsletter-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                    placeholder="votre.email@exemple.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:bg-gray-700 text-black font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-xl hover:shadow-amber-500/40 transform hover:scale-105"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                      <span>Inscription...</span>
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      <span>S'ABONNER GRATUITEMENT</span>
                    </>
                  )}
                </button>

                <div className="text-xs text-gray-600 text-center drop-shadow-md">
                  ✅ Gratuit • ❌ Pas de spam • 🔒 Données sécurisées • ✉️ Désinscription facile
                </div>
              </form>

              {/* Social proof */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>2500+ abonnés</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span>1 email/semaine</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-800 rounded-full animate-pulse"></div>
                    <span>Contenu exclusif</span>
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

export default Newsletter;