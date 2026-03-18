import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Shield, CreditCard, Bell, TrendingUp, Calendar, CheckCircle, Clock, AlertCircle, ChevronRight, Package, Phone, Mail } from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface UserData {
  success: boolean;
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
  is_active: boolean;
  created_at: string;
  lead_id?: string;
  access_token?: string;
  pipeline_stage?: string;
  workflow_stage?: string;
  lead_status?: string;
  lead_created_at?: string;
  doc_count: number;
  quote_count: number;
  notification_count: number;
}

interface RecentActivity {
  id: string;
  label: string;
  date: string;
  type: 'document' | 'quote' | 'notification' | 'payment';
}

const PIPELINE_LABELS: Record<string, { label: string; color: string; progress: number }> = {
  nouveau_lead:        { label: 'Nouveau dossier',          color: 'text-gray-500',  progress: 10 },
  collecte_documents:  { label: 'Collecte des documents',   color: 'text-yellow-600', progress: 25 },
  devis_en_cours:      { label: 'Devis en cours',           color: 'text-yellow-600', progress: 45 },
  devis_envoye:        { label: 'Devis envoyés',            color: 'text-yellow-500', progress: 60 },
  validation_devis:    { label: 'En attente de validation', color: 'text-yellow-500', progress: 70 },
  signature_contrat:   { label: 'Signature du contrat',     color: 'text-green-600',  progress: 85 },
  contrat_signe:       { label: 'Contrat signé',            color: 'text-green-600',  progress: 95 },
  client_actif:        { label: 'Client actif',             color: 'text-green-600',  progress: 100 },
};

export default function ClientDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  const [userData, setUserData] = useState<UserData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [sinistresCount, setSinistresCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
      return;
    }
    sessionStorage.setItem('client_email', email);
    loadUserData();
  }, [email, navigate]);

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_client_portal_data_by_email', { p_email: email.toLowerCase().trim() });

      if (error) throw error;

      if (data?.success) {
        setUserData(data as UserData);
        if (data.lead_id) {
          loadRecentActivity(data.lead_id);
          loadSinistresCount(data.lead_id);
        }
      }
    } catch (error) {
      logger.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSinistresCount = async (_leadId: string) => {
    try {
      const { data } = await supabase
        .rpc('get_client_claims_by_email', { p_email: email.toLowerCase().trim() });
      if (data?.success) {
        const active = (data.claims || []).filter((c: any) => c.claim_status !== 'closed' && c.claim_status !== 'rejected');
        setSinistresCount(active.length);
      }
    } catch {
    }
  };

  const loadRecentActivity = async (leadId: string) => {
    try {
      const [docsRes, quotesRes, notifsRes] = await Promise.all([
        supabase
          .from('prospect_documents')
          .select('id, file_name, uploaded_at, status')
          .eq('lead_id', leadId)
          .order('uploaded_at', { ascending: false })
          .limit(3),
        supabase
          .from('lead_company_quotes')
          .select('id, created_at, status')
          .eq('lead_id', leadId)
          .not('quote_file_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(2),
        supabase
          .from('crm_event_notifications')
          .select('id, title, created_at')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(2),
      ]);

      const activities: RecentActivity[] = [];

      (docsRes.data || []).forEach((doc: any) => {
        activities.push({
          id: doc.id,
          label: doc.status === 'verified'
            ? `Document vérifié : ${doc.file_name}`
            : `Document reçu : ${doc.file_name}`,
          date: doc.uploaded_at,
          type: 'document',
        });
      });

      (quotesRes.data || []).forEach((q: any) => {
        activities.push({
          id: q.id,
          label: q.status === 'validated' ? 'Devis validé' : 'Nouveau devis disponible',
          date: q.created_at,
          type: 'quote',
        });
      });

      (notifsRes.data || []).forEach((n: any) => {
        activities.push({
          id: n.id,
          label: n.title || 'Nouvelle notification',
          date: n.created_at,
          type: 'notification',
        });
      });

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 5));
    } catch (err) {
      logger.error('Error loading activity:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès Refusé</h2>
          <p className="text-gray-600 mb-6">Votre compte n'a pas été trouvé ou est inactif.</p>
          <a
            href="/espace-client"
            className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg font-bold hover:from-yellow-700 hover:to-yellow-600 transition-all"
          >
            Retour à la Connexion
          </a>
        </div>
      </div>
    );
  }

  const pipelineInfo = PIPELINE_LABELS[userData.pipeline_stage || userData.workflow_stage || ''] || null;

  const stats = [
    {
      icon: FileText,
      label: 'Documents',
      value: String(userData.doc_count),
      sublabel: userData.doc_count === 0 ? 'Aucun document' : userData.doc_count === 1 ? 'Document reçu' : 'Documents reçus',
      color: 'bg-yellow-100 text-yellow-600',
      link: `/client/documents${emailParam}`
    },
    {
      icon: Package,
      label: 'Devis',
      value: String(userData.quote_count),
      sublabel: userData.quote_count === 0 ? 'En attente' : userData.quote_count === 1 ? 'Devis disponible' : 'Devis disponibles',
      color: userData.quote_count > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500',
      link: userData.access_token ? `/espace-prospect?token=${userData.access_token}` : '/espace-prospect'
    },
    {
      icon: Shield,
      label: 'Sinistres',
      value: String(sinistresCount),
      sublabel: sinistresCount === 0 ? 'Aucun en cours' : 'En cours',
      color: sinistresCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600',
      link: `/client/sinistres${emailParam}`
    },
    {
      icon: Bell,
      label: 'Notifications',
      value: String(userData.notification_count),
      sublabel: userData.notification_count === 0 ? 'Aucune' : 'Non lues',
      color: userData.notification_count > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500',
      link: `/client/notifications${emailParam}`
    }
  ];

  const activityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'document': return { Icon: FileText, color: 'text-yellow-600' };
      case 'quote':    return { Icon: Package,  color: 'text-green-600' };
      case 'notification': return { Icon: Bell, color: 'text-gray-500' };
      case 'payment':  return { Icon: CreditCard, color: 'text-green-600' };
      default:         return { Icon: Clock, color: 'text-gray-400' };
    }
  };

  return (
    <>
      <SEOHead
        title="Mon Espace Client - TaxiAssur"
        description="Gérez votre contrat d'assurance taxi en ligne"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Bonjour {userData.first_name || 'Client'}
            </h1>
            <p className="text-gray-500">
              Bienvenue dans votre espace personnel TaxiAssur
            </p>
          </div>

          {/* Pipeline progress banner */}
          {pipelineInfo && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Avancement de votre dossier</span>
                <span className={`text-sm font-bold ${pipelineInfo.color}`}>{pipelineInfo.label}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${pipelineInfo.progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                <span>Nouveau dossier</span>
                <span>{pipelineInfo.progress}%</span>
                <span>Client actif</span>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <a
                  key={index}
                  href={stat.link}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-yellow-400 group"
                >
                  <div className={`w-11 h-11 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon size={22} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</div>
                  <div className="text-sm font-medium text-gray-700">{stat.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{stat.sublabel}</div>
                </a>
              );
            })}
          </div>

          {/* Contract / Info card */}
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-6 text-black">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">Votre Dossier</h2>
                <p className="text-sm opacity-80 mb-4">Géré par TaxiAssur — Courtier ORIAS</p>
                <div className="space-y-2 text-sm">
                  {userData.company_name && (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={15} />
                      <span className="font-medium">{userData.company_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar size={15} />
                    <span>
                      Dossier ouvert le{' '}
                      {new Date(userData.lead_created_at || userData.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={15} />
                    <span>Statut : {pipelineInfo?.label || 'En cours de traitement'}</span>
                  </div>
                </div>
              </div>
              <Shield size={56} className="opacity-20 flex-shrink-0 hidden sm:block" />
            </div>

            {userData.access_token && userData.quote_count > 0 && (
              <a
                href={`/espace-prospect?token=${userData.access_token}`}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-black/20 hover:bg-black/30 text-black rounded-lg font-semibold text-sm transition-all"
              >
                Voir mes devis
                <ChevronRight size={16} />
              </a>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid sm:grid-cols-3 gap-4">
            <a
              href={`/client/documents${emailParam}`}
              className="bg-white rounded-xl p-5 border border-gray-100 hover:border-yellow-400 hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-200 transition-colors">
                <FileText size={22} className="text-yellow-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Mes Documents</div>
                <div className="text-xs text-gray-500">{userData.doc_count} fichier{userData.doc_count !== 1 ? 's' : ''}</div>
              </div>
              <ChevronRight size={16} className="text-gray-400 ml-auto" />
            </a>

            <a
              href={`/client/sinistres${emailParam}`}
              className="bg-white rounded-xl p-5 border border-gray-100 hover:border-red-300 hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
                <Shield size={22} className="text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Déclarer un Sinistre</div>
                <div className="text-xs text-gray-500">En 3 minutes</div>
              </div>
              <ChevronRight size={16} className="text-gray-400 ml-auto" />
            </a>

            <a
              href={`/client/paiements${emailParam}`}
              className="bg-white rounded-xl p-5 border border-gray-100 hover:border-green-300 hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                <CreditCard size={22} className="text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Paiements</div>
                <div className="text-xs text-gray-500">Factures et échéances</div>
              </div>
              <ChevronRight size={16} className="text-gray-400 ml-auto" />
            </a>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <Clock size={20} className="text-yellow-600" />
              <h2 className="text-lg font-bold text-gray-900">Activité Récente</h2>
            </div>
            <div className="p-5">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune activité récente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => {
                    const { Icon, color } = activityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                        <div className={`w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0`}>
                          <Icon size={16} className={color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 text-sm truncate">{activity.label}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(activity.date).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Help block */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 mb-1">Besoin d'aide ?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Notre équipe est disponible du lundi au vendredi de 9h à 18h.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="tel:0180855786"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all"
              >
                <Phone size={14} />
                01 80 85 57 86
              </a>
              <a
                href="mailto:team@taxiassur.com"
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-semibold text-sm transition-all"
              >
                <Mail size={14} />
                team@taxiassur.com
              </a>
            </div>
          </div>

        </div>
      </ClientLayout>
    </>
  );
}
