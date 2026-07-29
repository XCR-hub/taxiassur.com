import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Ban,
  CheckCircle,
  Loader2,
  Mail,
  Megaphone,
  MessageSquare,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import {
  ClientConsentKey,
  ClientConsentState,
  DEFAULT_CLIENT_CONSENTS,
  loadClientConsentState,
  revokeAllClientMarketingConsents,
  saveClientConsentState,
} from '@/lib/client-consent';

const CONSENT_OPTIONS: Array<{
  key: ClientConsentKey;
  title: string;
  description: string;
  icon: typeof Mail;
}> = [
  {
    key: 'marketing_email',
    title: 'Emails commerciaux TaxiAssur',
    description: 'Recevoir nos offres, conseils et relances commerciales par email.',
    icon: Mail,
  },
  {
    key: 'marketing_sms',
    title: 'SMS commerciaux TaxiAssur',
    description: 'Recevoir des offres ou rappels commerciaux par SMS.',
    icon: MessageSquare,
  },
  {
    key: 'marketing_phone',
    title: 'Appels commerciaux TaxiAssur',
    description: 'Etre rappele pour des offres en lien avec votre activite professionnelle.',
    icon: Phone,
  },
  {
    key: 'partner_cross_sell',
    title: 'Offres partenaires et autres sites',
    description: 'Recevoir des propositions ciblees uniquement pour les marques et partenaires declares par TaxiAssur.',
    icon: Megaphone,
  },
  {
    key: 'behavioral_personalization',
    title: 'Personnalisation selon votre navigation',
    description: 'Autoriser TaxiAssur a utiliser vos actions dans l application pour personnaliser les contenus et offres.',
    icon: Activity,
  },
];

export default function ClientConfidentialite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  const [consents, setConsents] = useState<ClientConsentState>(DEFAULT_CLIENT_CONSENTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
      return;
    }

    sessionStorage.setItem('client_email', email);
    loadConsents();
  }, [email, navigate]);

  const loadConsents = async () => {
    setLoading(true);
    setError(null);

    try {
      const state = await loadClientConsentState(email);
      setConsents(state);
    } catch {
      setError('Impossible de charger vos preferences pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const updateConsent = (key: ClientConsentKey, value: boolean) => {
    setConsents((current) => ({ ...current, [key]: value }));
  };

  const saveConsents = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await saveClientConsentState(email, consents);
      setMessage('Preferences enregistrees. Votre choix est journalise et peut etre modifie a tout moment.');
    } catch {
      setError('Erreur pendant l enregistrement des preferences.');
    } finally {
      setSaving(false);
    }
  };

  const revokeAll = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await revokeAllClientMarketingConsents(email);
      setConsents({ ...DEFAULT_CLIENT_CONSENTS });
      setMessage('Toutes les prospections et personnalisations non essentielles ont ete revoquees.');
    } catch {
      setError('Erreur pendant la revocation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout email={email}>
        <SEOHead title="Confidentialite - Espace Client TaxiAssur" noIndex={true} />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout email={email}>
      <SEOHead title="Confidentialite - Espace Client TaxiAssur" noIndex={true} />

      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Confidentialite</h1>
          <p className="text-gray-600">
            Gere vos consentements commerciaux, partenaires et personnalisation.
          </p>
        </div>

        {message && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-lg bg-yellow-100 p-2 text-yellow-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Consentements explicites</h2>
              <p className="mt-1 text-sm text-gray-600">
                Les cases sont separees, non obligatoires et modifiables. La souscription et la gestion du contrat ne dependent pas de ces accords commerciaux.
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {CONSENT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const checked = consents[option.key];

              return (
                <label key={option.key} className="flex cursor-pointer items-start gap-4 py-4">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => updateConsent(option.key, event.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500" />
                  <span className="flex-1">
                    <span className="block font-semibold text-gray-900">{option.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-gray-600">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveConsents}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-3 font-semibold text-white transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Enregistrer
            </button>

            <button
              type="button"
              onClick={revokeAll}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-5 py-3 font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Ban className="h-4 w-4" />
              Tout revoquer
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Demande manuelle</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Vous pouvez aussi demander l acces, la modification, l opposition ou la suppression de vos donnees a team@taxiassur.com. Les demandes sont traitees par l equipe TaxiAssur.
          </p>
        </section>
      </div>
    </ClientLayout>
  );
}
