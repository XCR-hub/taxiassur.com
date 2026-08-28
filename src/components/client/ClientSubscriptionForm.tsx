import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle, CreditCard, Loader2, Upload } from 'lucide-react';
import { toast } from '@/lib/toast';
import { loadClientPlatformSession, saveClientPlatformSubscription, uploadClientPlatformDocument } from '@/lib/client-platform-api';

interface Props { token: string; acceptedQuoteId: string; onSubmit?: () => void }
interface SubscriptionData { iban?: string; bic?: string; account_holder_name?: string; desired_effect_date?: string; debit_date?: string | number; has_rib?: boolean }
const types = ['application/pdf', 'image/jpeg', 'image/png'];

export default function ClientSubscriptionForm({ token, acceptedQuoteId, onSubmit }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<SubscriptionData | null>(null);
  const [rib, setRib] = useState<File | null>(null);
  const [form, setForm] = useState({ iban: '', bic: '', accountHolderName: '', desiredEffectDate: '', debitDate: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void loadClientPlatformSession(token).then((data) => {
      if (!active) return;
      const value = data.subscription as SubscriptionData | null;
      setExisting(value);
      if (value) setForm({ iban: formatIban(value.iban || ''), bic: value.bic || '', accountHolderName: value.account_holder_name || '', desiredEffectDate: value.desired_effect_date || '', debitDate: String(value.debit_date || '') });
    }).catch(() => { if (active) setExisting(null) }).finally(() => { if (active) setLoading(false) });
    return () => { active = false };
  }, [token]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(form.iban.replace(/\s/g, '').toUpperCase())) next.iban = 'IBAN invalide';
    if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(form.bic.replace(/\s/g, '').toUpperCase())) next.bic = 'BIC invalide';
    if (form.accountHolderName.trim().length < 2) next.accountHolderName = 'Nom du titulaire obligatoire';
    if (!form.desiredEffectDate || form.desiredEffectDate < new Date().toISOString().slice(0, 10)) next.desiredEffectDate = "Date d'effet invalide";
    if (!(Number(form.debitDate) >= 1 && Number(form.debitDate) <= 28)) next.debitDate = 'Jour invalide';
    if (!rib && !existing?.has_rib) next.rib = 'RIB obligatoire';
    setErrors(next); return Object.keys(next).length === 0;
  };

  const selectRib = (file?: File) => {
    if (!file) return;
    if (file.size < 1 || file.size > 5 * 1024 * 1024) return void toast.info('RIB trop volumineux (max 5 Mo)');
    if (!types.includes(file.type)) return void toast.info('Format accepté : PDF, JPG ou PNG');
    setRib(file); setErrors((value) => ({ ...value, rib: '' }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!validate()) return; setSubmitting(true);
    try {
      if (rib) {
        await uploadClientPlatformDocument(token, rib, 'rib');
      }
      await saveClientPlatformSubscription(token, {
        accepted_quote_id: acceptedQuoteId,
        iban: form.iban,
        bic: form.bic,
        account_holder_name: form.accountHolderName,
        desired_effect_date: form.desiredEffectDate,
        debit_date: Number(form.debitDate),
        has_rib: Boolean(rib || existing?.has_rib),
      });
      toast.success('Informations enregistrées. Notre équipe va préparer votre contrat.'); onSubmit?.();
    } catch (error: unknown) { console.error('Souscription:', error); toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement"); }
    finally { setSubmitting(false) }
  };

  if (loading) return <div className="p-4 text-center">Chargement...</div>;
  const field = (name: keyof typeof form, label: string, type = 'text') => <div><label className="block text-sm font-medium mb-1">{label}</label><input type={type} value={form[name]} onChange={(e) => setForm({ ...form, [name]: name === 'iban' ? formatIban(e.target.value) : e.target.value })} min={type === 'date' ? new Date().toISOString().slice(0, 10) : undefined} maxLength={name === 'accountHolderName' ? 150 : undefined} className={`w-full border rounded px-3 py-2 ${errors[name] ? 'border-red-500' : ''}`} />{errors[name] && <p className="text-sm text-red-600">{errors[name]}</p>}</div>;
  return <form onSubmit={submit} className="space-y-6">
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3"><AlertCircle className="w-5 h-5 text-yellow-600" /><div><h4 className="font-semibold">Dernière étape avant votre contrat</h4><p className="text-sm">Vos coordonnées bancaires et votre RIB sont transmis par un accès privé sécurisé.</p></div></div>
    <div className="bg-white border rounded-lg p-6 space-y-4"><h3 className="text-lg font-semibold flex gap-2"><CreditCard />Coordonnées bancaires</h3>{field('iban', 'IBAN *')}{field('bic', 'BIC / SWIFT *')}{field('accountHolderName', 'Nom du titulaire *')}<div><label className="block text-sm font-medium">RIB *</label>{existing?.has_rib && !rib && <p className="text-sm text-green-700 flex gap-2"><CheckCircle className="w-4" />RIB déjà déposé</p>}{rib && <p className="text-sm">{rib.name}</p>}<label className="mt-2 flex h-24 items-center justify-center border-2 border-dashed rounded cursor-pointer"><Upload className="w-5 mr-2" />{existing?.has_rib ? 'Remplacer le RIB' : 'Sélectionner le RIB'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => selectRib(e.target.files?.[0])} /></label>{errors.rib && <p className="text-sm text-red-600">{errors.rib}</p>}</div></div>
    <div className="bg-white border rounded-lg p-6 space-y-4"><h3 className="text-lg font-semibold flex gap-2"><Calendar />Dates</h3>{field('desiredEffectDate', "Date d'effet souhaitée *", 'date')}<div><label className="block text-sm font-medium">Jour de prélèvement *</label><select value={form.debitDate} onChange={(e) => setForm({ ...form, debitDate: e.target.value })} className="w-full border rounded px-3 py-2"><option value="">Choisir</option>{Array.from({ length: 28 }, (_, i) => i + 1).map((day) => <option key={day}>{day}</option>)}</select>{errors.debitDate && <p className="text-sm text-red-600">{errors.debitDate}</p>}</div></div>
    <button disabled={submitting} className="w-full bg-yellow-500 py-3 rounded-lg font-semibold flex justify-center gap-2">{submitting ? <><Loader2 className="animate-spin" />Enregistrement...</> : <><CheckCircle />Valider et continuer</>}</button>
  </form>;
}
function formatIban(value: string) { const clean = value.replace(/\s/g, '').toUpperCase().slice(0, 34); return clean.match(/.{1,4}/g)?.join(' ') || clean }
