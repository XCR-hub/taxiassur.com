import React, { useState, useEffect, useCallback } from 'react';
import {
  Paperclip, FileText, Image, File, Check, X, AlertCircle,
  Download, Eye, Mail, Clock, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface PendingAttachment {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number;
  download_url: string | null;
  auto_detected_type: string | null;
  confidence_score: number | null;
  created_at: string;
  email_subject: string | null;
  email_from: string | null;
}

interface PendingAttachmentsPanelProps {
  leadId: string;
  onAttachmentClassified?: () => void;
}

const DOCUMENT_TYPES = [
  { id: 'licence_taxi', label: 'Licence Taxi', icon: '🚕', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'permis_conduire', label: 'Permis de Conduire', icon: '🪪', color: 'bg-blue-100 text-blue-800' },
  { id: 'piece_identite', label: "Pièce d'Identité", icon: '🆔', color: 'bg-purple-100 text-purple-800' },
  { id: 'carte_grise', label: 'Carte Grise', icon: '🚗', color: 'bg-green-100 text-green-800' },
  { id: 'releve_information', label: "Relevé d'Information", icon: '📋', color: 'bg-orange-100 text-orange-800' },
  { id: 'autorisation_stationnement', label: 'Autorisation Stationnement', icon: '🅿️', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'rib', label: 'RIB', icon: '🏦', color: 'bg-pink-100 text-pink-800' }
];

export const PendingAttachmentsPanel: React.FC<PendingAttachmentsPanelProps> = ({
  leadId,
  onAttachmentClassified
}) => {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showClassifyModal, setShowClassifyModal] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_pending_attachments', { p_lead_id: leadId });

      if (error) throw error;
      setAttachments(data || []);
    } catch (err) {
      console.error('Error loading pending attachments:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="text-blue-500" size={20} />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="text-red-500" size={20} />;
    }
    return <File className="text-gray-500" size={20} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClassify = async (attachmentId: string, documentType: string) => {
    setClassifying(attachmentId);
    try {
      const { data, error } = await supabase
        .rpc('classify_attachment', {
          p_attachment_id: attachmentId,
          p_document_type: documentType
        });

      if (error) throw error;

      // Remove from list
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      setShowClassifyModal(null);

      if (onAttachmentClassified) {
        onAttachmentClassified();
      }
    } catch (err) {
      console.error('Error classifying attachment:', err);
      alert('Erreur lors de la classification');
    } finally {
      setClassifying(null);
    }
  };

  const handleIgnore = async (attachmentId: string) => {
    setClassifying(attachmentId);
    try {
      const { error } = await supabase
        .rpc('ignore_attachment', {
          p_attachment_id: attachmentId,
          p_reason: 'Ignoré manuellement'
        });

      if (error) throw error;

      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('Error ignoring attachment:', err);
      alert('Erreur lors de l\'action');
    } finally {
      setClassifying(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
          <div className="flex-1 h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border-2 border-amber-300 overflow-hidden">
        {/* Header */}
        <div
          onClick={() => setExpanded(!expanded)}
          className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 cursor-pointer hover:from-amber-200 hover:to-orange-200 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Paperclip className="text-amber-600" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Pièces Jointes à Classifier
                <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                  {attachments.length}
                </span>
              </h3>
              <p className="text-sm text-gray-600">
                Reçues par email • En attente de classification
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {/* Content */}
        {expanded && (
          <div className="p-4 space-y-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:shadow-md transition-all"
              >
                {/* File Info */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getFileIcon(attachment.file_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {attachment.file_name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFileSize(attachment.file_size)} •
                          Reçu {new Date(attachment.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      {attachment.download_url && (
                        <a
                          href={attachment.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Télécharger"
                        >
                          <Download size={18} className="text-gray-600" />
                        </a>
                      )}
                    </div>

                    {/* Email Source */}
                    {attachment.email_from && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                        <Mail size={12} />
                        <span className="truncate">De: {attachment.email_from}</span>
                      </div>
                    )}

                    {/* AI Detection */}
                    {attachment.auto_detected_type && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Sparkles size={12} className="text-purple-500" />
                        <span className="text-gray-600">
                          IA suggère: <span className="font-semibold">{
                            DOCUMENT_TYPES.find(d => d.id === attachment.auto_detected_type)?.label || attachment.auto_detected_type
                          }</span>
                        </span>
                        {attachment.confidence_score && (
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-xs font-bold',
                            attachment.confidence_score >= 80 ? 'bg-green-100 text-green-700' :
                            attachment.confidence_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {attachment.confidence_score}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => setShowClassifyModal(attachment.id)}
                    disabled={classifying === attachment.id}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check size={18} />
                    Classifier
                  </button>
                  <button
                    onClick={() => handleIgnore(attachment.id)}
                    disabled={classifying === attachment.id}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <X size={18} />
                    Ignorer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Classification Modal */}
      {showClassifyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Paperclip className="text-blue-600" size={28} />
                Classifier la Pièce Jointe
              </h3>
              <p className="text-gray-600 mt-2">
                {attachments.find(a => a.id === showClassifyModal)?.file_name}
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DOCUMENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleClassify(showClassifyModal, type.id)}
                    disabled={classifying === showClassifyModal}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50',
                      type.color,
                      'hover:border-gray-400'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{type.icon}</span>
                      <span className="font-semibold">{type.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowClassifyModal(null)}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PendingAttachmentsPanel;
