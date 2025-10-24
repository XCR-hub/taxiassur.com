# 🔍 COMMENT TROUVER VOTRE REF PROJET SUPABASE

## Guide Visuel Pas-à-Pas (2 minutes)

---

## ÉTAPE 1 : Trouver VOTRE_REF_PROJET

### 1.1 - Aller sur le Dashboard Supabase

```
1. Ouvrir navigateur
2. Aller sur : https://supabase.com/dashboard
3. Se connecter si nécessaire
4. Vous voyez la liste de vos projets
```

### 1.2 - Sélectionner Votre Projet TaxiAssur

```
1. Cliquer sur votre projet "TaxiAssur" (ou nom donné)
2. Vous êtes maintenant dans le projet
```

### 1.3 - Aller dans Project Settings

```
1. En bas à gauche du menu → Icône engrenage ⚙️
2. Cliquer sur "Project Settings"
3. Puis cliquer sur "API" dans le sous-menu
```

### 1.4 - Copier la Project URL

```
Vous voyez une section "Project URL" qui affiche :

┌─────────────────────────────────────────────┐
│ Project URL                                 │
│                                             │
│ https://abcdefghijklmnop.supabase.co      │
│                                             │
│ [Copy] button                               │
└─────────────────────────────────────────────┘
```

**Votre REF = la partie avant `.supabase.co`**

**Exemples :**
```
URL complète : https://abcdefghijklmnop.supabase.co
→ REF = abcdefghijklmnop

URL complète : https://xyztkqpmlkjihgfe.supabase.co
→ REF = xyztkqpmlkjihgfe
```

**📋 COPIER VOTRE REF ICI :**
```
VOTRE_REF_PROJET = _________________
```

---

## ÉTAPE 2 : Trouver VOTRE_SERVICE_ROLE_KEY

### 2.1 - Toujours dans Project Settings → API

```
Descendre dans la page jusqu'à voir :

┌─────────────────────────────────────────────┐
│ Project API keys                            │
│                                             │
│ anon public                                 │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC...      │
│ [Copy] [Reveal]                             │
│                                             │
│ service_role secret                         │
│ ••••••••••••••••••••••••••••••••••••••      │
│ [Copy] [Reveal]                             │
└─────────────────────────────────────────────┘
```

### 2.2 - Révéler et Copier service_role

```
1. Cliquer sur "Reveal" à côté de "service_role"
2. La clé complète s'affiche (très longue)
3. Cliquer sur "Copy"

⚠️ ATTENTION : 
- Ne JAMAIS partager cette clé publiquement
- Ne JAMAIS la mettre dans le code frontend
- Elle donne accès TOTAL à votre base de données
```

**La clé ressemble à ça :**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk1MDAwMDAwLCJleHAiOjE4NTI3NjY0MDB9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**📋 COPIER VOTRE CLÉ ICI :**
```
VOTRE_SERVICE_ROLE_KEY = _________________
```

---

## ÉTAPE 3 : Remplacer dans le Fichier SQL

### 3.1 - Ouvrir le Fichier Template

```
Fichier : cron-config-template.sql
```

### 3.2 - Remplacer les 2 Variables

**AVANT :**
```sql
SELECT cron.schedule(
  'ai-social-scraper-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://VOTRE_REF_PROJET.supabase.co/functions/v1/ai-social-scraper',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY'
    )
  ) AS request_id;
  $$
);
```

**APRÈS (exemple avec vos vraies valeurs) :**
```sql
SELECT cron.schedule(
  'ai-social-scraper-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://abcdefghijklmnop.supabase.co/functions/v1/ai-social-scraper',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk1MDAwMDAwLCJleHAiOjE4NTI3NjY0MDB9.XXXXXXXXXXXXXXXXXXXX'
    )
  ) AS request_id;
  $$
);
```

### 3.3 - Chercher/Remplacer (Méthode Rapide)

**Dans votre éditeur de texte :**

1. **Chercher :** `VOTRE_REF_PROJET`
2. **Remplacer par :** `votre-ref-reelle` (ex: `abcdefghijklmnop`)
3. **Remplacer tout** (4 occurrences)

4. **Chercher :** `VOTRE_SERVICE_ROLE_KEY`
5. **Remplacer par :** `votre-cle-reelle` (la longue chaîne eyJ...)
6. **Remplacer tout** (3 occurrences)

---

## ÉTAPE 4 : Exécuter dans SQL Editor

```
1. Retourner sur Supabase Dashboard
2. Menu gauche → SQL Editor
3. Cliquer "New query"
4. Copier/coller TOUT le fichier modifié
5. Cliquer "Run" (en bas à droite)
6. Attendre 5-10 secondes
7. Voir "Success" ou nombre de lignes retournées
```

---

## VÉRIFICATION RAPIDE

### Vérifier que vos crons sont créés :

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
ORDER BY jobid;
```

**Devrait retourner :**
```
jobid | jobname                              | schedule     | active
------|--------------------------------------|--------------|--------
1     | ai-social-scraper-6h                 | 0 */6 * * *  | true
2     | ai-email-responder-30min             | */30 * * * * | true
3     | calculate-ambassador-rankings-daily  | 0 1 * * *    | true
4     | engagement-monitoring-hourly         | 0 * * * *    | true
```

✅ Si vous voyez ces 4 lignes = **SUCCÈS !**

---

## EXEMPLE CONCRET

### Mon Projet (Exemple)

```
Project URL : https://xyztkqpmlkjihgfe.supabase.co
→ REF = xyztkqpmlkjihgfe

Service Role Key : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enRrcXBtbGtqaWhzZmUiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE4NTc2NjY2MDB9.ABCDEFGHIJKLMNOPQRSTUVWXYZ123456
```

### Mon Fichier SQL Modifié (extrait)

```sql
SELECT cron.schedule(
  'ai-social-scraper-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xyztkqpmlkjihgfe.supabase.co/functions/v1/ai-social-scraper',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enRrcXBtbGtqaWhzZmUiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE4NTc2NjY2MDB9.ABCDEFGHIJKLMNOPQRSTUVWXYZ123456'
    )
  ) AS request_id;
  $$
);
```

---

## RACCOURCI : Méthode Express (1 minute)

Si vous voulez aller vite, copiez directement depuis l'URL du navigateur :

```
1. Quand vous êtes dans votre projet Supabase
2. Regarder la barre d'adresse du navigateur :
   
   https://supabase.com/dashboard/project/abcdefghijklmnop/...
                                          ^^^^^^^^^^^^^^^^
                                          C'EST VOTRE REF !

3. Copier cette partie = VOTRE_REF_PROJET
```

---

## AIDE VISUELLE : Captures d'Écran (Description)

### Capture 1 : Dashboard
```
[Logo Supabase]  TaxiAssur Project
├─ Home
├─ Table Editor
├─ SQL Editor      ← Cliquer ici pour exécuter SQL
├─ Database
├─ Edge Functions
└─ ⚙️ Project Settings  ← Cliquer ici d'abord
    └─ API            ← Puis ici
```

### Capture 2 : Page API
```
Configuration

Project URL
┌────────────────────────────────────────┐
│ https://abcdefghijklmnop.supabase.co  │ [Copy]
└────────────────────────────────────────┘
        ^^^^^^^^^^^^^^^^
        COPIER CETTE PARTIE !

Project API keys

anon public
eyJhbGciOiJIUzI1NiIsIn... [Copy] [Reveal]

service_role secret  ← CELLE-CI !
•••••••••••••••••••••••••• [Copy] [Reveal]
                                   ^^^^^^
                                   Cliquer d'abord
```

---

## CHECKLIST FINALE

```
□ J'ai trouvé mon Project URL
□ J'ai extrait mon REF (avant .supabase.co)
□ J'ai révélé ma service_role key
□ J'ai copié ma service_role key complète
□ J'ai remplacé VOTRE_REF_PROJET (4x)
□ J'ai remplacé VOTRE_SERVICE_ROLE_KEY (3x)
□ J'ai copié le fichier dans SQL Editor
□ J'ai cliqué Run
□ J'ai vu "Success"
□ J'ai vérifié que les 4 crons sont créés
```

---

## ❓ PROBLÈMES FRÉQUENTS

### "Je ne trouve pas Project Settings"

```
C'est l'icône ⚙️ en BAS À GAUCHE du menu latéral
Pas en haut !
```

### "Je ne vois pas service_role"

```
Scroller vers le bas dans la page API
Il y a 2 clés :
1. anon (publique) ← PAS celle-ci
2. service_role (secrète) ← CELLE-CI !
```

### "Ma clé ne fonctionne pas"

```
Vérifier :
- Vous avez cliqué "Reveal" avant de copier
- Vous avez copié la clé COMPLÈTE (très longue)
- Pas d'espace avant/après
- Vous utilisez bien service_role (pas anon)
```

### "Erreur lors du Run"

```
Vérifier :
- Extension pg_cron est activée
- Vos Edge Functions sont déployées
- Votre REF est correct (pas d'espace, pas de faute)
- Votre clé est complète
```

---

**Vous avez maintenant tout ce qu'il faut ! Suivez les étapes 1-2-3-4 et c'est bon.** 🎯

Besoin d'aide supplémentaire ? Dites-moi où vous bloquez exactement !
