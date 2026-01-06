import { Info, HelpCircle, AlertCircle, CheckCircle, Star, Settings, User, Mail } from 'lucide-react';
import { TooltipAdvanced } from '../components/TooltipAdvanced';

export default function TooltipDemo() {
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Info className="w-10 h-10 text-blue-500" />
            Tooltips Avancés
          </h1>
          <p className="text-gray-400 text-lg">
            Tooltips intelligents avec positions automatiques et animations
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Positions</h2>
            <div className="flex items-center justify-center gap-32 min-h-[400px]">
              <div className="flex flex-col items-center gap-32">
                <TooltipAdvanced content="Tooltip en haut" position="top">
                  <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
                    Top
                  </button>
                </TooltipAdvanced>

                <TooltipAdvanced content="Tooltip à gauche" position="left">
                  <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
                    Left
                  </button>
                </TooltipAdvanced>
              </div>

              <div className="flex flex-col items-center gap-32">
                <TooltipAdvanced content="Tooltip en bas" position="bottom">
                  <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold">
                    Bottom
                  </button>
                </TooltipAdvanced>

                <TooltipAdvanced content="Tooltip à droite" position="right">
                  <button className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold">
                    Right
                  </button>
                </TooltipAdvanced>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Déclencheurs</h2>
            <div className="flex items-center justify-center gap-8">
              <TooltipAdvanced
                content="S'affiche au survol"
                trigger="hover"
                position="top"
              >
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Hover
                </button>
              </TooltipAdvanced>

              <TooltipAdvanced
                content="S'affiche au clic"
                trigger="click"
                position="top"
              >
                <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Click
                </button>
              </TooltipAdvanced>

              <TooltipAdvanced
                content="S'affiche au focus"
                trigger="focus"
                position="top"
              >
                <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Focus
                </button>
              </TooltipAdvanced>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Contenu Riche</h2>
            <div className="flex items-center justify-center gap-8">
              <TooltipAdvanced
                content={
                  <div className="space-y-2">
                    <div className="font-semibold text-blue-400">Information</div>
                    <div className="text-sm">Ce tooltip contient du HTML riche avec plusieurs éléments.</div>
                    <div className="pt-2 border-t border-gray-700 text-xs text-gray-400">
                      Astuce: Vous pouvez personnaliser tout le contenu
                    </div>
                  </div>
                }
                position="top"
                maxWidth="400px"
              >
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Info détaillée
                </button>
              </TooltipAdvanced>

              <TooltipAdvanced
                content={
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Succès
                    </div>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Configuration enregistrée</li>
                      <li>Email de confirmation envoyé</li>
                      <li>Synchronisation en cours</li>
                    </ul>
                  </div>
                }
                position="top"
                maxWidth="350px"
              >
                <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Liste à puces
                </button>
              </TooltipAdvanced>

              <TooltipAdvanced
                content={
                  <div className="space-y-3">
                    <div className="font-semibold text-purple-400">Utilisateur Premium</div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="text-sm">
                      Compte vérifié depuis 2 ans
                    </div>
                  </div>
                }
                position="top"
              >
                <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Badge utilisateur
                </button>
              </TooltipAdvanced>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Délais</h2>
            <div className="flex items-center justify-center gap-8">
              <TooltipAdvanced
                content="Apparaît instantanément"
                delay={0}
                position="top"
              >
                <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold">
                  0ms
                </button>
              </TooltipAdvanced>

              <TooltipAdvanced
                content="Apparaît après 200ms (défaut)"
                delay={200}
                position="top"
              >
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
                  200ms
                </button>
              </TooltipAdvanced>

              <TooltipAdvanced
                content="Apparaît après 500ms"
                delay={500}
                position="top"
              >
                <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
                  500ms
                </button>
              </TooltipAdvanced>

              <TooltipAdvanced
                content="Apparaît après 1000ms"
                delay={1000}
                position="top"
              >
                <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold">
                  1000ms
                </button>
              </TooltipAdvanced>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Cas d'Usage Réels</h2>

            <div className="space-y-6">
              <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                <h3 className="text-white font-semibold mb-4">Formulaire avec Aide</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                      Nom d'utilisateur
                      <TooltipAdvanced
                        content="Le nom d'utilisateur doit contenir entre 3 et 20 caractères alphanumériques"
                        position="right"
                      >
                        <HelpCircle className="w-4 h-4 text-gray-500 cursor-help" />
                      </TooltipAdvanced>
                    </label>
                    <input
                      type="text"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      placeholder="johndoe123"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                      Email
                      <TooltipAdvanced
                        content="Nous enverrons un email de confirmation à cette adresse"
                        position="right"
                      >
                        <Mail className="w-4 h-4 text-gray-500 cursor-help" />
                      </TooltipAdvanced>
                    </label>
                    <input
                      type="email"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                <h3 className="text-white font-semibold mb-4">Barre d'Actions</h3>
                <div className="flex items-center gap-2">
                  <TooltipAdvanced content="Paramètres du compte" position="bottom">
                    <button className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                      <Settings className="w-5 h-5 text-gray-400" />
                    </button>
                  </TooltipAdvanced>

                  <TooltipAdvanced content="Profil utilisateur" position="bottom">
                    <button className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                      <User className="w-5 h-5 text-gray-400" />
                    </button>
                  </TooltipAdvanced>

                  <TooltipAdvanced
                    content={
                      <div>
                        <div className="font-semibold mb-1">Messages (3)</div>
                        <div className="text-xs text-gray-400">Vous avez 3 nouveaux messages non lus</div>
                      </div>
                    }
                    position="bottom"
                  >
                    <button className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors relative">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
                  </TooltipAdvanced>

                  <TooltipAdvanced content="Aide et support" position="bottom">
                    <button className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                      <HelpCircle className="w-5 h-5 text-gray-400" />
                    </button>
                  </TooltipAdvanced>
                </div>
              </div>

              <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                <h3 className="text-white font-semibold mb-4">Statistiques avec Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Taux de conversion</span>
                      <TooltipAdvanced
                        content={
                          <div className="space-y-1">
                            <div className="font-semibold">Calcul du taux</div>
                            <div className="text-xs">Conversions / Visites × 100</div>
                            <div className="text-xs text-gray-400 pt-1 border-t border-gray-700">
                              Objectif: 3.5%
                            </div>
                          </div>
                        }
                        position="top"
                      >
                        <Info className="w-4 h-4 text-gray-500 cursor-help" />
                      </TooltipAdvanced>
                    </div>
                    <div className="text-2xl font-bold text-white">2.8%</div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Leads qualifiés</span>
                      <TooltipAdvanced
                        content="Leads ayant rempli au moins 80% du formulaire et ayant un score > 70"
                        position="top"
                        maxWidth="250px"
                      >
                        <Info className="w-4 h-4 text-gray-500 cursor-help" />
                      </TooltipAdvanced>
                    </div>
                    <div className="text-2xl font-bold text-white">147</div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Temps moyen</span>
                      <TooltipAdvanced
                        content="Durée moyenne entre le premier contact et la signature du contrat"
                        position="top"
                        maxWidth="250px"
                      >
                        <Info className="w-4 h-4 text-gray-500 cursor-help" />
                      </TooltipAdvanced>
                    </div>
                    <div className="text-2xl font-bold text-white">5.2j</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Fonctionnalités</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Positionnement intelligent</div>
                  <div className="text-sm text-gray-400">Ajustement automatique si débordement</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Contenu riche</div>
                  <div className="text-sm text-gray-400">Support complet HTML/JSX</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Déclencheurs multiples</div>
                  <div className="text-sm text-gray-400">Hover, click, focus</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Délai configurable</div>
                  <div className="text-sm text-gray-400">Contrôle du timing d'apparition</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Animations fluides</div>
                  <div className="text-sm text-gray-400">Fade-in smooth</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Flèche directionnelle</div>
                  <div className="text-sm text-gray-400">Pointe automatique vers l'élément</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
