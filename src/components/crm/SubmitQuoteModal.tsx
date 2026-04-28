import { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Send, Upload, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Modal, ModalFooter } from '../Modal';
import { Badge } from '../Badge';
import { generateAdviceSheetHtml } from '@/lib/advice-sheet-generator';

interface CompanyLite {
  id: string;
  name: string;
  logo_url?: string | null;
}

interface ExistingQuote {
  id?: string;
  quote_amount?: number | null;
  monthly_price?: number | null;
  quote_file_url?: string | null;
  coverage_type?: 'tiers' | 'tiers_plus' | 'tous_risques' | null;
  includes_immobilisation?: boolean | null;
  includes_assistance_0km?: boolean | null;
  includes_rc_pro?: boolean | null;
  includes_depannage_remorquage?: boolean | null;
  coverage_details?: string | null;
  notes?: string | null;
}

interface CompanyDoc {
  id: string;
  document_name: string;
  file_url: string;
  description?: string | null;
  is_mandatory?: boolean;
}

interface SubmitQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadEmail?: string;
  leadFirstName?: string;
  leadAccessToken?: string;
  company: CompanyLite;
  existingQuote?: ExistingQuote | null;
  onSubmitted?: () => void;
}

export function SubmitQuoteModal({
  isOpen,
  onClose,
  leadId,
  leadEmail,
  leadFirstName,
  leadAccessToken,
  company,
  existingQuote,
  onSubmitted,
}: SubmitQuoteModalProps) {
  const isGenerali = (company.name || '').toLowerCase().includes('generali');

  const [documents, setDocuments] = useState<CompanyDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    quote_amount: '',
    monthly_price: '',
    quote_file_url: '',
    coverage_type: '' as '' | 'tiers' | 'tiers_plus' | 'tous_risques',
    includes_immobilisation: false,
    includes_assistance_0km: true,
    includes_rc_pro: true,
    includes_depannage_remorquage: true,
    coverage_details: '',
    notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    loadCompanyDocuments();
    setFormData({
      quote_amount: existingQuote?.quote_amount?.toString() || '',
      monthly_price: existingQuote?.monthly_price?.toString() || '',
      quote_file_url: existingQuote?.quote_file_url || '',
      coverage_type: (existingQuote?.coverage_type as '' | 'tiers' | 'tiers_plus' | 'tous_risques') || '',
      includes_immobilisation: existingQuote?.includes_immobilisation ?? false,
      includes_assistance_0km: existingQuote?.includes_assistance_0km ?? true,
      includes_rc_pro: existingQuote?.includes_rc_pro ?? !isGenerali,
      includes_depannage_remorquage: existingQuote?.includes_depannage_remorquage ?? true,
      coverage_details: existingQuote?.coverage_details || '',
      notes: existingQuote?.notes || '',
    });
  }, [isOpen, existingQuote?.id, company.id]);

  async function loadCompanyDocuments() {
    const { data } = await supabase
      .from('company_documents')
      .select('id, document_name, file_url, description, is_mandatory')
      .eq('company_id', company.id)
      .eq('send_with_quote', true);
    setDocuments(data || []);
  }

  async function handleFileUpload(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier dépasse 10 MB');
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.\-]+/g, '_')
        .replace(/_+/g, '_');
      const filePath = `${leadId}/${company.id}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('contract-documents')
        .upload(filePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, quote_file_url: publicUrl }));
      toast.success('Devis uploadé');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(`Erreur upload: ${err?.message || err}`);
    } finally {
      setUploading(false);
    }
  }

  async function generateAdviceSheet() {
    try {
      const { data: leadData } = await supabase
        .from('crm_leads')
        .select('first_name, last_name, email, phone, address, postal_code, city, immatriculation, vehicle_type')
        .eq('id', leadId)
        .maybeSingle();

      const { data: companyData } = await supabase
        .from('insurance_companies')
        .select('id, name, logo_url, advice_template')
        .eq('id', company.id)
        .maybeSingle();

      if (!companyData) return;

      const html = generateAdviceSheetHtml(leadData || {}, companyData as any, { generatedDate: new Date() });
      const safeCompany = company.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_');
      const filePath = `${leadId}/${company.id}/fiche_conseil_${safeCompany}_${Date.now()}.html`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });

      const { error: upErr } = await supabase.storage
        .from('contract-documents')
        .upload(filePath, blob, { contentType: 'text/html;charset=utf-8', upsert: true });
      if (upErr) {
        console.error('Fiche conseil upload error:', upErr);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(filePath);

      await supabase.from('crm_lead_documents').insert({
        lead_id: leadId,
        document_type: 'fiche_conseil',
        file_name: `Fiche de conseil - ${company.name}.html`,
        file_path: filePath,
        file_url: publicUrl,
        mime_type: 'text/html',
        bucket: 'contract-documents',
        custom_label: `Fiche de conseil ${company.name}`,
        status: 'validated',
        metadata: { company_id: company.id, company_name: company.name, auto_generated: true },
      });
    } catch (err) {
      console.error('Error generating advice sheet:', err);
    }
  }

  async function sendQuoteEmail() {
    if (!leadEmail) return;
    const prospectSpaceUrl = leadAccessToken
      ? `${window.location.origin}/espace-prospect?token=${leadAccessToken}&tab=devis`
      : `${window.location.origin}/espace-prospect?tab=devis`;

    const docsListHtml = documents.length > 0
      ? `
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 6px;">
            <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0;">Documents contractuels ${company.name} :</p>
            <ul style="color: #78350f; margin: 0; padding-left: 20px;">
              ${documents.map((d) => `<li style="margin: 6px 0;"><a href="${d.file_url}" style="color: #b45309; text-decoration: underline;" target="_blank" rel="noopener">${d.document_name}</a>${d.description ? ` <span style="color: #92400e; font-size: 12px;">- ${d.description}</span>` : ''}</li>`).join('')}
            </ul>
          </div>
        `
      : '';

    const subject = `Nouveau devis ${company.name} disponible - TaxiAssur`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 10px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px;">
          <h2 style="color: #16a34a;">Votre devis est prêt !</h2>
          <p style="color: #374151;">Bonjour ${leadFirstName || 'Cher client'},</p>
          <p style="color: #374151;">Votre devis d'assurance taxi <strong>${company.name}</strong> est disponible dans votre espace personnel.</p>
          ${formData.quote_amount ? `<p style="color: #374151;"><strong>Prime annuelle :</strong> ${formData.quote_amount} € ${formData.monthly_price ? `(soit ${formData.monthly_price} €/mois)` : ''}</p>` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${prospectSpaceUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold;">
              Voir mon devis
            </a>
          </div>
          ${docsListHtml}
          <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
            Une question ? <strong>01 80 85 57 88</strong> ou <strong>team@taxiassur.com</strong>
          </p>
        </div>
      </div>
    `;

    await supabase.functions.invoke('send-crm-email', {
      body: { to: leadEmail, subject, content: html, lead_id: leadId },
    });

    await supabase.from('crm_interactions').insert({
      lead_id: leadId,
      type: 'quote_submission',
      channel: 'email',
      subject,
      body: html,
      status: 'sent',
      metadata: { company_id: company.id, company_name: company.name, quote_amount: formData.quote_amount },
    });
  }

  async function handleSubmit() {
    if (!formData.quote_file_url) {
      toast.warning('Veuillez uploader le devis');
      return;
    }
    if (!formData.coverage_type) {
      toast.warning('Veuillez sélectionner le type de couverture');
      return;
    }
    if (!formData.quote_amount) {
      toast.warning('Veuillez indiquer le prix annuel');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const annual = parseFloat(formData.quote_amount) || null;
      const monthlyParsed = parseFloat(formData.monthly_price);
      const monthly = !isNaN(monthlyParsed) && monthlyParsed > 0
        ? monthlyParsed
        : annual ? Math.round((annual / 12) * 100) / 100 : null;

      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        lead_id: leadId,
        company_id: company.id,
        insurance_company_id: company.id,
        status: 'quote_submitted',
        quote_status: 'quote_submitted',
        quote_amount: annual,
        monthly_price: monthly,
        quote_file_url: formData.quote_file_url,
        quote_pdf_url: formData.quote_file_url,
        coverage_type: formData.coverage_type,
        includes_immobilisation: formData.includes_immobilisation,
        includes_assistance_0km: formData.includes_assistance_0km,
        includes_rc_pro: formData.includes_rc_pro,
        includes_depannage_remorquage: formData.includes_depannage_remorquage,
        coverage_details: formData.coverage_details || null,
        notes: formData.notes || null,
        submitted_by: user?.id,
        submitted_at: now,
        sent_to_client_at: now,
        last_sent_at: now,
        sent_at: now,
      };

      if (existingQuote?.id) {
        const { error } = await supabase
          .from('lead_company_quotes')
          .update(payload)
          .eq('id', existingQuote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lead_company_quotes')
          .upsert(payload, { onConflict: 'lead_id,company_id' });
        if (error) throw error;
      }

      await generateAdviceSheet();
      await sendQuoteEmail();

      toast.success(`Devis ${company.name} soumis au prospect`);
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      console.error('Submit quote error:', err);
      toast.error(`Erreur : ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  }

  const hasFile = !!formData.quote_file_url;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Soumettre un devis - ${company.name}`}
      size="lg"
    >
      <div className="space-y-5">
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-400/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-50 leading-relaxed">
              <strong className="text-white">Important :</strong> renseignez les conditions du devis et uploadez le PDF.
              La fiche de conseil et les documents contractuels seront automatiquement joints à l'email envoyé au prospect.
            </div>
          </div>
        </div>

        {documents.length > 0 && (
          <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-600">
            <h4 className="text-white font-semibold mb-3 text-sm">
              Documents qui seront envoyés ({documents.length})
            </h4>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm text-gray-100">
                  <FileText className="w-4 h-4 text-blue-300 flex-shrink-0" />
                  <span>{doc.document_name}</span>
                  {doc.is_mandatory && <Badge variant="warning" size="sm">Obligatoire</Badge>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-gray-100 text-sm font-semibold mb-2">Type de couverture *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { value: 'tiers', label: 'Tiers', desc: 'Responsabilité civile' },
              { value: 'tiers_plus', label: 'Tiers + BDG', desc: 'Bris de glace, incendie, vol' },
              { value: 'tous_risques', label: 'Tous risques', desc: 'Couverture complète' },
            ].map((opt) => {
              const active = formData.coverage_type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, coverage_type: opt.value as 'tiers' | 'tiers_plus' | 'tous_risques' })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    active
                      ? 'border-blue-400 bg-blue-500/20 shadow-md shadow-blue-500/10'
                      : 'border-gray-600 bg-gray-700/60 hover:border-blue-400/60 hover:bg-gray-700'
                  }`}
                >
                  <p className={`font-semibold text-sm ${active ? 'text-white' : 'text-gray-50'}`}>{opt.label}</p>
                  <p className={`text-xs mt-1 ${active ? 'text-blue-100' : 'text-gray-300'}`}>{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-100 text-sm font-semibold mb-2">Prix annuel (€) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.quote_amount}
              onChange={(e) => {
                const annual = e.target.value;
                const annualNum = parseFloat(annual);
                setFormData({
                  ...formData,
                  quote_amount: annual,
                  monthly_price: !isNaN(annualNum) && annualNum > 0
                    ? (Math.round((annualNum / 12) * 100) / 100).toString()
                    : formData.monthly_price,
                });
              }}
              className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
              placeholder="1250.00"
            />
          </div>
          <div>
            <label className="block text-gray-100 text-sm font-semibold mb-2">Prix mensuel (€)</label>
            <input
              type="number"
              step="0.01"
              value={formData.monthly_price}
              onChange={(e) => setFormData({ ...formData, monthly_price: e.target.value })}
              className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
              placeholder="Auto-calculé"
            />
            <p className="text-gray-300 text-xs mt-1.5">Calculé automatiquement si vide</p>
          </div>
        </div>

        <div>
          <label className="block text-gray-100 text-sm font-semibold mb-2">Garanties incluses</label>
          <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-600 space-y-1">
            {[
              { key: 'includes_immobilisation' as const, label: 'Indemnisation suite à immobilisation du véhicule' },
              { key: 'includes_assistance_0km' as const, label: 'Assistance 0 km' },
              { key: 'includes_rc_pro' as const, label: 'Responsabilité Civile Professionnelle (RC Pro)' },
              { key: 'includes_depannage_remorquage' as const, label: 'Dépannage et remorquage' },
            ].map((g) => {
              const checked = formData[g.key];
              return (
                <label
                  key={g.key}
                  className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-md transition-colors ${
                    checked ? 'bg-blue-500/15 hover:bg-blue-500/20' : 'hover:bg-gray-700/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setFormData({ ...formData, [g.key]: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-400 bg-gray-700 text-blue-500 focus:ring-blue-400"
                  />
                  <span className={`text-sm ${checked ? 'text-white font-medium' : 'text-gray-100'}`}>{g.label}</span>
                </label>
              );
            })}
          </div>
          {isGenerali && (
            <p className="text-amber-300 text-xs mt-2 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Generali n'inclut pas la RC Pro par défaut
            </p>
          )}
        </div>

        <div>
          <label className="block text-gray-100 text-sm font-semibold mb-2">Détails complémentaires sur les garanties</label>
          <textarea
            value={formData.coverage_details}
            onChange={(e) => setFormData({ ...formData, coverage_details: e.target.value })}
            className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
            rows={2}
            placeholder="Franchise, plafonds, exclusions particulières... (visible par le prospect)"
          />
        </div>

        <div>
          <label className="block text-gray-100 text-sm font-semibold mb-2">Devis PDF *</label>
          <div className="flex items-center gap-3">
            <label className={`flex-1 cursor-pointer rounded-lg border-2 border-dashed px-4 py-3 text-center transition-colors ${
              hasFile ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-gray-500 bg-gray-700/60 hover:border-blue-400'
            }`}>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                  e.target.value = '';
                }}
              />
              {uploading ? (
                <span className="inline-flex items-center gap-2 text-sm text-blue-200">
                  <Loader2 className="w-4 h-4 animate-spin" /> Upload en cours...
                </span>
              ) : hasFile ? (
                <span className="inline-flex items-center gap-2 text-sm text-emerald-200 font-semibold">
                  <CheckCircle className="w-4 h-4" /> PDF prêt — cliquer pour remplacer
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-gray-100 font-medium">
                  <Upload className="w-4 h-4" /> Cliquer pour uploader le devis (PDF, max 10 MB)
                </span>
              )}
            </label>
            {hasFile && (
              <a
                href={formData.quote_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 text-sm font-medium"
              >
                Voir
              </a>
            )}
          </div>
        </div>

        <div>
          <label className="block text-gray-100 text-sm font-semibold mb-2">Notes internes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-gray-700/80 border border-gray-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
            rows={2}
            placeholder="Notes pour l'équipe (non visibles par le prospect)..."
          />
        </div>
      </div>

      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || uploading || !formData.quote_file_url}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? 'Soumission...' : 'Soumettre le devis au prospect'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default SubmitQuoteModal;
