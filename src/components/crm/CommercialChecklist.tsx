import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, User, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { nativeAdminSession } from '@/lib/native-admin-auth';
import { Badge } from '../Badge';

interface ChecklistItem {
  id: string;
  lead_id: string;
  item_key: string;
  item_label: string;
  is_checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ChecklistProgress {
  total: number;
  checked: number;
  unchecked: number;
  percentage: number;
}

interface CommercialChecklistProps {
  leadId: string;
  productType?: string;
  onProgressChange?: (progress: ChecklistProgress) => void;
}

export function CommercialChecklist({ leadId, productType = 'all', onProgressChange }: CommercialChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState<ChecklistProgress>({ total: 0, checked: 0, unchecked: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadChecklist();
  }, [leadId]);

  const loadChecklist = async () => {
    try {
      setLoading(true);

      // Charger les items existants
      const { data: existingItems, error: itemsError } = await supabase
        .from('commercial_checklist_items')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      // Si aucun item, initialiser depuis le template
      if (!existingItems || existingItems.length === 0) {
        const { error: initError } = await supabase.rpc('initialize_lead_checklist', {
          p_lead_id: leadId,
          p_product_type: productType
        });

        if (initError) throw initError;

        // Recharger après initialisation
        const { data: newItems, error: reloadError } = await supabase
          .from('commercial_checklist_items')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true });

        if (reloadError) throw reloadError;
        setItems(newItems || []);
      } else {
        setItems(existingItems);
      }

      // Charger la progression
      await loadProgress();
    } catch (error) {
      console.error('Erreur chargement checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const { data, error } = await supabase.rpc('get_lead_checklist_progress', {
        p_lead_id: leadId
      });

      if (error) throw error;

      if (data) {
        setProgress(data as ChecklistProgress);
        if (onProgressChange) {
          onProgressChange(data as ChecklistProgress);
        }
      }
    } catch (error) {
      console.error('Erreur calcul progression:', error);
    }
  };

  const handleToggleItem = async (itemId: string, currentState: boolean) => {
    setUpdating(itemId);
    try {
      const { user } = await nativeAdminSession();

      const { error } = await supabase
        .from('commercial_checklist_items')
        .update({
          is_checked: !currentState,
          checked_at: !currentState ? new Date().toISOString() : null,
          checked_by: !currentState ? user?.id : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      await loadChecklist();
    } catch (error) {
      console.error('Erreur mise à jour item:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleAddItem = async () => {
    if (!newItemLabel.trim()) return;

    try {
      const itemKey = `custom_${Date.now()}`;
      const { error } = await supabase
        .from('commercial_checklist_items')
        .insert([{
          lead_id: leadId,
          item_key: itemKey,
          item_label: newItemLabel.trim(),
          is_checked: false
        }]);

      if (error) throw error;

      setNewItemLabel('');
      setShowAddItem(false);
      await loadChecklist();
    } catch (error) {
      console.error('Erreur ajout item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Supprimer cet item ?')) return;

    try {
      const { error } = await supabase
        .from('commercial_checklist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await loadChecklist();
    } catch (error) {
      console.error('Erreur suppression item:', error);
    }
  };

  const handleSaveNote = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('commercial_checklist_items')
        .update({
          notes: noteText.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      setEditingNote(null);
      setNoteText('');
      await loadChecklist();
    } catch (error) {
      console.error('Erreur sauvegarde note:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-800 rounded w-1/4"></div>
          <div className="h-10 bg-gray-800 rounded"></div>
          <div className="h-10 bg-gray-800 rounded"></div>
          <div className="h-10 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      {/* Header avec progression */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Suivi Commercial</h3>
          <p className="text-sm text-gray-400">
            {progress.checked} / {progress.total} étapes complétées
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-500 mb-1">
            {progress.percentage}%
          </div>
          <Badge
            variant={progress.percentage === 100 ? 'success' : progress.percentage >= 50 ? 'warning' : 'default'}
            size="sm"
          >
            {progress.percentage === 100 ? 'Terminé' : progress.percentage >= 50 ? 'En cours' : 'Démarré'}
          </Badge>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mb-6">
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              progress.percentage === 100 ? 'bg-green-500' :
              progress.percentage >= 75 ? 'bg-blue-500' :
              progress.percentage >= 50 ? 'bg-yellow-500' :
              progress.percentage >= 25 ? 'bg-orange-500' :
              'bg-red-500'
            }`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Liste des items */}
      <div className="space-y-2 mb-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`border border-gray-800 rounded-lg p-4 transition-all ${
              item.is_checked ? 'bg-gray-800/50' : 'bg-gray-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => handleToggleItem(item.id, item.is_checked)}
                disabled={updating === item.id}
                className={`flex-shrink-0 mt-0.5 transition-all ${
                  updating === item.id ? 'opacity-50 cursor-wait' : 'hover:scale-110'
                }`}
              >
                {item.is_checked ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-600 hover:text-gray-400" />
                )}
              </button>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <label
                    className={`text-sm font-medium cursor-pointer ${
                      item.is_checked ? 'text-gray-500 line-through' : 'text-white'
                    }`}
                    onClick={() => handleToggleItem(item.id, item.is_checked)}
                  >
                    {item.item_label}
                  </label>

                  {/* Actions */}
                  {item.item_key.startsWith('custom_') && (
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-500 hover:text-red-400 p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Info validation */}
                {item.is_checked && item.checked_at && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      Validé le {new Date(item.checked_at).toLocaleDateString('fr-FR')} à{' '}
                      {new Date(item.checked_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {editingNote === item.id ? (
                  <div className="mt-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                      rows={2}
                      placeholder="Ajouter une note..."
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveNote(item.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => {
                          setEditingNote(null);
                          setNoteText('');
                        }}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {item.notes && (
                      <div className="mt-2 text-sm text-gray-400 bg-gray-800 rounded px-3 py-2">
                        {item.notes}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setEditingNote(item.id);
                        setNoteText(item.notes || '');
                      }}
                      className="text-xs text-blue-500 hover:text-blue-400 mt-1 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      {item.notes ? 'Modifier la note' : 'Ajouter une note'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ajouter un item personnalisé */}
      {showAddItem ? (
        <div className="border border-blue-500 rounded-lg p-4 bg-blue-950/20">
          <input
            type="text"
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white mb-3"
            placeholder="Nom de l'étape personnalisée..."
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddItem}
              disabled={!newItemLabel.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              Ajouter
            </button>
            <button
              onClick={() => {
                setShowAddItem(false);
                setNewItemLabel('');
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddItem(true)}
          className="w-full border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-lg p-4 text-gray-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Ajouter une étape personnalisée</span>
        </button>
      )}
    </div>
  );
}
