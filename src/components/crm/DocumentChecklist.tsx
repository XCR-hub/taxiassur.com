import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Upload } from 'lucide-react';
import { LeadDocument, DOCUMENT_TYPES, DocumentType } from '@/lib/crm-production';
import { cn } from '@/lib/utils';

interface DocumentChecklistProps {
  documents: LeadDocument[];
  onUpload?: (documentType: DocumentType) => void;
  onReview?: (documentId: string, approved: boolean) => void;
}

const STATUS_CONFIG = {
  pending_review: {
    icon: Clock,
    color: 'text-yellow-600 bg-yellow-100',
    label: 'En révision'
  },
  approved: {
    icon: CheckCircle,
    color: 'text-green-600 bg-green-100',
    label: 'Approuvé'
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-600 bg-red-100',
    label: 'Rejeté'
  },
  missing: {
    icon: AlertCircle,
    color: 'text-gray-400 bg-gray-100',
    label: 'Manquant'
  }
};

export const DocumentChecklist: React.FC<DocumentChecklistProps> = ({
  documents,
  onUpload,
  onReview
}) => {
  const getDocumentStatus = (docType: DocumentType): LeadDocument | null => {
    return documents.find(d => d.document_type === docType && d.status !== 'rejected') || null;
  };

  return (
    <div className="space-y-3">
      {Object.entries(DOCUMENT_TYPES).map(([type, info]) => {
        const document = getDocumentStatus(type as DocumentType);
        const config = STATUS_CONFIG[document?.status || 'missing'];
        const Icon = config.icon;

        return (
          <div
            key={type}
            className={cn(
              'bg-white border-2 rounded-lg p-4 transition-all',
              document?.status === 'approved' && 'border-green-300',
              document?.status === 'rejected' && 'border-red-300',
              document?.status === 'pending_review' && 'border-yellow-300',
              !document && 'border-gray-200'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-xl', config.color)}>
                  {info.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{info.label}</h4>
                    {info.required && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Obligatoire
                      </span>
                    )}
                  </div>

                  {document ? (
                    <>
                      <p className="text-sm text-gray-600 mb-2">{document.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{(document.file_size / 1024).toFixed(0)} KB</span>
                        <span>•</span>
                        <span>
                          {new Date(document.uploaded_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      {document.status === 'rejected' && document.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <strong>Raison du rejet:</strong> {document.rejection_reason}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Aucun document téléversé</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-3">
                <div className={cn('flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium', config.color)}>
                  <Icon size={14} />
                  <span>{config.label}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {!document && onUpload && (
                <button
                  onClick={() => onUpload(type as DocumentType)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Upload size={14} />
                  Téléverser
                </button>
              )}

              {document && document.status === 'pending_review' && onReview && (
                <>
                  <button
                    onClick={() => onReview(document.id, true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle size={14} />
                    Approuver
                  </button>
                  <button
                    onClick={() => onReview(document.id, false)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <XCircle size={14} />
                    Rejeter
                  </button>
                </>
              )}

              {document && (
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Voir →
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
