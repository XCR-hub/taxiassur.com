import React, { useState } from 'react';
import { HelpCircle, X, ExternalLink, FileText, CheckCircle } from 'lucide-react';
import Card from './Card';

interface GuideLink {
  title: string;
  path: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
}

interface HelpPanelProps {
  title: string;
  description?: string;
  guides: GuideLink[];
  videoUrl?: string;
  quickActions?: Array<{
    label: string;
    action: () => void;
    icon?: React.ReactNode;
  }>;
}

const HelpPanel: React.FC<HelpPanelProps> = ({
  title,
  description,
  guides,
  videoUrl,
  quickActions
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-red-500 bg-red-50/10';
      case 'medium':
        return 'border-l-4 border-yellow-500 bg-yellow-50/10';
      case 'low':
        return 'border-l-4 border-yellow-500 bg-yellow-50/10';
      default:
        return 'border-l-4 border-gray-500 bg-gray-50/10';
    }
  };

  return (
    <>
      {/* Bouton d'aide flottant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-yellow-500 hover:bg-yellow-600 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110"
        title="Aide et Documentation"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <HelpCircle className="w-6 h-6" />
        )}
      </button>

      {/* Panel d'aide */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-h-[600px] overflow-hidden">
          <Card className="bg-slate-800 border-slate-700 shadow-2xl">
            {/* Header */}
            <div className="border-b border-slate-700 pb-4 mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-yellow-400" />
                {title}
              </h3>
              {description && (
                <p className="text-sm text-slate-300 mt-2">{description}</p>
              )}
            </div>

            {/* Quick Actions */}
            {quickActions && quickActions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">
                  Actions Rapides
                </h4>
                <div className="space-y-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm transition"
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Guides */}
            <div className="max-h-96 overflow-y-auto space-y-3">
              <h4 className="text-sm font-semibold text-slate-300 mb-2 sticky top-0 bg-slate-800 py-2">
                Guides Disponibles
              </h4>
              {guides.map((guide, index) => (
                <a
                  key={index}
                  href={guide.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-3 rounded-lg hover:bg-slate-700 transition ${getPriorityColor(guide.priority)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                        {guide.title}
                        {guide.priority === 'high' && (
                          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                            Important
                          </span>
                        )}
                      </h5>
                      <p className="text-xs text-slate-400 mt-1">
                        {guide.description}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                </a>
              ))}
            </div>

            {/* Video Tutorial */}
            {videoUrl && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">
                  Tutoriel Vidéo
                </h4>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-orange-700 text-white rounded-lg text-sm transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir la vidéo
                </a>
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <a
                href="/docs/guides/INDEX.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-yellow-400 hover:text-orange-300 transition"
              >
                <FileText className="w-4 h-4" />
                Voir toute la documentation
              </a>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default HelpPanel;
