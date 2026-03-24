import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '@/lib/toast';
import {
  DollarSign,
  Download,
  TrendingUp,
  CreditCard,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  BarChart3,
  Mail,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  Printer,
  Building2,
  Zap,
  Activity,
  PieChart,
  Hash,
  User,
  Phone,
  Shield,
  Trash2,
  Ban,
  AlertTriangle
} from 'lucide-react';

interface MoneticoPayment {
  id: string;
  reference: string;
  lead_id: string;
  amount: number;
  currency: string;
  status: string;
  customer_name: string;
  customer_email: string;
  card_type?: string;
  card_last4?: string;
  authorization_number?: string;
  payment_date?: string;
  created_at: string;
  lead?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface AccountingStats {
  total_ca: number;
  total_pending: number;
  total_paid: number;
  total_failed: number;
  count_paid: number;
  count_pending: number;
  count_failed: number;
  avg_transaction: number;
  success_rate: number;
}

interface DailyData {
  date: string;
  amount: number;
  count: number;
}

const PERIOD_PRESETS = [
  { label: "Aujourd'hui", days: 0 },
  { label: '7 derniers jours', days: 7 },
  { label: '30 derniers jours', days: 30 },
  { label: '90 derniers jours', days: 90 },
  { label: 'Cette année', days: 365 },
];

export default function MoneticoAccountingDashboard() {
  const [payments, setPayments] = useState<MoneticoPayment[]>([]);
  const [stats, setStats] = useState<AccountingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [sendingReport, setSendingReport] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<number | null>(30);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ type: 'cancel' | 'delete'; payment: MoneticoPayment } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterStatus, startDate, endDate]);

  async function loadData() {
    try {
      setLoading(true);
      let query = supabase
        .from('monetico_payments')
        .select(`*, lead:crm_leads(first_name, last_name, phone)`)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      setPayments(data || []);
      calculateStats(data || []);
      calculateDailyData(data || []);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  async function cancelPayment(payment: MoneticoPayment) {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('monetico_payments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', payment.id);
      if (error) throw error;
      toast.success('Demande de paiement annulée');
      setConfirmModal(null);
      setExpandedRow(null);
      await loadData();
    } catch (err) {
      console.error('Erreur annulation:', err);
      toast.error("Erreur lors de l'annulation");
    } finally {
      setActionLoading(false);
    }
  }

  async function deletePayment(payment: MoneticoPayment) {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('monetico_payments')
        .delete()
        .eq('id', payment.id);
      if (error) throw error;
      toast.success('Paiement supprimé définitivement');
      setConfirmModal(null);
      setExpandedRow(null);
      await loadData();
    } catch (err) {
      console.error('Erreur suppression:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  }

  function applyPeriodPreset(days: number) {
    setActivePeriod(days);
    if (days === 0) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }

  function calculateStats(data: MoneticoPayment[]) {
    const s: AccountingStats = {
      total_ca: 0, total_pending: 0, total_paid: 0, total_failed: 0,
      count_paid: 0, count_pending: 0, count_failed: 0,
      avg_transaction: 0, success_rate: 0
    };
    data.forEach(p => {
      const amount = parseFloat(p.amount.toString());
      if (p.status === 'paid') { s.total_paid += amount; s.count_paid++; }
      else if (p.status === 'pending') { s.total_pending += amount; s.count_pending++; }
      else { s.total_failed += amount; s.count_failed++; }
    });
    s.total_ca = s.total_paid;
    s.avg_transaction = s.count_paid > 0 ? s.total_paid / s.count_paid : 0;
    const total = s.count_paid + s.count_pending + s.count_failed;
    s.success_rate = total > 0 ? Math.round((s.count_paid / total) * 100) : 0;
    setStats(s);
  }

  function calculateDailyData(data: MoneticoPayment[]) {
    const map = new Map<string, { amount: number; count: number }>();
    data.filter(p => p.status === 'paid').forEach(p => {
      const date = new Date(p.created_at).toISOString().split('T')[0];
      const amount = parseFloat(p.amount.toString());
      if (!map.has(date)) map.set(date, { amount: 0, count: 0 });
      const cur = map.get(date)!;
      cur.amount += amount;
      cur.count++;
    });
    const daily = Array.from(map.entries())
      .map(([date, d]) => ({ date, amount: d.amount, count: d.count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
    setDailyData(daily);
  }

  async function sendMonthlyReport() {
    try {
      setSendingReport(true);
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const { error } = await supabase.functions.invoke('send-email-universal', {
        body: {
          to: 'comptabilite@taxiassur.fr',
          subject: `Rapport Monético ${month}/${year} — CA ${stats?.total_ca.toFixed(2)} €`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
              <h2 style="color:#1f2937;margin-bottom:4px;">Rapport Mensuel Monético</h2>
              <p style="color:#6b7280;margin-bottom:24px;">${month < 10 ? '0' + month : month}/${year}</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
                <div style="background:#d1fae5;padding:16px;border-radius:8px;">
                  <p style="color:#065f46;font-size:12px;margin:0 0 4px 0;">CA Encaissé</p>
                  <p style="color:#064e3b;font-size:24px;font-weight:700;margin:0;">${stats?.total_paid.toFixed(2)} €</p>
                  <p style="color:#059669;font-size:12px;margin:4px 0 0 0;">${stats?.count_paid} transactions</p>
                </div>
                <div style="background:#fef3c7;padding:16px;border-radius:8px;">
                  <p style="color:#92400e;font-size:12px;margin:0 0 4px 0;">En attente</p>
                  <p style="color:#78350f;font-size:24px;font-weight:700;margin:0;">${stats?.total_pending.toFixed(2)} €</p>
                  <p style="color:#d97706;font-size:12px;margin:4px 0 0 0;">${stats?.count_pending} transactions</p>
                </div>
              </div>
              <p style="color:#6b7280;font-size:12px;">Ticket moyen : ${stats?.avg_transaction.toFixed(2)} € — Taux de succès : ${stats?.success_rate}%</p>
            </div>
          `
        }
      });
      if (error) throw error;
      toast.success('Rapport envoyé avec succès');
    } catch {
      toast.error("Erreur lors de l'envoi du rapport");
    } finally {
      setSendingReport(false);
    }
  }

  function exportToCSV() {
    const fp = filterPayments();
    const headers = ['Date','Référence','Client','Email','Téléphone','Montant','Devise','Statut','Type Carte','4 derniers chiffres','N° Autorisation','Date Paiement'];
    const rows = fp.map(p => [
      new Date(p.created_at).toLocaleDateString('fr-FR'),
      p.reference,
      p.customer_name || `${p.lead?.first_name || ''} ${p.lead?.last_name || ''}`,
      p.customer_email,
      p.lead?.phone || '',
      p.amount, p.currency, p.status,
      p.card_type || '', p.card_last4 || '',
      p.authorization_number || '',
      p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : ''
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `monetico_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  function exportToExcel() {
    const fp = filterPayments();
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr style="background-color:#1d4ed8;color:white;font-weight:bold;"><th>Date</th><th>Référence</th><th>Client</th><th>Email</th><th>Téléphone</th><th>Montant</th><th>Devise</th><th>Statut</th><th>Type Carte</th><th>4 derniers chiffres</th><th>N° Autorisation</th><th>Date Paiement</th></tr></thead><tbody>`;
    fp.forEach(p => {
      const sc = p.status === 'paid' ? '#059669' : p.status === 'pending' ? '#d97706' : '#dc2626';
      html += `<tr><td>${new Date(p.created_at).toLocaleDateString('fr-FR')}</td><td>${p.reference}</td><td>${p.customer_name || `${p.lead?.first_name || ''} ${p.lead?.last_name || ''}`}</td><td>${p.customer_email}</td><td>${p.lead?.phone || ''}</td><td style="text-align:right;">${p.amount}</td><td>${p.currency}</td><td style="background-color:${sc};color:white;">${p.status}</td><td>${p.card_type || ''}</td><td>${p.card_last4 || ''}</td><td>${p.authorization_number || ''}</td><td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : ''}</td></tr>`;
    });
    html += '</tbody></table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `monetico_transactions_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  }

  function printReport() {
    window.print();
  }

  function filterPayments() {
    return payments.filter(p => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        p.reference.toLowerCase().includes(q) ||
        (p.customer_name || '').toLowerCase().includes(q) ||
        (p.customer_email || '').toLowerCase().includes(q) ||
        (p.authorization_number || '').toLowerCase().includes(q)
      );
    });
  }

  const filteredPayments = filterPayments();
  const maxDailyAmount = Math.max(...dailyData.map(d => d.amount), 1);

  const bg = '#0d1017';
  const surface = '#111827';
  const surfaceHover = '#161f2e';
  const border = 'rgba(255,255,255,0.07)';
  const textPrimary = '#f1f5f9';
  const textSecondary = '#94a3b8';
  const textMuted = '#475569';
  const amber = '#f59e0b';
  const amberDim = 'rgba(245,158,11,0.12)';

  return (
    <div style={{ display: 'flex', height: '100%', background: bg, color: textPrimary, fontFamily: 'inherit' }}>

      {/* LEFT PANEL */}
      <div style={{
        width: sidebarCollapsed ? 56 : 260,
        minWidth: sidebarCollapsed ? 56 : 260,
        background: surface,
        borderRight: `1px solid ${border}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden'
      }}>
        {/* Panel header */}
        <div style={{ padding: '18px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${amber}, #d97706)`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px rgba(245,158,11,0.3)` }}>
                <CreditCard size={14} color="#000" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Monético</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={16} style={{ transform: sidebarCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            {/* Quick stats */}
            <div style={{ padding: '16px 14px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Vue rapide</p>
              {stats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 10, color: '#6ee7b7', marginBottom: 2 }}>CA Encaissé</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#10b981', margin: 0 }}>{stats.total_paid.toFixed(0)} €</p>
                    <p style={{ fontSize: 10, color: '#6ee7b7', margin: '2px 0 0 0' }}>{stats.count_paid} transactions</p>
                  </div>
                  <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 10, color: '#fcd34d', marginBottom: 2 }}>En attente</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: amber, margin: 0 }}>{stats.total_pending.toFixed(0)} €</p>
                    <p style={{ fontSize: 10, color: '#fcd34d', margin: '2px 0 0 0' }}>{stats.count_pending} transactions</p>
                  </div>
                  {stats.count_failed > 0 && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, color: '#fca5a5', marginBottom: 2 }}>Échoués</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', margin: 0 }}>{stats.total_failed.toFixed(0)} €</p>
                      <p style={{ fontSize: 10, color: '#fca5a5', margin: '2px 0 0 0' }}>{stats.count_failed} transactions</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Period presets */}
            <div style={{ padding: '16px 14px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Période</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {PERIOD_PRESETS.map(preset => (
                  <button
                    key={preset.days}
                    onClick={() => applyPeriodPreset(preset.days)}
                    style={{
                      background: activePeriod === preset.days ? amberDim : 'transparent',
                      border: 'none',
                      borderLeft: activePeriod === preset.days ? `2px solid ${amber}` : '2px solid transparent',
                      color: activePeriod === preset.days ? amber : textSecondary,
                      fontSize: 12,
                      fontWeight: activePeriod === preset.days ? 600 : 400,
                      padding: '7px 10px',
                      borderRadius: '0 6px 6px 0',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div style={{ padding: '16px 14px', borderBottom: `1px solid ${border}` }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Statut</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { value: 'all', label: 'Tous', color: textSecondary },
                  { value: 'paid', label: 'Payés', color: '#10b981' },
                  { value: 'pending', label: 'En attente', color: amber },
                  { value: 'failed', label: 'Échoués', color: '#ef4444' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterStatus(opt.value)}
                    style={{
                      background: filterStatus === opt.value ? `${opt.color}15` : 'transparent',
                      border: 'none',
                      borderLeft: filterStatus === opt.value ? `2px solid ${opt.color}` : '2px solid transparent',
                      color: filterStatus === opt.value ? opt.color : textSecondary,
                      fontSize: 12,
                      fontWeight: filterStatus === opt.value ? 600 : 400,
                      padding: '7px 10px',
                      borderRadius: '0 6px 6px 0',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                    {opt.label}
                    {stats && (
                      <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>
                        {opt.value === 'all' ? stats.count_paid + stats.count_pending + stats.count_failed :
                          opt.value === 'paid' ? stats.count_paid :
                          opt.value === 'pending' ? stats.count_pending : stats.count_failed}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Success rate ring */}
            {stats && (
              <div style={{ padding: '16px 14px', borderBottom: `1px solid ${border}` }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Taux de succès</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                      <circle
                        cx="26" cy="26" r="20"
                        fill="none"
                        stroke={stats.success_rate >= 80 ? '#10b981' : stats.success_rate >= 50 ? amber : '#ef4444'}
                        strokeWidth="5"
                        strokeDasharray={`${(stats.success_rate / 100) * 125.6} 125.6`}
                        strokeLinecap="round"
                        transform="rotate(-90 26 26)"
                      />
                    </svg>
                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 11, fontWeight: 700, color: textPrimary }}>{stats.success_rate}%</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: textPrimary, fontWeight: 600, margin: 0 }}>Succès</p>
                    <p style={{ fontSize: 10, color: textMuted, margin: '2px 0 0 0' }}>Ticket moy.</p>
                    <p style={{ fontSize: 13, color: amber, fontWeight: 700, margin: '2px 0 0 0' }}>{stats.avg_transaction.toFixed(0)} €</p>
                  </div>
                </div>
              </div>
            )}

            {/* TPE Info */}
            <div style={{ padding: '14px', marginTop: 'auto' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Shield size={12} color={amber} />
                  <span style={{ fontSize: 10, color: amber, fontWeight: 600 }}>TPE Monético</span>
                </div>
                <p style={{ fontSize: 11, color: textSecondary, margin: 0 }}>N° <span style={{ color: textPrimary, fontWeight: 600 }}>7374133</span></p>
                <p style={{ fontSize: 10, color: textMuted, margin: '2px 0 0 0' }}>Société : taxiassur</p>
              </div>
            </div>
          </>
        )}

        {/* Collapsed icons */}
        {sidebarCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
            {[
              { icon: <Activity size={16} />, color: '#10b981' },
              { icon: <Clock size={16} />, color: amber },
              { icon: <XCircle size={16} />, color: '#ef4444' },
              { icon: <BarChart3 size={16} />, color: '#3b82f6' },
            ].map((item, i) => (
              <div key={i} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, opacity: 0.7 }}>
                {item.icon}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${amber}, #d97706)`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 18px rgba(245,158,11,0.25)` }}>
                <CreditCard size={18} color="#000" />
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0 }}>Comptabilité Monético</h1>
                <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Suivi des paiements et exports comptables</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={loadData}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, borderRadius: 8, color: textSecondary, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              onClick={printReport}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, borderRadius: 8, color: textSecondary, fontSize: 12, cursor: 'pointer' }}
            >
              <Printer size={13} />
              Imprimer
            </button>
            <button
              onClick={exportToCSV}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <Download size={13} />
              CSV
            </button>
            <button
              onClick={exportToExcel}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <FileText size={13} />
              Excel
            </button>
            <button
              onClick={sendMonthlyReport}
              disabled={sendingReport}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: `linear-gradient(135deg, ${amber}, #d97706)`, border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: sendingReport ? 0.6 : 1 }}
            >
              <Mail size={13} />
              {sendingReport ? 'Envoi...' : 'Rapport Email'}
            </button>
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

          {/* KPI Cards */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                {
                  label: 'CA Encaissé', value: `${stats.total_paid.toFixed(2)} €`,
                  sub: `${stats.count_paid} transactions`,
                  icon: <DollarSign size={18} color="#10b981" />,
                  bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)',
                  accent: '#10b981', trend: <ArrowUpRight size={13} />, trendLabel: `${stats.success_rate}% succès`
                },
                {
                  label: 'En Attente', value: `${stats.total_pending.toFixed(2)} €`,
                  sub: `${stats.count_pending} transactions`,
                  icon: <Clock size={18} color={amber} />,
                  bg: amberDim, border: 'rgba(245,158,11,0.15)',
                  accent: amber, trend: <AlertCircle size={13} />, trendLabel: 'À encaisser'
                },
                {
                  label: 'Échoués / Annulés', value: `${stats.total_failed.toFixed(2)} €`,
                  sub: `${stats.count_failed} transactions`,
                  icon: <XCircle size={18} color="#ef4444" />,
                  bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)',
                  accent: '#ef4444', trend: <ArrowDownRight size={13} />, trendLabel: 'Non encaissé'
                },
                {
                  label: 'Ticket Moyen', value: `${stats.avg_transaction.toFixed(2)} €`,
                  sub: 'Moyenne / transaction',
                  icon: <TrendingUp size={18} color="#3b82f6" />,
                  bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)',
                  accent: '#3b82f6', trend: <Zap size={13} />, trendLabel: `Taux ${stats.success_rate}%`
                }
              ].map((card, i) => (
                <div key={i} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 12, padding: '16px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: card.accent, opacity: 0.6 }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 11, color: card.accent, margin: '0 0 6px 0', fontWeight: 500 }}>{card.label}</p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: textPrimary, margin: 0 }}>{card.value}</p>
                      <p style={{ fontSize: 11, color: textMuted, margin: '4px 0 0 0' }}>{card.sub}</p>
                    </div>
                    <div style={{ width: 36, height: 36, background: `${card.accent}18`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {card.icon}
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, color: card.accent, fontSize: 11 }}>
                    {card.trend}
                    <span>{card.trendLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart + Filters Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12 }}>

            {/* Bar chart */}
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={15} color={amber} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Évolution CA — 30 jours</span>
                </div>
                <span style={{ fontSize: 11, color: textMuted }}>Transactions payées uniquement</span>
              </div>
              {dailyData.length === 0 ? (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textMuted, fontSize: 13 }}>
                  Aucune donnée sur la période
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, minWidth: dailyData.length * 28 }}>
                    {dailyData.map((day) => {
                      const pct = (day.amount / maxDailyAmount) * 100;
                      return (
                        <div key={day.date} style={{ flex: 1, minWidth: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }} title={`${new Date(day.date).toLocaleDateString('fr-FR')} : ${day.amount.toFixed(2)} € (${day.count} tx)`}>
                          <div style={{ width: '100%', height: `${pct}%`, minHeight: 4, background: `linear-gradient(180deg, ${amber}, #d97706)`, borderRadius: '3px 3px 0 0', opacity: 0.85, transition: 'height 0.3s ease' }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: textMuted }}>
                      {new Date(dailyData[0]?.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                    <span style={{ fontSize: 10, color: textMuted }}>
                      {new Date(dailyData[dailyData.length - 1]?.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Filters */}
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Filter size={13} color={amber} />
                <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Filtres avancés</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: textMuted, display: 'block', marginBottom: 5 }}>Recherche</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Référence, client, N° auto..."
                      style={{ width: '100%', padding: '8px 10px 8px 30px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${border}`, borderRadius: 7, color: textPrimary, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: textMuted, display: 'block', marginBottom: 5 }}>Date début</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => { setStartDate(e.target.value); setActivePeriod(null); }}
                      style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${border}`, borderRadius: 7, color: textPrimary, fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: textMuted, display: 'block', marginBottom: 5 }}>Date fin</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => { setEndDate(e.target.value); setActivePeriod(null); }}
                      style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${border}`, borderRadius: 7, color: textPrimary, fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {(startDate || endDate || searchTerm || filterStatus !== 'all') && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); setFilterStatus('all'); setActivePeriod(30); applyPeriodPreset(30); }}
                    style={{ padding: '7px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, color: '#f87171', fontSize: 11, cursor: 'pointer' }}
                  >
                    Réinitialiser filtres
                  </button>
                )}

                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 10 }}>
                  <p style={{ fontSize: 11, color: textMuted, marginBottom: 6 }}>Résultats : <span style={{ color: amber, fontWeight: 600 }}>{filteredPayments.length}</span> transactions</p>
                  <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>Total affiché : <span style={{ color: '#10b981', fontWeight: 600 }}>{filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0).toFixed(2)} €</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Table */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Hash size={13} color={amber} />
                <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Transactions</span>
                <span style={{ padding: '2px 8px', background: amberDim, borderRadius: 20, fontSize: 11, color: amber, fontWeight: 600 }}>{filteredPayments.length}</span>
              </div>
              <span style={{ fontSize: 11, color: textMuted }}>Cliquez sur une ligne pour les détails</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {['Date', 'Référence', 'Client', 'Montant', 'Statut', 'Carte', 'N° Autorisation', ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: textMuted, fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <RefreshCw size={14} className="animate-spin" />
                        Chargement...
                      </div>
                    </td></tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <PieChart size={28} color={textMuted} />
                        <p style={{ color: textSecondary, fontSize: 13, margin: 0 }}>Aucune transaction trouvée</p>
                        <p style={{ color: textMuted, fontSize: 11, margin: 0 }}>Modifiez les filtres pour afficher des résultats</p>
                      </div>
                    </td></tr>
                  ) : filteredPayments.map((payment) => {
                    const isExpanded = expandedRow === payment.id;
                    const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
                      paid: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', dot: '#10b981' },
                      pending: { bg: 'rgba(245,158,11,0.12)', text: amber, dot: amber },
                      failed: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', dot: '#ef4444' },
                      cancelled: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', dot: '#ef4444' },
                    };
                    const sc = statusColors[payment.status] || { bg: 'rgba(255,255,255,0.06)', text: textSecondary, dot: textMuted };
                    const displayName = payment.customer_name || `${payment.lead?.first_name || ''} ${payment.lead?.last_name || ''}`.trim() || '—';

                    return (
                      <>
                        <tr
                          key={payment.id}
                          onClick={() => setExpandedRow(isExpanded ? null : payment.id)}
                          style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer', background: isExpanded ? surfaceHover : 'transparent', transition: 'background 0.15s' }}
                          onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = surfaceHover; }}
                          onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <td style={{ padding: '12px 16px', fontSize: 12, color: textSecondary, whiteSpace: 'nowrap' }}>
                            {new Date(payment.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            <br />
                            <span style={{ fontSize: 10, color: textMuted }}>
                              {new Date(payment.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 11, color: amber, fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {payment.reference}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 600, color: textSecondary }}>
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p style={{ fontSize: 12, color: textPrimary, fontWeight: 500, margin: 0 }}>{displayName}</p>
                                <p style={{ fontSize: 10, color: textMuted, margin: '1px 0 0 0' }}>{payment.customer_email}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: payment.status === 'paid' ? '#10b981' : textPrimary, whiteSpace: 'nowrap' }}>
                            {parseFloat(payment.amount.toString()).toFixed(2)} {payment.currency}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: sc.bg, borderRadius: 20, fontSize: 11, fontWeight: 600, color: sc.text }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                              {payment.status === 'paid' ? 'Payé' : payment.status === 'pending' ? 'En attente' : payment.status === 'failed' ? 'Échoué' : payment.status === 'cancelled' ? 'Annulé' : payment.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: textSecondary }}>
                            {payment.card_type && payment.card_last4 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CreditCard size={13} color={textMuted} />
                                <span>{payment.card_type} ••{payment.card_last4}</span>
                              </div>
                            ) : <span style={{ color: textMuted }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 11, color: textSecondary, fontFamily: 'monospace' }}>
                            {payment.authorization_number || <span style={{ color: textMuted }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <ChevronDown size={14} color={textMuted} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${payment.id}-detail`} style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${border}` }}>
                            <td colSpan={8} style={{ padding: '14px 16px 14px 60px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                {[
                                  { icon: <User size={12} />, label: 'Client complet', value: `${payment.customer_name || '—'}` },
                                  { icon: <Mail size={12} />, label: 'Email', value: payment.customer_email || '—' },
                                  { icon: <Phone size={12} />, label: 'Téléphone', value: payment.lead?.phone || '—' },
                                  { icon: <Calendar size={12} />, label: 'Date paiement', value: payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
                                  { icon: <Hash size={12} />, label: 'ID transaction', value: payment.id.split('-')[0] + '...' },
                                  { icon: <Shield size={12} />, label: 'N° autorisation', value: payment.authorization_number || '—' },
                                  { icon: <CreditCard size={12} />, label: 'Carte', value: payment.card_type && payment.card_last4 ? `${payment.card_type} **** **** **** ${payment.card_last4}` : '—' },
                                  { icon: <Building2 size={12} />, label: 'Lead associé', value: payment.lead_id ? `${payment.lead?.first_name || ''} ${payment.lead?.last_name || ''}`.trim() || 'Lié' : 'Paiement libre' },
                                ].map((detail, i) => (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: textMuted }}>
                                      {detail.icon}
                                      <span style={{ fontSize: 10, color: textMuted }}>{detail.label}</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: textPrimary, fontWeight: 500 }}>{detail.value}</span>
                                  </div>
                                ))}
                              </div>
                              {(payment.status === 'pending' || payment.status === 'failed') && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${border}` }}>
                                  {payment.status === 'pending' && (
                                    <button
                                      onClick={e => { e.stopPropagation(); setConfirmModal({ type: 'cancel', payment }); }}
                                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                      <Ban size={13} />
                                      Annuler le paiement
                                    </button>
                                  )}
                                  <button
                                    onClick={e => { e.stopPropagation(); setConfirmModal({ type: 'delete', payment }); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                  >
                                    <Trash2 size={13} />
                                    Supprimer
                                  </button>
                                  <span style={{ fontSize: 10, color: textMuted }}>Les paiements encaissés ne peuvent pas être supprimés.</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom info cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FileText size={14} color='#3b82f6' />
                <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Information Comptable</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  'Les exports incluent toutes les informations nécessaires',
                  'Format CSV compatible avec tous les logiciels de compta',
                  "Les transactions en attente ne doivent pas être comptabilisées",
                  "Le N° d'autorisation Monético sert de justificatif bancaire",
                  'TPE Monético : 7374133 — Société : taxiassur'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: textSecondary }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: 6 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Zap size={14} color={amber} />
                <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Alertes & Automatisations</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Rapport mensuel automatique par email', active: true },
                  { label: 'Alertes sur paiements en attente +7 jours', active: true },
                  { label: 'Notification des paiements échoués', active: true },
                  { label: 'Réconciliation bancaire hebdomadaire', active: false },
                  { label: 'Export automatique fin de mois', active: false },
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: textSecondary }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.active ? '#10b981' : textMuted, flexShrink: 0 }} />
                    <span style={{ color: item.active ? textSecondary : textMuted }}>{item.label}</span>
                    {item.active && <span style={{ marginLeft: 'auto', fontSize: 9, background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>ACTIF</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>

      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => !actionLoading && setConfirmModal(null)}>
          <div style={{ background: '#1a1a2e', border: `1px solid ${border}`, borderRadius: 16, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: confirmModal.type === 'delete' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} color={confirmModal.type === 'delete' ? '#ef4444' : '#f59e0b'} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
                  {confirmModal.type === 'delete' ? 'Supprimer ce paiement ?' : 'Annuler ce paiement ?'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>Cette action est irréversible.</p>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{confirmModal.payment.customer_name || confirmModal.payment.reference}</span>
                {' — '}
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>{parseFloat(confirmModal.payment.amount.toString()).toFixed(2)} {confirmModal.payment.currency}</span>
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{confirmModal.payment.reference}</p>
            </div>
            {confirmModal.type === 'delete' && (
              <p style={{ margin: '0 0 18px 0', fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                La suppression est definitive. Utilisez "Annuler" si vous souhaitez conserver une trace avec le statut "Annule".
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
                style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${border}`, borderRadius: 8, color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Retour
              </button>
              <button
                onClick={() => confirmModal.type === 'delete' ? deletePayment(confirmModal.payment) : cancelPayment(confirmModal.payment)}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: confirmModal.type === 'delete' ? '#ef4444' : '#f59e0b', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1 }}
              >
                {actionLoading ? <RefreshCw size={13} className="animate-spin" /> : confirmModal.type === 'delete' ? <Trash2 size={13} /> : <Ban size={13} />}
                {actionLoading ? 'En cours...' : confirmModal.type === 'delete' ? 'Supprimer definitivement' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
