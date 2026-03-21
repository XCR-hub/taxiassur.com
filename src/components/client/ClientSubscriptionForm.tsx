import { useState, useEffect } from 'react';
import { CreditCard, Calendar, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '@/lib/toast';

interface Props {
  leadId: string;
  acceptedQuoteId: string;
  onSubmit?: () => void;
}

export default function ClientSubscriptionForm({ leadId, acceptedQuoteId, onSubmit }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingData, setExistingData] = useState<any>(null);
  const [ribFile, setRibFile] = useState<File | null>(null);
  const [ribPreview, setRibPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    iban: '',
    bic: '',
    accountHolderName: '',
    desiredEffectDate: '',
    debitDate: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadExistingData();
  }, [leadId]);

  const loadExistingData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('lead_subscription_details')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setExistingData(data);
        setForm({
          iban: data.iban || '',
          bic: data.bic || '',
          accountHolderName: data.account_holder_name || '',
          desiredEffectDate: data.desired_effect_date || '',
          debitDate: data.debit_date || ''
        });
        if (data.rib_file_url) {
          setRibPreview(data.rib_file_url);
        }
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateIBAN = (iban: string): boolean => {
    const cleanIBAN = iban.replace(/\s/g, '');
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
    return ibanRegex.test(cleanIBAN) && cleanIBAN.length >= 15 && cleanIBAN.length <= 34;
  };

  const validateBIC = (bic: string): boolean => {
    const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    return bicRegex.test(bic);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.iban) {
      newErrors.iban = 'L\'IBAN est obligatoire';
    } else if (!validateIBAN(form.iban)) {
      newErrors.iban = 'IBAN invalide (format: FR76 XXXX XXXX XXXX XXXX XXXX XXX)';
    }

    if (!form.bic) {
      newErrors.bic = 'Le BIC est obligatoire';
    } else if (!validateBIC(form.bic)) {
      newErrors.bic = 'BIC invalide (format: BNPAFRPPXXX)';
    }

    if (!form.accountHolderName) {
      newErrors.accountHolderName = 'Le nom du titulaire est obligatoire';
    }

    if (!form.desiredEffectDate) {
      newErrors.desiredEffectDate = 'La date d\'effet est obligatoire';
    } else {
      const selectedDate = new Date(form.desiredEffectDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.desiredEffectDate = 'La date d\'effet ne peut pas être dans le passé';
      }
    }

    if (!form.debitDate) {
      newErrors.debitDate = 'Le jour de prélèvement est obligatoire';
    }

    if (!ribFile && !existingData?.rib_file_url) {
      newErrors.ribFile = 'Le RIB est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.info('Le fichier est trop volumineux (max 5 MB)');
        return;
      }

      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        toast.info('Format non accepté. Utilisez PDF, JPG ou PNG');
        return;
      }

      setRibFile(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setRibPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setRibPreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      let ribFileUrl = existingData?.rib_file_url;

      if (ribFile) {
        const fileExt = ribFile.name.split('.').pop();
        const fileName = `rib/${leadId}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, ribFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        ribFileUrl = publicUrl;
      }

      const subscriptionData = {
        lead_id: leadId,
        accepted_quote_id: acceptedQuoteId,
        iban: form.iban.replace(/\s/g, ''),
        bic: form.bic.toUpperCase(),
        account_holder_name: form.accountHolderName,
        rib_file_url: ribFileUrl,
        rib_uploaded_at: new Date().toISOString(),
        desired_effect_date: form.desiredEffectDate,
        debit_date: form.debitDate,
        updated_at: new Date().toISOString()
      };

      if (existingData) {
        const { error } = await supabase
          .from('lead_subscription_details')
          .update(subscriptionData)
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lead_subscription_details')
          .insert(subscriptionData);

        if (error) throw error;
      }

      const { error: notifError } = await supabase
        .from('crm_event_notifications')
        .insert({
          lead_id: leadId,
          event_type: 'subscription_details_submitted',
          message: 'Coordonnées bancaires et dates renseignées',
          priority: 10,
          context_data: {
            has_rib: !!ribFileUrl,
            effect_date: form.desiredEffectDate,
            debit_date: form.debitDate
          }
        });

      if (notifError) console.error('Erreur notification:', notifError);

      toast.success('Vos informations ont été enregistrées avec succès! Notre équipe va maintenant préparer votre contrat.');
      onSubmit?.();
    } catch (error) {
      console.error('Erreur soumission:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const formatIBAN = (value: string) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  if (loading) {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">Dernière étape avant votre contrat</h4>
            <p className="text-sm text-yellow-800">
              Pour finaliser votre souscription, nous avons besoin de vos coordonnées bancaires et des dates souhaitées.
              Ces informations sont sécurisées et ne seront utilisées que pour le prélèvement de votre prime d'assurance.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Coordonnées bancaires
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IBAN *
            </label>
            <input
              type="text"
              value={form.iban}
              onChange={(e) => setForm({ ...form, iban: formatIBAN(e.target.value) })}
              className={`w-full border rounded px-3 py-2 ${errors.iban ? 'border-red-500' : ''}`}
              placeholder="FR76 1234 5678 9012 3456 7890 123"
              maxLength={34}
            />
            {errors.iban && <p className="text-sm text-red-600 mt-1">{errors.iban}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BIC / SWIFT *
            </label>
            <input
              type="text"
              value={form.bic}
              onChange={(e) => setForm({ ...form, bic: e.target.value.toUpperCase() })}
              className={`w-full border rounded px-3 py-2 ${errors.bic ? 'border-red-500' : ''}`}
              placeholder="BNPAFRPPXXX"
              maxLength={11}
            />
            {errors.bic && <p className="text-sm text-red-600 mt-1">{errors.bic}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du titulaire du compte *
            </label>
            <input
              type="text"
              value={form.accountHolderName}
              onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
              className={`w-full border rounded px-3 py-2 ${errors.accountHolderName ? 'border-red-500' : ''}`}
              placeholder="Nom et prénom"
            />
            {errors.accountHolderName && <p className="text-sm text-red-600 mt-1">{errors.accountHolderName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RIB (Relevé d'Identité Bancaire) *
            </label>
            <div className="mt-2">
              {ribPreview ? (
                <div className="relative">
                  <img src={ribPreview} alt="RIB" className="max-w-md border rounded" />
                  <button
                    type="button"
                    onClick={() => {
                      setRibFile(null);
                      setRibPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ) : existingData?.rib_file_url ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  RIB déjà uploadé
                </div>
              ) : (
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Cliquez pour uploader</p>
                    <p className="text-xs text-gray-500">PDF, JPG ou PNG (max 5 MB)</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {errors.ribFile && <p className="text-sm text-red-600 mt-1">{errors.ribFile}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Dates importantes
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'effet souhaitée *
            </label>
            <input
              type="date"
              value={form.desiredEffectDate}
              onChange={(e) => setForm({ ...form, desiredEffectDate: e.target.value })}
              className={`w-full border rounded px-3 py-2 ${errors.desiredEffectDate ? 'border-red-500' : ''}`}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.desiredEffectDate && <p className="text-sm text-red-600 mt-1">{errors.desiredEffectDate}</p>}
            <p className="text-sm text-gray-600 mt-1">
              Date à laquelle vous souhaitez que votre contrat prenne effet
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jour de prélèvement mensuel *
            </label>
            <select
              value={form.debitDate}
              onChange={(e) => setForm({ ...form, debitDate: e.target.value })}
              className={`w-full border rounded px-3 py-2 ${errors.debitDate ? 'border-red-500' : ''}`}
            >
              <option value="">Sélectionnez un jour</option>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day.toString()}>{day} de chaque mois</option>
              ))}
            </select>
            {errors.debitDate && <p className="text-sm text-red-600 mt-1">{errors.debitDate}</p>}
            <p className="text-sm text-gray-600 mt-1">
              Jour du mois où votre prime sera prélevée automatiquement
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold shadow-sm transition-all"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Enregistrement en cours...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Valider et continuer
          </>
        )}
      </button>
    </form>
  );
}
