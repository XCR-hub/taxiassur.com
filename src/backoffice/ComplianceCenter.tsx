import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Download, Trash2, Eye, Calendar, Mail, AlertTriangle,
  CheckCircle, FileText, Activity, TrendingUp, RefreshCw, Users,
  Clock, Building2, X, Search, ChevronDown, ChevronRight,
  Database, Lock, UserCheck, BarChart3, AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import NavigationMenu from './NavigationMenu';

interface GDPRConsent {
  id: string;
  email: string;
  lawful_basis: 'consent' | 'legitimate_interest';
  purpose: string;
  collected_at: string;
  collected_by: string;
  opted_out_at: string | null;
  opt_out_url: string;
  ip_address: string | null;
  metadata: Record<string, unknown>;
}

interface DSRRequest {
  id: string;
  email: string;
  request_type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

interface ComplianceReport {
  generated_at: string;
  total_consents: number;
  active_consents: number;
  opt_outs: number;
  pending_requests: number;
  completed_requests: number;
  expired_records: number;
  recent_activity: Array<{ event: string; action: string; timestamp: string }>;
  lawful_basis_breakdown: Record<string, number>;
}

const DSR_TYPES = [
  { value: 'access', label: "Acces aux donnees (export JSON)" },
  { value: 'rectification', label: "Rectification" },
  { value: 'erasure', label: "Effacement (suppression definitive)" },
  { value: 'portability', label: "Portabilite" },
  { value: 'restriction', label: "Limitation du traitement" },
];

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending:   'bg-amber-100 text-amber-700 border-amber-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  rejected:  'bg-red-100 text-red-700 border-red-200',
};

const EVENT_COLORS: Record<string, string> = {
  consent_registered: 'bg-emerald-500',
  opt_out:            'bg-red-500',
  dsr_request:        'bg-blue-500',
};

const ComplianceCenter: React.FC = () => {
  const [consents, setConsents] = useState<GDPRConsent[]>([]);
  const [dsrRequests, setDsrRequests] = useState<DSRRequest[]>([]);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'consents' | 'dsr' | 'audit'>('overview');

  const [showDSRModal, setShowDSRModal] = useState(false);
  const [dsrEmail, setDsrEmail] = useState('');
  const [dsrType, setDsrType] = useState<DSRRequest['request_type']>('access');
  const [dsrNotes, setDsrNotes] = useState('');
  const [processingDSR, setProcessingDSR] = useState(false);

  const [selectedConsent, setSelectedConsent] = useState<GDPRConsent | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { loadComplianceData(false); }, []);

  useEffect(() => {
    if (!liveMode) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadComplianceData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [liveMode]);

  const loadComplianceData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [consentsRes, dsrRes, reportRes] = await Promise.all([
        supabase.from('gdpr_consents').select('*').order('collected_at', { ascending: false }),
        supabase.from('gdpr_data_requests').select('*').order('requested_at', { ascending: false }).limit(50),
        supabase.rpc('generate_compliance_report'),
      ]);
      if (consentsRes.data) setConsents(consentsRes.data);
      if (dsrRes.data) setDsrRequests(dsrRes.data);
      if (reportRes.data) setReport(reportRes.data);
    } catch (error) {
      logger.error('Failed to load compliance data:', error);
      showToast('error', 'Erreur lors du chargement des donnees');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDSRRequest = async () => {
    if (!dsrEmail) return;
    setProcessingDSR(true);
    try {
      if (dsrType === 'access') {
        const { data, error } = await supabase.rpc('export_personal_data', { p_email: dsrEmail });
        if (error) throw error;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taxiassur-data-${dsrEmail}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        await supabase.rpc('create_dsr_request', { p_email: dsrEmail, p_request_type: 'access', p_notes: dsrNotes || 'Data export completed' });
        showToast('success', 'Donnees exportees avec succes');
      } else if (dsrType === 'erasure') {
        if (!confirm(`Confirmer la suppression definitive de toutes les donnees pour ${dsrEmail} ?`)) return;
        const { error } = await supabase.rpc('delete_personal_data', { p_email: dsrEmail });
        if (error) throw error;
        await supabase.rpc('create_dsr_request', { p_email: dsrEmail, p_request_type: 'erasure', p_notes: dsrNotes || 'Data deleted' });
        showToast('success', 'Donnees supprimees avec succes');
        loadComplianceData();
      } else {
        await supabase.rpc('create_dsr_request', { p_email: dsrEmail, p_request_type: dsrType, p_notes: dsrNotes });
        showToast('success', 'Demande enregistree avec succes');
        loadComplianceData();
      }
      setShowDSRModal(false);
      setDsrEmail('');
      setDsrNotes('');
    } catch (error) {
      logger.error('DSR error:', error);
      showToast('error', 'Erreur lors du traitement de la demande');
    } finally {
      setProcessingDSR(false);
    }
  };

  const handleOptOut = async (email: string) => {
    if (!confirm(`Confirmer l'opt-out pour ${email} ?`)) return;
    try {
      await supabase.rpc('process_opt_out', { p_email: email });
      showToast('success', 'Opt-out enregistre');
      loadComplianceData();
    } catch {
      showToast('error', 'Erreur');
    }
  };

  const exportConsentLedger = () => {
    const csvContent = [
      ['ID', 'Email', 'Base Legale', 'Objectif', 'Collecte Le', 'Collecte Par', 'Statut', 'Opt-out Le'].join(','),
      ...consents.map(c => [
        c.id, c.email, c.lawful_basis, c.purpose,
        new Date(c.collected_at).toLocaleDateString('fr-FR'),
        c.collected_by,
        c.opted_out_at ? 'Opt-out' : 'Actif',
        c.opted_out_at ? new Date(c.opted_out_at).toLocaleDateString('fr-FR') : '',
      ].join(','))
    ].join('\n');
    downloadCSV(csvContent, `gdpr-consents-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportDSRReport = () => {
    const csvContent = [
      ['ID', 'Email', 'Type', 'Statut', 'Demande Le', 'Traite Le', 'Notes'].join(','),
      ...dsrRequests.map(r => [
        r.id, r.email, r.request_type, r.status,
        new Date(r.requested_at).toLocaleDateString('fr-FR'),
        r.processed_at ? new Date(r.processed_at).toLocaleDateString('fr-FR') : '',
        r.notes || '',
      ].join(','))
    ].join('\n');
    downloadCSV(csvContent, `dsr-requests-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredConsents = consents.filter(c =>
    !searchTerm || c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const complianceRate = report && report.total_consents > 0
    ? ((report.active_consents / report.total_consents) * 100).toFixed(1)
    : '0';

  const TABS = [
    { id: 'overview', label: 'Vue generale', icon: BarChart3 },
    { id: 'consents', label: 'Consentements', icon: Shield, count: consents.length },
    { id: 'dsr', label: 'Demandes DSR', icon: UserCheck, count: dsrRequests.filter(r => r.status === 'pending').length },
    { id: 'audit', label: 'Audit Trail', icon: Clock },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-700/60 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-4 py-4 border-b border-slate-700/50">
          <Link to="/backoffice/crm" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/30">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">TaxiAssur</div>
              <div className="text-slate-500 text-xs">Backoffice</div>
            </div>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-2">
          <NavigationMenu />
        </div>
      </aside>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">Centre de Conformite RGPD</h1>
                <p className="text-sm text-gray-500 mt-0.5">Gestion des consentements, droits des personnes et audit</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLiveMode(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  liveMode
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Activity className={`w-4 h-4 ${liveMode ? 'animate-pulse text-emerald-600' : ''}`} />
                {liveMode ? 'Live' : 'Manuel'}
              </button>
              <button
                onClick={loadComplianceData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-600 text-sm font-semibold transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              <button
                onClick={() => setShowDSRModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                <Mail className="w-4 h-4" />
                Nouvelle demande DSR
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0 px-8 -mb-px">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'text-emerald-600 border-emerald-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {'count' in tab && tab.count! > 0 && (
                  <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                    activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {loading && !report ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-gray-500 text-sm">Chargement des donnees RGPD...</p>
              </div>
            </div>
          ) : (
            <div className="p-8 max-w-6xl space-y-6">

              {/* ── Tab: Vue generale ── */}
              {activeTab === 'overview' && (
                <>
                  {/* Stat cards */}
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Consentements totaux', value: report?.total_consents ?? 0, sub: `${complianceRate}% actifs`, icon: Database, color: 'sky' },
                      { label: 'Consentements actifs', value: report?.active_consents ?? 0, sub: 'Base de contacts legale', icon: CheckCircle, color: 'emerald' },
                      { label: 'Opt-outs', value: report?.opt_outs ?? 0, sub: `${report && report.total_consents > 0 ? ((report.opt_outs / report.total_consents) * 100).toFixed(1) : 0}% du total`, icon: Mail, color: 'red' },
                      { label: 'Demandes DSR', value: dsrRequests.length, sub: `${dsrRequests.filter(r => r.status === 'pending').length} en attente`, icon: FileText, color: 'amber' },
                    ].map(card => {
                      const colorMap: Record<string, { bg: string; icon: string; text: string; sub: string }> = {
                        sky:     { bg: 'bg-sky-50 border-sky-200',     icon: 'bg-sky-100 text-sky-600',     text: 'text-sky-700',     sub: 'text-sky-600' },
                        emerald: { bg: 'bg-emerald-50 border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700', sub: 'text-emerald-600' },
                        red:     { bg: 'bg-red-50 border-red-200',     icon: 'bg-red-100 text-red-600',     text: 'text-red-700',     sub: 'text-red-600' },
                        amber:   { bg: 'bg-amber-50 border-amber-200', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-700',   sub: 'text-amber-600' },
                      };
                      const c = colorMap[card.color];
                      return (
                        <div key={card.label} className={`rounded-2xl border p-5 bg-white shadow-sm ${c.bg}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.icon}`}>
                              <card.icon className="w-4 h-4" />
                            </div>
                          </div>
                          <div className={`text-3xl font-black ${c.text}`}>{card.value.toLocaleString('fr-FR')}</div>
                          <div className="text-sm text-gray-600 font-medium mt-0.5">{card.label}</div>
                          <div className={`text-xs mt-1 font-medium ${c.sub}`}>{card.sub}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compliance score + actions */}
                  <div className="grid grid-cols-3 gap-5">
                    <div className="col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Indicateurs de conformite</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-semibold text-gray-700">Taux de consentements actifs</span>
                            <span className="font-bold text-emerald-600">{complianceRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${complianceRate}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-semibold text-gray-700">Demandes DSR traitees</span>
                            <span className="font-bold text-blue-600">
                              {dsrRequests.length > 0 ? ((dsrRequests.filter(r => r.status === 'completed').length / dsrRequests.length) * 100).toFixed(0) : 100}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-500 h-2.5 rounded-full transition-all"
                              style={{ width: `${dsrRequests.length > 0 ? (dsrRequests.filter(r => r.status === 'completed').length / dsrRequests.length) * 100 : 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold text-blue-600">2.3j</div>
                            <div className="text-xs text-gray-500 font-medium mt-0.5">Delai moyen DSR</div>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold text-amber-600">{report?.expired_records ?? 0}</div>
                            <div className="text-xs text-gray-500 font-medium mt-0.5">Donnees expirees</div>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold text-emerald-600">{dsrRequests.filter(r => r.status === 'pending').length}</div>
                            <div className="text-xs text-gray-500 font-medium mt-0.5">DSR en attente</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-3">
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Actions rapides</h3>
                      <button
                        onClick={() => { setShowDSRModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Nouvelle demande DSR
                      </button>
                      <button
                        onClick={exportConsentLedger}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Exporter consentements CSV
                      </button>
                      <button
                        onClick={exportDSRReport}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Exporter demandes DSR
                      </button>
                    </div>
                  </div>

                  {/* Bases legales + droits */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm">Bases legales utilisees</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        {[
                          { icon: Lock, label: "Interet legitime", desc: "Contact B2B professionnel taxi insurance", color: "text-blue-600" },
                          { icon: CheckCircle, label: "Consentement", desc: "Newsletter et communications marketing", color: "text-emerald-600" },
                          { icon: Mail, label: "Opt-out", desc: "Lien de desinscription dans chaque email", color: "text-gray-500" },
                        ].map(item => (
                          <div key={item.label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                            <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${item.color}`} />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm">Droits des personnes (DSR)</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        {[
                          { icon: Eye, label: "Droit d'acces", desc: "Export complet des donnees personnelles (JSON)", color: "text-blue-600" },
                          { icon: Trash2, label: "Droit a l'effacement", desc: "Suppression complete et definitive", color: "text-red-600" },
                          { icon: Download, label: "Portabilite", desc: "Export en format standard JSON", color: "text-emerald-600" },
                        ].map(item => (
                          <div key={item.label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                            <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${item.color}`} />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent activity */}
                  {report?.recent_activity && report.recent_activity.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-gray-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm">Activite recente (audit trail)</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {report.recent_activity.slice(0, 10).map((activity, index) => (
                          <div key={index} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${EVENT_COLORS[activity.event] ?? 'bg-gray-400'}`} />
                            <span className="text-sm font-semibold text-gray-800">{activity.event}</span>
                            <span className="text-sm text-gray-500 flex-1">{activity.action}</span>
                            <span className="text-xs text-gray-400">{new Date(activity.timestamp).toLocaleString('fr-FR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Tab: Consentements ── */}
              {activeTab === 'consents' && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Registre des consentements</h3>
                        <p className="text-xs text-gray-500">{filteredConsents.length} entree{filteredConsents.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Rechercher par email..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 w-56"
                        />
                      </div>
                      <button
                        onClick={exportConsentLedger}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-semibold text-gray-600 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          {['Email', 'Base legale', 'Objectif', 'Date', 'Statut', 'Actions'].map(h => (
                            <th key={h} className="text-left py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredConsents.length === 0 ? (
                          <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">Aucun consentement trouve</td></tr>
                        ) : filteredConsents.slice(0, 50).map(consent => (
                          <tr key={consent.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-5 font-medium text-gray-900">{consent.email}</td>
                            <td className="py-3 px-5">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                consent.lawful_basis === 'consent'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {consent.lawful_basis === 'consent' ? 'Consentement' : 'Interet legitime'}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-gray-600 text-xs max-w-xs truncate">{consent.purpose}</td>
                            <td className="py-3 px-5 text-gray-500 text-xs">{new Date(consent.collected_at).toLocaleDateString('fr-FR')}</td>
                            <td className="py-3 px-5">
                              {consent.opted_out_at ? (
                                <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">Opt-out</span>
                              ) : (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">Actif</span>
                              )}
                            </td>
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-1">
                                <button onClick={() => setSelectedConsent(consent)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                                {!consent.opted_out_at && (
                                  <button onClick={() => handleOptOut(consent.email)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Tab: Demandes DSR ── */}
              {activeTab === 'dsr' && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Demandes DSR (Data Subject Rights)</h3>
                        <p className="text-xs text-gray-500">{dsrRequests.length} demande{dsrRequests.length > 1 ? 's' : ''} — {dsrRequests.filter(r => r.status === 'pending').length} en attente</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {['pending', 'processing', 'completed'].map(s => (
                        <span key={s} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[s]}`}>
                          {dsrRequests.filter(r => r.status === s).length} {s}
                        </span>
                      ))}
                      <button onClick={exportDSRReport} className="flex items-center gap-2 px-3 py-2 ml-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-semibold text-gray-600 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Export
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          {['Email', 'Type', 'Statut', 'Demande le', 'Traite le', 'Delai'].map(h => (
                            <th key={h} className="text-left py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dsrRequests.length === 0 ? (
                          <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">Aucune demande DSR pour le moment</td></tr>
                        ) : dsrRequests.slice(0, 25).map(req => {
                          const days = req.processed_at
                            ? Math.floor((new Date(req.processed_at).getTime() - new Date(req.requested_at).getTime()) / 86400000)
                            : Math.floor((Date.now() - new Date(req.requested_at).getTime()) / 86400000);
                          return (
                            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-5 font-medium text-gray-900">{req.email}</td>
                              <td className="py-3 px-5">
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold capitalize">{req.request_type}</span>
                              </td>
                              <td className="py-3 px-5">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{req.status}</span>
                              </td>
                              <td className="py-3 px-5 text-gray-500 text-xs">{new Date(req.requested_at).toLocaleDateString('fr-FR')}</td>
                              <td className="py-3 px-5 text-gray-500 text-xs">{req.processed_at ? new Date(req.processed_at).toLocaleDateString('fr-FR') : '—'}</td>
                              <td className="py-3 px-5">
                                <span className={`font-bold text-sm ${days <= 3 ? 'text-emerald-600' : days <= 7 ? 'text-amber-600' : 'text-red-600'}`}>{days}j</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Tab: Audit trail ── */}
              {activeTab === 'audit' && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">Historique des evenements RGPD</h3>
                  </div>
                  {report?.recent_activity && report.recent_activity.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {report.recent_activity.map((activity, index) => (
                        <div key={index} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${EVENT_COLORS[activity.event] ?? 'bg-gray-400'}`} />
                          <span className="text-sm font-semibold text-gray-800 min-w-40">{activity.event.replace(/_/g, ' ')}</span>
                          <span className="text-sm text-gray-500 flex-1">{activity.action}</span>
                          <span className="text-xs text-gray-400 font-medium">{new Date(activity.timestamp).toLocaleString('fr-FR')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-gray-400 text-sm">Aucune activite recente</div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* ── DSR Modal ── */}
      {showDSRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Traiter une demande DSR</h2>
                  <p className="text-xs text-gray-500">Data Subject Rights — RGPD Art. 12-22</p>
                </div>
              </div>
              <button onClick={() => setShowDSRModal(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email de la personne *</label>
                <input
                  type="email"
                  value={dsrEmail}
                  onChange={e => setDsrEmail(e.target.value)}
                  placeholder="contact@exemple.com"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Type de demande *</label>
                <select
                  value={dsrType}
                  onChange={e => setDsrType(e.target.value as DSRRequest['request_type'])}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  {DSR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Notes (optionnel)</label>
                <textarea
                  value={dsrNotes}
                  onChange={e => setDsrNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes additionnelles..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
              {dsrType === 'erasure' && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 font-medium">Cette action supprimera DEFINITIVEMENT toutes les donnees personnelles de cet utilisateur. Irreversible.</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setShowDSRModal(false)} disabled={processingDSR} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-colors">
                  Annuler
                </button>
                <button
                  onClick={handleDSRRequest}
                  disabled={!dsrEmail || processingDSR}
                  className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    dsrType === 'erasure' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {processingDSR && <Loader2 className="w-4 h-4 animate-spin" />}
                  {dsrType === 'erasure' ? 'Supprimer definitiv.' : dsrType === 'access' ? 'Exporter maintenant' : 'Enregistrer la demande'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Consent Detail Modal ── */}
      {selectedConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Detail du consentement</h2>
              </div>
              <button onClick={() => setSelectedConsent(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Email', value: selectedConsent.email },
                  { label: 'Base legale', value: selectedConsent.lawful_basis === 'consent' ? 'Consentement' : 'Interet legitime' },
                  { label: 'Collecte le', value: new Date(selectedConsent.collected_at).toLocaleString('fr-FR') },
                  { label: 'Collecte par', value: selectedConsent.collected_by },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{item.label}</div>
                    <div className="text-sm font-bold text-gray-900 mt-1 truncate">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Objectif du traitement</div>
                <div className="text-sm text-gray-800 mt-1">{selectedConsent.purpose}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">URL de desinscription</div>
                <div className="flex items-center gap-2">
                  <input type="text" value={selectedConsent.opt_out_url} readOnly className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono" />
                  <button
                    onClick={() => { navigator.clipboard.writeText(selectedConsent.opt_out_url); showToast('success', 'URL copiee'); }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Copier
                  </button>
                </div>
              </div>
              {selectedConsent.opted_out_at && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-800 font-semibold">
                    Opt-out le {new Date(selectedConsent.opted_out_at).toLocaleString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceCenter;
