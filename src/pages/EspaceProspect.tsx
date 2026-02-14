import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import {
  Upload, CheckCircle, AlertCircle, FileText, Loader2, X, Download,
  User, Phone, Mail, MapPin, Car, Shield, CreditCard, FileSignature,
  Clock, CheckCircle2, XCircle, Eye, ChevronRight, Lock, RefreshCw,
  Building, Calendar, Euro, FileCheck, Send, AlertTriangle
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import ClientQuotesViewer from '../components/client/ClientQuotesViewer';
import ClientSubscriptionForm from '../components/client/ClientSubscriptionForm';
import CompanyDocumentsLibrary from '../components/client/CompanyDocumentsLibrary';
import ClientPaymentButton from '../components/client/ClientPaymentButton';
import { ProspectPaymentSection } from '../components/client/ProspectPaymentSection';

interface DocumentStatus {
  status: 'missing' | 'uploaded' | 'validated' | 'rejected';
  validated: boolean;
  validated_at?: string;
  uploaded_at?: string;
  file_name?: string;
  rejection_reason?: string;
  notes?: string;
}

interface DocumentChecklist {
  [key: string]: DocumentStatus;
}

interface LeadInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  postal_code?: string;
  city?: string;
  company_name?: string;
  siret?: string;
  immatriculation?: string;
  status: string;
  pipeline_stage?: string;
  lead_score?: number;
  converted_to_client?: boolean;
  access_token?: string;
  contract_number?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

interface UploadedDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  status: string;
}

const DOCUMENT_TYPES = [
  { id: 'licence_taxi', label: 'Licence de taxi professionnelle', description: 'En cours de validite', required: true, icon: Car },
  { id: 'permis_conduire', label: 'Permis de conduire', description: 'Recto-verso, lisible', required: true, icon: FileText },
  { id: 'piece_identite', label: "Piece d'identite", description: 'CNI ou passeport valide', required: true, icon: User },
  { id: 'carte_grise', label: 'Carte grise du vehicule', description: "Certificat d'immatriculation", required: true, icon: Car },
  { id: 'releve_information', label: "Releve d'information", description: 'De votre assureur precedent', required: false, icon: FileText },
  { id: 'autorisation_stationnement', label: 'Autorisation de stationnement', description: 'Autorisation prefectorale', required: true, icon: MapPin },
  { id: 'rib', label: 'RIB - Releve d\'Identite Bancaire', description: 'Coordonnees bancaires completes', required: true, icon: CreditCard }
];

type TabType = 'documents' | 'devis' | 'paiement' | 'contrat';

const EspaceProspect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams<{ token: string }>();
  const token = params.token || searchParams.get('token');

  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [anonClient, setAnonClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Lire le paramètre tab de l'URL au chargement
    const tabParam = searchParams.get('tab');
    if (tabParam && ['documents', 'devis', 'paiement', 'contrat'].includes(tabParam)) {
      return tabParam as TabType;
    }
    return 'documents';
  });
  const [refreshing, setRefreshing] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Mettre à jour l'onglet actif si le paramètre URL change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['documents', 'devis', 'paiement', 'contrat'].includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    }
  }, [searchParams]);

  useEffect(() => {
    const initClient = () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://drohhxrkoequjphvabvq.supabase.co';
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';

        const client = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        setAnonClient(client);
      } catch (err) {
        setError('Erreur de configuration');
        setLoading(false);
      }
    };
    initClient();
  }, []);

  const loadLeadInfo = useCallback(async () => {
    if (!anonClient || !token) {
      console.log('Missing anonClient or token:', { hasClient: !!anonClient, token });
      setError('Configuration manquante');
      setLoading(false);
      return;
    }

    console.log('Loading lead info with token:', token);

    try {
      // Utiliser la fonction RPC sécurisée au lieu de la requête directe
      const { data: leadData, error: leadError } = await anonClient
        .rpc('get_lead_by_token', { p_token: token })
        .maybeSingle();

      console.log('Lead query result:', { data: leadData, error: leadError });

      if (leadError) {
        console.error('Lead query error:', leadError);
        throw leadError;
      }

      if (leadData) {
        console.log('Lead found:', leadData.id);
        setLeadInfo(leadData);
        if (leadData.converted_to_client) {
          setActiveTab('contrat');
        }
      } else {
        console.warn('No lead found for token');
        setError('Lien invalide ou expire. Verifiez que le lien est correct.');
      }
    } catch (err: any) {
      console.error('Error loading lead:', err);
      setError(`Erreur: ${err.message || 'Lien invalide ou expire'}`);
    } finally {
      setLoading(false);
    }
  }, [anonClient, token]);

  useEffect(() => {
    if (token && anonClient) {
      loadLeadInfo();
    }
  }, [token, anonClient, loadLeadInfo]);

  const loadDocuments = useCallback(async () => {
    if (!token || !anonClient) return;

    try {
      // Utiliser la fonction RPC sécurisée
      const { data, error } = await anonClient
        .rpc('get_prospect_documents_by_token', { p_token: token });

      if (error) throw error;
      setUploadedDocuments(data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  }, [token, anonClient]);

  useEffect(() => {
    if (token && anonClient && leadInfo) {
      loadDocuments();
    }
  }, [token, anonClient, leadInfo, loadDocuments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeadInfo();
    await loadDocuments();
    setRefreshing(false);
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!token || !anonClient) return;

    setUploading(documentType);
    setError(null);
    setSuccess(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${token}/${documentType}_${Date.now()}.${fileExt}`;

      // Upload vers Storage
      const { error: uploadError } = await anonClient.storage
        .from('prospect-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Utiliser la fonction RPC pour créer le document
      const { error: dbError } = await anonClient.rpc('upload_prospect_document_by_token', {
        p_token: token,
        p_document_type: documentType,
        p_file_name: file.name,
        p_file_path: fileName,
        p_file_size: file.size
      });

      if (dbError) throw dbError;

      setSuccess(`Document "${file.name}" uploade avec succes !`);
      await loadDocuments();
      await loadLeadInfo();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(null);
    }
  };

  const handleDragOver = (e: React.DragEvent, documentType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(documentType);
  };

  const handleDragEnter = (e: React.DragEvent, documentType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(documentType);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
  };

  const handleDrop = async (e: React.DragEvent, documentType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      await handleFileUpload(documentType, file);
    }
  };

  const acceptQuote = async () => {
    if (!leadInfo?.id || !anonClient) return;

    try {
      const { error } = await anonClient
        .from('lead_company_quotes')
        .update({
          status: 'accepted',
          quote_accepted_at: new Date().toISOString()
        })
        .eq('lead_id', leadInfo.id)
        .eq('status', 'sent');

      if (error) throw error;

      setSuccess('Devis accepte ! Vous recevrez votre contrat par email.');
      await loadLeadInfo();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation du devis');
    }
  };

  const getDocumentStatus = (docType: string): DocumentStatus => {
    const doc = uploadedDocuments.find(d => d.document_type === docType);
    if (!doc) {
      return { status: 'missing', validated: false };
    }
    const isValidated = doc.status === 'validated';
    return {
      status: doc.status as any,
      validated: isValidated,
      validated_at: doc.uploaded_at,
      uploaded_at: doc.uploaded_at,
      file_name: doc.file_name
    };
  };

  const getUploadedDoc = (docType: string) => {
    return uploadedDocuments.find(d => d.document_type === docType);
  };

  const getStatusBadge = (status: DocumentStatus) => {
    if (status.validated) {
      return <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full"><CheckCircle2 size={12} /> Valide</span>;
    }
    if (status.status === 'rejected') {
      return <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full"><XCircle size={12} /> A refaire</span>;
    }
    if (status.status === 'uploaded') {
      return <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full"><Clock size={12} /> En attente</span>;
    }
    return <span className="flex items-center gap-1 text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full"><AlertCircle size={12} /> Manquant</span>;
  };

  const getProgressPercentage = () => {
    const requiredDocs = DOCUMENT_TYPES.filter(d => d.required);
    if (requiredDocs.length === 0) return 0;

    const uploadedCount = requiredDocs.filter(d => {
      const doc = uploadedDocuments.find(ud => ud.document_type === d.id);
      return doc !== undefined;
    }).length;

    return Math.round((uploadedCount / requiredDocs.length) * 100);
  };

  const getStepStatus = (step: 'documents' | 'devis' | 'paiement' | 'contrat') => {
    if (!leadInfo) return 'pending';

    const progress = getProgressPercentage();
    const hasDocuments = progress >= 80; // Au moins 80% des docs

    switch (step) {
      case 'documents':
        return hasDocuments ? 'completed' : 'current';
      case 'devis':
        if (leadInfo.status === 'devis_valide' || leadInfo.pipeline_stage?.includes('paiement')) return 'completed';
        if (hasDocuments) return 'current';
        return 'pending';
      case 'paiement':
        if (leadInfo.status === 'contrat' || leadInfo.pipeline_stage?.includes('contrat')) return 'completed';
        if (leadInfo.pipeline_stage?.includes('paiement')) return 'current';
        return 'pending';
      case 'contrat':
        if (leadInfo.converted_to_client) return 'completed';
        if (leadInfo.pipeline_stage?.includes('contrat')) return 'current';
        return 'pending';
      default:
        return 'pending';
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-white mb-2">Lien invalide</h2>
          <p className="text-gray-400">Ce lien ne contient pas de token d'acces valide.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-amber-400 mx-auto mb-4" size={48} />
          <p className="text-gray-400">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (!leadInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <Lock className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-white mb-2">Acces refuse</h2>
          <p className="text-gray-400">Impossible de charger vos informations. Le lien a peut-etre expire.</p>
          <Link to="/" className="mt-6 inline-block text-amber-400 hover:text-amber-300">
            Retourner a l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const isClient = leadInfo.converted_to_client;
  const progress = getProgressPercentage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 p-1 rounded-2xl mb-8">
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white">
                  {isClient ? 'Espace Client' : 'Espace Prospect'}
                </h1>
                <p className="text-amber-400 font-bold text-lg">
                  Bonjour {leadInfo.first_name} {leadInfo.last_name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <RefreshCw className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} size={20} />
                </button>
                <div className="bg-gray-800 px-4 py-2 rounded-lg">
                  <p className="text-xs text-gray-400">Progression</p>
                  <p className="text-xl font-bold text-white">{progress}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

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

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { key: 'documents' as TabType, label: 'Documents', icon: FileText },
              { key: 'devis' as TabType, label: 'Devis', icon: Euro },
              { key: 'paiement' as TabType, label: 'Paiement', icon: CreditCard },
              { key: 'contrat' as TabType, label: 'Contrat', icon: FileSignature }
            ].map((tab) => {
              const status = getStepStatus(tab.key);
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-amber-500 text-black'
                      : status === 'completed'
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {status === 'completed' && activeTab !== tab.key && (
                    <CheckCircle2 size={16} className="absolute -top-1 -right-1 text-green-400" />
                  )}
                  <Icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Documents requis</span>
                <span className="text-sm font-bold text-white">{progress}% complete</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-green-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {DOCUMENT_TYPES.map((docType) => {
              const status = getDocumentStatus(docType.id);
              const uploaded = getUploadedDoc(docType.id);
              const isUploading = uploading === docType.id;
              const Icon = docType.icon;
              const needsReupload = status.status === 'rejected';

              return (
                <div
                  key={docType.id}
                  className={`bg-gray-800/50 border rounded-xl p-5 transition-all ${
                    status.validated
                      ? 'border-green-500/50'
                      : needsReupload
                      ? 'border-red-500/50'
                      : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        status.validated ? 'bg-green-500/20' : 'bg-gray-700'
                      }`}>
                        <Icon className={status.validated ? 'text-green-400' : 'text-gray-400'} size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white">{docType.label}</h3>
                          {docType.required && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                              Obligatoire
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{docType.description}</p>
                      </div>
                    </div>
                    {getStatusBadge(status)}
                  </div>

                  {status.status === 'rejected' && status.rejection_reason && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                        <div>
                          <p className="text-sm font-semibold text-red-400">Document refuse</p>
                          <p className="text-sm text-gray-400">{status.rejection_reason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {(uploaded || status.status === 'uploaded') && !needsReupload ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileCheck className="text-green-400" size={20} />
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {uploaded?.file_name || status.file_name || 'Document uploade'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {uploaded?.uploaded_at
                                ? `Uploade le ${new Date(uploaded.uploaded_at).toLocaleDateString('fr-FR')}`
                                : status.uploaded_at
                                ? `Uploade le ${new Date(status.uploaded_at).toLocaleDateString('fr-FR')}`
                                : 'En attente de validation'
                              }
                            </p>
                          </div>
                        </div>
                        {status.validated && (
                          <CheckCircle2 className="text-green-400" size={24} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
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
                      <div
                        className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
                          dragOver === docType.id
                            ? 'border-amber-500 bg-amber-500/10'
                            : needsReupload
                            ? 'border-red-500/50 hover:border-red-500 bg-red-500/5'
                            : 'border-gray-600 hover:border-amber-500'
                        }`}
                        onDragOver={(e) => handleDragOver(e, docType.id)}
                        onDragEnter={(e) => handleDragEnter(e, docType.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, docType.id)}
                      >
                        {isUploading ? (
                          <div className="flex items-center justify-center gap-3 text-amber-400">
                            <Loader2 className="animate-spin" size={24} />
                            <span>Upload en cours...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className={needsReupload ? 'text-red-400 mx-auto mb-2' : 'text-gray-400 mx-auto mb-2'} size={28} />
                            <p className={`text-sm font-medium ${needsReupload ? 'text-red-400' : 'text-gray-300'}`}>
                              {needsReupload ? 'Cliquez ou glissez pour renvoyer' : 'Cliquez ou glissez-deposez un fichier'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG ou Word (max 10MB)</p>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'devis' && (
          <div className="space-y-6">
            {/* Afficher les devis s'ils sont disponibles, même si documents pas complets */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-white mb-2">Vos devis d'assurance</h3>
                <p className="text-gray-400">
                  Comparez les offres des meilleures compagnies et choisissez celle qui vous convient.
                </p>
              </div>

              {/* Avertissement si documents pas complets */}
              {progress < 100 && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm">
                    <p className="text-amber-400 font-semibold mb-1">Documents incomplets</p>
                    <p className="text-gray-400">
                      Pensez à completer tous vos documents dans l'onglet "Documents" pour finaliser votre dossier.
                    </p>
                  </div>
                </div>
              )}

              {token && anonClient && <ClientQuotesViewer token={token} supabaseClient={anonClient} />}
            </div>
          </div>
        )}

        {activeTab === 'paiement' && (
          <div className="space-y-6">
            {leadInfo.pipeline_stage !== 'etape_6_paiement' && !leadInfo.pipeline_stage?.includes('contrat') ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 text-center">
                <Euro className="text-amber-400 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-bold text-white mb-2">Devis non accepte</h3>
                <p className="text-gray-400 mb-4">
                  Veuillez d'abord accepter votre devis pour renseigner vos informations bancaires.
                </p>
                <button
                  onClick={() => setActiveTab('devis')}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-6 rounded-xl transition-colors"
                >
                  Voir mes devis
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                  <ClientSubscriptionForm
                    leadId={leadInfo.id}
                    acceptedQuoteId={leadInfo.selected_company_id || ''}
                    onSubmit={() => {
                      loadLeadInfo();
                    }}
                  />
                </div>

                {/* Bouton de paiement si comptant requis */}
                <ClientPaymentButton leadId={leadInfo.id} />

                {/* Section paiement comptant Monetico */}
                {token && (
                  <ProspectPaymentSection
                    leadId={leadInfo.id}
                    accessToken={token}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contrat' && (
          <div className="space-y-6">
            {!leadInfo.converted_to_client && leadInfo.pipeline_stage !== 'etape_7_contrat' ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 text-center">
                <FileSignature className="text-amber-400 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-bold text-white mb-2">Paiement en attente</h3>
                <p className="text-gray-400 mb-4">
                  Votre contrat sera disponible des que le paiement sera valide.
                </p>
                <button
                  onClick={() => setActiveTab('paiement')}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-6 rounded-xl transition-colors"
                >
                  Proceder au paiement
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {leadInfo.metadata?.contract_pdf_url && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <FileSignature className="text-blue-400" size={24} />
                      Votre Contrat
                    </h3>
                    <a
                      href={leadInfo.metadata?.contract_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={20} />
                      Telecharger mon contrat
                    </a>
                  </div>
                )}

                {leadInfo.metadata?.attestation_pdf_url && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Shield className="text-green-400" size={24} />
                      Attestation d'Assurance
                    </h3>
                    <a
                      href={leadInfo.metadata?.attestation_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={20} />
                      Telecharger mon attestation
                    </a>
                  </div>
                )}

                {!leadInfo.metadata?.contract_pdf_url && !leadInfo.metadata?.attestation_pdf_url && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-8 text-center">
                    <Clock className="text-blue-400 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">Documents en preparation</h3>
                    <p className="text-gray-400">
                      Votre contrat et votre attestation sont en cours de preparation.
                      Vous recevrez un email des qu'ils seront disponibles.
                    </p>
                  </div>
                )}

                {isClient && (
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-500 p-3 rounded-full">
                        <CheckCircle2 className="text-white" size={32} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Bienvenue chez TaxiAssur !</h3>
                        <p className="text-gray-400">
                          Vous etes client depuis le {leadInfo.metadata?.client_since
                            ? new Date(leadInfo.metadata.client_since).toLocaleDateString('fr-FR')
                            : leadInfo.created_at
                            ? new Date(leadInfo.created_at).toLocaleDateString('fr-FR')
                            : new Date().toLocaleDateString('fr-FR')
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mt-8 text-center">
          <p className="text-gray-300 mb-4">
            Une question ? Notre equipe est a votre disposition
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:0180855786"
              className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              <Phone size={18} />
              01 80 85 57 86
            </a>
            <a
              href="mailto:team@taxiassur.com"
              className="inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              <Mail size={18} />
              team@taxiassur.com
            </a>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
            Retourner a l'accueil TaxiAssur
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EspaceProspect;
