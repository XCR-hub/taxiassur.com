import { useState } from 'react';
import {
  Layout, Settings, User, Mail, Bell, Shield, FileText, CreditCard,
  Home, Briefcase, Calendar, MessageSquare, HelpCircle, AlertCircle,
  CheckCircle, Info, Star, Zap, Target, TrendingUp
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/Tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/Accordion';
import { Modal, ModalFooter } from '../components/Modal';
import { Badge, StatusBadge, CountBadge } from '../components/Badge';

export default function UIComponentsDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState(['React', 'TypeScript', 'Tailwind']);

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Layout className="w-10 h-10 text-blue-500" />
            Composants UI Avancés
          </h1>
          <p className="text-gray-400 text-lg">
            Tabs, Accordion, Modal, Badge et plus encore
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Tabs Horizontaux</h2>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview" icon={<Home className="w-4 h-4" />}>
                  Vue d'ensemble
                </TabsTrigger>
                <TabsTrigger value="stats" icon={<TrendingUp className="w-4 h-4" />} badge={24}>
                  Statistiques
                </TabsTrigger>
                <TabsTrigger value="settings" icon={<Settings className="w-4 h-4" />}>
                  Paramètres
                </TabsTrigger>
                <TabsTrigger value="team" icon={<User className="w-4 h-4" />} badge="3 nouveaux">
                  Équipe
                </TabsTrigger>
                <TabsTrigger value="disabled" disabled>
                  Désactivé
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4">Vue d'ensemble du projet</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                      <div className="text-gray-400 text-sm mb-1">Leads totaux</div>
                      <div className="text-3xl font-bold text-white">1,247</div>
                      <div className="text-green-500 text-sm mt-1">+12% ce mois</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                      <div className="text-gray-400 text-sm mb-1">Taux de conversion</div>
                      <div className="text-3xl font-bold text-white">3.2%</div>
                      <div className="text-green-500 text-sm mt-1">+0.4% ce mois</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                      <div className="text-gray-400 text-sm mb-1">Chiffre d'affaires</div>
                      <div className="text-3xl font-bold text-white">€45.2K</div>
                      <div className="text-green-500 text-sm mt-1">+8% ce mois</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stats">
                <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4">Statistiques détaillées</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Nouveaux leads', value: 24, color: 'bg-blue-500' },
                      { label: 'Leads qualifiés', value: 18, color: 'bg-green-500' },
                      { label: 'En négociation', value: 12, color: 'bg-yellow-500' },
                      { label: 'Convertis', value: 8, color: 'bg-purple-500' }
                    ].map((stat, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400">{stat.label}</span>
                          <span className="text-white font-bold">{stat.value}</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${stat.color}`}
                            style={{ width: `${(stat.value / 24) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4">Paramètres du compte</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Nom complet</label>
                      <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                        defaultValue="Jean Dupont"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Email</label>
                      <input
                        type="email"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                        defaultValue="jean@example.com"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="team">
                <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4">Membres de l'équipe</h3>
                  <div className="space-y-3">
                    {['Marie Dupont', 'Pierre Martin', 'Sophie Bernard'].map((name, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-900 rounded-lg p-4 border border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{name}</div>
                            <StatusBadge status="online" size="sm" />
                          </div>
                        </div>
                        <Badge variant="primary">Admin</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Tabs Verticaux</h2>
            <Tabs defaultValue="account" orientation="vertical">
              <TabsList>
                <TabsTrigger value="account" icon={<User className="w-4 h-4" />}>
                  Compte
                </TabsTrigger>
                <TabsTrigger value="notifications" icon={<Bell className="w-4 h-4" />} badge={5}>
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="security" icon={<Shield className="w-4 h-4" />}>
                  Sécurité
                </TabsTrigger>
                <TabsTrigger value="billing" icon={<CreditCard className="w-4 h-4" />}>
                  Facturation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="account">
                <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4">Informations du compte</h3>
                  <p className="text-gray-400">Gérez vos informations personnelles et préférences de compte.</p>
                </div>
              </TabsContent>

              <TabsContent value="notifications">
                <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4">Préférences de notification</h3>
                  <div className="space-y-3">
                    {['Nouveaux leads', 'Mentions', 'Messages', 'Rappels', 'Mises à jour'].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-gray-400">{item}</span>
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security">
                <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4">Paramètres de sécurité</h3>
                  <p className="text-gray-400 mb-4">Protégez votre compte avec une authentification à deux facteurs.</p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    Activer 2FA
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="billing">
                <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4">Facturation et abonnement</h3>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400">Plan actuel</span>
                      <Badge variant="success">Premium</Badge>
                    </div>
                    <div className="text-2xl font-bold text-white">€49/mois</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Accordion - Simple</h2>
            <Accordion type="single" defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger value="item-1" icon={<HelpCircle className="w-5 h-5" />}>
                  Comment fonctionne l'assurance taxi ?
                </AccordionTrigger>
                <AccordionContent value="item-1">
                  L'assurance taxi est une protection spécifique pour les chauffeurs de taxi professionnels.
                  Elle couvre les dommages causés aux passagers, aux tiers ainsi qu'au véhicule lui-même.
                  Cette assurance est obligatoire pour exercer l'activité de taxi en France.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger value="item-2" icon={<CreditCard className="w-5 h-5" />}>
                  Quelles sont les garanties incluses ?
                </AccordionTrigger>
                <AccordionContent value="item-2">
                  Nos formules incluent : responsabilité civile, protection juridique, garantie conducteur,
                  bris de glace, vol et incendie, assistance 24/7, véhicule de remplacement.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger value="item-3" icon={<FileText className="w-5 h-5" />}>
                  Quels documents sont nécessaires ?
                </AccordionTrigger>
                <AccordionContent value="item-3">
                  Documents requis : carte grise du véhicule, permis de conduire, carte professionnelle de taxi,
                  attestation d'assurance précédente, RIB pour le prélèvement automatique.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Accordion - Multiple</h2>
            <Accordion type="multiple" defaultValue={['faq-1', 'faq-2']}>
              <AccordionItem value="faq-1">
                <AccordionTrigger value="faq-1" icon={<Briefcase className="w-5 h-5" />}>
                  Services inclus
                </AccordionTrigger>
                <AccordionContent value="faq-1">
                  <ul className="list-disc list-inside space-y-2">
                    <li>Assistance routière 24/7</li>
                    <li>Véhicule de remplacement</li>
                    <li>Protection juridique complète</li>
                    <li>Garantie conducteur</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-2">
                <AccordionTrigger value="faq-2" icon={<Target className="w-5 h-5" />}>
                  Processus de souscription
                </AccordionTrigger>
                <AccordionContent value="faq-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Remplir le formulaire en ligne (5 min)</li>
                    <li>Recevoir votre devis instantané</li>
                    <li>Valider et signer électroniquement</li>
                    <li>Recevoir votre attestation par email</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-3">
                <AccordionTrigger value="faq-3" icon={<MessageSquare className="w-5 h-5" />}>
                  Support client
                </AccordionTrigger>
                <AccordionContent value="faq-3">
                  Notre équipe est disponible du lundi au vendredi de 9h à 19h.
                  Contactez-nous par téléphone, email ou chat en ligne pour toute question.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Modals</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Ouvrir Modal Standard
              </button>
              <button
                onClick={() => setIsConfirmModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Ouvrir Modal Confirmation
              </button>
              <button
                onClick={() => setIsFullModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Ouvrir Modal Plein Écran
              </button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Badges</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Variants</h3>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="danger">Danger</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Tailles</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge size="sm" variant="primary">Small</Badge>
                  <Badge size="md" variant="primary">Medium</Badge>
                  <Badge size="lg" variant="primary">Large</Badge>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Avec Icônes</h3>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="success" icon={<CheckCircle className="w-3 h-3" />}>Validé</Badge>
                  <Badge variant="warning" icon={<AlertCircle className="w-3 h-3" />}>En attente</Badge>
                  <Badge variant="danger" icon={<AlertCircle className="w-3 h-3" />}>Erreur</Badge>
                  <Badge variant="info" icon={<Info className="w-3 h-3" />}>Information</Badge>
                  <Badge variant="primary" icon={<Star className="w-3 h-3" />}>Premium</Badge>
                  <Badge variant="primary" icon={<Zap className="w-3 h-3" />}>Rapide</Badge>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Badges Arrondis</h3>
                <div className="flex flex-wrap gap-3">
                  <Badge rounded variant="primary">React</Badge>
                  <Badge rounded variant="success">TypeScript</Badge>
                  <Badge rounded variant="info">Tailwind</Badge>
                  <Badge rounded variant="warning">Beta</Badge>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Badges Supprimables</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedTags.map(tag => (
                    <Badge
                      key={tag}
                      rounded
                      variant="primary"
                      removable
                      onRemove={() => handleRemoveTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Status Badges</h3>
                <div className="flex flex-wrap gap-4">
                  <StatusBadge status="online" />
                  <StatusBadge status="offline" />
                  <StatusBadge status="away" />
                  <StatusBadge status="busy" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Count Badges</h3>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="relative">
                    <Mail className="w-6 h-6 text-gray-400" />
                    <span className="absolute -top-2 -right-2">
                      <CountBadge count={5} />
                    </span>
                  </div>
                  <div className="relative">
                    <Bell className="w-6 h-6 text-gray-400" />
                    <span className="absolute -top-2 -right-2">
                      <CountBadge count={12} variant="danger" />
                    </span>
                  </div>
                  <div className="relative">
                    <MessageSquare className="w-6 h-6 text-gray-400" />
                    <span className="absolute -top-2 -right-2">
                      <CountBadge count={150} max={99} variant="danger" />
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Badges Pulsants</h3>
                <div className="flex flex-wrap gap-3">
                  <Badge pulse variant="danger">Nouveau</Badge>
                  <Badge pulse variant="warning">Urgent</Badge>
                  <Badge pulse variant="success">En direct</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Détails du Lead"
        description="Informations complètes sur ce prospect"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Nom</label>
              <div className="text-white font-semibold">Jean Dupont</div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Email</label>
              <div className="text-white font-semibold">jean@example.com</div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Téléphone</label>
              <div className="text-white font-semibold">06 12 34 56 78</div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Ville</label>
              <div className="text-white font-semibold">Paris</div>
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Message</label>
            <div className="text-white bg-gray-950 rounded-lg p-4 border border-gray-800">
              Je souhaite obtenir un devis pour une assurance taxi. J'ai 3 véhicules à assurer.
            </div>
          </div>
        </div>
        <ModalFooter>
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
          >
            Annuler
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Contacter
          </button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirmer la suppression"
        description="Cette action est irréversible"
        size="sm"
      >
        <div className="text-gray-400 mb-4">
          Êtes-vous sûr de vouloir supprimer ce lead ? Toutes les données associées seront perdues.
        </div>
        <ModalFooter>
          <button
            onClick={() => setIsConfirmModalOpen(false)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
          >
            Annuler
          </button>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
            Supprimer
          </button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={isFullModalOpen}
        onClose={() => setIsFullModalOpen(false)}
        title="Rapport Détaillé"
        size="full"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                <div className="text-gray-400 text-sm mb-1">Métrique {idx + 1}</div>
                <div className="text-2xl font-bold text-white">{Math.floor(Math.random() * 1000)}</div>
              </div>
            ))}
          </div>
          <div className="bg-gray-950 rounded-lg p-6 border border-gray-800 h-96 flex items-center justify-center">
            <div className="text-gray-500">Graphique détaillé ici</div>
          </div>
        </div>
        <ModalFooter>
          <button
            onClick={() => setIsFullModalOpen(false)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
          >
            Fermer
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Exporter PDF
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
