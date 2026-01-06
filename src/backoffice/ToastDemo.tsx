import { useState } from 'react';
import { Bell, Zap, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function ToastDemo() {
  const toast = useToast();
  const [customDuration, setCustomDuration] = useState(5000);

  const examples = [
    {
      title: 'Success',
      icon: CheckCircle,
      color: 'green',
      action: () => toast.showToast('Opération réussie!', 'success', 5000)
    },
    {
      title: 'Error',
      icon: XCircle,
      color: 'red',
      action: () => toast.showToast('Une erreur est survenue', 'error', 5000)
    },
    {
      title: 'Warning',
      icon: AlertTriangle,
      color: 'yellow',
      action: () => toast.showToast('Attention aux paramètres', 'warning', 5000)
    },
    {
      title: 'Info',
      icon: Info,
      color: 'blue',
      action: () => toast.showToast('Nouvelle mise à jour disponible', 'info', 5000)
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Bell className="w-10 h-10 text-blue-500" />
            Toast Notifications Demo
          </h1>
          <p className="text-gray-400 text-lg">
            Système de notifications avec toutes les options
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Types de Base
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {examples.map((example) => {
              const Icon = example.icon;
              return (
                <button
                  key={example.title}
                  onClick={example.action}
                  className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-6 text-left transition-all hover:scale-105 hover:shadow-2xl"
                >
                  <Icon className={`w-8 h-8 text-${example.color}-500 mb-3`} />
                  <h3 className="text-white font-semibold text-lg mb-1">
                    {example.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Afficher une notification {example.title.toLowerCase()}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-4">
            Durée Personnalisée
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-gray-400 text-sm mb-2">
                Durée (ms): {customDuration}
              </label>
              <input
                type="range"
                min="1000"
                max="30000"
                step="1000"
                value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <button
              onClick={() => toast.showToast(
                `Cette notification dure ${customDuration / 1000} secondes`,
                'success',
                customDuration
              )}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Tester
            </button>
          </div>
        </div>

        <div className="mt-8 bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-4">
            API Reference
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
              <code className="text-green-400 text-sm">
                toast.showToast(message, type, duration)
              </code>
              <p className="text-gray-400 text-sm mt-2">
                Affiche une notification avec un message, type et durée personnalisables
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
