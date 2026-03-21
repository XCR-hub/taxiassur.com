import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, MousePointerClick, Eye, Reply, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { toast } from '@/lib/toast';

interface EmailStats {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
}

interface EmailSend {
  id: string;
  email_to: string;
  subject: string;
  status: string;
  sent_at: string;
  open_count: number;
  click_count: number;
  was_opened: boolean;
  was_clicked: boolean;
  last_opened_at?: string;
}

interface EmailReply {
  id: string;
  from_email: string;
  subject: string;
  body: string;
  sentiment: string;
  replied_at: string;
  is_processed: boolean;
  lead_name?: string;
}

export default function EmailTrackingDashboard() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [recentEmails, setRecentEmails] = useState<EmailSend[]>([]);
  const [recentReplies, setRecentReplies] = useState<EmailReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingReplies, setFetchingReplies] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const { data: emailSends, error: sendsError } = await supabase
        .from('email_sends')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (sendsError) throw sendsError;

      const { data: emailOpens, error: opensError } = await supabase
        .from('email_opens')
        .select('email_send_id');

      if (opensError) throw opensError;

      const { data: emailClicks, error: clicksError } = await supabase
        .from('email_clicks')
        .select('email_send_id');

      if (clicksError) throw clicksError;

      const { data: emailReplies, error: repliesError } = await supabase
        .from('email_replies')
        .select(`
          *,
          leads (name)
        `)
        .order('replied_at', { ascending: false })
        .limit(10);

      if (repliesError) throw repliesError;

      const totalSent = emailSends?.length || 0;
      const uniqueOpens = new Set(emailOpens?.map(o => o.email_send_id)).size;
      const uniqueClicks = new Set(emailClicks?.map(c => c.email_send_id)).size;
      const totalReplied = emailReplies?.length || 0;

      setStats({
        total_sent: totalSent,
        total_opened: uniqueOpens,
        total_clicked: uniqueClicks,
        total_replied: totalReplied,
        open_rate: totalSent > 0 ? (uniqueOpens / totalSent) * 100 : 0,
        click_rate: totalSent > 0 ? (uniqueClicks / totalSent) * 100 : 0,
        reply_rate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
      });

      const { data: statsView } = await supabase
        .from('email_stats')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

      setRecentEmails(statsView || []);
      setRecentReplies(emailReplies?.map(r => ({
        ...r,
        lead_name: (r as any).leads?.name
      })) || []);

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setLoading(false);
    }
  }

  async function fetchEmailReplies() {
    setFetchingReplies(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-email-replies', {
        method: 'POST'
      });

      if (error) throw error;

      toast.info(`${data.message}`);
      await loadData();
    } catch (error) {
      console.error('Erreur récupération réponses:', error);
      toast.error('Erreur lors de la récupération des réponses');
    } finally {
      setFetchingReplies(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Tracking d'Emails</h1>
        <button
          onClick={fetchEmailReplies}
          disabled={fetchingReplies}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {fetchingReplies ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Récupération...
            </>
          ) : (
            <>
              <Reply className="w-4 h-4" />
              Récupérer les réponses
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Emails envoyés</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.total_sent || 0}</p>
            </div>
            <Mail className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taux d'ouverture</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.open_rate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">{stats?.total_opened} ouvertures</p>
            </div>
            <Eye className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taux de clic</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.click_rate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">{stats?.total_clicked} clics</p>
            </div>
            <MousePointerClick className="w-10 h-10 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taux de réponse</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.reply_rate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">{stats?.total_replied} réponses</p>
            </div>
            <Reply className="w-10 h-10 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Emails récents
          </h2>
          <div className="space-y-3">
            {recentEmails.map((email) => (
              <div key={email.id} className="border-l-4 border-gray-300 pl-4 py-2 hover:border-blue-500 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{email.email_to}</p>
                    <p className="text-xs text-gray-600 line-clamp-1">{email.subject}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(email.sent_at).toLocaleString('fr-FR', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                      {email.was_opened && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {email.open_count}x
                        </span>
                      )}
                      {email.was_clicked && (
                        <span className="text-xs text-purple-600 flex items-center gap-1">
                          <MousePointerClick className="w-3 h-3" />
                          {email.click_count}x
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    email.status === 'replied' ? 'bg-orange-100 text-orange-800' :
                    email.status === 'clicked' ? 'bg-purple-100 text-purple-800' :
                    email.status === 'opened' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {email.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Reply className="w-6 h-6 text-orange-600" />
            Réponses reçues
          </h2>
          <div className="space-y-3">
            {recentReplies.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune réponse pour le moment</p>
            ) : (
              recentReplies.map((reply) => (
                <div key={reply.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{reply.from_email}</p>
                      {reply.lead_name && (
                        <p className="text-xs text-gray-500">{reply.lead_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        reply.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                        reply.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {reply.sentiment === 'positive' ? '😊' : reply.sentiment === 'negative' ? '😞' : '😐'}
                      </span>
                      {!reply.is_processed && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          À traiter
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{reply.subject}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{reply.body}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(reply.replied_at).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
