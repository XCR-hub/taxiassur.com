import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { useEffect } from 'react';

export default function ClientSinistres() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
    }
  }, [email, navigate]);

  return (
    <>
      <SEOHead
        title="Mes Sinistres - Espace Client TaxiAssur"
        description="Déclarez et suivez vos sinistres"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Sinistres</h1>
              <p className="text-gray-600">
                Déclarez et suivez vos sinistres en temps réel
              </p>
            </div>
            <button className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-md">
              <Plus size={20} />
              <span>Déclarer un Sinistre</span>
            </button>
          </div>

          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <div>
                <h2 className="font-bold text-lg mb-1">Aucun Sinistre en Cours</h2>
                <p className="text-sm opacity-90">
                  Excellente nouvelle ! Vous n'avez aucun sinistre à traiter
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Comment Déclarer un Sinistre ?</h2>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-yellow-700">1</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Cliquez sur "Déclarer"</h3>
                  <p className="text-sm text-gray-600">
                    Remplissez le formulaire en ligne en 3 minutes
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-yellow-700">2</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Ajoutez des Photos</h3>
                  <p className="text-sm text-gray-600">
                    Prenez des photos des dégâts depuis votre mobile
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-yellow-700">3</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Suivez l'Avancement</h3>
                  <p className="text-sm text-gray-600">
                    Recevez des notifications à chaque étape
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Urgence Sinistre ?</h3>
                <p className="text-gray-700 mb-4">
                  En cas d'accident grave ou d'urgence, appelez immédiatement notre assistance 24/7 :
                </p>
                <a
                  href="tel:0180855786"
                  className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all"
                >
                  Assistance 24/7 : 01 80 85 57 86
                </a>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    </>
  );
}
