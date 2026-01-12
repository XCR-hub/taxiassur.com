/*
  # Système de Checklist Commercial

  1. Nouvelles Tables
    - `commercial_checklist_templates` : Templates de checklist par type de produit
    - `commercial_checklist_items` : Items cochés pour chaque lead
    
  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour authentifiés seulement

  3. Fonctionnalités
    - Templates personnalisables par produit
    - Suivi granulaire des actions
    - Historique complet
    - Pourcentage d'avancement automatique
*/

-- Table des templates de checklist
CREATE TABLE IF NOT EXISTS commercial_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  product_type text, -- 'auto', 'habitation', 'sante', 'pro', 'vie', 'all'
  checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des items cochés par lead
CREATE TABLE IF NOT EXISTS commercial_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  is_checked boolean DEFAULT false,
  checked_at timestamptz,
  checked_by uuid REFERENCES admin_users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, item_key)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_checklist_items_lead ON commercial_checklist_items(lead_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checked ON commercial_checklist_items(is_checked);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_product ON commercial_checklist_templates(product_type);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_active ON commercial_checklist_templates(is_active);

-- RLS
ALTER TABLE commercial_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_checklist_items ENABLE ROW LEVEL SECURITY;

-- Policies templates
CREATE POLICY "Templates lisibles par authentifiés"
  ON commercial_checklist_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Templates modifiables par authentifiés"
  ON commercial_checklist_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies items
CREATE POLICY "Items lisibles par authentifiés"
  ON commercial_checklist_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Items modifiables par authentifiés"
  ON commercial_checklist_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour obtenir le pourcentage d'avancement
CREATE OR REPLACE FUNCTION get_lead_checklist_progress(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_checked integer;
  v_percentage numeric;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_checked = true)
  INTO v_total, v_checked
  FROM commercial_checklist_items
  WHERE lead_id = p_lead_id;

  IF v_total = 0 THEN
    v_percentage := 0;
  ELSE
    v_percentage := ROUND((v_checked::numeric / v_total::numeric) * 100, 0);
  END IF;

  RETURN jsonb_build_object(
    'total', v_total,
    'checked', v_checked,
    'unchecked', v_total - v_checked,
    'percentage', v_percentage
  );
END;
$$;

-- Fonction pour initialiser la checklist d'un lead
CREATE OR REPLACE FUNCTION initialize_lead_checklist(p_lead_id uuid, p_product_type text DEFAULT 'all')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template record;
  v_item jsonb;
BEGIN
  -- Récupérer le template actif pour ce type de produit
  SELECT * INTO v_template
  FROM commercial_checklist_templates
  WHERE (product_type = p_product_type OR product_type = 'all')
    AND is_active = true
  ORDER BY display_order
  LIMIT 1;

  IF v_template.id IS NOT NULL THEN
    -- Créer les items pour ce lead
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_template.checklist_items)
    LOOP
      INSERT INTO commercial_checklist_items (
        lead_id,
        item_key,
        item_label,
        is_checked
      ) VALUES (
        p_lead_id,
        v_item->>'key',
        v_item->>'label',
        false
      )
      ON CONFLICT (lead_id, item_key) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- Insérer les templates par défaut
INSERT INTO commercial_checklist_templates (name, description, product_type, checklist_items, display_order) VALUES
(
  'Checklist Assurance Auto',
  'Étapes de suivi pour un dossier assurance auto',
  'auto',
  '[
    {"key": "contact_initial", "label": "Contact téléphonique initial effectué"},
    {"key": "email_confirmation", "label": "Email de confirmation envoyé"},
    {"key": "documents_demandes", "label": "Liste documents demandés envoyée"},
    {"key": "permis_recu", "label": "Permis de conduire reçu et validé"},
    {"key": "carte_grise_recue", "label": "Carte grise reçue et validée"},
    {"key": "releve_info_recu", "label": "Relevé d''information reçu"},
    {"key": "rib_recu", "label": "RIB reçu et validé"},
    {"key": "devis_genere", "label": "Devis généré"},
    {"key": "devis_envoye", "label": "Devis envoyé au client"},
    {"key": "devis_accepte", "label": "Devis accepté par le client"},
    {"key": "compagnie_selectionnee", "label": "Compagnie d''assurance sélectionnée"},
    {"key": "dossier_envoye_compagnie", "label": "Dossier envoyé à la compagnie"},
    {"key": "contrat_recu_compagnie", "label": "Contrat reçu de la compagnie"},
    {"key": "contrat_signe", "label": "Contrat signé par le client"},
    {"key": "paiement_valide", "label": "Paiement validé"},
    {"key": "attestation_recue", "label": "Attestation d''assurance reçue"},
    {"key": "attestation_envoyee", "label": "Attestation envoyée au client"},
    {"key": "dossier_cloture", "label": "Dossier clôturé en production"}
  ]'::jsonb,
  1
),
(
  'Checklist Assurance Habitation',
  'Étapes de suivi pour un dossier assurance habitation',
  'habitation',
  '[
    {"key": "contact_initial", "label": "Contact téléphonique initial effectué"},
    {"key": "email_confirmation", "label": "Email de confirmation envoyé"},
    {"key": "documents_demandes", "label": "Liste documents demandés envoyée"},
    {"key": "justif_domicile_recu", "label": "Justificatif de domicile reçu"},
    {"key": "bail_titre_recu", "label": "Bail ou titre de propriété reçu"},
    {"key": "diagnostics_recus", "label": "Diagnostics électrique/gaz reçus"},
    {"key": "rib_recu", "label": "RIB reçu et validé"},
    {"key": "devis_genere", "label": "Devis généré"},
    {"key": "devis_envoye", "label": "Devis envoyé au client"},
    {"key": "devis_accepte", "label": "Devis accepté par le client"},
    {"key": "compagnie_selectionnee", "label": "Compagnie d''assurance sélectionnée"},
    {"key": "dossier_envoye_compagnie", "label": "Dossier envoyé à la compagnie"},
    {"key": "contrat_recu_compagnie", "label": "Contrat reçu de la compagnie"},
    {"key": "contrat_signe", "label": "Contrat signé par le client"},
    {"key": "paiement_valide", "label": "Paiement validé"},
    {"key": "attestation_recue", "label": "Attestation d''assurance reçue"},
    {"key": "attestation_envoyee", "label": "Attestation envoyée au client"},
    {"key": "dossier_cloture", "label": "Dossier clôturé en production"}
  ]'::jsonb,
  2
),
(
  'Checklist Générique',
  'Étapes de suivi génériques pour tout type de dossier',
  'all',
  '[
    {"key": "contact_initial", "label": "Premier contact établi"},
    {"key": "besoin_qualifie", "label": "Besoin qualifié et compris"},
    {"key": "documents_demandes", "label": "Documents nécessaires demandés"},
    {"key": "documents_complets", "label": "Tous les documents reçus"},
    {"key": "devis_genere", "label": "Devis généré"},
    {"key": "devis_presente", "label": "Devis présenté au client"},
    {"key": "objections_traitees", "label": "Objections traitées"},
    {"key": "devis_accepte", "label": "Devis accepté"},
    {"key": "contrat_prepare", "label": "Contrat préparé"},
    {"key": "contrat_signe", "label": "Contrat signé"},
    {"key": "paiement_effectue", "label": "Paiement effectué"},
    {"key": "mise_en_production", "label": "Mis en production"},
    {"key": "suivi_post_vente", "label": "Suivi post-vente effectué"}
  ]'::jsonb,
  99
);

COMMENT ON TABLE commercial_checklist_templates IS 'Templates de checklist commercial par type de produit';
COMMENT ON TABLE commercial_checklist_items IS 'Items de checklist cochés par lead';
COMMENT ON FUNCTION get_lead_checklist_progress IS 'Calcule le pourcentage d''avancement de la checklist d''un lead';
COMMENT ON FUNCTION initialize_lead_checklist IS 'Initialise la checklist d''un lead selon son type de produit';
