import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { nativeAdminCall } from '@/lib/native-admin-data';

type GoogleData = { latest_date: string | null; stale: boolean };
type SyncResult = { ok: boolean; queries_imported: number; pages_imported: number };
function errorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (code === 'google_not_configured') return 'La connexion Google doit être configurée dans les intégrations du backoffice.';
  if (code === 'google_gsc_access_denied') return 'Le compte Google configuré n’a pas accès à cette propriété Search Console. Vérifiez la propriété et ses autorisations.';
  if (code === 'native_session_required' || code === 'invalid_session') return 'Votre session a expiré. Reconnectez-vous au backoffice.';
  return 'Les données Google ne sont pas disponibles. Réessayez ou vérifiez la connexion Google dans les intégrations.';
}
export default function GoogleSearchStatus() {
  const [data, setData] = useState<{ pages: GoogleData; queries: GoogleData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pages, queries] = await Promise.all([
        nativeAdminCall<GoogleData>('/v1/admin/gsc?type=pages&days=30&limit=1'),
        nativeAdminCall<GoogleData>('/v1/admin/gsc?type=queries&days=30&limit=1'),
      ]);
      setData({ pages, queries });
      setError('');
    } catch (failure) { setData(null); setError(errorMessage(failure)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const sync = async () => {
    setSyncing(true); setError(''); setResult('');
    try {
      const response = await nativeAdminCall<SyncResult>('/v1/admin/gsc/sync', { method: 'POST', body: JSON.stringify({ days: 30 }), signal: AbortSignal.timeout(120_000) });
      if (!response.ok) throw new Error('google_sync_failed');
      setResult(`${response.pages_imported} pages et ${response.queries_imported} requêtes importées depuis Google.`);
      await load();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setSyncing(false); }
  };
  const stale = data && (data.pages.stale || data.queries.stale || !data.pages.latest_date || !data.queries.latest_date);
  return <section aria-label="Connexion Google Search Console" className="mb-6 rounded-xl border border-slate-600 bg-slate-900 p-5 text-white">
    <h2 className="text-lg font-bold">Google Search Console</h2>
    {loading ? <p className="mt-2 text-sm text-slate-300">Vérification des dernières données…</p> : data && <>
      <p className="mt-2 text-sm text-slate-300">Dernière date enregistrée : pages {data.pages.latest_date || 'aucune'} · requêtes {data.queries.latest_date || 'aucune'}.</p>
      <p className={`mt-2 text-sm ${stale ? 'text-amber-300' : 'text-green-300'}`}>{stale ? 'Les données sont anciennes ou absentes. Actualisez-les avant d’évaluer le classement et le trafic actuels.' : 'Les données enregistrées sont récentes.'}</p>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {result && <p role="status" className="mt-3 text-sm text-green-300">{result}</p>}
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <button type="button" disabled={loading || syncing} onClick={() => void sync()} className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-50">{syncing ? 'Synchronisation en cours…' : 'Actualiser depuis Google'}</button>
      <button type="button" disabled={loading || syncing} onClick={() => void load()} className="text-sm underline disabled:opacity-50">Vérifier les données</button>
      <Link to="/backoffice/crm-killer/settings?tab=integrations" className="text-sm underline">Configurer Google</Link>
    </div>
  </section>;
}