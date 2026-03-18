import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw, AlertCircle, TrendingUp, Clock, FileText, Building2, Euro, PenTool, AlertTriangle, Mail, Phone, MessageSquare, FileCheck } from 'lucide-react';
import { pipelineService, PIPELINE_STATUSES, PipelineStatus, CRMLead } from '@/lib/crm-pipeline';
import { PipelineCard } from '@/components/crm/PipelineCard';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import RealtimeNotifications from '@/components/crm/RealtimeNotifications';

interface ColumnNotifications {
  newEmails: number;
  newDocuments: number;
  missedCalls: number;
  newSMS: number;
  pendingSignatures: number;
  paymentDue: number;
}

// Palette de couleurs alignée sur la charte TaxiAssur (jaune/noir/gris)
const STATUS_COLORS: Record<string, {
  bg: string; border: string; text: string; badge: string; accent: string;
  colBg: string; colBorder: string; headerBg: string;
}> = {
  NOUVEAU_LEAD: {
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
    border: 'border-yellow-400',
    text: 'text-yellow-900',
    badge: 'bg-yellow-500 text-black',
    accent: '#eab308',
    colBg: 'bg-yellow-950/30',
    colBorder: 'border-yellow-700/30',
    headerBg: 'bg-yellow-900/25'
  },
  COLLECTE_DOCUMENTS: {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    border: 'border-amber-400',
    text: 'text-amber-900',
    badge: 'bg-amber-500 text-black',
    accent: '#f59e0b',
    colBg: 'bg-amber-950/30',
    colBorder: 'border-amber-700/30',
    headerBg: 'bg-amber-900/25'
  },
  DEVIS: {
    bg: 'bg-gradient-to-br from-gray-800 to-gray-900',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500 text-black',
    accent: '#d97706',
    colBg: 'bg-orange-950/30',
    colBorder: 'border-orange-700/30',
    headerBg: 'bg-orange-900/25'
  },
  DECISION_CLIENT: {
    bg: 'bg-gradient-to-br from-yellow-100 to-yellow-50',
    border: 'border-yellow-500',
    text: 'text-yellow-900',
    badge: 'bg-yellow-600 text-black',
    accent: '#ca8a04',
    colBg: 'bg-yellow-950/25',
    colBorder: 'border-yellow-700/25',
    headerBg: 'bg-yellow-900/20'
  },
  PAIEMENT: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
    border: 'border-green-400',
    text: 'text-green-900',
    badge: 'bg-green-600 text-white',
    accent: '#16a34a',
    colBg: 'bg-green-950/30',
    colBorder: 'border-green-700/30',
    headerBg: 'bg-green-900/25'
  },
  CONTRAT_SIGNATURE: {
    bg: 'bg-gradient-to-br from-gray-900 to-black',
    border: 'border-yellow-400',
    text: 'text-yellow-300',
    badge: 'bg-yellow-400 text-black',
    accent: '#a3a3a3',
    colBg: 'bg-gray-800/40',
    colBorder: 'border-gray-600/30',
    headerBg: 'bg-gray-700/30'
  },
  CLIENT_ACTIF: {
    bg: 'bg-gradient-to-br from-green-100 to-emerald-50',
    border: 'border-green-500',
    text: 'text-green-900',
    badge: 'bg-green-600 text-white',
    accent: '#22c55e',
    colBg: 'bg-emerald-950/35',
    colBorder: 'border-emerald-700/30',
    headerBg: 'bg-emerald-900/25'
  },
  RELANCE: {
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
    border: 'border-orange-400',
    text: 'text-orange-900',
    badge: 'bg-orange-500 text-white',
    accent: '#f97316',
    colBg: 'bg-orange-950/35',
    colBorder: 'border-orange-700/30',
    headerBg: 'bg-orange-900/25'
  },
  PERDU: {
    bg: 'bg-gradient-to-br from-gray-100 to-gray-50',
    border: 'border-gray-400',
    text: 'text-gray-700',
    badge: 'bg-gray-600 text-white',
    accent: '#6b7280',
    colBg: 'bg-gray-800/35',
    colBorder: 'border-gray-600/30',
    headerBg: 'bg-gray-700/25'
  },
  RECONTACT_PROGRAMME: {
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-100',
    border: 'border-amber-500',
    text: 'text-amber-900',
    badge: 'bg-amber-600 text-black',
    accent: '#b45309',
    colBg: 'bg-amber-950/35',
    colBorder: 'border-amber-700/30',
    headerBg: 'bg-amber-900/25'
  }
};

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
    <div className="h-full bg-gray-950 flex flex-col overflow-hidden">
      {/* Header — compact single strip */}
      <div className="bg-black border-b border-gray-800 z-10 shadow-lg flex-shrink-0">
        <div className="px-4 py-2">

          {/* Row 1: title + search + actions */}
          <div className="flex items-center gap-3">
            {/* Title */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-yellow-400 rounded flex items-center justify-center text-black text-xs font-black">K</span>
              <span className="text-base font-bold text-white">Pipeline Kanban</span>
              {refreshing && <RefreshCw className="animate-spin text-yellow-400" size={14} />}
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${autoRefreshEnabled ? 'border-yellow-600 bg-yellow-600/10 text-yellow-400' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}
                title={autoRefreshEnabled ? 'Désactiver auto-refresh' : 'Activer auto-refresh'}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${autoRefreshEnabled ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></div>
                Auto
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={handleSyncEmails}
                disabled={syncingEmails}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-yellow-600 bg-yellow-600/10 text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-600/20 transition-colors disabled:opacity-50"
              >
                <Mail size={13} className={syncingEmails ? 'animate-bounce' : ''} />
                {syncingEmails ? 'Sync...' : 'Emails'}
              </button>
              <button
                onClick={() => navigate('/backoffice/crm-killer')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg text-xs font-bold hover:from-yellow-700 hover:to-yellow-600 transition-all"
              >
                <Plus size={13} />
                Nouveau Lead
              </button>

              {/* Notifications déplacées depuis le header global */}
              <div className="ml-1 pl-2 border-l border-gray-700">
                <RealtimeNotifications />
              </div>
            </div>
          </div>

          {/* Alerts row (only shown when needed) */}
          {(error || syncMessage || newLeadNotification) && (
            <div className="mt-2 flex flex-col gap-1">
              {error && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-xs">
                  <AlertCircle size={13} />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">✕</button>
                </div>
              )}
              {syncMessage && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${syncMessage.includes('✅') ? 'bg-green-900/30 border border-green-700 text-green-300' : syncMessage.includes('❌') ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-yellow-900/30 border border-yellow-700 text-yellow-300'}`}>
                  <span className="flex-1 font-medium">{syncMessage}</span>
                  <button onClick={() => setSyncMessage(null)} className="hover:opacity-75">✕</button>
                </div>
              )}
              {newLeadNotification && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600 text-black rounded-lg text-xs font-bold animate-pulse">
                  <div className="w-2 h-2 bg-black rounded-full animate-ping"></div>
                  <span className="flex-1">{newLeadNotification}</span>
                  <button onClick={() => setNewLeadNotification(null)} className="font-bold hover:opacity-75">✕</button>
                </div>
              )}
            </div>
          )}

          {/* Row 2: Workflow funnel — compact pill strip */}
          <div className="mt-2 flex items-center h-7 bg-gray-900/80 border border-gray-700/60 rounded-lg overflow-hidden text-xs">
            <div className="flex items-center gap-1 px-3 border-r border-gray-700/60 h-full">
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="font-bold text-white">{statistics.total}</span>
              <span className="text-gray-500">leads</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className={`flex items-center gap-1 px-3 border-r border-gray-700/60 h-full ${statistics.needsAction > 0 ? 'bg-red-900/20' : ''}`}>
              <AlertTriangle size={11} className="text-red-400" />
              <span className="font-bold text-red-300">{statistics.needsAction}</span>
              <span className="text-red-500/70">urgents</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className="flex items-center gap-1 px-3 border-r border-gray-700/60 h-full">
              <FileText size={11} className="text-yellow-400" />
              <span className="font-bold text-yellow-300">{statistics.documentsStage}</span>
              <span className="text-gray-500">docs</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className="flex items-center gap-1 px-3 border-r border-gray-700/60 h-full">
              <Building2 size={11} className="text-amber-400" />
              <span className="font-bold text-amber-300">{statistics.quoteStage}</span>
              <span className="text-gray-500">devis</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className="flex items-center gap-1 px-3 border-r border-gray-700/60 h-full">
              <PenTool size={11} className="text-gray-300" />
              <span className="font-bold text-white">{statistics.signatureStage}</span>
              <span className="text-gray-500">sign.</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className="flex items-center gap-1 px-3 border-r border-gray-700/60 h-full">
              <Euro size={11} className="text-green-400" />
              <span className="font-bold text-green-300">{statistics.paymentStage}</span>
              <span className="text-gray-500">paiement</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className="flex items-center gap-1 px-3 bg-green-900/20 h-full">
              <TrendingUp size={11} className="text-green-400" />
              <span className="font-bold text-green-300">{statistics.active}</span>
              <span className="text-green-600">clients actifs</span>
            </div>
            <div className="ml-auto flex items-center px-3 border-l border-gray-700/60 h-full">
              <div className="flex items-center gap-1 text-gray-600">
                <Clock size={10} />
                <span>{lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
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
      <div className="flex-1 px-3 py-3 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-2 h-full" style={{ minWidth: 'max-content' }}>
          {visibleStatuses.map((status) => {
            const statusInfo = PIPELINE_STATUSES[status];
            const leads = filteredKanbanData[status] || [];
            const isDropTarget = dragOverStatus === status && draggedLead?.status !== status;
            const colors = STATUS_COLORS[status] || STATUS_COLORS['PERDU'];
            const accentColor = colors.accent;
            const avgQuality = leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + (l.quality_score || 0), 0) / leads.length) : 0;

            return (
              <div
                key={status}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
                className={cn(
                  'w-[270px] flex-shrink-0 transition-all duration-300 flex flex-col rounded-xl border',
                  colors.colBg,
                  isDropTarget
                    ? 'border-yellow-500/70 shadow-lg shadow-yellow-900/20 scale-[1.015]'
                    : colors.colBorder
                )}
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              >
                {/* Column header */}
                <div
                  className={cn(
                    'flex-shrink-0 rounded-t-xl border-b px-3 pt-3 pb-2.5',
                    colors.headerBg,
                    isDropTarget ? 'border-yellow-600/40' : 'border-white/5'
                  )}
                  style={{ borderLeft: `3px solid ${accentColor}` }}
                >
                  {/* Title row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none">{statusInfo.icon}</span>
                      <h3 className="text-sm font-bold text-white truncate tracking-wide">{statusInfo.label}</h3>
                    </div>
                    <span
                      className={cn(
                        'ml-2 shrink-0 min-w-[24px] h-[24px] flex items-center justify-center rounded-full text-xs font-bold shadow-sm transition-all duration-200',
                        isDropTarget ? 'bg-yellow-500 text-black scale-110' : colors.badge
                      )}
                    >
                      {leads.length}
                    </span>
                  </div>

                  {/* Quality bar + notification pills */}
                  <div className="flex items-center gap-1.5">
                    {leads.length > 0 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-14 h-1.5 bg-black/30 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${avgQuality}%`, backgroundColor: accentColor }}
                          />
                        </div>
                        <span className="text-xs font-medium" style={{ color: accentColor }}>{avgQuality}%</span>
                      </div>
                    )}
                    {columnNotifications[status] && (
                      <div className="flex items-center gap-1 ml-auto">
                        {columnNotifications[status].newEmails > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-600/80 text-white text-xs font-semibold animate-pulse">
                            <Mail size={9} />{columnNotifications[status].newEmails}
                          </div>
                        )}
                        {columnNotifications[status].newDocuments > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-600/80 text-white text-xs font-semibold animate-pulse">
                            <FileCheck size={9} />{columnNotifications[status].newDocuments}
                          </div>
                        )}
                        {columnNotifications[status].missedCalls > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-600/80 text-white text-xs font-semibold animate-pulse">
                            <Phone size={9} />{columnNotifications[status].missedCalls}
                          </div>
                        )}
                        {columnNotifications[status].newSMS > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-pink-600/80 text-white text-xs font-semibold animate-pulse">
                            <MessageSquare size={9} />{columnNotifications[status].newSMS}
                          </div>
                        )}
                        {columnNotifications[status].pendingSignatures > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-600/80 text-white text-xs font-semibold">
                            <PenTool size={9} />{columnNotifications[status].pendingSignatures}
                          </div>
                        )}
                        {columnNotifications[status].paymentDue > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-600/80 text-white text-xs font-semibold">
                            <Euro size={9} />{columnNotifications[status].paymentDue}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column scrollable cards area */}
                <div className={cn(
                  'space-y-2 flex-1 overflow-y-auto p-2 rounded-b-xl transition-all duration-300',
                  isDropTarget && 'ring-1 ring-inset ring-yellow-500/30'
                )}>
                  {leads.length === 0 ? (
                    <div className={cn(
                      'border border-dashed rounded-lg p-8 text-center transition-all duration-300 mt-1',
                      isDropTarget
                        ? 'border-yellow-500/50 bg-yellow-900/10'
                        : 'border-white/10'
                    )}>
                      <p className={cn(
                        'text-xs font-medium transition-all duration-200',
                        isDropTarget ? 'text-yellow-400 animate-pulse' : 'text-gray-600'
                      )}>
                        {isDropTarget ? (
                          <>
                            <span className="block text-2xl mb-1">↓</span>
                            <span>Déposez ici</span>
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
