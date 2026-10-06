import { useCallback, useEffect, useState } from 'react';
import { nativeAdminLeads } from '../lib/native-admin-data';
import { taxiLeadMetrics, type TaxiLeadMetrics } from '../../shared/taxi-lead-metrics.js';

export default function TaxiLeadTarget() {
  const [metrics, setMetrics] = useState<TaxiLeadMetrics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const payload = await nativeAdminLeads() as { leads?: Array<Record<string, unknown>>; total?: number };
      const leads = payload.leads || [];
      if (Number(payload.total || 0) > leads.length) throw new Error('incomplete_data');
      setMetrics(taxiLeadMetrics(leads));
    } catch { setError('Impossible de calculer les demandes taxi. Actualisez pour réessayer.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section className="mb-8 rounded-2xl border border-amber-200 bg-white p-5 sm:p-6" aria-label="Objectif demandes taxi">
    <div className="flex flex-wrap justify-between items-center gap-3 mb-4"><h2 className="text-xl font-bold text-gray-950">Objectif : 3 demandes taxi par jour</h2><button onClick={() => void load()} disabled={loading} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">{loading ? 'Calcul en cours…' : 'Actualiser les demandes'}</button></div>
    <p className="text-sm text-gray-600 mb-5">Formulaires du site uniquement. Taxis avec e-mail et téléphone valides ; tests, demandes supprimées et doublons exclus. Une demande reçue reste à qualifier commercialement.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!error && metrics && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: 'Aujourd’hui', value: metrics.today }, { label: '30 jours / objectif 90', value: metrics.count30Days }, { label: 'Moyenne par jour', value: metrics.averagePerDay.toFixed(2) }, { label: 'Mois précédent', value: metrics.previousMonth }].map(item => <div key={item.label} className="rounded-xl bg-amber-50 p-4"><p className="text-2xl font-bold text-gray-950">{item.value}</p><p className="text-sm text-gray-600">{item.label}</p></div>)}
      </div>
      <p className="mt-4 text-sm text-gray-700">{metrics.remaining} demandes supplémentaires pour atteindre 90 sur 30 jours · {metrics.daysAtTarget} jours à 3 demandes ou plus.</p>
      <progress value={Math.min(metrics.count30Days, 90)} max={90} className="mt-3 w-full accent-amber-500" aria-label="Progression vers 90 demandes" />
      <details className="mt-5"><summary className="cursor-pointer font-semibold">Demandes par jour et pages d’entrée</summary><div className="mt-4 grid gap-6 lg:grid-cols-2">
        <table className="w-full text-sm"><caption className="text-left font-semibold mb-2">30 derniers jours (heure de Paris)</caption><thead><tr><th className="text-left">Date</th><th className="text-right">Demandes</th></tr></thead><tbody>{[...metrics.daily].reverse().map(row => <tr key={row.date} className="border-b border-gray-100"><td className="py-1">{row.date}</td><td className="text-right">{row.leads}</td></tr>)}</tbody></table>
        <table className="w-full text-sm self-start"><caption className="text-left font-semibold mb-2">Pages d’entrée des demandes</caption><thead><tr><th className="text-left">Page</th><th className="text-right">Demandes</th></tr></thead><tbody>{metrics.landingPages.map(row => <tr key={row.page} className="border-b border-gray-100"><td className="py-2 break-all">{row.page}</td><td className="text-right">{row.leads}</td></tr>)}</tbody></table>
      </div></details>
    </>}
  </section>;
}
