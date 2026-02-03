import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Briefcase, FileText, MessageSquare, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface Lead {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  lead_score?: number;
  current_stage_key?: string;
  notes?: string;
  company_name?: string;
  vehicle_type?: string;
  immatriculation?: string;
}

const CRMLeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (leadId) {
      loadLeadData();
    }
  }, [leadId]);

  const loadLeadData = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchError) {
        logger.error('Error loading lead:', fetchError);
        setError('Impossible de charger les données du lead');
        return;
      }

      setLead(data);
    } catch (err) {
      logger.error('Error:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error || 'Lead introuvable'}</p>
          <button
            onClick={() => navigate('/backoffice/crm-killer/pipeline')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour au pipeline
          </button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'nouveau_lead': 'bg-blue-100 text-blue-800',
    'en_cours_de_traitement': 'bg-yellow-100 text-yellow-800',
    'documents_en_attente': 'bg-orange-100 text-orange-800',
    'devis_envoye': 'bg-purple-100 text-purple-800',
    'won': 'bg-green-100 text-green-800',
    'lost': 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/backoffice/crm-killer/pipeline')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Retour au pipeline
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {lead.first_name || lead.last_name
                    ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                    : 'Lead sans nom'}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {lead.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {lead.email}
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {lead.phone}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusColors[lead.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {lead.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {lead.city && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-500">Ville</div>
                  <div className="text-gray-900">{lead.city}</div>
                </div>
              </div>
            )}

            {lead.company_name && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-500">Société</div>
                  <div className="text-gray-900">{lead.company_name}</div>
                </div>
              </div>
            )}

            {lead.vehicle_type && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-500">Type de véhicule</div>
                  <div className="text-gray-900">{lead.vehicle_type}</div>
                </div>
              </div>
            )}

            {lead.immatriculation && (
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-500">Immatriculation</div>
                  <div className="text-gray-900">{lead.immatriculation}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-500">Créé le</div>
                <div className="text-gray-900">
                  {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>

            {lead.lead_score && (
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-500">Score</div>
                  <div className="text-gray-900">{lead.lead_score}/100</div>
                </div>
              </div>
            )}
          </div>

          {lead.notes && (
            <div className="p-6 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 mb-2">Notes</div>
                  <div className="text-gray-900 whitespace-pre-wrap">{lead.notes}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-gray-500 text-sm">
          Interface détaillée en cours de développement
        </div>
      </div>
    </div>
  );
};

export default CRMLeadDetail;
