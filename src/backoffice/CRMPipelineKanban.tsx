import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { pipelineService, PIPELINE_STATUSES, PipelineStatus, CRMLead } from '@/lib/crm-pipeline';
import { PipelineCard } from '@/components/crm/PipelineCard';
import BackButton from './BackButton';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const CRMPipelineKanban: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kanbanData, setKanbanData] = useState<Record<PipelineStatus, CRMLead[]>>({} as any);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [draggedLead, setDraggedLead] = useState<CRMLead | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [updateCount, setUpdateCount] = useState(0);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannel = useRef<any>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load kanban data
  const loadKanbanData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      const data = await pipelineService.getKanbanData();
      setKanbanData(data);
      setLastUpdate(new Date());
      setUpdateCount(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load kanban:', error);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadKanbanData();
  }, [loadKanbanData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    autoRefreshInterval.current = setInterval(() => {
      loadKanbanData(false);
    }, 30000);

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [loadKanbanData]);

  // Realtime subscription
  useEffect(() => {
    realtimeChannel.current = supabase
      .channel('crm_leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_leads'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          loadKanbanData(false);
        }
      )
      .subscribe();

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, [loadKanbanData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadKanbanData(false);
  }, [loadKanbanData]);

  const handleDragStart = useCallback((lead: CRMLead) => {
    setDraggedLead(lead);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedLead(null);
    setDragOverStatus(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: PipelineStatus) => {
    e.preventDefault();
    setDragOverStatus(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStatus(null);
  }, []);

  const handleDrop = useCallback(async (targetStatus: PipelineStatus) => {
    if (!draggedLead) return;

    const oldStatus = draggedLead.status;
    if (oldStatus === targetStatus) {
      setDraggedLead(null);
      setDragOverStatus(null);
      return;
    }

    // Optimistic update
    setKanbanData(prev => {
      const newData = { ...prev };

      if (newData[oldStatus]) {
        newData[oldStatus] = newData[oldStatus].filter(l => l.id !== draggedLead.id);
      }

      if (newData[targetStatus]) {
        newData[targetStatus] = [...newData[targetStatus], { ...draggedLead, status: targetStatus }];
      } else {
        newData[targetStatus] = [{ ...draggedLead, status: targetStatus }];
      }

      return newData;
    });

    setDraggedLead(null);
    setDragOverStatus(null);

    try {
      await pipelineService.updateLeadStatus(draggedLead.id, targetStatus);
    } catch (error) {
      console.error('Failed to update lead:', error);
      setError('Erreur lors de la mise à jour du lead');
      await loadKanbanData(false);
    }
  }, [draggedLead, loadKanbanData]);

  const filteredKanbanData = useMemo(() => {
    if (!debouncedSearch) return kanbanData;

    const filtered: Record<PipelineStatus, CRMLead[]> = {} as any;
    const searchLower = debouncedSearch.toLowerCase();

    Object.entries(kanbanData).forEach(([status, leads]) => {
      filtered[status as PipelineStatus] = leads.filter(lead =>
        lead.full_name?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.phone?.includes(debouncedSearch) ||
        lead.company_name?.toLowerCase().includes(searchLower) ||
        lead.city?.toLowerCase().includes(searchLower)
      );
    });
    return filtered;
  }, [kanbanData, debouncedSearch]);

  const visibleStatuses: PipelineStatus[] = [
    'NEW_LEAD',
    'CONTACT_ATTEMPTED',
    'CONTACT_CONFIRMED',
    'DOCUMENTS_REQUIRED',
    'DOCUMENTS_PARTIAL',
    'READY_FOR_QUOTE',
    'QUOTE_SENT',
    'SIGNATURE_PENDING',
    'SIGNED',
    'PAYMENT_PENDING',
    'ACTIVE_CLIENT',
    'LOST_RECONTACT_SCHEDULED'
  ];

  const statistics = useMemo(() => {
    const allLeads = Object.values(filteredKanbanData).flat();
    return {
      total: allLeads.length,
      active: (filteredKanbanData['ACTIVE_CLIENT'] || []).length,
      pending: (filteredKanbanData['DOCUMENTS_REQUIRED'] || []).length +
               (filteredKanbanData['DOCUMENTS_PARTIAL'] || []).length,
      newLeads: (filteredKanbanData['NEW_LEAD'] || []).length,
      avgQuality: allLeads.length > 0
        ? Math.round(allLeads.reduce((sum, l) => sum + (l.quality_score || 0), 0) / allLeads.length)
        : 0
    };
  }, [filteredKanbanData]);

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
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <BackButton to="/backoffice/crm" />
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                Pipeline Kanban
                {refreshing && (
                  <RefreshCw className="animate-spin text-blue-600" size={24} />
                )}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                <span>Gestion visuelle du cycle de vie client</span>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>Mis à jour: {lastUpdate.toLocaleTimeString('fr-FR')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                Actualiser
              </button>
              <button
                onClick={() => navigate('/backoffice/crm-killer')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Nouveau Lead
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone, entreprise ou ville..."
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

          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">
                Mise à jour automatique
              </span>
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{statistics.total}</span> leads
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{statistics.newLeads}</span> nouveaux
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-sm text-gray-600">
              Qualité moyenne: <span className="font-semibold">{statistics.avgQuality}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
          {visibleStatuses.map((status) => {
            const statusInfo = PIPELINE_STATUSES[status];
            const leads = filteredKanbanData[status] || [];
            const isDropTarget = dragOverStatus === status && draggedLead?.status !== status;

            return (
              <div
                key={status}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(status)}
                className={cn(
                  'w-80 flex-shrink-0 transition-all duration-200',
                  isDropTarget && 'scale-105'
                )}
              >
                {/* Column header */}
                <div className={cn(
                  'rounded-lg p-3 mb-3 transition-colors',
                  isDropTarget ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-100'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{statusInfo.icon}</span>
                      <h3 className="font-bold text-gray-900">{statusInfo.label}</h3>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded-full text-sm font-bold',
                      isDropTarget ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
                    )}>
                      {leads.length}
                    </span>
                  </div>
                  {leads.length > 0 && (
                    <div className="text-xs text-gray-600">
                      Qualité moyenne: {Math.round(leads.reduce((sum, l) => sum + (l.quality_score || 0), 0) / leads.length) || 0}%
                    </div>
                  )}
                </div>

                {/* Column content */}
                <div className={cn(
                  'space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 rounded-lg transition-all',
                  isDropTarget && 'bg-blue-50/50 p-2'
                )}>
                  {leads.length === 0 ? (
                    <div className={cn(
                      'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                      isDropTarget ? 'bg-blue-100 border-blue-400' : 'bg-white/50 border-gray-300'
                    )}>
                      <p className={cn(
                        'text-sm',
                        isDropTarget ? 'text-blue-700 font-medium' : 'text-gray-500'
                      )}>
                        {isDropTarget ? '↓ Déposez le lead ici' : 'Aucun lead'}
                      </p>
                    </div>
                  ) : (
                    leads.map((lead) => (
                      <PipelineCard
                        key={lead.id}
                        lead={lead}
                        onClick={() => navigate(`/backoffice/crm-killer/lead/${lead.id}`)}
                        onDragStart={() => handleDragStart(lead)}
                        onDragEnd={handleDragEnd}
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

      {/* Statistics panel */}
      <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg border-2 border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {statistics.total}
            </div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="w-px h-12 bg-gray-200"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {statistics.active}
            </div>
            <div className="text-xs text-gray-600">Actifs</div>
          </div>
          <div className="w-px h-12 bg-gray-200"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {statistics.pending}
            </div>
            <div className="text-xs text-gray-600">En Attente</div>
          </div>
          <div className="w-px h-12 bg-gray-200"></div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <TrendingUp size={16} className="text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">
                {statistics.avgQuality}%
              </div>
            </div>
            <div className="text-xs text-gray-600">Qualité</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMPipelineKanban;
