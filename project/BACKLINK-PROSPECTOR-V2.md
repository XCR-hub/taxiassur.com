# 🚀 BACKLINK PROSPECTOR V2 - SYSTÈME COMPLET

## ✅ 5 MÉTHODES DE RÉCUPÉRATION D'EMAILS

### 1. **Company Enrichment** 🏢
- API : `/v2/companies/find`
- Récupère : Nom entreprise, taille, secteur, localisation
- Usage : Contexte pour personnaliser l'email

### 2. **Domain Search** 📧
- API : `/v2/domain-search`
- Récupère : Tous les emails du domaine (jusqu'à 10)
- Priorité : `contact@`, `info@`, `redac@`, `webmaster@`

### 3. **Discover API** 🔍
- API : `/v2/discover`
- Récupère : Emails publics trouvés sur le web
- Usage : Fallback si Domain Search échoue

### 4. **Web Scraping** 🌐
- Scrape 4 pages : `/contact`, `/nous-contacter`, `/about`, `/a-propos`
- Extrait les emails via regex
- Filtre les emails invalides (example.com, wixpress, etc.)

### 5. **Email Verification** ✅
- API : `/v2/email-verifier`
- Vérifie la validité de l'email
- Score minimum : 50/100
- Status requis : `valid`

---

## 📊 PERFORMANCES ATTENDUES

### Avant (v1)
- ❌ Emails trouvés : 20%
- ❌ Taux de bounce : 30-40%
- ❌ Contacts concurrents : Oui

### Après (v2)
- ✅ **Emails trouvés : 75-85%**
- ✅ **Taux de bounce : < 5%**
- ✅ **Contacts concurrents : 0%**
- ✅ **Emails vérifiés : 100%**

---

## 🎯 WORKFLOW COMPLET

```
1. Google CSE trouve un site qui parle de concurrent
   ↓
2. Filtre anti-concurrent (bloque sites d'assurance)
   ↓
3. Company Enrichment (nom, secteur, taille)
   ↓
4. Domain Search → Cherche tous les emails
   ↓
5. Discover API (si pas trouvé)
   ↓
6. Web Scraping /contact (si toujours pas trouvé)
   ↓
7. Email Verification (score + status)
   ↓
8. Sauvegarde dans backlink_opportunities
   ↓
9. Envoi automatique par backlink-auto-outreach
```

---

## 🔧 CONFIGURATION HUNTER.IO

### Obtenir la clé API
1. Créer compte sur https://hunter.io
2. Plan gratuit : 25 recherches/mois
3. Plan payant : 50-5000 recherches/mois
4. Copier l'API Key

### Configurer dans Supabase
```sql
-- Via Supabase SQL Editor
SELECT vault.create_secret(
  'HUNTER_IO_API_KEY',
  'votre_cle_hunter_io_ici'
);
```

Ou via Dashboard :
1. Supabase Dashboard
2. Project Settings → Edge Functions → Secrets
3. Add new secret
4. Name: `HUNTER_IO_API_KEY`
5. Value: `votre_cle_ici`

---

## 📋 DÉPLOIEMENT

### 1. Nettoyer les anciennes données
```sql
-- Supprimer tous les concurrents
DELETE FROM backlink_opportunities
WHERE domain ILIKE '%assurance%'
   OR domain ILIKE '%insurance%'
   OR domain ILIKE '%courtier%';

-- Vérifier ce qui reste
SELECT COUNT(*) FROM backlink_opportunities;
```

### 2. Redéployer l'Edge Function
```bash
# Via Supabase Dashboard
# Edge Functions → scan-backlinks → Deploy
# Copier le code de supabase/functions/scan-backlinks/index.ts
```

### 3. Tester le système
```sql
-- Lancer un scan
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGc...',
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
);

-- Attendre 2 minutes puis vérifier
SELECT 
  domain,
  contact_email,
  page_title,
  domain_authority,
  created_at
FROM backlink_opportunities
WHERE created_at > NOW() - INTERVAL '10 minutes'
  AND contact_email IS NOT NULL
ORDER BY domain_authority DESC
LIMIT 10;
```

---

## 🎯 SITES CIBLES

### ✅ Types de sites recherchés
1. **Médias auto** : caradisiac.com, auto-moto.com, largus.fr
2. **Blogs taxi/VTC** : blogs spécialisés, forums professionnels
3. **Médias généralistes** : lefigaro.fr, lemonde.fr, bfmtv.com
4. **Annuaires pros** : pagesjaunes.fr, societe.com
5. **Sites juridiques** : legavox.fr, village-justice.com
6. **Sites municipaux** : paris.fr, lyon.fr, marseille.fr

### ❌ Sites bloqués
- Tous domaines avec "assurance"
- Compagnies d'assurance (AXA, Allianz, etc.)
- Courtiers concurrents
- Sites de comparaison assurance

---

## 📊 MONITORING

### Vérifier les performances
```sql
-- Taux de réussite email
SELECT 
  COUNT(*) as total_sites,
  COUNT(contact_email) as avec_email,
  ROUND(COUNT(contact_email)::numeric / COUNT(*) * 100, 1) as taux_pourcentage
FROM backlink_opportunities
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Top domaines trouvés
SELECT 
  domain,
  contact_email,
  domain_authority,
  relevance_score
FROM backlink_opportunities
WHERE contact_email IS NOT NULL
  AND status = 'pending'
ORDER BY domain_authority DESC
LIMIT 20;

-- Logs des scans
SELECT 
  id,
  competitors_scanned,
  opportunities_found,
  scan_duration_ms,
  status,
  created_at
FROM backlink_scan_history
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚀 LANCEMENT CAMPAGNE

### Test avec 1 email
```sql
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/backlink-auto-outreach',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGc...',
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object(
    'maxEmailsPerRun', 1,
    'testMode', false
  )
);
```

### Production (5 emails/jour)
```sql
-- Activer le cron job
SELECT cron.schedule(
  'backlink-outreach-daily',
  '0 10 * * *',  -- Tous les jours à 10h
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/backlink-auto-outreach',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGc...',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('maxEmailsPerRun', 5)
  );
  $$
);
```

---

## 📈 RÉSULTATS ATTENDUS

### Mois 1
- 150 sites scannés
- 120 emails trouvés (80%)
- 100 emails envoyés
- 5-10 backlinks obtenus

### Mois 3
- 500 sites scannés
- 400 emails trouvés (80%)
- 300 emails envoyés
- 20-30 backlinks obtenus

### Impact SEO
- +15 backlinks de qualité = +5 positions en moyenne
- Domain Authority +5-10 points
- Trafic organique +20-30%

---

## ⚠️ LIMITES HUNTER.IO

### Plan Gratuit
- 25 recherches/mois
- 50 vérifications/mois
- Idéal pour tester

### Plan Starter (49€/mois)
- 500 recherches/mois
- 1000 vérifications/mois
- Recommandé

### Plan Growth (99€/mois)
- 2500 recherches/mois
- 5000 vérifications/mois
- Pour grosse campagne
