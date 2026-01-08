import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { pipelineService, PIPELINE_STATUSES, PipelineStatus, CRMLead } from '@/lib/crm-pipeline';
import { PipelineCard } from '@/components/crm/PipelineCard';
import BackButton from './BackButton';
import { cn } from '@/lib/utils';

const CRMPipelineKanban: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kanbanData, setKanbanData] = useState<Record<PipelineStatus, CRMLead[]>>({} as any);
  const [search, setSearch] = useState('');
  const [draggedLead, setDraggedLead] = useState<CRMLead | null>(null);

  useEffect(() => {
    loadKanbanData();
  }, []);

  const loadKanbanData = async () => {
    setLoading(true);
    try {
      const data = await pipelineService.getKanbanData();
      setKanbanData(data);
    } catch (error) {
      console.error('Failed to load kanban:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (lead: CRMLead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStatus: PipelineStatus) => {
    if (!draggedLead) return;

    try {
      await pipelineService.updateLeadStatus(draggedLead.id, targetStatus);
      await loadKanbanData();
    } catch (error) {
      console.error('Failed to update lead:', error);
    } finally {
      setDraggedLead(null);
    }
  };

  const filteredKanbanData = React.useMemo(() => {
    if (!search) return kanbanData;

    const filtered: Record<PipelineStatus, CRMLead[]> = {} as any;
    Object.entries(kanbanData).forEach(([status, leads]) => {
      filtered[status as PipelineStatus] = leads.filter(lead =>
        lead.full_name.toLowerCase().includes(search.toLowerCase()) ||
        lead.email.toLowerCase().includes(search.toLowerCase()) ||
        lead.phone.includes(search)
      );
    });
    return filtered;
  }, [kanbanData, search]);

  const visibleStatuses: PipelineStatus[] = [
    'nouveau_lead',
    'contact_initial',
    'qualification',
    'devis_envoye',
    'negociation',
    'documents_attente',
    'documents_recus',
    'signature_attente',
    'paiement_attente',
    'production_cours',
    'contrat_actif'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded-xl mb-6"></div>
          <div className="flex gap-4 overflow-x-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-80 h-96 bg-gray-200 rounded-xl flex-shrink-0"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <BackButton />
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                Pipeline Kanban
              </h1>
              <p className="text-gray-600">Gestion visuelle du cycle de vie client</p>
            </div>
            <button
              onClick={() => navigate('/backoffice/crm-killer')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Nouveau Lead
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher un lead..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Filter size={20} />
              Filtres
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
          {visibleStatuses.map((status) => {
            const statusInfo = PIPELINE_STATUSES[status];
            const leads = filteredKanbanData[status] || [];

            return (
              <div
                key={status}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status)}
                className="w-80 flex-shrink-0"
              >
                <div className="bg-gray-100 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{statusInfo.icon}</span>
                      <h3 className="font-bold text-gray-900">{statusInfo.label}</h3>
                    </div>
                    <span className="bg-white px-2 py-1 rounded-full text-sm font-bold text-gray-700">
                      {leads.length}
                    </span>
                  </div>
                  {leads.length > 0 && (
                    <div className="text-xs text-gray-600">
                      Total: {leads.reduce((sum, l) => sum + (l.quality_score || 0), 0) / leads.length || 0}% qualité
                    </div>
                  )}
                </div>

                <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                  {leads.length === 0 ? (
                    <div className="bg-white/50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <p className="text-gray-500 text-sm">Glissez un lead ici</p>
                    </div>
                  ) : (
                    leads.map((lead) => (
                      <PipelineCard
                        key={lead.id}
                        lead={lead}
                        onClick={() => navigate(`/backoffice/crm-killer/lead/${lead.id}`)}
                        onDragStart={() => handleDragStart(lead)}
                        isDragging={draggedLead?.id === lead.id}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg border-2 border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Object.values(filteredKanbanData).reduce((sum, leads) => sum + leads.length, 0)}
            </div>
            <div className="text-xs text-gray-600">Total Leads</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {(filteredKanbanData['contrat_actif'] || []).length}
            </div>
            <div className="text-xs text-gray-600">Actifs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {(filteredKanbanData['documents_attente'] || []).length}
            </div>
            <div className="text-xs text-gray-600">En Attente</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMPipelineKanban;
