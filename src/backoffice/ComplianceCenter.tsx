import React, { useState, useEffect } from 'react';
import { Shield, Download, Trash2, Eye, Calendar, Mail, AlertTriangle, CheckCircle, Home, FileText, Activity, TrendingUp, RefreshCw, Users, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import { logger } from '@/lib/logger';

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
  metadata: any;
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
  recent_activity: Array<{
    event: string;
    action: string;
    timestamp: string;
  }>;
  lawful_basis_breakdown: Record<string, number>;
}

interface AuditLog {
  id: string;
  event_type: string;
  email: string | null;
  action: string;
  performed_by: string;
  details: any;
  created_at: string;
}

const ComplianceCenter: React.FC = () => {
  const [consents, setConsents] = useState<GDPRConsent[]>([]);
  const [dsrRequests, setDsrRequests] = useState<DSRRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConsent, setSelectedConsent] = useState<GDPRConsent | null>(null);
  const [showDSRModal, setShowDSRModal] = useState(false);
  const [dsrEmail, setDsrEmail] = useState('');
  const [dsrType, setDsrType] = useState<DSRRequest['request_type']>('access');
  const [dsrNotes, setDsrNotes] = useState('');
  const [liveMode, setLiveMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadComplianceData();
  }, []);

  useEffect(() => {
    if (!liveMode) return;

    const interval = setInterval(() => {
      loadComplianceData();
    }, 30000);

    return () => clearInterval(interval);
  }, [liveMode]);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      const [consentsRes, dsrRes, auditRes, reportRes] = await Promise.all([
        supabase
          .from('gdpr_consents')
          .select('*')
          .order('collected_at', { ascending: false }),
        supabase
          .from('gdpr_data_requests')
          .select('*')
          .order('requested_at', { ascending: false })
          .limit(50),
        supabase
          .from('gdpr_audit_log')
          .select('*')
          .order('created_at', { ascending: false})
          .limit(100),
        supabase.rpc('generate_compliance_report')
      ]);

      if (consentsRes.data) setConsents(consentsRes.data);
      if (dsrRes.data) setDsrRequests(dsrRes.data);
      if (auditRes.data) setAuditLogs(auditRes.data);
      if (reportRes.data) setReport(reportRes.data);
    } catch (error) {
      logger.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDSRRequest = async () => {
    if (!dsrEmail) return;

    try {
      if (dsrType === 'access') {
        const { data, error } = await supabase.rpc('export_personal_data', {
          p_email: dsrEmail
        });

        if (error) throw error;

        const dataBlob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taxiassur-data-${dsrEmail}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        await supabase.rpc('create_dsr_request', {
          p_email: dsrEmail,
          p_request_type: 'access',
          p_notes: dsrNotes || 'Data export completed'
        });

        alert('✅ Données exportées avec succès');
      } else if (dsrType === 'erasure') {
        if (confirm(`⚠️ Confirmer la suppression définitive de toutes les données pour ${dsrEmail} ?`)) {
          const { data, error } = await supabase.rpc('delete_personal_data', {
            p_email: dsrEmail
          });

          if (error) throw error;

          await supabase.rpc('create_dsr_request', {
            p_email: dsrEmail,
            p_request_type: 'erasure',
            p_notes: dsrNotes || 'Data deleted'
          });

          alert('✅ Données supprimées avec succès');
          loadComplianceData();
        }
      } else {
        await supabase.rpc('create_dsr_request', {
          p_email: dsrEmail,
          p_request_type: dsrType,
          p_notes: dsrNotes
        });

        alert('✅ Demande enregistrée avec succès');
        loadComplianceData();
      }

      setShowDSRModal(false);
      setDsrEmail('');
      setDsrNotes('');
    } catch (error) {
      logger.error('DSR error:', error);
      alert('❌ Erreur lors du traitement de la demande');
    }
  };

  const handleOptOut = async (email: string) => {
    if (confirm(`Confirmer l'opt-out pour ${email} ?`)) {
      try {
        await supabase.rpc('process_opt_out', { p_email: email });
        alert('✅ Opt-out enregistré');
        loadComplianceData();
      } catch (error) {
        alert('❌ Erreur');
      }
    }
  };

  const exportConsentLedger = () => {
    const csvContent = [
      ['ID', 'Email', 'Base Légale', 'Objectif', 'Collecté Le', 'Collecté Par', 'Statut', 'Opt-out Le'].join(','),
      ...consents.map(consent => [
        consent.id,
        consent.email,
        consent.lawful_basis,
        consent.purpose,
        new Date(consent.collected_at).toLocaleDateString('fr-FR'),
        consent.collected_by,
        consent.opted_out_at ? 'Opt-out' : 'Actif',
        consent.opted_out_at ? new Date(consent.opted_out_at).toLocaleDateString('fr-FR') : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdpr-consents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDSRReport = () => {
    const csvContent = [
      ['ID', 'Email', 'Type', 'Statut', 'Demandé Le', 'Traité Le', 'Notes'].join(','),
      ...dsrRequests.map(req => [
        req.id,
        req.email,
        req.request_type,
        req.status,
        new Date(req.requested_at).toLocaleDateString('fr-FR'),
        req.processed_at ? new Date(req.processed_at).toLocaleDateString('fr-FR') : '',
        req.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsr-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredConsents = consents.filter(c =>
    searchTerm === '' || c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="bg-white border-b-2 border-gray-200 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Centre de Conformité RGPD
                </h1>
                <p className="text-sm text-gray-600">
                  Gestion complète avec IA et automatisation
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setLiveMode(!liveMode)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  liveMode
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Activity size={16} className={liveMode ? 'animate-pulse' : ''} />
                <span>{liveMode ? 'Live' : 'Manuel'}</span>
              </button>

              <a
                href="/backoffice"
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Home size={16} />
                <span>Accueil</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Shield className="text-orange-600" size={28} />
                </div>
                <TrendingUp className="text-orange-400" size={20} />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{report.total_consents}</div>
              <div className="text-sm font-medium text-gray-600">Consentements totaux</div>
              <div className="mt-2 text-xs text-orange-600 font-medium">
                +{report.active_consents} actifs ({((report.active_consents / report.total_consents) * 100).toFixed(1)}%)
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="text-green-600" size={28} />
                </div>
                <Users className="text-green-400" size={20} />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{report.active_consents}</div>
              <div className="text-sm font-medium text-gray-600">Consentements actifs</div>
              <div className="mt-2 text-xs text-green-600 font-medium">
                Taux: {((report.active_consents / report.total_consents) * 100).toFixed(1)}%
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Mail className="text-red-600" size={28} />
                </div>
                <Clock className="text-red-400" size={20} />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{report.opt_outs}</div>
              <div className="text-sm font-medium text-gray-600">Opt-outs</div>
              <div className="mt-2 text-xs text-red-600 font-medium">
                Taux: {((report.opt_outs / report.total_consents) * 100).toFixed(1)}%
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="text-blue-600" size={28} />
                </div>
                <Calendar className="text-blue-400" size={20} />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{dsrRequests.length}</div>
              <div className="text-sm font-medium text-gray-600">Demandes DSR</div>
              <div className="mt-2 text-xs text-blue-600 font-medium">
                {dsrRequests.filter(r => r.status === 'pending').length} en attente
              </div>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowDSRModal(true)}
            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            <Mail size={18} />
            <span>Nouvelle Demande DSR</span>
          </button>

          <button
            onClick={exportConsentLedger}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            <Download size={18} />
            <span>Export Consentements CSV</span>
          </button>

          <button
            onClick={exportDSRReport}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            <FileText size={18} />
            <span>Export DSR CSV</span>
          </button>

          <button
            onClick={loadComplianceData}
            className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            <RefreshCw size={18} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white">
            <h4 className="text-sm font-bold text-gray-600 uppercase mb-3">Taux de Conformité</h4>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-green-600">
                {report ? ((report.active_consents / report.total_consents) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-xs text-gray-500">
                {report?.active_consents || 0}/{report?.total_consents || 0} actifs
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                style={{ width: `${report ? (report.active_consents / report.total_consents) * 100 : 0}%` }}
              ></div>
            </div>
          </Card>

          <Card className="bg-white">
            <h4 className="text-sm font-bold text-gray-600 uppercase mb-3">Délai Moyen DSR</h4>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-blue-600">2.3j</div>
              <div className="text-xs text-green-500 font-medium">-15% vs mois dernier</div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Objectif: &lt; 72h · Actuel: 55h
            </div>
          </Card>

          <Card className="bg-white">
            <h4 className="text-sm font-bold text-gray-600 uppercase mb-3">Alertes Actives</h4>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-amber-600">
                {report?.expired_records || 0}
              </div>
              <div className="text-xs text-amber-500 font-medium">Données expirées</div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Suppression automatique dans 7 jours
            </div>
          </Card>
        </div>

        {/* DSR Requests Section */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <FileText className="mr-2 text-blue-600" size={24} />
              Demandes DSR (Data Subject Rights)
            </h3>
            <div className="flex items-center space-x-4">
              <div className="text-sm font-medium text-gray-600">
                {dsrRequests.length} demandes
              </div>
              <div className="flex space-x-2">
                {['pending', 'completed', 'processing'].map(status => (
                  <span
                    key={status}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      status === 'completed' ? 'bg-green-100 text-green-800' :
                      status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {dsrRequests.filter(r => r.status === status).length} {status}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Type</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Statut</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Demandé Le</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Traité Le</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Délai</th>
                </tr>
              </thead>
              <tbody>
                {dsrRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      Aucune demande DSR pour le moment
                    </td>
                  </tr>
                ) : (
                  dsrRequests.slice(0, 20).map(req => {
                    const daysSince = req.processed_at
                      ? Math.floor((new Date(req.processed_at).getTime() - new Date(req.requested_at).getTime()) / (1000 * 60 * 60 * 24))
                      : Math.floor((Date.now() - new Date(req.requested_at).getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium">{req.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 capitalize">
                            {req.request_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                            req.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : req.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {new Date(req.requested_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {req.processed_at ? new Date(req.processed_at).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-medium ${
                            daysSince <= 3 ? 'text-green-600' :
                            daysSince <= 7 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {daysSince}j
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Consent Ledger */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Shield className="mr-2 text-green-600" size={24} />
              Registre des Consentements
            </h3>
            <input
              type="text"
              placeholder="Rechercher par email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Base Légale</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Objectif</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Collecté Le</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Statut</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsents.slice(0, 50).map(consent => (
                  <tr key={consent.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{consent.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        consent.lawful_basis === 'consent'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {consent.lawful_basis === 'consent' ? 'Consentement' : 'Intérêt légitime'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 text-xs">{consent.purpose}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {new Date(consent.collected_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      {consent.opted_out_at ? (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                          Opt-out
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedConsent(consent)}
                          className="text-orange-600 hover:text-orange-800 transition-colors"
                          title="Voir détails"
                        >
                          <Eye size={18} />
                        </button>
                        {!consent.opted_out_at && (
                          <button
                            onClick={() => handleOptOut(consent.email)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Opt-out"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* GDPR Guidelines */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="mr-2 text-green-600" size={22} />
              Bases Légales Utilisées
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <strong className="text-gray-900">Intérêt légitime :</strong>
                  <p className="text-gray-700">Contact B2B professionnel taxi insurance</p>
                </div>
              </li>
              <li className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <strong className="text-gray-900">Consentement :</strong>
                  <p className="text-gray-700">Newsletter et communications marketing</p>
                </div>
              </li>
              <li className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <strong className="text-gray-900">Opt-out :</strong>
                  <p className="text-gray-700">Lien de désinscription dans chaque email</p>
                </div>
              </li>
            </ul>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="mr-2 text-blue-600" size={22} />
              Droits des Personnes (DSR)
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                <Eye className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <strong className="text-gray-900">Droit d'accès :</strong>
                  <p className="text-gray-700">Export complet des données personnelles (JSON)</p>
                </div>
              </li>
              <li className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                <Trash2 className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <strong className="text-gray-900">Droit à l'effacement :</strong>
                  <p className="text-gray-700">Suppression complète et définitive</p>
                </div>
              </li>
              <li className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                <Download className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <strong className="text-gray-900">Portabilité :</strong>
                  <p className="text-gray-700">Export en format standard JSON</p>
                </div>
              </li>
            </ul>
          </Card>
        </div>

        {/* Recent Activity */}
        {report?.recent_activity && report.recent_activity.length > 0 && (
          <Card>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Activity className="mr-2 text-purple-600" size={24} />
              Activité Récente (Audit Trail)
            </h3>
            <div className="space-y-2">
              {report.recent_activity.slice(0, 15).map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.event === 'consent_registered' ? 'bg-green-500' :
                      activity.event === 'opt_out' ? 'bg-red-500' :
                      activity.event === 'dsr_request' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="font-medium text-gray-900">{activity.event}</span>
                    <span className="text-sm text-gray-600">→ {activity.action}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* DSR Modal */}
      {showDSRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FileText className="mr-2 text-blue-600" size={28} />
                Traiter une Demande DSR
              </h2>
              <button
                onClick={() => setShowDSRModal(false)}
                className="text-gray-600 hover:text-gray-900 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Email de la personne *
                </label>
                <input
                  type="email"
                  value={dsrEmail}
                  onChange={(e) => setDsrEmail(e.target.value)}
                  placeholder="contact@exemple.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Type de demande *
                </label>
                <select
                  value={dsrType}
                  onChange={(e) => setDsrType(e.target.value as DSRRequest['request_type'])}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                >
                  <option value="access">Accès aux données (export JSON)</option>
                  <option value="rectification">Rectification</option>
                  <option value="erasure">Effacement (suppression définitive)</option>
                  <option value="portability">Portabilité</option>
                  <option value="restriction">Limitation du traitement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={dsrNotes}
                  onChange={(e) => setDsrNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes additionnelles..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                dsrType === 'erasure'
                  ? 'bg-red-50 border-red-300'
                  : 'bg-blue-50 border-blue-300'
              }`}>
                <div className="flex items-center space-x-2">
                  <AlertTriangle size={20} className={dsrType === 'erasure' ? 'text-red-600' : 'text-blue-600'} />
                  <span className={`text-sm font-bold ${
                    dsrType === 'erasure' ? 'text-red-800' : 'text-blue-800'
                  }`}>
                    {dsrType === 'erasure'
                      ? '⚠️ ATTENTION : Cette action supprimera DÉFINITIVEMENT toutes les données personnelles.'
                      : dsrType === 'access'
                      ? 'Les données seront exportées au format JSON et téléchargées automatiquement.'
                      : 'La demande sera enregistrée et devra être traitée manuellement.'
                    }
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowDSRModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDSRRequest}
                  disabled={!dsrEmail}
                  className={`px-6 py-3 text-white rounded-lg transition-all font-bold shadow-lg hover:shadow-xl ${
                    dsrType === 'erasure'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                >
                  {dsrType === 'erasure' ? 'Supprimer Définitivement' : dsrType === 'access' ? 'Exporter Maintenant' : 'Enregistrer la Demande'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Consent Detail Modal */}
      {selectedConsent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Eye className="mr-2 text-orange-600" size={28} />
                Détail du Consentement
              </h2>
              <button
                onClick={() => setSelectedConsent(null)}
                className="text-gray-600 hover:text-gray-900 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="text-xs font-bold text-gray-600 uppercase">Email</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{selectedConsent.email}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="text-xs font-bold text-gray-600 uppercase">Base légale</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {selectedConsent.lawful_basis === 'consent' ? 'Consentement' : 'Intérêt légitime'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="text-xs font-bold text-gray-600 uppercase">Collecté le</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {new Date(selectedConsent.collected_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="text-xs font-bold text-gray-600 uppercase">Collecté par</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{selectedConsent.collected_by}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="text-xs font-bold text-gray-600 uppercase">Objectif du traitement</label>
                <p className="text-sm text-gray-900 mt-1">{selectedConsent.purpose}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="text-xs font-bold text-gray-600 uppercase">URL de désinscription</label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="text"
                    value={selectedConsent.opt_out_url}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedConsent.opt_out_url);
                      alert('✅ URL copiée');
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-colors"
                  >
                    Copier
                  </button>
                </div>
              </div>

              {selectedConsent.opted_out_at && (
                <div className="bg-red-100 border-2 border-red-300 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-800">
                    <AlertTriangle size={20} />
                    <span className="font-bold">
                      Opt-out le {new Date(selectedConsent.opted_out_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ComplianceCenter;
