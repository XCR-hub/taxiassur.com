/*
  # Configuration de Tissya - Assistante IA TaxiAssur

  1. Configuration
    - Mise à jour de l'agent chat-assistant avec la personnalité "Tissya"
    - Définition du system prompt personnalisé
    - Configuration des capacités et outils

  2. Personnalité Tissya
    - Assistante sympathique et professionnelle
    - Expertise en assurance taxi
    - Accompagnement personnalisé
    - Orientation vers les bonnes ressources
*/

-- Configuration de l'agent Tissya
INSERT INTO llm_agents (
  id,
  name,
  slug,
  description,
  agent_type,
  model_id,
  system_prompt,
  capabilities,
  tools,
  config,
  temperature,
  max_tokens,
  is_active,
  priority,
  rate_limit_per_minute
) VALUES (
  gen_random_uuid(),
  'Tissya - Assistante TaxiAssur',
  'tissya',
  'Assistante IA personnelle pour accompagner les prospects et clients TaxiAssur dans leur parcours d''assurance taxi',
  'specialist',
  'gpt-4o-mini',
  E'Tu es Tissya, l\'assistante IA de TaxiAssur, spécialisée en assurance pour taxis et artisans du transport.

**Personnalité :**
- Tu es chaleureuse, professionnelle et empathique
- Tu utilises un ton amical mais respectueux (tutoiement naturel)
- Tu es patiente et pédagogue dans tes explications
- Tu mets en confiance et rassures sur les démarches

**Expertise :**
- Assurance taxi (RC professionnelle, tous risques, dommages)
- Assurance VTC et transport de personnes
- Réglementation et obligations légales
- Tarifs et garanties des assurances
- Procédures de souscription et sinistres

**Missions :**
1. Répondre aux questions sur les assurances taxi
2. Guider dans le parcours de demande de devis
3. Expliquer les documents nécessaires
4. Accompagner dans le choix des garanties
5. Orienter vers l\'équipe humaine si nécessaire

**Comportement :**
- Pose des questions pour mieux comprendre les besoins
- Donne des informations précises et sourcées
- Utilise des exemples concrets
- Propose toujours une action concrète (devis, rappel, documentation)
- Si tu ne connais pas la réponse, oriente vers l\'équipe au 01 80 85 57 86

**Informations clés TaxiAssur :**
- Tarifs négociés avec 5+ compagnies (GENERALI, MFA, +Simple, Solly Azar, ZEPHIR)
- Économies moyennes : 30-35% par rapport aux tarifs standards
- Attestation sous 2h ouvrées
- Équipe disponible du lundi au vendredi 9h-18h
- Contact : 01 80 85 57 86 ou team@taxiassur.com

**Ton objectif :** Maximiser la satisfaction client et les conversions tout en apportant une réelle valeur ajoutée.',
  '["assurance_taxi", "devis_generation", "question_reponse", "orientation_client", "explication_garanties", "accompagnement_souscription"]'::jsonb,
  '["search_knowledge", "create_lead", "send_notification", "schedule_callback"]'::jsonb,
  '{
    "language": "fr",
    "domain": "insurance",
    "specialty": "taxi",
    "tone": "friendly_professional",
    "max_conversation_turns": 50,
    "fallback_to_human": true,
    "conversion_tracking": true
  }'::jsonb,
  0.8,
  2048,
  true,
  10,
  120
)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  capabilities = EXCLUDED.capabilities,
  tools = EXCLUDED.tools,
  config = EXCLUDED.config,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  is_active = EXCLUDED.is_active,
  priority = EXCLUDED.priority,
  updated_at = now();

-- Ajouter des documents de connaissance pour Tissya
INSERT INTO llm_knowledge_documents (
  title,
  source_type,
  content,
  category,
  tags,
  is_active
) VALUES
(
  'TaxiAssur - Présentation des services',
  'manual',
  E'TaxiAssur est le courtier spécialisé en assurance taxi et VTC. Nous négocions avec 5+ compagnies d\'assurance majeures pour obtenir les meilleurs tarifs. Nos clients économisent en moyenne 30-35% sur leur prime d\'assurance.

Services :
- Devis gratuit et sans engagement en 24h
- Comparaison de 5 compagnies obligatoires : GENERALI, MFA (2MA), +Simple, Solly Azar, ZEPHIR
- Attestation d\'assurance sous 2h ouvrées
- Accompagnement personnalisé de A à Z
- Gestion des sinistres
- Espace client digital complet

Contact : 01 80 85 57 86 | team@taxiassur.com
Horaires : Lundi-Vendredi 9h-18h',
  'services',
  ARRAY['taxiassur', 'services', 'présentation'],
  true
),
(
  'Documents nécessaires pour un devis',
  'manual',
  E'Pour obtenir un devis d\'assurance taxi, vous aurez besoin de :

**Documents obligatoires :**
1. Licence taxi ou carte VTC
2. Permis de conduire (recto-verso)
3. Pièce d\'identité (CNI ou passeport)
4. Carte grise du véhicule
5. Relevé d\'informations (de votre ancien assureur)
6. RIB (pour le prélèvement)

**Documents complémentaires selon profil :**
- Autorisation de stationnement (si applicable)
- Kbis (pour les sociétés)
- Attestation d\'inscription URSSAF/MSA

Notre équipe vous guide pour chaque document et valide leur conformité.',
  'documents',
  ARRAY['documents', 'devis', 'justificatifs'],
  true
),
(
  'Tarifs et économies moyennes',
  'manual',
  E'**Fourchette de prix assurance taxi :**
- Jeune conducteur : 2500-4500€/an
- Conducteur expérimenté : 1200-2500€/an
- Conducteur senior sans sinistre : 900-1800€/an

**Économies TaxiAssur :**
- Économie moyenne : 30-35% vs assureurs directs
- Exemple : Paris, 45 ans, 5 ans sans sinistre : 1850€ au lieu de 2800€
- Tarifs négociés avec volumes groupés

**Facteurs qui influencent le prix :**
- Âge et expérience du conducteur
- Historique de sinistres (bonus/malus)
- Ville d\'exercice (tarifs variables selon zones)
- Type de véhicule et garanties choisies
- Usage (taxi, VTC, double activité)',
  'tarifs',
  ARRAY['prix', 'tarifs', 'économies'],
  true
),
(
  'Garanties et couvertures',
  'manual',
  E'**Garanties obligatoires (RC Pro) :**
- Responsabilité Civile Professionnelle
- Protection juridique
- Défense pénale et recours suite à accident

**Garanties recommandées :**
- Dommages tous accidents (tous risques)
- Vol et incendie
- Bris de glace
- Protection du conducteur
- Individuelle accident

**Options utiles :**
- Véhicule de remplacement
- Assistance 0 km
- Protection du matériel professionnel (terminal CB, tablette)
- Protection juridique étendue

Nous analysons vos besoins pour vous recommander les garanties adaptées à votre situation.',
  'garanties',
  ARRAY['garanties', 'couvertures', 'protection'],
  true
),
(
  'Procédure de souscription complète',
  'manual',
  E'**Étapes de souscription TaxiAssur :**

1. **Demande de devis** (5 min)
   - Formulaire en ligne
   - Confirmation par email

2. **Upload des documents** (10 min)
   - Espace sécurisé personnel
   - Validation par notre équipe

3. **Réception des devis** (24-48h)
   - 5 compagnies comparées
   - Devis détaillés téléchargeables

4. **Choix de l\'offre**
   - Comparaison facilitée
   - Conseils personnalisés

5. **Finalisation** (15 min)
   - Signature électronique
   - Paiement sécurisé (comptant si besoin)

6. **Attestation** (2h ouvrées)
   - Envoyée par email
   - Disponible dans votre espace client

Accompagnement humain à chaque étape !',
  'processus',
  ARRAY['souscription', 'processus', 'étapes'],
  true
)
ON CONFLICT DO NOTHING;

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_llm_agents_slug ON llm_agents(slug);
CREATE INDEX IF NOT EXISTS idx_llm_knowledge_category ON llm_knowledge_documents(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_llm_knowledge_tags ON llm_knowledge_documents USING gin(tags);