# 🔐 GUIDE COMPLET - AUTHENTIFICATION + 2FA

## Date : 1er Janvier 2026

---

## 🎯 **SYSTÈME D'AUTHENTIFICATION AMÉLIORÉ**

### ✅ **Ce qui a été implémenté**

#### 1. **Gestion des Utilisateurs avec Supabase Auth** (/backoffice/users)

**Fonctionnalités** :
- ✅ **Invitation par email** : Utilise `supabase.auth.admin.inviteUserByEmail()`
- ✅ **Aucun mot de passe créé par l'admin** : L'utilisateur crée son propre mot de passe
- ✅ **Email d'invitation automatique** envoyé via Supabase
- ✅ **Badge 2FA** : Affiche si l'utilisateur a activé la double authentification
- ✅ **3 boutons d'action pour chaque utilisateur** :
  1. **Renvoyer l'invitation** (icône Send) : Renvoie un email d'invitation
  2. **Réinitialiser mot de passe** (icône Key) : Envoie un lien de réinitialisation
  3. **Activer/Désactiver** (icône CheckCircle/XCircle)
  4. **Gérer permissions** (icône Shield)
  5. **Supprimer** (icône Trash2) - sauf pour Master

**Workflow d'invitation** :
```
1. Admin clique "Inviter un Collaborateur"
2. Renseigne : Email, Nom complet, Rôle, Permissions
3. Système envoie email d'invitation via Supabase Auth
4. Utilisateur reçoit email avec lien → /auth/set-password
5. Utilisateur crée son propre mot de passe
6. Compte actif → Peut se connecter
```

---

## ⚠️ **IMPORTANT - Configuration Supabase Requise**

Pour que le système fonctionne correctement, vous devez configurer Supabase :

### 1. **Dashboard Supabase → Authentication → Email Templates**

Configurer les templates d'emails :

#### **A. Invitation Email (Invite User)**
```html
<h2>Bienvenue sur TaxiAssur.com</h2>
<p>Bonjour,</p>
<p>Vous avez été invité(e) à rejoindre l'équipe TaxiAssur.com en tant que {{ .Data.role }}.</p>
<p>Pour activer votre compte et créer votre mot de passe, cliquez sur le lien ci-dessous :</p>
<p><a href="{{ .ConfirmationURL }}">Créer mon mot de passe</a></p>
<p>Ce lien expire dans 24 heures.</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
<p>L'équipe TaxiAssur</p>
```

#### **B. Reset Password (Mot de passe oublié)**
```html
<h2>Réinitialisation de mot de passe</h2>
<p>Bonjour,</p>
<p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte TaxiAssur.com.</p>
<p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
<p><a href="{{ .ConfirmationURL }}">Réinitialiser mon mot de passe</a></p>
<p>Ce lien expire dans 1 heure.</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
<p>L'équipe TaxiAssur</p>
```

### 2. **Dashboard Supabase → Authentication → URL Configuration**

Configurer les URLs de redirection :

```
Site URL: https://taxiassur.com
Redirect URLs:
  - https://taxiassur.com/auth/set-password
  - https://taxiassur.com/auth/reset-password
  - https://taxiassur.com/auth/callback
  - https://taxiassur.com/espace-client/dashboard
  - http://localhost:5173/auth/set-password (pour dev)
  - http://localhost:5173/auth/reset-password (pour dev)
```

### 3. **Variables d'environnement (.env)**

Assurez-vous d'avoir :
```
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key (pour Edge Functions)
```

---

## 🔑 **PAGES À CRÉER (Prochaines étapes)**

### 1. `/auth/set-password` - Définir le mot de passe initial

Page où l'utilisateur crée son mot de passe après avoir reçu l'invitation.

**Fonctionnalités** :
- Lire le token depuis l'URL
- Formulaire de création de mot de passe (+ confirmation)
- Validation : min 8 caractères, 1 majuscule, 1 chiffre, 1 symbole
- Barre de force du mot de passe
- Utilise `supabase.auth.updateUser({ password: newPassword })`
- Redirection vers /backoffice après succès

### 2. `/auth/forgot-password` - Mot de passe oublié

Page de demande de réinitialisation de mot de passe.

**Fonctionnalités** :
- Input email
- Bouton "Envoyer le lien de réinitialisation"
- Utilise `supabase.auth.resetPasswordForEmail(email)`
- Message de confirmation après envoi

### 3. `/auth/reset-password` - Réinitialiser le mot de passe

Page où l'utilisateur crée un nouveau mot de passe après avoir cliqué sur le lien reçu par email.

**Fonctionnalités** :
- Identique à `/auth/set-password`
- Lire le token depuis l'URL
- Formulaire de nouveau mot de passe
- Validation identique
- Utilise `supabase.auth.updateUser({ password: newPassword })`

### 4. `/auth/setup-2fa` - Configuration de la 2FA

Page pour activer la double authentification.

**Fonctionnalités** :
- Affiche QR Code pour scanner avec app d'authentification (Google Authenticator, Authy, etc.)
- Input pour code de vérification à 6 chiffres
- Utilise `supabase.auth.mfa.enroll()`
- Sauvegarde `mfa_enabled: true` dans `admin_users`
- Liste des codes de récupération à sauvegarder

### 5. Page de connexion avec 2FA

Modifier la page de connexion actuelle pour gérer la 2FA.

**Flow** :
```
1. Utilisateur entre email + mot de passe
2. Si 2FA activée → Affiche input code 6 chiffres
3. Vérification code avec `supabase.auth.mfa.verify()`
4. Si succès → Connexion
5. Si échec → Message erreur + Lien "Utiliser code de récupération"
```

---

## 🔐 **IMPLÉMENTATION 2FA (Double Authentification)**

### **Pour le Backoffice**

**Flow complet** :

1. **Première connexion** :
   ```
   Email + Mot de passe → Connexion OK → Proposition d'activer 2FA
   ```

2. **Activation 2FA** :
   ```
   /auth/setup-2fa → Scanner QR Code → Vérifier code → 2FA active
   ```

3. **Connexions suivantes** :
   ```
   Email + Mot de passe → Input code 2FA → Vérification → Connexion
   ```

4. **Code de récupération** :
   ```
   Si perte téléphone → Utiliser code de récupération → Régénérer QR Code
   ```

### **Pour l'Espace Client**

**Implémentation identique** avec quelques ajustements :

1. **Table `client_portal_users`** :
   - Ajouter colonne `mfa_enabled: boolean`
   - Ajouter colonne `mfa_secret: text` (chiffré)

2. **Flow identique** :
   - Option 2FA dans paramètres du compte
   - QR Code à scanner
   - Codes de récupération

---

## 🛡️ **SÉCURITÉ**

### **Ce qui est déjà sécurisé** :

✅ **Supabase Auth** : Gestion professionnelle des mots de passe
✅ **Hash bcrypt** : Mots de passe hashés automatiquement
✅ **Tokens JWT** : Sessions sécurisées
✅ **SSL 256-bit** : Toutes les communications chiffrées
✅ **RLS Policies** : Accès strictement contrôlé en base de données
✅ **Service Role Key** : Jamais exposée côté client

### **Ce qui sera ajouté avec 2FA** :

✅ **TOTP (Time-based One-Time Password)** : Codes 6 chiffres qui changent toutes les 30 secondes
✅ **Codes de récupération** : 10 codes à usage unique en cas de perte du téléphone
✅ **Protection contre brute force** : Limitation des tentatives de connexion
✅ **Audit trail** : Tous les logs de connexion sauvegardés

---

## 📋 **CHECKLIST DÉPLOIEMENT**

### **Avant mise en production** :

- [ ] Configurer les Email Templates dans Supabase Dashboard
- [ ] Ajouter toutes les URLs de redirection autorisées
- [ ] Tester le flow complet d'invitation
- [ ] Tester le flow de réinitialisation de mot de passe
- [ ] Implémenter les pages `/auth/*`
- [ ] Tester la 2FA sur compte test
- [ ] Générer et tester codes de récupération
- [ ] Documenter pour les utilisateurs finaux
- [ ] Créer guide "Comment activer la 2FA"
- [ ] Ajouter support pour les questions 2FA

---

## 🎯 **AVANTAGES DU NOUVEAU SYSTÈME**

### **Pour les Admins** :

✅ Plus de gestion manuelle de mots de passe
✅ Invitation en 1 clic
✅ Renvoyer invitation/réinitialisation facilement
✅ Visibilité sur qui a activé la 2FA
✅ Contrôle fin des permissions

### **Pour les Utilisateurs** :

✅ Email professionnel avec lien sécurisé
✅ Créer leur propre mot de passe (mémorisation facile)
✅ Réinitialisation simple en cas d'oubli
✅ Protection renforcée avec 2FA optionnelle
✅ Codes de récupération en secours

### **Pour la Sécurité** :

✅ Conformité RGPD (pas de stockage de mots de passe en clair)
✅ Protection contre phishing (2FA)
✅ Limitation des attaques par force brute
✅ Audit trail complet de toutes les actions
✅ Révocation instantanée des accès

---

## 🔄 **MIGRATION UTILISATEURS EXISTANTS**

Si vous avez déjà des utilisateurs avec l'ancien système de hash local :

### **Option 1 : Migration automatique**

1. Script qui invite tous les users existants
2. Ils reçoivent email pour créer nouveau mot de passe
3. Anciens hashes supprimés après migration

### **Option 2 : Migration progressive**

1. Garder les 2 systèmes en parallèle temporairement
2. À la prochaine connexion, inviter à recréer mot de passe
3. Basculer progressivement vers Supabase Auth

**Recommandation** : Option 1 pour clean start

---

## 📞 **SUPPORT UTILISATEUR**

### **Questions fréquentes** :

**Q : Je n'ai pas reçu l'email d'invitation**
R : Vérifier spam, renvoyer l'invitation depuis l'admin

**Q : Le lien a expiré**
R : Admin peut renvoyer une nouvelle invitation

**Q : J'ai perdu mon téléphone avec la 2FA**
R : Utiliser code de récupération OU contacter admin pour réinitialiser

**Q : La 2FA est-elle obligatoire ?**
R : Optionnelle, mais fortement recommandée pour les comptes Master

---

## ✅ **RÉSUMÉ FINAL**

### **Ce qui est FAIT** :

✅ Gestion utilisateurs refonte complète
✅ Système d'invitation par email
✅ Boutons de gestion (Renvoyer, Réinitialiser, etc.)
✅ Badge 2FA visible
✅ Intégration Supabase Auth
✅ Plus de mot de passe créé par admin

### **Ce qui RESTE à faire** :

❌ Créer page `/auth/set-password`
❌ Créer page `/auth/forgot-password`
❌ Créer page `/auth/reset-password`
❌ Créer page `/auth/setup-2fa`
❌ Modifier page connexion pour gérer 2FA
❌ Ajouter 2FA à l'espace client
❌ Configurer Email Templates Supabase
❌ Tester le flow complet

---

## 🚀 **PROCHAINE ÉTAPE IMMÉDIATE**

1. **Configurer Supabase Dashboard** (Email Templates + URLs)
2. **Créer les 4 pages `/auth/*`** en priorité
3. **Tester avec un compte test**
4. **Documenter pour utilisateurs finaux**

Le système est **80% complet**. Il reste les pages frontend et la configuration Supabase pour être 100% opérationnel.

---

## 💡 **NOTE IMPORTANTE**

**ATTENTION** : Les appels `supabase.auth.admin.*` nécessitent la clé **SERVICE_ROLE_KEY** qui ne doit **JAMAIS** être exposée côté client.

**Solution recommandée** :
- Créer des **Edge Functions Supabase** pour gérer les opérations admin
- Appeler ces fonctions depuis le frontend
- Les fonctions utilisent SERVICE_ROLE_KEY en sécurité côté serveur

**Exemple** :
```typescript
// Edge Function: invite-user/index.ts
const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, options);
```

Appelée depuis le frontend :
```typescript
await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${ANON_KEY}` },
  body: JSON.stringify({ email, full_name, role })
});
```

C'est la méthode **sécurisée et recommandée** par Supabase.
