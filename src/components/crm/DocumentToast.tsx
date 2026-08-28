import { useEffect, useState } from 'react';
import { FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export function useDocumentToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type };

    setToasts(prev => [...prev, newToast]);
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
            ${toast.type === 'success' ? 'bg-emerald-700 border-emerald-400 text-white' : ''}
            ${toast.type === 'info' ? 'bg-blue-700 border-blue-400 text-white' : ''}
            ${toast.type === 'warning' ? 'bg-amber-500 border-amber-200 text-gray-950' : ''}
            ${toast.type === 'error' ? 'bg-red-700 border-red-400 text-white' : ''}
          `}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-white flex-shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-white flex-shrink-0" />
          ) : (
            <FileText className="h-5 w-5 flex-shrink-0" />
          )}

          <p className="text-sm font-semibold text-current flex-1">
            {toast.message}
          </p>

          <button
            onClick={() => onRemove(toast.id)}
            className="text-current opacity-80 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
