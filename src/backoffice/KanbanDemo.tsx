import { useState } from 'react';
import { Layout, Plus, X, Save, Trash2, Filter, Users } from 'lucide-react';
import { KanbanBoard, KanbanColumn, KanbanCard } from '../components/KanbanBoard';

const initialColumns: KanbanColumn[] = [
  {
    id: 'nouveau',
    title: 'Nouveaux Leads',
    color: 'bg-blue-500',
    cards: [
      {
        id: '1',
        title: 'Jean Dupont - Taxi Paris',
        description: 'Demande de devis pour assurance taxi à Paris',
        assignee: 'Marie',
        priority: 'high',
        dueDate: '2025-01-08',
        tags: ['Paris', 'Urgent']
      },
      {
        id: '2',
        title: 'Sophie Martin - Flotte VTC',
        description: '5 véhicules à assurer',
        assignee: 'Pierre',
        priority: 'medium',
        dueDate: '2025-01-10',
        tags: ['Flotte', 'VTC']
      },
      {
        id: '3',
        title: 'Luc Bernard - Moto Taxi',
        description: 'Assurance moto taxi Lyon',
        assignee: 'Marie',
        priority: 'low',
        dueDate: '2025-01-12',
        tags: ['Lyon', 'Moto']
      }
    ]
  },
  {
    id: 'contact',
    title: 'En Contact',
    color: 'bg-yellow-500',
    cards: [
      {
        id: '4',
        title: 'Claire Rousseau - Taxi Marseille',
        description: 'Premier contact effectué, attente retour',
        assignee: 'Thomas',
        priority: 'medium',
        dueDate: '2025-01-09',
        tags: ['Marseille', 'Suivi']
      },
      {
        id: '5',
        title: 'Alexandre Petit - VTC Nice',
        description: 'Rendez-vous téléphonique prévu',
        assignee: 'Marie',
        priority: 'high',
        dueDate: '2025-01-08',
        tags: ['Nice', 'RDV']
      }
    ],
    limit: 5
  },
  {
    id: 'devis',
    title: 'Devis Envoyés',
    color: 'bg-purple-500',
    cards: [
      {
        id: '6',
        title: 'Isabelle Michel - Taxi Bordeaux',
        description: 'Devis envoyé le 05/01, relance prévue',
        assignee: 'Pierre',
        priority: 'medium',
        dueDate: '2025-01-11',
        tags: ['Bordeaux', 'Devis']
      },
      {
        id: '7',
        title: 'Nicolas Simon - Flotte Toulouse',
        description: '3 véhicules, devis personnalisé',
        assignee: 'Thomas',
        priority: 'high',
        dueDate: '2025-01-09',
        tags: ['Toulouse', 'Flotte']
      }
    ]
  },
  {
    id: 'negociation',
    title: 'Négociation',
    color: 'bg-orange-500',
    cards: [
      {
        id: '8',
        title: 'Marie Laurent - VTC Lyon',
        description: 'Discussion sur les garanties complémentaires',
        assignee: 'Marie',
        priority: 'high',
        dueDate: '2025-01-07',
        tags: ['Lyon', 'VTC', 'Négoc']
      }
    ],
    limit: 3
  },
  {
    id: 'gagne',
    title: 'Clients Gagnés',
    color: 'bg-green-500',
    cards: [
      {
        id: '9',
        title: 'Thomas Moreau - Taxi Lille',
        description: 'Contrat signé le 04/01/2025',
        assignee: 'Pierre',
        priority: 'low',
        dueDate: '2025-01-06',
        tags: ['Lille', 'Gagné']
      },
      {
        id: '10',
        title: 'Julie Lefebvre - VTC Paris',
        description: 'Contrat signé, paiement reçu',
        assignee: 'Thomas',
        priority: 'low',
        dueDate: '2025-01-05',
        tags: ['Paris', 'Gagné']
      }
    ]
  },
  {
    id: 'perdu',
    title: 'Perdus',
    color: 'bg-red-500',
    cards: [
      {
        id: '11',
        title: 'Camille Leroy - Taxi Nantes',
        description: 'Prix trop élevé selon le prospect',
        assignee: 'Marie',
        priority: 'low',
        dueDate: '2025-01-03',
        tags: ['Nantes', 'Prix']
      }
    ]
  }
];

export default function KanbanDemo() {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [showAddCard, setShowAddCard] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');

  const handleCardClick = (card: KanbanCard) => {
    setSelectedCard(card);
  };

  const handleCardDelete = (cardId: string, columnId: string) => {
    const newColumns = columns.map(col => {
      if (col.id === columnId) {
        return {
          ...col,
          cards: col.cards.filter(c => c.id !== cardId)
        };
      }
      return col;
    });
    setColumns(newColumns);
  };

  const handleCardAdd = (columnId: string) => {
    setShowAddCard(columnId);
  };

  const handleAddCardSubmit = () => {
    if (!newCardTitle.trim() || !showAddCard) return;

    const newCard: KanbanCard = {
      id: Date.now().toString(),
      title: newCardTitle,
      priority: 'medium',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    const newColumns = columns.map(col => {
      if (col.id === showAddCard) {
        return {
          ...col,
          cards: [...col.cards, newCard]
        };
      }
      return col;
    });

    setColumns(newColumns);
    setNewCardTitle('');
    setShowAddCard(null);
  };

  const allAssignees = Array.from(
    new Set(
      columns.flatMap(col =>
        col.cards.map(card => card.assignee).filter(Boolean)
      )
    )
  ) as string[];

  const filteredColumns = filterAssignee
    ? columns.map(col => ({
        ...col,
        cards: col.cards.filter(card => card.assignee === filterAssignee)
      }))
    : columns;

  const stats = {
    total: columns.reduce((sum, col) => sum + col.cards.length, 0),
    nouveau: columns.find(c => c.id === 'nouveau')?.cards.length || 0,
    contact: columns.find(c => c.id === 'contact')?.cards.length || 0,
    gagne: columns.find(c => c.id === 'gagne')?.cards.length || 0
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Layout className="w-10 h-10 text-blue-500" />
            Kanban Board - Gestion des Leads
          </h1>
          <p className="text-gray-400 text-lg">
            Glissez-déposez les cartes pour suivre l'avancement de vos prospects
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Total Leads</div>
                <div className="text-3xl font-bold text-white">{stats.total}</div>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Layout className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Nouveaux</div>
                <div className="text-3xl font-bold text-blue-500">{stats.nouveau}</div>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">En Contact</div>
                <div className="text-3xl font-bold text-yellow-500">{stats.contact}</div>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Gagnés</div>
                <div className="text-3xl font-bold text-green-500">{stats.gagne}</div>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Save className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Tous les assignés</option>
              {allAssignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
            {filterAssignee && (
              <button
                onClick={() => setFilterAssignee('')}
                className="text-sm text-red-500 hover:text-red-400"
              >
                Effacer le filtre
              </button>
            )}
          </div>
        </div>

        <KanbanBoard
          columns={filteredColumns}
          onColumnsChange={setColumns}
          onCardClick={handleCardClick}
          onCardDelete={handleCardDelete}
          onCardAdd={handleCardAdd}
        />

        {selectedCard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">{selectedCard.title}</h3>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedCard.description && (
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Description</div>
                    <div className="text-white">{selectedCard.description}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedCard.assignee && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Assigné à</div>
                      <div className="text-white font-semibold">{selectedCard.assignee}</div>
                    </div>
                  )}
                  {selectedCard.priority && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Priorité</div>
                      <div className="text-white font-semibold capitalize">{selectedCard.priority}</div>
                    </div>
                  )}
                  {selectedCard.dueDate && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Date limite</div>
                      <div className="text-white">
                        {new Date(selectedCard.dueDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selectedCard.tags && selectedCard.tags.length > 0 && (
                  <div>
                    <div className="text-gray-400 text-sm mb-2">Tags</div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedCard.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors">
                    Modifier
                  </button>
                  <button className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors">
                    Historique
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddCard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Ajouter une carte</h3>
                <button
                  onClick={() => setShowAddCard(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Titre</label>
                  <input
                    type="text"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder="Nom du lead..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddCardSubmit}
                    disabled={!newCardTitle.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => setShowAddCard(null)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Fonctionnalités Kanban</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Layout className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <div className="font-semibold text-white">Drag & Drop</div>
                <div className="text-sm text-gray-400">Déplacez les cartes entre les colonnes</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <div className="font-semibold text-white">Ajout rapide</div>
                <div className="text-sm text-gray-400">Créez de nouvelles cartes facilement</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Filter className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <div className="font-semibold text-white">Filtres</div>
                <div className="text-sm text-gray-400">Filtrez par assigné ou tags</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <div className="font-semibold text-white">Assignation</div>
                <div className="text-sm text-gray-400">Assignez des cartes aux membres</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <div className="font-semibold text-white">Suppression</div>
                <div className="text-sm text-gray-400">Supprimez les cartes obsolètes</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Save className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <div className="font-semibold text-white">Limites WIP</div>
                <div className="text-sm text-gray-400">Définissez des limites par colonne</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
