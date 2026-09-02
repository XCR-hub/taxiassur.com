import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck, CheckCircle, XCircle, Eye,
  ExternalLink, User, Clock, FileText, AlertCircle,
  Download, RefreshCw, Filter, ChevronDown, ChevronRight,
  FileWarning, ShieldCheck, ShieldX,
  Info, X, CheckSquare, Square, Search, Inbox,
  ChevronLeft,
} from 'lucide-react';
import { nativeAdminDocumentUrl, nativeAdminDocuments, nativeAdminDownloadDocument, nativeAdminUpdateDocument } from '@/lib/native-admin-data';

/* ─── Types ──────────────────────────────────────────────── */
interface PendingDocument {
  id: string;
  lead_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
  status: string;
  metadata?: { download_url?: string; email_id?: string; email_subject?: string };
  lead_email?: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_phone?: string;
  uploaded_by?: string;
}

interface RejectModalState {
  open: boolean;
  docId: string | null;
  reason: string;
  custom: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const DOC_TYPE_LABELS: Record<string, string> = {
  carte_grise: 'Carte Grise',
  permis_conduire: 'Permis de Conduire',
  carte_professionnelle: 'Carte Pro Taxi',
  kbis: 'KBIS',
  rib: 'RIB',
  justificatif_domicile: 'Justificatif Domicile',
  autorisation_stationnement: 'Autorisation Stationnement',
  licence_taxi: 'Licence Taxi',
  piece_identite: "Pièce d'Identité",
  releve_information: "Relevé d'Information",
  autre: 'Autre Document',
};

const REJECT_REASONS = [
  { value: 'illisible', label: 'Document illisible ou flou' },
  { value: 'incomplet', label: 'Document incomplet' },
  { value: 'expire', label: 'Document expiré' },
  { value: 'mauvais_type', label: 'Mauvais type de document' },
  { value: 'mauvaise_qualite', label: 'Qualité insuffisante' },
  { value: 'non_conforme', label: 'Non conforme aux exigences' },
  { value: 'autre', label: 'Autre raison' },
];

/* ─── Smart filtering logic ──────────────────────────────── */
const SUSPECT_NAME_PATTERNS = [
  /logo/i, /icon/i, /favicon/i, /signature/i, /banner/i, /avatar/i,
  /header/i, /footer/i, /pixel/i, /tracker/i, /spacer/i, /divider/i,
  /separator/i, /background/i, /\bbg\b/i, /button/i, /bullet/i,
  /checkmark/i, /arrow/i, /border/i, /badge/i, /stamp/i, /watermark/i,
  /pattern/i, /texture/i, /mail.*sign/i, /email.*sign/i,
];
const SUSPECT_EXTENSIONS = ['.gif', '.ico', '.svg', '.bmp'];
const SUSPECT_MIME = ['image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];

function isSuspectDocument(doc: PendingDocument): boolean {
  const name = (doc.file_name || '').toLowerCase();
  const mime = (doc.mime_type || '').toLowerCase();
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  if (SUSPECT_MIME.includes(mime)) return true;
  if (SUSPECT_EXTENSIONS.includes(ext)) return true;
  if (SUSPECT_NAME_PATTERNS.some(re => re.test(name))) return true;
  const isImage = mime.startsWith('image/');
  const isSmall = (doc.file_size ?? 0) > 0 && (doc.file_size ?? 0) < 30_000;
  if (isImage && isSmall) return true;
  return false;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return '< 1h';
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function isUrgentDoc(doc: PendingDocument): boolean {
  return (Date.now() - new Date(doc.uploaded_at).getTime()) / 3600000 > 24;
}

/* ─── Sub-components ─────────────────────────────────────── */

function PreviewThumb({ doc }: { doc: PendingDocument }) {
  const [err, setErr] = useState(false);
  const [url, setUrl] = useState('');
  const mime = doc.mime_type || '';
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setErr(false);
    setUrl('');
    if (!mime.startsWith('image/')) return;
    void nativeAdminDocumentUrl(doc.id)
      .then((localUrl) => {
        objectUrl = localUrl;
        if (active) setUrl(localUrl);
        else URL.revokeObjectURL(localUrl);
      })
      .catch(() => { if (active) setErr(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [doc.id, mime]);

  if (mime.startsWith('image/') && !err && url) {
    return (
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-700 flex-shrink-0 border border-slate-600/60">
        <img
          src={url}
          alt={doc.file_name}
          onError={() => setErr(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const isPdf = mime === 'application/pdf';
  return (
    <div className={`w-14 h-14 rounded-xl flex-shrink-0 border flex items-center justify-center ${isPdf ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-700/60 border-slate-600/50'}`}>
      {isPdf
        ? <FileText className="w-6 h-6 text-red-400" />
        : <FileText className="w-6 h-6 text-blue-400" />}
    </div>
  );
}


function SecureDocumentActions({ doc }: { doc: PendingDocument }) {
  const open = async (download: boolean) => {
    try {
      if (download) return void await nativeAdminDownloadDocument(doc.id, doc.file_name);
      const localUrl=await nativeAdminDocumentUrl(doc.id); window.open(localUrl,'_blank','noopener,noreferrer'); setTimeout(()=>URL.revokeObjectURL(localUrl),60000);
    } catch (error) { console.error('Document unavailable', error); }
  };
  return <>
    <button type="button" onClick={() => void open(false)} title="Aperçu" className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"><Eye className="w-4 h-4" /></button>
    <button type="button" onClick={() => void open(true)} title="Télécharger" className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
  </>;
}
function RejectModal({ state, onClose, onConfirm, batchCount = 0 }: {
  state: RejectModalState;
  onClose: () => void;
  onConfirm: (docId: string, reason: string) => void;
  batchCount?: number;
}) {
  const [reason, setReason] = useState(state.reason || REJECT_REASONS[0].value);
  const [custom, setCustom] = useState('');

  if (!state.open || !state.docId) return null;

  const isBatch = state.docId === '__BATCH__';

  const finalReason = reason === 'autre'
    ? (custom || 'Autre raison')
    : (REJECT_REASONS.find(r => r.value === reason)?.label || reason);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldX className="w-5 h-5 text-red-400" />
            {isBatch ? `Rejeter ${batchCount} document${batchCount > 1 ? 's' : ''}` : 'Rejeter le document'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          {isBatch
            ? `Le(s) prospect(s) concerne(s) sera(ont) notifie(s) par email de la raison du rejet.`
            : 'Le prospect sera notifie de la raison du rejet.'}
        </p>
        <div className="space-y-2 mb-4">
          {REJECT_REASONS.map(r => (
            <label key={r.value} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${reason === r.value ? 'bg-red-500/15 border border-red-500/40' : 'hover:bg-slate-700/50 border border-transparent'}`}>
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-red-500" />
              <span className="text-sm text-slate-300">{r.label}</span>
            </label>
          ))}
        </div>
        {reason === 'autre' && (
          <textarea
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Précisez la raison..."
            rows={3}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 resize-none mb-4"
          />
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-medium transition-colors">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(state.docId!, finalReason)}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Rejeter
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function PendingDocumentsManager() {
  const navigate = useNavigate();

  const [allDocs, setAllDocs] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [showSuspects, setShowSuspects] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const [rejectModal, setRejectModal] = useState<RejectModalState>({ open: false, docId: null, reason: '', custom: '' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLeadId, setFilterLeadId] = useState<string | null>(null);
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const result=await nativeAdminDocuments('pending');
      const formatted=result.documents as PendingDocument[];
      setAllDocs(formatted);
      const leadsWithReal = new Set(
        formatted.filter(d => !isSuspectDocument(d)).map(d => d.lead_id)
      );
      setExpandedLeads(leadsWithReal);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const { realDocs, suspectDocs } = useMemo(() => ({
    realDocs: allDocs.filter(d => !isSuspectDocument(d)),
    suspectDocs: allDocs.filter(d => isSuspectDocument(d)),
  }), [allDocs]);

  const baseDocs = showSuspects ? allDocs : realDocs;

  // Type counts for sidebar filters
  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of baseDocs) {
      map.set(doc.document_type, (map.get(doc.document_type) || 0) + 1);
    }
    return map;
  }, [baseDocs]);

  // Prospect counts for sidebar
  const prospectList = useMemo(() => {
    const map = new Map<string, { name: string; count: number; urgent: number }>();
    for (const doc of baseDocs) {
      if (!map.has(doc.lead_id)) {
        map.set(doc.lead_id, {
          name: [doc.lead_first_name, doc.lead_last_name].filter(Boolean).join(' ') || 'Prospect inconnu',
          count: 0,
          urgent: 0,
        });
      }
      const entry = map.get(doc.lead_id)!;
      entry.count++;
      if (isUrgentDoc(doc)) entry.urgent++;
    }
    return Array.from(map.entries()).sort((a, b) => b[1].urgent - a[1].urgent || b[1].count - a[1].count);
  }, [baseDocs]);

  // Apply all filters
  const filteredDocs = useMemo(() => {
    return baseDocs.filter(doc => {
      if (filterLeadId && doc.lead_id !== filterLeadId) return false;
      if (filterTypes.size > 0 && !filterTypes.has(doc.document_type)) return false;
      if (filterUrgentOnly && !isUrgentDoc(doc)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = [doc.lead_first_name, doc.lead_last_name].join(' ').toLowerCase();
        const email = (doc.lead_email || '').toLowerCase();
        const fname = (doc.file_name || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !fname.includes(q)) return false;
      }
      return true;
    });
  }, [baseDocs, filterLeadId, filterTypes, filterUrgentOnly, searchQuery]);

  const groupedByLead = useMemo(() => {
    const map = new Map<string, { leadName: string; leadEmail: string; leadPhone: string; docs: PendingDocument[] }>();
    for (const doc of filteredDocs) {
      if (!map.has(doc.lead_id)) {
        map.set(doc.lead_id, {
          leadName: [doc.lead_first_name, doc.lead_last_name].filter(Boolean).join(' ') || 'Prospect inconnu',
          leadEmail: doc.lead_email || '',
          leadPhone: doc.lead_phone || '',
          docs: [],
        });
      }
      map.get(doc.lead_id)!.docs.push(doc);
    }
    return Array.from(map.entries());
  }, [filteredDocs]);

  const urgentCount = realDocs.filter(isUrgentDoc).length;

  const handleValidate = async (docId: string) => {
    setProcessing(prev => new Set(prev).add(docId));
    try {
      await nativeAdminUpdateDocument(docId,{status:'validated'});
      setAllDocs(prev => prev.filter(d => d.id !== docId));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
    } catch (err) {
      console.error('Erreur validation:', err);
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  };

  const sendRejectionEmail = async (doc: PendingDocument, reason: string) => {
    /* L'API native de rejet met deja l'email prospect en file de maniere auditee.
    if (!doc.lead_email) return;
    const firstName = doc.lead_first_name || 'Prospect';
    const lastName = doc.lead_last_name || '';
    const docLabel = DOC_TYPE_LABELS[doc.document_type] || doc.document_type;
    try {
      Ancien envoi direct desactive : l'API native gere maintenant cette notification.
        body: {
          to: doc.lead_email,
          toName: `${firstName} ${lastName}`.trim(),
          subject: `Action requise : document a renvoyer - ${docLabel}`,
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)">
<tr><td style="background:linear-gradient(135deg,#FFA500 0%,#FF8C00 100%);padding:32px 30px;text-align:center">
<h1 style="margin:0;color:#000;font-size:24px;font-weight:700">Document non conforme</h1>
<p style="margin:8px 0 0;color:#000;font-size:15px;opacity:.9">TaxiAssur - Assurance Taxi</p>
</td></tr>
<tr><td style="padding:36px 30px">
<p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6">Bonjour <strong>${firstName} ${lastName}</strong>,</p>
<p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6">Nous avons examine votre document <strong>${docLabel}</strong> et il ne peut pas etre accepte pour la raison suivante :</p>
<div style="margin:20px 0;padding:16px 20px;background:#fff3cd;border-left:4px solid #FFA500;border-radius:6px">
<p style="margin:0;font-size:15px;color:#856404;font-weight:600">${reason}</p>
</div>
<p style="margin:16px 0;font-size:15px;color:#333;line-height:1.6">Merci de renvoyer un nouveau document conforme via votre espace prospect.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
<tr><td align="center">
<a href="${window.location.origin}/espace-prospect" style="display:inline-block;background:linear-gradient(135deg,#FFA500 0%,#FF8C00 100%);color:#000;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600">
Acceder a mon espace
</a>
</td></tr>
</table>
</td></tr>
<tr><td style="background:#f8f8f8;padding:24px 30px;text-align:center;border-top:1px solid #e5e5e5">
<p style="margin:0 0 8px;font-size:13px;color:#666"><strong>TaxiAssur</strong> - Assurance Taxi &amp; VTC</p>
<p style="margin:0;font-size:12px;color:#999">team@taxiassur.com | taxiassur.com</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
          from: 'team@taxiassur.com',
          fromName: 'TaxiAssur',
          lead_id: doc.lead_id,
          trackOpens: false,
          trackClicks: false,
        }
      });
    } catch (err) {
      console.error('Erreur envoi email rejet:', err);
    }
    */
  };

  const handleRejectConfirm = async (docId: string, reason: string) => {
    setRejectModal({ open: false, docId: null, reason: '', custom: '' });

    if (docId === '__BATCH__') {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        setProcessing(prev => new Set(prev).add(id));
      }
      try {
        await Promise.all(ids.map(id=>nativeAdminUpdateDocument(id,{status:'rejected',rejection_reason:reason})));
        setAllDocs(prev => prev.filter(d => !ids.includes(d.id)));
        setSelectedIds(new Set());
      } catch (err) {
        console.error('Erreur rejet groupé:', err);
      } finally {
        for (const id of ids) {
          setProcessing(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
      }
      return;
    }

    setProcessing(prev => new Set(prev).add(docId));
    try {
      await nativeAdminUpdateDocument(docId,{status:'rejected',rejection_reason:reason});
      setAllDocs(prev => prev.filter(d => d.id !== docId));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
    } catch (err) {
      console.error('Erreur rejet:', err);
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  };

  const handleBatchValidate = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await handleValidate(id);
    setSelectedIds(new Set());
  };

  const toggleLeadExpand = (leadId: string) =>
    setExpandedLeads(prev => { const s = new Set(prev); if (s.has(leadId)) s.delete(leadId); else s.add(leadId); return s; });

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });

  const toggleTypeFilter = (type: string) =>
    setFilterTypes(prev => { const s = new Set(prev); if (s.has(type)) s.delete(type); else s.add(type); return s; });

  const clearFilters = () => {
    setFilterLeadId(null);
    setFilterTypes(new Set());
    setFilterUrgentOnly(false);
    setSearchQuery('');
  };

  const hasActiveFilters = filterLeadId || filterTypes.size > 0 || filterUrgentOnly || searchQuery;

  return (
    <div className="flex h-full bg-gray-900 overflow-hidden">

      {/* ── LEFT FILTER SIDEBAR ── */}
      <aside className={`flex-shrink-0 bg-black border-r border-gray-800 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-14' : 'w-72'}`}>

        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Docs à Valider</p>
                <p className="text-gray-500 text-xs">{realDocs.length} en attente</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className={`p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors ${sidebarCollapsed ? 'mx-auto' : ''}`}
            title={sidebarCollapsed ? 'Ouvrir filtres' : 'Réduire'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {sidebarCollapsed ? (
          /* Collapsed icons */
          <div className="flex-1 flex flex-col items-center gap-2 py-4">
            {urgentCount > 0 && (
              <div className="relative">
                <div className="w-9 h-9 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">{urgentCount}</span>
              </div>
            )}
            <div className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center">
              <Filter className="w-4 h-4 text-slate-400" />
            </div>
            <div className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center">
              <User className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-3 space-y-1">

            {/* ── Stats ── */}
            <div className="px-3 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{realDocs.length}</p>
                  <p className="text-amber-300 text-xs mt-0.5">À valider</p>
                </div>
                <div className={`border rounded-xl p-3 text-center ${urgentCount > 0 ? 'bg-red-500/10 border-red-500/25' : 'bg-slate-800/60 border-slate-700/40'}`}>
                  <p className={`text-2xl font-bold ${urgentCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>{urgentCount}</p>
                  <p className={`text-xs mt-0.5 ${urgentCount > 0 ? 'text-red-300' : 'text-slate-500'}`}>En retard</p>
                </div>
              </div>
              {suspectDocs.length > 0 && (
                <div className="mt-2 bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-slate-400">{suspectDocs.length}</p>
                  <p className="text-slate-500 text-xs">Suspects exclus</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 mx-3" />

            {/* ── Search ── */}
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            {/* ── Quick filters ── */}
            <div className="px-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filtres rapides</p>
              <div className="space-y-1">
                <button
                  onClick={() => { clearFilters(); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${!hasActiveFilters ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                  <Inbox className="w-3.5 h-3.5 flex-shrink-0" />
                  Tous les documents
                  <span className="ml-auto text-xs">{baseDocs.length}</span>
                </button>
                <button
                  onClick={() => { setFilterUrgentOnly(v => !v); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${filterUrgentOnly ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  En retard (&gt;24h)
                  {urgentCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{urgentCount}</span>}
                </button>
                <button
                  onClick={() => setShowSuspects(v => !v)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${showSuspects ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                  <FileWarning className="w-3.5 h-3.5 flex-shrink-0" />
                  {showSuspects ? 'Masquer suspects' : 'Voir suspects'}
                  <span className="ml-auto text-xs">{suspectDocs.length}</span>
                </button>
              </div>
            </div>

            <div className="border-t border-gray-800 mx-3 my-2" />

            {/* ── Filter by type ── */}
            {typeCounts.size > 0 && (
              <div className="px-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Type de document</p>
                <div className="space-y-1">
                  {Array.from(typeCounts.entries()).map(([type, count]) => (
                    <button
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${filterTypes.has(type) ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate flex-1 text-left">{DOC_TYPE_LABELS[type] || type}</span>
                      <span className="ml-auto text-xs flex-shrink-0 bg-gray-700 rounded-full px-1.5 py-0.5">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-800 mx-3 my-2" />

            {/* ── Filter by prospect ── */}
            {prospectList.length > 0 && (
              <div className="px-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Prospects</p>
                <div className="space-y-1">
                  {prospectList.map(([leadId, { name, count, urgent }]) => (
                    <button
                      key={leadId}
                      onClick={() => setFilterLeadId(filterLeadId === leadId ? null : leadId)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${filterLeadId === leadId ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                      <div className="w-6 h-6 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3" />
                      </div>
                      <span className="truncate flex-1 text-left text-xs">{name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {urgent > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">{urgent}</span>}
                        <span className="bg-gray-700 text-gray-300 text-xs rounded-full px-1.5 py-0.5">{count}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom padding */}
            <div className="h-4" />
          </div>
        )}

        {/* Refresh button */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-gray-800">
            <button
              onClick={loadDocuments}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white">Documents à Valider</h1>
              {urgentCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/15 border border-red-500/30 rounded-full text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {urgentCount} en retard
                </span>
              )}
              {hasActiveFilters && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs text-amber-400">
                  <Filter className="w-3 h-3" />
                  Filtres actifs
                  <button onClick={clearFilters} className="ml-1 hover:text-amber-200 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs mt-0.5">
              {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} affiché{filteredDocs.length !== 1 ? 's' : ''}
              {suspectDocs.length > 0 && !showSuspects && ` · ${suspectDocs.length} suspects exclus`}
            </p>
          </div>

          {/* Batch actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">{selectedIds.size} selectionne(s)</span>
              <button
                onClick={handleBatchValidate}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Valider tout
              </button>
              <button
                onClick={() => setRejectModal({ open: true, docId: '__BATCH__', reason: REJECT_REASONS[0].value, custom: '' })}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <ShieldX className="w-4 h-4" />
                Rejeter tout
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Suspects info banner */}
        {suspectDocs.length > 0 && !showSuspects && (
          <div className="mx-6 mt-4 flex items-center gap-3 bg-gray-800/70 border border-gray-700/50 rounded-xl px-4 py-2.5">
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-gray-400 text-xs flex-1">
              <span className="text-gray-300 font-medium">{suspectDocs.length} fichier{suspectDocs.length > 1 ? 's' : ''} suspect{suspectDocs.length > 1 ? 's' : ''} masqué{suspectDocs.length > 1 ? 's' : ''}</span>
              {' '}— logos, icônes, signatures email filtrés automatiquement. Activez "Voir suspects\" dans le panneau de gauche.
            </p>
          </div>
        )}

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-4">
              <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Chargement des documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-16 text-center">
              <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                {hasActiveFilters ? 'Aucun résultat pour ces filtres' : 'File vide — tout est traité !'}
              </h3>
              <p className="text-gray-500 text-sm">
                {hasActiveFilters
                  ? <button onClick={clearFilters} className="text-amber-400 hover:underline">Effacer les filtres</button>
                  : suspectDocs.length > 0 ? `${suspectDocs.length} fichier(s) suspect(s) masqué(s).` : 'Aucun document en attente.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedByLead.map(([leadId, { leadName, leadEmail, leadPhone, docs }]) => {
                const isExpanded = expandedLeads.has(leadId);
                const hasUrgent = docs.some(isUrgentDoc);
                const selectedInGroup = docs.filter(d => selectedIds.has(d.id)).length;

                return (
                  <div key={leadId} className="bg-gray-800/60 border border-gray-700/50 rounded-2xl overflow-hidden">
                    {/* Lead header */}
                    <button
                      onClick={() => toggleLeadExpand(leadId)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-700/30 transition-colors text-left"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${hasUrgent ? 'bg-red-500/20 border border-red-500/30' : 'bg-gray-700 border border-gray-600'}`}>
                        <User className={`w-4 h-4 ${hasUrgent ? 'text-red-400' : 'text-gray-300'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold text-sm">{leadName}</span>
                          {hasUrgent && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/15 border border-red-500/30 rounded-full text-xs text-red-400">
                              <Clock className="w-3 h-3" />
                              En retard
                            </span>
                          )}
                          {selectedInGroup > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-400">
                              {selectedInGroup} sélectionné(s)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-gray-500 text-xs">{leadEmail}</span>
                          {leadPhone && <span className="text-gray-600 text-xs">{leadPhone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-400">
                          {docs.length} doc{docs.length > 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/backoffice/crm-killer/lead/${leadId}`); }}
                          className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                          title="Voir la fiche"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 text-gray-500" />
                          : <ChevronRight className="w-4 h-4 text-gray-500" />}
                      </div>
                    </button>

                    {/* Documents list */}
                    {isExpanded && (
                      <div className="border-t border-gray-700/50 divide-y divide-gray-700/30">
                        {docs.map(doc => {
                          const isSelected = selectedIds.has(doc.id);
                          const isProc = processing.has(doc.id);
                          const isSuspect = isSuspectDocument(doc);
                          const urgent = isUrgentDoc(doc);

                          return (
                            <div
                              key={doc.id}
                              className={`px-5 py-3.5 flex items-center gap-4 transition-colors ${isSelected ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : 'hover:bg-gray-700/20'}`}
                            >
                              {/* Checkbox */}
                              <button onClick={() => toggleSelect(doc.id)} className="flex-shrink-0 text-gray-600 hover:text-blue-400 transition-colors">
                                {isSelected
                                  ? <CheckSquare className="w-4 h-4 text-blue-400" />
                                  : <Square className="w-4 h-4" />}
                              </button>

                              {/* Thumbnail */}
                              <PreviewThumb doc={doc} />

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-white text-sm font-medium">
                                    {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                                  </span>
                                  {isSuspect && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30">
                                      <FileWarning className="w-3 h-3" />
                                      Suspect
                                    </span>
                                  )}
                                  {urgent && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/15 border border-red-500/30 rounded-full text-xs text-red-400">
                                      <AlertCircle className="w-3 h-3" />
                                      En retard
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-gray-500 text-xs flex-wrap">
                                  <span className="truncate max-w-[160px]" title={doc.file_name}>{doc.file_name}</span>
                                  {doc.file_size && <span>{formatSize(doc.file_size)}</span>}
                                  {doc.mime_type && <span className="hidden lg:inline uppercase">{doc.mime_type.split('/')[1]}</span>}
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {timeAgo(doc.uploaded_at)}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <SecureDocumentActions doc={doc} />
                                <button
                                  onClick={() => handleValidate(doc.id)}
                                  disabled={isProc}
                                  title="Valider"
                                  className="p-2 rounded-lg bg-green-600/80 hover:bg-green-500 text-white transition-colors disabled:opacity-40"
                                >
                                  {isProc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => setRejectModal({ open: true, docId: doc.id, reason: REJECT_REASONS[0].value, custom: '' })}
                                  disabled={isProc}
                                  title="Rejeter"
                                  className="p-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white transition-colors disabled:opacity-40"
                                >
                                  <ShieldX className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RejectModal
        state={rejectModal}
        onClose={() => setRejectModal({ open: false, docId: null, reason: '', custom: '' })}
        onConfirm={handleRejectConfirm}
        batchCount={selectedIds.size}
      />
    </div>
  );
}
