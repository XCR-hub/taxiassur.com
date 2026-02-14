import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Trash2,
  AlertTriangle,
  Users,
  Mail,
  Calendar,
  Shield,
  GitMerge,
  FileText,
  MessageSquare,
  PhoneCall
} from 'lucide-react';

interface DuplicateLead {
  email: string;
  count: number;
  lead_ids: string[];
  first_created: string;
  last_created: string;
}

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  source: string;
  created_at: string;
  metadata: any;
  _counts?: {
    interactions: number;
    documents: number;
    emails: number;
    quotes: number;
  };
}

export default function DuplicateLeadsManager() {
  const [duplicates, setDuplicates] = useState<DuplicateLead[]>([]);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [leadsDetails, setLeadsDetails] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    checkMasterAdmin();
    loadDuplicates();
  }, []);

  async function checkMasterAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setIsMasterAdmin(false);
        return;
      }

      const { data } = await supabase
        .from('admin_users')
        .select('role')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      setIsMasterAdmin(data?.role === 'master');
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsMasterAdmin(false);
    }
  }

  async function loadDuplicates() {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('find_duplicate_leads');

      if (error) throw error;

      setDuplicates(data || []);
    } catch (error) {
      console.error('Error loading duplicates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeadDetails(email: string, leadIds: string[]) {
    if (leadsDetails[email]) {
      setExpandedEmail(expandedEmail === email ? null : email);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .in('id', leadIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Charger les compteurs pour chaque lead
      const leadsWithCounts = await Promise.all((data || []).map(async (lead) => {
        const [interactionsCount, documentsCount, emailsCount, quotesCount] = await Promise.all([
          supabase.from('crm_interactions').select('*', { count: 'exact', head: true }).eq('lead_id', lead.id),
          supabase.from('crm_lead_documents').select('*', { count: 'exact', head: true }).eq('lead_id', lead.id),
          supabase.from('email_messages').select('*', { count: 'exact', head: true }).eq('lead_id', lead.id),
          supabase.from('lead_company_quotes').select('*', { count: 'exact', head: true }).eq('lead_id', lead.id)
        ]);

        return {
          ...lead,
          _counts: {
            interactions: interactionsCount.count || 0,
            documents: documentsCount.count || 0,
            emails: emailsCount.count || 0,
            quotes: quotesCount.count || 0
          }
        };
      }));

      setLeadsDetails(prev => ({ ...prev, [email]: leadsWithCounts }));
      setExpandedEmail(email);
    } catch (error) {
      console.error('Error loading lead details:', error);
    }
  }

  async function handleDeleteLead(leadId: string, email: string) {
    if (!isMasterAdmin) {
      alert('Seul le master admin peut supprimer des leads');
      return;
    }

    const confirmed = window.confirm(
      '⚠️ ATTENTION : Supprimer définitivement ce lead ?\n\n' +
      'Cette action est irréversible et sera tracée dans les logs.\n' +
      'Le lead sera marqué comme supprimé mais restera en base pour audit.\n\n' +
      'Confirmer la suppression ?'
    );

    if (!confirmed) return;

    try {
      setDeletingId(leadId);

      const { data, error } = await supabase.rpc('soft_delete_lead', {
        p_lead_id: leadId
      });

      if (error) throw error;

      if (data?.success) {
        alert('✅ Lead supprimé avec succès');

        setLeadsDetails(prev => ({
          ...prev,
          [email]: prev[email]?.filter(lead => lead.id !== leadId) || []
        }));

        await loadDuplicates();
      } else {
        throw new Error(data?.error || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      alert('❌ Erreur : ' + (error.message || 'Impossible de supprimer le lead'));
    } finally {
      setDeletingId(null);
    }
  }

  async function executeMerge(email: string) {
    const confirmed = window.confirm(
      `🔀 FUSION AUTOMATIQUE DE TOUS LES DOUBLONS\n\n` +
      `Email : ${email}\n\n` +
      `Cette action va fusionner automatiquement tous les leads avec cet email.\n\n` +
      `Le système va :\n` +
      `✓ Garder le lead avec le plus d'informations remplies\n` +
      `✓ Transférer tous les emails, documents, interactions et devis\n` +
      `✓ Archiver les doublons\n` +
      `✓ Créer un historique de fusion complet\n\n` +
      `Confirmer la fusion ?`
    );

    if (!confirmed) return;

    try {
      setMerging(true);

      const { data, error } = await supabase.rpc('merge_all_duplicates_for_email', {
        p_email: email
      });

      if (error) throw error;

      if (data?.success) {
        alert(
          `✅ Fusion réussie !\n\n` +
          `${data.leads_merged} lead(s) fusionné(s)\n` +
          `${data.total_interactions} interaction(s) transférée(s)\n` +
          `${data.total_documents} document(s) transféré(s)`
        );

        // Rafraîchir la liste
        await loadDuplicates();
        setExpandedEmail(null);
        delete leadsDetails[email];
      } else {
        throw new Error(data?.message || 'Erreur lors de la fusion');
      }
    } catch (error: any) {
      console.error('Error merging leads:', error);
      alert('❌ Erreur : ' + (error.message || 'Impossible de fusionner les leads'));
    } finally {
      setMerging(false);
    }
  }

  async function autoMergeAll() {
    if (!confirm(
      `⚠️ FUSION GLOBALE DE TOUS LES DOUBLONS\n\n` +
      `Cette action va automatiquement fusionner TOUS les leads en doublon.\n\n` +
      `Nombre d'emails concernés : ${duplicates.length}\n` +
      `Total de leads dupliqués : ${totalDuplicates}\n\n` +
      `Cette opération peut prendre plusieurs secondes.\n\n` +
      `Confirmer la fusion globale ?`
    )) {
      return;
    }

    try {
      setMerging(true);

      const { data, error } = await supabase.rpc('auto_merge_all_duplicates');

      if (error) throw error;

      if (data?.success) {
        alert(
          `✅ Fusion globale terminée !\n\n` +
          `${data.emails_processed} email(s) traité(s)\n` +
          `${data.total_leads_merged} lead(s) fusionné(s)\n\n` +
          `Tous les doublons ont été fusionnés avec succès.`
        );

        // Rafraîchir la liste
        await loadDuplicates();
        setExpandedEmail(null);
      } else {
        throw new Error(data?.message || 'Erreur lors de la fusion globale');
      }
    } catch (error: any) {
      console.error('Error auto-merging all:', error);
      alert('❌ Erreur : ' + (error.message || 'Impossible de fusionner automatiquement'));
    } finally {
      setMerging(false);
    }
  }

  const totalDuplicates = duplicates.reduce((acc, dup) => acc + dup.count, 0);

  if (!isMasterAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">
            Accès Refusé
          </h2>
          <p className="text-red-600">
            Cette fonctionnalité est réservée au Master Admin uniquement.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des doublons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestion des Doublons
              </h1>
              <p className="text-gray-600">
                Identifiez et gérez les leads en doublon. Suppression réservée au Master Admin.
              </p>
            </div>
          </div>
          {duplicates.length > 0 && (
            <button
              onClick={autoMergeAll}
              disabled={merging}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg"
            >
              {merging ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Fusion en cours...
                </>
              ) : (
                <>
                  <GitMerge className="w-5 h-5" />
                  Fusionner Tous les Doublons
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Emails en doublon</p>
              <p className="text-3xl font-bold text-orange-600">{duplicates.length}</p>
            </div>
            <Mail className="w-12 h-12 text-orange-200" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total leads dupliqués</p>
              <p className="text-3xl font-bold text-red-600">{totalDuplicates}</p>
            </div>
            <Users className="w-12 h-12 text-red-200" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Statut</p>
              <p className="text-sm font-semibold text-green-600">Doublons autorisés</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-green-200" />
          </div>
        </div>
      </div>

      {duplicates.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-green-800 mb-2">
            Aucun doublon détecté !
          </h3>
          <p className="text-green-600">
            Tous les emails sont uniques dans votre base de données.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.map((duplicate) => (
            <div key={duplicate.email} className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => loadLeadDetails(duplicate.email, duplicate.lead_ids)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 text-orange-600 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    {duplicate.count}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{duplicate.email}</p>
                    <p className="text-sm text-gray-500">
                      {duplicate.count} leads avec cet email
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Premier: {new Date(duplicate.first_created).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Dernier: {new Date(duplicate.last_created).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {expandedEmail === duplicate.email ? '▲' : '▼'}
                  </div>
                </div>
              </button>

              {expandedEmail === duplicate.email && leadsDetails[duplicate.email] && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  {/* Barre d'actions fusion */}
                  <div className="mb-6 flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <GitMerge className="w-6 h-6 text-gray-400" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Fusionner les doublons</h4>
                        <p className="text-sm text-gray-600">
                          Fusion automatique intelligente - garde le lead le plus complet
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => executeMerge(duplicate.email)}
                      disabled={merging}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {merging ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Fusion...
                        </>
                      ) : (
                        <>
                          <GitMerge className="w-4 h-4" />
                          Fusionner maintenant
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {leadsDetails[duplicate.email].map((lead, index) => {
                      return (
                      <div
                        key={lead.id}
                        className="bg-white rounded-lg border-2 border-gray-200 p-4 transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded">
                                Lead #{index + 1}
                              </span>
                              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                lead.status === 'NEW_LEAD' ? 'bg-orange-100 text-orange-700' :
                                lead.status === 'ACTIVE_CLIENT' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {lead.status}
                              </span>
                            </div>

                            {/* Compteurs d'activité */}
                            {lead._counts && (
                              <div className="grid grid-cols-4 gap-3 mb-4">
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <MessageSquare className="w-3 h-3 text-purple-600" />
                                    <span className="text-xs text-purple-600 font-medium">Interactions</span>
                                  </div>
                                  <p className="text-lg font-bold text-purple-700">{lead._counts.interactions}</p>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <FileText className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-green-600 font-medium">Documents</span>
                                  </div>
                                  <p className="text-lg font-bold text-green-700">{lead._counts.documents}</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <Mail className="w-3 h-3 text-blue-600" />
                                    <span className="text-xs text-blue-600 font-medium">Emails</span>
                                  </div>
                                  <p className="text-lg font-bold text-blue-700">{lead._counts.emails}</p>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <PhoneCall className="w-3 h-3 text-orange-600" />
                                    <span className="text-xs text-orange-600 font-medium">Devis</span>
                                  </div>
                                  <p className="text-lg font-bold text-orange-700">{lead._counts.quotes}</p>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Nom complet</p>
                                <p className="font-semibold">{lead.full_name || 'Non renseigné'}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Téléphone</p>
                                <p className="font-semibold">{lead.phone || 'Non renseigné'}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Ville</p>
                                <p className="font-semibold">{lead.city || 'Non renseignée'}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Source</p>
                                <p className="font-semibold">{lead.source || 'Inconnue'}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Créé le</p>
                                <p className="font-semibold">
                                  {new Date(lead.created_at).toLocaleString('fr-FR')}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">ID</p>
                                <p className="font-mono text-xs">{lead.id.substring(0, 8)}...</p>
                              </div>
                            </div>

                            {lead.metadata?.submission_count && (
                              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-2">
                                <p className="text-xs text-yellow-800">
                                  ⚠️ Ce prospect a soumis le formulaire {lead.metadata.submission_count} fois
                                </p>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteLead(lead.id, duplicate.email)}
                            disabled={deletingId === lead.id}
                            className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                          >
                            {deletingId === lead.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Suppression...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Informations Importantes
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✅ Les doublons sont maintenant <strong>autorisés</strong> pour ne pas bloquer les demandes de devis</li>
          <li>🔒 Seul le <strong>Master Admin</strong> peut supprimer des leads</li>
          <li>📝 Toutes les suppressions sont <strong>tracées</strong> dans les logs d'audit</li>
          <li>💾 Les leads supprimés restent en base avec <code>deleted_at</code> pour historique</li>
          <li>🔍 Utilisez cette interface pour nettoyer les vrais doublons après vérification</li>
        </ul>
      </div>
    </div>
  );
}
