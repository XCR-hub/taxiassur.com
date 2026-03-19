import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw, AlertCircle, TrendingUp, Clock, Zap } from 'lucide-react';
import { pipelineService, PIPELINE_STATUSES, PipelineStatus, CRMLead } from '@/lib/crm-pipeline';
import { PipelineCard } from '@/components/crm/PipelineCard';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const CRMPipelineKanbanOptimized: React.FC = () => {
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannel = useRef<any>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load kanban data with error handling
  const loadKanbanData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      const data = await pipelineService.getKanbanData();
      setKanbanData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load kanban:', error);
      setError('Erreur lors du chargement. Cliquez sur Actualiser pour réessayer.');
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
      .channel('crm_leads_pipeline_changes')
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
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedLead(null);
    setDragOverStatus(null);
    document.body.style.cursor = '';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: PipelineStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  }, [dragOverStatus]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      setDragOverStatus(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: PipelineStatus) => {
    e.preventDefault();

    if (!draggedLead) {
      setDragOverStatus(null);
      return;
    }

    const oldStatus = draggedLead.status;
    if (oldStatus === targetStatus) {
      setDraggedLead(null);
      setDragOverStatus(null);
      document.body.style.cursor = '';
      return;
    }

    const updatedLead = { ...draggedLead, status: targetStatus };
    const oldStatusLabel = PIPELINE_STATUSES[oldStatus].label;
    const newStatusLabel = PIPELINE_STATUSES[targetStatus].label;

    // Optimistic update
    setKanbanData(prev => {
      const newData = { ...prev };

      if (newData[oldStatus]) {
        newData[oldStatus] = newData[oldStatus].filter(l => l.id !== draggedLead.id);
      }

      if (newData[targetStatus]) {
        newData[targetStatus] = [updatedLead, ...newData[targetStatus]];
      } else {
        newData[targetStatus] = [updatedLead];
      }

      return newData;
    });

    setDraggedLead(null);
    setDragOverStatus(null);
    document.body.style.cursor = '';

    // Update on server
    const result = await pipelineService.updateLeadStatus(draggedLead.id, targetStatus);

    if (!result.success) {
      console.error('Failed to update lead:', result.message);
      setError('Erreur lors de la mise à jour. Restauration en cours...');
      await loadKanbanData(false);
      return;
    }

    // Show success message
    setSuccessMessage(`${draggedLead.full_name} déplacé de "${oldStatusLabel}" vers "${newStatusLabel}"`);
    setTimeout(() => setSuccessMessage(null), 3000);
    setTimeout(() => loadKanbanData(false), 1000);
  }, [draggedLead, loadKanbanData]);

  const filteredKanbanData = useMemo(() => {
    const filtered: Record<PipelineStatus, CRMLead[]> = {} as any;
    const searchLower = debouncedSearch.toLowerCase();

    Object.entries(kanbanData).forEach(([status, leads]) => {
      let result = leads;
      if (debouncedSearch) {
        result = result.filter(lead =>
          lead.full_name?.toLowerCase().includes(searchLower) ||
          lead.email?.toLowerCase().includes(searchLower) ||
          lead.phone?.includes(debouncedSearch) ||
          (lead as any).immatriculation?.toLowerCase().includes(searchLower) ||
          lead.city?.toLowerCase().includes(searchLower)
        );
      }
      filtered[status as PipelineStatus] = result.slice().sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    return filtered;
  }, [kanbanData, debouncedSearch]);

  // 🎯 Organisation des statuts par étapes du workflow TaxiAssur 2026
  const visibleStatuses: PipelineStatus[] = [
    // 📋 LES 7 ÉTAPES PRINCIPALES DU PIPELINE
    'NOUVEAU_LEAD',           // 1️⃣ Nouveau Lead - Demande reçue
    'COLLECTE_DOCUMENTS',     // 2️⃣ Collecte Documents - Documents en attente
    'DEVIS',                  // 3️⃣ Devis - Devis envoyé au client
    'DECISION_CLIENT',        // 4️⃣ Décision Client - En attente validation
    'PAIEMENT',               // 5️⃣ Paiement - Paiement en cours
    'CONTRAT_SIGNATURE',      // 6️⃣ Contrat & Signature - Signature en attente
    'CLIENT_ACTIF',           // 7️⃣ Client Actif - Contrat actif

    // ⚫ STATUTS SPÉCIAUX
    'RELANCE',                // 🔔 Relance - Nécessite une relance
    'PERDU',                  // ❌ Perdu - Lead/Client perdu
    'RECONTACT_PROGRAMME'     // 📅 Recontact Programmé - À recontacter plus tard
  ];

  const statistics = useMemo(() => {
    const allLeads = Object.values(filteredKanbanData).flat();
    return {
      total: allLeads.length,
      active: (filteredKanbanData['CLIENT_ACTIF'] || []).length,
      pending: (filteredKanbanData['COLLECTE_DOCUMENTS'] || []).length,
      newLeads: (filteredKanbanData['NOUVEAU_LEAD'] || []).length,
      avgQuality: allLeads.length > 0
        ? Math.round(allLeads.reduce((sum, l) => sum + (l.quality_score || 0), 0) / allLeads.length)
        : 0
    };
  }, [filteredKanbanData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="animate-pulse">
          <div className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl mb-6"></div>
          <div className="flex gap-4 overflow-x-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-80 h-96 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex-shrink-0"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm backdrop-blur-sm bg-white/95">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Zap className="text-blue-600" size={32} />
                Pipeline Kanban Pro
                {refreshing && (
                  <RefreshCw className="animate-spin text-blue-600" size={24} />
                )}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                <span>Gestion visuelle ultra-rapide avec drag & drop optimisé</span>
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
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50 hover:shadow-md"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                Actualiser
              </button>
              <button
                onClick={() => navigate('/backoffice/crm-killer')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                Nouveau Lead
              </button>
            </div>
          </div>

          {/* Success message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 animate-in slide-in-from-top">
              <Zap size={20} className="text-green-600" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800 font-bold"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 hover:shadow-md">
              <Filter size={20} />
              Filtres
            </button>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-4 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">
                Synchronisation en temps réel
              </span>
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{statistics.total}</span> leads
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-sm text-gray-600">
              <span className="font-bold text-blue-600">{statistics.newLeads}</span> nouveaux
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-sm text-gray-600">
              Qualité: <span className="font-bold text-green-600">{statistics.avgQuality}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dragging indicator */}
      {draggedLead && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="font-bold">
              Déplacement de {draggedLead.full_name}...
            </span>
          </div>
        </div>
      )}

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
                onDrop={(e) => handleDrop(e, status)}
                className={cn(
                  'w-80 flex-shrink-0 transition-all duration-300',
                  isDropTarget && 'scale-[1.02]'
                )}
              >
                {/* Column header */}
                <div className={cn(
                  'rounded-lg p-3 mb-3 transition-all duration-300',
                  isDropTarget
                    ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-500 shadow-lg'
                    : 'bg-gradient-to-br from-gray-100 to-gray-50 border-2 border-transparent'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{statusInfo.icon}</span>
                      <h3 className="font-bold text-gray-900">{statusInfo.label}</h3>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded-full text-sm font-bold transition-all duration-200',
                      isDropTarget
                        ? 'bg-blue-600 text-white scale-110 shadow-md'
                        : 'bg-white text-gray-700 shadow-sm'
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
                  'space-y-3 min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto pr-2 rounded-lg transition-all duration-300',
                  isDropTarget && 'bg-gradient-to-b from-blue-50/80 to-blue-100/30 p-3 ring-2 ring-blue-400/50'
                )}>
                  {leads.length === 0 ? (
                    <div className={cn(
                      'border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300',
                      isDropTarget
                        ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-blue-500 shadow-inner scale-105'
                        : 'bg-white/50 border-gray-300'
                    )}>
                      <p className={cn(
                        'text-sm font-medium transition-all duration-200',
                        isDropTarget ? 'text-blue-700 text-base animate-pulse' : 'text-gray-500'
                      )}>
                        {isDropTarget ? (
                          <>
                            <span className="block text-3xl mb-2">↓</span>
                            <span>Déposez le lead ici</span>
                          </>
                        ) : (
                          'Aucun lead'
                        )}
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
      <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-5 z-40">
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {statistics.total}
            </div>
            <div className="text-xs text-gray-600 font-medium">Total</div>
          </div>
          <div className="w-px h-12 bg-gray-200"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {statistics.active}
            </div>
            <div className="text-xs text-gray-600 font-medium">Actifs</div>
          </div>
          <div className="w-px h-12 bg-gray-200"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {statistics.pending}
            </div>
            <div className="text-xs text-gray-600 font-medium">En Attente</div>
          </div>
          <div className="w-px h-12 bg-gray-200"></div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <TrendingUp size={16} className="text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">
                {statistics.avgQuality}%
              </div>
            </div>
            <div className="text-xs text-gray-600 font-medium">Qualité</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMPipelineKanbanOptimized;
