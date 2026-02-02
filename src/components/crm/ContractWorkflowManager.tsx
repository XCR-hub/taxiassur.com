import { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle, AlertCircle, Building2, Download, Eye, FileSignature, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ElectronicSignature from '@/components/ElectronicSignature';

interface Props {
  leadId: string;
  companyId?: string;
}

interface Company {
  id: string;
  name: string;
  code: string;
  workflow_type: 'grossiste' | 'delegation_totale';
}

interface ContractDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  status: string;
  created_at: string;
  requires_signature: boolean;
  is_signed: boolean;
  signed_at: string | null;
}

interface Signature {
  id: string;
  signature_type: string;
  signed_by_name: string;
  signed_at: string;
}

interface Payment {
  id: string;
  payment_type: string;
  amount: number;
  payment_method: string;
  status: string;
  managed_by: string;
}

const DOCUMENT_TYPES = {
  devis: { label: 'Devis', icon: FileText, iconColor: 'text-blue-600' },
  contrat: { label: 'Contrat', icon: FileSignature, iconColor: 'text-green-600' },
  attestation: { label: 'Attestation', icon: CheckCircle, iconColor: 'text-purple-600' },
  conditions_generales: { label: 'Conditions Générales', icon: FileText, iconColor: 'text-gray-600' },
  ipid: { label: 'IPID', icon: FileText, iconColor: 'text-gray-600' },
  mandat_sepa: { label: 'Mandat SEPA', icon: CreditCard, iconColor: 'text-orange-600' }
};

export default function ContractWorkflowManager({ leadId, companyId: initialCompanyId }: Props) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(initialCompanyId);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<string>('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [documentToSign, setDocumentToSign] = useState<ContractDocument | null>(null);

  useEffect(() => {
    loadAvailableCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadData();
    }
  }, [leadId, selectedCompanyId]);

  const loadAvailableCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('is_active', true)
        .eq('is_mandatory', true)
        .order('priority_order');

      if (error) throw error;
      setAvailableCompanies(data || []);

      // Si aucune compagnie n'est sélectionnée et qu'il y a des compagnies, sélectionner la première
      if (!selectedCompanyId && data && data.length > 0) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement compagnies:', error);
    }
  };

  const loadData = async () => {
    if (!selectedCompanyId) return;

    try {
      setLoading(true);

      const [companyRes, docsRes, signaturesRes, paymentsRes, existingQuoteRes] = await Promise.all([
        supabase.from('insurance_companies').select('*').eq('id', selectedCompanyId).single(),
        supabase.from('contract_documents').select('*').eq('lead_id', leadId).eq('company_id', selectedCompanyId),
        supabase.from('lead_contract_signatures').select('*').eq('lead_id', leadId).eq('company_id', selectedCompanyId),
        supabase.from('lead_contract_payments').select('*').eq('lead_id', leadId).eq('company_id', selectedCompanyId),
        // Récupérer le devis déjà uploadé dans l'onglet "Devis & Tarifs"
        supabase.from('lead_company_quotes').select('quote_file_url, quote_amount').eq('lead_id', leadId).eq('company_id', selectedCompanyId).maybeSingle()
      ]);

      if (companyRes.data) setCompany(companyRes.data);
      if (docsRes.data) setDocuments(docsRes.data);
      if (signaturesRes.data) setSignatures(signaturesRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);

      // Si un devis existe déjà dans "Devis & Tarifs" mais pas dans "contract_documents", l'ajouter automatiquement
      if (existingQuoteRes.data?.quote_file_url) {
        const hasDevisInContract = docsRes.data?.some(d => d.document_type === 'devis');

        if (!hasDevisInContract) {
          console.log('📋 Devis trouvé dans l\'onglet Quotes, ajout automatique au contrat');

          const { error: insertError } = await supabase.from('contract_documents').insert({
            lead_id: leadId,
            company_id: selectedCompanyId,
            document_type: 'devis',
            document_name: `Devis ${companyRes.data?.name}.pdf`,
            file_url: existingQuoteRes.data.quote_file_url,
            status: 'uploaded',
            requires_signature: false,
            is_signed: false
          });

          if (!insertError) {
            // Recharger les documents
            const { data: updatedDocs } = await supabase
              .from('contract_documents')
              .select('*')
              .eq('lead_id', leadId)
              .eq('company_id', selectedCompanyId);

            if (updatedDocs) setDocuments(updatedDocs);
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement contrat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadType(docType);

      // Upload vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${companyId}/${docType}_${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('contract-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(fileName);

      // Créer l'enregistrement en base
      const { error: dbError } = await supabase
        .from('contract_documents')
        .insert({
          lead_id: leadId,
          company_id: selectedCompanyId,
          workflow_id: leadId, // Compatibilité avec l'ancienne structure
          document_type: docType,
          document_name: file.name,
          file_path: fileName,
          file_url: publicUrl,
          file_size_bytes: file.size,
          mime_type: file.type,
          status: 'uploaded',
          requires_signature: company?.workflow_type === 'delegation_totale' && ['devis', 'contrat', 'mandat_sepa'].includes(docType)
        });

      if (dbError) throw dbError;

      alert(`✅ ${DOCUMENT_TYPES[docType as keyof typeof DOCUMENT_TYPES].label} uploadé avec succès`);
      loadData();
    } catch (error: any) {
      console.error('Erreur upload:', error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadType('');
    }
  };

  const handleRequestSignature = (doc: ContractDocument) => {
    setDocumentToSign(doc);
    setShowSignatureModal(true);
  };

  const handleSignatureComplete = async (signatureData: string) => {
    if (!documentToSign) return;

    try {
      // Enregistrer la signature
      const { error } = await supabase
        .from('lead_contract_signatures')
        .insert({
          lead_id: leadId,
          company_id: selectedCompanyId!,
          document_id: documentToSign.id,
          signature_type: documentToSign.document_type,
          signature_data: signatureData,
          signed_by_name: 'Commercial',
          signed_by_email: 'commercial@taxiassur.com'
        });

      if (error) throw error;

      // Mettre à jour le document
      await supabase
        .from('contract_documents')
        .update({ is_signed: true, signed_at: new Date().toISOString(), status: 'signed' })
        .eq('id', documentToSign.id);

      alert('✅ Document signé avec succès');
      setShowSignatureModal(false);
      setDocumentToSign(null);
      loadData();
    } catch (error: any) {
      console.error('Erreur signature:', error);
      alert(`❌ Erreur: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
        <p className="text-red-800">Compagnie non trouvée</p>
      </div>
    );
  }

  const isGrossiste = company.workflow_type === 'grossiste';
  const isDelegation = company.workflow_type === 'delegation_totale';

  return (
    <div className="space-y-6">
      {/* Sélecteur de compagnie */}
      {availableCompanies.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Compagnie d'assurance
          </label>
          <select
            value={selectedCompanyId || ''}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {availableCompanies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.workflow_type === 'delegation_totale' ? '(Délégation totale)' : '(Grossiste)'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* En-tête workflow */}
      <div className={`rounded-lg p-4 ${isDelegation ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-center gap-3">
          <Building2 className={`w-6 h-6 ${isDelegation ? 'text-green-600' : 'text-blue-600'}`} />
          <div>
            <h3 className="font-bold text-lg text-gray-900">{company.name}</h3>
            <p className={`text-sm font-semibold ${isDelegation ? 'text-green-800' : 'text-blue-800'}`}>
              {isDelegation ? '⚡ Délégation Totale - Workflow complet TaxiAssur' : '🏢 Courtier Grossiste - Suivi documentaire uniquement'}
            </p>
          </div>
        </div>
        {isDelegation && (
          <div className="mt-3 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-green-900 font-medium">
              ✅ TaxiAssur gère l'intégralité du processus (devis, contrat, signature, paiement, attestation)
            </p>
          </div>
        )}
        {isGrossiste && (
          <div className="mt-3 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-900 font-medium">
              📋 La compagnie gère le processus. TaxiAssur assure uniquement le suivi des documents.
            </p>
          </div>
        )}
      </div>

      {/* Upload de documents */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h4 className="font-bold text-lg text-gray-900 mb-4">
          📄 Documents du contrat
        </h4>

        {isGrossiste && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium">
              ℹ️ Pour les courtiers grossistes, seul le <strong>devis</strong> est géré par TaxiAssur.
              Les autres documents (contrat, attestation, etc.) sont envoyés directement par la compagnie au client.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(DOCUMENT_TYPES).map(([type, config]) => {
            // Pour les grossistes, afficher uniquement le devis
            if (isGrossiste && type !== 'devis') {
              return null;
            }

            const doc = documents.find(d => d.document_type === type);
            const Icon = config.icon;

            return (
              <div key={type} className="border border-gray-300 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                    <span className="font-semibold text-gray-900">{config.label}</span>
                  </div>
                  {doc && (
                    <div className="flex items-center gap-2 text-sm">
                      {doc.is_signed && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {doc.requires_signature && !doc.is_signed && (
                        <FileSignature className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                  )}
                </div>

                {doc ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 truncate font-medium">{doc.document_name}</p>
                    <div className="flex gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </a>
                      {isDelegation && doc.requires_signature && !doc.is_signed && (
                        <button
                          onClick={() => handleRequestSignature(doc)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold"
                        >
                          <FileSignature className="w-4 h-4" />
                          Signer
                        </button>
                      )}
                    </div>
                    {isGrossiste && type === 'devis' && (
                      <p className="text-xs text-blue-700 mt-2">
                        ℹ️ Devis récupéré depuis l'onglet "Devis & Tarifs"
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {isDelegation ? (
                      <label htmlFor={`upload-${type}-${leadId}`} className="block">
                        <input
                          id={`upload-${type}-${leadId}`}
                          name={`upload-${type}`}
                          type="file"
                          onChange={(e) => handleFileUpload(e, type)}
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          disabled={uploading}
                          aria-label={`Uploader ${config.label}`}
                        />
                        <div className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          uploading && uploadType === type
                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-gray-400 hover:border-blue-500 hover:bg-blue-50 text-gray-700 hover:text-blue-700'
                        }`}>
                          {uploading && uploadType === type ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              <span className="text-sm font-semibold">Upload...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span className="text-sm font-semibold">Uploader</span>
                            </>
                          )}
                        </div>
                      </label>
                    ) : (
                      <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <span className="text-sm text-gray-500">En attente du devis</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Paiement (uniquement pour délégation totale) */}
      {isDelegation && (
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h4 className="font-bold text-lg text-gray-900 mb-4">💳 Paiement</h4>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Workflow Generali :</strong> Une fois le devis signé, vous devrez enregistrer le paiement comptant ou le prélèvement.
            </p>
          </div>

          {payments.length > 0 && (
            <div className="mt-4 space-y-2">
              {payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                  <div>
                    <span className="font-semibold text-gray-900">{payment.payment_type}</span>
                    <span className="text-gray-700 ml-2 font-medium">{payment.amount} €</span>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-bold ${
                    payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal signature */}
      {showSignatureModal && documentToSign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Signature électronique</h3>
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  setDocumentToSign(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Document : <strong className="text-gray-900">{documentToSign.document_name}</strong>
            </p>
            <ElectronicSignature
              onSignatureComplete={handleSignatureComplete}
              onCancel={() => {
                setShowSignatureModal(false);
                setDocumentToSign(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
