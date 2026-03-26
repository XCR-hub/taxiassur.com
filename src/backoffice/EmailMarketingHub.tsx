import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Mail, Send, Eye, MousePointer, MessageSquare, Users,
  TrendingUp, ArrowRight, Sparkles, Beaker, Bell, BarChart3,
  Zap, RefreshCw, CheckCircle, Clock, AlertCircle, Inbox,
  FileText, UserCheck, ArrowUpRight, Calendar, XCircle,
  Paperclip, Search,
} from 'lucide-react';

interface EmailTypeStats {
  email_type: string;
  total: number;
  sent: number;
  pending: number;
  failed: number;
  last_sent_at: string | null;
}

interface WeeklyStats {
  week: string;
  total: number;
  sent: number;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
}

interface RecentEmail {
  id: string;
  to_email: string;
  to_name: string;
  subject: string;
  email_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

const EMAIL_TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new_lead_client: { label: 'Confirmation prospect', color: 'bg-emerald-100 text-emerald-700', icon: UserCheck },
  new_lead_team: { label: 'Notification equipe', color: 'bg-blue-100 text-blue-700', icon: Users },
  lead_resubmitted_team: { label: 'Lead re-soumis', color: 'bg-sky-100 text-sky-700', icon: RefreshCw },
  prospect_document_confirmation: { label: 'Confirmation document', color: 'bg-teal-100 text-teal-700', icon: FileText },
  relance_lead: { label: 'Relance prospect', color: 'bg-amber-100 text-amber-700', icon: Bell },
  relance_stage: { label: 'Relance pipeline', color: 'bg-orange-100 text-orange-700', icon: Zap },
  confirmation_devis: { label: 'Confirmation devis', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

export default function EmailMarketingHub() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [queueTotal, setQueueTotal] = useState(0);
  const [queueSent, setQueueSent] = useState(0);
  const [uniqueRecipients, setUniqueRecipients] = useState(0);
  const [sentLast7d, setSentLast7d] = useState(0);
  const [sentLast30d, setSentLast30d] = useState(0);

  const [inboxTotal, setInboxTotal] = useState(0);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [inboxLinkedLeads, setInboxLinkedLeads] = useState(0);
  const [inboxWithAttachments, setInboxWithAttachments] = useState(0);

  const [trackingSends, setTrackingSends] = useState(0);
  const [trackingOpens, setTrackingOpens] = useState(0);
  const [trackingClicks, setTrackingClicks] = useState(0);
  const [trackingReplies, setTrackingReplies] = useState(0);

  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [activeTemplates, setActiveTemplates] = useState(0);
  const [activeTests, setActiveTests] = useState(0);

  const [emailTypes, setEmailTypes] = useState<EmailTypeStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        queueTotalRes, queueSentRes, uniqueRecipRes, sent7dRes, sent30dRes,
        inboxTotalRes, inboxUnreadRes, inboxLinkedRes, inboxAttachRes,
        sendsRes, opensRes, clicksRes, repliesRes,
        subsRes, tplRes, testsRes,
        campaignsRes, recentRes
      ] = await Promise.all([
        supabase.from('email_queue').select('*', { count: 'exact', head: true }),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
        supabase.rpc('get_unique_email_recipients_count').catch(() => ({ data: null })),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'sent').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'sent').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from('email_messages').select('*', { count: 'exact', head: true }),
        supabase.from('email_messages').select('*', { count: 'exact', head: true }).or('is_read.eq.false,is_read.is.null'),
        supabase.from('email_messages').select('lead_id', { count: 'exact', head: true }).not('lead_id', 'is', null),
        supabase.from('email_messages').select('*', { count: 'exact', head: true }).not('attachments', 'is', null).neq('attachments', '[]'),
        supabase.from('email_sends').select('*', { count: 'exact', head: true }),
        supabase.from('email_opens').select('*', { count: 'exact', head: true }),
        supabase.from('email_clicks').select('*', { count: 'exact', head: true }),
        supabase.from('email_replies').select('*', { count: 'exact', head: true }),
        supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('email_templates_smart').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('email_ab_tests').select('*', { count: 'exact', head: true }).eq('status', 'running'),
        supabase.from('newsletter_campaigns').select('id,name,subject,status,total_sent,total_opened,total_clicked,created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('email_queue').select('id,to_email,to_name,subject,email_type,status,sent_at,created_at').order('created_at', { ascending: false }).limit(15),
      ]);

      setQueueTotal(queueTotalRes.count || 0);
      setQueueSent(queueSentRes.count || 0);
      setSentLast7d(sent7dRes.count || 0);
      setSentLast30d(sent30dRes.count || 0);

      setInboxTotal(inboxTotalRes.count || 0);
      setInboxUnread(inboxUnreadRes.count || 0);
      setInboxLinkedLeads(inboxLinkedRes.count || 0);
      setInboxWithAttachments(inboxAttachRes.count || 0);

      setTrackingSends(sendsRes.count || 0);
      setTrackingOpens(opensRes.count || 0);
      setTrackingClicks(clicksRes.count || 0);
      setTrackingReplies(repliesRes.count || 0);

      setActiveSubscribers(subsRes.count || 0);
      setActiveTemplates(tplRes.count || 0);
      setActiveTests(testsRes.count || 0);

      setCampaigns((campaignsRes.data || []) as Campaign[]);
      setRecentEmails((recentRes.data || []) as RecentEmail[]);

      if (typeof uniqueRecipRes.data === 'number') {
        setUniqueRecipients(uniqueRecipRes.data);
      } else {
        const { count } = await supabase.from('email_queue').select('to_email', { count: 'exact', head: true }).eq('status', 'sent');
        setUniqueRecipients(count || 0);
      }

      const { data: typeData } = await supabase.rpc('get_email_queue_stats_by_type').catch(() => ({ data: null }));
      if (typeData) {
        setEmailTypes(typeData);
      } else {
        const grouped: Record<string, EmailTypeStats> = {};
        (recentRes.data || []).forEach((e: any) => {
          if (!grouped[e.email_type]) {
            grouped[e.email_type] = { email_type: e.email_type, total: 0, sent: 0, pending: 0, failed: 0, last_sent_at: null };
          }
          grouped[e.email_type].total++;
          if (e.status === 'sent') grouped[e.email_type].sent++;
          if (e.sent_at && (!grouped[e.email_type].last_sent_at || e.sent_at > grouped[e.email_type].last_sent_at)) {
            grouped[e.email_type].last_sent_at = e.sent_at;
          }
        });
        setEmailTypes(Object.values(grouped));
      }
    } catch (e) {
      console.error('EmailMarketingHub load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openRate = trackingSends > 0 ? (trackingOpens / trackingSends) * 100 : 0;
  const clickRate = trackingSends > 0 ? (trackingClicks / trackingSends) * 100 : 0;
  const replyRate = trackingSends > 0 ? (trackingReplies / trackingSends) * 100 : 0;
  const deliveryRate = queueTotal > 0 ? (queueSent / queueTotal) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw size={24} className="animate-spin text-blue-500" />
          <span className="text-sm text-gray-400">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {queueSent} emails envoyes -- {inboxTotal} messages recus -- {sentLast7d} envoyes cette semaine
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-xs font-medium transition-colors">
            <RefreshCw size={14} />
          </button>
          {[
            { icon: <Send size={14} />, label: 'Nouvelle campagne', path: '/backoffice/newsletter', color: 'bg-emerald-500 hover:bg-emerald-600' },
            { icon: <Sparkles size={14} />, label: 'Templates IA', path: '/backoffice/smart-templates', color: 'bg-blue-500 hover:bg-blue-600' },
            { icon: <BarChart3 size={14} />, label: 'Analytics', path: '/backoffice/email-analytics', color: 'bg-gray-700 hover:bg-gray-800' },
          ].map(q => (
            <button
              key={q.path}
              onClick={() => navigate(q.path)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-medium transition-colors ${q.color}`}
            >
              {q.icon} {q.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Emails envoyes"
          value={queueSent}
          sub={`${queueTotal} total en file`}
          icon={<Send size={18} className="text-white" />}
          bg="bg-emerald-500"
        />
        <StatCard
          label="Messages recus"
          value={inboxTotal}
          sub={`${inboxUnread} non lus`}
          icon={<Inbox size={18} className="text-white" />}
          bg="bg-blue-500"
        />
        <StatCard
          label="Taux de livraison"
          value={`${deliveryRate.toFixed(0)}%`}
          sub={`${queueSent}/${queueTotal} livres`}
          icon={<CheckCircle size={18} className="text-white" />}
          bg="bg-teal-500"
        />
        <StatCard
          label="Destinataires uniques"
          value={uniqueRecipients || sentLast30d}
          sub="Contacts differents touches"
          icon={<Users size={18} className="text-white" />}
          bg="bg-gray-700"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MiniCard label="Envoyes 7j" value={sentLast7d} icon={Calendar} color="text-emerald-600" />
        <MiniCard label="Envoyes 30j" value={sentLast30d} icon={TrendingUp} color="text-blue-600" />
        <MiniCard label="Leads lies" value={inboxLinkedLeads} icon={UserCheck} color="text-teal-600" />
        <MiniCard label="Avec pieces jointes" value={inboxWithAttachments} icon={Paperclip} color="text-amber-600" />
        <MiniCard label="Templates actifs" value={activeTemplates} icon={Sparkles} color="text-blue-600" />
      </div>

      {trackingSends > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Suivi envois" value={trackingSends} icon={<Mail size={16} className="text-white" />} bg="bg-gray-600" sub="Emails traces" />
          <StatCard label="Taux ouverture" value={`${openRate.toFixed(1)}%`} icon={<Eye size={16} className="text-white" />} bg="bg-blue-500" sub={`${trackingOpens} ouvertures`} />
          <StatCard label="Taux de clic" value={`${clickRate.toFixed(1)}%`} icon={<MousePointer size={16} className="text-white" />} bg="bg-orange-500" sub={`${trackingClicks} clics`} />
          <StatCard label="Taux reponse" value={`${replyRate.toFixed(1)}%`} icon={<MessageSquare size={16} className="text-white" />} bg="bg-teal-500" sub={`${trackingReplies} reponses`} />
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-5">
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Emails recents</h2>
                <p className="text-xs text-gray-400 mt-0.5">Derniers emails envoyes depuis la plateforme</p>
              </div>
              <button onClick={() => navigate('/backoffice/inbox')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                Voir la boite <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
              {recentEmails.length === 0 ? (
                <div className="py-12 text-center">
                  <Mail size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Aucun email envoye</p>
                </div>
              ) : (
                recentEmails.map(e => {
                  const typeInfo = EMAIL_TYPE_LABELS[e.email_type];
                  return (
                    <div key={e.id} className="px-5 py-3 hover:bg-gray-50/80 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-gray-900 truncate">{e.to_name || e.to_email}</span>
                            {typeInfo && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${typeInfo.color}`}>
                                <typeInfo.icon size={9} />
                                {typeInfo.label}
                              </span>
                            )}
                            {e.status === 'sent' ? (
                              <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                            ) : e.status === 'failed' ? (
                              <XCircle size={12} className="text-red-500 flex-shrink-0" />
                            ) : (
                              <Clock size={12} className="text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{e.subject}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{e.to_email}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] text-gray-400 block">
                            {formatRelativeDate(e.sent_at || e.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {campaigns.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Campagnes newsletter</h2>
                <button onClick={() => navigate('/backoffice/newsletter')} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  Gerer <ArrowRight size={12} />
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {campaigns.map(c => (
                  <div key={c.id} className="px-5 py-3 hover:bg-gray-50/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-gray-500 truncate">{c.subject}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Repartition par type</h3>
            <div className="space-y-2.5">
              {emailTypes.length > 0 ? emailTypes.map(t => {
                const typeInfo = EMAIL_TYPE_LABELS[t.email_type];
                const pct = queueTotal > 0 ? (t.total / queueTotal) * 100 : 0;
                return (
                  <div key={t.email_type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {typeInfo?.label || t.email_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">{t.sent}/{t.total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <p className="text-xs text-gray-400">Pas de donnees de repartition</p>
              )}
            </div>
          </div>

          {trackingSends > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Performance tracking</h3>
              {[
                { label: 'Ouvertures', value: openRate, max: 50, color: 'bg-blue-500', bench: '25% standard' },
                { label: 'Clics', value: clickRate, max: 20, color: 'bg-orange-500', bench: '5% standard' },
                { label: 'Reponses', value: replyRate, max: 10, color: 'bg-emerald-500', bench: '2% standard' },
              ].map(m => (
                <div key={m.label} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{m.label}</span>
                    <span className="text-xs text-gray-500">{m.value.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${m.color}`} style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{m.bench}</div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Statut du systeme</h3>
            <div className="space-y-2">
              {[
                { label: 'Envoi SMTP IONOS', status: queueSent > 0 ? 'ok' : 'warn' },
                { label: `Emails envoyes: ${queueSent}`, status: 'ok' },
                { label: `Boite de reception: ${inboxTotal} messages`, status: 'ok' },
                { label: `Leads lies automatiquement: ${inboxLinkedLeads}`, status: inboxLinkedLeads > 0 ? 'ok' : 'warn' },
                { label: `Templates: ${activeTemplates} actif(s)`, status: activeTemplates > 0 ? 'ok' : 'warn' },
                { label: `Abonnes newsletter: ${activeSubscribers}`, status: activeSubscribers > 0 ? 'ok' : 'warn' },
                { label: `Tests A/B: ${activeTests} en cours`, status: activeTests > 0 ? 'ok' : 'info' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.status === 'ok' ? (
                    <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                  ) : item.status === 'warn' ? (
                    <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
                  ) : (
                    <Clock size={13} className="text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Modules</h3>
            <div className="space-y-2">
              {[
                { label: 'Campagnes & Newsletter', path: '/backoffice/newsletter', icon: Send, stat: `${activeSubscribers} abonnes`, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Templates IA', path: '/backoffice/smart-templates', icon: Sparkles, stat: `${activeTemplates} actifs`, color: 'text-blue-600 bg-blue-50' },
                { label: 'Tests A/B', path: '/backoffice/ab-testing', icon: Beaker, stat: `${activeTests} en cours`, color: 'text-orange-600 bg-orange-50' },
                { label: 'Analytics avance', path: '/backoffice/email-analytics', icon: BarChart3, stat: 'Performance', color: 'text-gray-700 bg-gray-100' },
                { label: 'Boite de reception', path: '/backoffice/inbox', icon: Inbox, stat: `${inboxUnread} non lus`, color: 'text-blue-600 bg-blue-50' },
              ].map(m => (
                <button
                  key={m.path + m.label}
                  onClick={() => navigate(m.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.color}`}>
                    <m.icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{m.label}</div>
                    <div className="text-[10px] text-gray-400">{m.stat}</div>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, bg }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function MiniCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
        <Icon size={15} className={color} />
      </div>
      <div>
        <div className="text-lg font-bold text-gray-900">{value.toLocaleString('fr-FR')}</div>
        <div className="text-[10px] text-gray-500 leading-tight">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    sent: { label: 'Envoyee', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    sending: { label: 'En cours', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    draft: { label: 'Brouillon', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    scheduled: { label: 'Planifiee', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${cls}`}>{label}</span>;
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 60) return `il y a ${diffMin}min`;
  if (diffH < 24) return `il y a ${diffH}h`;
  if (diffD < 7) return `il y a ${diffD}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
