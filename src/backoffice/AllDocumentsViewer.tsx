import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText, Eye, Search, User, Calendar, CheckCircle, Clock,
  XCircle, Filter, ChevronDown, ChevronUp, ExternalLink,
  Mail, Phone, File, Image, FileSpreadsheet, Building2,
  Download, TrendingUp, Shield, AlertCircle, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { nativeAdminCall, nativeAdminDocumentUrl } from '@/lib/native-admin-data';

interface Document {
  id: string;
  lead_id: string;
  document_type: string;
  file_name: string;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  uploaded_by: string | null;
  uploaded_at: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  bucket: string | null;
  custom_label: string | null;
  file_url: string | null;
  created_at: string;
  lead: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    status: string;
  } | null;
}

const DOC_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  carte_identite: { label: 'Carte d\'identit\u00e9', icon: Shield, color: 'text-blue-400 bg-blue-900/30' },
  permis_conduire: { label: 'Permis de conduire', icon: FileText, color: 'text-cyan-400 bg-cyan-900/30' },
  carte_grise: { label: 'Carte grise', icon: File, color: 'text-orange-400 bg-orange-900/30' },
  kbis: { label: 'KBIS', icon: Building2, color: 'text-emerald-400 bg-emerald-900/30' },
  carte_professionnelle: { label: 'Carte professionnelle', icon: Shield, color: 'text-teal-400 bg-teal-900/30' },
  licence_taxi: { label: 'Licence taxi', icon: FileText, color: 'text-amber-400 bg-amber-900/30' },
  autorisation_stationnement: { label: 'Autorisation stationn.', icon: FileText, color: 'text-sky-400 bg-sky-900/30' },
  releve_information: { label: 'Relev\u00e9 d\'information', icon: FileSpreadsheet, color: 'text-rose-400 bg-rose-900/30' },
  rib: { label: 'RIB', icon: Building2, color: 'text-green-400 bg-green-900/30' },
  devis_signe: { label: 'Devis sign\u00e9', icon: FileText, color: 'text-blue-400 bg-blue-900/30' },
  contrat: { label: 'Contrat', icon: FileText, color: 'text-emerald-400 bg-emerald-900/30' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  validated: { label: 'Valid\u00e9', color: 'text-emerald-400', bg: 'bg-emerald-900/40 border-emerald-700/40', icon: CheckCircle },
  pending: { label: 'En attente', color: 'text-amber-400', bg: 'bg-amber-900/40 border-amber-700/40', icon: Clock },
  rejected: { label: 'Rejet\u00e9', color: 'text-red-400', bg: 'bg-red-900/40 border-red-700/40', icon: XCircle },
};

const AllDocumentsViewer: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const result = await nativeAdminCall<{ documents?: Array<Document & { lead_first_name?: string; lead_last_name?: string; lead_email?: string; lead_phone?: string; lead_status?: string }> }>('/v1/admin/documents?scope=all');
      setDocuments((result.documents || []).map((document) => ({
        ...document,
        lead: document.lead || {
          first_name: document.lead_first_name || '',
          last_name: document.lead_last_name || '',
          email: document.lead_email || '',
          phone: document.lead_phone || '',
          status: document.lead_status || ''
        }
      })));
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = documents.length;
    const validated = documents.filter(d => d.status === 'validated').length;
    const pending = documents.filter(d => d.status === 'pending').length;
    const rejected = documents.filter(d => d.status === 'rejected').length;
    const uniqueLeads = new Set(documents.map(d => d.lead_id)).size;
    const validationRate = total > 0 ? Math.round((validated / total) * 100) : 0;
    return { total, validated, pending, rejected, uniqueLeads, validationRate };
  }, [documents]);

  const docTypes = useMemo(() => {
    const types = new Set(documents.map(d => d.document_type));
    return Array.from(types).sort();
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (typeFilter !== 'all' && d.document_type !== typeFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = `${d.lead?.first_name || ''} ${d.lead?.last_name || ''}`.toLowerCase();
        const email = (d.lead?.email || '').toLowerCase();
        const fileName = (d.file_name || '').toLowerCase();
        const docType = getDocLabel(d.document_type).toLowerCase();
        return name.includes(term) || email.includes(term) || fileName.includes(term) || docType.includes(term);
      }
      return true;
    });
  }, [documents, statusFilter, typeFilter, searchTerm]);

  const groupedByLead = useMemo(() => {
    const groups: Record<string, Document[]> = {};
    filteredDocs.forEach(d => {
      if (!groups[d.lead_id]) groups[d.lead_id] = [];
      groups[d.lead_id].push(d);
    });
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].created_at).getTime();
      const dateB = new Date(b[1][0].created_at).getTime();
      return dateB - dateA;
    });
  }, [filteredDocs]);

  const toggleLead = (leadId: string) => {
    setExpandedLeads(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string | null, fileName: string) => {
    if (mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) return Image;
    return FileText;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Chargement des documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Tous les Documents</h1>
            <p className="text-gray-400 text-sm">{stats.total} documents pour {stats.uniqueLeads} prospects</p>
          </div>
          <button
            onClick={loadDocuments}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} icon={FileText} color="bg-slate-700" />
          <StatCard label="Valid\u00e9s" value={stats.validated} icon={CheckCircle} color="bg-emerald-600/20" textColor="text-emerald-400" />
          <StatCard label="En attente" value={stats.pending} icon={Clock} color="bg-amber-600/20" textColor="text-amber-400" />
          <StatCard label="Rejet\u00e9s" value={stats.rejected} icon={XCircle} color="bg-red-600/20" textColor="text-red-400" />
          <StatCard label="Prospects" value={stats.uniqueLeads} icon={User} color="bg-blue-600/20" textColor="text-blue-400" />
          <StatCard label="Taux valid." value={`${stats.validationRate}%`} icon={TrendingUp} color="bg-teal-600/20" textColor="text-teal-400" />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher prospect, fichier, type..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg p-1">
            {[
              { key: 'all', label: 'Tous' },
              { key: 'validated', label: 'Valid\u00e9s' },
              { key: 'pending', label: 'En attente' },
              { key: 'rejected', label: 'Rejet\u00e9s' },
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
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les types</option>
            {docTypes.map(t => (
              <option key={t} value={t}>{getDocLabel(t)}</option>
            ))}
          </select>
        </div>

        {groupedByLead.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
            <FileText className="w-14 h-14 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 text-lg font-medium">Aucun document trouv\u00e9</p>
            <p className="text-gray-500 text-sm mt-1">Modifiez vos filtres pour voir plus de r\u00e9sultats</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByLead.map(([leadId, leadDocs]) => {
              const lead = leadDocs[0].lead;
              const isExpanded = expandedLeads.has(leadId);
              const validatedCount = leadDocs.filter(d => d.status === 'validated').length;
              const pendingCount = leadDocs.filter(d => d.status === 'pending').length;

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
                              lead.status === 'COLLECTE_DOCUMENTS' ? 'bg-amber-900/50 text-amber-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {lead.status.replace(/_/g, ' ')}
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
                        <span className="text-gray-400">{leadDocs.length} doc{leadDocs.length > 1 ? 's' : ''}</span>
                        {validatedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 font-medium">
                            {validatedCount} valid\u00e9{validatedCount > 1 ? 's' : ''}
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
                      <div className="grid gap-2">
                        {leadDocs.map(doc => {
                          const typeCfg = DOC_TYPE_LABELS[doc.document_type];
                          const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                          const StatusIcon = statusCfg.icon;
                          const FileIcon = getFileIcon(doc.mime_type, doc.file_name);

                          return (
                            <div
                              key={doc.id}
                              className={`flex items-center justify-between p-3.5 rounded-lg border transition-all hover:border-gray-500 ${
                                doc.status === 'validated' ? 'bg-emerald-900/10 border-emerald-800/20' :
                                doc.status === 'rejected' ? 'bg-red-900/10 border-red-800/20' :
                                'bg-gray-700/20 border-gray-600/30'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${typeCfg?.color || 'text-gray-400 bg-gray-700/50'}`}>
                                  {typeCfg ? <typeCfg.icon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white text-sm font-medium">
                                      {doc.custom_label || typeCfg?.label || doc.document_type.replace(/_/g, ' ')}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.bg} ${statusCfg.color}`}>
                                      <StatusIcon className="w-2.5 h-2.5" />
                                      {statusCfg.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                    <span className="flex items-center gap-1 truncate max-w-[200px]" title={doc.file_name}>
                                      <FileIcon className="w-3 h-3 flex-shrink-0" />
                                      {doc.file_name}
                                    </span>
                                    {doc.file_size && (
                                      <span>{formatSize(doc.file_size)}</span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(doc.created_at)}
                                    </span>
                                    {doc.validated_at && (
                                      <span className="text-emerald-400">
                                        Valid\u00e9 le {formatDate(doc.validated_at)}
                                      </span>
                                    )}
                                    {doc.bucket && (
                                      <span className="text-gray-600 text-[10px] px-1.5 py-0.5 rounded bg-gray-800">
                                        {doc.bucket}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                {doc.file_path && (
                                  <button
                                    onClick={() => void nativeAdminDocumentUrl(doc.id).then((url) => window.open(url, '_blank', 'noopener,noreferrer'))}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Voir
                                  </button>
                                )}
                                <Link
                                  to={`/backoffice/crm/leads/${doc.lead_id}`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-600/30 text-gray-300 hover:bg-gray-600/50 text-xs font-medium transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Fiche
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function getDocLabel(type: string): string {
  return DOC_TYPE_LABELS[type]?.label || type.replace(/_/g, ' ');
}

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

export default AllDocumentsViewer;
