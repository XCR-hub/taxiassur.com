import { useState } from 'react';
import { Mail, Phone, User, Calendar, TrendingUp, MapPin, Car, FileText, Edit2, Save, X } from 'lucide-react';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  pipeline_stage: string;
  score: number;
  created_at: string;
  updated_at: string;
  last_interaction_at: string | null;
  immatriculation: string | null;
  vehicle_type: string | null;
  city: string | null;
  notes: string | null;
}

interface LeadHeaderProps {
  lead: Lead;
  onUpdate: (updates: Partial<Lead>) => Promise<void>;
}

const statusColors: Record<string, string> = {
  'nouveau_lead': 'bg-blue-100 text-blue-800',
  'contacte': 'bg-yellow-100 text-yellow-800',
  'en_cours': 'bg-purple-100 text-purple-800',
  'documents_en_attente': 'bg-orange-100 text-orange-800',
  'pret_pour_devis': 'bg-indigo-100 text-indigo-800',
  'devis_envoye': 'bg-cyan-100 text-cyan-800',
  'en_negociation': 'bg-pink-100 text-pink-800',
  'contrat_signe': 'bg-green-100 text-green-800',
  'perdu': 'bg-red-100 text-red-800',
  'archive': 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  'nouveau_lead': 'Nouveau Lead',
  'contacte': 'Contacté',
  'en_cours': 'En cours',
  'documents_en_attente': 'Documents en attente',
  'pret_pour_devis': 'Prêt pour devis',
  'devis_envoye': 'Devis envoyé',
  'en_negociation': 'En négociation',
  'contrat_signe': 'Contrat signé',
  'perdu': 'Perdu',
  'archive': 'Archivé',
};

export default function LeadHeader({ lead, onUpdate }: LeadHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    immatriculation: lead.immatriculation,
    vehicle_type: lead.vehicle_type,
    notes: lead.notes,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate(editedLead);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedLead({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      immatriculation: lead.immatriculation,
      vehicle_type: lead.vehicle_type,
      notes: lead.notes,
    });
    setIsEditing(false);
  };

  const scoreColor = lead.score >= 80 ? 'text-green-600' : lead.score >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {lead.first_name[0]}{lead.last_name[0]}
          </div>
          <div>
            {isEditing ? (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={editedLead.first_name}
                  onChange={(e) => setEditedLead({ ...editedLead, first_name: e.target.value })}
                  className="px-3 py-1 border border-gray-300 rounded text-lg font-semibold"
                  placeholder="Prénom"
                />
                <input
                  type="text"
                  value={editedLead.last_name}
                  onChange={(e) => setEditedLead({ ...editedLead, last_name: e.target.value })}
                  className="px-3 py-1 border border-gray-300 rounded text-lg font-semibold"
                  placeholder="Nom"
                />
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">
                {lead.first_name} {lead.last_name}
              </h1>
            )}
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
              {statusLabels[lead.status] || lead.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Edit2 className="w-4 h-4" />
              Modifier
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-gray-400" />
          {isEditing ? (
            <input
              type="email"
              value={editedLead.email}
              onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Email"
            />
          ) : (
            <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
              {lead.email}
            </a>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Phone className="w-5 h-5 text-gray-400" />
          {isEditing ? (
            <input
              type="tel"
              value={editedLead.phone}
              onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Téléphone"
            />
          ) : (
            <a href={`tel:${lead.phone}`} className="text-gray-700 hover:underline">
              {lead.phone}
            </a>
          )}
        </div>

        {lead.city && (
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            {isEditing ? (
              <input
                type="text"
                value={editedLead.city || ''}
                onChange={(e) => setEditedLead({ ...editedLead, city: e.target.value })}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Ville"
              />
            ) : (
              <span className="text-gray-700">{lead.city}</span>
            )}
          </div>
        )}

        {lead.immatriculation && (
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-gray-400" />
            {isEditing ? (
              <input
                type="text"
                value={editedLead.immatriculation || ''}
                onChange={(e) => setEditedLead({ ...editedLead, immatriculation: e.target.value })}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Immatriculation"
              />
            ) : (
              <span className="text-gray-700 font-mono">{lead.immatriculation}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <span className={`font-semibold ${scoreColor}`}>
            Score: {lead.score}/100
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-gray-700 text-sm">
            Créé le {new Date(lead.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>

        {lead.last_interaction_at && (
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <span className="text-gray-700 text-sm">
              Dernier contact: {new Date(lead.last_interaction_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
        )}
      </div>

      {(isEditing || lead.notes) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-gray-400 mt-1" />
            {isEditing ? (
              <textarea
                value={editedLead.notes || ''}
                onChange={(e) => setEditedLead({ ...editedLead, notes: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="Notes..."
                rows={3}
              />
            ) : (
              <p className="text-gray-700 text-sm">{lead.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
