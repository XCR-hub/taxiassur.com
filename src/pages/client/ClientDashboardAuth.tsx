import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Shield, CreditCard, User, LogOut, Bell,
  TrendingUp, Calendar, CheckCircle, Clock, AlertCircle,
  Phone, Mail, MapPin, Building
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ClientUnifiedDashboard from '@/components/client/ClientUnifiedDashboard';
import SEOHead from '@/components/SEOHead';

interface ClientData {
  id: string;
  email: string;
  last_login_at: string | null;
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address?: string;
    postal_code?: string;
    city?: string;
    company_name?: string;
    contract_number?: string;
    status: string;
  };
}

export default function ClientDashboardAuth() {
  const navigate = useNavigate();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'documents' | 'contrat' | 'sinistres' | 'profil'>('dashboard');

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate('/espace-client');
        return;
      }

      // Charger les données via la fonction RPC
      const { data, error: dataError } = await supabase
        .rpc('get_client_dashboard_data')
        .single();

      if (dataError) throw dataError;

      if (data && data.success) {
        setClientData({
          id: data.client.id,
          email: data.client.email,
          last_login_at: data.client.last_login_at,
          lead: data.lead,
        });
      } else {
        throw new Error(data?.error || 'Données introuvables');
      }
    } catch (err: any) {
      console.error('Erreur chargement données:', err);
      setError(err.message || 'Impossible de charger vos données');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/espace-client');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (error || !clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Erreur</h2>
          <p className="text-gray-300 mb-6">{error || 'Impossible de charger vos données'}</p>
          <button
            onClick={() => navigate('/espace-client')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  const { lead } = clientData;

  return (
    <>
      <SEOHead
        title="Mon Espace Client - TaxiAssur"
        description="Accédez à votre espace client sécurisé TaxiAssur"
        noindex
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        {/* Header */}
        <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Espace Client
                </h1>
                <p className="text-sm text-gray-400">
                  Bonjour {lead.first_name} {lead.last_name}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="bg-gray-900/30 backdrop-blur-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto">
              {[
                { id: 'dashboard', label: 'Tableau de bord', icon: TrendingUp },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'contrat', label: 'Contrat', icon: Shield },
                { id: 'sinistres', label: 'Sinistres', icon: AlertCircle },
                { id: 'profil', label: 'Profil', icon: User },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Info client */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Informations</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-gray-400">Nom complet</p>
                      <p className="text-white font-medium">
                        {lead.first_name} {lead.last_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="text-white font-medium">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-gray-400">Téléphone</p>
                      <p className="text-white font-medium">{lead.phone}</p>
                    </div>
                  </div>
                  {lead.company_name && (
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-400">Société</p>
                        <p className="text-white font-medium">{lead.company_name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contrat */}
              {lead.contract_number && (
                <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        Contrat actif
                      </h3>
                      <p className="text-gray-300 mb-1">
                        Numéro de contrat : <strong>{lead.contract_number}</strong>
                      </p>
                      <p className="text-sm text-gray-400">
                        Votre assurance est active et vous protège
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Utiliser le composant existant */}
              <ClientUnifiedDashboard leadId={lead.id} />
            </div>
          )}

          {activeTab === 'profil' && (
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Mon profil</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={lead.first_name}
                    disabled
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={lead.last_name}
                    disabled
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={lead.email}
                    disabled
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-200">
                    Pour modifier vos informations, contactez votre conseiller au 01 80 85 57 86
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'profil' && (
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
              <p className="text-gray-400">Section en cours de développement</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
