import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, CheckCircle2, X, FileText, Send, Loader2, Building2, AlertCircle } from 'lucide-react';

interface SaisieDevisStepProps {
  leadId: string;
  leadEmail?: string;
  leadFirstName?: string;
  leadAccessToken?: string;
  onComplete?: () => void;
}

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
  is_mandatory: boolean;
}

interface Quote {
  id: string;
  insurance_company_id: string;
  file_name: string;
  file_path: string;
  amount?: number;
  sent_at?: string;
  company?: InsuranceCompany;
}

export default function SaisieDevisStep({
  leadId,
  leadEmail,
  leadFirstName,
  leadAccessToken,
  onComplete
}: SaisieDevisStepProps) {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
    loadQuotes();
  }, [leadId]);

  useEffect(() => {
    // Check if all 5 quotes are uploaded
    if (quotes.length >= 5) {
      onComplete?.();
    }
  }, [quotes]);

  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('is_mandatory', true)
        .eq('is_active', true)
        .order('priority_order');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadQuotes() {
    try {
      const { data, error } = await supabase
        .from('lead_company_quotes')
        .select(`
          *,
          company:insurance_companies(*)
        `)
        .eq('lead_id', leadId);

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    }
  }

  async function uploadQuote(companyId: string, file: File) {
    setUploading(companyId);

    try {
      // Upload file to storage
      const fileName = `${leadId}/${companyId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('contract-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get company details
      const company = companies.find(c => c.id === companyId);

      // Create quote record
      const { data: quoteData, error: quoteError } = await supabase
        .from('lead_company_quotes')
        .insert({
          lead_id: leadId,
          insurance_company_id: companyId,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          status: 'pending'
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Send automatic email to prospect
      await sendQuoteEmail(companyId, company?.name || 'Compagnie');

      alert(`Devis ${company?.name} uploadé avec succès !`);
      loadQuotes();

    } catch (error) {
      console.error('Error uploading quote:', error);
      alert('Erreur lors de l\'upload du devis');
    } finally {
      setUploading(null);
    }
  }

  async function sendQuoteEmail(companyId: string, companyName: string) {
    if (!leadEmail) return;

    setSending(companyId);

    try {
      const prospectSpaceUrl = leadAccessToken
        ? `${window.location.origin}/espace-prospect?token=${leadAccessToken}`
        : `${window.location.origin}/espace-prospect`;

      const subject = `Votre devis ${companyName} est disponible`;
      const body = `Bonjour ${leadFirstName || 'Cher client'},

Excellente nouvelle ! Nous avons le plaisir de vous informer que votre devis d'assurance taxi avec ${companyName} est maintenant disponible.

📄 Consultez votre devis : ${prospectSpaceUrl}

Vous y trouverez :
- Le devis détaillé
- Les conditions générales
- Les documents légaux

Prenez le temps de le consulter et n'hésitez pas à nous contacter pour toute question.

Cordialement,
L'équipe TaxiAssur`;

      // Send email via edge function
      const { error } = await supabase.functions.invoke('send-crm-email', {
        body: {
          to: leadEmail,
          subject: subject,
          html: body.replace(/\n/g, '<br>'),
          leadId: leadId
        }
      });

      if (error) throw error;

      // Log interaction
      await supabase
        .from('crm_interactions')
        .insert({
          lead_id: leadId,
          type: 'email',
          channel: 'email',
          subject: subject,
          body: body,
          status: 'sent',
          metadata: { company_id: companyId, company_name: companyName }
        });

      // Update quote sent_at
      await supabase
        .from('lead_company_quotes')
        .update({ sent_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('insurance_company_id', companyId);

    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSending(null);
    }
  }

  async function resendQuoteEmail(quote: Quote) {
    const company = companies.find(c => c.id === quote.insurance_company_id);
    if (company) {
      await sendQuoteEmail(company.id, company.name);
      alert('Email renvoyé avec succès !');
    }
  }

  async function deleteQuote(quoteId: string, filePath: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;

    try {
      // Delete from storage
      await supabase.storage.from('contract-documents').remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from('lead_company_quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      alert('Devis supprimé avec succès !');
      loadQuotes();
    } catch (error) {
      console.error('Error deleting quote:', error);
      alert('Erreur lors de la suppression');
    }
  }

  const getQuoteForCompany = (companyId: string) => {
    return quotes.find(q => q.insurance_company_id === companyId);
  };

  const progressPercent = companies.length > 0
    ? Math.round((quotes.length / companies.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Progression des Devis
          </h3>
          <div className="flex items-center gap-2">
            {progressPercent === 100 ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-orange-600" />
            )}
            <span className="text-2xl font-bold text-gray-900">
              {quotes.length}/{companies.length}
            </span>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              progressPercent === 100 ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Companies & Quotes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map((company) => {
          const quote = getQuoteForCompany(company.id);
          const isUploading = uploading === company.id;
          const isSending = sending === company.id;

          return (
            <div
              key={company.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                quote
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    {company.name}
                  </h4>
                  <p className="text-sm text-gray-600">{company.code}</p>
                </div>
                {quote && (
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                )}
              </div>

              {quote ? (
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {quote.file_name}
                      </span>
                    </div>
                    {quote.sent_at && (
                      <div className="text-xs text-gray-600">
                        Email envoyé le {new Date(quote.sent_at).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const url = supabase.storage
                          .from('contract-documents')
                          .getPublicUrl(quote.file_path).data.publicUrl;
                        window.open(url, '_blank');
                      }}
                      className="flex-1 text-sm py-2 px-3 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Voir
                    </button>
                    <button
                      onClick={() => resendQuoteEmail(quote)}
                      disabled={isSending}
                      className="flex-1 text-sm py-2 px-3 bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {isSending ? 'Envoi...' : 'Renvoyer'}
                    </button>
                    <button
                      onClick={() => deleteQuote(quote.id, quote.file_path)}
                      className="text-sm py-2 px-3 bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block">
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                        isUploading
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                          <span className="text-sm text-gray-600">Upload en cours...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-gray-400" />
                          <div>
                            <span className="text-sm font-medium text-blue-600">
                              Cliquez pour uploader
                            </span>
                            <p className="text-xs text-gray-500 mt-1">PDF jusqu'à 10MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadQuote(company.id, file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">À chaque upload :</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Le devis est stocké de manière sécurisée</li>
              <li>Un email automatique est envoyé au prospect</li>
              <li>Le prospect peut consulter le devis dans son espace</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Lien Espace Prospect */}
      {leadAccessToken && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-2">Lien Espace Prospect</h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/espace-prospect?token=${leadAccessToken}`}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded text-gray-700"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/espace-prospect?token=${leadAccessToken}`);
                    alert('Lien copié !');
                  }}
                  className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Copier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
