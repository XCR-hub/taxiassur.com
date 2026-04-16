import { useEffect, useCallback, useRef } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  callback: () => void;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      shortcutsRef.current.forEach((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatches = shortcut.meta ? event.metaKey : true;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.callback();
        }
      });
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
}

export function KeyboardShortcutsHelp({
  shortcuts,
}: {
  shortcuts: ShortcutConfig[];
}) {
  const formatShortcut = (shortcut: ShortcutConfig) => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('⌘');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Raccourcis clavier
      </h3>
      <div className="space-y-2">
        {shortcuts
          .filter((s) => s.description)
          .map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {shortcut.description}
              </span>
              <kbd className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                {formatShortcut(shortcut)}
              </kbd>
            </div>
          ))}
      </div>
    </div>
  );
}
