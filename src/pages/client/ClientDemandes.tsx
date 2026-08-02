import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Car,
  CheckCircle,
  Clock3,
  CreditCard,
  FilePenLine,
  FileText,
  Gift,
  Loader2,
  MessageSquare,
  RefreshCw,
  Repeat2,
  Send,
  ShieldCheck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { useTurnstileGuard } from '@/hooks/useTurnstileGuard';
import {
  CLIENT_REQUEST_TYPE_LABELS,
  createClientPortalRequest,
  loadClientPortalRequests,
  type ClientPortalRequest,
  type ClientPortalRequestPriority,
  type ClientPortalRequestType,
} from '@/lib/client-requests';
import {
  loadClientConsentState,
  recordClientConsent,
} from '@/lib/client-consent';

interface RequestOption {
  type: ClientPortalRequestType;
  title: string;
  description: string;
  icon: LucideIcon;
  priority: ClientPortalRequestPriority;
  placeholder: string;
}

const REQUEST_OPTIONS: RequestOption[] = [
  {
    type: 'support_message',
    title: 'Ecrire au courtier',
    description: 'Question, chat differe, demande de rappel ou information generale.',
    icon: MessageSquare,
    priority: 'normal',
    placeholder: 'Expliquez votre demande ou le meilleur moment pour vous rappeler.',
  },
  {
    type: 'endorsement_request',
    title: 'Demander un avenant',
    description: 'Modification contractuelle a faire valider par TaxiAssur et l assureur.',
    icon: FilePenLine,
    priority: 'high',
    placeholder: 'Decrivez la modification souhaitee et la date d effet demandee.',
  },
  {
    type: 'vehicle_change',
    title: 'Changer un vehicule',
    description: 'Ajout, remplacement ou retrait d un taxi assure.',
    icon: Car,
    priority: 'high',
    placeholder: 'Immatriculation, marque, modele, date d effet et motif du changement.',
  },
  {
    type: 'fleet_change',
    title: 'Gerer mon parc',
    description: 'Suivi flotte, ajout de vehicules, chauffeurs ou garanties.',
    icon: Users,
    priority: 'high',
    placeholder: 'Nombre de vehicules, changements prevus et echeance souhaitee.',
  },
  {
    type: 'renewal_request',
    title: 'Renouvellement',
    description: 'Anticiper la prochaine echeance et relancer la comparaison assureurs.',
    icon: Repeat2,
    priority: 'normal',
    placeholder: 'Date de renouvellement, objectif de tarif ou garantie a revoir.',
  },
  {
    type: 'premium_question',
    title: 'Prime ou paiement',
    description: 'Question sur prime, appel de cotisation, paiement ou justificatif.',
    icon: CreditCard,
    priority: 'normal',
    placeholder: 'Reference du paiement, montant concerne ou question sur votre prime.',
  },
  {
    type: 'certificate_request',
    title: 'Attestation',
    description: 'Demander une attestation, quittance, facture ou document assureur.',
    icon: FileText,
    priority: 'normal',
    placeholder: 'Document souhaite, periode concernee et urgence eventuelle.',
  },
  {
    type: 'coverage_change',
    title: 'Garanties',
    description: 'Adapter les garanties, franchises, assistance ou options.',
    icon: ShieldCheck,
    priority: 'normal',
    placeholder: 'Garantie a ajouter, retirer ou comparer.',
  },
  {
    type: 'partner_offer_question',
    title: 'Offre partenaire',
    description: 'Recevoir une proposition cross-sell seulement si vous l avez acceptee.',
    icon: Gift,
    priority: 'low',
    placeholder: 'Theme recherche: prevoyance, sante, flotte, patrimoine, local pro...',
  },
];

const STATUS_META: Record<ClientPortalRequest['status'], { label: string; className: string; icon: LucideIcon }> = {
  pending: {
    label: 'Recu',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock3,
  },
  in_progress: {
    label: 'En cours',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Wrench,
  },
  completed: {
    label: 'Traite',
    className: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Refuse',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Annule',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: AlertCircle,
  },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: ClientPortalRequest['status'] }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export default function ClientDemandes() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  const [requests, setRequests] = useState<ClientPortalRequest[]>([]);
  const [activeType, setActiveType] = useState<ClientPortalRequestType>('support_message');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partnerCrossSellConsent, setPartnerCrossSellConsent] = useState(false);
  const [behavioralPersonalizationConsent, setBehavioralPersonalizationConsent] = useState(false);
  const [consentTouched, setConsentTouched] = useState({
    partner_cross_sell: false,
    behavioral_personalization: false,
  });
  const turnstile = useTurnstileGuard({ action: 'client_portal_request', className: 'flex justify-center sm:justify-start' });

  const selectedOption = useMemo(
    () => REQUEST_OPTIONS.find((option) => option.type === activeType) || REQUEST_OPTIONS[0],
    [activeType]
  );
  const SelectedIcon = selectedOption.icon;

  const loadConsentState = useCallback(async () => {
    try {
      const consents = await loadClientConsentState(email);
      setPartnerCrossSellConsent(consents.partner_cross_sell);
      setBehavioralPersonalizationConsent(consents.behavioral_personalization);
    } catch {
      setPartnerCrossSellConsent(false);
      setBehavioralPersonalizationConsent(false);
    }
  }, [email]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await loadClientPortalRequests(email);
      setRequests(rows);
    } catch {
      setError('Impossible de charger vos demandes pour le moment.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
      return;
    }

    sessionStorage.setItem('client_email', email);
    loadRequests();
    loadConsentState();
  }, [email, navigate, loadConsentState, loadRequests]);

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError('Titre et message sont requis.');
      return;
    }

    if (activeType === 'partner_offer_question' && !partnerCrossSellConsent) {
      setError('Les offres partenaires exigent un consentement cross-sell explicite.');
      return;
    }

    if (!turnstile.canSubmit) {
      setError('Validation anti-spam requise.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const turnstileValid = await turnstile.verify();
      if (!turnstileValid) {
        setError('Validation anti-spam refusee. Veuillez reessayer.');
        setSaving(false);
        return;
      }

      const consentProof = {
        wording_version: 'client_requests_2026_08',
        explicit_action: 'checkbox_submit',
        no_hidden_contact_import: true,
        no_mailbox_scraping: true,
        no_external_browser_history: true,
      };
      const consentWrites: Promise<void>[] = [];

      if (consentTouched.partner_cross_sell) {
        consentWrites.push(recordClientConsent(
          email,
          'partner_cross_sell',
          partnerCrossSellConsent,
          'client_portal_request',
          consentProof
        ));
      }

      if (consentTouched.behavioral_personalization) {
        consentWrites.push(recordClientConsent(
          email,
          'behavioral_personalization',
          behavioralPersonalizationConsent,
          'client_portal_request',
          consentProof
        ));
      }

      if (consentWrites.length > 0) {
        await Promise.all(consentWrites);
      }

      await createClientPortalRequest({
        email,
        requestType: activeType,
        title,
        description,
        priority: selectedOption.priority,
        newData: {
          effective_date: effectiveDate || null,
          request_channel: 'client_portal',
          client_visible_label: selectedOption.title,
        },
      });

      setTitle('');
      setDescription('');
      setEffectiveDate('');
      setMessage('Demande envoyee. Elle est visible dans le suivi et traitee par TaxiAssur.');
      setConsentTouched({ partner_cross_sell: false, behavioral_personalization: false });
      turnstile.reset();
      await loadRequests();
    } catch {
      setError('Demande non envoyee. Reessayez ou contactez-nous par telephone.');
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = requests.filter((request) => request.status === 'pending' || request.status === 'in_progress').length;

  return (
    <ClientLayout email={email}>
      <SEOHead title="Mes Demandes - Espace Client TaxiAssur" noIndex={true} />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes Demandes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Contrat, avenants, parc, renouvellement, documents, paiements et messages.
            </p>
          </div>
          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{requests.length}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">A traiter</div>
            <div className="mt-1 text-2xl font-bold text-amber-900">{pendingCount}</div>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-green-700">Traitees</div>
            <div className="mt-1 text-2xl font-bold text-green-900">
              {requests.filter((request) => request.status === 'completed').length}
            </div>
          </div>
        </div>

        {message && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-lg bg-yellow-100 p-2 text-yellow-700">
              <SelectedIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nouvelle demande</h2>
              <p className="mt-1 text-sm text-gray-500">
                Chaque demande cree une trace CRM et conserve l etat de vos consentements au moment de l envoi.
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-2 sm:grid-cols-3">
            {REQUEST_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = activeType === option.type;

              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setActiveType(option.type)}
                  className={`flex min-h-[76px] items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                    active
                      ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${active ? 'text-yellow-700' : 'text-gray-400'}`} />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">{option.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-gray-500">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={submitRequest} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Titre</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={selectedOption.title}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Date effet</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Message</label>
              <textarea
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={selectedOption.placeholder}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="grid gap-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={partnerCrossSellConsent}
                    onChange={(event) => {
                      setPartnerCrossSellConsent(event.target.checked);
                      setConsentTouched((current) => ({ ...current, partner_cross_sell: true }));
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span>
                    J accepte les offres partenaires TaxiAssur liees a mon contrat et a mes demandes explicites
                    dans l application (partner_cross_sell).
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={behavioralPersonalizationConsent}
                    onChange={(event) => {
                      setBehavioralPersonalizationConsent(event.target.checked);
                      setConsentTouched((current) => ({ ...current, behavioral_personalization: true }));
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span>
                    J accepte une personnalisation limitee aux actions effectuees dans l application TaxiAssur
                    (behavioral_personalization).
                  </span>
                </label>
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500">
                Ces choix sont facultatifs, stockes dans votre fiche client et revocables depuis Confidentialite.
                Aucun import de contacts telephone, de boite mail ou d historique de navigation externe n est realise.
              </p>
            </div>

            {turnstile.widget && <div className="pt-1">{turnstile.widget}</div>}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                <span>Les offres partenaires ne sont traitees que si le consentement cross-sell est actif.</span>
              </div>
              <button
                type="submit"
                disabled={saving || !turnstile.canSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <Clock3 className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-bold text-gray-900">Suivi</h2>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-yellow-600" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquare className="mx-auto mb-3 h-9 w-9 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">Aucune demande client pour le moment.</p>
              <p className="mt-1 text-xs text-gray-400">Vos messages et avenants apparaitront ici.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((request) => (
                <div key={request.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                          {CLIENT_REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                        </span>
                        <StatusBadge status={request.status} />
                        {request.priority === 'urgent' || request.priority === 'high' ? (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                            Priorite {request.priority === 'urgent' ? 'urgente' : 'haute'}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="truncate text-sm font-bold text-gray-900">{request.title}</h3>
                      {request.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">{request.description}</p>
                      )}
                      {request.response && (
                        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                          {request.response}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{formatDate(request.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ClientLayout>
  );
}
