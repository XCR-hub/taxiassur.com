import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, Download, Eye, Calendar, CheckCircle } from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { useEffect } from 'react';

export default function ClientDocuments() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
    }
  }, [email, navigate]);

  const documents = [
    {
      name: 'Attestation d\'Assurance 2025',
      type: 'Attestation',
      date: '01/01/2025',
      size: '245 KB',
      icon: FileText,
      color: 'text-yellow-600'
    },
    {
      name: 'Conditions Générales',
      type: 'Contrat',
      date: '15/12/2024',
      size: '1.2 MB',
      icon: FileText,
      color: 'text-gray-600'
    },
    {
      name: 'Facture Décembre 2024',
      type: 'Facture',
      date: '01/12/2024',
      size: '156 KB',
      icon: FileText,
      color: 'text-green-600'
    },
    {
      name: 'Attestation d\'Assurance 2024',
      type: 'Attestation',
      date: '01/01/2024',
      size: '238 KB',
      icon: FileText,
      color: 'text-yellow-600'
    }
  ];

  return (
    <>
      <SEOHead
        title="Mes Documents - Espace Client TaxiAssur"
        description="Téléchargez vos documents d'assurance"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Documents</h1>
            <p className="text-gray-600">
              Tous vos documents d'assurance accessibles et téléchargeables en un clic
            </p>
          </div>

          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-6 text-black">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black/10 rounded-full flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <div>
                <h2 className="font-bold text-lg mb-1">Documents à Jour</h2>
                <p className="text-sm opacity-90">
                  Votre attestation d'assurance est valide jusqu'au 31/12/2025
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Documents Disponibles</h2>
            </div>

            <div className="divide-y divide-gray-100">
              {documents.map((doc, index) => {
                const Icon = doc.icon;
                return (
                  <div
                    key={index}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 ${doc.color}`}>
                        <Icon size={24} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-1">{doc.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {doc.date}
                          </span>
                          <span>•</span>
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>{doc.size}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Eye size={20} className="text-gray-600" />
                        </button>
                        <button className="p-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 rounded-lg transition-all">
                          <Download size={20} className="text-black" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-2">💡 Besoin d'un document spécifique ?</h3>
            <p className="text-gray-700 mb-4">
              Si vous ne trouvez pas le document que vous cherchez, contactez-nous et nous vous l'enverrons dans les plus brefs délais.
            </p>
            <a
              href="tel:0180855786"
              className="inline-block px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all"
            >
              Nous Contacter
            </a>
          </div>
        </div>
      </ClientLayout>
    </>
  );
}
