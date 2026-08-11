import React from 'react';
import { ExternalLink, Download } from 'lucide-react';
import { getSecureDocumentUrl } from '@/lib/secure-document-url';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';

interface SecureDocumentLinkProps {
  filePath: string;
  source: 'prospect_documents' | 'email_attachments' | 'crm_lead_documents';
  fileName?: string;
  bucket?: string;
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
  bucket: explicitBucket,
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
      toast.error('Erreur : chemin du document introuvable');
      return;
    }

    try {
      // Nettoyer le path initial (enlever les slashes au début)
      const normalizedPath = filePath.replace(/^\/+/, '');

      // Si un bucket explicite est fourni (depuis la DB), l'utiliser en priorité absolue
      let bucket = explicitBucket || 'prospect-documents';
      let cleanPath = normalizedPath;

      if (explicitBucket) {
        // Bucket explicite: enlever tous les préfixes de bucket du path
        cleanPath = normalizedPath.replace(/^(email-attachments|prospect-documents|crm-documents|contract-documents)\//, '');
        logger.info('✅ Using explicit bucket from DB:', { bucket: explicitBucket, cleanPath });
      } else {
        // Pas de bucket explicite: détecter depuis le path ou la source
        if (normalizedPath.startsWith('email-attachments/')) {
          bucket = 'email-attachments';
          cleanPath = normalizedPath.replace(/^email-attachments\//, '');
        } else if (normalizedPath.startsWith('prospect-documents/')) {
          bucket = 'prospect-documents';
          cleanPath = normalizedPath.replace(/^prospect-documents\//, '');
        } else if (normalizedPath.startsWith('crm-documents/')) {
          bucket = 'crm-documents';
          cleanPath = normalizedPath.replace(/^crm-documents\//, '');
        } else {
          // Pas de préfixe de bucket dans le path, utiliser la source
          if (source === 'email_attachments') bucket = 'email-attachments';
          else if (source === 'prospect_documents') bucket = 'prospect-documents';
          else if (source === 'crm_lead_documents') bucket = 'crm-documents';
          cleanPath = normalizedPath;
        }
        logger.info('⚠️ Detecting bucket from path/source:', { bucket, cleanPath });
      }

      logger.info('📂 Opening document:', { originalPath: filePath, explicitBucket, finalBucket: bucket, cleanPath, fileName });

      const signedUrl = await getSecureDocumentUrl({
        bucket,
        path: cleanPath,
        download: mode === 'download',
        fileName,
      });
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
      logger.info('Document opened successfully');
    } catch (err: unknown) {
      logger.error('Exception opening document:', err);
      toast.error(`Erreur : ${err instanceof Error ? err.message : 'Impossible d\'ouvrir le document'}`);
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
