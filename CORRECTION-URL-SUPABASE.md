# ✅ CORRECTION URL SUPABASE - Une Seule URL

## 🚨 Problème Identifié

**2 URLs Supabase mélangées :**
- ❌ Ancienne : `viuuznfqkauatkjcegcj.supabase.co`
- ✅ Bonne : `drohhxrkoequjphvabvq.supabase.co`

---

## ✅ Correction Appliquée

**URL UNIQUE conservée :**
```
URL: https://drohhxrkoequjphvabvq.supabase.co
ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg
SERVICE KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik
```

---

## 📦 Fichiers Corrigés

1. ✅ `/.env` (racine)
2. ✅ `/public/.env` (copie)
3. ✅ `/public/api/lead-manager.php`
4. ✅ `/public/api/backlink-automation.php`
5. ✅ `/public/api/referral-program.php`

**L'ancienne URL a été SUPPRIMÉE partout !**

---

## 🎯 Vérification Base de Données

```sql
SELECT COUNT(*) FROM leads;
-- Résultat: 11 leads (10 vrais + 1 simulé)
```

Les leads sont bien dans cette base !

---

## 🚀 Tests À Faire

### 1️⃣ Test Diagnostic
```
URL: /api/diagnostic.php

Devrait afficher:
"supabase_connection": {
  "url": "https://drohhxrkoequjphv...",
  "success": true
}
```

### 2️⃣ Test Leads
```
URL: /api/lead-manager.php?action=list

Devrait retourner:
{
  "success": true,
  "leads": [...],
  "count": 11
}
```

### 3️⃣ Test Backoffice
```
URL: /backoffice/leads

Console devrait afficher:
"✅ Found 11 leads from API"
```

---

## 📝 Fichiers à Uploader

```
✅ /dist/                              (build 18.68s)
✅ /public/.env                        (URL corrigée)
✅ /public/api/lead-manager.php        (URL corrigée)
✅ /public/api/backlink-automation.php (URL corrigée)
✅ /public/api/referral-program.php    (URL corrigée)
✅ /public/api/diagnostic.php          (diagnostic complet)
✅ /public/api/load-env.php            (loader .env)
```

---

## ✅ Résultat Attendu

**Avant :**
```
❌ 2 URLs mélangées
❌ Leads introuvables
❌ APIs ne se connectent pas
```

**Après :**
```
✅ 1 seule URL : drohhxrkoequjphvabvq
✅ 11 leads accessibles
✅ APIs connectées à la bonne base
✅ Toutes les clés cohérentes
```

---

**Build : 18.68s | 0 erreur | URL Supabase unique**
