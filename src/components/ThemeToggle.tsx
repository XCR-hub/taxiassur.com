import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const icons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const labels = {
    light: 'Clair',
    dark: 'Sombre',
    system: 'Système',
  };

  const Icon = icons[theme];

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => {
          if (theme === 'light') setTheme('dark');
          else if (theme === 'dark') setTheme('system');
          else setTheme('light');
        }}
        className="group relative inline-flex items-center justify-center rounded-lg p-2 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label={`Thème actuel: ${labels[theme]}`}
        title={`Changer de thème (actuel: ${labels[theme]})`}
      >
        <Icon className="h-5 w-5 text-gray-700 dark:text-gray-300 transition-transform duration-200 group-hover:scale-110" />

        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
          {labels[theme]}
        </span>
      </button>
    </div>
  );
}

export function ThemeToggleExpanded() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', icon: Sun, label: 'Clair' },
    { value: 'dark', icon: Moon, label: 'Sombre' },
    { value: 'system', icon: Monitor, label: 'Système' },
  ] as const;

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
            theme === value
              ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
          aria-label={label}
          aria-pressed={theme === value}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
