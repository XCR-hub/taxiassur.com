# 🗺️ GUIDE COMPLET : CONFIGURATION GOOGLE PLACES API

## 📋 **CE QUE TU VOIS ACTUELLEMENT**

Tu es sur **Google Auth Platform** → Écran "Configuration du projet"

**C'EST CORRECT !** C'est la première étape. Suis ce guide étape par étape.

---

## 🎯 **ÉTAPE 1 : CONFIGURER OAUTH (Écran actuel)**

### **1.1 - Remplir "Nom de l'application"**
```
TaxiAssur Scraping
```

### **1.2 - Remplir "Adresse e-mail d'assistance utilisateur"**
```
contact@taxiassur.com
```
(ou ton email)

### **1.3 - Cliquer "Suivant"**

---

## 🎯 **ÉTAPE 2 : ALLER DANS GOOGLE CLOUD CONSOLE**

### **2.1 - Ouvrir nouvel onglet**
https://console.cloud.google.com/

### **2.2 - Sélectionner projet "TaxiAssur"**
En haut à gauche, à côté de "Google Cloud"

### **2.3 - Activer Places API**

#### **Option A : Via recherche**
1. Barre recherche en haut
2. Taper : **"Places API"**
3. Cliquer sur **"Places API"** dans les résultats
4. Cliquer **"Activer"** (bouton bleu)

#### **Option B : Via menu**
1. Menu hamburger (☰) en haut à gauche
2. **APIs & Services** → **Bibliothèque**
3. Chercher **"Places API"**
4. Cliquer dessus
5. Cliquer **"Activer"**

---

## 🎯 **ÉTAPE 3 : CRÉER CLÉ API**

### **3.1 - Après activation, cliquer "Identifiants"**
Ou aller dans : Menu → **APIs & Services** → **Identifiants**

### **3.2 - Créer identifiants**
1. Cliquer **"+ Créer des identifiants"** (en haut)
2. Sélectionner **"Clé API"**
3. Une popup apparaît avec ta clé API

### **3.3 - COPIER LA CLÉ**
```
Exemple : AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**⚠️ IMPORTANT : Garde cette fenêtre ouverte !**

---

## 🎯 **ÉTAPE 4 : SÉCURISER LA CLÉ (RECOMMANDÉ)**

### **4.1 - Cliquer "Restreindre la clé"**

### **4.2 - Restrictions d'API**
1. Sélectionner **"Restreindre la clé"**
2. Cocher **"Places API"**
3. Cliquer **"OK"**

### **4.3 - Restrictions d'application (optionnel)**
Pour plus de sécurité :
1. Choisir **"Adresses IP"**
2. Ajouter l'IP de ton serveur Supabase

**OU simplement** :
1. Laisser **"Aucune"** pour le moment

### **4.4 - Cliquer "Enregistrer"**

---

## 🎯 **ÉTAPE 5 : AJOUTER CLÉ DANS SUPABASE**

### **5.1 - Ouvrir Supabase Dashboard**
https://supabase.com/dashboard

### **5.2 - Aller dans Settings → Secrets**
1. Projet TaxiAssur
2. **Project Settings** (icône engrenage en bas à gauche)
3. **Secrets** (dans le menu de gauche)

### **5.3 - Ajouter nouveau secret**

**Nom du secret :**
```
GOOGLE_PLACES_API_KEY
```

**Valeur :**
```
AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
(Ta clé copiée à l'étape 3.3)

### **5.4 - Cliquer "Create secret"**

---

## 🎯 **ÉTAPE 6 : VÉRIFIER QUE ÇA FONCTIONNE**

### **6.1 - Tester avec SQL dans Supabase**

Aller dans **SQL Editor** et exécuter :

```sql
-- Test manuel de scraping (simulé)
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scrape-taxi-companies',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  ),
  body := jsonb_build_object(
    'cities', ARRAY['Paris'],
    'max_per_city', 5
  )
);
```

### **6.2 - Vérifier résultats**

Après 1-2 minutes, exécuter :

```sql
-- Vérifier taxis scrapés
SELECT
  company_name,
  city,
  phone,
  email,
  website_url,
  source
FROM taxi_prospects
WHERE created_at > now() - interval '5 minutes'
ORDER BY created_at DESC
LIMIT 10;
```

**Résultat attendu :**
- 5 taxis de Paris
- Avec noms, téléphones, adresses
- Source = 'google_maps'

---

## 🎯 **ÉTAPE 7 : ACTIVER SCRAPING AUTOMATIQUE**

Le scraping est **déjà configuré** pour tourner tous les jours à **03h00** !

### **Vérifier le cron :**
```sql
SELECT
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname = 'scrape-taxis-daily';
```

**Résultat attendu :**
```
jobname: scrape-taxis-daily
schedule: 0 3 * * *  (tous les jours à 3h du matin)
active: true
```

---

## 📊 **STATISTIQUES TEMPS RÉEL**

### **Voir taxis scrapés par ville :**
```sql
SELECT
  city,
  COUNT(*) as total_taxis,
  COUNT(*) FILTER (WHERE email IS NOT NULL) as avec_email,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) as avec_telephone,
  COUNT(*) FILTER (WHERE status = 'new') as non_contactes
FROM taxi_prospects
GROUP BY city
ORDER BY total_taxis DESC;
```

### **Voir derniers taxis scrapés :**
```sql
SELECT
  company_name,
  city,
  phone,
  email,
  website_url,
  created_at
FROM taxi_prospects
ORDER BY created_at DESC
LIMIT 20;
```

---

## 💰 **COÛT GOOGLE PLACES API**

### **Prix Google Places :**
- **Places Text Search** : 0,032$ / requête
- **Place Details** : 0,017$ / requête

### **Calcul pour le scraping :**

**Par jour (8 villes × 50 taxis) :**
- 8 recherches texte : 8 × 0,032$ = **0,26$**
- 400 détails : 400 × 0,017$ = **6,80$**
- **TOTAL : ~7$ / jour**

**Par mois :**
- **~210$ / mois**

### **Crédit gratuit Google Cloud :**
- ✅ **300$ offerts** pendant 90 jours
- ✅ Suffisant pour **1 mois gratuit**

### **Comment réduire les coûts :**

1. **Réduire nombre de villes**
```sql
-- Modifier les villes ciblées
-- Dans la migration SQL, ligne ~240
ARRAY['Paris', 'Lyon', 'Marseille']  -- Au lieu de 8 villes
```

2. **Réduire fréquence**
```sql
-- Passer à hebdomadaire au lieu de quotidien
SELECT cron.unschedule('scrape-taxis-daily');

SELECT cron.schedule(
  'scrape-taxis-weekly',
  '0 3 * * 1',  -- Tous les lundis à 3h
  $$SELECT schedule_taxi_scraping();$$
);
```

3. **Cibler seulement grandes villes**
```sql
-- Top 3 villes : Paris, Lyon, Marseille
-- Coût : ~2.5$ / jour = ~75$ / mois
```

---

## ✅ **CHECKLIST COMPLÈTE**

- [ ] **Étape 1** : Remplir OAuth config (écran actuel)
- [ ] **Étape 2** : Activer Places API dans Google Cloud Console
- [ ] **Étape 3** : Créer clé API
- [ ] **Étape 4** : Restreindre la clé (sécurité)
- [ ] **Étape 5** : Ajouter `GOOGLE_PLACES_API_KEY` dans Supabase Secrets
- [ ] **Étape 6** : Tester avec SQL
- [ ] **Étape 7** : Vérifier cron actif

---

## 🚨 **ERREURS COURANTES**

### **Erreur : "This API project is not authorized"**
**Solution :** Places API pas activée
- Retourner Étape 2
- Vérifier que Places API est bien activée

### **Erreur : "API key not valid"**
**Solution :** Clé mal copiée ou restrictions trop strictes
- Vérifier clé dans Supabase Secrets
- Vérifier restrictions dans Google Cloud Console

### **Erreur : "Quota exceeded"**
**Solution :** Limite quotidienne atteinte
- Vérifier quota : https://console.cloud.google.com/apis/dashboard
- Augmenter quota ou réduire fréquence

---

## 📞 **SUPPORT**

**Besoin d'aide ?**
- Documentation Google Places : https://developers.google.com/maps/documentation/places/web-service
- Console Google Cloud : https://console.cloud.google.com/
- Supabase Dashboard : https://supabase.com/dashboard

---

## 🎯 **PROCHAINES ÉTAPES**

Une fois Google Places configuré :

1. ✅ **Scraping automatique** → 400 taxis/jour
2. ✅ **Emails automatiques** → 20 taxis contactés/jour
3. ✅ **Suivi CRM** → Gestion prospects dans backoffice

**Dans 1 mois : 12 000 prospects taxis dans ta base !** 🚖

**Dans 6 mois : 75 000 prospects taxis !** 🚀

---

## 📋 **RÉSUMÉ ULTRA-RAPIDE**

```bash
1. Remplir OAuth config (écran actuel)
2. Aller sur console.cloud.google.com
3. Activer "Places API"
4. Créer clé API
5. Copier la clé
6. Supabase → Settings → Secrets
7. Créer secret "GOOGLE_PLACES_API_KEY"
8. Coller la clé
9. Tester avec SQL
10. ✅ TERMINÉ !
```

**Temps estimé : 10-15 minutes** ⏱️
