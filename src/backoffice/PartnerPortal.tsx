import React, { useState, useEffect } from 'react';
import { Users, Euro, TrendingUp, Download, Calendar, Eye, CheckCircle, Clock, Home } from 'lucide-react';
import AuthGuard from '../components/AuthGuard';
import Card from '../components/Card';

interface PartnerStats {
  totalLeadsBought: number;
  monthlySpent: number;
  conversionRate: number;
  avgLeadPrice: number;
  leadsThisMonth: number;
  revenue: number;
}

interface PurchasedLead {
  id: string;
  leadData: {
    name: string;
    email: string;
    phone: string;
    city: string;
    status: string;
    immatriculation?: string;
  };
  purchasedAt: string;
  price: number;
  type: 'shared' | 'exclusive';
  converted: boolean;
  notes?: string;
}

const PartnerPortal: React.FC = () => {
  const [stats, setStats] = useState<PartnerStats>({
    totalLeadsBought: 0,
    monthlySpent: 0,
    conversionRate: 0,
    avgLeadPrice: 0,
    leadsThisMonth: 0,
    revenue: 0
  });

  const [purchasedLeads, setPurchasedLeads] = useState<PurchasedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadPartnerData();
  }, [selectedPeriod]);

  const loadPartnerData = async () => {
    setLoading(true);
    try {
      // Simulate partner data
      const mockStats: PartnerStats = {
        totalLeadsBought: 45,
        monthlySpent: 2100,
        conversionRate: 68,
        avgLeadPrice: 47,
        leadsThisMonth: 12,
        revenue: 15600
      };

      const mockLeads: PurchasedLead[] = [
        {
          id: 'purchase-001',
          leadData: {
            name: 'Jean Dupont',
            email: 'jean.dupont@email.com',
            phone: '06 12 34 56 78',
            city: 'Paris',
            status: 'taxi',
            immatriculation: 'AB-123-CD'
          },
          purchasedAt: new Date().toISOString(),
          price: 70,
          type: 'exclusive',
          converted: false
        },
        {
          id: 'purchase-002',
          leadData: {
            name: 'Marie Martin',
            email: 'marie.martin@email.com',
            phone: '06 98 76 54 32',
            city: 'Lyon',
            status: 'taxi'
          },
          purchasedAt: new Date(Date.now() - 86400000).toISOString(),
          price: 20,
          type: 'shared',
          converted: true,
          notes: 'Client signé - Police n° TX123456'
        }
      ];

      setStats(mockStats);
      setPurchasedLeads(mockLeads);
    } catch (error) {
      console.error('Failed to load partner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsConverted = async (leadId: string, notes: string) => {
    try {
      setPurchasedLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, converted: true, notes }
          : lead
      ));
      
      alert('✅ Lead marqué comme converti');
    } catch (error) {
      alert('❌ Erreur lors de la mise à jour');
    }
  };

  const exportLeads = () => {
    const csvContent = [
      ['Date', 'Nom', 'Email', 'Téléphone', 'Ville', 'Statut', 'Prix', 'Type', 'Converti'].join(','),
      ...purchasedLeads.map(lead => [
        new Date(lead.purchasedAt).toLocaleDateString('fr-FR'),
        lead.leadData.name,
        lead.leadData.email,
        lead.leadData.phone,
        lead.leadData.city,
        lead.leadData.status,
        lead.price,
        lead.type,
        lead.converted ? 'Oui' : 'Non'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-taxiassur-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
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
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Portail Partenaire Courtier
                  </h1>
                  <p className="text-sm text-gray-600">
                    Gestion de vos achats de leads et statistiques
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
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="90d">90 derniers jours</option>
              </select>
              
              <button
                onClick={exportLeads}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Partner Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="text-center bg-gradient-to-br from-blue-50 to-indigo-50">
              <Users className="mx-auto mb-2 text-blue-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.totalLeadsBought}</div>
              <div className="text-sm text-gray-600">Leads achetés</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-50">
              <Euro className="mx-auto mb-2 text-green-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.monthlySpent}€</div>
              <div className="text-sm text-gray-600">Dépenses mensuelles</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-purple-50 to-pink-50">
              <TrendingUp className="mx-auto mb-2 text-purple-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</div>
              <div className="text-sm text-gray-600">Taux conversion</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-amber-50 to-yellow-50">
              <Calendar className="mx-auto mb-2 text-amber-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.revenue}€</div>
              <div className="text-sm text-gray-600">CA généré</div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 text-center">
              <h3 className="font-bold text-gray-900 mb-4">Acheter des Leads</h3>
              <a 
                href="/backoffice/lead-marketplace"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Accéder au Marketplace
              </a>
            </Card>

            <Card className="p-6 text-center">
              <h3 className="font-bold text-gray-900 mb-4">Mes Statistiques</h3>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
                Voir Détails
              </button>
            </Card>

            <Card className="p-6 text-center">
              <h3 className="font-bold text-gray-900 mb-4">Support Partenaire</h3>
              <a 
                href="mailto:partenaires@taxiassur.com"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Contacter Support
              </a>
            </Card>
          </div>

          {/* Recent Purchases */}
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Leads Achetés Récemment
              </h3>
              <span className="text-sm text-gray-600">
                {purchasedLeads.length} leads
              </span>
            </div>
            
            <div className="space-y-4">
              {purchasedLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {lead.leadData.name} - {lead.leadData.city}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        lead.type === 'exclusive' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {lead.type === 'exclusive' ? 'Exclusif' : 'Partagé'}
                      </span>
                      {lead.converted && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Converti
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Acheté le {new Date(lead.purchasedAt).toLocaleDateString('fr-FR')} • {lead.price}€
                    </div>
                    
                    {lead.notes && (
                      <div className="text-sm text-gray-700 mt-2 italic">
                        {lead.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!lead.converted && (
                      <button
                        onClick={() => {
                          const notes = prompt('Notes sur la conversion (optionnel) :');
                          if (notes !== null) {
                            markAsConverted(lead.id, notes);
                          }
                        }}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Marquer converti
                      </button>
                    )}
                    
                    <button className="text-blue-600 hover:text-blue-800">
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
};

export default PartnerPortal;