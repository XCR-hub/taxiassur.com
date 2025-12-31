import { useState } from 'react';
import { Shield, FileCheck, Bell, Clock, CreditCard, Download, Upload, CheckCircle, Star, Zap, Lock, Smartphone, Calendar, Award, Mail, Eye, EyeOff } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { supabase } from '../lib/supabase';

export default function EspaceClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: portalUser, error: portalError } = await supabase
        .from('client_portal_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (portalError) throw portalError;

      if (!portalUser) {
        setError('Email non reconnu. Veuillez vérifier votre adresse email.');
        return;
      }

      if (!portalUser.is_active) {
        setError('Votre compte est désactivé. Contactez-nous au 01 80 85 57 86.');
        return;
      }

      setSuccess('Connexion réussie ! Redirection...');

      setTimeout(() => {
        window.location.href = `/client/dashboard?email=${encodeURIComponent(email)}`;
      }, 1500);

    } catch (err: unknown) {
      console.error('Login error:', err);
      setError('Une erreur est survenue. Réessayez dans quelques instants.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Espace Client TaxiAssur - Gestion 100% En Ligne"
        description="Accédez à votre espace client TaxiAssur : gestion contrat, documents, sinistres, paiements. Disponible 24/7 sur ordinateur et mobile. Service client primé."
        canonical="https://taxiassur.com/espace-client"
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">

        {/* Hero Section */}
        <section className="relative py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black to-gray-900 opacity-95"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>

          <div className="relative max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 backdrop-blur-sm rounded-full text-white mb-6 border border-yellow-400/30">
              <Award className="w-4 h-4" />
              <span className="text-sm font-medium">Élu Meilleur Espace Client 2025</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Votre Assurance<br/>
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">100% Digitale</span>
            </h1>

            <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
              Gérez votre contrat d'assurance taxi en quelques clics. Disponible 24/7,
              sur ordinateur, tablette et mobile. Simple. Rapide. Sécurisé.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <a
                href="#connexion"
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-lg font-bold hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Se Connecter
              </a>
              <a
                href="#fonctionnalites"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-lg font-bold hover:bg-white/20 transition-all border border-white/30"
              >
                Découvrir
              </a>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-white">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <span>Accès 24/7</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <span>100% Sécurisé</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <span>Support Instantané</span>
              </div>
            </div>
          </div>
        </section>

        {/* Formulaire de Connexion */}
        <section id="connexion" className="py-16 px-4 bg-white">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Connexion Espace Client
                </h2>
                <p className="text-gray-600">
                  Accédez à votre contrat en toute sécurité
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="votre@email.com"
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de Passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Connexion...' : 'Se Connecter'}
                </button>

                <div className="text-center space-y-3 pt-4 border-t">
                  <a
                    href="/contact"
                    className="block text-sm text-gray-700 hover:text-yellow-600 font-medium"
                  >
                    Mot de passe oublié ?
                  </a>
                  <p className="text-xs text-gray-500">
                    Pas encore client ?{' '}
                    <a href="/#devis" className="text-yellow-600 hover:text-yellow-700 font-medium">
                      Obtenir un devis gratuit
                    </a>
                  </p>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Lock className="w-3 h-3" />
                  Connexion sécurisée SSL 256-bit
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Besoin d'aide ?{' '}
                <a href="tel:0180855786" className="text-yellow-600 hover:text-blue-700 font-medium">
                  01 80 85 57 86
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Statistiques */}
        <section className="py-12 px-4 bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600 mb-2">98%</div>
                <div className="text-gray-600">Satisfaction Client</div>
                <div className="flex justify-center mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600 mb-2">&lt;2min</div>
                <div className="text-gray-600">Temps Réponse Moyen</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600 mb-2">15 000+</div>
                <div className="text-gray-600">Clients Connectés</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600 mb-2">24/7</div>
                <div className="text-gray-600">Disponibilité</div>
              </div>
            </div>
          </div>
        </section>

        {/* Fonctionnalités principales */}
        <section id="fonctionnalites" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Tout Votre Contrat, Au Même Endroit
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Un espace client pensé pour vous simplifier la vie.
                Toutes vos démarches en quelques clics.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Gestion Documents */}
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <FileCheck className="w-7 h-7 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Gestion Documents
                </h3>
                <p className="text-gray-600 mb-4">
                  Téléchargez vos attestations, factures, conditions générales.
                  Tout est archivé et accessible instantanément.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Attestations en temps réel
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Historique complet
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Export PDF instantané
                  </li>
                </ul>
              </div>

              {/* Dépôt Pièces */}
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <Upload className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Dépôt Pièces Simplifié
                </h3>
                <p className="text-gray-600 mb-4">
                  Uploadez vos documents en glisser-déposer.
                  Validation automatique en moins de 2h.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Drag & drop ultra-simple
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Scan mobile intégré
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Validation rapide &lt;2h
                  </li>
                </ul>
              </div>

              {/* Gestion Sinistres */}
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
                <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Déclaration Sinistre 24/7
                </h3>
                <p className="text-gray-600 mb-4">
                  Déclarez un sinistre en 3 minutes.
                  Suivi en temps réel de votre dossier.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Formulaire guidé 3min
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Photos depuis mobile
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Suivi temps réel
                  </li>
                </ul>
              </div>

              {/* Paiements */}
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                  <CreditCard className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Gestion Paiements
                </h3>
                <p className="text-gray-600 mb-4">
                  Consultez vos factures, échéances, historique paiements.
                  Modifiez votre RIB en ligne.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Échéances visibles
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Factures téléchargeables
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Modification RIB instant
                  </li>
                </ul>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
                <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center mb-6">
                  <Bell className="w-7 h-7 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Alertes Intelligentes
                </h3>
                <p className="text-gray-600 mb-4">
                  Recevez des notifications pour renouvellement, échéances,
                  validation documents. Par email, SMS ou push.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Alertes personnalisées
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Multi-canal (email/SMS)
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Zéro oubli
                  </li>
                </ul>
              </div>

              {/* Support */}
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-200">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Support Instantané
                </h3>
                <p className="text-gray-600 mb-4">
                  Chat en direct avec nos experts.
                  Réponse moyenne en moins de 2 minutes.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Chat live &lt;2min
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Experts disponibles
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    FAQ intelligente
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Sécurité */}
        <section className="py-20 px-4 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
                <Lock className="w-5 h-5" />
                <span className="font-medium">Sécurité Bancaire</span>
              </div>
              <h2 className="text-4xl font-bold mb-4">
                Vos Données Sont Protégées
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Nous appliquons les normes de sécurité les plus strictes du secteur bancaire.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Chiffrement SSL 256-bit</h3>
                <p className="text-gray-300">
                  Toutes vos données sont chiffrées avec le même niveau qu'une banque.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Conformité RGPD</h3>
                <p className="text-gray-300">
                  Respect total des réglementations européennes de protection des données.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Authentification 2FA</h3>
                <p className="text-gray-300">
                  Protection renforcée par double authentification sur mobile.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 px-4 bg-gradient-to-r from-black to-gray-900">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl font-bold mb-6">
              Prêt à Simplifier Votre Gestion ?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Rejoignez 15 000+ professionnels du taxi qui gèrent leur assurance en 100% digital.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/devis"
                className="px-8 py-4 bg-white text-yellow-600 rounded-lg font-bold hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Obtenir Mon Devis Gratuit
              </a>
              <a
                href="/contact"
                className="px-8 py-4 bg-blue-500/20 backdrop-blur-sm text-white rounded-lg font-bold hover:bg-blue-500/30 transition-all border border-white/30"
              >
                Être Rappelé
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Questions Fréquentes
            </h2>

            <div className="space-y-6">
              <details className="bg-white rounded-lg p-6 shadow-md">
                <summary className="font-bold text-lg cursor-pointer">
                  Comment accéder à mon espace client ?
                </summary>
                <p className="mt-4 text-gray-600">
                  Dès la signature de votre contrat, vous recevez par email vos identifiants
                  de connexion. Connectez-vous sur taxiassur.com/espace-client avec votre
                  email et le mot de passe temporaire, puis changez-le lors de votre première visite.
                </p>
              </details>

              <details className="bg-white rounded-lg p-6 shadow-md">
                <summary className="font-bold text-lg cursor-pointer">
                  Quels documents puis-je télécharger ?
                </summary>
                <p className="mt-4 text-gray-600">
                  Vous pouvez télécharger toutes vos attestations d'assurance, factures,
                  conditions générales, avenants, et tout document lié à votre contrat.
                  Les attestations sont disponibles instantanément.
                </p>
              </details>

              <details className="bg-white rounded-lg p-6 shadow-md">
                <summary className="font-bold text-lg cursor-pointer">
                  Comment déclarer un sinistre ?
                </summary>
                <p className="mt-4 text-gray-600">
                  Dans votre espace client, section "Sinistres", cliquez sur "Déclarer un sinistre".
                  Remplissez le formulaire guidé (3min), ajoutez des photos depuis votre mobile,
                  et validez. Vous recevez immédiatement un numéro de sinistre et les coordonnées d'assistance.
                </p>
              </details>

              <details className="bg-white rounded-lg p-6 shadow-md">
                <summary className="font-bold text-lg cursor-pointer">
                  L'espace client est-il disponible sur mobile ?
                </summary>
                <p className="mt-4 text-gray-600">
                  Oui, 100% ! L'espace client est optimisé pour mobile, tablette et ordinateur.
                  Vous pouvez même uploader des documents en scannant avec votre smartphone.
                </p>
              </details>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
