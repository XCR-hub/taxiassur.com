import { useState, useRef, DragEvent } from 'react';
import { Upload, X, File, Image, FileText, Video, Music, CheckCircle, AlertCircle } from 'lucide-react';

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  onUpload?: (files: File[]) => Promise<void>;
  onRemove?: (fileId: string) => void;
  disabled?: boolean;
  showPreview?: boolean;
}

export function FileUploader({
  accept = '*',
  multiple = true,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 10,
  onUpload,
  onRemove,
  disabled = false,
  showPreview = true
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  const getFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `Le fichier est trop volumineux (max ${Math.round(maxSize / 1024 / 1024)}MB)`;
    }
    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      const fileType = file.type;

      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExt === type;
        }
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', ''));
        }
        return fileType === type;
      });

      if (!isAccepted) {
        return `Type de fichier non accepté (${accept})`;
      }
    }
    return null;
  };

  const processFiles = async (fileList: FileList) => {
    if (disabled) return;

    const newFiles: UploadedFile[] = [];
    const filesToUpload: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      if (files.length + newFiles.length >= maxFiles) {
        break;
      }

      const error = validateFile(file);
      const preview = await getFilePreview(file);

      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + i,
        file,
        preview,
        progress: 0,
        status: error ? 'error' : 'uploading',
        error
      };

      newFiles.push(uploadedFile);
      if (!error) {
        filesToUpload.push(file);
      }
    }

    setFiles(prev => [...prev, ...newFiles]);

    if (filesToUpload.length > 0 && onUpload) {
      try {
        await simulateUpload(newFiles.filter(f => !f.error));
        await onUpload(filesToUpload);

        setFiles(prev =>
          prev.map(f =>
            newFiles.some(nf => nf.id === f.id && !nf.error)
              ? { ...f, status: 'success', progress: 100 }
              : f
          )
        );
      } catch (err) {
        setFiles(prev =>
          prev.map(f =>
            newFiles.some(nf => nf.id === f.id)
              ? { ...f, status: 'error', error: 'Échec de l\'upload' }
              : f
          )
        );
      }
    }
  };

  const simulateUpload = (files: UploadedFile[]): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles(prev =>
          prev.map(f =>
            files.some(uf => uf.id === f.id)
              ? { ...f, progress: Math.min(progress, 100) }
              : f
          )
        );
        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemove = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    onRemove?.(fileId);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all
          ${dragActive
            ? 'border-blue-500 bg-blue-500/5'
            : 'border-gray-700 bg-gray-900 hover:border-gray-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${dragActive ? 'bg-blue-500/20' : 'bg-gray-800'}
          `}>
            <Upload className={`
              w-8 h-8 transition-colors
              ${dragActive ? 'text-blue-500' : 'text-gray-400'}
            `} />
          </div>

          <div>
            <p className="text-white font-semibold mb-1">
              {dragActive ? 'Déposez vos fichiers ici' : 'Glissez-déposez vos fichiers'}
            </p>
            <p className="text-gray-400 text-sm">
              ou cliquez pour parcourir
            </p>
          </div>

          <div className="text-xs text-gray-500">
            {accept !== '*' && <div>Types acceptés: {accept}</div>}
            <div>Taille max: {Math.round(maxSize / 1024 / 1024)}MB par fichier</div>
            {multiple && <div>Max {maxFiles} fichiers</div>}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          {files.map(file => {
            const Icon = getFileIcon(file.file.type);

            return (
              <div
                key={file.id}
                className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {showPreview && file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {file.file.name}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {formatFileSize(file.file.size)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {file.status === 'success' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(file.id);
                          }}
                          className="p-1 hover:bg-gray-800 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {file.status === 'uploading' && (
                      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}

                    {file.status === 'error' && file.error && (
                      <p className="text-red-500 text-sm mt-1">{file.error}</p>
                    )}

                    {file.status === 'success' && (
                      <p className="text-green-500 text-sm mt-1">Upload réussi</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
