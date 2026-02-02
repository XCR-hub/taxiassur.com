import { useState, useEffect } from 'react';
import { Search, Keyboard, HelpCircle } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import { useGlobalShortcuts, ShortcutsPanel } from '@/hooks/useGlobalShortcuts';
import ContextualTooltip from './ContextualTooltip';

interface BackofficeWrapperProps {
  children: React.ReactNode;
}

export default function BackofficeWrapper({ children }: BackofficeWrapperProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useGlobalShortcuts(() => setSearchOpen(true));

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('backoffice_welcome_seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const dismissWelcome = () => {
    localStorage.setItem('backoffice_welcome_seen', 'true');
    setShowWelcome(false);
  };

  return (
    <>
      {children}

      {/* Search Trigger Button (hidden but accessible via data attribute) */}
      <button
        data-search-trigger
        onClick={() => setSearchOpen(true)}
        className="hidden"
        aria-label="Ouvrir la recherche"
      />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {/* Search Button */}
        <ContextualTooltip content="Recherche globale (Ctrl+K)" position="left" type="tip">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 group"
            aria-label="Recherche globale"
          >
            <Search className="w-6 h-6" />
          </button>
        </ContextualTooltip>

        {/* Shortcuts Button */}
        <ContextualTooltip content="Raccourcis clavier" position="left" type="help">
          <button
            onClick={() => setShortcutsOpen(true)}
            className="p-4 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110"
            aria-label="Raccourcis clavier"
          >
            <Keyboard className="w-6 h-6" />
          </button>
        </ContextualTooltip>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Shortcuts Panel */}
      {shortcutsOpen && <ShortcutsPanel onClose={() => setShortcutsOpen(false)} />}

      {/* Welcome Banner */}
      {showWelcome && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 max-w-2xl w-full mx-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-2xl p-6 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Bienvenue dans le Backoffice TaxiAssur !</h3>
              <p className="text-blue-100 mb-4">
                Découvrez les nouveautés pour une gestion encore plus efficace :
              </p>
              <ul className="space-y-2 text-sm text-blue-50">
                <li className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span><strong>Recherche instantanée</strong> avec Ctrl+K</span>
                </li>
                <li className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4" />
                  <span><strong>Raccourcis clavier</strong> pour gagner du temps</span>
                </li>
                <li className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span><strong>Tooltips contextuels</strong> pour vous guider</span>
                </li>
              </ul>
            </div>
            <button
              onClick={dismissWelcome}
              className="text-white/80 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                setShortcutsOpen(true);
                dismissWelcome();
              }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
            >
              Voir les raccourcis
            </button>
            <button
              onClick={dismissWelcome}
              className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
            >
              Compris !
            </button>
          </div>
        </div>
      )}
    </>
  );
}
