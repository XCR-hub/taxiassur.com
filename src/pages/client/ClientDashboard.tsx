import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Shield, CreditCard, Bell, TrendingUp, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { supabase } from '../../lib/supabase';

export default function ClientDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
      return;
    }

    sessionStorage.setItem('client_email', email);
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

      if (data) {
        setUserData(data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès Refusé</h2>
          <p className="text-gray-600 mb-6">
            Votre compte n'a pas été trouvé ou est inactif.
          </p>
          <a
            href="/espace-client"
            className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg font-bold hover:from-yellow-700 hover:to-yellow-600 transition-all"
          >
            Retour à la Connexion
          </a>
        </div>
      </div>
    );
  }

  const stats = [
    {
      icon: FileText,
      label: 'Documents',
      value: '12',
      sublabel: 'Disponibles',
      color: 'bg-yellow-100 text-yellow-600',
      link: '/client/documents'
    },
    {
      icon: Shield,
      label: 'Sinistres',
      value: '0',
      sublabel: 'En cours',
      color: 'bg-green-100 text-green-600',
      link: '/client/sinistres'
    },
    {
      icon: CreditCard,
      label: 'Prochaine Échéance',
      value: '15/02',
      sublabel: '235.00€',
      color: 'bg-gray-100 text-gray-600',
      link: '/client/paiements'
    },
    {
      icon: Bell,
      label: 'Notifications',
      value: '3',
      sublabel: 'Nouvelles',
      color: 'bg-gray-100 text-gray-600',
      link: '/client/notifications'
    }
  ];

  const quickActions = [
    {
      icon: FileText,
      label: 'Télécharger Attestation',
      description: 'Attestation d\'assurance valide',
      link: '/client/documents',
      color: 'from-yellow-600 to-yellow-500'
    },
    {
      icon: Shield,
      label: 'Déclarer un Sinistre',
      description: 'Déclaration en 3 minutes',
      link: '/client/sinistres',
      color: 'from-red-600 to-red-700'
    },
    {
      icon: CreditCard,
      label: 'Gérer mes Paiements',
      description: 'Factures et échéances',
      link: '/client/paiements',
      color: 'from-green-600 to-green-700'
    }
  ];

  const recentActivity = [
    { icon: CheckCircle, label: 'Attestation téléchargée', date: '23/12/2024', color: 'text-green-600' },
    { icon: FileText, label: 'Document validé', date: '20/12/2024', color: 'text-yellow-600' },
    { icon: CheckCircle, label: 'Paiement effectué', date: '15/12/2024', color: 'text-green-600' },
    { icon: Bell, label: 'Rappel échéance', date: '10/12/2024', color: 'text-gray-600' }
  ];

  return (
    <>
      <SEOHead
        title="Mon Espace Client - TaxiAssur"
        description="Gérez votre contrat d'assurance taxi en ligne"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bonjour {userData.client_name || 'Client'}
            </h1>
            <p className="text-gray-600">
              Bienvenue dans votre espace personnel TaxiAssur
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <a
                  key={index}
                  href={stat.link}
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all border border-gray-100 hover:border-yellow-400"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                      <Icon size={24} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-gray-600">{stat.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.sublabel}</div>
                </a>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-6 text-black">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">Contrat Actif</h2>
                <p className="text-sm opacity-90 mb-4">
                  Votre assurance taxi tous risques
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>Police N° {userData.policy_number || 'TAXI-2024-XXX'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>Échéance : {userData.renewal_date || '31/12/2025'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} />
                    <span>Statut : Actif et à jour</span>
                  </div>
                </div>
              </div>
              <div className="hidden sm:block">
                <Shield size={64} className="opacity-20" />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <a
                  key={index}
                  href={action.link}
                  className={`bg-gradient-to-r ${action.color} rounded-xl p-6 text-white hover:opacity-90 transition-all shadow-md hover:shadow-lg`}
                >
                  <Icon size={32} className="mb-4" />
                  <h3 className="text-lg font-bold mb-1">{action.label}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </a>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clock size={24} className="text-yellow-600" />
                Activité Récente
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                      <Icon size={20} className={activity.color} />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{activity.label}</div>
                        <div className="text-sm text-gray-500">{activity.date}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Besoin d'Aide ?</h3>
                <p className="text-gray-700 mb-4">
                  Notre équipe est disponible du lundi au vendredi de 9h à 18h pour répondre à toutes vos questions.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="tel:0180855786"
                    className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all"
                  >
                    01 80 85 57 86
                  </a>
                  <a
                    href="mailto:team@taxiassur.com"
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-semibold text-sm transition-all"
                  >
                    team@taxiassur.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    </>
  );
}
