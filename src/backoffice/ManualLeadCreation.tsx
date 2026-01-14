import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ManualLeadCreator } from '@/components/crm';

const ManualLeadCreation: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = (leadId: string) => {
    navigate(`/backoffice/crm/lead/${leadId}`);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Créer un lead manuellement
            </h1>
            <p className="text-gray-600 mt-1">
              Pour les prospects qui contactent par téléphone ou email direct
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <ManualLeadCreator
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            defaultSource="phone"
          />
        </div>

        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">💡 Conseils</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-medium">•</span>
                <span>
                  <strong>Téléphone ou email requis :</strong> Au moins un moyen de contact est nécessaire
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">•</span>
                <span>
                  <strong>Notes détaillées :</strong> Ajoutez le contexte de l'appel, les demandes spécifiques, l'urgence
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">•</span>
                <span>
                  <strong>Source du contact :</strong> Sélectionnez le canal par lequel le prospect vous a contacté
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">•</span>
                <span>
                  <strong>Workflow automatique :</strong> Une fois créé, le lead suivra le même processus (documents, devis, signature, paiement)
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualLeadCreation;
