import React, { useState, useCallback } from 'react';
import { Upload, Loader2, X, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface DragDropUploaderProps {
  onFileSelect: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number; // en MB
  isUploading?: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
  documentLabel: string;
  documentDescription: string;
}

const DragDropUploader: React.FC<DragDropUploaderProps> = ({
  onFileSelect,
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  maxSize = 10,
  isUploading = false,
  isRejected = false,
  rejectionReason,
  documentLabel,
  documentDescription
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Vérifier la taille
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Le fichier est trop volumineux (max ${maxSize}MB)`;
    }

    // Vérifier le type
    const acceptedTypes = accept.split(',').map(t => t.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type;
      }
      return file.type.includes(type);
    });

    if (!isValidType) {
      return `Type de fichier non accepté. Formats acceptés: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    setDragError(null);

    const error = validateFile(file);
    if (error) {
      setDragError(error);
      setTimeout(() => setDragError(null), 5000);
      return;
    }

    try {
      await onFileSelect(file);
    } catch (err: any) {
      setDragError(err.message || 'Erreur lors de l\'upload');
      setTimeout(() => setDragError(null), 5000);
    }
  }, [onFileSelect]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
    // Reset input pour permettre de re-uploader le même fichier
    e.target.value = '';
  };

  return (
    <div>
      <input
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        disabled={isUploading}
        className="hidden"
        id={`file-input-${documentLabel}`}
      />

      <label
        htmlFor={`file-input-${documentLabel}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          group block border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
          ${isRejected ? 'border-red-500/50 bg-red-500/5 hover:border-red-500 hover:bg-red-500/10' : ''}
          ${isDragging && !isRejected ? 'border-amber-500 bg-amber-500/10 scale-105' : ''}
          ${!isDragging && !isRejected ? 'border-gray-600 hover:border-amber-500 hover:bg-gray-800/30' : ''}
        `}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-amber-400" size={40} />
            <div>
              <p className="text-amber-400 font-semibold">Upload en cours...</p>
              <p className="text-xs text-gray-500 mt-1">Veuillez patienter</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3">
              {isDragging ? (
                <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-2">
                  <Upload className="text-amber-400 animate-bounce" size={32} />
                </div>
              ) : isRejected ? (
                <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                  <AlertTriangle className="text-red-400" size={32} />
                </div>
              ) : (
                <div className="w-16 h-16 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center mb-2 group-hover:bg-amber-500/20 transition-colors">
                  <Upload className="text-gray-400 group-hover:text-amber-400 transition-colors" size={32} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              {isDragging ? (
                <>
                  <p className="text-lg font-bold text-amber-400">
                    Déposez votre fichier ici
                  </p>
                  <p className="text-sm text-gray-400">
                    Relâchez pour uploader
                  </p>
                </>
              ) : (
                <>
                  <p className={`text-base font-semibold ${isRejected ? 'text-red-400' : 'text-white'}`}>
                    {isRejected ? '🔄 Cliquez ou déposez un nouveau fichier' : '📁 Glissez-déposez votre fichier ici'}
                  </p>
                  <p className={`text-sm ${isRejected ? 'text-red-400' : 'text-gray-400'}`}>
                    ou cliquez pour sélectionner
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {accept.split(',').map(t => t.replace('.', '').toUpperCase()).join(', ')} • Max {maxSize}MB
                  </p>
                </>
              )}
            </div>

            {isRejected && rejectionReason && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <X className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-red-400">Raison du refus :</p>
                    <p className="text-sm text-gray-400">{rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            {dragError && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 justify-center">
                  <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
                  <p className="text-sm text-red-400">{dragError}</p>
                </div>
              </div>
            )}
          </>
        )}
      </label>
    </div>
  );
};

export default DragDropUploader;
