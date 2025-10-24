/*
  # Populate Trend Analyzer with Initial Data

  1. Populate content_opportunities with realistic SEO data
  2. Add diverse keywords for taxi insurance
  3. Set proper priorities based on search intent
*/

-- Supprimer les anciennes données
TRUNCATE TABLE content_opportunities CASCADE;

-- Insérer des opportunités réalistes
INSERT INTO content_opportunities (
  keyword,
  priority,
  search_volume,
  competition,
  trend,
  suggested_title,
  suggested_questions,
  estimated_traffic,
  difficulty,
  analyzed_at
) VALUES
-- Haute priorité (mots-clés principaux)
(
  'assurance taxi pas cher',
  'high',
  3200,
  'medium',
  'rising',
  'Assurance Taxi Pas Cher : Comment Économiser 30% en 2025',
  ARRAY[
    'Comment trouver une assurance taxi pas cher ?',
    'Quelle est la meilleure assurance taxi économique ?',
    'Comment réduire le coût de son assurance taxi ?',
    'Assurance taxi : quelles sont les offres les moins chères ?',
    'Peut-on avoir une assurance taxi à moins de 100€/mois ?'
  ],
  480,
  5,
  NOW()
),
(
  'devis assurance taxi en ligne',
  'high',
  2800,
  'low',
  'rising',
  'Devis Assurance Taxi en Ligne : Comparatif Instantané 2025',
  ARRAY[
    'Comment obtenir un devis assurance taxi rapidement ?',
    'Est-ce gratuit de demander un devis assurance taxi ?',
    'Combien de temps pour recevoir un devis assurance taxi ?',
    'Peut-on souscrire directement après le devis ?',
    'Faut-il des documents pour un devis assurance taxi ?'
  ],
  840,
  3,
  NOW()
),
(
  'assurance taxi jeune conducteur',
  'high',
  2400,
  'medium',
  'rising',
  'Assurance Taxi Jeune Conducteur : Solutions et Prix 2025',
  ARRAY[
    'Comment assurer un taxi avec moins de 3 ans de permis ?',
    'Quel est le surcoût pour un jeune conducteur de taxi ?',
    'Peut-on être taxi avec 2 ans de permis ?',
    'Existe-t-il des assurances spéciales jeunes taxis ?',
    'Comment réduire le malus jeune conducteur taxi ?'
  ],
  360,
  6,
  NOW()
),

-- Priorité moyenne (opportunités intéressantes)
(
  'assurance taxi électrique',
  'medium',
  1800,
  'low',
  'rising',
  'Assurance Taxi Électrique : Avantages et Tarifs 2025',
  ARRAY[
    'L''assurance est-elle moins chère pour un taxi électrique ?',
    'Quelles garanties spécifiques pour un taxi électrique ?',
    'Tesla Model 3 : quelle assurance taxi ?',
    'Aide financière pour assurer un taxi électrique ?',
    'Quelle est la meilleure assurance pour taxi électrique ?'
  ],
  540,
  4,
  NOW()
),
(
  'changement assurance taxi',
  'medium',
  1600,
  'medium',
  'stable',
  'Changer d''Assurance Taxi : Procédure et Meilleur Moment',
  ARRAY[
    'Quand peut-on changer d''assurance taxi ?',
    'Comment résilier son assurance taxi actuelle ?',
    'Y a-t-il des frais pour changer d''assurance taxi ?',
    'Peut-on changer d''assurance taxi en cours d''année ?',
    'Combien de temps pour changer d''assurance taxi ?'
  ],
  240,
  5,
  NOW()
),
(
  'assurance taxi sinistre',
  'medium',
  1400,
  'medium',
  'stable',
  'Sinistre Taxi : Procédure et Délais de Remboursement',
  ARRAY[
    'Que faire en cas d''accident avec un taxi assuré ?',
    'Combien de temps pour être remboursé d''un sinistre taxi ?',
    'Le taxi de remplacement est-il inclus ?',
    'Impact d''un sinistre sur la prime d''assurance taxi ?',
    'Comment déclarer un sinistre taxi rapidement ?'
  ],
  210,
  5,
  NOW()
),

-- Basse priorité (longue traîne)
(
  'assurance taxi Lyon',
  'low',
  900,
  'high',
  'stable',
  'Assurance Taxi à Lyon : Comparatif Local 2025',
  ARRAY[
    'Quel est le prix moyen d''une assurance taxi à Lyon ?',
    'Y a-t-il des assureurs spécialisés à Lyon ?',
    'Assurance taxi Lyon : faut-il une garantie neige ?',
    'Courtiers assurance taxi sur Lyon ?',
    'Réglementation taxi Lyon : impact sur l''assurance ?'
  ],
  45,
  7,
  NOW()
),
(
  'assurance taxi marseille',
  'low',
  850,
  'high',
  'stable',
  'Assurance Taxi Marseille : Tarifs et Spécificités 2025',
  ARRAY[
    'Combien coûte une assurance taxi à Marseille ?',
    'Faut-il une garantie vol renforcée à Marseille ?',
    'Assureurs recommandés pour taxis marseillais ?',
    'Impact de la zone géographique sur l''assurance taxi ?',
    'Carte professionnelle Marseille : impact assurance ?'
  ],
  43,
  7,
  NOW()
),
(
  'assurance flotte taxi',
  'low',
  720,
  'low',
  'stable',
  'Assurance Flotte de Taxis : Tarifs Dégressifs 2025',
  ARRAY[
    'A partir de combien de véhicules pour une flotte ?',
    'Quel est le rabais pour une assurance flotte taxi ?',
    'Peut-on ajouter/retirer des véhicules en cours d''année ?',
    'Gestion centralisée des sinistres en flotte ?',
    'Assurance flotte taxi : garanties obligatoires ?'
  ],
  216,
  4,
  NOW()
),
(
  'RC professionnelle taxi obligatoire',
  'low',
  680,
  'medium',
  'stable',
  'RC Pro Taxi : Est-elle Vraiment Obligatoire en 2025 ?',
  ARRAY[
    'La RC professionnelle est-elle obligatoire pour les taxis ?',
    'Quelle est l''amende sans RC Pro taxi ?',
    'RC Pro incluse dans l''assurance taxi de base ?',
    'Montant minimum de garantie RC Pro taxi ?',
    'Qui contrôle la RC professionnelle des taxis ?'
  ],
  102,
  5,
  NOW()
),
(
  'assurance taxi VTC combinée',
  'low',
  580,
  'medium',
  'rising',
  'Assurance Taxi-VTC Combinée : Double Activité en 2025',
  ARRAY[
    'Peut-on avoir les deux cartes taxi et VTC ?',
    'Une seule assurance pour taxi et VTC est-elle possible ?',
    'Quel surcoût pour une assurance taxi-VTC ?',
    'Comment déclarer une double activité taxi-VTC ?',
    'Assurance adaptée pour taxi ET Uber en même temps ?'
  ],
  87,
  6,
  NOW()
),
(
  'assurance taxi paris tarif',
  'low',
  520,
  'high',
  'stable',
  'Assurance Taxi Paris : Prix Moyen et Particularités 2025',
  ARRAY[
    'Pourquoi l''assurance taxi est plus chère à Paris ?',
    'Quel est le prix moyen d''une assurance taxi parisien ?',
    'Faut-il une garantie spéciale circulation dense Paris ?',
    'Peut-on assurer un taxi Paris en province ?',
    'Impact de la carte pro Paris sur l''assurance ?'
  ],
  26,
  8,
  NOW()
);

-- Vérifier l'insertion
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM content_opportunities;
  RAISE NOTICE '✅ % opportunités de contenu insérées', record_count;
END $$;
