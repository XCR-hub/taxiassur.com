import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  FileSignature,
  CreditCard,
  Shield
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Contract {
  id: string;
  lead_id: string;
  contract_number?: string;
  insurance_company_id?: string;
  start_date?: string;
  end_date?: string;
  annual_premium?: number;
  payment_frequency?: 'monthly' | 'quarterly' | 'annual';
  status: 'draft' | 'pending_signature' | 'signed' | 'active' | 'cancelled';
  contract_file_url?: string;
  signed_file_url?: string;
  signature_request_sent_at?: string;
  signed_at?: string;
  activated_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ContractWorkflowManagerProps {
  leadId: string;
  leadEmail: string;
  onContractChange?: () => void;
}

export function ContractWorkflowManager({
  leadId,
  leadEmail,
  onContractChange
}: ContractWorkflowManagerProps) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    contract_number: '',
    start_date: '',
    end_date: '',
    annual_premium: '',
    payment_frequency: 'monthly' as 'monthly' | 'quarterly' | 'annual',
    notes: ''
  });

  useEffect(() => {
    loadContract();
  }, [leadId]);

  const loadContract = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_contracts')
        .select(`
          *,
          insurance_companies (
            name,
            code
          )
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setContract(data || null);
    } catch (error) {
      console.error('Error loading contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_contracts')
        .insert({
          lead_id: leadId,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      setContract(data);
      setShowEditModal(true);
      onContractChange?.();
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Erreur lors de la création du contrat');
    }
  };

  const handleUpdateContract = async () => {
    if (!contract) return;

    try {
      const { error } = await supabase
        .from('crm_contracts')
        .update({
          contract_number: editForm.contract_number,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
          annual_premium: editForm.annual_premium ? parseFloat(editForm.annual_premium) : null,
          payment_frequency: editForm.payment_frequency,
          notes: editForm.notes
        })
        .eq('id', contract.id);

      if (error) throw error;

      setShowEditModal(false);
      loadContract();
      onContractChange?.();
    } catch (error) {
      console.error('Error updating contract:', error);
      alert('Erreur lors de la mise à jour du contrat');
    }
  };

  const handleUploadContract = async (file: File) => {
    if (!contract) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}_contract_${Date.now()}.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('crm_contracts')
        .update({ contract_file_url: urlData.publicUrl })
        .eq('id', contract.id);

      if (updateError) throw updateError;

      loadContract();
      onContractChange?.();
    } catch (error) {
      console.error('Error uploading contract:', error);
      alert('Erreur lors du téléversement du contrat');
    } finally {
      setUploading(false);
    }
  };

  const handleSendSignatureRequest = async () => {
    if (!contract || !contract.contract_file_url) {
      alert('Veuillez d\'abord téléverser le contrat');
      return;
    }

    setSending(true);
    try {
      const { error: emailError } = await supabase.functions.invoke(
        'send-crm-email',
        {
          body: {
            to: leadEmail,
            subject: 'Signature de votre contrat d\'assurance taxi',
            template: 'contract_signature_request',
            data: {
              contractUrl: contract.contract_file_url,
              leadId
            }
          }
        }
      );

      if (emailError) throw emailError;

      const { error: updateError } = await supabase
        .from('crm_contracts')
        .update({
          status: 'pending_signature',
          signature_request_sent_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (updateError) throw updateError;

      loadContract();
      onContractChange?.();
    } catch (error) {
      console.error('Error sending signature request:', error);
      alert('Erreur lors de l\'envoi de la demande de signature');
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsSigned = async () => {
    if (!contract) return;

    try {
      const { error } = await supabase
        .from('crm_contracts')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (error) throw error;

      loadContract();
      onContractChange?.();
    } catch (error) {
      console.error('Error marking as signed:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const handleActivateContract = async () => {
    if (!contract) return;

    if (!confirm('Êtes-vous sûr de vouloir activer ce contrat ?')) return;

    try {
      const { error } = await supabase
        .from('crm_contracts')
        .update({
          status: 'active',
          activated_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (error) throw error;

      const { error: leadError } = await supabase
        .from('crm_leads')
        .update({ status: 'CLIENT_ACTIF' })
        .eq('id', leadId);

      if (leadError) throw leadError;

      loadContract();
      onContractChange?.();
    } catch (error) {
      console.error('Error activating contract:', error);
      alert('Erreur lors de l\'activation du contrat');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'signed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending_signature':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'signed':
        return 'Signé';
      case 'pending_signature':
        return 'En attente de signature';
      case 'draft':
        return 'Brouillon';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 mb-4">Aucun contrat créé</p>
        <button
          onClick={handleCreateContract}
          className="inline-flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Créer un contrat
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Contrat {contract.contract_number || `#${contract.id.substring(0, 8)}`}
            </h3>
            <span className={cn(
              'inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium border',
              getStatusColor(contract.status)
            )}>
              {getStatusLabel(contract.status)}
            </span>
          </div>
          <button
            onClick={() => {
              setEditForm({
                contract_number: contract.contract_number || '',
                start_date: contract.start_date || '',
                end_date: contract.end_date || '',
                annual_premium: contract.annual_premium?.toString() || '',
                payment_frequency: contract.payment_frequency || 'monthly',
                notes: contract.notes || ''
              });
              setShowEditModal(true);
            }}
            className="inline-flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {contract.start_date && (
            <div>
              <p className="text-sm text-gray-600">Date de début</p>
              <p className="text-base font-medium text-gray-900">
                {formatDate(contract.start_date)}
              </p>
            </div>
          )}

          {contract.end_date && (
            <div>
              <p className="text-sm text-gray-600">Date de fin</p>
              <p className="text-base font-medium text-gray-900">
                {formatDate(contract.end_date)}
              </p>
            </div>
          )}

          {contract.annual_premium && (
            <div>
              <p className="text-sm text-gray-600">Prime annuelle</p>
              <p className="text-base font-medium text-gray-900">
                {contract.annual_premium.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR'
                })}
              </p>
            </div>
          )}

          {contract.payment_frequency && (
            <div>
              <p className="text-sm text-gray-600">Fréquence de paiement</p>
              <p className="text-base font-medium text-gray-900">
                {contract.payment_frequency === 'monthly' ? 'Mensuel' :
                 contract.payment_frequency === 'quarterly' ? 'Trimestriel' : 'Annuel'}
              </p>
            </div>
          )}
        </div>

        {contract.notes && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-gray-700">{contract.notes}</p>
          </div>
        )}

        <div className="space-y-3">
          {contract.status === 'draft' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléverser le contrat
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadContract(file);
                }}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              />
            </div>
          )}

          {contract.contract_file_url && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Contrat téléversé
                </span>
              </div>
              <a
                href={contract.contract_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4 mr-1" />
                Télécharger
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {contract.status === 'draft' && contract.contract_file_url && (
            <button
              onClick={handleSendSignatureRequest}
              disabled={sending}
              className="inline-flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Envoi...' : 'Envoyer pour signature'}
            </button>
          )}

          {contract.status === 'pending_signature' && (
            <button
              onClick={handleMarkAsSigned}
              className="inline-flex items-center px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileSignature className="w-4 h-4 mr-2" />
              Marquer comme signé
            </button>
          )}

          {contract.status === 'signed' && (
            <button
              onClick={handleActivateContract}
              className="inline-flex items-center px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Shield className="w-4 h-4 mr-2" />
              Activer le contrat
            </button>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Modifier le contrat
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de contrat
                </label>
                <input
                  type="text"
                  value={editForm.contract_number}
                  onChange={(e) => setEditForm({ ...editForm, contract_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prime annuelle
                  </label>
                  <input
                    type="number"
                    value={editForm.annual_premium}
                    onChange={(e) => setEditForm({ ...editForm, annual_premium: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fréquence de paiement
                  </label>
                  <select
                    value={editForm.payment_frequency}
                    onChange={(e) => setEditForm({ ...editForm, payment_frequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="monthly">Mensuel</option>
                    <option value="quarterly">Trimestriel</option>
                    <option value="annual">Annuel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateContract}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractWorkflowManager;
