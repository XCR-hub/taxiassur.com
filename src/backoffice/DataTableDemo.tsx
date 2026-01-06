import { useState } from 'react';
import { Table, CheckCircle, XCircle, Clock, Mail, Phone, MapPin } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';

interface Lead {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  status: 'nouveau' | 'contacte' | 'converti' | 'perdu';
  score: number;
  date: string;
  source: string;
}

const mockLeads: Lead[] = [
  {
    id: '1',
    nom: 'Jean Dupont',
    email: 'jean.dupont@email.com',
    telephone: '06 12 34 56 78',
    ville: 'Paris',
    status: 'nouveau',
    score: 85,
    date: '2025-01-06',
    source: 'Site web'
  },
  {
    id: '2',
    nom: 'Marie Martin',
    email: 'marie.martin@email.com',
    telephone: '06 98 76 54 32',
    ville: 'Lyon',
    status: 'contacte',
    score: 92,
    date: '2025-01-05',
    source: 'Google Ads'
  },
  {
    id: '3',
    nom: 'Pierre Dubois',
    email: 'pierre.dubois@email.com',
    telephone: '06 45 67 89 01',
    ville: 'Marseille',
    status: 'converti',
    score: 95,
    date: '2025-01-04',
    source: 'Référencement'
  },
  {
    id: '4',
    nom: 'Sophie Bernard',
    email: 'sophie.bernard@email.com',
    telephone: '06 23 45 67 89',
    ville: 'Toulouse',
    status: 'perdu',
    score: 45,
    date: '2025-01-03',
    source: 'Facebook'
  },
  {
    id: '5',
    nom: 'Luc Petit',
    email: 'luc.petit@email.com',
    telephone: '06 78 90 12 34',
    ville: 'Nice',
    status: 'nouveau',
    score: 78,
    date: '2025-01-06',
    source: 'Site web'
  },
  {
    id: '6',
    nom: 'Claire Rousseau',
    email: 'claire.rousseau@email.com',
    telephone: '06 56 78 90 12',
    ville: 'Nantes',
    status: 'contacte',
    score: 88,
    date: '2025-01-05',
    source: 'LinkedIn'
  },
  {
    id: '7',
    nom: 'Thomas Moreau',
    email: 'thomas.moreau@email.com',
    telephone: '06 34 56 78 90',
    ville: 'Strasbourg',
    status: 'nouveau',
    score: 72,
    date: '2025-01-06',
    source: 'Google Ads'
  },
  {
    id: '8',
    nom: 'Julie Laurent',
    email: 'julie.laurent@email.com',
    telephone: '06 12 34 56 78',
    ville: 'Bordeaux',
    status: 'converti',
    score: 98,
    date: '2025-01-02',
    source: 'Référencement'
  },
  {
    id: '9',
    nom: 'Nicolas Simon',
    email: 'nicolas.simon@email.com',
    telephone: '06 90 12 34 56',
    ville: 'Lille',
    status: 'contacte',
    score: 81,
    date: '2025-01-05',
    source: 'Site web'
  },
  {
    id: '10',
    nom: 'Isabelle Michel',
    email: 'isabelle.michel@email.com',
    telephone: '06 78 90 12 34',
    ville: 'Rennes',
    status: 'nouveau',
    score: 69,
    date: '2025-01-06',
    source: 'Facebook'
  },
  {
    id: '11',
    nom: 'Alexandre Lefebvre',
    email: 'alex.lefebvre@email.com',
    telephone: '06 45 67 89 01',
    ville: 'Reims',
    status: 'perdu',
    score: 38,
    date: '2025-01-01',
    source: 'Google Ads'
  },
  {
    id: '12',
    nom: 'Camille Leroy',
    email: 'camille.leroy@email.com',
    telephone: '06 23 45 67 89',
    ville: 'Saint-Étienne',
    status: 'contacte',
    score: 86,
    date: '2025-01-04',
    source: 'LinkedIn'
  }
];

const statusConfig = {
  nouveau: {
    label: 'Nouveau',
    icon: Clock,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  contacte: {
    label: 'Contacté',
    icon: Mail,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10'
  },
  converti: {
    label: 'Converti',
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10'
  },
  perdu: {
    label: 'Perdu',
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10'
  }
};

export default function DataTableDemo() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const columns: Column<Lead>[] = [
    {
      key: 'nom',
      label: 'Nom',
      sortable: true,
      filterable: true,
      width: '200px',
      render: (value) => (
        <div className="font-semibold text-white">{value}</div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      filterable: true,
      render: (value) => (
        <div className="flex items-center gap-2 text-gray-400">
          <Mail className="w-4 h-4" />
          {value}
        </div>
      )
    },
    {
      key: 'telephone',
      label: 'Téléphone',
      filterable: true,
      render: (value) => (
        <div className="flex items-center gap-2 text-gray-400">
          <Phone className="w-4 h-4" />
          {value}
        </div>
      )
    },
    {
      key: 'ville',
      label: 'Ville',
      sortable: true,
      filterable: true,
      render: (value) => (
        <div className="flex items-center gap-2 text-gray-400">
          <MapPin className="w-4 h-4" />
          {value}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      filterable: true,
      width: '150px',
      render: (value: Lead['status']) => {
        const config = statusConfig[value];
        const Icon = config.icon;
        return (
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.bg}`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-sm font-semibold ${config.color}`}>
              {config.label}
            </span>
          </div>
        );
      }
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      width: '100px',
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                value >= 80 ? 'bg-green-500' :
                value >= 60 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-white w-8">{value}</span>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      width: '120px',
      render: (value) => (
        <div className="text-gray-400 text-sm">
          {new Date(value).toLocaleDateString('fr-FR')}
        </div>
      )
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      filterable: true,
      width: '130px',
      render: (value) => (
        <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
          {value}
        </span>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Table className="w-10 h-10 text-blue-500" />
            DataTable Avancé - Demo
          </h1>
          <p className="text-gray-400 text-lg">
            Tableau avec tri, recherche, filtres, pagination et export CSV
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Total Leads</div>
                <div className="text-3xl font-bold text-white">{mockLeads.length}</div>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Table className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Nouveaux</div>
                <div className="text-3xl font-bold text-blue-500">
                  {mockLeads.filter(l => l.status === 'nouveau').length}
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Contactés</div>
                <div className="text-3xl font-bold text-yellow-500">
                  {mockLeads.filter(l => l.status === 'contacte').length}
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm mb-1">Convertis</div>
                <div className="text-3xl font-bold text-green-500">
                  {mockLeads.filter(l => l.status === 'converti').length}
                </div>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <DataTable
          data={mockLeads}
          columns={columns}
          pageSize={10}
          searchable={true}
          exportable={true}
          onRowClick={(lead) => setSelectedLead(lead)}
          emptyMessage="Aucun lead trouvé"
        />

        {selectedLead && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Détails du Lead</h3>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Nom</div>
                    <div className="text-white font-semibold">{selectedLead.nom}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Email</div>
                    <div className="text-white">{selectedLead.email}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Téléphone</div>
                    <div className="text-white">{selectedLead.telephone}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Ville</div>
                    <div className="text-white">{selectedLead.ville}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Source</div>
                    <div className="text-white">{selectedLead.source}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Date</div>
                    <div className="text-white">
                      {new Date(selectedLead.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Statut</div>
                    <div className="text-white">{statusConfig[selectedLead.status].label}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Score</div>
                    <div className="text-white font-bold">{selectedLead.score}/100</div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors">
                    Contacter
                  </button>
                  <button className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors">
                    Modifier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Fonctionnalités</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Recherche globale</div>
                <div className="text-sm text-gray-400">Recherche dans toutes les colonnes</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Tri multi-colonnes</div>
                <div className="text-sm text-gray-400">Cliquez sur les en-têtes pour trier</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Filtres avancés</div>
                <div className="text-sm text-gray-400">Filtrage par colonne individuelle</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Pagination intelligente</div>
                <div className="text-sm text-gray-400">Navigation rapide entre les pages</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Export CSV</div>
                <div className="text-sm text-gray-400">Exportez les données filtrées</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Rendu personnalisé</div>
                <div className="text-sm text-gray-400">Cellules avec composants React</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
