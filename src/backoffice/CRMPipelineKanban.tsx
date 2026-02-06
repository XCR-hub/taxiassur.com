import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw, AlertCircle, TrendingUp, Clock, FileText, Building2, Euro, PenTool, AlertTriangle, Mail, Phone, MessageSquare, FileCheck } from 'lucide-react';
import { pipelineService, PIPELINE_STATUSES, PipelineStatus, CRMLead } from '@/lib/crm-pipeline';
import { PipelineCard } from '@/components/crm/PipelineCard';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface ColumnNotifications {
  newEmails: number;
  newDocuments: number;
  missedCalls: number;
  newSMS: number;
  pendingSignatures: number;
  paymentDue: number;
}

// Couleurs vives et distinctes pour chaque statut (plus de gris!)
const STATUS_COLORS: Record<PipelineStatus, { bg: string; border: string; text: string; badge: string }> = {
  NOUVEAU_LEAD: {
    bg: 'bg-gradient-to-br from-blue-100 to-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-900',
    badge: 'bg-blue-600 text-white'
  },
  COLLECTE_DOCUMENTS: {
    bg: 'bg-gradient-to-br from-emerald-100 to-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-900',
    badge: 'bg-emerald-600 text-white'
  },
  DEVIS: {
    bg: 'bg-gradient-to-br from-cyan-100 to-cyan-50',
    border: 'border-cyan-300',
    text: 'text-cyan-900',
    badge: 'bg-cyan-600 text-white'
  },
  DECISION_CLIENT: {
    bg: 'bg-gradient-to-br from-violet-100 to-violet-50',
    border: 'border-violet-300',
    text: 'text-violet-900',
    badge: 'bg-violet-600 text-white'
  },
  PAIEMENT: {
    bg: 'bg-gradient-to-br from-amber-100 to-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-900',
    badge: 'bg-amber-600 text-white'
  },
  CONTRAT_SIGNATURE: {
    bg: 'bg-gradient-to-br from-indigo-100 to-indigo-50',
    border: 'border-indigo-300',
    text: 'text-indigo-900',
    badge: 'bg-indigo-600 text-white'
  },
  CLIENT_ACTIF: {
    bg: 'bg-gradient-to-br from-green-100 to-green-50',
    border: 'border-green-300',
    text: 'text-green-900',
    badge: 'bg-green-600 text-white'
  },
  RELANCE: {
    bg: 'bg-gradient-to-br from-orange-100 to-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-900',
    badge: 'bg-orange-600 text-white'
  },
  PERDU: {
    bg: 'bg-gradient-to-br from-red-100 to-red-50',
    border: 'border-red-300',
    text: 'text-red-900',
    badge: 'bg-red-600 text-white'
  },
  RECONTACT_PROGRAMME: {
    bg: 'bg-gradient-to-br from-purple-100 to-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-900',
    badge: 'bg-purple-600 text-white'
  }
} as any;

const CRMPipelineKanban: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kanbanData, setKanbanData] = useState<Record<PipelineStatus, CRMLead[]>>({} as any);
  const [columnNotifications, setColumnNotifications] = useState<Record<PipelineStatus, ColumnNotifications>>({} as any);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [draggedLead, setDraggedLead] = useState<CRMLead | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [updateCount, setUpdateCount] = useState(0);
  const [newLeadNotification, setNewLeadNotification] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannel = useRef<any>(null);
  const previousLeadCount = useRef<number>(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load column notifications (emails, documents, calls, SMS)
  const loadColumnNotifications = useCallback(async () => {
    try {
      const notifications: Record<PipelineStatus, ColumnNotifications> = {} as any;

      for (const status of Object.keys(kanbanData) as PipelineStatus[]) {
        const leadIds = kanbanData[status]?.map(l => l.id) || [];

        if (leadIds.length === 0) {
          notifications[status] = {
            newEmails: 0,
            newDocuments: 0,
            missedCalls: 0,
            newSMS: 0,
            pendingSignatures: 0,
            paymentDue: 0
          };
          continue;
        }

        const [emailsResult, documentsResult, interactionsResult, contractsResult] = await Promise.all([
          // Nouveaux emails non lus
          supabase
            .from('email_messages')
            .select('id', { count: 'exact', head: true })
            .in('lead_id', leadIds)
            .eq('is_from_user', false)
            .gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

          // Nouveaux documents uploadés (dernières 24h)
          supabase
            .from('crm_lead_documents')
            .select('id', { count: 'exact', head: true })
            .in('lead_id', leadIds)
            .eq('status', 'pending_validation')
            .gte('uploaded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

          // Appels + SMS récents
          supabase
            .from('crm_interactions')
            .select('channel', { count: 'exact' })
            .in('lead_id', leadIds)
            .in('channel', ['phone', 'sms'])
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

          // Signatures en attente + paiements dus
          supabase
            .from('lead_contracts')
            .select('status, down_payment_status', { count: 'exact' })
            .in('lead_id', leadIds)
        ]);

        const interactions = interactionsResult.data || [];
        const contracts = contractsResult.data || [];

        notifications[status] = {
          newEmails: emailsResult.count || 0,
          newDocuments: documentsResult.count || 0,
          missedCalls: interactions.filter(i => i.channel === 'phone').length,
          newSMS: interactions.filter(i => i.channel === 'sms').length,
          pendingSignatures: contracts.filter(c => c.status === 'pending' || c.status === 'sent').length,
          paymentDue: contracts.filter(c => c.down_payment_status === 'pending' || c.down_payment_status === 'required').length
        };
      }

      setColumnNotifications(notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, [kanbanData]);

  // Load kanban data
  const loadKanbanData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      const data = await pipelineService.getKanbanData();

      // Détecter les nouveaux leads
      const currentLeadCount = Object.values(data).reduce((sum, leads) => sum + leads.length, 0);
      if (previousLeadCount.current > 0 && currentLeadCount > previousLeadCount.current) {
        const newLeadsCount = currentLeadCount - previousLeadCount.current;
        console.log(`🆕 ${newLeadsCount} nouveau(x) lead(s) détecté(s)`);
      }
      previousLeadCount.current = currentLeadCount;

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

  // Load notifications after kanban data
  useEffect(() => {
    if (Object.keys(kanbanData).length > 0) {
      loadColumnNotifications();
    }
  }, [kanbanData, loadColumnNotifications]);

  // Initial load
  useEffect(() => {
    loadKanbanData();
  }, [loadKanbanData]);

  // Auto-refresh every 10 seconds (plus réactif pour les nouveaux leads)
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    autoRefreshInterval.current = setInterval(() => {
      loadKanbanData(false);
    }, 10000); // 10 secondes au lieu de 30

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [loadKanbanData, autoRefreshEnabled]);

  // Realtime subscription avec notification des nouveaux leads
  useEffect(() => {
    realtimeChannel.current = supabase
      .channel('crm_leads_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_leads'
        },
        (payload) => {
          console.log('🆕 Nouveau lead détecté:', payload.new);
          const newLead = payload.new as any;

          // Afficher notification
          const leadName = `${newLead.first_name || ''} ${newLead.last_name || ''}`.trim() || newLead.email;
          setNewLeadNotification(`🆕 Nouveau lead : ${leadName}`);

          // Masquer après 5 secondes
          setTimeout(() => setNewLeadNotification(null), 5000);

          // Rafraîchir immédiatement
          loadKanbanData(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crm_leads'
        },
        (payload) => {
          console.log('📝 Lead mis à jour:', payload.new);
          loadKanbanData(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'crm_leads'
        },
        (payload) => {
          console.log('🗑️ Lead supprimé:', payload.old);
          loadKanbanData(false);
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);
      });

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, [loadKanbanData]);

  const [syncingEmails, setSyncingEmails] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadKanbanData(false);
  }, [loadKanbanData]);

  const handleSyncEmails = useCallback(async () => {
    setSyncingEmails(true);
    setSyncMessage('🔄 Synchronisation des emails en cours...');

    try {
      // 1. Synchroniser les emails IONOS
      const syncResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-ionos-imap`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      if (!syncResponse.ok) {
        throw new Error('Erreur lors de la synchronisation des emails');
      }

      const syncData = await syncResponse.json();
      console.log('✅ Emails synchronisés:', syncData);

      // 2. Créer automatiquement les leads depuis les nouveaux emails
      const createLeadsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-create-leads-from-emails`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      if (!createLeadsResponse.ok) {
        throw new Error('Erreur lors de la création des leads');
      }

      const createData = await createLeadsResponse.json();
      console.log('✅ Leads créés:', createData);

      // 3. Rafraîchir le pipeline
      await loadKanbanData(false);

      setSyncMessage(
        `✅ Synchronisation terminée ! ${createData.summary?.leads_created || 0} leads créés, ${createData.summary?.emails_linked || 0} emails liés`
      );

      setTimeout(() => setSyncMessage(null), 5000);
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      setSyncMessage('❌ Erreur lors de la synchronisation des emails');
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setSyncingEmails(false);
    }
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
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the column container, not child elements
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
      return;
    }

    const updatedLead = { ...draggedLead, status: targetStatus };

    // Optimistic update with smooth transition
    setKanbanData(prev => {
      const newData = { ...prev };

      // Remove from old column
      if (newData[oldStatus]) {
        newData[oldStatus] = newData[oldStatus].filter(l => l.id !== draggedLead.id);
      }

      // Add to new column at the top
      if (newData[targetStatus]) {
        newData[targetStatus] = [updatedLead, ...newData[targetStatus]];
      } else {
        newData[targetStatus] = [updatedLead];
      }

      return newData;
    });

    setDraggedLead(null);
    setDragOverStatus(null);

    // Update on server
    const result = await pipelineService.updateLeadStatus(draggedLead.id, targetStatus);

    if (!result.success) {
      console.error('Failed to update lead:', result.message);
      setError('Erreur lors de la mise à jour. Restauration...');
      // Rollback on error
      await loadKanbanData(false);
      return;
    }

    // Refresh to get server state
    setTimeout(() => loadKanbanData(false), 1000);
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

  // 🎯 PIPELINE TAXIASSUR SIMPLIFIÉ - 7 ÉTAPES
  const visibleStatuses: PipelineStatus[] = [
    // 📋 LES 7 ÉTAPES PRINCIPALES
    'NOUVEAU_LEAD',          // 1️⃣ Demande reçue
    'COLLECTE_DOCUMENTS',     // 2️⃣ Documents obligatoires + complémentaires
    'DEVIS',                  // 3️⃣ Devis envoyé
    'DECISION_CLIENT',        // 4️⃣ Accepté / Refusé / Inactif
    'PAIEMENT',               // 5️⃣ CB/Prélèvement (compagnie ou TaxiAssur)
    'CONTRAT_SIGNATURE',      // 6️⃣ Signature électronique
    'CLIENT_ACTIF',           // 7️⃣ Espace client actif

    // ⚫ STATUTS SPÉCIAUX (dernières colonnes)
    'RELANCE',                // Relances nécessaires
    'PERDU',                  // Perdus définitifs
    'RECONTACT_PROGRAMME'     // Recontacts futurs
  ];

  const statistics = useMemo(() => {
    const allLeads = Object.values(filteredKanbanData).flat();

    const contactStage = (filteredKanbanData['RELANCE'] || []).length;
    const documentsStage = (filteredKanbanData['COLLECTE_DOCUMENTS'] || []).length;
    const quoteStage = (filteredKanbanData['DEVIS'] || []).length +
                       (filteredKanbanData['DECISION_CLIENT'] || []).length;
    const signatureStage = (filteredKanbanData['CONTRAT_SIGNATURE'] || []).length;
    const paymentStage = (filteredKanbanData['PAIEMENT'] || []).length;

    return {
      total: allLeads.length,
      active: (filteredKanbanData['CLIENT_ACTIF'] || []).length,
      newLeads: (filteredKanbanData['NOUVEAU_LEAD'] || []).length,
      contactStage,
      documentsStage,
      quoteStage,
      signatureStage,
      paymentStage,
      needsAction: (filteredKanbanData['NOUVEAU_LEAD'] || []).length +
                   (filteredKanbanData['RELANCE'] || []).length,
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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b z-10 shadow-sm flex-shrink-0">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
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
              {/* Indicateur auto-refresh */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-xs text-gray-600">Auto-refresh {autoRefreshEnabled ? 'ON' : 'OFF'}</span>
                <button
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className="ml-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  title={autoRefreshEnabled ? 'Désactiver le rafraîchissement automatique' : 'Activer le rafraîchissement automatique'}
                >
                  {autoRefreshEnabled ? 'OFF' : 'ON'}
                </button>
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                Actualiser
              </button>
              <button
                onClick={handleSyncEmails}
                disabled={syncingEmails}
                className="px-4 py-2 border border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                title="Synchroniser les emails et créer les nouveaux leads automatiquement"
              >
                <Mail size={20} className={syncingEmails ? 'animate-bounce' : ''} />
                {syncingEmails ? 'Synchronisation...' : 'Sync Emails'}
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

          {/* Sync message */}
          {syncMessage && (
            <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
              syncMessage.includes('✅')
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : syncMessage.includes('❌')
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              <span className="font-medium">{syncMessage}</span>
              <button
                onClick={() => setSyncMessage(null)}
                className="ml-auto hover:opacity-75"
              >
                ✕
              </button>
            </div>
          )}

          {/* Notification nouveau lead */}
          {newLeadNotification && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg flex items-center gap-3 shadow-lg animate-bounce">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="font-bold text-lg">{newLeadNotification}</span>
              </div>
              <button
                onClick={() => setNewLeadNotification(null)}
                className="ml-auto text-white hover:text-gray-200 font-bold"
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

          {/* TaxiAssur Workflow Stats */}
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-7 gap-2">
            {statistics.needsAction > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle size={16} className="text-red-600" />
                <div>
                  <div className="text-lg font-bold text-red-700">{statistics.needsAction}</div>
                  <div className="text-xs text-red-600">Actions urgentes</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <FileText size={16} className="text-blue-600" />
              <div>
                <div className="text-lg font-bold text-blue-700">{statistics.documentsStage}</div>
                <div className="text-xs text-blue-600">Documents</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-lg">
              <Building2 size={16} className="text-cyan-600" />
              <div>
                <div className="text-lg font-bold text-cyan-700">{statistics.quoteStage}</div>
                <div className="text-xs text-cyan-600">Devis</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
              <PenTool size={16} className="text-indigo-600" />
              <div>
                <div className="text-lg font-bold text-indigo-700">{statistics.signatureStage}</div>
                <div className="text-xs text-indigo-600">Signature</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <Euro size={16} className="text-amber-600" />
              <div>
                <div className="text-lg font-bold text-amber-700">{statistics.paymentStage}</div>
                <div className="text-xs text-amber-600">Paiement</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <TrendingUp size={16} className="text-green-600" />
              <div>
                <div className="text-lg font-bold text-green-700">{statistics.active}</div>
                <div className="text-xs text-green-600">Clients actifs</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div>
                <div className="text-sm font-bold text-gray-700">{statistics.total}</div>
                <div className="text-xs text-gray-500">Total leads</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dragging indicator */}
      {draggedLead && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="font-bold">
              Déplacement de {draggedLead.full_name}...
            </span>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 p-6 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
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
                  'w-80 flex-shrink-0 transition-all duration-300 flex flex-col h-full',
                  isDropTarget && 'scale-[1.02]'
                )}
              >
                {/* Column header - Coloré! */}
                <div className={cn(
                  'rounded-lg p-3 mb-3 transition-all duration-300 border-2 flex-shrink-0',
                  isDropTarget
                    ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-blue-500 shadow-lg scale-105'
                    : `${STATUS_COLORS[status]?.bg || 'bg-gradient-to-br from-gray-100 to-gray-50'} ${STATUS_COLORS[status]?.border || 'border-gray-200'}`
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{statusInfo.icon}</span>
                      <h3 className={cn('font-bold', STATUS_COLORS[status]?.text || 'text-gray-900')}>
                        {statusInfo.label}
                      </h3>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded-full text-sm font-bold transition-all duration-200 shadow-sm',
                      isDropTarget
                        ? 'bg-blue-600 text-white scale-110 shadow-md'
                        : STATUS_COLORS[status]?.badge || 'bg-gray-700 text-white'
                    )}>
                      {leads.length}
                    </span>
                  </div>

                  {/* Badges de notifications */}
                  {columnNotifications[status] && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {columnNotifications[status].newEmails > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-medium animate-pulse">
                          <Mail size={12} />
                          {columnNotifications[status].newEmails}
                        </div>
                      )}
                      {columnNotifications[status].newDocuments > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-xs font-medium animate-pulse">
                          <FileCheck size={12} />
                          {columnNotifications[status].newDocuments}
                        </div>
                      )}
                      {columnNotifications[status].missedCalls > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-xs font-medium animate-pulse">
                          <Phone size={12} />
                          {columnNotifications[status].missedCalls}
                        </div>
                      )}
                      {columnNotifications[status].newSMS > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600 text-white text-xs font-medium animate-pulse">
                          <MessageSquare size={12} />
                          {columnNotifications[status].newSMS}
                        </div>
                      )}
                      {columnNotifications[status].pendingSignatures > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 text-white text-xs font-medium">
                          <PenTool size={12} />
                          {columnNotifications[status].pendingSignatures}
                        </div>
                      )}
                      {columnNotifications[status].paymentDue > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white text-xs font-medium">
                          <Euro size={12} />
                          {columnNotifications[status].paymentDue}
                        </div>
                      )}
                    </div>
                  )}

                  {leads.length > 0 && (
                    <div className={cn('text-xs font-medium', STATUS_COLORS[status]?.text || 'text-gray-600')}>
                      Qualité moyenne: {Math.round(leads.reduce((sum, l) => sum + (l.quality_score || 0), 0) / leads.length) || 0}%
                    </div>
                  )}
                </div>

                {/* Column content */}
                <div className={cn(
                  'space-y-3 flex-1 overflow-y-auto pr-2 rounded-lg transition-all duration-300',
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

      {/* TaxiAssur Workflow Panel */}
      <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-xl border-2 border-gray-200 p-4 z-40">
        <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Workflow TaxiAssur</div>
        <div className="flex items-center gap-3">
          <div className="text-center px-2">
            <div className="text-xl font-bold text-red-600">{statistics.needsAction}</div>
            <div className="text-xs text-gray-500">Urgents</div>
          </div>
          <div className="text-gray-300">→</div>
          <div className="text-center px-2">
            <div className="text-xl font-bold text-blue-600">{statistics.documentsStage}</div>
            <div className="text-xs text-gray-500">Docs</div>
          </div>
          <div className="text-gray-300">→</div>
          <div className="text-center px-2">
            <div className="text-xl font-bold text-cyan-600">{statistics.quoteStage}</div>
            <div className="text-xs text-gray-500">Devis</div>
          </div>
          <div className="text-gray-300">→</div>
          <div className="text-center px-2">
            <div className="text-xl font-bold text-indigo-600">{statistics.signatureStage}</div>
            <div className="text-xs text-gray-500">Sign.</div>
          </div>
          <div className="text-gray-300">→</div>
          <div className="text-center px-2">
            <div className="text-xl font-bold text-amber-600">{statistics.paymentStage}</div>
            <div className="text-xs text-gray-500">Paiement</div>
          </div>
          <div className="text-gray-300">→</div>
          <div className="text-center px-2 bg-green-50 rounded-lg py-1 px-3">
            <div className="text-xl font-bold text-green-600">{statistics.active}</div>
            <div className="text-xs text-green-600 font-medium">Clients</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMPipelineKanban;
