/*
  # Import FAQ et City Pages dans Supabase

  1. Import des FAQ
    - Importe toutes les FAQ depuis les fichiers JSON
    - Status: published pour visibilité immédiate

  2. Import des City Pages
    - Crée les pages villes principales
    - Status: published pour référencement

  3. Vérification
    - Compte le nombre d'entrées créées
    - Affiche les premières entrées
*/

-- ============================================================
-- PARTIE 1 : IMPORT DES FAQ
-- ============================================================

-- FAQ 1: Tarifs assurance
INSERT INTO faq_entries (question, answer, tags, status, category, display_order)
VALUES (
  'Combien coûte une assurance taxi avec TaxiAssur ?',
  'Nos tarifs négociés vous font économiser jusqu''à 35% vs assureurs classiques. Prix selon zone, expérience, véhicule. Moyenne clients : 890-1800€/an au lieu de 1200-2500€. Demandez votre devis personnalisé gratuit !',
  ARRAY['tarifs', 'économies', 'devis'],
  'published',
  'tarifs',
  1
)
ON CONFLICT DO NOTHING;

-- FAQ 2: Couverture France
INSERT INTO faq_entries (question, answer, tags, status, category, display_order)
VALUES (
  'Votre assurance couvre-t-elle toute la France ?',
  'Oui ! Couverture nationale complète, y compris DOM-TOM. Assistance 24/7 partout en France. Réseau 850+ garages agréés. Véhicule de remplacement disponible sous 24h en zone urbaine.',
  ARRAY['couverture', 'france', 'assistance'],
  'published',
  'couverture',
  2
)
ON CONFLICT DO NOTHING;

-- FAQ 3: Délai attestation
INSERT INTO faq_entries (question, answer, tags, status, category, display_order)
VALUES (
  'Quel est le délai pour recevoir mon attestation d''assurance ?',
  'Attestation immédiate par email (5 min max) après validation paiement. Carte verte sous 24-48h par courrier. Possibilité téléchargement PDF instantané depuis votre espace client.',
  ARRAY['attestation', 'délai', 'documents'],
  'published',
  'documents',
  3
)
ON CONFLICT DO NOTHING;

-- FAQ 4: Garanties incluses
INSERT INTO faq_entries (question, answer, tags, status, category, display_order)
VALUES (
  'Quelles garanties sont incluses dans votre assurance taxi ?',
  'Base : RC + Protection juridique + Défense pénale. Options : Tous risques, Bris de glace, Vol/incendie, Protection du conducteur (jusqu''à 500K€), Véhicule de remplacement, Dommages tous accidents.',
  ARRAY['garanties', 'couverture', 'protection'],
  'published',
  'garanties',
  4
)
ON CONFLICT DO NOTHING;

-- FAQ 5: Pièces nécessaires
INSERT INTO faq_entries (question, answer, tags, status, category, display_order)
VALUES (
  'Quelles pièces dois-je fournir pour mon assurance taxi ?',
  'Documents requis : Carte professionnelle taxi, Permis B (+ 3 ans min), Carte grise du véhicule, RIB, Relevé d''information assurance. Tout envoyable par email ou photo depuis l''app mobile.',
  ARRAY['documents', 'pièces', 'souscription'],
  'published',
  'documents',
  5
)
ON CONFLICT DO NOTHING;

-- FAQ 6: Résiliation assurance
INSERT INTO faq_entries (question, answer, tags, status, category, display_order)
VALUES (
  'Comment résilier mon assurance actuelle pour passer chez TaxiAssur ?',
  'On s''occupe de TOUT ! Loi Hamon : résiliation gratuite après 1 an, sans motif. Vous signez, on gère la résiliation auprès de votre ancien assureur. Zéro frais, zéro démarche pour vous.',
  ARRAY['résiliation', 'changement', 'loi-hamon'],
  'published',
  'résiliation',
  6
)
ON CONFLICT DO NOTHING;

-- FAQ 7: Procédure sinistre
INSERT INTO faq_entries (question, answer, tags, status, category, display_order)
VALUES (
  'Que faire en cas de sinistre avec mon taxi ?',
  'Process rapide : 1) Appelez notre hotline 24/7 (dans votre attestation) 2) Déclarez via app mobile ou formulaire web 3) Photos + constat en ligne 4) Expert sous 48h 5) Indemnisation sous 5 jours ouvrés si dossier complet.',
  ARRAY['sinistre', 'procédure', 'indemnisation'],
  'published',
  'sinistres',
  7
)
ON CONFLICT DO NOTHING;

-- FAQ 8: Frais cachés
INSERT INTO faq_entries (question, answer, tags, status, category, display_order)
VALUES (
  'Y a-t-il des frais cachés ou supplémentaires ?',
  'ZÉRO frais caché. Tarif annoncé = tarif payé. Inclus : dossier, fractionnement mensuel, modification contrat, attestations supplémentaires, assistance. Franchise précisée dès le devis.',
  ARRAY['tarifs', 'frais', 'transparence'],
  'published',
  'tarifs',
  8
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PARTIE 2 : IMPORT DES CITY PAGES (Principales Villes)
-- ============================================================

-- Paris
INSERT INTO city_pages (city, title, slug, content, meta_description, keywords, status)
VALUES (
  'Paris',
  'Assurance Taxi Paris - Devis Immédiat & Tarifs 2025',
  'assurance-taxi-paris',
  '<h2>L''Assurance Taxi Spécialisée pour Paris</h2>
<p>Paris et sa région concentrent plus de 18 000 taxis. TaxiAssur propose des contrats adaptés aux spécificités parisiennes : circulation dense, courses longues vers aéroports, clientèle internationale.</p>

<h3>Tarifs Assurance Taxi à Paris</h3>
<p>Fourchette moyenne : <strong>1 200€ - 2 400€/an</strong> selon profil et garanties. Nos tarifs négociés : économie moyenne de 430€/an vs assureurs traditionnels.</p>

<h3>Garanties Spécifiques Paris</h3>
<ul>
<li><strong>Protection juridique renforcée</strong> : litiges clients, contrôles préfecture</li>
<li><strong>Assistance 24/7</strong> : dépannage/remorquage en moins de 45 min intra-muros</li>
<li><strong>Véhicule de remplacement</strong> : sous 4h en zone Paris</li>
<li><strong>Couverture aéroports</strong> : CDG, Orly, Le Bourget inclus</li>
</ul>

<h3>Nos Partenaires à Paris</h3>
<p>Réseau de 120+ garages agréés en Île-de-France. Conventions avec principaux loueurs parisiens pour véhicules de remplacement.</p>',
  'Assurance taxi Paris 2025 : devis gratuit, tarifs négociés, couverture complète Île-de-France. Économisez jusqu''à 35% sur votre assurance taxi parisienne.',
  ARRAY['Paris', 'taxi', 'assurance', 'Île-de-France', 'CDG', 'Orly'],
  'published'
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = now();

-- Lyon
INSERT INTO city_pages (city, title, slug, content, meta_description, keywords, status)
VALUES (
  'Lyon',
  'Assurance Taxi Lyon - Tarifs Négociés Rhône-Alpes',
  'assurance-taxi-lyon',
  '<h2>Assurance Taxi Adaptée à Lyon et Rhône-Alpes</h2>
<p>Lyon compte environ 1 800 taxis. TaxiAssur comprend les besoins spécifiques : relief (Fourvière, Croix-Rousse), clientèle affaires, proximité stations ski.</p>

<h3>Tarifs Moyens Lyon</h3>
<p>Fourchette : <strong>950€ - 1 900€/an</strong>. Économie TaxiAssur : 25-35% vs assureurs classiques grâce à nos partenariats locaux.</p>

<h3>Garanties Lyon</h3>
<ul>
<li><strong>Zones difficiles</strong> : couverture pentes et circulation dense (Presqu''île)</li>
<li><strong>Assistance ski</strong> : dépannage stations alpines (option)</li>
<li><strong>Réseau garages</strong> : 35+ établissements agréés Rhône/Isère</li>
<li><strong>Couverture St-Exupéry</strong> : aéroport inclus sans surcoût</li>
</ul>',
  'Assurance taxi Lyon : devis instantané, tarifs Rhône-Alpes négociés. Couverture complète Lyon métropole + aéroport St-Exupéry. Économisez 25-35%.',
  ARRAY['Lyon', 'Rhône', 'taxi', 'Saint-Exupéry', 'Rhône-Alpes'],
  'published'
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = now();

-- Marseille
INSERT INTO city_pages (city, title, slug, content, meta_description, keywords, status)
VALUES (
  'Marseille',
  'Assurance Taxi Marseille - Devis PACA Immédiat',
  'assurance-taxi-marseille',
  '<h2>Assurance Taxi Marseille & Bouches-du-Rhône</h2>
<p>Marseille : 2e ville de France, 2 000+ taxis. Besoins spécifiques : quartiers contrastés, port, tourisme, événements (OM, festivals).</p>

<h3>Tarifs Marseille</h3>
<p>Moyenne : <strong>980€ - 2 000€/an</strong>. TaxiAssur : tarifs PACA optimisés, économie 28% en moyenne.</p>

<h3>Garanties PACA</h3>
<ul>
<li><strong>Port & événements</strong> : couverture renforcée zones à risque</li>
<li><strong>Assistance Provence</strong> : réseau 40+ garages Bouches-du-Rhône</li>
<li><strong>Aéroport Marignane</strong> : inclus sans supplément</li>
<li><strong>Protection juridique</strong> : litiges clients, contrôles mairie</li>
</ul>',
  'Assurance taxi Marseille 2025 : tarifs PACA négociés, devis gratuit. Couverture complète Bouches-du-Rhône + aéroport Marignane. Économisez 28%.',
  ARRAY['Marseille', 'PACA', 'Bouches-du-Rhône', 'Marignane', 'taxi'],
  'published'
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = now();

-- Toulouse
INSERT INTO city_pages (city, title, slug, content, meta_description, keywords, status)
VALUES (
  'Toulouse',
  'Assurance Taxi Toulouse - Tarifs Occitanie 2025',
  'assurance-taxi-toulouse',
  '<h2>Assurance Taxi Toulouse & Haute-Garonne</h2>
<p>Toulouse : 1 200 taxis environ. Ville dynamique : aéronautique, étudiants, tourisme. TaxiAssur : offres spéciales Occitanie.</p>

<h3>Tarifs Toulouse</h3>
<p>Fourchette : <strong>890€ - 1 750€/an</strong>. Nos tarifs Occitanie : -30% en moyenne vs concurrents.</p>

<h3>Garanties Toulouse</h3>
<ul>
<li><strong>Aéroport Blagnac</strong> : couverture complète incluse</li>
<li><strong>Réseau local</strong> : 28 garages agréés Haute-Garonne</li>
<li><strong>Assistance 24/7</strong> : intervention -1h en agglo</li>
<li><strong>Client affaires</strong> : protection juridique renforcée</li>
</ul>',
  'Assurance taxi Toulouse : devis Occitanie gratuit, tarifs Haute-Garonne négociés. Couverture Blagnac incluse. Économisez 30% sur votre assurance.',
  ARRAY['Toulouse', 'Occitanie', 'Haute-Garonne', 'Blagnac', 'taxi'],
  'published'
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = now();

-- Nice
INSERT INTO city_pages (city, title, slug, content, meta_description, keywords, status)
VALUES (
  'Nice',
  'Assurance Taxi Nice - Tarifs Côte d''Azur',
  'assurance-taxi-nice',
  '<h2>Assurance Taxi Nice & Alpes-Maritimes</h2>
<p>Nice : 800 taxis, forte saisonnalité touristique. TaxiAssur : tarifs Côte d''Azur adaptés, protection haute saison.</p>

<h3>Tarifs Nice</h3>
<p>Moyenne : <strong>1 050€ - 2 100€/an</strong>. Offres spéciales Côte d''Azur : économie 27%.</p>

<h3>Garanties Côte d''Azur</h3>
<ul>
<li><strong>Saisonnalité</strong> : protection renforcée période estivale</li>
<li><strong>Aéroport Nice-Côte d''Azur</strong> : inclus</li>
<li><strong>Monaco/Cannes</strong> : couverture transfrontalière (option)</li>
<li><strong>Réseau PACA</strong> : 25 garages Alpes-Maritimes</li>
</ul>',
  'Assurance taxi Nice 2025 : tarifs Alpes-Maritimes, devis Côte d''Azur gratuit. Couverture Nice-Côte d''Azur incluse. Économisez 27%.',
  ARRAY['Nice', 'Côte d''Azur', 'Alpes-Maritimes', 'taxi', 'PACA'],
  'published'
)
ON CONFLICT (slug) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = now();

-- ============================================================
-- PARTIE 3 : VÉRIFICATION
-- ============================================================

-- Compter les FAQ
SELECT
  '✅ FAQ importées' as status,
  COUNT(*) as "Nombre FAQ",
  COUNT(*) FILTER (WHERE status = 'published') as "FAQ Publiées"
FROM faq_entries;

-- Afficher les premières FAQ
SELECT
  question,
  category,
  display_order,
  status,
  '✅ Visible' as statut
FROM faq_entries
WHERE status = 'published'
ORDER BY display_order
LIMIT 5;

-- Compter les City Pages
SELECT
  '✅ City Pages importées' as status,
  COUNT(*) as "Nombre Villes",
  COUNT(*) FILTER (WHERE status = 'published') as "Villes Publiées"
FROM city_pages;

-- Afficher les villes
SELECT
  city,
  slug,
  status,
  '✅ Visible' as statut
FROM city_pages
WHERE status = 'published'
ORDER BY city;

-- Message final
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ IMPORT TERMINÉ AVEC SUCCÈS !';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FAQ : Visibles sur /faq';
  RAISE NOTICE 'Villes : Visibles sur /assurance-taxi-[ville]';
  RAISE NOTICE '========================================';
END $$;
