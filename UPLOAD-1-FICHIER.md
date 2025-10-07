# 📤 UPLOAD 1 SEUL FICHIER - FIX BACKOFFICE

**Solution ultra-simple** : Uploadez **1 seul fichier** sur IONOS pour que le backoffice affiche les vraies données !

---

## ✅ LE FICHIER À UPLOADER

**Fichier source :**
```
/public/api/lead-manager.php
```

**Destination sur IONOS :**
```
/api/lead-manager.php
```

---

## 📋 ÉTAPES D'UPLOAD SUR IONOS

### Option 1 : Via le gestionnaire de fichiers IONOS

1. **Connectez-vous** à votre espace IONOS
2. **Allez** dans "Hébergement" → "Gestionnaire de fichiers"
3. **Créez** le dossier `/api` s'il n'existe pas :
   - Clic droit → "Nouveau dossier" → Nommez-le `api`
4. **Ouvrez** le dossier `/api`
5. **Cliquez** sur "Upload"
6. **Sélectionnez** le fichier `lead-manager.php`
7. **Uploadez** ✅

### Option 2 : Via FTP (FileZilla)

1. **Connectez-vous** en FTP à votre serveur IONOS
2. **Naviguez** vers la racine de votre site
3. **Créez** le dossier `/api` s'il n'existe pas
4. **Glissez-déposez** `lead-manager.php` dans `/api/`
5. **Vérifiez** que le fichier est bien là ✅

---

## 🔍 STRUCTURE FINALE SUR IONOS

```
votre-site/
├── index.html
├── assets/
│   └── (vos fichiers JS/CSS)
└── api/
    └── lead-manager.php  ← CE FICHIER !
```

---

## ✅ CE QUE FAIT CE FICHIER

1. **Reçoit** les requêtes du backoffice
2. **Interroge** Supabase avec l'API REST
3. **Convertit** les champs (snake_case → camelCase)
4. **Retourne** les données au format attendu

### Schéma du flux :

```
┌──────────────────┐
│  Backoffice      │
│  (dans votre     │
│   navigateur)    │
└────────┬─────────┘
         │
         │ Appelle /api/lead-manager.php?action=list
         ↓
┌──────────────────┐
│ lead-manager.php │  ← LE FICHIER À UPLOADER
│  (sur IONOS)     │
└────────┬─────────┘
         │
         │ Interroge Supabase REST API
         ↓
┌──────────────────┐
│    Supabase      │
│   (Database)     │
└──────────────────┘
```

---

## 🧪 TEST APRÈS UPLOAD

### 1. Test direct de l'API :

Ouvrez dans votre navigateur :
```
https://votre-site.com/api/lead-manager.php?action=list
```

**Résultat attendu :**
```json
{
  "success": true,
  "leads": [
    {
      "id": "...",
      "name": "Nom du client",
      "email": "email@example.com",
      ...
    }
  ],
  "count": 4
}
```

### 2. Test depuis le backoffice :

1. **Allez** dans le backoffice → Gestion des leads
2. **Actualisez** la page (F5)
3. **Vérifiez** que les leads s'affichent avec les vraies données

---

## ❓ SI ÇA NE MARCHE PAS

### Erreur 404 "File not found"

❌ **Problème :** Le fichier n'est pas au bon endroit

✅ **Solution :** Vérifiez que le chemin est bien `/api/lead-manager.php`

### Affiche toujours "Lead anonyme"

❌ **Problème :** Le fichier n'a pas été rechargé

✅ **Solution :**
1. Videz le cache du navigateur (Ctrl + Shift + R)
2. Vérifiez la date de modification du fichier sur IONOS

### Erreur "cURL error"

❌ **Problème :** Le serveur IONOS ne peut pas contacter Supabase

✅ **Solution :**
1. Vérifiez que cURL est activé sur IONOS (normalement oui)
2. Contactez le support IONOS si nécessaire

### Page blanche / Erreur 500

❌ **Problème :** Erreur PHP

✅ **Solution :**
1. Vérifiez la version PHP sur IONOS (minimum PHP 7.4)
2. Activez les logs d'erreur PHP dans le panneau IONOS

---

## 🔐 SÉCURITÉ

Le fichier utilise la clé **ANON KEY** de Supabase qui est :
- ✅ Publique (pas de risque de sécurité)
- ✅ Protégée par RLS (Row Level Security)
- ✅ Limitée aux opérations autorisées

Les données sont sécurisées par les **politiques RLS** de Supabase.

---

## 📊 FONCTIONNALITÉS ACTIVES

Après l'upload, le backoffice pourra :

✅ **Lister tous les leads** depuis Supabase
✅ **Afficher les vraies informations** (nom, email, téléphone, ville, etc.)
✅ **Mettre à jour le statut** (Nouveau → Contacté → Devis → Client)
✅ **Ajouter des notes** sur les leads
✅ **Enregistrer la prime réalisée** pour les clients

---

## 🎯 RÉSUMÉ

**1 fichier à uploader :**
```
lead-manager.php → /api/lead-manager.php
```

**Résultat :**
- ✅ Le backoffice affiche les vraies données
- ✅ Toutes les opérations CRUD fonctionnent
- ✅ Pas besoin de rebuild du frontend
- ✅ Solution immédiate !

---

## 📁 LOCALISATION DU FICHIER

Le fichier est ici dans votre projet local :
```
/public/api/lead-manager.php
```

Uploadez-le sur IONOS dans :
```
/api/lead-manager.php
```

**C'est tout ! Simple et efficace ! 🚀**
