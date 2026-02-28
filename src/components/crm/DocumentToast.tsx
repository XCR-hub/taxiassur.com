import { useEffect, useState } from 'react';
import { FileText, CheckCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export function useDocumentToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type };

    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return {
    toasts,
    showToast,
    removeToast
  };
}

interface DocumentToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function DocumentToastContainer({ toasts, onRemove }: DocumentToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 p-4 rounded-lg shadow-lg border-2 animate-slide-in-right
            ${toast.type === 'success' ? 'bg-green-50 border-green-200' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 border-blue-200' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : ''}
          `}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : (
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
          )}

          <p className="text-sm font-medium text-gray-900 flex-1">
            {toast.message}
          </p>

          <button
            onClick={() => onRemove(toast.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
