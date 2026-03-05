# Configuration Supabase pour Invitations - URGENT

## 🚨 Problème Actuel

**Erreur :** `Edge Function returned a non-2xx status code`

**URL avec erreur :** `https://taxiassur.com/auth/set-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`

**Cause :** L'URL de redirection `/auth/set-password` n'est PAS dans la liste des URLs autorisées dans Supabase Auth.

## ✅ Solution en 3 Étapes

### Étape 1 : Configurer les URLs de Redirection dans Supabase

#### 1.1 Accéder à la Configuration Supabase

```bash
1. Ouvrir votre Dashboard Supabase
   URL: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq

2. Aller dans le menu de gauche:
   Authentication > URL Configuration
```

#### 1.2 Ajouter les URLs Autorisées

Dans la section **"Redirect URLs"**, ajouter :

```
https://taxiassur.com/auth/set-password
https://taxiassur.com/backoffice/crm-killer
http://localhost:5173/auth/set-password
http://localhost:5173/backoffice/crm-killer
```

**IMPORTANT :** Une URL par ligne, appuyez sur "Add URL" après chaque ligne.

#### 1.3 Configurer le Site URL

Dans **"Site URL"** :
```
https://taxiassur.com
```

#### 1.4 Sauvegarder

Cliquer sur **"Save"** en bas de page.

### Étape 2 : Vérifier la Configuration Email

#### 2.1 Templates Email (optionnel)

```bash
1. Aller dans: Authentication > Email Templates

2. Sélectionner: "Invite user"

3. Vérifier que le lien contient:
   {{ .ConfirmationURL }}

4. Le template par défaut est correct, ne pas modifier
```

### Étape 3 : Tester l'Invitation

#### 3.1 Vider le Cache du Navigateur

```bash
# Dans Chrome/Edge/Brave:
1. F12 (DevTools)
2. Clic droit sur le bouton Refresh
3. "Empty Cache and Hard Reload"

# Ou:
Ctrl+Shift+Delete → Vider le cache
```

#### 3.2 Nouvelle Invitation

```bash
1. Aller sur: https://taxiassur.com/backoffice/crm-killer/settings

2. Onglet "Utilisateurs"

3. Cliquer "Inviter un utilisateur"

4. Remplir:
   - Email: test@exemple.com
   - Nom: Test User
   - Rôle: Collaborateur

5. Cliquer "Inviter"

✅ Vérifier:
- Aucune erreur "Edge Function returned non-2xx"
- Message de succès affiché
```

#### 3.3 Vérifier l'Email

```bash
1. Ouvrir la boîte mail: test@exemple.com

2. Email reçu de: noreply@mail.app.supabase.io

3. Sujet: "You have been invited"

4. Cliquer sur le lien dans l'email

✅ Vérifier:
- URL: https://taxiassur.com/auth/set-password?token=...
- PAS d'erreur dans l'URL (pas de #error=...)
- Page "Créer votre compte" s'affiche
```

#### 3.4 Créer le Mot de Passe

```bash
1. Saisir un mot de passe fort:
   Exemple: "MonMotDePasse2026!"

2. Confirmer le mot de passe

3. Cliquer "Créer mon compte"

✅ Vérifier:
- Message "Mot de passe défini !"
- Redirection vers /backoffice/crm-killer
- Connexion automatique
```

## 🔍 Diagnostic des Erreurs

### Erreur 1 : "Edge Function returned non-2xx"

**Cause possibles :**

1. **Format d'email invalide**
   ```
   ❌ Invalide: test@test
   ✅ Valide: test@test.com
   ```

2. **Email déjà utilisé**
   ```
   Solution: Utiliser un autre email ou supprimer l'utilisateur existant
   ```

3. **Rôle invalide**
   ```
   Rôles valides: master, admin, collaborator, commercial, support
   ```

### Erreur 2 : URL avec "#error=access_denied"

**Cause :** URL `/auth/set-password` non autorisée

**Solution :** Ajouter l'URL dans Supabase Dashboard (Étape 1)

### Erreur 3 : "otp_expired"

**Cause :** Le lien d'invitation a expiré (>24h)

**Solution :** Demander une nouvelle invitation

## 📋 Checklist de Configuration

Cochez chaque étape :

### Configuration Supabase Dashboard

- [ ] Aller dans Authentication > URL Configuration
- [ ] Ajouter `https://taxiassur.com/auth/set-password`
- [ ] Ajouter `https://taxiassur.com/backoffice/crm-killer`
- [ ] Ajouter `http://localhost:5173/auth/set-password`
- [ ] Site URL = `https://taxiassur.com`
- [ ] Cliquer "Save"
- [ ] Attendre 30 secondes (propagation)

### Test Complet

- [ ] Vider le cache navigateur
- [ ] Inviter un nouvel utilisateur
- [ ] Aucune erreur "Edge Function returned non-2xx"
- [ ] Email reçu
- [ ] Lien fonctionne (pas de #error)
- [ ] Page SetPassword s'affiche
- [ ] Mot de passe créé avec succès
- [ ] Connexion automatique réussie

## 🛠️ Commandes de Diagnostic

### Vérifier les URLs Configurées

```bash
# Via Supabase CLI (si installé)
supabase projects api-keys --project-ref drohhxrkoequjphvabvq
```

### Vérifier l'Edge Function

```bash
# Logs de l'Edge Function
# Dans Supabase Dashboard:
# Edge Functions > invite-admin-user > Logs

# Rechercher:
- "Inviting user: email@example.com"
- "User invited successfully"
- Erreurs éventuelles
```

### Tester l'Email Directement

```bash
# Via Supabase Dashboard
# Authentication > Users > Invite User

Email: test@example.com
✅ Si l'email part depuis le Dashboard = configuration OK
❌ Si erreur = problème de configuration email
```

## 🎯 Vérification Finale

Une fois la configuration faite, vérifier :

### 1. Dashboard Supabase

```
Authentication > URL Configuration

Redirect URLs doit contenir:
✅ https://taxiassur.com/auth/set-password
✅ https://taxiassur.com/backoffice/crm-killer

Site URL:
✅ https://taxiassur.com
```

### 2. Test Invitation

```bash
# Depuis le CRM:
POST /functions/v1/invite-admin-user
{
  "email": "test@example.com",
  "full_name": "Test User",
  "role": "collaborator"
}

✅ Response 200:
{
  "success": true,
  "message": "Invitation envoyée...",
  "user_id": "uuid..."
}
```

### 3. Test Email

```
De: noreply@mail.app.supabase.io
Lien: https://taxiassur.com/auth/set-password?token=ABC123...

✅ Pas de #error dans l'URL
✅ Token présent dans l'URL
```

### 4. Test Page

```
https://taxiassur.com/auth/set-password?token=ABC123...

✅ Page "Créer votre compte" s'affiche
✅ Formulaire visible
✅ Aucune erreur
```

## 📞 Support

Si le problème persiste après configuration :

### Vérifier les Logs

```bash
# Edge Function logs
Dashboard > Edge Functions > invite-admin-user > Logs

# Auth logs
Dashboard > Authentication > Logs
```

### Informations à fournir

1. Screenshot de Authentication > URL Configuration
2. Email de test utilisé
3. Message d'erreur exact
4. Logs de l'Edge Function
5. URL complète reçue par email

## 🚀 Résumé Ultra-Rapide

**3 actions CRITIQUES :**

1. **Dashboard Supabase** → Authentication → URL Configuration
2. **Ajouter** : `https://taxiassur.com/auth/set-password`
3. **Save** et attendre 30 secondes

**Puis tester une nouvelle invitation.**

C'est tout ! Le reste fonctionne déjà. 🎉
