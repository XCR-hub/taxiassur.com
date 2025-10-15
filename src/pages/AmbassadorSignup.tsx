import React, { useState } from 'react';
import { Award, Share2, DollarSign, TrendingUp, Copy, CheckCircle } from 'lucide-react';
import { createAmbassador } from '../lib/referral';

const AmbassadorSignup: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    bio: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const response = await createAmbassador(formData);
    setResult(response);
    setLoading(false);
  };

  const copyLink = () => {
    if (result?.ambassador?.referral_url) {
      navigator.clipboard.writeText(result.ambassador.referral_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (result?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🎉 Félicitations {result.ambassador.name} !
            </h1>
            <p className="text-gray-300">
              Vous êtes maintenant ambassadeur TaxiAssur
            </p>
          </div>

          {/* Lien de parrainage */}
          <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
            <label className="block text-sm font-semibold text-gray-400 mb-2">
              Votre lien de parrainage personnel
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={result.ambassador.referral_url}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm"
              />
              <button
                onClick={copyLink}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copier
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code de parrainage */}
          <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
            <label className="block text-sm font-semibold text-gray-400 mb-2">
              Votre code de parrainage
            </label>
            <p className="text-3xl font-bold text-yellow-500 font-mono">
              {result.ambassador.referral_code}
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-4 mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Share2 className="w-6 h-6 text-yellow-400" />
              Comment partager votre lien ?
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-gray-300">
                <span className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold">
                  1
                </span>
                <div>
                  <p className="font-semibold text-white mb-1">WhatsApp</p>
                  <p className="text-sm">
                    Partagez votre lien dans les groupes de chauffeurs de taxi
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <span className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold">
                  2
                </span>
                <div>
                  <p className="font-semibold text-white mb-1">Facebook</p>
                  <p className="text-sm">
                    Postez dans les groupes "Chauffeurs de taxi Paris", "Taxi France", etc.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <span className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold">
                  3
                </span>
                <div>
                  <p className="font-semibold text-white mb-1">Bouche-à-oreille</p>
                  <p className="text-sm">
                    Parlez-en à vos collègues taxis, stations, compagnies
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Récompenses */}
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-yellow-500" />
              Vos récompenses
            </h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>10€ pour chaque chauffeur assuré grâce à vous</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Badge Bronze → Silver → Gold → Platinum</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Visibilité sur notre site (Gold & Platinum)</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/backoffice"
              className="text-yellow-400 hover:text-blue-300 font-semibold"
            >
              → Accéder à mon espace ambassadeur
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500/20 rounded-full mb-6">
            <Award className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Devenez Ambassadeur TaxiAssur
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Parrainez d'autres chauffeurs et gagnez 10€ par conversion
          </p>

          {/* Avantages */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <DollarSign className="w-8 h-8 text-green-400 mb-3 mx-auto" />
              <h3 className="font-bold text-white mb-2">Gagnez de l'argent</h3>
              <p className="text-sm text-gray-400">
                10€ pour chaque chauffeur assuré grâce à vous
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <Share2 className="w-8 h-8 text-yellow-400 mb-3 mx-auto" />
              <h3 className="font-bold text-white mb-2">Partagez facilement</h3>
              <p className="text-sm text-gray-400">
                Lien personnel à partager sur WhatsApp, Facebook
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <TrendingUp className="w-8 h-8 text-yellow-400 mb-3 mx-auto" />
              <h3 className="font-bold text-white mb-2">Progressez</h3>
              <p className="text-sm text-gray-400">
                Débloquez des badges et augmentez vos gains
              </p>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Inscription Ambassadeur
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Nom complet *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Ahmed Benali"
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ahmed@email.com"
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Téléphone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="06 12 34 56 78"
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Ville *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Paris"
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Présentez-vous (optionnel)
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Ex: Chauffeur de taxi depuis 10 ans à Paris..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {result?.error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300">
              {result.error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-lg rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Création en cours...' : 'Devenir Ambassadeur'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Gratuit • Sans engagement • Rémunération garantie
          </p>
        </form>
      </div>
    </div>
  );
};

export default AmbassadorSignup;
