import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileImage, FileText, File, CheckCircle } from 'lucide-react';
import { toast } from '@/lib/toast';

interface FileWithPreview {
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface AdvancedFileUploadProps {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  compress?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onRemove?: (file: File) => void;
}

export const AdvancedFileUpload: React.FC<AdvancedFileUploadProps> = ({
  accept = 'image/*,application/pdf,.doc,.docx',
  maxSize = 10 * 1024 * 1024,
  maxFiles = 5,
  compress = true,
  onUpload,
  onRemove,
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/') || !compress) return file;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          let width = img.width;
          let height = img.height;
          const maxDimension = 1920;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.85
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const createPreview = (file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return undefined;
  };

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles = Array.from(fileList);

    if (files.length + newFiles.length > maxFiles) {
      toast.info(`Vous ne pouvez télécharger que ${maxFiles} fichiers maximum`);
      return;
    }

    const processedFiles: FileWithPreview[] = [];

    for (const file of newFiles) {
      if (file.size > maxSize) {
        toast.info(`${file.name} est trop volumineux (max ${maxSize / 1024 / 1024}MB)`);
        continue;
      }

      const compressedFile = await compressImage(file);
      const preview = createPreview(compressedFile);

      processedFiles.push({
        file: compressedFile,
        preview,
        progress: 0,
        status: 'pending',
      });
    }

    setFiles(prev => [...prev, ...processedFiles]);

    processedFiles.forEach((fileItem, index) => {
      simulateUpload(files.length + index, fileItem.file);
    });
  }, [files, maxFiles, maxSize]);

  const simulateUpload = async (index: number, file: File) => {
    setFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'uploading' };
      return updated;
    });

    const interval = setInterval(() => {
      setFiles(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            progress: Math.min(updated[index].progress + 10, 90),
          };
        }
        return updated;
      });
    }, 200);

    try {
      await onUpload([file]);
      clearInterval(interval);
      setFiles(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], progress: 100, status: 'success' };
        return updated;
      });
    } catch (error) {
      clearInterval(interval);
      setFiles(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'error',
          error: 'Erreur lors du téléchargement',
        };
        return updated;
      });
    }
  };

  const handleRemove = (index: number) => {
    const fileItem = files[index];
    if (fileItem.preview) {
      URL.revokeObjectURL(fileItem.preview);
    }
    if (onRemove) {
      onRemove(fileItem.file);
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImage className="w-8 h-8" />;
    if (file.type === 'application/pdf') return <FileText className="w-8 h-8" />;
    return <File className="w-8 h-8" />;
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Glissez vos fichiers ici ou
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Parcourir
        </button>
        <p className="text-sm text-gray-500 mt-4">
          Max {maxFiles} fichiers, {maxSize / 1024 / 1024}MB par fichier
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileItem, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 bg-white border rounded-lg"
            >
              {fileItem.preview ? (
                <img
                  src={fileItem.preview}
                  alt={fileItem.file.name}
                  className="w-16 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded">
                  {getFileIcon(fileItem.file)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileItem.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(fileItem.file.size / 1024).toFixed(1)} KB
                </p>

                {fileItem.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileItem.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {fileItem.status === 'error' && (
                  <p className="text-xs text-red-600 mt-1">{fileItem.error}</p>
                )}
              </div>

              {fileItem.status === 'success' && (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              )}

              <button
                onClick={() => handleRemove(index)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                aria-label="Supprimer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
