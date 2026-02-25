import React from 'react';
import { X, FileCheck, FilePlus } from 'lucide-react';

interface ExistingLeadData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  vehicleCount: number;
  createdAt: string;
}

interface ExistingLeadChoiceModalProps {
  isOpen: boolean;
  existingLead: ExistingLeadData | null;
  onClose: () => void;
  onAccessExisting: () => void;
  onCreateNew: () => void;
}

const ExistingLeadChoiceModal: React.FC<ExistingLeadChoiceModalProps> = ({
  isOpen,
  existingLead,
  onClose,
  onAccessExisting,
  onCreateNew
}) => {
  if (!isOpen || !existingLead) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Fermer"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Dossier existant détecté
          </h2>
          <p className="text-gray-600">
            Nous avons retrouvé votre dossier chez TaxiAssur
          </p>
        </div>

        {/* Existing lead info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Vos informations</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li><strong>Nom :</strong> {existingLead.firstName} {existingLead.lastName}</li>
            <li><strong>Email :</strong> {existingLead.email}</li>
            <li><strong>Téléphone :</strong> {existingLead.phone}</li>
            <li><strong>Ville :</strong> {existingLead.city}</li>
            <li><strong>Créé le :</strong> {formatDate(existingLead.createdAt)}</li>
          </ul>
        </div>

        {/* Choice explanation */}
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Que souhaitez-vous faire ?
          </p>
        </div>

        {/* Choice buttons */}
        <div className="space-y-3">
          {/* Option 1: Access existing */}
          <button
            onClick={onAccessExisting}
            className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 border-2 border-green-500 rounded-lg transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <FileCheck className="text-white" size={20} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">
                  Accéder à mon dossier existant
                </div>
                <div className="text-sm text-gray-600">
                  Recevoir le lien d'accès par email
                </div>
              </div>
            </div>
            <div className="text-green-600 font-bold text-lg">→</div>
          </button>

          {/* Option 2: Create new */}
          <button
            onClick={onCreateNew}
            className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-500 rounded-lg transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <FilePlus className="text-white" size={20} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">
                  Créer un nouveau dossier
                </div>
                <div className="text-sm text-gray-600">
                  Pour un 2ème véhicule, VTC, ou autre activité
                </div>
              </div>
            </div>
            <div className="text-blue-600 font-bold text-lg">→</div>
          </button>
        </div>

        {/* Help text */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <strong>💡 Astuce :</strong> Si vous souhaitez assurer plusieurs véhicules (2 taxis, taxi + VTC, etc.),
          créez un nouveau dossier. Chaque véhicule aura son propre dossier et devis.
        </div>
      </div>
    </div>
  );
};

export default ExistingLeadChoiceModal;
