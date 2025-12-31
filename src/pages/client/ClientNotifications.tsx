import { useSearchParams, useNavigate } from 'react-router-dom';
import { Bell, FileText, CreditCard, CheckCircle, Calendar } from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { useEffect } from 'react';

export default function ClientNotifications() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
    }
  }, [email, navigate]);

  const notifications = [
    {
      icon: FileText,
      title: 'Nouvelle Attestation Disponible',
      message: 'Votre attestation d\'assurance 2025 est disponible',
      date: '23 Décembre 2024',
      read: false,
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      icon: CreditCard,
      title: 'Paiement Effectué',
      message: 'Votre paiement de 235.00€ a été traité avec succès',
      date: '15 Décembre 2024',
      read: true,
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: Calendar,
      title: 'Rappel Échéance',
      message: 'Votre prochaine échéance est prévue le 15/02/2025',
      date: '10 Décembre 2024',
      read: true,
      color: 'bg-gray-100 text-gray-600'
    },
    {
      icon: CheckCircle,
      title: 'Document Validé',
      message: 'Votre carte grise a été validée par nos services',
      date: '5 Décembre 2024',
      read: true,
      color: 'bg-green-100 text-green-600'
    }
  ];

  return (
    <>
      <SEOHead
        title="Mes Notifications - Espace Client TaxiAssur"
        description="Consultez vos notifications"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">
                Restez informé de toute l'activité de votre contrat
              </p>
            </div>
            <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
              Tout marquer comme lu
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100">
            <div className="divide-y divide-gray-100">
              {notifications.map((notif, index) => {
                const Icon = notif.icon;
                return (
                  <div
                    key={index}
                    className={`p-6 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-yellow-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${notif.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon size={24} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{notif.title}</h3>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notif.message}</p>
                        <p className="text-xs text-gray-500">{notif.date}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-6 text-black">
            <div className="flex items-center gap-4">
              <Bell size={32} />
              <div>
                <h2 className="font-bold text-lg mb-1">Configurez vos Alertes</h2>
                <p className="text-sm opacity-90 mb-3">
                  Recevez des notifications par email, SMS ou dans votre espace client
                </p>
                <button className="px-4 py-2 bg-black text-white rounded-lg font-semibold text-sm hover:bg-gray-900 transition-all">
                  Gérer mes Préférences
                </button>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    </>
  );
}
