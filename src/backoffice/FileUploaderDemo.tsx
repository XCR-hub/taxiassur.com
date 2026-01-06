import { useState } from 'react';
import { Upload, Image, FileText, Film, CheckCircle } from 'lucide-react';
import { FileUploader } from '../components/FileUploader';

export default function FileUploaderDemo() {
  const [uploadedCount, setUploadedCount] = useState(0);

  const handleUpload = async (files: File[]) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUploadedCount(prev => prev + files.length);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Upload className="w-10 h-10 text-blue-500" />
            Upload de Fichiers Avancé
          </h1>
          <p className="text-gray-400 text-lg">
            Drag & Drop avec preview, validation et barre de progression
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Fichiers uploadés</div>
                <div className="text-3xl font-bold text-white">{uploadedCount}</div>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Taille Max</div>
                <div className="text-3xl font-bold text-white">10 MB</div>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Max Fichiers</div>
                <div className="text-3xl font-bold text-white">10</div>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Upload className="w-6 h-6 text-blue-500" />
              Upload Universel
            </h2>
            <p className="text-gray-400 mb-4">
              Accepte tous les types de fichiers avec preview automatique pour les images
            </p>
            <FileUploader
              multiple={true}
              maxSize={10 * 1024 * 1024}
              maxFiles={10}
              onUpload={handleUpload}
              showPreview={true}
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Image className="w-6 h-6 text-green-500" />
              Images Seulement
            </h2>
            <p className="text-gray-400 mb-4">
              Accepte uniquement les images (PNG, JPG, GIF, WebP)
            </p>
            <FileUploader
              accept="image/*"
              multiple={true}
              maxSize={5 * 1024 * 1024}
              maxFiles={5}
              onUpload={handleUpload}
              showPreview={true}
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-500" />
              Documents Uniquement
            </h2>
            <p className="text-gray-400 mb-4">
              Accepte PDF et documents Word
            </p>
            <FileUploader
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple={true}
              maxSize={20 * 1024 * 1024}
              maxFiles={3}
              onUpload={handleUpload}
              showPreview={false}
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Film className="w-6 h-6 text-red-500" />
              Fichier Unique
            </h2>
            <p className="text-gray-400 mb-4">
              Mode fichier unique pour vidéos
            </p>
            <FileUploader
              accept="video/*"
              multiple={false}
              maxSize={100 * 1024 * 1024}
              maxFiles={1}
              onUpload={handleUpload}
              showPreview={false}
            />
          </div>
        </div>

        <div className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Fonctionnalités</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Drag & Drop</div>
                <div className="text-sm text-gray-400">Glissez-déposez vos fichiers directement</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Preview Images</div>
                <div className="text-sm text-gray-400">Aperçu automatique des images</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Validation</div>
                <div className="text-sm text-gray-400">Type et taille vérifiés automatiquement</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Progression</div>
                <div className="text-sm text-gray-400">Barre de progression par fichier</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Multi-fichiers</div>
                <div className="text-sm text-gray-400">Upload multiple avec limite configurable</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Gestion erreurs</div>
                <div className="text-sm text-gray-400">Messages d'erreur clairs et détaillés</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Exemple d'Utilisation</h2>
          <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
            <pre className="text-green-400 text-sm overflow-x-auto">
{`<FileUploader
  accept="image/*"
  multiple={true}
  maxSize={5 * 1024 * 1024}
  maxFiles={5}
  onUpload={async (files) => {
    // Votre logique d'upload
    await uploadToServer(files);
  }}
  onRemove={(fileId) => {
    // Nettoyer si nécessaire
  }}
  showPreview={true}
/>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
