import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Calendar,
  MapPin,
  Car,
  User,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  Download,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Claim {
  id: string;
  claim_number: string;
  claim_date: string;
  claim_type: string;
  description: string;
  location: string;
  status: 'declared' | 'investigating' | 'approved' | 'rejected' | 'paid';
  estimated_amount: number | null;
  paid_amount: number | null;
  documents: any[];
  notes: any[];
  created_at: string;
  updated_at: string;
}

interface ClientClaimsManagerProps {
  leadId: string;
  contractId: string;
}

const CLAIM_TYPES = {
  accident: 'Accident',
  theft: 'Vol',
  fire: 'Incendie',
  glass: 'Bris de glace',
  vandalism: 'Vandalisme',
  other: 'Autre'
};

const STATUS_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  declared: {
    label: 'Déclaré',
    icon: <FileText className="w-4 h-4" />,
    color: 'blue'
  },
  investigating: {
    label: 'En cours d\'instruction',
    icon: <Clock className="w-4 h-4" />,
    color: 'yellow'
  },
  approved: {
    label: 'Approuvé',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'green'
  },
  rejected: {
    label: 'Rejeté',
    icon: <XCircle className="w-4 h-4" />,
    color: 'red'
  },
  paid: {
    label: 'Indemnisé',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'green'
  }
};

export const ClientClaimsManager: React.FC<ClientClaimsManagerProps> = ({
  leadId,
  contractId
}) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeclarationForm, setShowDeclarationForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    claim_date: '',
    claim_time: '',
    claim_type: 'accident',
    location: '',
    description: '',
    has_other_party: false,
    other_party_name: '',
    other_party_contact: '',
    witnesses: '',
    police_report: false,
    constat_file: null as File | null,
    photos: [] as File[]
  });

  useEffect(() => {
    loadClaims();
  }, [leadId]);

  const loadClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      console.error('Error loading claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'constat' | 'photos') => {
    const files = e.target.files;
    if (!files) return;

    if (type === 'constat' && files[0]) {
      setFormData(prev => ({ ...prev, constat_file: files[0] }));
    } else if (type === 'photos') {
      setFormData(prev => ({ ...prev, photos: Array.from(files) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Upload des fichiers
      const uploadedDocs = [];

      if (formData.constat_file) {
        const constatPath = `${leadId}/claims/constat_${Date.now()}.pdf`;
        const { error } = await supabase.storage
          .from('claims')
          .upload(constatPath, formData.constat_file);

        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('claims').getPublicUrl(constatPath);
          uploadedDocs.push({ type: 'constat', url: publicUrl });
        }
      }

      for (const photo of formData.photos) {
        const photoPath = `${leadId}/claims/photo_${Date.now()}_${Math.random()}.jpg`;
        const { error } = await supabase.storage.from('claims').upload(photoPath, photo);

        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('claims').getPublicUrl(photoPath);
          uploadedDocs.push({ type: 'photo', url: publicUrl });
        }
      }

      // Créer le sinistre
      const claimNumber = `SIN-${Date.now()}`;
      const { error: insertError } = await supabase.from('claims').insert({
        lead_id: leadId,
        contract_id: contractId,
        claim_number: claimNumber,
        claim_date: `${formData.claim_date}T${formData.claim_time}:00`,
        claim_type: formData.claim_type,
        location: formData.location,
        description: formData.description,
        status: 'declared',
        documents: uploadedDocs,
        metadata: {
          has_other_party: formData.has_other_party,
          other_party_name: formData.other_party_name,
          other_party_contact: formData.other_party_contact,
          witnesses: formData.witnesses,
          police_report: formData.police_report
        }
      });

      if (insertError) throw insertError;

      // Notification commercial
      await supabase.from('notification_queue').insert({
        lead_id: leadId,
        channel: 'email',
        recipient: 'tim@taxiassur.com',
        template_key: 'new_claim_declared',
        priority: 'high',
        variables: {
          claim_number: claimNumber,
          claim_type: CLAIM_TYPES[formData.claim_type as keyof typeof CLAIM_TYPES],
          claim_date: formData.claim_date
        }
      });

      alert('Sinistre déclaré avec succès ! Nous vous recontacterons rapidement.');
      setShowDeclarationForm(false);
      loadClaims();

      // Reset form
      setFormData({
        claim_date: '',
        claim_time: '',
        claim_type: 'accident',
        location: '',
        description: '',
        has_other_party: false,
        other_party_name: '',
        other_party_contact: '',
        witnesses: '',
        police_report: false,
        constat_file: null,
        photos: []
      });
    } catch (error: any) {
      console.error('Error submitting claim:', error);
      alert(error.message || 'Erreur lors de la déclaration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Mes sinistres</h3>
          <p className="text-sm text-gray-600">Déclarez et suivez vos sinistres</p>
        </div>
        {!showDeclarationForm && (
          <button
            onClick={() => setShowDeclarationForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black font-semibold rounded-lg shadow-sm transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Déclarer un sinistre</span>
          </button>
        )}
      </div>

      {showDeclarationForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Nouvelle déclaration de sinistre</h4>
            <button
              type="button"
              onClick={() => setShowDeclarationForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date du sinistre *
              </label>
              <input
                type="date"
                value={formData.claim_date}
                onChange={e => setFormData(prev => ({ ...prev, claim_date: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Heure *</label>
              <input
                type="time"
                value={formData.claim_time}
                onChange={e => setFormData(prev => ({ ...prev, claim_time: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de sinistre *</label>
            <select
              value={formData.claim_type}
              onChange={e => setFormData(prev => ({ ...prev, claim_type: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              {Object.entries(CLAIM_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lieu du sinistre *</label>
            <input
              type="text"
              value={formData.location}
              onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Adresse complète"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description détaillée *
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              required
              placeholder="Décrivez les circonstances du sinistre..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has_other_party"
              checked={formData.has_other_party}
              onChange={e => setFormData(prev => ({ ...prev, has_other_party: e.target.checked }))}
              className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-500"
            />
            <label htmlFor="has_other_party" className="text-sm text-gray-700">
              Un tiers est impliqué
            </label>
          </div>

          {formData.has_other_party && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du tiers</label>
                <input
                  type="text"
                  value={formData.other_party_name}
                  onChange={e => setFormData(prev => ({ ...prev, other_party_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                <input
                  type="text"
                  value={formData.other_party_contact}
                  onChange={e => setFormData(prev => ({ ...prev, other_party_contact: e.target.value }))}
                  placeholder="Téléphone ou email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Constat amiable (PDF)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={e => handleFileChange(e, 'constat')}
              className="w-full"
            />
            {formData.constat_file && (
              <p className="text-sm text-green-600 mt-1">✓ {formData.constat_file.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (max 5)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => handleFileChange(e, 'photos')}
              className="w-full"
            />
            {formData.photos.length > 0 && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {formData.photos.length} photo(s) sélectionnée(s)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black disabled:opacity-50 font-semibold rounded-lg shadow-sm transition-all"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Déclaration en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Déclarer le sinistre</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Liste des sinistres */}
      {claims.length === 0 && !showDeclarationForm ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun sinistre déclaré</h3>
          <p className="text-gray-600 mb-6">
            Vous n'avez aucun sinistre en cours. En cas de sinistre, déclarez-le rapidement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map(claim => {
            const statusInfo = STATUS_INFO[claim.status];
            return (
              <div key={claim.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {CLAIM_TYPES[claim.claim_type as keyof typeof CLAIM_TYPES]}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>N° {claim.claim_number}</span>
                        <span>•</span>
                        <span>{new Date(claim.claim_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-1 bg-${statusInfo.color}-100 text-${statusInfo.color}-700 rounded text-xs font-semibold`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{claim.location}</span>
                  </div>
                  <p className="text-gray-700">{claim.description}</p>
                </div>

                {claim.documents && claim.documents.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {claim.documents.map((doc: any, idx: number) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                      >
                        <FileText className="w-3 h-3" />
                        <span>{doc.type}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Aide urgence */}
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <strong>Urgence 24h/24 :</strong> En cas de sinistre grave, contactez immédiatement
            votre assistance au <strong>01 XX XX XX XX</strong> ou déclarez via ce formulaire.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientClaimsManager;
