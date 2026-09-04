import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, RefreshCw, AlertCircle, TrendingUp, Clock, FileText, Building2, Euro, PenTool, AlertTriangle, Mail, Phone, FileCheck, Users, User } from 'lucide-react';
import { pipelineService, PIPELINE_STATUSES, PipelineStatus, CRMLead, AdminUser, normalizePipelineStatus } from '@/lib/crm-pipeline';
import RealtimeNotifications from '@/components/crm/RealtimeNotifications';
import { PipelineCard } from '@/components/crm/PipelineCard';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { NATIVE_ADMIN_TOKEN_KEY } from '@/lib/native-admin-auth';
import { nativeAdminInboxSync, nativeAdminPipelineNotifications } from '@/lib/native-admin-data';
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
  colBg: string; colBorder: string; headerBg: string; topBar: string;
}> = {
  NOUVEAU_LEAD: {
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
    border: 'border-yellow-400',
    text: 'text-yellow-900',
    badge: 'bg-yellow-500 text-black',
    accent: '#f59e0b',
    colBg: 'bg-[#1d1d1d]',
    colBorder: 'border-[#2e2e2e]',
    headerBg: 'bg-[#252318]',
    topBar: '#f59e0b'
  },
  COLLECTE_DOCUMENTS: {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    border: 'border-amber-400',
    text: 'text-amber-900',
    badge: 'bg-amber-500 text-black',
    accent: '#fb923c',
    colBg: 'bg-[#1d1d1d]',
    colBorder: 'border-[#2e2e2e]',
    headerBg: 'bg-[#261e15]',
    topBar: '#fb923c'
  },
  DEVIS: {
    bg: 'bg-gradient-to-br from-gray-800 to-gray-900',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500 text-black',
    accent: '#38bdf8',
    colBg: 'bg-[#1d1d1d]',
    colBorder: 'border-[#2e2e2e]',
    headerBg: 'bg-[#16202a]',
    topBar: '#38bdf8'
  },
  DECISION_CLIENT: {
    bg: 'bg-gradient-to-br from-yellow-100 to-yellow-50',
    border: 'border-yellow-500',
    text: 'text-yellow-900',
    badge: 'bg-yellow-600 text-black',
    accent: '#a78bfa',
    colBg: 'bg-[#1d1d1d]',
    colBorder: 'border-[#2e2e2e]',
    headerBg: 'bg-[#1e1825]',
    topBar: '#a78bfa'
  },
  PAIEMENT: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
    border: 'border-green-400',
    text: 'text-green-900',
    badge: 'bg-green-600 text-white',
    accent: '#34d399',
    colBg: 'bg-[#1d1d1d]',
    colBorder: 'border-[#2e2e2e]',
    headerBg: 'bg-[#141f1a]',
    topBar: '#34d399'
  },
  CONTRAT_SIGNATURE: {
    bg: 'bg-gradient-to-br from-gray-900 to-black',
    border: 'border-yellow-400',
    text: 'text-yellow-300',
    badge: 'bg-yellow-400 text-black',
    accent: '#60a5fa',
    colBg: 'bg-[#1d1d1d]',
    colBorder: 'border-[#2e2e2e]',
    headerBg: 'bg-[#141924]',
    topBar: '#60a5fa'
  },
  CLIENT_ACTIF: {
    bg: 'bg-gradient-to-br from-green-100 to-emerald-50',
    border: 'border-green-500',
    text: 'text-green-900',
    badge: 'bg-green-600 text-white',
    accent: '#4ade80',
    colBg: 'bg-[#1d1d1d]',
    colBorder: 'border-[#2e2e2e]',
    headerBg: 'bg-[#132018]',
    topBar: '#4ade80'
  },
  RELANCE: {
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
    border: 'border-orange-400',
    text: 'text-orange-900',
    badge: 'bg-orange-500 text-white',
    accent: '#f97316',
    colBg: 'bg-[#1d1d1d]',
    colBorder: 'border-[#2e2e2e]',
    headerBg: 'bg-[#251510]',
    topBar: '#f97316'
  },
  PERDU: {
    bg: 'bg-gradient-to-br from-gray-100 to-gray-50',
    border: 'border-gray-400',
    text: 'text-gray-700',
    badge: 'bg-gray-500 text-white',
    accent: '#6b7280',
    colBg: 'bg-[#1d1d1d]',
    colBorder: 'border-[#2e2e2e]',
    headerBg: 'bg-[#1e1e1e]',
    topBar: '#6b7280'
  },
  RECONTACT_PROGRAMME: {
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-100',
    border: 'border-amber-500',
    text: 'text-amber-900',
    badge: 'bg-amber-600 text-black',
    accent: '#fbbf24',
    colBg: 'bg-[#1d1d1d]',
    colBorder: 'border-[#2e2e2e]',
    headerBg: 'bg-[#231f10]',
    topBar: '#fbbf24'
  }
};

const CRMPipelineKanban: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAdminAuth();
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
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [viewFilter, setViewFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const previousLeadCount = useRef<number>(0);
  const moveInProgressRef = useRef(false);

  const adminUsersMap = useMemo(() => {
    const map: Record<string, string> = {};
    adminUsers.forEach(u => { map[u.id] = u.full_name; });
    return map;
  }, [adminUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load admin users for assignment display
  useEffect(() => {
    pipelineService.getAdminUsers().then(setAdminUsers);
  }, []);

  // Load column notifications (emails, documents, calls, SMS)
  const loadColumnNotifications = useCallback(async () => {
    try {
      const notifications: Record<PipelineStatus, ColumnNotifications> = {} as any;

      if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) {
        const result = await nativeAdminPipelineNotifications() as { notifications?: Record<string, ColumnNotifications> };
        for (const [rawStatus, counts] of Object.entries(result.notifications || {})) {
          const status = normalizePipelineStatus({ status: rawStatus });
          const current = notifications[status] || { newEmails: 0, newDocuments: 0, missedCalls: 0, newSMS: 0, pendingSignatures: 0, paymentDue: 0 };
          notifications[status] = {
            newEmails: current.newEmails + (counts.newEmails || 0),
            newDocuments: current.newDocuments + (counts.newDocuments || 0),
            missedCalls: current.missedCalls + (counts.missedCalls || 0),
            newSMS: current.newSMS + (counts.newSMS || 0),
            pendingSignatures: current.pendingSignatures + (counts.pendingSignatures || 0),
            paymentDue: current.paymentDue + (counts.paymentDue || 0),
          };
        }
        setColumnNotifications(notifications);
        return;
      }

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
    if (!showLoader && moveInProgressRef.current) return;
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

  /* Legacy Supabase realtime subscription disabled: native API polling is authoritative.
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

  */
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
      const syncData = await nativeAdminInboxSync() as {
        stats?: { emails_retrieved?: number; emails_imported?: number; leads_created?: number; emails_linked?: number };
      };

      await loadKanbanData(false);

      const emailsSynced = syncData.stats?.emails_imported ?? syncData.stats?.emails_retrieved ?? 0;
      const leadsCreated = syncData.stats?.leads_created ?? 0;
      const emailsLinked = syncData.stats?.emails_linked ?? 0;

      setSyncMessage(
        `✅ Synchronisation terminée ! ${emailsSynced} emails sync, ${leadsCreated} leads créés, ${emailsLinked} emails liés`
      );

      setTimeout(() => setSyncMessage(null), 7000);
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
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
    moveInProgressRef.current = true;

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
      moveInProgressRef.current = false;
      await loadKanbanData(false);
      return;
    }

    moveInProgressRef.current = false;
    await loadKanbanData(false);
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
          lead.company_name?.toLowerCase().includes(searchLower) ||
          lead.city?.toLowerCase().includes(searchLower)
        );
      }

      if (selectedCollaborator) {
        result = result.filter(lead => lead.assigned_to === selectedCollaborator);
      } else if (viewFilter === 'mine' && user?.id) {
        result = result.filter(lead => lead.assigned_to === user.id);
      } else if (viewFilter === 'unassigned') {
        result = result.filter(lead => !lead.assigned_to);
      }

      filtered[status as PipelineStatus] = result.slice().sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    return filtered;
  }, [kanbanData, debouncedSearch, viewFilter, user?.id, selectedCollaborator]);

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
      <div className="h-full bg-[#f0f2f5] p-8 flex items-center justify-center">
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
    <div className="h-full bg-[#f0f2f5] flex flex-col overflow-hidden">
      {/* Header — dark taxi branding */}
      <div className="bg-[#111318] border-b border-black/20 z-10 shadow-md flex-shrink-0">
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
                className="w-full pl-9 pr-3 py-1.5 bg-white/[0.07] border border-white/[0.12] rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                style={{ color: '#ffffff', colorScheme: 'dark' }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${autoRefreshEnabled ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400' : 'border-white/[0.1] text-gray-500 hover:text-gray-300'}`}
                title={autoRefreshEnabled ? 'Désactiver auto-refresh' : 'Activer auto-refresh'}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${autoRefreshEnabled ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></div>
                Auto
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 border border-white/[0.1] text-gray-500 rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={handleSyncEmails}
                disabled={syncingEmails}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-yellow-600/60 bg-yellow-600/10 text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-600/20 transition-colors disabled:opacity-50"
              >
                <Mail size={13} className={syncingEmails ? 'animate-bounce' : ''} />
                {syncingEmails ? 'Sync...' : 'Emails'}
              </button>
              <button
                onClick={() => navigate('/backoffice/crm-killer')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg text-xs font-bold hover:from-yellow-400 hover:to-amber-400 transition-all shadow-sm shadow-yellow-900/30"
              >
                <Plus size={13} />
                Nouveau Lead
              </button>

              <div className="ml-1 pl-2 border-l border-white/[0.08]">
                {window.location.hostname === '__legacy-supabase-disabled__' && <RealtimeNotifications />}
              </div>
            </div>
          </div>

          {/* Alerts row */}
          {(error || syncMessage || newLeadNotification) && (
            <div className="mt-2 flex flex-col gap-1">
              {error && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/40 border border-red-700/50 rounded-lg text-red-300 text-xs">
                  <AlertCircle size={13} />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">✕</button>
                </div>
              )}
              {syncMessage && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${syncMessage.includes('✅') ? 'bg-green-900/40 border border-green-700/50 text-green-300' : syncMessage.includes('❌') ? 'bg-red-900/40 border border-red-700/50 text-red-300' : 'bg-yellow-900/40 border border-yellow-700/50 text-yellow-300'}`}>
                  <span className="flex-1 font-medium">{syncMessage}</span>
                  <button onClick={() => setSyncMessage(null)} className="hover:opacity-75">✕</button>
                </div>
              )}
              {newLeadNotification && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 text-black rounded-lg text-xs font-bold animate-pulse">
                  <div className="w-2 h-2 bg-black rounded-full animate-ping"></div>
                  <span className="flex-1">{newLeadNotification}</span>
                  <button onClick={() => setNewLeadNotification(null)} className="font-bold hover:opacity-75">✕</button>
                </div>
              )}
            </div>
          )}

          {/* Row 2: Assignment filter tabs */}
          <div className="mt-2 flex items-center gap-1">
            <button
              onClick={() => { setViewFilter('all'); setSelectedCollaborator(null); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                viewFilter === 'all' && !selectedCollaborator
                  ? 'bg-yellow-500 text-black shadow-sm'
                  : 'bg-white/[0.06] text-gray-400 border border-white/[0.08] hover:text-white hover:bg-white/[0.1]'
              )}
            >
              <Users size={11} />
              Tous les leads
            </button>
            <button
              onClick={() => { setViewFilter('mine'); setSelectedCollaborator(null); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                viewFilter === 'mine' && !selectedCollaborator
                  ? 'bg-yellow-500 text-black shadow-sm'
                  : 'bg-white/[0.06] text-gray-400 border border-white/[0.08] hover:text-white hover:bg-white/[0.1]'
              )}
            >
              <User size={11} />
              Mes leads
            </button>
            <button
              onClick={() => { setViewFilter('unassigned'); setSelectedCollaborator(null); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                viewFilter === 'unassigned' && !selectedCollaborator
                  ? 'bg-yellow-500 text-black shadow-sm'
                  : 'bg-white/[0.06] text-gray-400 border border-white/[0.08] hover:text-white hover:bg-white/[0.1]'
              )}
            >
              <User size={11} className="opacity-40" />
              Non attribues
            </button>
            {adminUsers.length > 0 && (
              <div className="ml-auto flex items-center gap-1 text-xs text-gray-600">
                <Users size={10} />
                {adminUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedCollaborator(prev => prev === u.id ? null : u.id);
                      setViewFilter('all');
                    }}
                    title={u.full_name}
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] transition-all",
                      selectedCollaborator === u.id
                        ? "bg-yellow-500 text-black border-2 border-yellow-400 ring-1 ring-yellow-400/50"
                        : "bg-white/[0.12] border border-white/[0.18] text-white hover:border-yellow-500"
                    )}
                  >
                    {u.full_name.charAt(0)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Row 3: Workflow funnel */}
          <div className="mt-2 flex items-center h-7 bg-white/[0.05] border border-white/[0.08] rounded-lg overflow-hidden text-xs">
            <div className="flex items-center gap-1 px-3 border-r border-white/[0.07] h-full">
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="font-bold text-white">{statistics.total}</span>
              <span className="text-gray-500">leads</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className={`flex items-center gap-1 px-3 border-r border-white/[0.07] h-full ${statistics.needsAction > 0 ? 'bg-red-500/10' : ''}`}>
              <AlertTriangle size={11} className="text-red-400" />
              <span className="font-bold text-red-300">{statistics.needsAction}</span>
              <span className="text-red-400/70">urgents</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className="flex items-center gap-1 px-3 border-r border-white/[0.07] h-full">
              <FileText size={11} className="text-yellow-400" />
              <span className="font-bold text-yellow-300">{statistics.documentsStage}</span>
              <span className="text-gray-500">docs</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className="flex items-center gap-1 px-3 border-r border-white/[0.07] h-full">
              <Building2 size={11} className="text-amber-400" />
              <span className="font-bold text-amber-300">{statistics.quoteStage}</span>
              <span className="text-gray-500">devis</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className="flex items-center gap-1 px-3 border-r border-white/[0.07] h-full">
              <PenTool size={11} className="text-gray-300" />
              <span className="font-bold text-white">{statistics.signatureStage}</span>
              <span className="text-gray-500">sign.</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className="flex items-center gap-1 px-3 border-r border-white/[0.07] h-full">
              <Euro size={11} className="text-emerald-400" />
              <span className="font-bold text-emerald-300">{statistics.paymentStage}</span>
              <span className="text-gray-500">paiement</span>
            </div>
            <div className="text-gray-600 px-1">›</div>
            <div className="flex items-center gap-1 px-3 bg-emerald-500/10 h-full">
              <TrendingUp size={11} className="text-emerald-400" />
              <span className="font-bold text-emerald-300">{statistics.active}</span>
              <span className="text-emerald-500/80">clients actifs</span>
            </div>
            <div className="ml-auto flex items-center px-3 border-l border-white/[0.07] h-full">
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
        <div className="flex gap-2.5 h-full" style={{ minWidth: 'max-content' }}>
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
                  'w-[284px] min-h-0 flex-shrink-0 transition-all duration-300 flex flex-col rounded-xl overflow-hidden',
                  isDropTarget ? 'scale-[1.012]' : ''
                )}
                style={{
                  height: 'calc(100vh - 196px)',
                  maxHeight: 'calc(100vh - 196px)',
                  background: '#ffffff',
                  boxShadow: isDropTarget
                    ? `0 0 0 2px ${accentColor}90, 0 8px 24px rgba(0,0,0,0.12)`
                    : '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)',
                }}
              >
                {/* Colored top stripe */}
                <div
                  className="flex-shrink-0 transition-all duration-300"
                  style={{
                    height: '4px',
                    background: isDropTarget
                      ? `linear-gradient(90deg, ${accentColor}, #eab308)`
                      : `linear-gradient(90deg, ${accentColor}cc, ${accentColor}44)`,
                  }}
                />

                {/* Column header */}
                <div
                  className="flex-shrink-0 px-3 pt-2.5 pb-2.5"
                  style={{
                    background: `linear-gradient(180deg, ${accentColor}12 0%, #fafafa 100%)`,
                    borderBottom: `1px solid rgba(0,0,0,0.06)`,
                  }}
                >
                  {/* Title row */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                        style={{
                          background: `${accentColor}20`,
                          border: `1px solid ${accentColor}35`,
                        }}
                      >
                        {statusInfo.icon}
                      </div>
                      <h3 className="text-sm font-bold text-gray-800 truncate">{statusInfo.label}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-xs font-bold px-1.5 transition-all duration-200"
                        style={isDropTarget ? {
                          background: '#f59e0b',
                          color: '#000',
                          transform: 'scale(1.1)',
                        } : {
                          background: `${accentColor}18`,
                          color: accentColor,
                          border: `1px solid ${accentColor}35`,
                        }}
                      >
                        {leads.length}
                      </span>
                    </div>
                  </div>

                  {/* Quality + notifications row */}
                  <div className="flex items-center gap-1.5 min-h-[18px]">
                    {leads.length > 0 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-16 h-1 bg-black/[0.08] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${avgQuality}%`, backgroundColor: accentColor }}
                          />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: accentColor }}>{avgQuality}%</span>
                      </div>
                    )}
                    {columnNotifications[status] && (
                      <div className="flex items-center gap-1 ml-auto">
                        {columnNotifications[status].newEmails > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold animate-pulse" style={{ background: 'rgba(59,130,246,0.12)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.25)' }}>
                            <Mail size={8} />{columnNotifications[status].newEmails}
                          </div>
                        )}
                        {columnNotifications[status].newDocuments > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold animate-pulse" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}>
                            <FileCheck size={8} />{columnNotifications[status].newDocuments}
                          </div>
                        )}
                        {columnNotifications[status].missedCalls > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold animate-pulse" style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' }}>
                            <Phone size={8} />{columnNotifications[status].missedCalls}
                          </div>
                        )}
                        {columnNotifications[status].pendingSignatures > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'rgba(100,116,139,0.12)', color: '#475569', border: '1px solid rgba(100,116,139,0.2)' }}>
                            <PenTool size={8} />{columnNotifications[status].pendingSignatures}
                          </div>
                        )}
                        {columnNotifications[status].paymentDue > 0 && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)' }}>
                            <Euro size={8} />{columnNotifications[status].paymentDue}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column scrollable cards area */}
                <div
                  className={cn(
                    'flex-1 min-h-0 overflow-y-scroll overscroll-contain p-2 space-y-2 transition-all duration-300',
                    isDropTarget && 'bg-yellow-50'
                  )}
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.12) transparent' }}
                >
                  {leads.length === 0 ? (
                    <div
                      className="rounded-xl p-8 text-center transition-all duration-300 mt-1"
                      style={{
                        border: `1px dashed ${isDropTarget ? accentColor + '60' : 'rgba(0,0,0,0.12)'}`,
                        background: isDropTarget ? `${accentColor}08` : 'transparent',
                      }}
                    >
                      {isDropTarget ? (
                        <div className="space-y-1">
                          <div className="text-2xl" style={{ color: accentColor }}>↓</div>
                          <p className="text-xs font-semibold animate-pulse" style={{ color: accentColor }}>Deposez ici</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600">Aucun lead</p>
                      )}
                    </div>
                  ) : (
                    leads.map((lead, leadIndex) => (
                      <PipelineCard
                        key={`${status}-${lead.id}-${leadIndex}`}
                        lead={lead}
                        onClick={() => navigate(`/backoffice/crm-killer/lead/${lead.id}`)}
                        onDragStart={() => handleDragStart(lead)}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedLead?.id === lead.id}
                        assigneeName={lead.assigned_to ? adminUsersMap[lead.assigned_to] : undefined}
                        onStatusChange={(_leadId, _newStatus) => loadKanbanData(false)}
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
