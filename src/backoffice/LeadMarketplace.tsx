import React, { useState, useEffect } from 'react';
import { Users, Euro, Clock, Target, TrendingUp, Eye, Download, Filter, Calendar, Home } from 'lucide-react';
import AuthGuard from '../components/AuthGuard';
import Card from '../components/Card';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: 'taxi' | 'vtc' | 'autre';
  immatriculation?: string;
  createdAt: string;
  price: number;
  type: 'shared' | 'exclusive';
  sold: boolean;
  buyers: string[];
}

const LeadMarketplace: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: 'all',
    city: 'all',
    status: 'available',
    priceRange: 'all'
  });

  const [stats, setStats] = useState({
    totalLeads: 0,
    soldToday: 0,
    revenue: 0,
    avgPrice: 0
  });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      // Simulate lead data
      const mockLeads: Lead[] = [
        {
          id: 'lead-001',
          name: 'Jean D.',
          email: 'jean.d@email.com',
          phone: '06 12 34 56 78',
          city: 'Paris',
          status: 'taxi',
          immatriculation: 'AB-123-CD',
          createdAt: new Date().toISOString(),
          price: 70,
          type: 'exclusive',
          sold: false,
          buyers: []
        },
        {
          id: 'lead-002',
          name: 'Marie M.',
          email: 'marie.m@email.com',
          phone: '06 98 76 54 32',
          city: 'Lyon',
          status: 'taxi',
          createdAt: new Date(Date.now() - 300000).toISOString(),
          price: 20,
          type: 'shared',
          sold: false,
          buyers: []
        },
        {
          id: 'lead-003',
          name: 'Ahmed B.',
          email: 'ahmed.b@email.com',
          phone: '06 11 22 33 44',
          city: 'Marseille',
          status: 'vtc',
          createdAt: new Date(Date.now() - 600000).toISOString(),
          price: 70,
          type: 'exclusive',
          sold: true,
          buyers: ['courtier-abc']
        }
      ];

      setLeads(mockLeads);
      
      setStats({
        totalLeads: mockLeads.length,
        soldToday: mockLeads.filter(l => l.sold && new Date(l.createdAt).toDateString() === new Date().toDateString()).length,
        revenue: mockLeads.filter(l => l.sold).reduce((sum, l) => sum + l.price, 0),
        avgPrice: mockLeads.reduce((sum, l) => sum + l.price, 0) / mockLeads.length
      });
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (filter.type !== 'all' && lead.type !== filter.type) return false;
    if (filter.city !== 'all' && lead.city !== filter.city) return false;
    if (filter.status === 'available' && lead.sold) return false;
    if (filter.status === 'sold' && !lead.sold) return false;
    return true;
  });

  const buyLead = async (leadId: string) => {
    if (!confirm('Confirmer l\'achat de ce lead ?')) return;

    try {
      // Simulate purchase
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, sold: true, buyers: [...lead.buyers, 'current-user'] }
          : lead
      ));
      
      alert('✅ Lead acheté avec succès ! Vous recevrez les coordonnées par email.');
    } catch (error) {
      alert('❌ Erreur lors de l\'achat');
    }
  };

  const getLeadAge = (createdAt: string): string => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header with Home Button */}
        <header className="bg-white border-b-2 border-gray-200 shadow-sm mb-8">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Marketplace de Leads Taxi
                  </h1>
                  <p className="text-sm text-gray-600">
                    Achat de leads qualifiés pour courtiers partenaires
                  </p>
                </div>
              </div>
              
              <a
                href="/backoffice"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Home size={16} />
                <span>Accueil Backoffice</span>
              </a>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            
            <div className="text-sm text-gray-600">
              {filteredLeads.filter(l => !l.sold).length} leads disponibles
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="text-center bg-gradient-to-br from-blue-50 to-indigo-50">
              <Users className="mx-auto mb-2 text-blue-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.totalLeads}</div>
              <div className="text-sm text-gray-600">Leads totaux</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-50">
              <TrendingUp className="mx-auto mb-2 text-green-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.soldToday}</div>
              <div className="text-sm text-gray-600">Vendus aujourd'hui</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-purple-50 to-pink-50">
              <Euro className="mx-auto mb-2 text-purple-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.revenue}€</div>
              <div className="text-sm text-gray-600">CA total</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-amber-50 to-yellow-50">
              <Target className="mx-auto mb-2 text-amber-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{Math.round(stats.avgPrice)}€</div>
              <div className="text-sm text-gray-600">Prix moyen</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={filter.type}
                  onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous types</option>
                  <option value="shared">Partagés (20€)</option>
                  <option value="exclusive">Exclusifs (70€)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                <select
                  value={filter.city}
                  onChange={(e) => setFilter(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes villes</option>
                  <option value="Paris">Paris</option>
                  <option value="Lyon">Lyon</option>
                  <option value="Marseille">Marseille</option>
                  <option value="Toulouse">Toulouse</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filter.status}
                  onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Disponibles</option>
                  <option value="sold">Vendus</option>
                  <option value="all">Tous</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={loadLeads}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Actualiser
                </button>
              </div>
            </div>
          </Card>

          {/* Leads List */}
          <div className="space-y-4">
            {filteredLeads.map(lead => (
              <Card key={lead.id} hover className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {lead.name} - {lead.city}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        lead.type === 'exclusive' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {lead.type === 'exclusive' ? 'Exclusif' : 'Partagé'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        lead.sold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {lead.sold ? 'Vendu' : 'Disponible'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Statut :</span> {lead.status.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium">Âge :</span> {getLeadAge(lead.createdAt)}
                      </div>
                      {lead.immatriculation && (
                        <div>
                          <span className="font-medium">Immat :</span> {lead.immatriculation}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Prix :</span> 
                        <span className="text-lg font-bold text-amber-600 ml-1">{lead.price}€</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {!lead.sold ? (
                      <button
                        onClick={() => buyLead(lead.id)}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Acheter {lead.price}€
                      </button>
                    ) : (
                      <span className="text-red-600 font-medium">Vendu</span>
                    )}
                    
                    <button className="text-blue-600 hover:text-blue-800">
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredLeads.length === 0 && !loading && (
            <Card className="text-center py-12">
              <Users className="mx-auto mb-4 text-gray-600" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun lead disponible
              </h3>
              <p className="text-gray-600">
                Aucun lead ne correspond à vos critères actuels
              </p>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default LeadMarketplace;