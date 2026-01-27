import React from 'react';
import { Mail, Phone, FileText, Zap } from 'lucide-react';

interface QuickActionsCardProps {
  onSendEmail: () => void;
  onCall: () => void;
  onRequestDocuments: () => void;
}

const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onSendEmail,
  onCall,
  onRequestDocuments
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="text-amber-500" size={18} />
        <h3 className="text-sm font-bold text-gray-900">Actions rapides</h3>
      </div>

      <div className="space-y-2">
        <button
          onClick={onSendEmail}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium"
        >
          <Mail size={16} />
          Envoyer Email
        </button>

        <button
          onClick={onCall}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-sm font-medium"
        >
          <Phone size={16} />
          Appeler
        </button>

        <button
          onClick={onRequestDocuments}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all text-sm font-medium"
        >
          <FileText size={16} />
          Demander documents
        </button>
      </div>
    </div>
  );
};

export default QuickActionsCard;
