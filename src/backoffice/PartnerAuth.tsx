import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Building2, Mail, Phone, MapPin, FileText, Home, ArrowLeft } from 'lucide-react';
import Card from '../components/Card';
import { supabase } from '../lib/supabase';
import { logger } from '@/lib/logger';

interface SignupFormData {
  companyName: string;
  siret: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  description: string;
}

const PartnerAuth: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [signupForm, setSignupForm] = useState<SignupFormData>({
    companyName: '',
    siret: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    description: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!supabase) {
        setError('Service non disponible');
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });

      if (authError) {
        setError('Email ou mot de passe incorrect');
        logger.error('Partner login error:', authError);
        return;
      }

      if (data.user) {
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, status')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (partnerError || !partnerData) {
          setError('Accès partenaire non autorisé');
          await supabase.auth.signOut();
          return;
        }

        if (partnerData.status !== 'active') {
          setError('Votre compte partenaire est en attente de validation');
          await supabase.auth.signOut();
          return;
        }

        navigate('/backoffice/partner-portal');
      }
    } catch (err) {
      logger.error('Login failed:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!supabase) {
        setError('Service non disponible');
        return;
      }

      const { data: existingPartner } = await supabase
        .from('partners')
        .select('id')
        .eq('email', signupForm.email)
        .maybeSingle();

      if (existingPartner) {
        setError('Cette adresse email est déjà enregistrée');
        return;
      }

      const { error: insertError } = await supabase
        .from('partners')
        .insert({
          company_name: signupForm.companyName,
          siret: signupForm.siret,
          contact_name: signupForm.contactName,
          email: signupForm.email,
          phone: signupForm.phone,
          address: signupForm.address,
          city: signupForm.city,
          postal_code: signupForm.postalCode,
          description: signupForm.description,
          status: 'pending'
        });

      if (insertError) {
        logger.error('Partner signup error:', insertError);
        setError('Erreur lors de l\'inscription');
        return;
      }

      setSuccess('Votre demande a été envoyée avec succès ! Notre équipe va l\'examiner et vous contacter sous 48h.');
      setSignupForm({
        companyName: '',
        siret: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
        description: ''
      });
    } catch (err) {
      logger.error('Signup failed:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800">
        <div className="container-max py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-white hover:text-amber-500 transition-colors"
            >
              <Home size={20} />
              <span>Retour à l'accueil</span>
            </button>
            <h1 className="text-xl font-bold text-white">Portail Partenaire TaxiAssur</h1>
          </div>
        </div>
      </header>

      <main className="container-max py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              {mode === 'login' ? 'Connexion Partenaire' : 'Devenir Partenaire'}
            </h2>
            <p className="text-gray-400">
              {mode === 'login'
                ? 'Accédez à votre espace partenaire'
                : 'Rejoignez notre réseau de co-courtage'}
            </p>
          </div>

          <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
            <div className="flex border-b border-gray-800 mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-3 px-4 font-medium transition-colors ${
                  mode === 'login'
                    ? 'text-amber-500 border-b-2 border-amber-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <LogIn className="inline mr-2" size={18} />
                Connexion
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-3 px-4 font-medium transition-colors ${
                  mode === 'signup'
                    ? 'text-amber-500 border-b-2 border-amber-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <UserPlus className="inline mr-2" size={18} />
                Inscription
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-900/20 border border-green-500/50 rounded-lg text-green-400">
                {success}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="email"
                      required
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nom de l'entreprise *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type="text"
                        required
                        value={signupForm.companyName}
                        onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Votre société"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      SIRET *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupForm.siret}
                      onChange={(e) => setSignupForm({ ...signupForm, siret: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="123 456 789 00010"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nom du contact *
                  </label>
                  <input
                    type="text"
                    required
                    value={signupForm.contactName}
                    onChange={(e) => setSignupForm({ ...signupForm, contactName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Prénom Nom"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type="email"
                        required
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="contact@societe.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Téléphone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type="tel"
                        required
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Adresse *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      required
                      value={signupForm.address}
                      onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="123 Rue de la République"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Ville *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupForm.city}
                      onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Paris"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Code postal *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupForm.postalCode}
                      onChange={(e) => setSignupForm({ ...signupForm, postalCode: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="75001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Présentez votre activité *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 text-gray-500" size={18} />
                    <textarea
                      required
                      value={signupForm.description}
                      onChange={(e) => setSignupForm({ ...signupForm, description: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[120px]"
                      placeholder="Décrivez votre activité, votre expertise et pourquoi vous souhaitez devenir partenaire TaxiAssur..."
                    />
                  </div>
                </div>

                <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-2">Avantages du partenariat :</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Accès à des leads qualifiés exclusifs</li>
                    <li>• Commission attractive sur chaque vente</li>
                    <li>• Support commercial et technique dédié</li>
                    <li>• Outils de gestion et reporting en temps réel</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi en cours...' : 'Envoyer ma demande'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe pour discuter des modalités du partenariat.
                </p>
              </form>
            )}
          </Card>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
              <span>Retour à l'accueil</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PartnerAuth;
