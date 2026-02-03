import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Send, CheckCircle, XCircle, Clock, Building2, Euro, Calendar, Loader2, Mail, AlertCircle } from 'lucide-react';

interface Quote {
  id: string;
  lead_id: string;
  insurance_company_id: string;
  quote_amount: number;
  status: 'pending' | 'sent' | 'accepted' | 'rejected';
  sent_at: string | null;
  valid_until: string | null;
  notes: string | null;
  last_sent_at: string | null;
  created_at: string;
  insurance_companies: {
    name: string;
    logo_url: string | null;
  };
}

interface InsuranceCompany {
  id: string;
  name: string;
  logo_url: string | null;
}

interface LeadQuotesManagerProps {
  leadId: string;
}

export default function LeadQuotesManager({ leadId }: LeadQuotesManagerProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sendingQuote, setSendingQuote] = useState<string | null>(null);

  const [newQuote, setNewQuote] = useState({
    insurance_company_id: '',
    quote_amount: '',
    valid_until: '',
    notes: '',
  });

  useEffect(() => {
    loadQuotes();
    loadCompanies();
  }, [leadId]);

  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_company_quotes')
        .select(`
          *,
          insurance_companies (
            name,
            logo_url
          )
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('id, name, logo_url')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('lead_company_quotes')
        .insert({
          lead_id: leadId,
          insurance_company_id: newQuote.insurance_company_id,
          quote_amount: parseFloat(newQuote.quote_amount),
          valid_until: newQuote.valid_until || null,
          notes: newQuote.notes || null,
          status: 'pending',
        });

      if (error) throw error;

      setNewQuote({
        insurance_company_id: '',
        quote_amount: '',
        valid_until: '',
        notes: '',
      });
      setShowAddForm(false);
      loadQuotes();
    } catch (error) {
      console.error('Error adding quote:', error);
      alert('Erreur lors de l\'ajout du devis');
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir envoyer ce devis au prospect ?')) {
      return;
    }

    try {
      setSendingQuote(quoteId);

      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: { quoteId },
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('lead_company_quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_sent_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      alert('Devis envoyé avec succès !');
      loadQuotes();
    } catch (error) {
      console.error('Error sending quote:', error);
      alert('Erreur lors de l\'envoi du devis');
    } finally {
      setSendingQuote(null);
    }
  };

  const handleResendQuote = async (quoteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir renvoyer ce devis au prospect ?')) {
      return;
    }

    try {
      setSendingQuote(quoteId);

      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: { quoteId },
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('lead_company_quotes')
        .update({
          last_sent_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      alert('Devis renvoyé avec succès !');
      loadQuotes();
    } catch (error) {
      console.error('Error resending quote:', error);
      alert('Erreur lors du renvoi du devis');
    } finally {
      setSendingQuote(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      sent: { icon: Send, color: 'bg-blue-100 text-blue-800', label: 'Envoyé' },
      accepted: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Accepté' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Refusé' },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Devis</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showAddForm ? 'Annuler' : '+ Nouveau devis'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddQuote} className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compagnie d'assurance
              </label>
              <select
                value={newQuote.insurance_company_id}
                onChange={(e) => setNewQuote({ ...newQuote, insurance_company_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionnez une compagnie</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant du devis (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={newQuote.quote_amount}
                onChange={(e) => setNewQuote({ ...newQuote, quote_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="1500.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valable jusqu'au
              </label>
              <input
                type="date"
                value={newQuote.valid_until}
                onChange={(e) => setNewQuote({ ...newQuote, valid_until: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={newQuote.notes}
                onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Notes optionnelles..."
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Ajouter le devis
            </button>
          </div>
        </form>
      )}

      <div className="p-6">
        {quotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun devis pour ce lead</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {quote.insurance_companies.logo_url ? (
                      <img
                        src={quote.insurance_companies.logo_url}
                        alt={quote.insurance_companies.name}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {quote.insurance_companies.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Créé le {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(quote.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Montant</p>
                      <p className="font-semibold">{quote.quote_amount.toFixed(2)} €</p>
                    </div>
                  </div>

                  {quote.valid_until && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Valable jusqu'au</p>
                        <p className="font-semibold">
                          {new Date(quote.valid_until).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}

                  {quote.sent_at && (
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Envoyé le</p>
                        <p className="font-semibold">
                          {new Date(quote.sent_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}

                  {quote.last_sent_at && quote.last_sent_at !== quote.sent_at && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Dernier envoi</p>
                        <p className="font-semibold">
                          {new Date(quote.last_sent_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {quote.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">{quote.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {quote.status === 'pending' && (
                    <button
                      onClick={() => handleSendQuote(quote.id)}
                      disabled={sendingQuote === quote.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sendingQuote === quote.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Envoyer au prospect
                        </>
                      )}
                    </button>
                  )}

                  {quote.status === 'sent' && (
                    <button
                      onClick={() => handleResendQuote(quote.id)}
                      disabled={sendingQuote === quote.id}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      {sendingQuote === quote.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Renvoyer
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
