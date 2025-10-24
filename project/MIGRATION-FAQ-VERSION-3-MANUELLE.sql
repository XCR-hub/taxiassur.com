/*
  # Migration FAQ - Version 3 (Manuelle - La Plus Sûre)

  Si les autres versions ne marchent pas, insère manuellement les 5 FAQ
*/

-- Option A : Voir d'abord ce qu'il y a dans 'faq'
SELECT question, answer, category FROM faq;

-- Option B : Insérer manuellement les 5 FAQ typiques
INSERT INTO faq_entries (question, answer, category, status) VALUES
(
  'Quel est le prix moyen d''une assurance taxi ?',
  'Le prix moyen d''une assurance taxi se situe entre 1 500€ et 3 000€ par an selon plusieurs critères : votre ville d''exercice, votre expérience, votre historique de sinistres, et les garanties choisies. À Paris et en région parisienne, les tarifs sont généralement 15 à 20% plus élevés.',
  'tarifs',
  'published'
),
(
  'Quelles garanties sont obligatoires pour un taxi ?',
  'Les garanties obligatoires incluent : la Responsabilité Civile (RC) qui couvre les dommages causés aux tiers, la RC Professionnelle pour les dommages liés à votre activité professionnelle, et l''assurance du véhicule au minimum en formule tiers. La protection juridique et l''assistance dépannage sont fortement recommandées.',
  'garanties',
  'published'
),
(
  'Que faire en cas de sinistre avec mon taxi ?',
  'Contactez-nous immédiatement au 01 80 85 57 86. Nous vous guiderons dans les démarches : déclaration du sinistre, constitution du dossier, suivi de l''indemnisation. Notre équipe est disponible 24h/24 pour vous accompagner.',
  'sinistre',
  'published'
),
(
  'Quels documents fournir pour obtenir un devis ?',
  'Pour un devis gratuit : carte grise du véhicule, permis de conduire, carte professionnelle de taxi, relevé d''information de votre assureur actuel (si vous en avez un), justificatif de domicile.',
  'procedure',
  'published'
),
(
  'Y a-t-il des frais cachés chez TaxiAssur ?',
  'NON ! Chez TaxiAssur, le prix affiché est le prix final. Pas de frais de dossier, pas de frais de mise en service, pas de surprise. Transparence totale garantie.',
  'tarifs',
  'published'
)
ON CONFLICT (question) DO NOTHING;

-- Vérifier le résultat final
SELECT COUNT(*) FROM faq_entries WHERE status = 'published';

-- Voir les dernières FAQ ajoutées
SELECT question, category, created_at
FROM faq_entries
ORDER BY created_at DESC
LIMIT 10;
