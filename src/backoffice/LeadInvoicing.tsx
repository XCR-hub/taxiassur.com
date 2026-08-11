import React, { useState, useEffect } from 'react';
import {
  CreditCard, Search, User, Euro, Loader2,
  Check, X, RefreshCw, TrendingUp, Clock, CheckCircle2, XCircle,
  ChevronRight, Zap, Receipt, BadgeEuro, Calendar,
  Hash
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { withTimeout } from '@/lib/promise-timeout';
import { clearPaymentRequestId, getPaymentRequestId } from '@/lib/payment-idempotency';

interface Lead {
  id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string;
  created_at: string;
  city: string | null;
}

interface Payment {
  id: string;
  reference: string;
  amount: number;
  status: string;
  created_at: string;
  lead_id: string;
  customer_name: string;
  description: string;
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
}

function getAvatarColor(str: string): string {
  const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899', '#8b5cf6'];
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const QUICK_AMOUNTS = [50, 100, 200, 500];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; Icon: React.FC<{size?: number}> }> = {
  pending:   { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', Icon: Clock },
  paid:      { label: 'Payé',       color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', Icon: CheckCircle2 },
  success:   { label: 'Payé',       color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', Icon: CheckCircle2 },
  failed:    { label: 'Échoué',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', Icon: XCircle },
  cancelled: { label: 'Annulé',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', Icon: X },
};

const LeadInvoicing: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) { setFilteredLeads(leads); return; }
    setFilteredLeads(leads.filter(l =>
      l.email?.toLowerCase().includes(term) ||
      l.first_name?.toLowerCase().includes(term) ||
      l.last_name?.toLowerCase().includes(term) ||
      l.phone?.includes(term)
    ));
  }, [searchTerm, leads]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [{ data: leadsData }, { data: paymentsData }] = await Promise.all([
        supabase.from('crm_leads').select('id, email, phone, first_name, last_name, status, created_at, city').order('created_at', { ascending: false }).limit(100),
        supabase.from('monetico_payments').select('*').not('lead_id', 'is', null).order('created_at', { ascending: false }).limit(20)
      ]);
      if (leadsData) { setLeads(leadsData); setFilteredLeads(leadsData); }
      if (paymentsData) setRecentPayments(paymentsData);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setPaymentSuccess(false);
    setDescription(`Paiement comptant assurance taxi`);
  };

  const handleCreatePayment = async () => {
    if (!selectedLead || !amount || parseFloat(amount) <= 0) {
      toast.warning('Veuillez sélectionner un lead et entrer un montant valide');
      return;
    }
    setCreating(true);
    setPaymentSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.info('Session expirée'); return; }

      const paymentSignature = JSON.stringify({ leadId: selectedLead.id, amount: parseFloat(amount).toFixed(2), description: description.trim() });
      const paymentRequestId = getPaymentRequestId(paymentSignature);
      const { data, error } = await withTimeout(supabase.functions.invoke('create-monetico-payment', {
        body: { leadId: selectedLead.id, amount: parseFloat(amount), description: description || `Paiement ${selectedLead.first_name} ${selectedLead.last_name}`, requestId: paymentRequestId }
      }), 45_000);

      if (error) { toast.error('Erreur lors de la création du lien de paiement'); return; }

      if (data?.success && data?.actionUrl && data?.formData) {
        clearPaymentRequestId(paymentSignature);
        const action = new URL(data.actionUrl);
        if (action.protocol !== 'https:' || action.hostname !== 'p.monetico-services.com') {
          throw new Error('Adresse de paiement invalide');
        }
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = action.toString();
        form.target = '_blank';
        Object.entries(data.formData as Record<string, string>).forEach(([name, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = String(value);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        form.remove();
        setPaymentSuccess(true);
        setAmount('');
        setDescription('');
        setSelectedLead(null);
        loadData(true);
      }
    } catch {
      toast.error('Erreur lors de la création du paiement');
    } finally {
      setCreating(false);
    }
  };

  const totalPaid = recentPayments.filter(p => p.status === 'paid' || p.status === 'success').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = recentPayments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const countPaid = recentPayments.filter(p => p.status === 'paid' || p.status === 'success').length;

  return (
    <div style={{ minHeight: '100%', background: '#0f1117' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 32px' }}>

        {/* HEADER */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2436 60%, #141c30 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            position: 'relative'
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 600px 120px at 0% 50%, rgba(16,185,129,0.07), transparent)', pointerEvents: 'none' }} />
          <div className="flex items-center justify-between px-6 py-5 relative">
            <div className="flex items-center gap-4">
              <div style={{
                width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.08))',
                border: '1px solid rgba(16,185,129,0.3)',
                boxShadow: '0 0 24px rgba(16,185,129,0.15)'
              }}>
                <CreditCard size={22} style={{ color: '#34d399' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Facturation Leads</h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 }}>Créez des liens de paiement Monético pour vos leads</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3">
              {[
                { label: 'Payés', value: `${totalPaid.toFixed(0)} €`, color: '#10b981', icon: CheckCircle2 },
                { label: 'En attente', value: `${totalPending.toFixed(0)} €`, color: '#f59e0b', icon: Clock },
                { label: 'Transactions', value: `${countPaid}`, color: '#60a5fa', icon: TrendingUp },
              ].map(({ label, value, color, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <Icon size={14} style={{ color }} />
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{label}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => loadData(true)}
                style={{
                  width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)', cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

          {/* LEFT: Lead Search + Payment Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Lead Search */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: '#181c27', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Card header */}
              <div className="px-4 py-3.5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Search size={13} style={{ color: '#60a5fa' }} />
                </div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Sélectionner un Lead</h2>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>
                  {filteredLeads.length}
                </span>
              </div>

              <div className="p-3">
                {/* Search input */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="text"
                    placeholder="Nom, email ou téléphone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%', paddingLeft: 34, paddingRight: searchTerm ? 32 : 12, paddingTop: 9, paddingBottom: 9,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10, fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Lead list */}
                <div style={{ maxHeight: 360, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                      <Loader2 size={20} className="animate-spin" style={{ color: '#10b981' }} />
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.25)' }}>
                      <User size={28} style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 13 }}>Aucun lead trouvé</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {filteredLeads.map(lead => {
                        const isSelected = selectedLead?.id === lead.id;
                        const color = getAvatarColor(lead.email || '');
                        const name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Inconnu';
                        return (
                          <button
                            key={lead.id}
                            onClick={() => handleSelectLead(lead)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                              background: isSelected ? `${color}12` : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isSelected ? `${color}40` : 'rgba(255,255,255,0.05)'}`,
                              cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10,
                              boxShadow: isSelected ? `0 0 16px ${color}15` : 'none'
                            }}
                          >
                            {/* Avatar */}
                            <div style={{
                              width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: `${color}20`, border: `1.5px solid ${color}35`, color, fontSize: 12, fontWeight: 700
                            }}>
                              {getInitials(lead.first_name, lead.last_name)}
                            </div>
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#fff' : 'rgba(255,255,255,0.85)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</p>
                              {lead.phone && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '1px 0 0' }}>{lead.phone}</p>}
                            </div>
                            {isSelected ? (
                              <Check size={14} style={{ color, flexShrink: 0 }} />
                            ) : (
                              <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Form (shown when lead selected) */}
            {selectedLead ? (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: '#181c27', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {/* Header */}
                <div style={{
                  padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BadgeEuro size={13} style={{ color: '#34d399' }} />
                  </div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', flex: 1 }}>Créer un Paiement</h2>
                  <button onClick={() => setSelectedLead(null)} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                    <X size={14} />
                  </button>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Selected lead card */}
                  <div style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: `${getAvatarColor(selectedLead.email || '')}10`,
                    border: `1px solid ${getAvatarColor(selectedLead.email || '')}25`,
                    display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${getAvatarColor(selectedLead.email || '')}25`,
                      border: `1.5px solid ${getAvatarColor(selectedLead.email || '')}40`,
                      color: getAvatarColor(selectedLead.email || ''), fontSize: 13, fontWeight: 700
                    }}>
                      {getInitials(selectedLead.first_name, selectedLead.last_name)}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
                        {selectedLead.first_name} {selectedLead.last_name}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{selectedLead.email}</p>
                    </div>
                  </div>

                  {/* Amount input */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                      Montant (EUR) *
                    </label>
                    {/* Quick presets */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      {QUICK_AMOUNTS.map(v => (
                        <button
                          key={v}
                          onClick={() => setAmount(String(v))}
                          style={{
                            flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                            background: amount === String(v) ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${amount === String(v) ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            color: amount === String(v) ? '#34d399' : 'rgba(255,255,255,0.5)'
                          }}
                        >
                          {v}€
                        </button>
                      ))}
                    </div>
                    {/* Input */}
                    <div style={{ position: 'relative' }}>
                      <Euro size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: amount ? '#34d399' : 'rgba(255,255,255,0.3)' }} />
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={{
                          width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 11, paddingBottom: 11,
                          background: 'rgba(255,255,255,0.05)', border: `1px solid ${amount ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 10, fontSize: 16, fontWeight: 700, color: amount ? '#34d399' : 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box',
                          boxShadow: amount ? '0 0 12px rgba(16,185,129,0.08)' : 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={2}
                      placeholder="Paiement comptant assurance taxi..."
                      style={{
                        width: '100%', padding: '10px 12px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.8)', outline: 'none', resize: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleCreatePayment}
                    disabled={creating || !amount}
                    style={{
                      width: '100%', padding: '13px 16px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: creating || !amount ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s', border: 'none',
                      background: creating || !amount
                        ? 'rgba(255,255,255,0.06)'
                        : 'linear-gradient(135deg, #10b981, #059669)',
                      color: creating || !amount ? 'rgba(255,255,255,0.25)' : '#fff',
                      boxShadow: creating || !amount ? 'none' : '0 4px 20px rgba(16,185,129,0.3)'
                    }}
                  >
                    {creating ? (
                      <><Loader2 size={16} className="animate-spin" />Création en cours...</>
                    ) : (
                      <><Zap size={16} />Créer le lien de paiement</>
                    )}
                  </button>

                  {/* Success state */}
                  {paymentSuccess && (
                    <div style={{
                      padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                      display: 'flex', alignItems: 'flex-start', gap: 10
                    }}>
                      <CheckCircle2 size={16} style={{ color: '#34d399', marginTop: 1, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#34d399', margin: 0 }}>Lien créé avec succès !</p>
                        <p style={{ fontSize: 12, color: 'rgba(16,185,129,0.7)', margin: '3px 0 0' }}>La fenêtre de paiement Monético s'est ouverte.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty payment form state */
              <div style={{
                padding: '28px 20px', borderRadius: 16, textAlign: 'center',
                background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)'
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <CreditCard size={20} style={{ color: 'rgba(255,255,255,0.15)' }} />
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Sélectionnez un lead pour créer un paiement</p>
              </div>
            )}
          </div>

          {/* RIGHT: Recent Payments */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#181c27', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Panel header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt size={14} style={{ color: '#fbbf24' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Paiements Leads Récents</h2>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>{recentPayments.length} entrée{recentPayments.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => loadData(true)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Payments grid */}
            <div style={{ padding: 16, maxHeight: 700, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
              {recentPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <CreditCard size={24} style={{ color: 'rgba(255,255,255,0.12)' }} />
                  </div>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Aucun paiement pour le moment</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentPayments.map(payment => {
                    const s = STATUS_CONFIG[payment.status] || STATUS_CONFIG.cancelled;
                    const { Icon: StatusIcon } = s;
                    const color = getAvatarColor(payment.customer_name || '');
                    return (
                      <div
                        key={payment.id}
                        style={{
                          padding: '14px 16px', borderRadius: 14, transition: 'all 0.15s',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}
                      >
                        {/* Top row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Avatar */}
                            <div style={{
                              width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: `${color}18`, border: `1.5px solid ${color}30`, color, fontSize: 11, fontWeight: 700
                            }}>
                              {(payment.customer_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{payment.customer_name || 'Client'}</p>
                              {payment.description && (
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                                  {payment.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Status badge */}
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                            background: s.bg, color: s.color, border: `1px solid ${s.border}`, flexShrink: 0
                          }}>
                            <StatusIcon size={10} />
                            {s.label}
                          </span>
                        </div>

                        {/* Bottom row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', items: 'center', gap: 16 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                              <Hash size={10} />
                              {payment.reference}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 12 }}>
                              <Calendar size={10} />
                              {formatDate(payment.created_at)}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 18, fontWeight: 800, color: payment.status === 'paid' || payment.status === 'success' ? '#10b981' : '#f59e0b',
                            textShadow: `0 0 12px ${payment.status === 'paid' || payment.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                          }}>
                            {payment.amount?.toFixed(2)} <span style={{ fontSize: 13, opacity: 0.7 }}>EUR</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer summary */}
            {recentPayments.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12 }}>
                {[
                  { label: 'Total encaissé', value: `${totalPaid.toFixed(2)} EUR`, color: '#10b981' },
                  { label: 'En attente', value: `${totalPending.toFixed(2)} EUR`, color: '#f59e0b' },
                  { label: 'Réussites', value: `${countPaid} / ${recentPayments.length}`, color: '#60a5fa' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 700, color, margin: 0 }}>{value}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '3px 0 0' }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadInvoicing;
