import React, { useEffect, useState } from 'react';
import { Receipt, Home, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const QuotesManager: React.FC = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_company_quotes')
        .select(`
          *,
          crm_leads!inner(prenom, nom, email),
          insurance_companies!inner(name, logo_url)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Failed to load quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Gestion des Devis</h1>
            <p className="text-gray-400">Tous les devis envoyés aux prospects</p>
          </div>
          <Link
            to="/backoffice"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
          >
            <Home className="w-4 h-4" />
            Retour
          </Link>
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Prospect</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Compagnie</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Montant</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Aucun devis trouvé</p>
                    </td>
                  </tr>
                ) : (
                  quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {quote.crm_leads.prenom} {quote.crm_leads.nom}
                        </div>
                        <div className="text-sm text-gray-500">{quote.crm_leads.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {quote.insurance_companies.logo_url && (
                            <img
                              src={quote.insurance_companies.logo_url}
                              alt={quote.insurance_companies.name}
                              className="h-6 object-contain"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {quote.insurance_companies.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-gray-900">
                          {quote.amount ? `${quote.amount}€` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          quote.status === 'validated' ? 'bg-green-100 text-green-700' :
                          quote.status === 'refused' ? 'bg-red-100 text-red-700' :
                          quote.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {quote.status === 'validated' && <CheckCircle className="w-3 h-3" />}
                          {quote.status === 'refused' && <XCircle className="w-3 h-3" />}
                          {quote.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotesManager;
