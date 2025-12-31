import { useSearchParams, useNavigate } from 'react-router-dom';
import { CreditCard, Download, Calendar, CheckCircle, Clock } from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { useEffect } from 'react';

export default function ClientPaiements() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
    }
  }, [email, navigate]);

  const echeances = [
    { date: '15/02/2025', montant: '235.00€', statut: 'À venir', icon: Clock, color: 'text-yellow-600' },
    { date: '15/01/2025', montant: '235.00€', statut: 'Payé', icon: CheckCircle, color: 'text-green-600' },
    { date: '15/12/2024', montant: '235.00€', statut: 'Payé', icon: CheckCircle, color: 'text-green-600' }
  ];

  return (
    <>
      <SEOHead
        title="Mes Paiements - Espace Client TaxiAssur"
        description="Gérez vos paiements et factures"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Paiements</h1>
            <p className="text-gray-600">
              Gérez vos échéances et téléchargez vos factures
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Calendar size={24} className="text-yellow-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Prochaine Échéance</div>
                  <div className="text-2xl font-bold text-gray-900">15 Février 2025</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">235.00€</div>
              <p className="text-sm text-gray-600 mb-4">
                Prélèvement automatique sur votre compte
              </p>
              <button className="w-full px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold transition-all">
                Modifier mon RIB
              </button>
            </div>

            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <div className="text-sm opacity-90">Compte à Jour</div>
                  <div className="text-2xl font-bold">Aucune Facture Impayée</div>
                </div>
              </div>
              <p className="text-sm opacity-90">
                Tous vos paiements sont à jour. Merci de votre confiance !
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Historique des Paiements</h2>
            </div>

            <div className="divide-y divide-gray-100">
              {echeances.map((echeance, index) => {
                const Icon = echeance.icon;
                return (
                  <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${echeance.color}`}>
                        <Icon size={20} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{echeance.date}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            echeance.statut === 'Payé' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {echeance.statut}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">Mensualité assurance taxi</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">{echeance.montant}</div>
                        {echeance.statut === 'Payé' && (
                          <button className="mt-2 text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1">
                            <Download size={14} />
                            Facture
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-2">Mode de Paiement</h3>
            <p className="text-gray-700 mb-4">
              Vos paiements sont effectués par prélèvement automatique le 15 de chaque mois.
              Vous pouvez modifier votre RIB à tout moment.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <CreditCard size={16} />
              <span>IBAN : FR76 **** **** **** **56</span>
            </div>
          </div>
        </div>
      </ClientLayout>
    </>
  );
}
