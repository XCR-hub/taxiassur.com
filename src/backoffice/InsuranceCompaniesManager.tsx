import React, { useEffect, useState } from 'react';
import { Building2, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const InsuranceCompaniesManager: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Failed to load companies:', error);
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
            <h1 className="text-4xl font-bold text-white mb-2">Compagnies Assurance</h1>
            <p className="text-gray-400">Gestion des compagnies partenaires</p>
          </div>
          <Link
            to="/backoffice"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
          >
            <Home className="w-4 h-4" />
            Retour
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div key={company.id} className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="h-12 object-contain" />
                ) : (
                  <Building2 className="w-12 h-12 text-gray-400" />
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  company.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {company.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">{company.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InsuranceCompaniesManager;
