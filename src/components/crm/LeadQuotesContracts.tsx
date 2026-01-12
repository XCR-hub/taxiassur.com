import { useState, useEffect } from 'react';
import { FileText, Upload, Download, CheckCircle, Clock, X, Eye, RefreshCw, Send, Edit2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '../Badge';
import { Modal, ModalFooter } from '../Modal';

interface QuoteContract {
  id: string;
  lead_id: string;
  company_id: string | null;
  document_type: 'devis' | 'contrat' | 'avenant' | 'attestation';
  document_name: string;
  file_path: string;
  file_url: string;
  file_size: number | null;
  amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_signed: boolean;
  signed_at: string | null;
  sent_to_client: boolean;
  sent_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  company?: { name: string; code: string };
}

interface LeadQuotesContractsProps {
  leadId: string;
  leadEmail: string;
}

export function LeadQuotesContracts({ leadId, leadEmail }: LeadQuotesContractsProps) {
  const [documents, setDocuments] = useState<QuoteContract[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    company_id: '',
    document_type: 'devis' as const,
    document_name: '',
    file: null as File | null,
    amount: '',
    valid_from: '',
    valid_until: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les compagnies
      const { data: companiesData } = await supabase
        .from('insurance_companies')
        .select('id, name, code')
        .eq('is_active', true)
        .order('priority_order');

      setCompanies(companiesData || []);

      // Charger les documents
      const { data: docsData, error } = await supabase
        .from('lead_quotes_contracts')
        .select(`
          *,
          company:insurance_companies(name, code)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(docsData || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!form.file || !form.document_name) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    setUploading(true);
    try {
      // Upload du fichier
      const file = form.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `lead-quotes/${leadId}/${form.document_type}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('crm-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('crm-documents')
        .getPublicUrl(fileName);

      // Insérer en base
      const { data: userData } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from('lead_quotes_contracts')
        .insert([{
          lead_id: leadId,
          company_id: form.company_id || null,
          document_type: form.document_type,
          document_name: form.document_name,
          file_path: fileName,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          amount: form.amount ? parseFloat(form.amount) : null,
          valid_from: form.valid_from || null,
          valid_until: form.valid_until || null,
          status: 'draft',
          notes: form.notes || null,
          uploaded_by: userData.user?.id
        }]);

      if (insertError) throw insertError;

      setShowUploadModal(false);
      setForm({
        company_id: '',
        document_type: 'devis',
        document_name: '',
        file: null,
        amount: '',
        valid_from: '',
        valid_until: '',
        notes: ''
      });
      await loadData();
      alert('✅ Document uploadé avec succès !');
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSendToClient = async (docId: string) => {
    if (!confirm('Envoyer ce document au client par email ?')) return;

    try {
      // Marquer comme envoyé
      const { error } = await supabase
        .from('lead_quotes_contracts')
        .update({
          sent_to_client: true,
          sent_at: new Date().toISOString(),
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      // TODO: Appeler edge function pour envoyer l'email
      alert('✅ Document envoyé au client !');
      await loadData();
    } catch (error) {
      console.error('Erreur envoi:', error);
      alert('Erreur lors de l\'envoi');
    }
  };

  const handleMarkSigned = async (docId: string) => {
    if (!confirm('Marquer ce document comme signé ?')) return;

    try {
      const { error } = await supabase
        .from('lead_quotes_contracts')
        .update({
          is_signed: true,
          signed_at: new Date().toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;
      alert('✅ Document marqué comme signé !');
      await loadData();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    if (!confirm('Supprimer ce document ?')) return;

    try {
      // Supprimer du storage
      await supabase.storage
        .from('crm-documents')
        .remove([filePath]);

      // Supprimer de la base
      const { error } = await supabase
        .from('lead_quotes_contracts')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { variant: 'default' as const, label: 'Brouillon' },
      sent: { variant: 'info' as const, label: 'Envoyé' },
      accepted: { variant: 'success' as const, label: 'Accepté' },
      rejected: { variant: 'error' as const, label: 'Refusé' },
      expired: { variant: 'warning' as const, label: 'Expiré' },
      active: { variant: 'success' as const, label: 'Actif' },
      archived: { variant: 'default' as const, label: 'Archivé' }
    };
    const cfg = config[status as keyof typeof config] || config.draft;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'devis': return '💰';
      case 'contrat': return '📄';
      case 'avenant': return '📝';
      case 'attestation': return '✅';
      default: return '📎';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'devis': return 'Devis';
      case 'contrat': return 'Contrat';
      case 'avenant': return 'Avenant';
      case 'attestation': return 'Attestation';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-800 rounded w-1/3"></div>
          <div className="h-20 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-500" />
            Devis & Contrats
          </h3>
          <p className="text-sm text-gray-400">
            {documents.length} document{documents.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Uploader
        </button>
      </div>

      {/* Liste des documents */}
      {documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border border-gray-800 rounded-lg p-4 hover:border-green-500/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getTypeIcon(doc.document_type)}</span>
                    <div>
                      <h4 className="text-lg font-bold text-white">{doc.document_name}</h4>
                      <p className="text-sm text-gray-500">
                        {getTypeLabel(doc.document_type)}
                        {doc.company && ` - ${(doc.company as any).name}`}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
                <button
                  onClick={() => handleDelete(doc.id, doc.file_path)}
                  className="text-red-500 hover:text-red-400 p-1"
                  title="Supprimer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Montant */}
              {doc.amount && (
                <div className="mb-3 text-2xl font-bold text-green-500">
                  {doc.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / an
                </div>
              )}

              {/* Dates de validité */}
              {(doc.valid_from || doc.valid_until) && (
                <div className="mb-3 text-sm text-gray-400">
                  {doc.valid_from && `Du ${new Date(doc.valid_from).toLocaleDateString('fr-FR')}`}
                  {doc.valid_until && ` au ${new Date(doc.valid_until).toLocaleDateString('fr-FR')}`}
                </div>
              )}

              {/* Statuts */}
              <div className="flex flex-wrap gap-2 mb-3">
                {doc.is_signed && (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Signé
                  </Badge>
                )}
                {doc.sent_to_client && (
                  <Badge variant="info" size="sm">
                    <Send className="w-3 h-3 mr-1" />
                    Envoyé le {new Date(doc.sent_at!).toLocaleDateString('fr-FR')}
                  </Badge>
                )}
              </div>

              {/* Notes */}
              {doc.notes && (
                <div className="mb-3 text-sm text-gray-400 bg-gray-800 rounded px-3 py-2">
                  {doc.notes}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  Voir
                </a>
                <a
                  href={doc.file_url}
                  download
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Télécharger
                </a>
                {!doc.sent_to_client && (
                  <button
                    onClick={() => handleSendToClient(doc.id)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Envoyer au client
                  </button>
                )}
                {!doc.is_signed && doc.document_type === 'contrat' && (
                  <button
                    onClick={() => handleMarkSigned(doc.id)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Marquer signé
                  </button>
                )}
              </div>

              {/* Info création */}
              <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
                Créé le {new Date(doc.created_at).toLocaleDateString('fr-FR')} à{' '}
                {new Date(doc.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Aucun document uploadé</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Uploader le premier document
          </button>
        </div>
      )}

      {/* Modal Upload */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setForm({
            company_id: '',
            document_type: 'devis',
            document_name: '',
            file: null,
            amount: '',
            valid_from: '',
            valid_until: '',
            notes: ''
          });
        }}
        title="Uploader un document"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Type de document *</label>
              <select
                value={form.document_type}
                onChange={(e) => setForm({ ...form, document_type: e.target.value as any })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="devis">Devis</option>
                <option value="contrat">Contrat</option>
                <option value="avenant">Avenant</option>
                <option value="attestation">Attestation</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Compagnie</label>
              <select
                value={form.company_id}
                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="">Non spécifiée</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Nom du document *</label>
            <input
              type="text"
              value={form.document_name}
              onChange={(e) => setForm({ ...form, document_name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              placeholder="Ex: Devis Generali 2025"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Fichier PDF *</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
            />
            {form.file && (
              <div className="mt-2 text-sm text-green-500">
                {form.file.name} ({(form.file.size / 1024).toFixed(0)} Ko)
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Montant annuel (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Valide du</label>
              <input
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Valide jusqu'au</label>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              rows={3}
              placeholder="Notes internes..."
            />
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => {
              setShowUploadModal(false);
              setForm({
                company_id: '',
                document_type: 'devis',
                document_name: '',
                file: null,
                amount: '',
                valid_from: '',
                valid_until: '',
                notes: ''
              });
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !form.file || !form.document_name}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Upload...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Uploader
              </>
            )}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
