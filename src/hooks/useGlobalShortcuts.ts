import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useGlobalShortcuts(onSearchOpen?: () => void) {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'k',
      ctrl: true,
      action: () => onSearchOpen?.(),
      description: 'Recherche globale'
    },
    {
      key: 'd',
      ctrl: true,
      action: () => navigate('/backoffice/crm'),
      description: 'Dashboard CRM'
    },
    {
      key: 'n',
      ctrl: true,
      action: () => navigate('/backoffice/manual-lead'),
      description: 'Nouveau lead'
    },
    {
      key: 'p',
      ctrl: true,
      action: () => navigate('/backoffice/crm-killer/pipeline'),
      description: 'Pipeline Kanban'
    },
    {
      key: 'q',
      ctrl: true,
      action: () => navigate('/backoffice/quote-queue'),
      description: 'File de devis'
    },
    {
      key: 'g',
      ctrl: true,
      action: () => navigate('/backoffice/crm-gestion'),
      description: 'Portefeuille (gestion)'
    },
    {
      key: 'i',
      ctrl: true,
      action: () => navigate('/backoffice/crm-killer/inbox'),
      description: 'Inbox'
    },
    {
      key: 'h',
      ctrl: true,
      shift: true,
      action: () => navigate('/backoffice'),
      description: 'Accueil backoffice'
    }
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const matchedShortcut = shortcuts.find(shortcut => {
      const ctrlMatch = !shortcut.ctrl || (e.ctrlKey || e.metaKey);
      const shiftMatch = !shortcut.shift || e.shiftKey;
      const altMatch = !shortcut.alt || e.altKey;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      return ctrlMatch && shiftMatch && altMatch && keyMatch;
    });

    if (matchedShortcut) {
      e.preventDefault();
      matchedShortcut.action();
    }
  }, [shortcuts, onSearchOpen, navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const { shortcuts } = useGlobalShortcuts();

  const formatKey = (shortcut: ShortcutConfig) => {
    const keys: string[] = [];
    if (shortcut.ctrl) keys.push('Ctrl');
    if (shortcut.shift) keys.push('Shift');
    if (shortcut.alt) keys.push('Alt');
    keys.push(shortcut.key.toUpperCase());
    return keys.join(' + ');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Raccourcis Clavier</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-gray-400">✕</span>
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-700">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {formatKey(shortcut).split(' + ').map((key, i) => (
                  <span key={i}>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded shadow-sm">
                      {key}
                    </kbd>
                    {i < formatKey(shortcut).split(' + ').length - 1 && (
                      <span className="mx-1 text-gray-400">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Astuce :</strong> Utilisez <kbd className="px-2 py-0.5 text-xs font-semibold bg-white border border-blue-300 rounded">Ctrl + K</kbd> pour une recherche rapide dans tout le système !
          </p>
        </div>
      </div>
    </div>
  );
}
