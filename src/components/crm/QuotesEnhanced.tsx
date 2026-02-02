import { useState, useEffect } from 'react';
import {
  DollarSign,
  Building2,
  Upload,
  Send,
  Check,
  X,
  Clock,
  Eye,
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
  Phone,
  Award,
  Sparkles
} from 'lucide-react';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import ContextualTooltip from '@/components/ContextualTooltip';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Quote {
  id: string;
  insurance_company_id: string;
  insurance_company?: {
    id: string;
    name: string;
    logo_url?: string;
  };
  quote_file_url?: string;
  annual_premium?: number;
  status: 'pending' | 'sent' | 'received' | 'accepted' | 'refused';
  refusal_reason?: string;
  sent_at?: string;
  received_at?: string;
  last_sent_at?: string;
}

interface QuotesEnhancedProps {
  leadId: string;
  leadEmail: string;
  leadPhone: string;
  onQuoteStatusChange?: () => void;
}

export default function QuotesEnhanced({
  leadId,
  leadEmail,
  leadPhone,
  onQuoteStatusChange
}: QuotesEnhancedProps) {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load quotes with error handling
      const { data: quotesData, error: quotesError } = await supabase
        .from('lead_company_quotes')
        .select(`
          *,
          insurance_company:insurance_companies(*)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (quotesError) {
        console.error('Error loading quotes:', quotesError);
        // Don't throw, just set empty array
        setQuotes([]);
      } else {
        setQuotes(quotesData || []);
      }

      // Load all insurance companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('active', true)
        .order('name');

      if (companiesError) {
        console.error('Error loading companies:', companiesError);
        setInsuranceCompanies([]);
      } else {
        setInsuranceCompanies(companiesData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Ensure state is set even on error
      setQuotes([]);
      setInsuranceCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadQuote = async (file: File, quoteId: string) => {
    setUploading(quoteId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `quotes/${leadId}/${quoteId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('crm-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('crm-documents')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('lead_company_quotes')
        .update({
          quote_file_url: urlData.publicUrl,
          status: 'received',
          received_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      await loadData();
      onQuoteStatusChange?.();
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(null);
    }
  };

  const handleSendQuoteEmail = async (quote: Quote) => {
    if (!leadEmail) {
      alert('Aucun email renseigné pour ce lead');
      return;
    }

    if (!quote.quote_file_url) {
      alert('Aucun fichier de devis disponible');
      return;
    }

    const company = quote.insurance_company;
    if (!company) {
      alert('Compagnie d\'assurance introuvable');
      return;
    }

    setSendingEmail(quote.id);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          lead_id: leadId,
          company_id: company.id,
          company_name: company.name,
          quote_file_url: quote.quote_file_url,
          quote_amount: quote.annual_premium,
          personal_message: ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur envoi email');
      }

      const { error: updateError } = await supabase
        .from('lead_company_quotes')
        .update({
          status: 'sent',
          last_sent_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      await loadData();
      alert(`✅ Devis envoyé à ${leadEmail}`);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Erreur lors de l\'envoi');
    } finally {
      setSendingEmail(null);
    }
  };

  const handleRefuseQuote = async (quoteId: string) => {
    const reason = prompt('Raison du refus (optionnel):');

    try {
      const { error } = await supabase
        .from('lead_company_quotes')
        .update({
          status: 'refused',
          refusal_reason: reason || 'Non spécifié'
        })
        .eq('id', quoteId);

      if (error) throw error;

      await loadData();
      onQuoteStatusChange?.();
    } catch (error) {
      console.error('Error refusing:', error);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('lead_company_quotes')
        .update({
          status: 'accepted'
        })
        .eq('id', quoteId);

      if (error) throw error;

      await loadData();
      onQuoteStatusChange?.();
    } catch (error) {
      console.error('Error accepting:', error);
    }
  };

  // Safely handle quotes array
  const safeQuotes = Array.isArray(quotes) ? quotes : [];

  const stats = {
    total: safeQuotes.length,
    pending: safeQuotes.filter(q => q.status === 'pending').length,
    received: safeQuotes.filter(q => q.status === 'received').length,
    refused: safeQuotes.filter(q => q.status === 'refused').length,
    sent: safeQuotes.filter(q => q.status === 'sent').length,
    accepted: safeQuotes.filter(q => q.status === 'accepted').length
  };

  const receivedQuotes = safeQuotes.filter(q => q.status === 'received' && q.annual_premium);
  const bestQuote = receivedQuotes.length > 0
    ? receivedQuotes.reduce((min, q) => q.annual_premium! < min.annual_premium! ? q : min)
    : null;
  const avgPremium = receivedQuotes.length > 0
    ? receivedQuotes.reduce((sum, q) => sum + (q.annual_premium || 0), 0) / receivedQuotes.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Devis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          title="Total Devis"
          value={stats.total}
          icon={Building2}
          color="blue"
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="En Attente"
          value={stats.pending}
          icon={Clock}
          color="amber"
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="Reçus"
          value={stats.received}
          icon={CheckCircle}
          color="green"
          trend={stats.received > 0 ? {
            value: stats.received,
            label: "devis disponibles",
            direction: "up"
          } : undefined}
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="Refusés"
          value={stats.refused}
          icon={X}
          color="red"
          animationDuration={1000}
        />
      </div>

      {/* Meilleur devis & Prix moyen */}
      {receivedQuotes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600">Meilleur Prix</h3>
                <p className="text-2xl font-bold text-green-600">
                  {bestQuote?.annual_premium?.toLocaleString('fr-FR')} €
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              {bestQuote?.insurance_company?.name}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-blue-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600">Prix Moyen</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(avgPremium).toLocaleString('fr-FR')} €
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              Sur {receivedQuotes.length} devis reçu(s)
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {stats.total > 0 && stats.received === 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                Prochaine étape : Obtenir les devis
              </h4>
              <p className="text-sm text-blue-700">
                Vous devez traiter chaque compagnie : soit uploader un devis, soit indiquer un refus avec motif.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des compagnies */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            Compagnies d'Assurance ({stats.total})
          </h3>
          <ContextualTooltip
            content="Liste des compagnies sollicitées pour ce lead"
            type="info"
            position="left"
          />
        </div>

        {safeQuotes.map((quote) => {
          const company = quote.insurance_company;
          if (!company || !company.name) return null;

          const statusColors = {
            pending: 'bg-amber-50 border-amber-200 text-amber-700',
            sent: 'bg-blue-50 border-blue-200 text-blue-700',
            received: 'bg-green-50 border-green-200 text-green-700',
            accepted: 'bg-purple-50 border-purple-200 text-purple-700',
            refused: 'bg-red-50 border-red-200 text-red-700'
          };

          const statusIcons = {
            pending: Clock,
            sent: Send,
            received: CheckCircle,
            accepted: Check,
            refused: X
          };

          const statusLabels = {
            pending: 'En attente',
            sent: 'Devis envoyé',
            received: 'Devis reçu',
            accepted: 'Accepté',
            refused: 'Refusé'
          };

          const StatusIcon = statusIcons[quote.status];

          return (
            <div
              key={quote.id}
              className={cn(
                "rounded-xl shadow-sm border p-6 transition-all",
                statusColors[quote.status]
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{company.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {statusLabels[quote.status]}
                      </span>
                    </div>
                  </div>
                </div>

                {quote.annual_premium && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {quote.annual_premium.toLocaleString('fr-FR')} €
                    </div>
                    <div className="text-sm text-gray-600">/ an</div>
                  </div>
                )}
              </div>

              {quote.status === 'pending' && (
                <div className="flex gap-2">
                  <label htmlFor={`quote-upload-${quote.id}`} className="flex-1">
                    <input
                      id={`quote-upload-${quote.id}`}
                      name={`quote-file-${quote.id}`}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadQuote(file, quote.id);
                      }}
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={uploading === quote.id}
                      autoComplete="off"
                      aria-label={`Uploader le devis pour ${company.name}`}
                    />
                    <ContextualTooltip content="Uploader le devis reçu de la compagnie" type="tip">
                      <span className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer",
                        uploading === quote.id && "opacity-50 cursor-not-allowed"
                      )}>
                        {uploading === quote.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Upload...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Uploader devis
                          </>
                        )}
                      </span>
                    </ContextualTooltip>
                  </label>

                  <ContextualTooltip content="Indiquer que la compagnie a refusé" type="warning">
                    <button
                      onClick={() => handleRefuseQuote(quote.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      Refuser
                    </button>
                  </ContextualTooltip>
                </div>
              )}

              {quote.status === 'received' && quote.quote_file_url && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <a
                      href={quote.quote_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Voir
                    </a>

                    <a
                      href={quote.quote_file_url}
                      download
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger
                    </a>

                    <ContextualTooltip content="Envoyer ce devis au prospect par email" type="tip">
                      <button
                        onClick={() => handleSendQuoteEmail(quote)}
                        disabled={sendingEmail === quote.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                      >
                        {sendingEmail === quote.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            Envoyer par email
                          </>
                        )}
                      </button>
                    </ContextualTooltip>
                  </div>

                  {quote.last_sent_at && (
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      Envoyé le {new Date(quote.last_sent_at).toLocaleString('fr-FR')}
                    </div>
                  )}
                </div>
              )}

              {quote.status === 'sent' && (
                <div className="bg-blue-100 rounded-lg p-3 text-sm text-blue-800">
                  ✓ Devis envoyé au prospect
                  {quote.last_sent_at && (
                    <span className="ml-1">
                      le {new Date(quote.last_sent_at).toLocaleString('fr-FR')}
                    </span>
                  )}
                </div>
              )}

              {quote.status === 'refused' && quote.refusal_reason && (
                <div className="bg-red-100 rounded-lg p-3 text-sm text-red-800">
                  <strong>Motif :</strong> {quote.refusal_reason}
                </div>
              )}

              {quote.status === 'accepted' && (
                <div className="bg-purple-100 rounded-lg p-3 text-sm text-purple-800">
                  ✓ Devis accepté par le prospect
                </div>
              )}
            </div>
          );
        })}

        {safeQuotes.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Aucun devis demandé</p>
            <p className="text-sm text-gray-500">
              Ajoutez des compagnies d'assurance pour démarrer
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
