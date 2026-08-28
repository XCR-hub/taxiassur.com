import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  Mail,
  Send,
  Users,
} from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { normalizeEmail } from '@/lib/client-consent';
import { getClientAccessToken } from '@/lib/client-access';
import { referralSystem } from '@/lib/referral-system';
import { createClientPlatformReferral, loadClientPlatformSession } from '@/lib/client-platform-api';

interface ReferralRow {
  id: string;
  referred_email: string;
  status: 'pending' | 'completed' | 'cancelled';
  reward_amount: number;
  reward_type: string;
  created_at: string;
  completed_at?: string | null;
}

export default function ClientParrainage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accessToken = getClientAccessToken(searchParams.get('token'));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [referredEmail, setReferredEmail] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  const referralLink = useMemo(() => {
    if (!referralCode) return '';
    return referralSystem.getReferralLink(referralCode);
  }, [referralCode]);

  useEffect(() => {
    if (!accessToken) {
      navigate('/espace-client');
      return;
    }

    loadReferralData();
  }, [accessToken, navigate]);

  const loadReferralData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadClientPlatformSession(accessToken);
      setReferralCode(String(data.referral_code || ''));
      setReferrals((data.referrals || []) as ReferralRow[]);
    } catch {
      setError('Impossible de charger votre parrainage pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setMessage('Lien de parrainage copie.');
  };

  const submitReferral = async () => {
    const normalizedReferredEmail = normalizeEmail(referredEmail);

    if (!normalizedReferredEmail || !normalizedReferredEmail.includes('@')) {
      setError('Adresse email filleul invalide.');
      return;
    }

    if (!hasPermission) {
      setError('Vous devez confirmer que le filleul accepte de recevoir cette invitation.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await createClientPlatformReferral(accessToken, normalizedReferredEmail, hasPermission);

      setMessage('Parrainage enregistre. Le filleul sera traite uniquement dans ce cadre.');
      setReferredEmail('');
      setHasPermission(false);
      await loadReferralData();
    } catch {
      setError('Parrainage impossible. Il existe peut-etre deja une invitation pour cet email.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout email=''>
        <SEOHead title="Parrainage - Espace Client TaxiAssur" noIndex={true} />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout email=''>
      <SEOHead title="Parrainage - Espace Client TaxiAssur" noIndex={true} />

      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Parrainage</h1>
          <p className="text-gray-600">
            Recommandez TaxiAssur a un chauffeur qui a accepte de recevoir votre invitation.
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
          <div className="grid gap-6 md:grid-cols-[1fr_220px]">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-yellow-100 p-2 text-yellow-700">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Avantage client et filleul</h2>
                  <p className="text-sm text-gray-600">
                    Apres contrat actif du filleul : avantage plafonne a 25 EUR, sous forme de revue pro, kit utile chauffeur ou credit commercial equivalent.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Votre lien</div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    readOnly
                    value={referralLink}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900"
                  >
                    <Copy className="h-4 w-4" />
                    Copier
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-yellow-800">Code</div>
              <div className="mt-2 text-3xl font-black tracking-wider text-gray-900">{referralCode}</div>
              <a
                href={referralLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-black"
              >
                Ouvrir <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Users className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">Inviter un filleul</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Email du filleul</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={referredEmail}
                  onChange={(event) => setReferredEmail(event.target.value)}
                  placeholder="chauffeur@example.com"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={submitReferral}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 self-end rounded-lg bg-yellow-500 px-5 py-3 font-bold text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </button>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={hasPermission}
              onChange={(event) => setHasPermission(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
            />
            <span>
              Je confirme que le filleul m a donne son accord pour recevoir cette invitation TaxiAssur.
            </span>
          </label>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Suivi</h2>

          {referrals.length === 0 ? (
            <p className="text-sm text-gray-600">Aucun parrainage enregistre.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Filleul</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Avantage</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {referrals.map((referral) => (
                    <tr key={referral.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{referral.referred_email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {referral.status === 'completed' ? 'Valide' : referral.status === 'cancelled' ? 'Annule' : 'En attente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{Number(referral.reward_amount || 0)} EUR max</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(referral.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ClientLayout>
  );
}
