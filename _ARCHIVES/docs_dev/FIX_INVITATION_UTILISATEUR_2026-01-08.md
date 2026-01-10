# ✅ FIX : Invitation Utilisateur

**Date** : 2026-01-08
**Problème** : ❌ Erreur "User not allowed" lors de l'invitation d'un collaborateur

---

## 🔍 Diagnostic

### Cause du Problème
Le code utilisait `supabase.auth.admin.inviteUserByEmail()` **directement depuis le frontend**, ce qui n'est **pas autorisé** avec la clé anonyme (anon key) pour des raisons de sécurité.

```typescript
// ❌ AVANT : Erreur "User not allowed"
const { data, error } = await supabase.auth.admin.inviteUserByEmail(...)
```

Cette méthode nécessite la **clé de service role** (admin) qui ne peut PAS être exposée côté client.

---

## ✅ Solution Implémentée

### Architecture Sécurisée

**Frontend** → **Edge Function** (avec service role) → **Supabase Auth**

### 1️⃣ Edge Function `invite-admin-user`

**Fichier** : `supabase/functions/invite-admin-user/index.ts` ✨ NOUVEAU

Cette fonction côté serveur :
- ✅ Utilise la clé service role de manière sécurisée
- ✅ Invite l'utilisateur via Supabase Auth
- ✅ Crée l'entrée dans `admin_users`
- ✅ Configure les permissions utilisateur
- ✅ Gère les erreurs et rollback automatique

**Fonctionnalités** :
- 📧 Envoi email d'invitation automatique
- 🔐 Création compte Supabase Auth
- 📊 Enregistrement base de données
- 🎯 Configuration permissions granulaires
- 🔄 Rollback si erreur (supprime le compte auth si échec DB)

### 2️⃣ Frontend Modifié

**Fichier** : `src/backoffice/UserManagement.tsx`

```typescript
// ✅ APRÈS : Appel sécurisé via Edge Function
const { data, error } = await supabase.functions.invoke('invite-admin-user', {
  body: {
    email: newUser.email,
    full_name: newUser.full_name,
    role: newUser.role,
    permissions: [...]
  }
});
```

**Modifications** :
- ✏️ `handleInviteUser()` : Utilise Edge Function
- ✏️ `handleResendInvite()` : Utilise Edge Function
- ✅ Gestion d'erreur améliorée
- ✅ Messages utilisateur clairs

---

## 📋 Fonctionnalités

### Invitation Utilisateur

1. **Rôles disponibles** :
   - 👑 **Master** : Accès complet
   - 👤 **Collaborator** : Accès limité selon permissions

2. **Permissions Granulaires** :
   - 👥 CRM & Leads
   - 🛍️ Marketplace
   - 🤖 Contenu & IA
   - 🔍 SEO
   - 📊 Analytics
   - 🔗 Backlinks
   - 📱 Réseaux Sociaux
   - ⚙️ Paramètres

3. **Pour chaque permission** :
   - 👁️ **Voir** : Lecture seule
   - ✏️ **Éditer** : Modification
   - 🗑️ **Supprimer** : Suppression

### Processus d'Invitation

1. Admin clique "Inviter un Collaborateur"
2. Remplit : Email, Nom complet, Rôle
3. Sélectionne les permissions
4. Clique "Envoyer l'Invitation"
5. **Edge Function** :
   - Crée le compte Auth Supabase
   - Envoie email avec lien de création mot de passe
   - Configure les permissions
6. Utilisateur reçoit l'email
7. Clique sur le lien → Crée son mot de passe
8. ✅ Accès au backoffice avec ses permissions

---

## 🧪 Comment Tester

### Test Invitation

1. **Se connecter** : `/backoffice` en tant que Master Admin
2. **Accéder** : `/backoffice/users` (Gestion Utilisateurs)
3. **Cliquer** : Bouton jaune "Inviter un Collaborateur"
4. **Remplir** :
   ```
   Email: test@example.com
   Nom complet: Test Collaborateur
   Rôle: Collaborateur
   ```
5. **Sélectionner** : Au moins une permission (ex: CRM & Leads → Voir)
6. **Envoyer** : Cliquer "Envoyer l'Invitation"
7. **Vérifier** :
   - ✅ Message de succès
   - ✅ Email reçu (vérifier boîte mail)
   - ✅ Utilisateur apparaît dans la liste

### Vérification Base de Données

```sql
-- Vérifier utilisateur créé
SELECT id, email, full_name, role, is_active
FROM admin_users
WHERE email = 'test@example.com';

-- Vérifier permissions
SELECT permission_type, can_view, can_edit, can_delete
FROM user_permissions
WHERE user_id = (SELECT id FROM admin_users WHERE email = 'test@example.com');
```

### Test Email d'Invitation

L'email contient :
- 🔗 Lien de création de mot de passe
- ⏰ Validité : 24h
- 📝 Instructions claires

---

## 🐛 Résolution de Problèmes

### Erreur : "Edge function not found"

**Cause** : Edge Function non déployée
**Solution** :
```bash
# La fonction a été déployée automatiquement
# Vérifier dans Supabase Dashboard → Edge Functions
```

### Erreur : "Service role key not found"

**Cause** : Variable d'environnement manquante
**Solution** :
- ✅ Les variables sont **automatiquement configurées** par Supabase
- ✅ Aucune action manuelle requise

### Email non reçu

**Vérifications** :
1. Vérifier spam/courrier indésirable
2. Vérifier configuration SMTP Supabase :
   - Dashboard → Settings → Auth → SMTP
3. Vérifier logs Edge Function :
   - Dashboard → Edge Functions → invite-admin-user → Logs

### Invitation échoue silencieusement

**Console Browser** :
```javascript
// Ouvrir DevTools (F12) → Console
// Rechercher les erreurs :
"Error inviting user:"
"Edge function error:"
```

**Logs Supabase** :
- Dashboard → Edge Functions → invite-admin-user → Logs
- Rechercher timestamp de l'invitation
- Vérifier stack trace complète

---

## 🔒 Sécurité

### Avantages de l'Architecture

1. ✅ **Service Role Key** : Jamais exposée côté client
2. ✅ **JWT Vérifié** : Seuls les admins authentifiés peuvent inviter
3. ✅ **Validation** : Email et nom requis
4. ✅ **Rollback** : Suppression auto si erreur
5. ✅ **Logs** : Traçabilité complète

### Permissions Requises

Pour inviter un utilisateur :
- 🔐 Être connecté comme admin
- 🔐 Avoir un JWT valide
- 🔐 Faire partie de la table `admin_users`

---

## 📁 Fichiers Modifiés

### Nouveau
- ✨ `supabase/functions/invite-admin-user/index.ts` (Edge Function)

### Modifié
- ✏️ `src/backoffice/UserManagement.tsx`
  - `handleInviteUser()` : Utilise Edge Function
  - `handleResendInvite()` : Utilise Edge Function

---

## 🎯 Prochaines Actions

### Immédiat
1. ✅ **Upload** `/dist/` sur IONOS
2. ✅ **Tester** invitation utilisateur
3. ✅ **Vérifier** email reçu

### Configuration Email (Optionnel)

Si vous voulez personnaliser les emails d'invitation :

1. **Aller** : Supabase Dashboard → Authentication → Email Templates
2. **Modifier** : "Invite user" template
3. **Variables disponibles** :
   - `{{ .ConfirmationURL }}` : Lien de confirmation
   - `{{ .Token }}` : Token d'invitation
   - `{{ .SiteURL }}` : URL du site

---

## 📈 Améliorations Futures

- [ ] Invitation en masse (CSV)
- [ ] Notification Slack/Teams
- [ ] Expiration personnalisable (défaut : 24h)
- [ ] Resend automatique si non ouvert
- [ ] Templates d'email personnalisés
- [ ] Onboarding automatique
- [ ] Historique des invitations

---

**Déploiement** : ✅ Edge Function déployée automatiquement
**Build** : ✅ Succès
**Tests** : 🔄 À valider après upload `/dist/`
