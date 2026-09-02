import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Mail,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  ShieldCheck,
  Timer,
  UserCheck,
  XCircle,
  Zap,
} from 'lucide-react';
import { nativeAdminCall } from '@/lib/native-admin-data';
import { toast } from '@/lib/toast';

type DossierStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'closed' | 'responded';
type ViewFilter = 'action' | 'waiting_response' | 'failed' | 'responded' | 'all';

interface DossierRow {
  id: string;
  lead_id: string;
  insurance_company_id: string | null;
  contact_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  company_name: string | null;
  subject: string;
  message: string | null;
  documents: unknown;
  status: DossierStatus;
  send_type: 'initial' | 'followup';
  attempts: number;
  max_attempts: number;
  followup_step: number;
  scheduled_at: string;
  sent_at: string | null;
  last_followup_at: string | null;
  next_followup_at: string | null;
  processed_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface LeadSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  current_stage_key: string | null;
  ai_qualification_score: number | null;
  source: string | null;
  created_at: string;
}

interface CompanySummary {
  id: string;
  name: string | null;
  code: string | null;
  logo_url: string | null;
  is_active: boolean | null;
}

interface Metric {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: string;
  detail: string;
}

const statusLabel: Record<DossierStatus, string> = {
  pending: 'A envoyer',
  processing: 'En cours',
  sent: 'Envoye',
  failed: 'Erreur',
  cancelled: 'Annule',
  closed: 'Clos',
  responded: 'Reponse',
};

const statusClass: Record<DossierStatus, string> = {
  pending: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  processing: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  sent: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
  failed: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  cancelled: 'border-slate-400/30 bg-slate-400/10 text-slate-300',
  closed: 'border-slate-400/30 bg-slate-400/10 text-slate-300',
  responded: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
};

function isDue(value: string | null | undefined) {
  if (!value) return false;
  return new Date(value).getTime() <= Date.now();
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function leadName(lead?: LeadSummary) {
  if (!lead) return 'Lead inconnu';
  const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
  return fullName || lead.email || 'Lead sans nom';
}

function documentsCount(row: DossierRow) {
  return Array.isArray(row.documents) ? row.documents.length : 0;
}

function hoursSince(value: string | null | undefined) {
  if (!value) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 3_600_000) / 10);
}

function isFollowupDue(row: DossierRow) {
  return row.status === 'sent' && row.followup_step < 2 && isDue(row.next_followup_at);
}

function needsAction(row: DossierRow) {
  return row.status === 'pending' || row.status === 'processing' || row.status === 'failed' || isFollowupDue(row);
}

function DossierBadge({ status }: { status: DossierStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

function MetricTile({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{metric.label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{metric.value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${metric.tone}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{metric.detail}</p>
    </div>
  );
}

export default function InsurerDossierCommandCenter() {
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [leadsById, setLeadsById] = useState<Record<string, LeadSummary>>({});
  const [companiesById, setCompaniesById] = useState<Record<string, CompanySummary>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ViewFilter>('action');
  const [query, setQuery] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await nativeAdminCall<{
        dossiers?: DossierRow[];
        leads?: LeadSummary[];
        companies?: CompanySummary[];
      }>('/v1/admin/insurer-dossiers');
      const rows = (result.dossiers || []).map((row) => ({
        ...row,
        status: (row.status || 'pending') as DossierStatus,
      }));
      setDossiers(rows);
      const leads = result.leads || [];
      const companies = result.companies || [];

      setLeadsById(Object.fromEntries(leads.map((lead) => [lead.id, lead])) as Record<string, LeadSummary>);
      setCompaniesById(Object.fromEntries(companies.map((company) => [company.id, company])) as Record<string, CompanySummary>);
    } catch (error) {
      console.error('Insurer dossier command center load failed:', error);
      toast.error('Chargement dossiers assureurs impossible');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const refreshTimer = window.setInterval(() => loadData(true), 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [loadData]);

  const metrics = useMemo<Metric[]>(() => {
    const pending = dossiers.filter((row) => row.status === 'pending').length;
    const failed = dossiers.filter((row) => row.status === 'failed').length;
    const followups = dossiers.filter(isFollowupDue).length;
    const responded = dossiers.filter((row) => row.status === 'responded').length;
    const waiting = dossiers.filter((row) => row.status === 'sent' && !isFollowupDue(row)).length;

    return [
      {
        label: 'A traiter',
        value: pending + followups + failed,
        icon: Zap,
        tone: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
        detail: `${pending} envoi(s), ${followups} relance(s), ${failed} erreur(s)`,
      },
      {
        label: 'En attente',
        value: waiting,
        icon: Timer,
        tone: 'border-blue-400/25 bg-blue-400/10 text-blue-200',
        detail: 'Dossiers envoyes sans retour marque',
      },
      {
        label: 'Reponses',
        value: responded,
        icon: UserCheck,
        tone: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
        detail: 'Relances stoppees par action humaine',
      },
      {
        label: 'Pieces',
        value: dossiers.reduce((sum, row) => sum + documentsCount(row), 0),
        icon: FileText,
        tone: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200',
        detail: 'Documents transmis via la file auditee',
      },
    ];
  }, [dossiers]);

  const filteredDossiers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return dossiers
      .filter((row) => {
        if (filter === 'action') return needsAction(row);
        if (filter === 'waiting_response') return row.status === 'sent';
        if (filter === 'failed') return row.status === 'failed';
        if (filter === 'responded') return row.status === 'responded';
        return true;
      })
      .filter((row) => {
        if (!normalized) return true;
        const lead = leadsById[row.lead_id];
        const company = row.insurance_company_id ? companiesById[row.insurance_company_id] : undefined;
        return [
          leadName(lead),
          lead?.email,
          lead?.phone,
          lead?.city,
          row.recipient_email,
          row.recipient_name,
          row.company_name,
          company?.name,
          row.subject,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      })
      .sort((a, b) => {
        const score = (row: DossierRow) => {
          if (row.status === 'failed') return 1000 + hoursSince(row.updated_at);
          if (isFollowupDue(row)) return 800 + hoursSince(row.next_followup_at);
          if (row.status === 'pending') return 700 + hoursSince(row.scheduled_at);
          if (row.status === 'processing') return 600;
          return new Date(row.created_at).getTime() / 100_000_000_000;
        };
        return score(b) - score(a);
      });
  }, [companiesById, dossiers, filter, leadsById, query]);

  const markResponded = async (row: DossierRow) => {
    const note = window.prompt('Note reponse assureur', 'Reponse recue. Relances stoppees.');
    if (note === null) return;

    try {
      await nativeAdminCall(`/v1/admin/leads/${encodeURIComponent(row.lead_id)}/insurer-dossier`, {
        method: 'PATCH',
        body: JSON.stringify({ send_id: row.id, action: 'mark_responded', note: note.trim() || null }),
      });
      toast.success('Reponse assureur marquee');
      await loadData(true);
    } catch (error) {
      console.error('Mark insurer dossier responded failed:', error);
      toast.error('Impossible de marquer la reponse');
    }
  };

  const retryDossier = async (row: DossierRow) => {
    try {
      await nativeAdminCall(`/v1/admin/leads/${encodeURIComponent(row.lead_id)}/insurer-dossier`, {
        method: 'PATCH',
        body: JSON.stringify({ send_id: row.id, action: 'retry' }),
      });
      toast.success('Dossier reprogramme');
      await loadData(true);
    } catch (error) {
      console.error('Retry insurer dossier failed:', error);
      toast.error('Reprogrammation impossible');
    }
  };

  const cancelDossier = async (row: DossierRow) => {
    if (!window.confirm('Annuler cette demande assureur ?')) return;

    try {
      await nativeAdminCall(`/v1/admin/leads/${encodeURIComponent(row.lead_id)}/insurer-dossier`, {
        method: 'PATCH',
        body: JSON.stringify({ send_id: row.id, action: 'cancel' }),
      });
      toast.success('Demande annulee');
      await loadData(true);
    } catch (error) {
      console.error('Cancel insurer dossier failed:', error);
      toast.error('Annulation impossible');
    }
  };

  const copyRecipient = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success('Email copie');
    } catch {
      toast.info(email);
    }
  };

  const openLead = (leadId: string) => {
    navigate(`/backoffice/crm/lead/${leadId}`);
  };

  const filters: { key: ViewFilter; label: string; icon: React.ElementType }[] = [
    { key: 'action', label: 'Action', icon: Zap },
    { key: 'waiting_response', label: 'Attente', icon: Clock },
    { key: 'failed', label: 'Erreurs', icon: AlertTriangle },
    { key: 'responded', label: 'Reponses', icon: CheckCircle },
    { key: 'all', label: 'Tous', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#0b0e14] px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
                <Send size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">Production assureurs</p>
                <h1 className="mt-1 text-2xl font-bold tracking-normal text-white sm:text-3xl">Dossiers assureurs</h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={() => navigate('/backoffice/quote-queue')}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/15"
            >
              <ArrowRight size={15} />
              File devis
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricTile key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.035]">
          <div className="flex flex-col gap-3 border-b border-white/10 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {filters.map((item) => {
                const Icon = item.icon;
                const active = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
                      active
                        ? 'border-cyan-400/35 bg-cyan-400/10 text-cyan-100'
                        : 'border-white/10 bg-transparent text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher lead, assureur, email"
                className="h-10 w-full rounded-lg border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <RefreshCw className="animate-spin text-cyan-300" size={28} />
            </div>
          ) : filteredDossiers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <ShieldCheck className="text-emerald-300" size={34} />
              <div>
                <p className="font-semibold text-white">Aucun dossier dans cette vue</p>
                <p className="mt-1 text-sm text-slate-500">Changez le filtre ou actualisez la file.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1080px] text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 font-semibold">Lead</th>
                      <th className="px-4 py-3 font-semibold">Assureur</th>
                      <th className="px-4 py-3 font-semibold">Statut</th>
                      <th className="px-4 py-3 font-semibold">Relance</th>
                      <th className="px-4 py-3 font-semibold">Pieces</th>
                      <th className="px-4 py-3 font-semibold">Derniere trace</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredDossiers.map((row) => {
                      const lead = leadsById[row.lead_id];
                      const company = row.insurance_company_id ? companiesById[row.insurance_company_id] : undefined;
                      const urgent = row.status === 'failed' || isFollowupDue(row) || (row.status === 'pending' && isDue(row.scheduled_at));

                      return (
                        <tr key={row.id} className={urgent ? 'bg-amber-400/[0.035]' : undefined}>
                          <td className="px-4 py-4">
                            <button type="button" onClick={() => openLead(row.lead_id)} className="group text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white group-hover:text-cyan-200">{leadName(lead)}</span>
                                <ExternalLink size={13} className="text-slate-500 group-hover:text-cyan-300" />
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{lead?.city || '-'} {lead?.phone ? `- ${lead.phone}` : ''}</p>
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                                <Building2 size={16} className="text-cyan-200" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-100">{company?.name || row.company_name || 'Assureur'}</p>
                                <button type="button" onClick={() => copyRecipient(row.recipient_email)} className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-200">
                                  <Copy size={12} />
                                  {row.recipient_email}
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                              <DossierBadge status={row.status} />
                              <span className="text-xs text-slate-500">Tentative {row.attempts}/{row.max_attempts}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-slate-300">
                              <div className="flex items-center gap-2">
                                <CalendarClock size={14} className={isFollowupDue(row) ? 'text-amber-300' : 'text-slate-500'} />
                                {row.next_followup_at ? formatDate(row.next_followup_at) : 'Aucune'}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">Etape {row.followup_step}/2</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-slate-200">
                              <FileText size={14} className="text-cyan-200" />
                              {documentsCount(row)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-slate-300">{formatDate(row.updated_at)}</p>
                            {row.last_error && <p className="mt-1 max-w-xs truncate text-xs text-rose-300">{row.last_error}</p>}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => markResponded(row)}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/15"
                              >
                                <CheckCircle size={14} />
                                Reponse
                              </button>
                              {(row.status === 'failed' || row.status === 'cancelled') && (
                                <button
                                  type="button"
                                  onClick={() => retryDossier(row)}
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/15"
                                >
                                  <RotateCw size={14} />
                                  Rejouer
                                </button>
                              )}
                              {row.status !== 'responded' && row.status !== 'closed' && row.status !== 'cancelled' && (
                                <button
                                  type="button"
                                  onClick={() => cancelDossier(row)}
                                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-transparent px-3 text-xs font-semibold text-slate-300 hover:bg-white/[0.05]"
                                >
                                  <XCircle size={14} />
                                  Stop
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {filteredDossiers.map((row) => {
                  const lead = leadsById[row.lead_id];
                  const company = row.insurance_company_id ? companiesById[row.insurance_company_id] : undefined;
                  return (
                    <div key={row.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button type="button" onClick={() => openLead(row.lead_id)} className="flex min-w-0 items-center gap-2 text-left">
                            <span className="truncate font-semibold text-white">{leadName(lead)}</span>
                            <ExternalLink size={13} className="shrink-0 text-cyan-300" />
                          </button>
                          <p className="mt-1 text-xs text-slate-500">{company?.name || row.company_name || 'Assureur'}</p>
                        </div>
                        <DossierBadge status={row.status} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-xs text-slate-500">Relance</p>
                          <p className="mt-1 font-medium text-slate-200">{row.next_followup_at ? formatDate(row.next_followup_at) : 'Aucune'}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-xs text-slate-500">Pieces</p>
                          <p className="mt-1 font-medium text-slate-200">{documentsCount(row)}</p>
                        </div>
                      </div>

                      {row.last_error && (
                        <div className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                          {row.last_error}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => markResponded(row)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-100">
                          <CheckCircle size={14} />
                          Reponse
                        </button>
                        {(row.status === 'failed' || row.status === 'cancelled') && (
                          <button type="button" onClick={() => retryDossier(row)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-100">
                            <RotateCw size={14} />
                            Rejouer
                          </button>
                        )}
                        {row.status !== 'responded' && row.status !== 'closed' && row.status !== 'cancelled' && (
                          <button type="button" onClick={() => cancelDossier(row)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-transparent px-3 text-xs font-semibold text-slate-300">
                            <XCircle size={14} />
                            Stop
                          </button>
                        )}
                        <button type="button" onClick={() => copyRecipient(row.recipient_email)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-transparent px-3 text-xs font-semibold text-slate-300">
                          <Mail size={14} />
                          Email
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
