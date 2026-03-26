import React, { useEffect, useState, useMemo } from 'react';
import {
  Receipt, FileText, CheckCircle, XCircle, Clock, Send,
  Search, Filter, Eye, Download, ExternalLink, User,
  Building2, Calendar, TrendingUp, AlertCircle, ChevronDown,
  ChevronUp, Phone, Mail, X, FileCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface Quote {
  id: string;
  lead_id: string;
  company_id: string;
  status: string;
  quote_amount: number | null;
  quote_file_url: string | null;
  quote_pdf_url: string | null;
  notes: string | null;
  refusal_reason: string | null;
  refusal_reason_code: string | null;
  version: number;
  created_at: string;
  submitted_at: string | null;
  validated_at: string | null;
  quote_accepted_at: string | null;
  refused_at: string | null;
  sent_to_client_at: string | null;
  last_sent_at: string | null;
  lead: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    vehicle_type: string;
    status: string;
    pipeline_stage: string;
  } | null;
  company: {
    name: string;
    logo_url: string | null;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  validated: { label: 'Accept\u00e9', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
  pending: { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  refused: { label: 'Refus\u00e9', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
  quote_submitted: { label: 'Soumis', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Send },
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  NOUVEAU_LEAD: 'Nouveau',
  COLLECTE_DOCUMENTS: 'Collecte docs',
  DEVIS: 'Devis',
  CONTRAT_SIGNATURE: 'Signature',
  CLIENT_ACTIF: 'Client actif',
  RELANCE: 'Relance',
  PERDU: 'Perdu',
  RECONTACT_PROGRAMME: 'Recontact',
};

const QuotesManager: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_company_quotes')
        .select(`
          id, lead_id, company_id, status, quote_amount,
          quote_file_url, quote_pdf_url, notes, refusal_reason,
          refusal_reason_code, version, created_at, submitted_at,
          validated_at, quote_accepted_at, refused_at,
          sent_to_client_at, last_sent_at,
          lead:crm_leads(first_name, last_name, email, phone, vehicle_type, status, pipeline_stage),
          company:insurance_companies(name, logo_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes((data as any[]) || []);
    } catch (error) {
      console.error('Failed to load quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = quotes.length;
    const validated = quotes.filter(q => q.status === 'validated').length;
    const pending = quotes.filter(q => q.status === 'pending').length;
    const refused = quotes.filter(q => q.status === 'refused').length;
    const submitted = quotes.filter(q => q.status === 'quote_submitted').length;
    const withFile = quotes.filter(q => q.quote_file_url || q.quote_pdf_url).length;
    const uniqueLeads = new Set(quotes.map(q => q.lead_id)).size;
    const conversionRate = total > 0 ? Math.round((validated / total) * 100) : 0;
    return { total, validated, pending, refused, submitted, withFile, uniqueLeads, conversionRate };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = `${q.lead?.first_name || ''} ${q.lead?.last_name || ''}`.toLowerCase();
        const email = (q.lead?.email || '').toLowerCase();
        const company = (q.company?.name || '').toLowerCase();
        return name.includes(term) || email.includes(term) || company.includes(term);
      }
      return true;
    });
  }, [quotes, statusFilter, searchTerm]);

  const groupedByLead = useMemo(() => {
    const groups: Record<string, Quote[]> = {};
    filteredQuotes.forEach(q => {
      if (!groups[q.lead_id]) groups[q.lead_id] = [];
      groups[q.lead_id].push(q);
    });
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].created_at).getTime();
      const dateB = new Date(b[1][0].created_at).getTime();
      return dateB - dateA;
    });
  }, [filteredQuotes]);

  const toggleLead = (leadId: string) => {
    setExpandedLeads(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: AlertCircle };
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Chargement des devis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Gestion des Devis</h1>
            <p className="text-gray-400 text-sm">{stats.total} devis pour {stats.uniqueLeads} prospects</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} icon={Receipt} color="bg-slate-700" />
          <StatCard label="Accept\u00e9s" value={stats.validated} icon={CheckCircle} color="bg-emerald-600/20" textColor="text-emerald-400" />
          <StatCard label="En attente" value={stats.pending} icon={Clock} color="bg-amber-600/20" textColor="text-amber-400" />
          <StatCard label="Refus\u00e9s" value={stats.refused} icon={XCircle} color="bg-red-600/20" textColor="text-red-400" />
          <StatCard label="Avec PDF" value={stats.withFile} icon={FileText} color="bg-blue-600/20" textColor="text-blue-400" />
          <StatCard label="Taux accept." value={`${stats.conversionRate}%`} icon={TrendingUp} color="bg-teal-600/20" textColor="text-teal-400" />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher prospect, email, compagnie..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg p-1">
            {[
              { key: 'all', label: 'Tous' },
              { key: 'validated', label: 'Accept\u00e9s' },
              { key: 'pending', label: 'En attente' },
              { key: 'refused', label: 'Refus\u00e9s' },
              { key: 'quote_submitted', label: 'Soumis' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  statusFilter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {groupedByLead.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
            <Receipt className="w-14 h-14 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 text-lg font-medium">Aucun devis trouv\u00e9</p>
            <p className="text-gray-500 text-sm mt-1">Modifiez vos filtres pour voir plus de r\u00e9sultats</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByLead.map(([leadId, leadQuotes]) => {
              const lead = leadQuotes[0].lead;
              const isExpanded = expandedLeads.has(leadId);
              const validatedCount = leadQuotes.filter(q => q.status === 'validated').length;
              const refusedCount = leadQuotes.filter(q => q.status === 'refused').length;
              const pendingCount = leadQuotes.filter(q => q.status === 'pending').length;

              return (
                <div key={leadId} className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleLead(leadId)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">
                            {lead?.first_name} {lead?.last_name}
                          </span>
                          {lead?.status && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              lead.status === 'CLIENT_ACTIF' ? 'bg-emerald-900/50 text-emerald-300' :
                              lead.status === 'PERDU' ? 'bg-red-900/50 text-red-300' :
                              lead.status === 'DEVIS' ? 'bg-blue-900/50 text-blue-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {LEAD_STATUS_LABELS[lead.status] || lead.status}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead?.email}
                          </span>
                          {lead?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">{leadQuotes.length} devis</span>
                        {validatedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 font-medium">
                            {validatedCount} accept\u00e9{validatedCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {refusedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 font-medium">
                            {refusedCount} refus\u00e9{refusedCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {pendingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 font-medium">
                            {pendingCount} en attente
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-700 px-5 py-4">
                      <div className="grid gap-3">
                        {leadQuotes.map(quote => (
                          <div
                            key={quote.id}
                            className={`flex items-center justify-between p-4 rounded-lg border transition-all hover:border-gray-500 ${
                              quote.status === 'validated' ? 'bg-emerald-900/10 border-emerald-800/30' :
                              quote.status === 'refused' ? 'bg-red-900/10 border-red-800/30' :
                              'bg-gray-700/30 border-gray-600/30'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {quote.company?.logo_url ? (
                                  <img
                                    src={quote.company.logo_url}
                                    alt={quote.company.name}
                                    className="w-8 h-8 object-contain"
                                  />
                                ) : (
                                  <Building2 className="w-5 h-5 text-gray-500" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium text-sm">
                                    {quote.company?.name || 'Compagnie inconnue'}
                                  </span>
                                  {getStatusBadge(quote.status)}
                                  {quote.version > 1 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                                      v{quote.version}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Cr\u00e9\u00e9 le {formatDate(quote.created_at)}
                                  </span>
                                  {quote.last_sent_at && (
                                    <span>Envoy\u00e9 le {formatDate(quote.last_sent_at)}</span>
                                  )}
                                  {quote.quote_accepted_at && (
                                    <span className="text-emerald-400">Accept\u00e9 le {formatDate(quote.quote_accepted_at)}</span>
                                  )}
                                  {quote.refused_at && (
                                    <span className="text-red-400">Refus\u00e9 le {formatDate(quote.refused_at)}</span>
                                  )}
                                </div>
                                {quote.refusal_reason && (
                                  <p className="mt-1.5 text-xs text-red-300/80 bg-red-900/20 px-2 py-1 rounded max-w-lg">
                                    Motif : {quote.refusal_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {quote.quote_amount && (
                                <span className="text-lg font-bold text-white">
                                  {quote.quote_amount.toLocaleString('fr-FR')}\u20ac
                                </span>
                              )}
                              {(quote.quote_file_url || quote.quote_pdf_url) && (
                                <a
                                  href={quote.quote_pdf_url || quote.quote_file_url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-colors"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Voir PDF
                                </a>
                              )}
                              <button
                                onClick={() => setSelectedQuote(quote)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-600/30 text-gray-300 hover:bg-gray-600/50 text-xs font-medium transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                D\u00e9tail
                              </button>
                              <Link
                                to={`/backoffice/crm/leads/${quote.lead_id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-600/30 text-gray-300 hover:bg-gray-600/50 text-xs font-medium transition-colors"
                                onClick={e => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Fiche
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedQuote && (
        <QuoteDetailModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
      )}
    </div>
  );
};

function StatCard({ label, value, icon: Icon, color, textColor = 'text-white' }: {
  label: string; value: string | number; icon: React.ElementType; color: string; textColor?: string;
}) {
  return (
    <div className={`${color} rounded-xl p-4 border border-white/5`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${textColor}`} />
        <span className="text-gray-400 text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

function QuoteDetailModal({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const cfg = STATUS_CONFIG[quote.status] || { label: quote.status, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: AlertCircle };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {quote.company?.logo_url ? (
              <img src={quote.company.logo_url} alt="" className="w-10 h-10 rounded-lg bg-white p-1 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div>
              <h3 className="text-white font-semibold">{quote.company?.name || 'Compagnie'}</h3>
              <p className="text-gray-400 text-sm">
                {quote.lead?.first_name} {quote.lead?.last_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm w-28">Statut</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
              <cfg.icon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>
          {quote.quote_amount && (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm w-28">Montant</span>
              <span className="text-white font-bold text-lg">{quote.quote_amount.toLocaleString('fr-FR')}\u20ac</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm w-28">Version</span>
            <span className="text-white text-sm">v{quote.version}</span>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Chronologie</h4>
            <div className="space-y-2 text-sm">
              <TimelineRow label="Cr\u00e9\u00e9" date={formatDateTime(quote.created_at)} />
              <TimelineRow label="Soumis" date={formatDateTime(quote.submitted_at)} />
              <TimelineRow label="Envoy\u00e9" date={formatDateTime(quote.last_sent_at)} />
              <TimelineRow label="Envoy\u00e9 au client" date={formatDateTime(quote.sent_to_client_at)} />
              <TimelineRow label="Accept\u00e9" date={formatDateTime(quote.quote_accepted_at)} highlight="emerald" />
              <TimelineRow label="Valid\u00e9" date={formatDateTime(quote.validated_at)} highlight="emerald" />
              <TimelineRow label="Refus\u00e9" date={formatDateTime(quote.refused_at)} highlight="red" />
            </div>
          </div>

          {quote.refusal_reason && (
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Motif de refus</h4>
              <p className="text-red-300 text-sm bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                {quote.refusal_reason}
              </p>
            </div>
          )}

          {quote.notes && (
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Notes</h4>
              <p className="text-gray-300 text-sm">{quote.notes}</p>
            </div>
          )}

          {(quote.quote_file_url || quote.quote_pdf_url) && (
            <div className="border-t border-gray-700 pt-4">
              <a
                href={quote.quote_pdf_url || quote.quote_file_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <FileText className="w-4 h-4" />
                T\u00e9l\u00e9charger le PDF du devis
              </a>
            </div>
          )}

          <div className="border-t border-gray-700 pt-4">
            <Link
              to={`/backoffice/crm/leads/${quote.lead_id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir la fiche prospect
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ label, date, highlight }: { label: string; date: string; highlight?: string }) {
  if (date === '-') return null;
  const color = highlight === 'emerald' ? 'text-emerald-400' : highlight === 'red' ? 'text-red-400' : 'text-gray-300';
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-500 w-32 text-xs">{label}</span>
      <span className={`text-xs ${color}`}>{date}</span>
    </div>
  );
}

export default QuotesManager;
