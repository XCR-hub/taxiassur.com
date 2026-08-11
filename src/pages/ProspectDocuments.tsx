import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Upload, CheckCircle, AlertCircle, FileText, Loader2, X } from 'lucide-react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import { withTimeout } from '@/lib/promise-timeout';
import ComplementaryDocuments from '@/components/client/ComplementaryDocuments';

interface DocumentType {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

interface ProspectLeadInfo {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}
interface UploadedDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_name?: string;
  file_size: number;
  uploaded_at: string;
  status: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'licence_taxi',
    label: 'Licence de taxi professionnelle',
    description: 'En cours de validité',
    required: true
  },
  {
    id: 'permis_conduire',
    label: 'Permis de conduire',
    description: 'Recto-verso, lisible',
    required: true
  },
  {
    id: 'piece_identite',
    label: 'Pièce d\'identité',
    description: 'CNI ou passeport valide',
    required: true
  },
  {
    id: 'carte_grise',
    label: 'Carte grise du véhicule',
    description: 'Certificat d\'immatriculation',
    required: true
  },
  {
    id: 'releve_information',
    label: 'Relevé d\'information',
    description: 'De votre assureur précédent (si applicable)',
    required: false
  },
  {
    id: 'autorisation_stationnement',
    label: 'Autorisation de stationnement',
    description: 'Autorisation préfectorale de stationnement taxi',
    required: true
  },
  {
    id: 'rib',
    label: 'RIB - Relevé d\'Identité Bancaire',
    description: 'Coordonnées bancaires complètes',
    required: true
  },
  {
    id: 'kbis',
    label: 'KBIS / SIRENE',
    description: 'Pour les sociétés (si applicable)',
    required: false
  }
];

const ProspectDocuments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams<{ token: string }>();
  const token = params.token || searchParams.get('token');

  const [leadInfo, setLeadInfo] = useState<ProspectLeadInfo | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [anonClient, setAnonClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    const initClient = () => {
      try {
        const supabaseUrl = getSupabaseUrl();
        const supabaseKey = getSupabaseAnonKey();

        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Configuration Supabase publique manquante pour l espace prospect');
        }

        console.log('🔧 Initializing anon client for prospect documents');
        console.log('URL:', supabaseUrl);

        const client = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        setAnonClient(client);
        console.log('✅ Anon client initialized');
      } catch (error) {
        console.error('❌ Error initializing anon client:', error);
        setError('Erreur de configuration');
        setLoading(false);
      }
    };
    initClient();
  }, []);

  useEffect(() => {
    if (token && anonClient) {
      loadLeadInfo();
    }
  }, [token, anonClient]);

  useEffect(() => {
    if (leadInfo?.id && anonClient) {
      loadDocuments();
    }
  }, [leadInfo, anonClient]);

  const loadLeadInfo = async () => {
    if (!anonClient) {
      console.log('⚠️ Anon client not ready yet');
      return;
    }

    try {
      const { data: leadData, error: leadError } = await anonClient
        .rpc('get_lead_by_token', { p_token: token })
        .maybeSingle();
      if (leadError) throw leadError;
      if (leadData?.lead) {
        setLeadInfo(leadData.lead);
      } else {
        console.log('⚠️ No lead found for this token');
        setError('Lien invalide ou expiré');
      }
    } catch (err) {
      console.error('❌ Load lead error:', err);
      setError('Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!leadInfo?.id || !anonClient) return;

    try {
      const { data, error } = await anonClient.rpc('get_prospect_documents_by_token', { p_token: token });
      if (error) throw error;
      setUploadedDocuments(data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!token || !leadInfo?.id || !anonClient) return;

    setUploading(documentType);
    setError(null);
    setSuccess(null);

    try {
      const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error('Fichier trop volumineux (max 10 Mo)');
      if (!acceptedTypes.includes(file.type)) throw new Error('Format accepté : PDF, JPG, PNG ou WebP');
      const request = { accessToken: token, scope: 'prospect', documentType, fileName: file.name, fileSize: file.size, mimeType: file.type };
      const { data: prepared, error: prepareError } = await withTimeout(anonClient.functions.invoke('upload-client-document', { body: { action: 'prepare', ...request } }), 20_000);
      if (prepareError || !prepared?.path || !prepared.uploadToken) throw prepareError || new Error('Préparation impossible');
      const path = String(prepared.path);
      const { error: uploadError } = await withTimeout(anonClient.storage.from('prospect-documents').uploadToSignedUrl(path, String(prepared.uploadToken), file, { contentType: file.type }), 60_000);
      if (uploadError) throw uploadError;
      const { data: finalized, error: finalizeError } = await withTimeout(anonClient.functions.invoke('upload-client-document', { body: { action: 'finalize', path, ...request } }), 20_000);
      if (finalizeError || !finalized?.success) throw finalizeError || new Error(finalized?.error || 'Finalisation impossible');

      setSuccess(`Document "${file.name}" uploadé avec succès !`);
      await loadDocuments();
    } catch (err) {
      setError(getErrorMessage(err, 'Erreur lors de l\'upload'));
    } finally {
      setUploading(null);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-white mb-2">Lien invalide</h2>
          <p className="text-gray-400">Ce lien ne contient pas de token d'accès valide.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={48} />
      </div>
    );
  }

  if (!leadInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-white mb-2">Accès refusé</h2>
          <p className="text-gray-400">Impossible de charger vos informations.</p>
        </div>
      </div>
    );
  }

  const getUploadedDoc = (docType: string) => {
    return uploadedDocuments.find(d => d.document_type === docType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 p-1 rounded-2xl mb-8">
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <h1 className="text-4xl font-black text-white mb-2">
              Espace Documents
            </h1>
            <p className="text-xl text-amber-400 font-bold mb-4">
              Bonjour {leadInfo.first_name || 'Prospect'}
            </p>
            <p className="text-gray-300">
              Uploadez vos documents pour accélérer le traitement de votre dossier
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
            <p className="text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="text-red-400" size={20} />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="text-green-400 flex-shrink-0" size={24} />
            <p className="text-green-400">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X className="text-green-400" size={20} />
            </button>
          </div>
        )}

        {/* Documents upload */}
        <div className="space-y-4 mb-8">
          {DOCUMENT_TYPES.map((docType) => {
            const uploaded = getUploadedDoc(docType.id);
            const isUploading = uploading === docType.id;

            return (
              <div
                key={docType.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white">
                        {docType.label}
                      </h3>
                      {docType.required && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{docType.description}</p>
                  </div>

                  {uploaded && (
                    <CheckCircle className="text-green-400 flex-shrink-0" size={24} />
                  )}
                </div>

                {uploaded ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="text-green-400" size={20} />
                        <div>
                          <p className="text-sm font-semibold text-white">{uploaded.document_name || uploaded.file_name}</p>
                          <p className="text-xs text-gray-400">
                            Uploadé le {new Date(uploaded.uploaded_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                        Reçu
                      </span>
                    </div>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(docType.id, file);
                      }}
                      disabled={isUploading}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-600 hover:border-amber-500 rounded-xl p-6 text-center cursor-pointer transition-colors">
                      {isUploading ? (
                        <div className="flex items-center justify-center gap-3 text-amber-400">
                          <Loader2 className="animate-spin" size={24} />
                          <span>Upload en cours...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="text-gray-400 mx-auto mb-2" size={32} />
                          <p className="text-sm text-gray-400">
                            Cliquez pour sélectionner un fichier
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PDF, JPG, PNG ou Word (max 10MB)
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {/* Documents Complémentaires */}
        {leadInfo?.id && anonClient && (
          <div className="mb-8">
            <ComplementaryDocuments
              token={token}
              anonClient={anonClient}
              onDocumentUploaded={() => {
                setSuccess('Document complémentaire envoyé avec succès !');
                setTimeout(() => setSuccess(null), 5000);
              }}
            />
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
          <p className="text-gray-300 mb-4">
            Une fois vos documents uploadés, notre équipe les vérifiera et vous recontactera rapidement
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:0180855786"
              className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              01 80 85 57 86
            </a>
            <a
              href="mailto:team@taxiassur.com"
              className="inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              team@taxiassur.com
            </a>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            to="/"
            className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
          >
            ← Retourner à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProspectDocuments;
