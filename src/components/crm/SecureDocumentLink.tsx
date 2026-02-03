import React from 'react';
import { ExternalLink, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface SecureDocumentLinkProps {
  filePath: string;
  source: 'prospect_documents' | 'email_attachments' | 'crm_lead_documents';
  fileName?: string;
  mode?: 'view' | 'download';
  className?: string;
  iconSize?: number;
  showText?: boolean;
  customText?: string;
}

export const SecureDocumentLink: React.FC<SecureDocumentLinkProps> = ({
  filePath,
  source,
  fileName,
  mode = 'view',
  className = '',
  iconSize = 12,
  showText = false,
  customText
}) => {
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!filePath) {
      logger.error('SecureDocumentLink: filePath is empty');
      alert('Erreur : chemin du document introuvable');
      return;
    }

    try {
      // Nettoyer le path
      let cleanPath = filePath
        .replace(/^\/+/, '')
        .replace(/^(email-attachments|prospect-documents|crm-documents)\//, '');

      // Détecter le bucket
      let bucket = 'prospect-documents';

      if (filePath.includes('email-attachments/')) {
        bucket = 'email-attachments';
      } else if (filePath.includes('prospect-documents/')) {
        bucket = 'prospect-documents';
      } else if (filePath.includes('crm-documents/')) {
        bucket = 'crm-documents';
      } else {
        if (source === 'email_attachments') bucket = 'email-attachments';
        else if (source === 'prospect_documents') bucket = 'prospect-documents';
        else if (source === 'crm_lead_documents') bucket = 'crm-documents';
      }

      logger.info('Opening document:', { bucket, cleanPath, fileName });

      // Créer une URL signée pour éviter les problèmes CORS
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(cleanPath, 3600, {
          download: mode === 'download' ? fileName || true : false
        });

      if (error) {
        logger.error('Error creating signed URL:', error);
        alert(`Erreur lors de l'ouverture du document : ${error.message}`);
        return;
      }

      if (!data?.signedUrl) {
        logger.error('No signed URL returned');
        alert('Erreur : URL de document introuvable');
        return;
      }

      // Ouvrir dans un nouvel onglet
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');

      logger.info('Document opened successfully:', data.signedUrl);
    } catch (err: any) {
      logger.error('Exception opening document:', err);
      alert(`Erreur : ${err.message || 'Impossible d\'ouvrir le document'}`);
    }
  };

  const Icon = mode === 'download' ? Download : ExternalLink;
  const text = customText || (mode === 'download' ? 'Télécharger' : 'Voir');

  return (
    <button
      onClick={handleClick}
      className={className || 'p-1 hover:bg-gray-100 rounded transition-colors'}
      title={`${mode === 'download' ? 'Télécharger' : 'Voir'}: ${fileName || filePath.split('/').pop()}`}
    >
      <Icon size={iconSize} className={mode === 'download' ? 'text-green-500' : 'text-blue-500'} />
      {showText && <span className="ml-1">{text}</span>}
    </button>
  );
};
