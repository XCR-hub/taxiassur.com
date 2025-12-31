import { useSearchParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Shield, Calendar, Lock, CreditCard } from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ClientProfil() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
      return;
    }

    loadUserData();
  }, [email, navigate]);

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('client_portal_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) throw error;
      if (data) setUserData(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <>
      <SEOHead
        title="Mon Profil - Espace Client TaxiAssur"
        description="Gérez votre profil et vos paramètres"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Profil</h1>
            <p className="text-gray-600">
              Gérez vos informations personnelles et paramètres de compte
            </p>
          </div>

          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-6 text-black">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black/10 rounded-full flex items-center justify-center">
                <User size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {userData?.client_name || 'Client TaxiAssur'}
                </h2>
                <p className="text-sm opacity-90">
                  Membre depuis {userData?.created_at ? new Date(userData.created_at).getFullYear() : '2024'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Informations Personnelles</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <User size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Nom Complet</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.client_name || 'Non renseigné'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-semibold text-gray-900">{email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Téléphone</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.phone || 'Non renseigné'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Adresse</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.address || 'Non renseignée'}
                    </div>
                  </div>
                </div>

                <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold transition-all">
                  Modifier mes Informations
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Contrat d'Assurance</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Numéro de Police</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.policy_number || 'TAXI-2024-XXX'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Date d'Échéance</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.renewal_date || '31/12/2025'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Formule</div>
                    <div className="font-semibold text-gray-900">
                      {userData?.contract_type || 'Tous Risques'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <Shield size={16} />
                    <span className="font-semibold text-sm">Contrat Actif</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Sécurité</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock size={20} className="text-gray-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Mot de Passe</div>
                    <div className="text-sm text-gray-600">Dernière modification : 15/12/2024</div>
                  </div>
                </div>
                <button className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold text-sm transition-all">
                  Modifier
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-gray-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Authentification à Deux Facteurs</div>
                    <div className="text-sm text-gray-600">Sécurité renforcée</div>
                  </div>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all">
                  Activer
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-2">Besoin d'aide avec votre compte ?</h3>
            <p className="text-gray-700 mb-4">
              Notre équipe support est là pour vous aider avec toutes vos questions.
            </p>
            <a
              href="tel:0180855786"
              className="inline-block px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all"
            >
              Contacter le Support
            </a>
          </div>
        </div>
      </ClientLayout>
    </>
  );
}
