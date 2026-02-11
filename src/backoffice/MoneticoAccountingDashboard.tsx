import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  DollarSign,
  Download,
  Calendar,
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
  TrendingDown,
  PieChart,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Card from '../components/Card';

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
    nom: string;
    prenom: string;
    telephone: string;
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
}

interface DailyData {
  date: string;
  amount: number;
  count: number;
}

export default function MoneticoAccountingDashboard() {
  const [payments, setPayments] = useState<MoneticoPayment[]>([]);
  const [stats, setStats] = useState<AccountingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [showCharts, setShowCharts] = useState(true);
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterStatus, startDate, endDate]);

  async function loadData() {
    try {
      setLoading(true);

      let query = supabase
        .from('monetico_payments')
        .select(`
          *,
          lead:crm_leads(nom, prenom, telephone)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPayments(data || []);
      calculateStats(data || []);
      calculateDailyData(data || []);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(data: MoneticoPayment[]) {
    const stats: AccountingStats = {
      total_ca: 0,
      total_pending: 0,
      total_paid: 0,
      total_failed: 0,
      count_paid: 0,
      count_pending: 0,
      count_failed: 0,
      avg_transaction: 0
    };

    data.forEach(payment => {
      const amount = parseFloat(payment.amount.toString());

      if (payment.status === 'paid') {
        stats.total_paid += amount;
        stats.count_paid++;
      } else if (payment.status === 'pending') {
        stats.total_pending += amount;
        stats.count_pending++;
      } else if (payment.status === 'failed' || payment.status === 'cancelled') {
        stats.total_failed += amount;
        stats.count_failed++;
      }
    });

    stats.total_ca = stats.total_paid;
    stats.avg_transaction = stats.count_paid > 0 ? stats.total_paid / stats.count_paid : 0;

    setStats(stats);
  }

  function calculateDailyData(data: MoneticoPayment[]) {
    const dailyMap = new Map<string, { amount: number; count: number }>();

    data
      .filter(p => p.status === 'paid')
      .forEach(payment => {
        const date = new Date(payment.created_at).toISOString().split('T')[0];
        const amount = parseFloat(payment.amount.toString());

        if (!dailyMap.has(date)) {
          dailyMap.set(date, { amount: 0, count: 0 });
        }

        const current = dailyMap.get(date)!;
        current.amount += amount;
        current.count++;
      });

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    setDailyData(daily);
  }

  async function sendMonthlyReport() {
    try {
      setSendingReport(true);

      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const { data, error } = await supabase.functions.invoke('send-email-universal', {
        body: {
          to: 'comptabilite@taxiassur.fr',
          subject: `Rapport Monético ${month}/${year}`,
          html: `
            <h2>Rapport Mensuel Monético</h2>
            <p>CA encaissé: ${stats?.total_ca.toFixed(2)} €</p>
            <p>Transactions: ${stats?.count_paid}</p>
            <p>Ticket moyen: ${stats?.avg_transaction.toFixed(2)} €</p>
            <p>En attente: ${stats?.total_pending.toFixed(2)} €</p>
          `
        }
      });

      if (error) throw error;

      alert('Rapport envoyé avec succès');
    } catch (error) {
      console.error('Erreur envoi rapport:', error);
      alert('Erreur lors de l\'envoi du rapport');
    } finally {
      setSendingReport(false);
    }
  }

  function exportToCSV() {
    const filteredPayments = filterPayments();

    const headers = [
      'Date',
      'Référence',
      'Client',
      'Email',
      'Téléphone',
      'Montant',
      'Devise',
      'Statut',
      'Type Carte',
      '4 derniers chiffres',
      'N° Autorisation',
      'Date Paiement'
    ];

    const rows = filteredPayments.map(p => [
      new Date(p.created_at).toLocaleDateString('fr-FR'),
      p.reference,
      p.customer_name || `${p.lead?.prenom} ${p.lead?.nom}`,
      p.customer_email,
      p.lead?.telephone || '',
      p.amount,
      p.currency,
      p.status,
      p.card_type || '',
      p.card_last4 || '',
      p.authorization_number || '',
      p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : ''
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `monetico_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportToExcel() {
    const filteredPayments = filterPayments();

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <thead>
            <tr style="background-color: #4F46E5; color: white; font-weight: bold;">
              <th>Date</th>
              <th>Référence</th>
              <th>Client</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Montant</th>
              <th>Devise</th>
              <th>Statut</th>
              <th>Type Carte</th>
              <th>4 derniers chiffres</th>
              <th>N° Autorisation</th>
              <th>Date Paiement</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredPayments.forEach(p => {
      const statusColor = p.status === 'paid' ? '#10B981' : p.status === 'pending' ? '#F59E0B' : '#EF4444';
      html += `
        <tr>
          <td>${new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
          <td>${p.reference}</td>
          <td>${p.customer_name || `${p.lead?.prenom} ${p.lead?.nom}`}</td>
          <td>${p.customer_email}</td>
          <td>${p.lead?.telephone || ''}</td>
          <td style="text-align: right;">${p.amount}</td>
          <td>${p.currency}</td>
          <td style="background-color: ${statusColor}; color: white;">${p.status}</td>
          <td>${p.card_type || ''}</td>
          <td>${p.card_last4 || ''}</td>
          <td>${p.authorization_number || ''}</td>
          <td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : ''}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `monetico_transactions_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function filterPayments() {
    return payments.filter(p => {
      const matchesSearch = searchTerm === '' ||
        p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Payé
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            En attente
          </span>
        );
      case 'failed':
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" />
            Échoué
          </span>
        );
      default:
        return <span className="text-gray-600">{status}</span>;
    }
  };

  const filteredPayments = filterPayments();
  const maxDailyAmount = Math.max(...dailyData.map(d => d.amount), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comptabilité Monético</h1>
          <p className="text-gray-600 mt-1">Suivi des paiements et exports comptables</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={sendMonthlyReport}
            disabled={sendingReport}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {sendingReport ? 'Envoi...' : 'Rapport Email'}
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">CA Encaissé</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {stats.total_paid.toFixed(2)} €
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.count_paid} transaction{stats.count_paid > 1 ? 's' : ''}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-200 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">En Attente</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {stats.total_pending.toFixed(2)} €
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  {stats.count_pending} transaction{stats.count_pending > 1 ? 's' : ''}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-200 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Échoués</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {stats.total_failed.toFixed(2)} €
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {stats.count_failed} transaction{stats.count_failed > 1 ? 's' : ''}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-200 rounded-full flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-700" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Ticket Moyen</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {stats.avg_transaction.toFixed(2)} €
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Moyenne par transaction
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-200 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {showCharts && dailyData.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Évolution du CA (30 derniers jours)
              </h2>
              <button
                onClick={() => setShowCharts(!showCharts)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Masquer
              </button>
            </div>
            <div className="space-y-3">
              {dailyData.map((day, index) => (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-gray-600">
                    {new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-end pr-2 transition-all duration-300"
                        style={{ width: `${(day.amount / maxDailyAmount) * 100}%` }}
                      >
                        <span className="text-xs font-medium text-white">
                          {day.amount.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-16 text-xs text-gray-500 text-right">
                    {day.count} tx
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Filtres et Exports</h2>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FileText className="h-4 w-4" />
                Export Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
                <option value="failed">Échoué</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recherche
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Référence, client..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carte
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Auto.
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucune transaction trouvée
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {payment.reference}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{payment.customer_name}</div>
                      <div className="text-gray-500 text-xs">{payment.customer_email}</div>
                      {payment.lead && (
                        <div className="text-gray-500 text-xs">{payment.lead.telephone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {parseFloat(payment.amount.toString()).toFixed(2)} {payment.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.card_type && payment.card_last4 ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span>{payment.card_type} ****{payment.card_last4}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {payment.authorization_number || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-50">
          <div className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Information Comptable
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>Les exports incluent toutes les informations nécessaires</li>
              <li>Format CSV compatible avec tous les logiciels de compta</li>
              <li>Les transactions en attente ne doivent pas être comptabilisées</li>
              <li>Le N° d'autorisation Monético sert de justificatif bancaire</li>
              <li>TPE Monético : 7374133 - Société : taxiassur</li>
            </ul>
          </div>
        </Card>

        <Card className="bg-purple-50">
          <div className="p-6">
            <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Alertes Automatiques
            </h3>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>Rapport mensuel automatique par email</li>
              <li>Alertes sur paiements en attente 7 jours</li>
              <li>Notification des paiements échoués</li>
              <li>Réconciliation bancaire hebdomadaire</li>
              <li>Export automatique fin de mois</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
