import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users, Search, Building2, Download, Loader2, ArrowUpDown,
  Activity, Shield, Eye, MessageSquare, LayoutGrid, List,
  Phone, Mail, MapPin, Calendar, DollarSign, ChevronDown,
  AlertTriangle, Clock, CheckCircle2, Copy, ExternalLink,
  FileText, Car, MoreVertical, X, Zap, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  postal_code: string;
  immatriculation: string | null;
  status: string;
  pipeline_stage: string;
  access_token: string | null;
  created_at: string;
  updated_at: string;
  insurance_contracts: {
    insurer_name: string;
    contract_number: string | null;
    premium_ttc: number;
    renewal_date: string;
    effective_date: string;
    status: string;
    contract_type: string;
  }[];
  insurance_claims: { id: string; status: string }[];
}

type ViewMode = 'table' | 'cards';
type SortField = 'name' | 'date' | 'premium' | 'renewal';
type RenewalFilter = 'all' | '7d' | '30d' | '60d' | '90d';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR');

function getRenewalUrgency(renewalDate: string | null): 'critical' | 'warning' | 'ok' | null {
  if (!renewalDate) return null;
  const days = Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'critical';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}

function getRenewalDays(renewalDate: string | null): number | null {
  if (!renewalDate) return null;
  return Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000);
}

function RenewalBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const days = getRenewalDays(date);
  if (days === null) return null;
  const urgency = getRenewalUrgency(date);
  if (urgency === 'ok') return null;
  if (urgency === 'critical')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200"><AlertTriangle size={10} />{days < 0 ? 'Échu' : `J-${days}`}</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200"><Clock size={10} />J-{days}</span>;
}

function ActionMenu({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);

  const portalUrl = client.access_token
    ? `${window.location.origin}/espace-client/${client.access_token}`
    : null;

  const copyPortalLink = async () => {
    if (portalUrl) {
      await navigator.clipboard.writeText(portalUrl);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 overflow-hidden">
            <Link
              to={`/backoffice/clients/${client.id}`}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Shield size={15} className="text-yellow-500" />
              Gérer le dossier
            </Link>
            <Link
              to={`/backoffice/crm-killer/lead/${client.id}`}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Eye size={15} className="text-gray-500" />
              Voir fiche CRM
            </Link>
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Mail size={15} className="text-blue-500" />
              Envoyer un email
            </a>
            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Phone size={15} className="text-green-500" />
              Appeler
            </a>
            {portalUrl && (
              <>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={copyPortalLink}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy size={15} className="text-gray-400" />
                  Copier lien espace client
                </button>
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <ExternalLink size={15} className="text-gray-400" />
                  Ouvrir espace client
                </a>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function exportToCsv(clients: Client[]) {
  const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Ville', 'Immatriculation', 'Compagnie', 'N° Contrat', 'Prime TTC', 'Date effet', 'Renouvellement', 'Sinistres'];
  const rows = clients.map(c => {
    const contract = c.insurance_contracts?.[0];
    const claims = c.insurance_claims?.length ?? 0;
    return [
      c.first_name, c.last_name, c.email, c.phone, c.city, c.immatriculation ?? '',
      contract?.insurer_name ?? '', contract?.contract_number ?? '',
      contract?.premium_ttc ?? '', contract?.effective_date ?? '', contract?.renewal_date ?? '',
      claims
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clients-actifs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientsManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterRenewal, setFilterRenewal] = useState<RenewalFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [companies, setCompanies] = useState<string[]>([]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select(`
          id, first_name, last_name, email, phone, city, postal_code,
          immatriculation, status, pipeline_stage, access_token, created_at, updated_at,
          insurance_contracts(insurer_name, contract_number, premium_ttc, renewal_date, effective_date, status, contract_type),
          insurance_claims(id, status)
        `)
        .in('status', ['client_actif', 'CLIENT_ACTIF'])
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setClients((data as any[]) || []);

      const seen = new Set<string>();
      const insurers: string[] = [];
      for (const c of data || []) {
        for (const ic of c.insurance_contracts || []) {
          if (ic.insurer_name && !seen.has(ic.insurer_name)) {
            seen.add(ic.insurer_name);
            insurers.push(ic.insurer_name);
          }
        }
      }
      setCompanies(insurers.sort());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const filtered = clients
    .filter(c => {
      const s = searchTerm.toLowerCase();
      const matchesSearch = !s || [c.first_name, c.last_name, c.email, c.phone, c.immatriculation]
        .some(v => v?.toLowerCase().includes(s));

      const matchesCompany = filterCompany === 'all' ||
        c.insurance_contracts?.some(ic => ic.insurer_name === filterCompany);

      let matchesRenewal = true;
      if (filterRenewal !== 'all') {
        const days = parseInt(filterRenewal);
        matchesRenewal = c.insurance_contracts?.some(ic => {
          const d = getRenewalDays(ic.renewal_date);
          return d !== null && d >= 0 && d <= days;
        }) ?? false;
      }

      return matchesSearch && matchesCompany && matchesRenewal;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.last_name ?? '').localeCompare(b.last_name ?? '');
      if (sortBy === 'premium') {
        const pa = a.insurance_contracts?.[0]?.premium_ttc ?? 0;
        const pb = b.insurance_contracts?.[0]?.premium_ttc ?? 0;
        return pb - pa;
      }
      if (sortBy === 'renewal') {
        const da = getRenewalDays(a.insurance_contracts?.[0]?.renewal_date ?? null) ?? 9999;
        const db = getRenewalDays(b.insurance_contracts?.[0]?.renewal_date ?? null) ?? 9999;
        return da - db;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const totalPremium = clients.reduce((s, c) => s + (c.insurance_contracts?.[0]?.premium_ttc ?? 0), 0);
  const urgentRenewals = clients.filter(c =>
    c.insurance_contracts?.some(ic => {
      const d = getRenewalDays(ic.renewal_date);
      return d !== null && d >= 0 && d <= 30;
    })
  ).length;
  const activeClaims = clients.filter(c =>
    c.insurance_claims?.some(cl => !['closed', 'refused'].includes(cl.status))
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-[1800px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-yellow-500 rounded-xl">
                <Users className="h-6 w-6 text-black" />
              </div>
              Portefeuille Clients
            </h1>
            <p className="text-gray-500 text-sm mt-1">{clients.length} client{clients.length > 1 ? 's' : ''} actif{clients.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 transition-colors ${viewMode === 'table' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:bg-gray-50'}`}
                title="Vue tableau"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2.5 transition-colors ${viewMode === 'cards' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:bg-gray-50'}`}
                title="Vue cartes"
              >
                <LayoutGrid size={18} />
              </button>
            </div>
            <button
              onClick={() => exportToCsv(filtered)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 shadow-sm transition-all text-sm font-medium"
            >
              <Download size={16} />
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Clients actifs', value: clients.length, icon: Users, color: 'yellow', sub: 'portefeuille total' },
            { label: 'Primes annuelles', value: fmtCurrency(totalPremium), icon: DollarSign, color: 'green', sub: 'volume total' },
            { label: 'Renouvellements 30j', value: urgentRenewals, icon: Clock, color: urgentRenewals > 0 ? 'orange' : 'gray', sub: 'à traiter' },
            { label: 'Sinistres en cours', value: activeClaims, icon: AlertTriangle, color: activeClaims > 0 ? 'red' : 'gray', sub: 'ouverts' },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className={`inline-flex p-2.5 rounded-xl mb-3 ${
                color === 'yellow' ? 'bg-yellow-50' : color === 'green' ? 'bg-green-50' :
                color === 'orange' ? 'bg-orange-50' : color === 'red' ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <Icon className={`h-5 w-5 ${
                  color === 'yellow' ? 'text-yellow-600' : color === 'green' ? 'text-green-600' :
                  color === 'orange' ? 'text-orange-600' : color === 'red' ? 'text-red-600' : 'text-gray-400'
                }`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone, plaque..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:bg-white transition-all"
              />
            </div>
            <div className="relative w-full lg:w-52">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <select
                value={filterCompany}
                onChange={e => setFilterCompany(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer transition-all"
              >
                <option value="all">Toutes compagnies</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="relative w-full lg:w-48">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <select
                value={filterRenewal}
                onChange={e => setFilterRenewal(e.target.value as RenewalFilter)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer transition-all"
              >
                <option value="all">Tous renouvellements</option>
                <option value="7d">Renouvellement ≤ 7 jours</option>
                <option value="30d">Renouvellement ≤ 30 jours</option>
                <option value="60d">Renouvellement ≤ 60 jours</option>
                <option value="90d">Renouvellement ≤ 90 jours</option>
              </select>
            </div>
            <div className="relative w-full lg:w-44">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortField)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer transition-all"
              >
                <option value="date">Plus récents</option>
                <option value="name">Nom A-Z</option>
                <option value="premium">Prime la plus haute</option>
                <option value="renewal">Renouvellement proche</option>
              </select>
            </div>
          </div>
          <div className="mt-3 text-xs font-medium text-gray-500 flex items-center gap-2">
            <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full" />
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} sur {clients.length} client{clients.length > 1 ? 's' : ''}
            {filterRenewal !== 'all' && <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">Filtre renouvellement actif</span>}
          </div>
        </div>

        {/* Content */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Client', 'Contact', 'Contrat', 'Prime', 'Renouvellement', 'Sinistres', ''].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(client => {
                    const contract = client.insurance_contracts?.[0];
                    const openClaims = client.insurance_claims?.filter(cl => !['closed', 'refused'].includes(cl.status)).length ?? 0;
                    return (
                      <tr key={client.id} className="hover:bg-yellow-50/30 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <span className="text-black font-bold text-sm">
                                {client.first_name?.[0]}{client.last_name?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{client.first_name} {client.last_name}</p>
                              {client.city && (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={10} />{client.city}
                                </p>
                              )}
                              {client.immatriculation && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Car size={10} />{client.immatriculation}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-yellow-600 transition-colors">
                              <Mail size={12} className="text-gray-400" />{client.email}
                            </a>
                            <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-green-600 transition-colors">
                              <Phone size={12} className="text-gray-400" />{client.phone}
                            </a>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {contract ? (
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{contract.insurer_name}</p>
                              {contract.contract_number && (
                                <p className="text-xs text-gray-400 mt-0.5 font-mono">{contract.contract_number}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-0.5 capitalize">{contract.contract_type?.replace(/_/g, ' ')}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Aucun contrat</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {contract?.premium_ttc ? (
                            <p className="text-sm font-bold text-gray-900">{fmtCurrency(contract.premium_ttc)}</p>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {contract?.renewal_date ? (
                            <div className="space-y-1">
                              <p className="text-sm text-gray-700 font-medium">{fmtDate(contract.renewal_date)}</p>
                              <RenewalBadge date={contract.renewal_date} />
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {openClaims > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                              <AlertTriangle size={10} />{openClaims} en cours
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                              <CheckCircle2 size={10} />Aucun
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <Link
                              to={`/backoffice/clients/${client.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-xs font-semibold transition-colors shadow-sm"
                            >
                              <Shield size={13} />
                              Gérer
                            </Link>
                            <ActionMenu client={client} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Users className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-600 font-semibold">Aucun client trouvé</p>
                <p className="text-gray-400 text-sm mt-1">Modifiez vos filtres de recherche</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(client => {
              const contract = client.insurance_contracts?.[0];
              const openClaims = client.insurance_claims?.filter(cl => !['closed', 'refused'].includes(cl.status)).length ?? 0;
              const urgency = getRenewalUrgency(contract?.renewal_date ?? null);
              return (
                <div
                  key={client.id}
                  className={`bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md ${
                    urgency === 'critical' ? 'border-red-200' : urgency === 'warning' ? 'border-orange-200' : 'border-gray-100'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-sm flex-shrink-0">
                          <span className="text-black font-bold text-base">{client.first_name?.[0]}{client.last_name?.[0]}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{client.first_name} {client.last_name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} />{client.city || 'Ville inconnue'}
                          </p>
                        </div>
                      </div>
                      <ActionMenu client={client} />
                    </div>

                    <div className="space-y-2 mb-4">
                      <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-yellow-600 transition-colors">
                        <Mail size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </a>
                      <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-green-600 transition-colors">
                        <Phone size={12} className="text-gray-400 flex-shrink-0" />{client.phone}
                      </a>
                      {client.immatriculation && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Car size={12} className="text-gray-400 flex-shrink-0" />{client.immatriculation}
                        </div>
                      )}
                    </div>

                    {contract && (
                      <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={11} />{contract.insurer_name}</span>
                          <span className="text-sm font-bold text-gray-900">{fmtCurrency(contract.premium_ttc)}</span>
                        </div>
                        {contract.renewal_date && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} />Renouvellement</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-gray-700">{fmtDate(contract.renewal_date)}</span>
                              <RenewalBadge date={contract.renewal_date} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/backoffice/clients/${client.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Shield size={14} />
                        Gérer
                      </Link>
                      {openClaims > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-semibold">
                          <AlertTriangle size={12} />{openClaims}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <Users className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-600 font-semibold">Aucun client trouvé</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
