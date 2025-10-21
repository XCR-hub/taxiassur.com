/*
═══════════════════════════════════════════════════════════════════
🔧 FIX: Générateur IA Réseaux Sociaux (Erreur 500)
═══════════════════════════════════════════════════════════════════

PROBLÈME: Erreur 500 lors de "Générer avec IA" dans /backoffice/social-media

CAUSES POSSIBLES:
1. ❌ Aucun template viral dans la table viral_templates
2. ❌ Clé OPENAI_API_KEY non configurée dans Supabase
3. ❌ Fonction RPC get_viral_template retourne vide

COPIER/COLLER DANS: Supabase Dashboard → SQL Editor → RUN
═══════════════════════════════════════════════════════════════════
*/

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 1: DIAGNOSTIC - Vérifier l'existence des templates
-- ═════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as total_templates,
  COUNT(CASE WHEN is_active = true THEN 1 END) as actifs,
  string_agg(DISTINCT category, ', ') as categories
FROM viral_templates;

-- Si résultat = 0, aucun template n'existe
-- Si actifs = 0, tous les templates sont désactivés

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 2: TESTER LA FONCTION RPC get_viral_template
-- ═════════════════════════════════════════════════════════════

SELECT * FROM get_viral_template('assurance');

-- Si résultat vide, la fonction ne retourne rien
-- L'Edge Function échouera avec "No viral template found"

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 3: INSÉRER DES TEMPLATES VIRAUX SI MANQUANTS
-- ═════════════════════════════════════════════════════════════

-- Supprimer les anciens templates si nécessaire
-- TRUNCATE TABLE viral_templates CASCADE;

-- Insérer 5 templates viraux haute performance
INSERT INTO viral_templates (
  name,
  category,
  template_text,
  hashtags,
  emoji_pattern,
  engagement_tactics,
  avg_views,
  performance_score,
  is_active
) VALUES
-- Template 1: Question choc
(
  'Question Choc - Assurance',
  'assurance',
  'Saviez-vous que [CHIFFRE PRÉCIS] % des [PUBLIC CIBLE] paient TROP CHER leur assurance ? 😱

Voici LA méthode que personne ne vous dit pour économiser jusqu''à [MONTANT] € par an :

1️⃣ [ASTUCE 1]
2️⃣ [ASTUCE 2]
3️⃣ [ASTUCE 3]

💡 Bonus : [CONSEIL SECRET]

👉 Qui applique ça dès aujourd''hui ? Commentez "OUI" 👇',
  ARRAY['#AssuranceTaxi', '#EconomiesGaranties', '#ConseildExpert', '#VTC', '#TaxiPro'],
  '😱💡👉📊✅',
  '{"hook": "question_choc", "call_to_action": "commentez", "social_proof": "chiffres_precis", "curiosity_gap": true}'::jsonb,
  7200000,
  95,
  true
),

-- Template 2: Histoire personnelle
(
  'Histoire Personnelle - Témoignage',
  'assurance',
  'Il y a [DURÉE], j''ai failli perdre [CONSÉQUENCE DRAMATIQUE] 😰

Aujourd''hui, grâce à [SOLUTION], j''ai économisé [MONTANT PRÉCIS] € et je dors tranquille.

Ce que j''ai compris :
✅ [LEÇON 1]
✅ [LEÇON 2]
✅ [LEÇON 3]

D''ailleurs, [STATISTIQUE SURPRENANTE]

Mon conseil : [ACTION CONCRÈTE]

🔥 Sauvegardez ce post, vous le retrouverez au bon moment !',
  ARRAY['#TémoignageTaxi', '#AssurancePro', '#ConseilExpert', '#TaxiConseils', '#VTCBusiness'],
  '😰✅🔥💪📈',
  '{"hook": "histoire_personnelle", "emotion": "peur_puis_soulagement", "call_to_action": "sauvegardez", "credibility": "statistique"}'::jsonb,
  5800000,
  92,
  true
),

-- Template 3: Liste numérotée
(
  'Top 5 Erreurs - Liste Virale',
  'assurance',
  'TOP 5 des ERREURS qui vous coûtent des milliers d''euros en assurance taxi 💸

(La #3 est la plus courante)

1️⃣ [ERREUR 1] → Conséquence : [COÛT]
2️⃣ [ERREUR 2] → Perte moyenne : [MONTANT]
3️⃣ [ERREUR 3] → 89% des taxis font ça ! 😱
4️⃣ [ERREUR 4] → Impact : [CHIFFRE]
5️⃣ [ERREUR 5] → Solution : [CONSEIL]

💡 Celle que vous devez corriger MAINTENANT : la #3

👉 Identifiez un chauffeur qui doit voir ça !',
  ARRAY['#ErreursTaxi', '#AssuranceOptimale', '#ConseilsAssurance', '#TaxiEconomies', '#ProTips'],
  '💸😱💡👉⚡',
  '{"hook": "top_liste", "curiosity_gap": true, "call_to_action": "identifiez", "urgency": "maintenant"}'::jsonb,
  8500000,
  98,
  true
),

-- Template 4: Avant/Après
(
  'Transformation Avant/Après',
  'assurance',
  'AVANT ❌ vs APRÈS ✅

Il y a [DURÉE], je payais [MONTANT_AVANT] € d''assurance taxi.

Mes erreurs :
❌ [ERREUR 1]
❌ [ERREUR 2]
❌ [ERREUR 3]

AUJOURD''HUI, je paie seulement [MONTANT_APRÈS] € 🎯

Ce qui a changé :
✅ [AMÉLIORATION 1]
✅ [AMÉLIORATION 2]
✅ [AMÉLIORATION 3]

Résultat : [ÉCONOMIE ANNUELLE] € économisés par an !

En fait, la clé c''était [INSIGHT CLÉ].

💬 Et vous, vous payez combien actuellement ?',
  ARRAY['#TransformationTaxi', '#EconomiesAssurance', '#AvantAprès', '#TaxiSuccess', '#OptimisationCoûts'],
  '❌✅🎯💪📊',
  '{"hook": "avant_apres", "social_proof": "montants_precis", "call_to_action": "question", "credibility": "transparence"}'::jsonb,
  6400000,
  94,
  true
),

-- Template 5: Mythe vs Réalité
(
  'Mythe VS Réalité - Éducation',
  'assurance',
  '🚨 MYTHE vs RÉALITÉ sur l''assurance taxi 🚨

❌ MYTHE : [CROYANCE FAUSSE RÉPANDUE]
✅ RÉALITÉ : [VÉRITÉ SURPRENANTE]

❌ MYTHE : [IDÉE REÇUE 2]
✅ RÉALITÉ : [FAIT CONCRET AVEC CHIFFRE]

❌ MYTHE : [ERREUR COMMUNE 3]
✅ RÉALITÉ : [EXPLICATION CLAIRE]

Notamment, [STATISTIQUE CHOC] % des chauffeurs pensent encore que [MYTHE], alors qu''en réalité [VÉRITÉ].

Ce que ça change pour vous :
💰 [IMPACT FINANCIER]
🛡️ [IMPACT PROTECTION]
⏱️ [IMPACT TEMPS]

📌 Sauvegardez ce post pour le partager à vos collègues !',
  ARRAY['#MythesAssurance', '#VéritésTaxi', '#ÉducationFinancière', '#AssuranceDémystifiée', '#ConnaissancesPro'],
  '🚨❌✅💰🛡️',
  '{"hook": "mythe_realite", "education": true, "call_to_action": "sauvegardez", "social_proof": "statistique", "virality": "partage_collegues"}'::jsonb,
  7800000,
  96,
  true
)
ON CONFLICT (name) DO UPDATE
SET
  template_text = EXCLUDED.template_text,
  hashtags = EXCLUDED.hashtags,
  emoji_pattern = EXCLUDED.emoji_pattern,
  engagement_tactics = EXCLUDED.engagement_tactics,
  avg_views = EXCLUDED.avg_views,
  performance_score = EXCLUDED.performance_score,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 4: VÉRIFICATION FINALE
-- ═════════════════════════════════════════════════════════════

-- Compter les templates actifs
SELECT
  COUNT(*) as total_actifs,
  AVG(avg_views) as vues_moyennes,
  AVG(performance_score) as score_moyen
FROM viral_templates
WHERE is_active = true;

-- Tester la fonction RPC avec catégorie
SELECT
  name,
  category,
  avg_views,
  performance_score
FROM get_viral_template('assurance')
LIMIT 3;

-- Tester la fonction RPC sans catégorie (retourne le meilleur template)
SELECT
  name,
  category,
  avg_views,
  performance_score
FROM get_viral_template(NULL)
LIMIT 1;

/*
═══════════════════════════════════════════════════════════════════
✅ RÉSULTAT ATTENDU
═══════════════════════════════════════════════════════════════════

Après exécution, vous devriez avoir :
- 5 templates viraux actifs
- Score moyen : 95/100
- Vues moyennes : 7.1M+

La fonction get_viral_template devrait retourner au moins 1 template.

IMPORTANT: Configuration de OPENAI_API_KEY
═══════════════════════════════════════════════════════════════════

Si l'erreur persiste après avoir des templates, c'est la clé OpenAI :

1. Aller dans Supabase Dashboard
2. Settings → Edge Functions → Manage secrets
3. Ajouter : OPENAI_API_KEY = sk-proj-...votre-clé...

SANS cette clé, l'Edge Function retournera toujours erreur 500.

TEST FINAL
═══════════════════════════════════════════════════════════════════

1. Exécuter ce SQL
2. Vérifier que les templates existent
3. Configurer OPENAI_API_KEY dans Supabase
4. Retourner sur /backoffice/social-media
5. Cliquer "Générer avec IA"
6. ✅ Ça devrait fonctionner !

═══════════════════════════════════════════════════════════════════
*/
