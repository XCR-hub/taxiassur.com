import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useState } from 'react';

interface DocumentViewerProps {
  url: string;
  fileName: string;
  mimeType?: string;
  onClose: () => void;
}

export default function DocumentViewer({ url, fileName, mimeType, onClose }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const isPDF = mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isImage = mimeType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
      <div className="relative w-full h-full max-w-7xl max-h-screen bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {fileName}
            </h3>
            <p className="text-sm text-gray-600">
              {isPDF ? 'Document PDF' : isImage ? 'Image' : 'Document'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Zoom arrière"
                >
                  <ZoomOut className="h-5 w-5 text-gray-700" />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[50px] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Zoom avant"
                >
                  <ZoomIn className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Rotation"
                >
                  <RotateCw className="h-5 w-5 text-gray-700" />
                </button>
              </>
            )}

            <a
              href={url}
              download={fileName}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="font-medium">Télécharger</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center">
          {isPDF ? (
            <iframe
              src={url}
              className="w-full h-full bg-white rounded shadow-lg"
              title={fileName}
            />
          ) : isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img
                src={url}
                alt={fileName}
                className="max-w-full max-h-full object-contain shadow-lg rounded"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease'
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-white rounded-lg p-8 shadow-lg max-w-md mx-auto">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aperçu non disponible
                </h3>
                <p className="text-gray-600 mb-4">
                  Ce type de fichier ne peut pas être prévisualisé dans le navigateur.
                </p>
                <a
                  href={url}
                  download={fileName}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Download className="h-5 w-5" />
                  Télécharger le fichier
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer info for images */}
        {isImage && (
          <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
            <p className="text-sm text-gray-600">
              Utilisez les boutons de zoom et rotation pour ajuster l'affichage
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Import FileText for the fallback display
import { FileText } from 'lucide-react';
