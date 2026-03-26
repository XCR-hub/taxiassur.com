import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Upload, CheckCircle, AlertCircle, FileText, Loader2, X, Download, User, Phone, Mail, MapPin, Car, Shield, CreditCard, Ligature as FileSignature, Clock, CheckCircle2, XCircle, Eye, ChevronRight, Lock, RefreshCw, Building, Calendar, Euro, FileCheck, Send, AlertTriangle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import ClientQuotesViewer from '../components/client/ClientQuotesViewer';
import ClientSubscriptionForm from '../components/client/ClientSubscriptionForm';
import CompanyDocumentsLibrary from '../components/client/CompanyDocumentsLibrary';
import ClientPaymentButton from '../components/client/ClientPaymentButton';
import ClientMoneticoPayment from '../components/client/ClientMoneticoPayment';
import DragDropUploader from '../components/client/DragDropUploader';

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
  status: string;
  document_checklist?: DocumentChecklist;
  documents_complete?: boolean;
  progression_percentage?: number;
  total_documents?: number;
  uploaded_documents?: number;
  validated_documents?: number;
  // Nouveaux compteurs détaillés
  total_uploaded_files?: number;
  validated_files?: number;
  rejected_files?: number;
  pending_files?: number;
  quote_amount?: number;
  quote_accepted_at?: string;
  contract_signed_at?: string;
  payment_completed_at?: string;
  contract_pdf_url?: string;
  attestation_pdf_url?: string;
  converted_to_client?: boolean;
  client_since?: string;
  current_stage_key?: string;
  selected_company_id?: string;
  vehicle_type?: string;
}

interface UploadedDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  status: string;
  validated: boolean;
  validated_at?: string;
  refusal_reason?: string;
  notes?: string;
}

const TAXI_DOCUMENT_TYPES = [
  { id: 'licence_taxi', label: 'Licence de taxi / ADS', description: 'En cours de validite', required: true, icon: Car },
  { id: 'permis_conduire', label: 'Permis de conduire', description: 'Recto-verso, lisible', required: true, icon: FileText },
  { id: 'piece_identite', label: "Piece d'identite", description: 'CNI ou passeport valide', required: true, icon: User },
  { id: 'carte_grise', label: 'Carte grise du vehicule', description: "Certificat d'immatriculation", required: true, icon: Car },
  { id: 'releve_information', label: "Releve d'information", description: 'De votre assureur precedent', required: false, icon: FileText },
  { id: 'autorisation_stationnement', label: 'Autorisation de stationnement', description: 'Autorisation prefectorale', required: true, icon: MapPin },
  { id: 'rib', label: 'RIB - Releve d\'Identite Bancaire', description: 'Coordonnees bancaires completes', required: true, icon: CreditCard }
];

const VTC_DOCUMENT_TYPES = [
  { id: 'carte_pro_vtc', label: 'Carte professionnelle VTC', description: 'En cours de validite', required: true, icon: Car },
  { id: 'inscription_registre_vtc', label: 'Inscription registre VTC', description: 'Justificatif d\'inscription', required: true, icon: FileText },
  { id: 'permis_conduire', label: 'Permis de conduire', description: 'Recto-verso, lisible', required: true, icon: FileText },
  { id: 'piece_identite', label: "Piece d'identite", description: 'CNI ou passeport valide', required: true, icon: User },
  { id: 'carte_grise', label: 'Carte grise du vehicule', description: "Certificat d'immatriculation", required: true, icon: Car },
  { id: 'releve_information', label: "Releve d'information", description: 'De votre assureur precedent', required: false, icon: FileText },
  { id: 'rib', label: 'RIB - Releve d\'Identite Bancaire', description: 'Coordonnees bancaires completes', required: true, icon: CreditCard },
  { id: 'controle_technique', label: 'Controle technique', description: 'Moins de 6 mois', required: true, icon: FileCheck }
];

const MOTO_TAXI_DOCUMENT_TYPES = [
  { id: 'licence_taxi', label: 'Licence de taxi / ADS', description: 'En cours de validite', required: true, icon: Car },
  { id: 'permis_conduire', label: 'Permis de conduire (A + B)', description: 'Recto-verso, lisible', required: true, icon: FileText },
  { id: 'piece_identite', label: "Piece d'identite", description: 'CNI ou passeport valide', required: true, icon: User },
  { id: 'carte_grise', label: 'Carte grise du vehicule', description: "Certificat d'immatriculation", required: true, icon: Car },
  { id: 'releve_information', label: "Releve d'information", description: 'De votre assureur precedent', required: false, icon: FileText },
  { id: 'rib', label: 'RIB - Releve d\'Identite Bancaire', description: 'Coordonnees bancaires completes', required: true, icon: CreditCard },
  { id: 'controle_technique', label: 'Controle technique', description: 'Moins de 6 mois', required: true, icon: FileCheck }
];

function getProspectDocumentTypes(vehicleType?: string) {
  if (!vehicleType) return TAXI_DOCUMENT_TYPES;
  const n = vehicleType.toLowerCase().trim();
  if (n === 'vtc') return VTC_DOCUMENT_TYPES;
  if (n === 'moto-taxi') return MOTO_TAXI_DOCUMENT_TYPES;
  return TAXI_DOCUMENT_TYPES;
}

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
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [finalDocuments, setFinalDocuments] = useState<any[]>([]);

  const documentTypes = useMemo(
    () => getProspectDocumentTypes(leadInfo?.vehicle_type),
    [leadInfo?.vehicle_type]
  );

  const vehicleLabel = useMemo(() => {
    if (!leadInfo?.vehicle_type) return 'taxi';
    const n = leadInfo.vehicle_type.toLowerCase().trim();
    if (n === 'vtc') return 'VTC';
    if (n === 'moto-taxi') return 'moto-taxi';
    return 'taxi';
  }, [leadInfo?.vehicle_type]);

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

      if (leadData && leadData.lead) {
        console.log('Lead found:', leadData.lead.id);
        // Extraire les données du lead depuis la structure imbriquée
        setLeadInfo(leadData.lead);
        if (leadData.lead.converted_to_client) {
          setActiveTab('contrat');
        }

        // Charger tous les paiements via RPC (utilise le token du prospect)
        const { data: payments, error: paymentsError } = await anonClient
          .rpc('get_payments_by_token', { p_token: token });

        if (!paymentsError && payments) {
          console.log('Tous les paiements:', payments);
          setAllPayments(payments || []);
          setPendingPayments(payments?.filter((p: { status?: string }) => p.status === 'pending') || []);
        }
      } else {
        console.warn('No lead found for token');
        setError('Ce lien d\'acces n\'est plus valide. Il a peut-etre expire ou ete regenere. Contactez-nous au 01 80 85 57 86 ou par email a team@taxiassur.com pour obtenir un nouveau lien d\'acces a votre espace.');
      }
    } catch (err) {
      console.error('Error loading lead:', err);
      setError(`Ce lien d'acces n'est plus valide. Contactez-nous au 01 80 85 57 86 ou par email a team@taxiassur.com pour obtenir un nouveau lien.`);
    } finally {
      setLoading(false);
    }
  }, [anonClient, token]);

  useEffect(() => {
    if (token && anonClient) {
      loadLeadInfo();
    }
  }, [token, anonClient]); // Retirer loadLeadInfo des dépendances

  const loadDocuments = useCallback(async () => {
    if (!token || !anonClient) return;

    try {
      // Utiliser la fonction RPC sécurisée (nouvelle version)
      const { data, error } = await anonClient
        .rpc('get_lead_documents_by_token', { p_token: token });

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
  }, [token, anonClient, leadInfo]); // Retirer loadDocuments des dépendances

  // ========================================
  // REALTIME: Écouter les changements sur crm_lead_documents
  // ========================================
  useEffect(() => {
    if (!anonClient || !leadInfo?.id) return;

    console.log('🔴 Setting up realtime subscription for crm_lead_documents');

    // Créer une souscription realtime
    const channel = anonClient
      .channel('crm_lead_documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Écouter tous les événements (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'crm_lead_documents',
          filter: `lead_id=eq.${leadInfo.id}`,
        },
        (payload) => {
          console.log('🔴 REALTIME: Document change detected!', payload);

          // Recharger automatiquement les documents
          loadDocuments();

          // Recharger aussi les infos du lead pour mettre à jour les compteurs
          loadLeadInfo();

          // Afficher une notification visuelle
          if (payload.eventType === 'INSERT') {
            setSuccess('✅ Nouveau document ajouté !');
            setTimeout(() => setSuccess(null), 3000);
          } else if (payload.eventType === 'UPDATE') {
            const newRecord = payload.new as any;
            if (newRecord.validated) {
              setSuccess('✅ Document validé par notre équipe !');
              setTimeout(() => setSuccess(null), 3000);
            } else if (newRecord.status === 'refused') {
              setError('❌ Un document a été refusé. Veuillez le re-soumettre.');
              setTimeout(() => setError(null), 5000);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 REALTIME subscription status:', status);
      });

    // Cleanup: Se désabonner quand le composant est démonté
    return () => {
      console.log('🔴 Cleaning up realtime subscription');
      anonClient.removeChannel(channel);
    };
  }, [anonClient, leadInfo?.id]); // loadDocuments et loadLeadInfo sont stables

  const loadFinalDocuments = useCallback(async () => {
    if (!token || !anonClient) return;

    try {
      const { data, error } = await anonClient
        .rpc('get_final_documents_by_token', { p_token: token });

      if (error) throw error;
      setFinalDocuments(data || []);
    } catch (err) {
      console.error('Error loading final documents:', err);
    }
  }, [token, anonClient]);

  useEffect(() => {
    if (token && anonClient && leadInfo) {
      loadFinalDocuments();
    }
  }, [token, anonClient, leadInfo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeadInfo();
    await loadDocuments();
    await loadFinalDocuments();
    setRefreshing(false);
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!token || !anonClient) {
      throw new Error('Configuration manquante');
    }

    setUploading(documentType);
    setError(null);
    setSuccess(null);

    try {
      // Validation du fichier
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`Fichier trop volumineux. Taille max: 10MB`);
      }

      const fileExt = file.name.split('.').pop();
      if (!fileExt) {
        throw new Error('Extension de fichier invalide');
      }

      const fileName = `${token}/${documentType}_${Date.now()}.${fileExt}`;

      console.log('📤 [UPLOAD] Début upload:', { documentType, fileName, size: file.size });

      // Étape 1: Upload vers Storage
      const { data: uploadData, error: uploadError } = await anonClient.storage
        .from('prospect-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ [UPLOAD] Storage error:', uploadError);
        throw new Error(`Erreur upload storage: ${uploadError.message}`);
      }

      console.log('✅ [UPLOAD] Storage OK:', uploadData);

      // Étape 2: Enregistrer le document en base via RPC
      const { data: rpcData, error: dbError } = await anonClient.rpc('upload_prospect_document_by_token', {
        p_token: token,
        p_document_type: documentType,
        p_file_name: file.name,
        p_file_path: fileName,
        p_file_size: file.size
      });

      if (dbError) {
        console.error('❌ [UPLOAD] DB error:', dbError);
        throw new Error(`Erreur enregistrement: ${dbError.message}`);
      }

      console.log('✅ [UPLOAD] DB OK:', rpcData);

      setSuccess(`✅ Document "${file.name}" uploadé avec succès ! Vous recevrez un email de confirmation sous 60 secondes.`);

      // Scroll vers le haut pour afficher le message de succès
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Les documents seront rechargés automatiquement via realtime
      // Mais on force un refresh immédiat pour être sûr
      setTimeout(() => {
        loadDocuments();
        loadLeadInfo();
      }, 500);

    } catch (err) {
      console.error('❌ [UPLOAD] Global error:', err);
      const errorMessage = err.message || "Erreur inconnue lors de l'upload";
      setError(`❌ Upload échoué: ${errorMessage}`);
      // Scroll vers le haut pour afficher l'erreur
      window.scrollTo({ top: 0, behavior: 'smooth' });
      throw err; // Propager l'erreur pour que le composant DragDrop l'affiche aussi
    } finally {
      setUploading(null);
    }
  };

  const acceptQuote = async () => {
    if (!leadInfo?.id || !anonClient) return;

    try {
      const { error } = await anonClient
        .from('crm_leads')
        .update({
          quote_accepted_at: new Date().toISOString(),
          current_stage_key: 'contract'
        })
        .eq('access_token', token);

      if (error) throw error;

      setSuccess('Devis accepte ! Vous recevrez votre contrat par email.');
      await loadLeadInfo();
    } catch (err) {
      setError(err.message || 'Erreur lors de la validation du devis');
    }
  };

  const getDocumentStatus = (docType: string): DocumentStatus => {
    // Chercher le document uploadé dans crm_lead_documents
    const uploaded = uploadedDocuments.find(d => d.document_type === docType);

    if (uploaded) {
      return {
        status: uploaded.validated ? 'validated' : (uploaded.status === 'refused' ? 'rejected' : 'uploaded'),
        validated: uploaded.validated,
        validated_at: uploaded.validated_at,
        uploaded_at: uploaded.uploaded_at,
        file_name: uploaded.file_name,
        rejection_reason: uploaded.refusal_reason,
        notes: uploaded.notes
      };
    }

    // Sinon, fallback sur le document_checklist (legacy)
    const defaultStatus: DocumentStatus = { status: 'missing', validated: false };
    return leadInfo?.document_checklist?.[docType] || defaultStatus;
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
    // Utiliser la progression calculée par le backend
    if (leadInfo?.progression_percentage !== undefined) {
      return leadInfo.progression_percentage;
    }
    // Fallback si l'ancien système est encore utilisé
    if (!leadInfo?.document_checklist) return 0;
    const requiredDocs = documentTypes.filter(d => d.required);
    const validatedCount = requiredDocs.filter(d => {
      const status = leadInfo.document_checklist?.[d.id];
      return status?.validated || status?.status === 'uploaded';
    }).length;
    return Math.round((validatedCount / requiredDocs.length) * 100);
  };

  const getStepStatus = (step: 'documents' | 'devis' | 'paiement' | 'contrat') => {
    if (!leadInfo) return 'pending';

    switch (step) {
      case 'documents':
        return leadInfo.documents_complete ? 'completed' : 'current';
      case 'devis':
        if (leadInfo.quote_accepted_at) return 'completed';
        if (leadInfo.documents_complete) return 'current';
        return 'pending';
      case 'paiement':
        if (leadInfo.payment_completed_at) return 'completed';
        if (leadInfo.quote_accepted_at) return 'current';
        return 'pending';
      case 'contrat':
        if (leadInfo.contract_signed_at) return 'completed';
        if (leadInfo.payment_completed_at) return 'current';
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
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black text-white">
                    {isClient ? 'Espace Client' : 'Espace Prospect'}
                  </h1>
                  {leadInfo.vehicle_type && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      vehicleLabel === 'VTC'
                        ? 'bg-blue-400/20 text-blue-400 border-blue-400/50'
                        : vehicleLabel === 'moto-taxi'
                        ? 'bg-green-400/20 text-green-400 border-green-400/50'
                        : 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50'
                    }`}>
                      {vehicleLabel.toUpperCase()}
                    </span>
                  )}
                </div>
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

        {/* Bannière d'action urgente si documents incomplets */}
        {!leadInfo.documents_complete && activeTab === 'documents' && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-1 mb-8 animate-pulse">
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
                    <Upload className="text-black" size={32} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <AlertTriangle className="text-amber-400" size={24} />
                    Action Immediate Requise !
                  </h3>
                  <p className="text-gray-300 text-lg mb-3">
                    <strong className="text-amber-400">Accelerez votre dossier :</strong> Uploadez vos documents maintenant pour recevoir votre devis <strong className="text-white">sous 24h</strong>.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg font-semibold">
                      <CheckCircle size={18} />
                      Espace 100% securise
                    </div>
                    <div className="flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg font-semibold">
                      <Lock size={18} />
                      Drag & Drop facile
                    </div>
                    <div className="flex items-center gap-2 bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg font-semibold">
                      <Clock size={18} />
                      Traitement rapide
                    </div>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  {/* Badge principal : Types de documents complétés */}
                  <div className={`text-white font-black text-xl px-5 py-3 rounded-xl mb-2 ${
                    (leadInfo.validated_documents || 0) === 0
                      ? 'bg-red-500 animate-bounce'
                      : (leadInfo.validated_documents || 0) < (leadInfo.total_documents || 6)
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                  }`}>
                    {leadInfo.validated_documents || 0} / {leadInfo.total_documents || 6}
                  </div>
                  <p className="text-xs text-gray-400 font-semibold mb-3">
                    {(leadInfo.validated_documents || 0) === (leadInfo.total_documents || 6)
                      ? 'Types complets'
                      : 'Types validés'}
                  </p>

                  {/* Compteurs détaillés */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {/* Uploadés */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-blue-400 font-bold text-lg">
                        <Upload size={16} />
                        {leadInfo.total_uploaded_files || 0}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Uploadés</p>
                    </div>

                    {/* Validés */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-green-400 font-bold text-lg">
                        <CheckCircle size={16} />
                        {leadInfo.validated_files || 0}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Validés</p>
                    </div>

                    {/* En attente */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-lg">
                        <Clock size={16} />
                        {leadInfo.pending_files || 0}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">En attente</p>
                    </div>

                    {/* Refusés */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-red-400 font-bold text-lg">
                        <XCircle size={16} />
                        {leadInfo.rejected_files || 0}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Refusés</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bannière de félicitations si documents complets */}
        {leadInfo.documents_complete && activeTab === 'documents' && !leadInfo.quote_accepted_at && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-1 mb-8">
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-black" size={32} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Bravo ! Dossier complet
                  </h3>
                  <p className="text-gray-300 text-lg">
                    Tous vos documents ont ete uploades. Notre equipe traite votre demande et vous enverra vos devis <strong className="text-white">sous 24h</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('devis')}
                  className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  Voir mes devis
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
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

            {documentTypes.map((docType) => {
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
                    <DragDropUploader
                      onFileSelect={(file) => handleFileUpload(docType.id, file)}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      maxSize={10}
                      isUploading={uploading === docType.id}
                      isRejected={needsReupload}
                      rejectionReason={status.rejection_reason}
                      documentLabel={docType.label}
                      documentDescription={docType.description}
                    />
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
              {!leadInfo.documents_complete && (
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
            {/* Afficher les paiements en attente en priorité */}
            {pendingPayments.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="text-blue-400" size={24} />
                  <h3 className="text-xl font-bold text-white">Paiements en attente</h3>
                </div>
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/30 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-white mb-2">{payment.description || `Paiement comptant assurance ${vehicleLabel}`}</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-400">
                            <span className="text-gray-500">Montant :</span>{' '}
                            <span className="text-white font-bold text-xl">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(parseFloat(payment.amount))}
                            </span>
                          </p>
                          <p className="text-gray-400">
                            <span className="text-gray-500">Référence :</span>{' '}
                            <span className="text-white font-mono">{payment.reference}</span>
                          </p>
                        </div>
                      </div>
                      <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold">
                        ⏳ En attente
                      </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <Lock className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
                        <div className="text-sm text-gray-300">
                          <p className="font-semibold text-yellow-400 mb-1">🔒 Paiement 100% Sécurisé</p>
                          <p>
                            Vos données bancaires sont protégées par Monetico Paiement (CIC),
                            certifié PCI-DSS niveau 1. Technologie 3D Secure activée.
                          </p>
                        </div>
                      </div>
                    </div>

                    <ClientMoneticoPayment
                      leadId={leadInfo.id}
                      amount={parseFloat(payment.amount)}
                      reference={payment.reference}
                      description={payment.description}
                      customerEmail={leadInfo.email}
                      customerFirstName={leadInfo.first_name}
                      customerLastName={leadInfo.last_name}
                      customerPhone={leadInfo.phone}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Afficher l'historique des paiements effectués */}
            {allPayments.filter(p => p.status === 'success').length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="text-green-400" size={24} />
                  <h3 className="text-xl font-bold text-white">Paiements effectués</h3>
                </div>
                {allPayments.filter(p => p.status === 'success').map((payment) => (
                  <div key={payment.id} className="bg-gradient-to-br from-green-900/40 to-emerald-800/20 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-white mb-2">{payment.description || `Paiement comptant assurance ${vehicleLabel}`}</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-400">
                            <span className="text-gray-500">Montant :</span>{' '}
                            <span className="text-white font-bold text-xl">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(parseFloat(payment.amount))}
                            </span>
                          </p>
                          <p className="text-gray-400">
                            <span className="text-gray-500">Référence :</span>{' '}
                            <span className="text-white font-mono">{payment.reference}</span>
                          </p>
                          {payment.payment_date && (
                            <p className="text-gray-400">
                              <span className="text-gray-500">Payé le :</span>{' '}
                              <span className="text-white">
                                {new Date(payment.payment_date).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                        <CheckCircle size={16} />
                        Payé
                      </div>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                        <div className="text-sm text-gray-300">
                          <p className="font-semibold text-green-400 mb-1">✅ Paiement confirmé</p>
                          <p>
                            Votre paiement a été traité avec succès. Votre contrat sera activé sous 24h.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Si aucun paiement en attente ET pas de devis accepté */}
            {pendingPayments.length === 0 && !leadInfo.quote_accepted_at && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 text-center">
                <Euro className="text-amber-400 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-bold text-white mb-2">Devis non accepté</h3>
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
            )}

            {/* Si devis accepté mais aucun paiement en attente, afficher le formulaire de souscription */}
            {leadInfo.quote_accepted_at && pendingPayments.length === 0 && (
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
              </div>
            )}
          </div>
        )}

        {activeTab === 'contrat' && (
          <div className="space-y-6">
            {/* Documents finaux uploadés par le commercial */}
            {finalDocuments.length > 0 ? (
                  finalDocuments.map((doc) => {
                    // Configuration par type de document
                    const docConfig = {
                      contrat_signe: {
                        icon: FileSignature,
                        iconColor: 'text-blue-400',
                        bgGradient: 'from-blue-900/40 to-blue-800/20',
                        borderColor: 'border-blue-500/30',
                        buttonColor: 'bg-blue-500 hover:bg-blue-600',
                        title: doc.custom_label || 'Contrat Signe'
                      },
                      attestation_assurance: {
                        icon: Shield,
                        iconColor: 'text-green-400',
                        bgGradient: 'from-green-900/40 to-emerald-800/20',
                        borderColor: 'border-green-500/30',
                        buttonColor: 'bg-green-500 hover:bg-green-600',
                        title: doc.custom_label || 'Attestation d\'Assurance'
                      },
                      memo_vehicule: {
                        icon: Car,
                        iconColor: 'text-purple-400',
                        bgGradient: 'from-purple-900/40 to-purple-800/20',
                        borderColor: 'border-purple-500/30',
                        buttonColor: 'bg-purple-500 hover:bg-purple-600',
                        title: doc.custom_label || 'Memo du Vehicule'
                      }
                    };

                    const config = docConfig[doc.document_type as keyof typeof docConfig];
                    if (!config) return null;

                    const DocIcon = config.icon;

                    return (
                      <div key={doc.id} className={`bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} rounded-xl p-6`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-lg bg-gray-900/50`}>
                              <DocIcon className={config.iconColor} size={28} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">{config.title}</h3>
                              <p className="text-sm text-gray-400">
                                {doc.file_name}
                              </p>
                            </div>
                          </div>
                          <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                            <CheckCircle size={14} />
                            Disponible
                          </div>
                        </div>

                        <div className="text-sm text-gray-400 mb-4">
                          <p>Uploade le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}</p>
                        </div>

                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-full ${config.buttonColor} text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2`}
                        >
                          <Download size={20} />
                          Telecharger ce document
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-8 text-center">
                    <Clock className="text-blue-400 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">Documents en preparation</h3>
                    <p className="text-gray-400">
                      Vos documents finaux (contrat, attestation, memo vehicule) sont en cours de preparation.
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
                          Vous etes client depuis le {leadInfo.client_since
                            ? new Date(leadInfo.client_since).toLocaleDateString('fr-FR')
                            : new Date().toLocaleDateString('fr-FR')
                          }
                        </p>
                      </div>
                    </div>
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
