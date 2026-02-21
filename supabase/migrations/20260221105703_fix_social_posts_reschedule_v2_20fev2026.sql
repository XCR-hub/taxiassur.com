/*
  # Reprogrammer les posts LinkedIn et Pinterest - 20 février 2026

  ## Problème identifié

  12 posts LinkedIn/Pinterest sont programmés avec des dates PASSÉES (oct 2025, jan 2026)
  Les crons ne les publient pas car ils cherchent des posts à publier dans un intervalle récent.

  ## Solution

  Reprogrammer tous les posts 'scheduled' avec des dates futures :
  - LinkedIn : 2 fois par jour (9h et 15h) sur les 7 prochains jours
  - Pinterest : 3 fois par jour (10h, 14h, 19h) sur les 7 prochains jours
*/

-- 1. Reprogrammer les posts LinkedIn programmés avec dates futures
WITH linkedin_posts AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM social_posts
  WHERE platform = 'linkedin'
    AND status = 'scheduled'
    AND scheduled_at < NOW()
)
UPDATE social_posts
SET 
  scheduled_at = NOW() + (
    CASE 
      WHEN (lp.rn - 1) % 2 = 0 THEN INTERVAL '9 hours'  -- Matin 9h
      ELSE INTERVAL '15 hours'  -- Après-midi 15h
    END
  ) + ((lp.rn - 1) / 2) * INTERVAL '1 day'
FROM linkedin_posts lp
WHERE social_posts.id = lp.id;

-- 2. Reprogrammer les posts Pinterest (s'il y en a)
WITH pinterest_posts AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM social_posts
  WHERE platform = 'pinterest'
    AND status = 'scheduled'
    AND scheduled_at < NOW()
)
UPDATE social_posts
SET 
  scheduled_at = NOW() + (
    CASE 
      WHEN (pp.rn - 1) % 3 = 0 THEN INTERVAL '10 hours'  -- Matin 10h
      WHEN (pp.rn - 1) % 3 = 1 THEN INTERVAL '14 hours'  -- Après-midi 14h
      ELSE INTERVAL '19 hours'  -- Soir 19h
    END
  ) + ((pp.rn - 1) / 3) * INTERVAL '1 day'
FROM pinterest_posts pp
WHERE social_posts.id = pp.id;

-- 3. Créer un post immédiat pour tester (LinkedIn)
INSERT INTO social_posts (
  id,
  platform,
  content,
  hashtags,
  status,
  scheduled_at,
  ai_generated,
  created_at
) VALUES (
  gen_random_uuid(),
  'linkedin',
  '🚖 Saviez-vous que 73% des chauffeurs de taxi paient TROP CHER leur assurance ?

Chez TaxiAssur, nous avons analysé des centaines de contrats et découvert que la plupart des professionnels ne bénéficient pas des meilleures offres du marché.

💡 Notre mission : Vous faire économiser jusqu''à 40% sur votre assurance taxi sans compromis sur les garanties.

✅ Comparaison instantanée de +50 assureurs
✅ Devis personnalisés en 2 minutes  
✅ Accompagnement par des experts du transport

👉 Demandez votre devis gratuit sur taxiassur.com

#AssuranceTaxi #TaxiPro #EconomieSmart #TransportPro #TaxiAssur',
  ARRAY['AssuranceTaxi', 'TaxiPro', 'EconomieSmart', 'TransportPro', 'TaxiAssur'],
  'scheduled',
  NOW() + INTERVAL '2 minutes',
  true,
  NOW()
) ON CONFLICT DO NOTHING;

-- Commentaire
COMMENT ON TABLE social_posts IS 'Posts sociaux reprogrammés le 20 février 2026 - Publications planifiées';
