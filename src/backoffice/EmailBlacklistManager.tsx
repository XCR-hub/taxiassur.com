import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Plus, Trash2, AlertCircle, CheckCircle, X, Search, Filter } from 'lucide-react';

interface BlacklistEntry {
  id: string;
  email_pattern: string;
  pattern_type: 'exact' | 'domain' | 'contains';
  reason: string;
  is_active: boolean;
  created_at: string;
}

interface DeletionLog {
  id: string;
  lead_email: string;
  lead_name: string;
  deletion_reason: string;
  deleted_at: string;
  lead_data: any;
}

export default function EmailBlacklistManager() {
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [deletionLogs, setDeletionLogs] = useState<DeletionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'blacklist' | 'logs'>('blacklist');

  // Nouveau pattern à ajouter
  const [newPattern, setNewPattern] = useState({
    email_pattern: '',
    pattern_type: 'domain' as 'exact' | 'domain' | 'contains',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger la liste noire
      const { data: blacklistData } = await supabase
        .from('email_blacklist')
        .select('*')
        .order('created_at', { ascending: false });

      if (blacklistData) {
        setBlacklist(blacklistData);
      }

      // Charger les logs de suppression
      const { data: logsData } = await supabase
        .from('lead_deletion_log')
        .select('*')
        .order('deleted_at', { ascending: false })
        .limit(100);

      if (logsData) {
        setDeletionLogs(logsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToBlacklist = async () => {
    if (!newPattern.email_pattern || !newPattern.reason) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const { error } = await supabase
        .from('email_blacklist')
        .insert([newPattern]);

      if (error) throw error;

      alert('Pattern ajouté à la liste noire ✓');
      setShowAddModal(false);
      setNewPattern({ email_pattern: '', pattern_type: 'domain', reason: '' });
      loadData();
    } catch (error: any) {
      alert(`Erreur : ${error.message}`);
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('email_blacklist')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      alert(`Erreur : ${error.message}`);
    }
  };

  const deletePattern = async (id: string) => {
    if (!confirm('Supprimer ce pattern de la liste noire ?')) return;

    try {
      const { error } = await supabase
        .from('email_blacklist')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      alert(`Erreur : ${error.message}`);
    }
  };

  const filteredBlacklist = blacklist.filter(entry =>
    entry.email_pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = deletionLogs.filter(log =>
    log.lead_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.lead_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.deletion_reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-500 to-pink-600 p-3 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestion des Emails & Suppressions
              </h1>
              <p className="text-gray-600">
                Liste noire automatique et logs d'audit
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter un pattern
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('blacklist')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'blacklist'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Liste Noire ({blacklist.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'logs'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Logs de Suppression ({deletionLogs.length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      ) : activeTab === 'blacklist' ? (
        /* Liste Noire */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Pattern
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Raison
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ajouté le
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBlacklist.map((entry) => (
                  <tr key={entry.id} className={!entry.is_active ? 'bg-gray-50 opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <X className="w-3 h-3 mr-1" />
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">
                        {entry.email_pattern}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.pattern_type === 'exact' ? 'bg-blue-100 text-blue-800' :
                        entry.pattern_type === 'domain' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {entry.pattern_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleActive(entry.id, entry.is_active)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        {entry.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => deletePattern(entry.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Logs de Suppression */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Raison
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Supprimé le
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.lead_name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">
                        {log.lead_email}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.deletion_reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(log.deleted_at).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Ajouter un pattern à la liste noire
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type de pattern
                </label>
                <select
                  value={newPattern.pattern_type}
                  onChange={(e) => setNewPattern({ ...newPattern, pattern_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-gray-900 bg-white"
                >
                  <option value="domain">Domaine (ex: ionos.com)</option>
                  <option value="exact">Email exact (ex: spam@example.com)</option>
                  <option value="contains">Contient (ex: noreply)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pattern
                </label>
                <input
                  type="text"
                  value={newPattern.email_pattern}
                  onChange={(e) => setNewPattern({ ...newPattern, email_pattern: e.target.value })}
                  placeholder="ionos.com, noreply, spam@example.com..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Raison
                </label>
                <input
                  type="text"
                  value={newPattern.reason}
                  onChange={(e) => setNewPattern({ ...newPattern, reason: e.target.value })}
                  placeholder="Email de service, spam, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-gray-900 bg-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={addToBlacklist}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
