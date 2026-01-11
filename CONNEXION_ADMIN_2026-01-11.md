# 🔐 Connexion Administrateur - TaxiAssur

## ✅ Identifiants Valides (Mis à jour le 11/01/2026)

```
📧 Email : master@taxiassur.com
🔑 Mot de passe : TaxiAssur2025!,&
```

## 🚀 Procédure de Connexion

### 1. Accéder à la Page de Connexion

**Production:**
```
https://taxiassur.com/admin-dashboard
```

**Local (développement):**
```
http://localhost:5173/admin-dashboard
```

### 2. Entrer les Identifiants

⚠️ **IMPORTANT** : Copiez-collez exactement le mot de passe !

Le mot de passe contient des **caractères spéciaux** :
- Point d'exclamation : `!`
- Virgule : `,`
- Esperluette : `&`

### 3. Première Connexion

Après connexion, vous aurez accès à :

✅ **Dashboard Principal** - Vue d'ensemble
✅ **CRM Complet** - Gestion leads et clients
✅ **Pipeline Kanban** - Gestion visuelle des prospects
✅ **Inbox Multicanal** - Emails, SMS, WhatsApp
✅ **Email Marketing** - Campagnes et newsletters
✅ **Analytics** - Statistiques en temps réel
✅ **Automations** - Cron jobs et workflows
✅ **SEO Tools** - Optimisation et indexation

---

## 🔧 En Cas de Problème

### Erreur "Invalid login credentials"

**Solutions:**

1. **Vérifier le mot de passe**
   - Copiez-collez exactement : `TaxiAssur2025!,&`
   - Ne tapez PAS manuellement (risque d'erreur)

2. **Réinitialiser le mot de passe**
   ```bash
   node scripts/reset-admin-password-now.js
   ```

3. **Utiliser les outils de diagnostic**
   - Test Connexion : `/test-auth-diagnostic.html`
   - Réinitialisation : `/reset-admin-password.html`

### Vérifier le Compte

```bash
# Lister les utilisateurs admin
node scripts/diagnose-login-issue.js
```

---

## 📊 Informations du Compte

**Détails techniques:**
- ID Utilisateur : `abfe659d-6eb7-46a9-92aa-aa30edfbe200`
- Rôle : `master` (accès complet)
- Statut : `actif`
- Email confirmé : ✅ Oui

**Permissions:**
- ✅ Lecture complète
- ✅ Écriture complète
- ✅ Gestion utilisateurs
- ✅ Configuration système
- ✅ Accès Edge Functions
- ✅ Gestion base de données

---

## 🔒 Sécurité

### Session Persistante

La session admin est **permanente** (30 jours) :
- Pas besoin de se reconnecter à chaque visite
- Session sauvegardée dans localStorage
- Auto-refresh du token

### Déconnexion Manuelle

Pour vous déconnecter :
1. Cliquer sur votre avatar (en haut à droite)
2. Sélectionner "Déconnexion"
3. Ou vider le cache du navigateur

---

## 📝 Notes Importantes

### Caractères Spéciaux

Le mot de passe **TaxiAssur2025!,&** contient :
- Une majuscule : `T`
- Des minuscules : `axiassur`
- Des chiffres : `2025`
- Des symboles : `!` `,` `&`

⚠️ **Attention** : Ne confondez pas avec d'anciennes versions :
- ❌ `TaxiAssur2026!` (ancienne version)
- ❌ `TaxiAssur2025!&` (manque la virgule)
- ✅ `TaxiAssur2025!,&` (correct)

### Premier Démarrage

Lors de la première connexion après réinitialisation :
1. Chargement peut prendre 2-3 secondes
2. Initialisation des permissions
3. Chargement du dashboard

---

## 🆘 Support Technique

Si vous ne pouvez toujours pas vous connecter :

1. **Vérifier les variables d'environnement**
   ```bash
   cat .env | grep SUPABASE
   ```

2. **Tester la connexion Supabase**
   ```bash
   node scripts/verify-deployment.js
   ```

3. **Consulter les logs**
   - Console navigateur (F12)
   - Logs Supabase Dashboard
   - Logs Edge Functions

---

## 📞 Contact

Pour toute assistance :
- Email : team@taxiassur.com
- Téléphone : 01 80 85 57 86

---

**Dernière mise à jour** : 11 janvier 2026
**Version** : 1.0.0
**Status** : ✅ Opérationnel
