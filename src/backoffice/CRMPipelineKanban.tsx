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

// Palette de couleurs alignée sur la charte TaxiAssur (jaune/noir/gris)
const STATUS_COLORS: Record<PipelineStatus, { bg: string; border: string; text: string; badge: string }> = {
  NOUVEAU_LEAD: {
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
    border: 'border-yellow-400',
    text: 'text-yellow-900',
    badge: 'bg-yellow-500 text-black'
  },
  COLLECTE_DOCUMENTS: {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    border: 'border-amber-400',
    text: 'text-amber-900',
    badge: 'bg-amber-500 text-black'
  },
  DEVIS: {
    bg: 'bg-gradient-to-br from-gray-800 to-gray-900',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500 text-black'
  },
  DECISION_CLIENT: {
    bg: 'bg-gradient-to-br from-yellow-100 to-yellow-50',
    border: 'border-yellow-500',
    text: 'text-yellow-900',
    badge: 'bg-yellow-600 text-black'
  },
  PAIEMENT: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
    border: 'border-green-400',
    text: 'text-green-900',
    badge: 'bg-green-600 text-white'
  },
  CONTRAT_SIGNATURE: {
    bg: 'bg-gradient-to-br from-gray-900 to-black',
    border: 'border-yellow-400',
    text: 'text-yellow-300',
    badge: 'bg-yellow-400 text-black'
  },
  CLIENT_ACTIF: {
    bg: 'bg-gradient-to-br from-green-100 to-emerald-50',
    border: 'border-green-500',
    text: 'text-green-900',
    badge: 'bg-green-600 text-white'
  },
  RELANCE: {
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
    border: 'border-orange-400',
    text: 'text-orange-900',
    badge: 'bg-orange-500 text-white'
  },
  PERDU: {
    bg: 'bg-gradient-to-br from-gray-100 to-gray-50',
    border: 'border-gray-400',
    text: 'text-gray-700',
    badge: 'bg-gray-600 text-white'
  },
  RECONTACT_PROGRAMME: {
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-100',
    border: 'border-amber-500',
    text: 'text-amber-900',
    badge: 'bg-amber-600 text-black'
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

        const [emailsResult, documentsResult, interactionsResult, contractsResult] = await Promise.allSettled([
          // Nouveaux emails non lus - Limiter à 20 IDs max pour éviter erreur 400
          leadIds.length <= 20
            ? supabase
                .from('email_messages')
                .select('id', { count: 'exact', head: true })
                .in('lead_id', leadIds)
                .eq('direction', 'inbound')
                .gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            : Promise.resolve({ count: 0, data: [] }),

          // Nouveaux documents uploadés (dernières 24h)
          leadIds.length <= 20
            ? supabase
                .from('crm_lead_documents')
                .select('id', { count: 'exact', head: true })
                .in('lead_id', leadIds)
                .eq('status', 'pending_validation')
                .gte('uploaded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            : Promise.resolve({ count: 0, data: [] }),

          // Appels + SMS récents
          leadIds.length <= 20
            ? supabase
                .from('crm_interactions')
                .select('channel', { count: 'exact' })
                .in('lead_id', leadIds)
                .in('channel', ['phone', 'sms'])
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            : Promise.resolve({ count: 0, data: [] }),

          // Signatures en attente + paiements dus
          leadIds.length <= 20
            ? supabase
                .from('lead_contracts')
                .select('status, down_payment_status', { count: 'exact' })
                .in('lead_id', leadIds)
            : Promise.resolve({ count: 0, data: [] })
        ]);

        const interactions = (interactionsResult.status === 'fulfilled' ? interactionsResult.value.data : null) || [];
        const contracts = (contractsResult.status === 'fulfilled' ? contractsResult.value.data : null) || [];

        notifications[status] = {
          newEmails: (emailsResult.status === 'fulfilled' ? emailsResult.value.count : null) || 0,
          newDocuments: (documentsResult.status === 'fulfilled' ? documentsResult.value.count : null) || 0,
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
    setError(null);

    try {
      // 1. Synchroniser tous les emails avec la fonction complète
      const syncResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-all-emails-complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ limit: 50 })
        }
      );

      if (!syncResponse.ok) {
        const errorText = await syncResponse.text();
        console.error('Erreur sync response:', errorText);
        throw new Error(`Erreur HTTP ${syncResponse.status}: ${errorText.substring(0, 100)}`);
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
        const errorText = await createLeadsResponse.text();
        console.error('Erreur create leads response:', errorText);
        throw new Error(`Erreur création leads: ${errorText.substring(0, 100)}`);
      }

      const createData = await createLeadsResponse.json();
      console.log('✅ Leads créés:', createData);

      // 3. Rafraîchir le pipeline
      await loadKanbanData(false);

      const emailsSynced = syncData.emails_synced || syncData.total_synced || 0;
      const leadsCreated = createData.summary?.leads_created || createData.leads_created || 0;
      const emailsLinked = createData.summary?.emails_linked || createData.emails_linked || 0;

      setSyncMessage(
        `✅ Synchronisation terminée ! ${emailsSynced} emails sync, ${leadsCreated} leads créés, ${emailsLinked} emails liés`
      );

      setTimeout(() => setSyncMessage(null), 7000);
    } catch (error: any) {
      console.error('❌ Erreur synchronisation:', error);
      const errorMsg = error.message || 'Erreur inconnue';
      setSyncMessage(`❌ ${errorMsg}`);
      setError(errorMsg);
      setTimeout(() => {
        setSyncMessage(null);
        setError(null);
      }, 10000);
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
      <div className="h-full bg-gray-50 dark:bg-gray-900 p-8 flex items-center justify-center">
        <div className="animate-pulse w-full max-w-6xl">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6"></div>
          <div className="flex gap-4 overflow-x-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-80 h-96 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-black border-b border-gray-800 z-10 shadow-lg flex-shrink-0">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-400 rounded-lg flex items-center justify-center text-black text-sm font-black">K</span>
                Pipeline Kanban
                {refreshing && (
                  <RefreshCw className="animate-spin text-yellow-400" size={20} />
                )}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                <span>Gestion visuelle du cycle de vie client</span>
                <span className="text-gray-600">•</span>
                <div className="flex items-center gap-1">
                  <Clock size={13} />
                  <span>Mis à jour: {lastUpdate.toLocaleTimeString('fr-FR')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 rounded-lg border border-gray-700">
                <div className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></div>
                <span className="text-xs text-gray-400">Auto-refresh {autoRefreshEnabled ? 'ON' : 'OFF'}</span>
                <button
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className="ml-1 text-xs text-yellow-400 hover:text-yellow-300 font-medium"
                  title={autoRefreshEnabled ? 'Désactiver' : 'Activer'}
                >
                  {autoRefreshEnabled ? 'OFF' : 'ON'}
                </button>
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                Actualiser
              </button>
              <button
                onClick={handleSyncEmails}
                disabled={syncingEmails}
                className="px-4 py-2 border border-yellow-600 bg-yellow-600/10 text-yellow-400 rounded-lg font-medium hover:bg-yellow-600/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                title="Synchroniser les emails et créer les nouveaux leads automatiquement"
              >
                <Mail size={18} className={syncingEmails ? 'animate-bounce' : ''} />
                {syncingEmails ? 'Sync...' : 'Sync Emails'}
              </button>
              <button
                onClick={() => navigate('/backoffice/crm-killer')}
                className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg font-bold hover:from-yellow-700 hover:to-yellow-600 transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Nouveau Lead
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-2 text-red-300">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">✕</button>
            </div>
          )}

          {/* Sync message */}
          {syncMessage && (
            <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
              syncMessage.includes('✅')
                ? 'bg-green-900/30 border border-green-700 text-green-300'
                : syncMessage.includes('❌')
                ? 'bg-red-900/30 border border-red-700 text-red-300'
                : 'bg-yellow-900/30 border border-yellow-700 text-yellow-300'
            }`}>
              <span className="font-medium">{syncMessage}</span>
              <button onClick={() => setSyncMessage(null)} className="ml-auto hover:opacity-75">✕</button>
            </div>
          )}

          {/* Notification nouveau lead */}
          {newLeadNotification && (
            <div className="mb-4 p-4 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg flex items-center gap-3 shadow-lg animate-bounce">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-black rounded-full animate-pulse"></div>
                <span className="font-bold text-lg">{newLeadNotification}</span>
              </div>
              <button onClick={() => setNewLeadNotification(null)} className="ml-auto font-bold hover:opacity-75">✕</button>
            </div>
          )}

          {/* Search and filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone, entreprise ou ville..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
              />
            </div>
            <button className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2 text-sm">
              <Filter size={18} />
              Filtres
            </button>
          </div>

          {/* Workflow TaxiAssur — funnel pipeline */}
          <div className="mt-4 flex items-stretch gap-0 bg-gray-900/60 border border-gray-700 rounded-xl overflow-hidden">
            {/* Total */}
            <div className="flex items-center gap-2 px-4 py-3 border-r border-gray-700">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shrink-0"></div>
              <div>
                <div className="text-sm font-bold text-white">{statistics.total}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
            </div>

            {/* Separator arrow */}
            <div className="flex items-center px-1 text-gray-600 font-bold text-sm select-none">›</div>

            {/* Urgents */}
            <div className={`flex items-center gap-2 px-4 py-3 border-r border-gray-700 ${statistics.needsAction > 0 ? 'bg-red-900/20' : ''}`}>
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-red-300">{statistics.needsAction}</div>
                <div className="text-xs text-red-400">Urgents</div>
              </div>
            </div>

            <div className="flex items-center px-1 text-gray-600 font-bold text-sm select-none">›</div>

            {/* Documents */}
            <div className="flex items-center gap-2 px-4 py-3 border-r border-gray-700 bg-yellow-900/10">
              <FileText size={14} className="text-yellow-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-yellow-300">{statistics.documentsStage}</div>
                <div className="text-xs text-yellow-500">Docs</div>
              </div>
            </div>

            <div className="flex items-center px-1 text-gray-600 font-bold text-sm select-none">›</div>

            {/* Devis */}
            <div className="flex items-center gap-2 px-4 py-3 border-r border-gray-700 bg-amber-900/10">
              <Building2 size={14} className="text-amber-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-amber-300">{statistics.quoteStage}</div>
                <div className="text-xs text-amber-500">Devis</div>
              </div>
            </div>

            <div className="flex items-center px-1 text-gray-600 font-bold text-sm select-none">›</div>

            {/* Signature */}
            <div className="flex items-center gap-2 px-4 py-3 border-r border-gray-700">
              <PenTool size={14} className="text-gray-300 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">{statistics.signatureStage}</div>
                <div className="text-xs text-gray-400">Signature</div>
              </div>
            </div>

            <div className="flex items-center px-1 text-gray-600 font-bold text-sm select-none">›</div>

            {/* Paiement */}
            <div className="flex items-center gap-2 px-4 py-3 border-r border-gray-700 bg-green-900/10">
              <Euro size={14} className="text-green-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-green-300">{statistics.paymentStage}</div>
                <div className="text-xs text-green-500">Paiement</div>
              </div>
            </div>

            <div className="flex items-center px-1 text-gray-600 font-bold text-sm select-none">›</div>

            {/* Clients actifs */}
            <div className="flex items-center gap-2 px-4 py-3 bg-green-900/25 flex-1">
              <TrendingUp size={14} className="text-green-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-green-300">{statistics.active}</div>
                <div className="text-xs text-green-400 font-medium">Clients actifs</div>
              </div>
            </div>

            {/* Label Workflow */}
            <div className="flex items-center px-4 py-3 border-l border-gray-700 ml-auto">
              <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider whitespace-nowrap">Workflow TaxiAssur</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dragging indicator */}
      {draggedLead && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce font-bold">
            <div className="w-3 h-3 bg-black rounded-full animate-pulse"></div>
            <span>Déplacement de {draggedLead.full_name}...</span>
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
                  'w-80 flex-shrink-0 transition-all duration-300 flex flex-col',
                  isDropTarget && 'scale-[1.02]'
                )}
                style={{ maxHeight: 'calc(100vh - 300px)' }}
              >
                {/* Column header - Coloré! */}
                <div className={cn(
                  'rounded-lg p-3 mb-3 transition-all duration-300 border-2 flex-shrink-0',
                  isDropTarget
                    ? 'bg-gradient-to-br from-yellow-100 to-amber-50 border-yellow-500 shadow-lg scale-105'
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

    </div>
  );
};

export default CRMPipelineKanban;
