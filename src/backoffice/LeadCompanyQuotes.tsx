import { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, Upload, FileText, Send, AlertTriangle,
  Download, Eye, MessageSquare, Building2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Modal, ModalFooter } from '../components/Modal';
import { Badge } from '../components/Badge';
import { Progress } from '../components/Progress';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
}

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  description: string | null;
  logo_url?: string | null;
}

interface CompanyQuote {
  id: string;
  lead_id: string;
  company_id: string;
  status: 'pending' | 'quote_submitted' | 'refused' | 'validated';
  quote_amount: number | null;
  quote_file_url: string | null;
  refusal_reason: string | null;
  refusal_screenshot_url: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  quote_accepted_at: string | null;
  quote_refused_at: string | null;
  notes: string | null;
  company: InsuranceCompany;
}

interface RefusalReason {
  code: string;
  label: string;
  description: string | null;
}

interface Props {
  leadId: string;
}

export default function LeadCompanyQuotes({ leadId }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [quotes, setQuotes] = useState<CompanyQuote[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [refusalReasons, setRefusalReasons] = useState<RefusalReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<CompanyQuote | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isRefusalModalOpen, setIsRefusalModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allMandatoryProcessed, setAllMandatoryProcessed] = useState(false);

  const [quoteFormData, setQuoteFormData] = useState({
    quote_amount: '',
    quote_file_url: '',
    notes: ''
  });

  const [refusalFormData, setRefusalFormData] = useState({
    refusal_reason_code: '',
    refusal_reason: '',
    refusal_screenshot_url: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
    loadRefusalReasons();
  }, [leadId]);

  const loadData = async () => {
    try {
      const [leadRes, quotesRes, mandatoryCheckRes] = await Promise.all([
        supabase.from('crm_leads').select('*').eq('id', leadId).maybeSingle(),
        supabase
          .from('lead_company_quotes')
          .select(`
            *,
            company:insurance_companies(*)
          `)
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true }),
        supabase.rpc('check_all_mandatory_companies_processed', { p_lead_id: leadId })
      ]);

      if (leadRes.error && leadRes.error.code !== 'PGRST116') throw leadRes.error;
      if (quotesRes.error) throw quotesRes.error;

      if (leadRes.data) {
        setLead({
          id: leadRes.data.id,
          name: `${leadRes.data.first_name || ''} ${leadRes.data.last_name || ''}`.trim() || leadRes.data.email,
          email: leadRes.data.email,
          phone: leadRes.data.phone,
          city: leadRes.data.city || ''
        });
      }
      setQuotes(quotesRes.data || []);
      setAllMandatoryProcessed(mandatoryCheckRes.data || false);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRefusalReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('company_quote_refusal_reasons')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setRefusalReasons(data || []);
    } catch (error) {
      console.error('Erreur chargement motifs refus:', error);
    }
  };

  const loadCompanyDocuments = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .eq('company_id', companyId)
        .eq('send_with_quote', true);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    }
  };

  const handleSubmitQuote = (quote: CompanyQuote) => {
    setSelectedQuote(quote);
    loadCompanyDocuments(quote.company_id);
    setQuoteFormData({
      quote_amount: quote.quote_amount?.toString() || '',
      quote_file_url: quote.quote_file_url || '',
      notes: quote.notes || ''
    });
    setIsQuoteModalOpen(true);
  };

  const handleSubmitRefusal = (quote: CompanyQuote) => {
    setSelectedQuote(quote);
    setRefusalFormData({
      refusal_reason_code: '',
      refusal_reason: quote.refusal_reason || '',
      refusal_screenshot_url: quote.refusal_screenshot_url || '',
      notes: quote.notes || ''
    });
    setIsRefusalModalOpen(true);
  };

  const saveQuote = async () => {
    if (!selectedQuote || !quoteFormData.quote_file_url) {
      alert('Veuillez uploader le devis');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('lead_company_quotes')
        .update({
          status: 'quote_submitted',
          quote_amount: parseFloat(quoteFormData.quote_amount) || null,
          quote_file_url: quoteFormData.quote_file_url,
          notes: quoteFormData.notes,
          submitted_by: user?.id,
          submitted_at: new Date().toISOString()
        })
        .eq('id', selectedQuote.id);

      if (error) throw error;

      await loadData();
      setIsQuoteModalOpen(false);
      alert('Devis soumis avec succès !');
    } catch (error) {
      console.error('Erreur soumission devis:', error);
      alert('Erreur lors de la soumission');
    } finally {
      setSaving(false);
    }
  };

  const saveRefusal = async () => {
    if (!selectedQuote || !refusalFormData.refusal_reason_code) {
      alert('Veuillez sélectionner le motif de refus');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const selectedReason = refusalReasons.find(r => r.code === refusalFormData.refusal_reason_code);
      const fullRefusalReason = selectedReason
        ? `${selectedReason.label}${refusalFormData.notes ? ` - ${refusalFormData.notes}` : ''}`
        : refusalFormData.notes;

      const { error } = await supabase
        .from('lead_company_quotes')
        .update({
          status: 'refused',
          refusal_reason: fullRefusalReason,
          refusal_screenshot_url: refusalFormData.refusal_screenshot_url,
          notes: refusalFormData.notes,
          submitted_by: user?.id,
          submitted_at: new Date().toISOString()
        })
        .eq('id', selectedQuote.id);

      if (error) throw error;

      await loadData();
      setIsRefusalModalOpen(false);
      alert('Refus enregistré avec succès !');
    } catch (error) {
      console.error('Erreur enregistrement refus:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" icon={<Clock className="w-3 h-3" />}>En attente</Badge>;
      case 'quote_submitted':
        return <Badge variant="info" icon={<FileText className="w-3 h-3" />}>Devis soumis</Badge>;
      case 'refused':
        return <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>Refusé</Badge>;
      case 'validated':
        return <Badge variant="success" icon={<CheckCircle className="w-3 h-3" />}>Validé</Badge>;
      default:
        return null;
    }
  };

  const calculateProgress = () => {
    const total = quotes.length;
    const processed = quotes.filter(q => q.status !== 'pending').length;
    return total > 0 ? (processed / total) * 100 : 0;
  };

  if (loading) {
    return <div className="text-white">Chargement...</div>;
  }

  if (!lead) {
    return <div className="text-red-500">Lead introuvable</div>;
  }

  const progress = calculateProgress();
  const allProcessed = quotes.every(q => q.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Validation Compagnies</h2>
            <p className="text-gray-400">
              {lead.name} - {lead.email}
            </p>
          </div>
          {allProcessed && (
            <Badge variant="success" icon={<CheckCircle className="w-4 h-4" />} size="lg">
              Toutes les compagnies traitées
            </Badge>
          )}
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>Progression</span>
            <span>{quotes.filter(q => q.status !== 'pending').length} / {quotes.length}</span>
          </div>
          <Progress
            value={progress}
            variant={allProcessed ? 'success' : 'info'}
            size="lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className={`
              bg-gray-900 rounded-xl border p-6
              ${quote.status === 'pending' ? 'border-yellow-500/30' : 'border-gray-800'}
              ${quote.status === 'validated' ? 'border-green-500/30' : ''}
              ${quote.status === 'refused' ? 'border-red-500/30' : ''}
            `}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {quote.company.logo_url ? (
                    <img
                      src={quote.company.logo_url}
                      alt={`Logo ${quote.company.name}`}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-gray-600" />
                  )}
                  <h3 className="text-xl font-bold text-white">{quote.company.name}</h3>
                  {getStatusBadge(quote.status)}
                </div>
                {quote.company.description && (
                  <p className="text-gray-400 text-sm">{quote.company.description}</p>
                )}
              </div>
            </div>

            {quote.status === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmitQuote(quote)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Soumettre un devis
                </button>
                <button
                  onClick={() => handleSubmitRefusal(quote)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Déclarer un refus
                </button>
              </div>
            )}

            {quote.status === 'quote_submitted' && (
              <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  {quote.quote_amount && (
                    <div>
                      <div className="text-gray-400 text-sm">Montant</div>
                      <div className="text-white font-bold text-lg">{quote.quote_amount} €</div>
                    </div>
                  )}
                  <div>
                    <div className="text-gray-400 text-sm">Soumis le</div>
                    <div className="text-white">{new Date(quote.submitted_at!).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
                {quote.quote_file_url && (
                  <a
                    href={quote.quote_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400"
                  >
                    <Eye className="w-4 h-4" />
                    Voir le devis
                  </a>
                )}
                {quote.notes && (
                  <div className="mt-3 text-gray-400 text-sm">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    {quote.notes}
                  </div>
                )}
              </div>
            )}

            {quote.status === 'refused' && (
              <div className="bg-red-950/20 rounded-lg p-4 border border-red-800/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="text-white font-semibold mb-1">
                      {quote.quote_refused_at ? 'Refusé par le prospect' : 'Motif du refus'}
                    </div>
                    {quote.quote_refused_at && (
                      <div className="text-gray-400 text-sm mb-2">
                        Le {new Date(quote.quote_refused_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                    {quote.refusal_reason && (
                      <div className="text-gray-300 mb-2">
                        <span className="text-gray-400 text-sm">Raison : </span>
                        {quote.refusal_reason}
                      </div>
                    )}
                    {quote.refusal_screenshot_url && (
                      <a
                        href={quote.refusal_screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400 mt-2"
                      >
                        <Eye className="w-4 h-4" />
                        Voir la capture d'écran
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {quote.status === 'validated' && (
              <div className="bg-green-950/20 rounded-lg p-4 border border-green-800/30">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="text-white font-semibold mb-1">
                      {quote.quote_accepted_at ? 'Validé par le prospect' : 'Devis validé'}
                    </div>
                    {quote.quote_accepted_at && (
                      <div className="text-gray-400 text-sm">
                        Le {new Date(quote.quote_accepted_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                    {quote.quote_amount && (
                      <div className="text-green-400 font-bold text-lg mt-2">
                        Montant : {quote.quote_amount} € / an
                      </div>
                    )}
                    {quote.quote_file_url && (
                      <a
                        href={quote.quote_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400 mt-2"
                      >
                        <Eye className="w-4 h-4" />
                        Voir le devis validé
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        title={`Soumettre un devis - ${selectedQuote?.company.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-950/20 rounded-lg p-4 border border-blue-800/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
              <div className="text-sm text-gray-300">
                <strong>Important:</strong> Vous devez uploader le devis de la compagnie.
                Les documents obligatoires seront automatiquement joints lors de l'envoi au client.
              </div>
            </div>
          </div>

          {documents.length > 0 && (
            <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
              <h4 className="text-white font-semibold mb-3">
                Documents qui seront envoyés avec le devis ({documents.length})
              </h4>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm text-gray-400">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>{doc.document_name}</span>
                    {doc.is_mandatory && <Badge variant="warning" size="sm">Obligatoire</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-sm mb-2">Montant du devis (€)</label>
            <input
              type="number"
              step="0.01"
              value={quoteFormData.quote_amount}
              onChange={(e) => setQuoteFormData({ ...quoteFormData, quote_amount: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              placeholder="1250.00"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">URL du devis *</label>
            <input
              type="url"
              value={quoteFormData.quote_file_url}
              onChange={(e) => setQuoteFormData({ ...quoteFormData, quote_file_url: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              placeholder="https://..."
              required
            />
            <p className="text-gray-500 text-xs mt-1">
              Uploadez le devis sur votre stockage et collez l'URL ici
            </p>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Notes internes</label>
            <textarea
              value={quoteFormData.notes}
              onChange={(e) => setQuoteFormData({ ...quoteFormData, notes: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              rows={3}
              placeholder="Notes pour l'équipe..."
            />
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => setIsQuoteModalOpen(false)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={saveQuote}
            disabled={saving || !quoteFormData.quote_file_url}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {saving ? 'Envoi...' : 'Soumettre le devis'}
          </button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={isRefusalModalOpen}
        onClose={() => setIsRefusalModalOpen(false)}
        title={`Declarer un refus - ${selectedQuote?.company.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-red-950/20 rounded-lg p-4 border border-red-800/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
              <div className="text-sm text-gray-300">
                Selectionnez le motif de refus de la compagnie.
                Une capture d'ecran du refus est recommandee pour la tracabilite.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Motif du refus *</label>
            <select
              value={refusalFormData.refusal_reason_code}
              onChange={(e) => setRefusalFormData({ ...refusalFormData, refusal_reason_code: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
              required
            >
              <option value="">-- Selectionnez un motif --</option>
              {refusalReasons.map((reason) => (
                <option key={reason.code} value={reason.code}>
                  {reason.label}
                </option>
              ))}
            </select>
            {refusalFormData.refusal_reason_code && (
              <p className="text-gray-500 text-sm mt-2">
                {refusalReasons.find(r => r.code === refusalFormData.refusal_reason_code)?.description}
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Capture d'ecran du refus (recommande)</label>
            <input
              type="url"
              value={refusalFormData.refusal_screenshot_url}
              onChange={(e) => setRefusalFormData({ ...refusalFormData, refusal_screenshot_url: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              placeholder="https://..."
            />
            <p className="text-gray-500 text-xs mt-1">
              Uploadez la capture d'ecran et collez l'URL ici
            </p>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Details complementaires</label>
            <textarea
              value={refusalFormData.notes}
              onChange={(e) => setRefusalFormData({ ...refusalFormData, notes: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              rows={2}
              placeholder="Informations supplementaires sur le refus..."
            />
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => setIsRefusalModalOpen(false)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={saveRefusal}
            disabled={saving || !refusalFormData.refusal_reason_code}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer le refus'}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
