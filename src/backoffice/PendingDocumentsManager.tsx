import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck, CheckCircle, XCircle, Eye, ExternalLink,
  User, Mail, Phone, Calendar, FileText, AlertCircle,
  Download, RefreshCw, Filter, ChevronDown, ChevronRight,
  Image as ImageIcon, FileWarning, Clock, Layers,
  ShieldCheck, ShieldX, Info, X, CheckSquare, Square,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

function getFileIcon(mime: string | null) {
  if (!mime) return FileText;
  if (mime === 'application/pdf') return FileText;
  if (mime.startsWith('image/')) return ImageIcon;
  return FileText;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getPublicUrl(doc: PendingDocument): string {
  if (doc.metadata?.download_url) return doc.metadata.download_url;
  const bucket = doc.file_path.startsWith('00000000-0000-0000-0000-000000000001/')
    ? 'email-attachments'
    : 'prospect-documents';
  const { data } = supabase.storage.from(bucket).getPublicUrl(doc.file_path);
  return data.publicUrl;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'il y a < 1h';
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

/* ─── Sub-components ─────────────────────────────────────── */

function PreviewThumb({ doc }: { doc: PendingDocument }) {
  const [err, setErr] = useState(false);
  const mime = doc.mime_type || '';
  const url = getPublicUrl(doc);

  if (mime.startsWith('image/') && !err) {
    return (
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 border border-slate-600">
        <img
          src={url}
          alt={doc.file_name}
          onError={() => setErr(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const Icon = mime === 'application/pdf' ? FileText : FileText;
  const color = mime === 'application/pdf' ? 'text-red-400' : 'text-blue-400';

  return (
    <div className={`w-16 h-16 rounded-lg bg-slate-700/60 border border-slate-600 flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-7 h-7 ${color}`} />
    </div>
  );
}

function SuspectBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30">
      <FileWarning className="w-3 h-3" />
      Suspect (logo/signature?)
    </span>
  );
}

interface RejectModalProps {
  state: RejectModalState;
  onClose: () => void;
  onConfirm: (docId: string, reason: string) => void;
}

function RejectModal({ state, onClose, onConfirm }: RejectModalProps) {
  const [reason, setReason] = useState(state.reason || REJECT_REASONS[0].value);
  const [custom, setCustom] = useState('');

  if (!state.open || !state.docId) return null;

  const finalReason = reason === 'autre' ? (custom || 'Autre raison') : (REJECT_REASONS.find(r => r.value === reason)?.label || reason);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldX className="w-5 h-5 text-red-400" />
            Rejeter le document
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">Choisissez la raison du rejet — le prospect sera notifié.</p>

        <div className="space-y-2 mb-4">
          {REJECT_REASONS.map(r => (
            <label key={r.value} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${reason === r.value ? 'bg-red-500/15 border border-red-500/40' : 'hover:bg-slate-700/50 border border-transparent'}`}>
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-red-500"
              />
              <span className="text-sm text-slate-300">{r.label}</span>
            </label>
          ))}
        </div>

        {reason === 'autre' && (
          <textarea
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Décrivez la raison..."
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

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospect_documents')
        .select(`
          id, lead_id, document_type, file_name, file_path,
          file_size, mime_type, uploaded_at, status, metadata, uploaded_by,
          crm_leads ( email, first_name, last_name, phone )
        `)
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const formatted: PendingDocument[] = (data || []).map((d: any) => ({
        id: d.id,
        lead_id: d.lead_id,
        document_type: d.document_type,
        file_name: d.file_name,
        file_path: d.file_path,
        file_size: d.file_size,
        mime_type: d.mime_type,
        uploaded_at: d.uploaded_at,
        status: d.status,
        metadata: d.metadata,
        uploaded_by: d.uploaded_by,
        lead_email: d.crm_leads?.email,
        lead_first_name: d.crm_leads?.first_name,
        lead_last_name: d.crm_leads?.last_name,
        lead_phone: d.crm_leads?.phone,
      }));

      setAllDocs(formatted);

      // Auto-expand leads that have real documents
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

  const visibleDocs = showSuspects ? allDocs : realDocs;

  const groupedByLead = useMemo(() => {
    const map = new Map<string, { leadName: string; leadEmail: string; leadPhone: string; docs: PendingDocument[] }>();
    for (const doc of visibleDocs) {
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
  }, [visibleDocs]);

  const handleValidate = async (docId: string) => {
    setProcessing(prev => new Set(prev).add(docId));
    try {
      const { error } = await supabase
        .from('prospect_documents')
        .update({ status: 'validated', validated_at: new Date().toISOString() })
        .eq('id', docId);
      if (error) throw error;
      setAllDocs(prev => prev.filter(d => d.id !== docId));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
    } catch (err) {
      console.error('Erreur validation:', err);
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  };

  const handleRejectConfirm = async (docId: string, reason: string) => {
    setRejectModal({ open: false, docId: null, reason: '', custom: '' });
    setProcessing(prev => new Set(prev).add(docId));
    try {
      const { error } = await supabase
        .from('prospect_documents')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', docId);
      if (error) throw error;
      setAllDocs(prev => prev.filter(d => d.id !== docId));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(docId); return s; });
    } catch (err) {
      console.error('Erreur rejet:', err);
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  };

  const handleBatchValidate = async () => {
    for (const id of selectedIds) await handleValidate(id);
    setSelectedIds(new Set());
  };

  const toggleLeadExpand = (leadId: string) => {
    setExpandedLeads(prev => {
      const s = new Set(prev);
      s.has(leadId) ? s.delete(leadId) : s.add(leadId);
      return s;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const urgentCount = realDocs.filter(d => {
    const ageH = (Date.now() - new Date(d.uploaded_at).getTime()) / 3600000;
    return ageH > 24;
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-amber-400" />
              </div>
              Documents à Valider
            </h1>
            <p className="text-slate-400 text-sm">Seuls les vrais documents sont affichés — logos et images de signature exclus automatiquement.</p>
          </div>
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-amber-300 text-xs font-medium uppercase tracking-wide mb-1">À valider</p>
            <p className="text-3xl font-bold text-white">{realDocs.length}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-300 text-xs font-medium uppercase tracking-wide mb-1">Prospects</p>
            <p className="text-3xl font-bold text-white">{new Set(realDocs.map(d => d.lead_id)).size}</p>
          </div>
          {urgentCount > 0 ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-300 text-xs font-medium uppercase tracking-wide mb-1">+ 24h en attente</p>
              <p className="text-3xl font-bold text-red-400">{urgentCount}</p>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <p className="text-green-300 text-xs font-medium uppercase tracking-wide mb-1">En retard</p>
              <p className="text-3xl font-bold text-green-400">0</p>
            </div>
          )}
          <div className="bg-slate-700/50 border border-slate-600/40 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Exclus (suspects)</p>
            <p className="text-3xl font-bold text-slate-400">{suspectDocs.length}</p>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 mb-5">
          {/* Show suspects toggle */}
          <button
            onClick={() => setShowSuspects(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
              showSuspects
                ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                : 'bg-slate-700/50 border-slate-600/40 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {showSuspects ? 'Masquer suspects' : `Afficher suspects (${suspectDocs.length})`}
          </button>

          {/* Batch actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-slate-400 text-sm">{selectedIds.size} sélectionné(s)</span>
              <button
                onClick={handleBatchValidate}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Tout valider
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Smart filter info banner ── */}
        {suspectDocs.length > 0 && !showSuspects && (
          <div className="flex items-start gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 mb-5">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-slate-400 text-sm">
              <span className="text-slate-300 font-medium">{suspectDocs.length} fichier{suspectDocs.length > 1 ? 's' : ''} exclus automatiquement</span>
              {' '}— logos, icônes, images de signature et fichiers &lt; 30 Ko détectés et filtrés.
              Cliquez "Afficher suspects\" pour les examiner.
            </p>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Chargement des documents...</p>
          </div>
        ) : visibleDocs.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-14 text-center">
            <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {showSuspects ? 'Aucun document en attente' : 'Tous les vrais documents sont traités'}
            </h3>
            <p className="text-slate-500 text-sm">
              {!showSuspects && suspectDocs.length > 0
                ? `${suspectDocs.length} fichier(s) suspect(s) masqué(s).`
                : 'File vide — aucun document à valider.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByLead.map(([leadId, { leadName, leadEmail, leadPhone, docs }]) => {
              const isExpanded = expandedLeads.has(leadId);
              const urgentInGroup = docs.some(d => (Date.now() - new Date(d.uploaded_at).getTime()) / 3600000 > 24);
              const selectedInGroup = docs.filter(d => selectedIds.has(d.id)).length;

              return (
                <div key={leadId} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                  {/* Lead header */}
                  <button
                    onClick={() => toggleLeadExpand(leadId)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-700/30 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-4.5 h-4.5 text-slate-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm">{leadName}</span>
                        {urgentInGroup && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/15 border border-red-500/30 rounded-full text-xs text-red-400">
                            <Clock className="w-3 h-3" />
                            + 24h
                          </span>
                        )}
                        {selectedInGroup > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-400">
                            {selectedInGroup} sélectionné(s)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-slate-400 text-xs">{leadEmail}</span>
                        {leadPhone && <span className="text-slate-500 text-xs">{leadPhone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-400">
                        {docs.length} doc{docs.length > 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/backoffice/crm-killer/lead/${leadId}`); }}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                        title="Voir la fiche"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-slate-400" />
                        : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {/* Documents list */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 divide-y divide-slate-700/30">
                      {docs.map(doc => {
                        const isSelected = selectedIds.has(doc.id);
                        const isProc = processing.has(doc.id);
                        const isSuspect = isSuspectDocument(doc);
                        const url = getPublicUrl(doc);
                        const ageH = (Date.now() - new Date(doc.uploaded_at).getTime()) / 3600000;
                        const isUrgent = ageH > 24;

                        return (
                          <div
                            key={doc.id}
                            className={`px-5 py-4 flex items-center gap-4 transition-colors ${isSelected ? 'bg-blue-500/5' : 'hover:bg-slate-700/20'}`}
                          >
                            {/* Select checkbox */}
                            <button
                              onClick={() => toggleSelect(doc.id)}
                              className="flex-shrink-0 text-slate-500 hover:text-blue-400 transition-colors"
                            >
                              {isSelected
                                ? <CheckSquare className="w-4.5 h-4.5 text-blue-400" />
                                : <Square className="w-4.5 h-4.5" />}
                            </button>

                            {/* Thumbnail */}
                            <PreviewThumb doc={doc} />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-white text-sm font-medium truncate">
                                  {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                                </span>
                                {isSuspect && <SuspectBadge />}
                                {isUrgent && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/15 border border-red-500/30 rounded-full text-xs text-red-400">
                                    <AlertCircle className="w-3 h-3" />
                                    En retard
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-slate-500 text-xs flex-wrap">
                                <span className="truncate max-w-[180px]" title={doc.file_name}>{doc.file_name}</span>
                                {doc.file_size && <span>{formatSize(doc.file_size)}</span>}
                                {doc.mime_type && <span className="hidden md:inline">{doc.mime_type.split('/')[1]?.toUpperCase()}</span>}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {timeAgo(doc.uploaded_at)}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Voir le document"
                                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                              <a
                                href={url}
                                download={doc.file_name}
                                title="Télécharger"
                                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleValidate(doc.id)}
                                disabled={isProc}
                                title="Valider"
                                className="p-2 rounded-lg bg-green-600/80 hover:bg-green-500 text-white transition-colors disabled:opacity-40"
                              >
                                {isProc
                                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                                  : <ShieldCheck className="w-4 h-4" />}
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

      {/* Reject Modal */}
      <RejectModal
        state={rejectModal}
        onClose={() => setRejectModal({ open: false, docId: null, reason: '', custom: '' })}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}
