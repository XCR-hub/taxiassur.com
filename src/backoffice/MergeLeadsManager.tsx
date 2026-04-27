import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  GitMerge, Search, AlertTriangle, Loader2, ArrowRight, CheckCircle,
  User, Mail, Phone, MapPin, Calendar, X, FileText, MessageSquare
} from 'lucide-react';

interface Lead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string | null;
  created_at: string;
  immatriculation?: string | null;
  company_name?: string | null;
}

interface MergeResult {
  success: boolean;
  error?: string;
  target_id?: string;
  source_id?: string;
  documents_moved?: number;
  interactions_moved?: number;
  quotes_moved?: number;
  emails_moved?: number;
}

const formatName = (l: Lead) =>
  [l.first_name, l.last_name].filter(Boolean).join(' ').trim() || '(Sans nom)';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

function LeadCard({
  lead,
  role,
  onClear,
}: {
  lead: Lead;
  role: 'source' | 'target';
  onClear: () => void;
}) {
  const isTarget = role === 'target';
  const accent = isTarget
    ? 'border-emerald-300 bg-emerald-50/40'
    : 'border-amber-300 bg-amber-50/40';
  const badge = isTarget
    ? { text: 'Lead conservé', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
    : { text: 'Lead archivé', cls: 'bg-amber-100 text-amber-800 border-amber-200' };

  return (
    <div className={`relative rounded-xl border-2 ${accent} p-4`}>
      <button
        onClick={onClear}
        className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-white"
        aria-label="Retirer"
      >
        <X className="w-4 h-4" />
      </button>
      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${badge.cls}`}>
        {badge.text}
      </span>
      <h4 className="mt-2 text-base font-bold text-gray-900 flex items-center gap-2">
        <User className="w-4 h-4 text-gray-500" />
        {formatName(lead)}
      </h4>
      <div className="mt-2 space-y-1 text-sm text-gray-700">
        {lead.email && (
          <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" />{lead.email}</div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{lead.phone}</div>
        )}
        {lead.city && (
          <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" />{lead.city}</div>
        )}
        <div className="flex items-center gap-2 text-gray-500">
          <Calendar className="w-3.5 h-3.5" />Créé le {formatDate(lead.created_at)}
        </div>
        {lead.status && (
          <div className="text-xs font-semibold text-gray-600 mt-1">Statut : {lead.status}</div>
        )}
      </div>
    </div>
  );
}

function LeadPicker({
  label,
  excludeId,
  onSelect,
}: {
  label: string;
  excludeId?: string | null;
  onSelect: (lead: Lead) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const term = query.trim();
      const orFilter = [
        `email.ilike.%${term}%`,
        `first_name.ilike.%${term}%`,
        `last_name.ilike.%${term}%`,
        `phone.ilike.%${term}%`,
        `city.ilike.%${term}%`,
        `immatriculation.ilike.%${term}%`,
      ].join(',');

      const { data, error } = await supabase
        .from('crm_leads')
        .select('id, first_name, last_name, email, phone, city, status, created_at, immatriculation, company_name')
        .or(orFilter)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(15);

      if (!error && data) {
        setResults(excludeId ? data.filter(l => l.id !== excludeId) : data);
      }
      setLoading(false);
      setOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, excludeId]);

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher par email, nom, téléphone, ville..."
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto">
          {results.map(lead => (
            <button
              key={lead.id}
              onClick={() => {
                onSelect(lead);
                setQuery('');
                setResults([]);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0"
            >
              <div className="text-sm font-semibold text-gray-900">{formatName(lead)}</div>
              <div className="text-xs text-gray-600 mt-0.5 flex flex-wrap gap-x-3">
                {lead.email && <span>{lead.email}</span>}
                {lead.phone && <span>{lead.phone}</span>}
                {lead.city && <span>{lead.city}</span>}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {formatDate(lead.created_at)} • {lead.status || 'sans statut'}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-sm text-gray-500 text-center">
          Aucun lead trouvé
        </div>
      )}
    </div>
  );
}

export default function MergeLeadsManager() {
  const [source, setSource] = useState<Lead | null>(null);
  const [target, setTarget] = useState<Lead | null>(null);
  const [merging, setMerging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<MergeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canMerge = useMemo(
    () => source && target && source.id !== target.id && !merging,
    [source, target, merging]
  );

  const runMerge = async () => {
    if (!source || !target) return;
    setMerging(true);
    setError(null);
    setResult(null);
    setConfirmOpen(false);

    const { data, error: rpcError } = await supabase.rpc('merge_two_leads_manual', {
      p_source_id: source.id,
      p_target_id: target.id,
    });

    setMerging(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const res = data as MergeResult;
    if (!res?.success) {
      setError(res?.error || 'Échec de la fusion');
      return;
    }
    setResult(res);
    setSource(null);
    setTarget(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <GitMerge className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fusionner deux leads</h1>
              <p className="text-sm text-gray-600">
                Sélectionnez le lead à archiver (source) et le lead à conserver (cible).
                Toutes les données seront transférées vers la cible.
              </p>
            </div>
          </div>
        </div>

        {result && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">
              <div className="font-semibold">Fusion réussie</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span><FileText className="w-3 h-3 inline mr-1" />{result.documents_moved ?? 0} documents</span>
                <span><MessageSquare className="w-3 h-3 inline mr-1" />{result.interactions_moved ?? 0} interactions</span>
                <span>{result.quotes_moved ?? 0} devis</span>
                <span>{result.emails_moved ?? 0} emails</span>
              </div>
            </div>
            <button onClick={() => setResult(null)} className="ml-auto text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900 flex-1">
              <div className="font-semibold">Erreur</div>
              <div className="mt-0.5">{error}</div>
            </div>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-start">
            <div>
              {source ? (
                <LeadCard lead={source} role="source" onClear={() => setSource(null)} />
              ) : (
                <LeadPicker
                  label="Lead source (sera archivé)"
                  excludeId={target?.id}
                  onSelect={setSource}
                />
              )}
            </div>

            <div className="hidden md:flex items-center justify-center pt-7">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            <div>
              {target ? (
                <LeadCard lead={target} role="target" onClear={() => setTarget(null)} />
              ) : (
                <LeadPicker
                  label="Lead cible (sera conservé)"
                  excludeId={source?.id}
                  onSelect={setTarget}
                />
              )}
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              La fusion est <strong>irréversible</strong>. Le lead source sera archivé.
              Tous ses documents, interactions, devis, contrats, paiements et emails
              seront transférés vers le lead cible. Les champs vides du lead cible
              seront complétés par les valeurs du lead source.
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              disabled={!canMerge}
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
              Fusionner les leads
            </button>
          </div>
        </div>
      </div>

      {confirmOpen && source && target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Confirmer la fusion</h3>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>{formatName(source)}</strong> sera archivé et fusionné dans{' '}
                  <strong>{formatName(target)}</strong>. Cette action est irréversible.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Annuler
              </button>
              <button
                onClick={runMerge}
                className="px-5 py-2 text-sm font-bold text-white rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                Fusionner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
