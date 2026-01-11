# 🔐 Configuration des Secrets Supabase - Guide Rapide

## ⚠️ Problème Actuel

L'inbox CRM affiche l'erreur : **"502 Bad Gateway"** lors de la synchronisation IONOS.

**Cause** : Les identifiants IONOS ne sont pas configurés dans Supabase Edge Functions.

---

## ✅ Solution Rapide (5 minutes)

### Étape 1 : Accéder au Dashboard Supabase

1. Aller sur : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
2. Se connecter avec votre compte Supabase

### Étape 2 : Aller dans les Secrets

1. Cliquer sur **"Project Settings"** (icône ⚙️ en bas à gauche)
2. Dans le menu de gauche, cliquer sur **"Edge Functions"**
3. Cliquer sur l'onglet **"Secrets"**

### Étape 3 : Ajouter les 6 Secrets

Cliquer sur **"Add new secret"** pour chacun :

```bash
Nom: IONOS_EMAIL_USER
Valeur: team@taxiassur.com
```

```bash
Nom: IONOS_EMAIL_PASSWORD
Valeur: TaxiAssur2025!,&
```

```bash
Nom: IONOS_IMAP_HOST
Valeur: imap.ionos.fr
```

```bash
Nom: IONOS_IMAP_PORT
Valeur: 993
```

```bash
Nom: IONOS_SMTP_HOST
Valeur: smtp.ionos.fr
```

```bash
Nom: IONOS_SMTP_PORT
Valeur: 465
```

### Étape 4 : Tester

1. Retourner sur https://taxiassur.com/backoffice/crm-killer/inbox
2. Cliquer sur le bouton **"Synchroniser maintenant"**
3. Les emails IONOS devraient maintenant se synchroniser ✅

---

## 📸 Captures d'Écran

### 1. Accéder aux Secrets
```
Dashboard Supabase > Settings (⚙️) > Edge Functions > Secrets tab
```

### 2. Ajouter un Secret
```
[Add new secret] bouton
↓
Name: IONOS_EMAIL_USER
Value: team@taxiassur.com
↓
[Save] bouton
```

---

## 🔍 Vérification

### Comment savoir si c'est configuré ?

Dans la page des Secrets, vous devriez voir ces 6 secrets listés :

- ✅ IONOS_EMAIL_USER
- ✅ IONOS_EMAIL_PASSWORD
- ✅ IONOS_IMAP_HOST
- ✅ IONOS_IMAP_PORT
- ✅ IONOS_SMTP_HOST
- ✅ IONOS_SMTP_PORT

### Test de Synchronisation

Après configuration :
1. Aller sur l'inbox : https://taxiassur.com/backoffice/crm-killer/inbox
2. Cliquer sur "Synchroniser maintenant"
3. Message de succès attendu :
   ```
   ✅ Synchronisation complète réussie !

   📧 150 emails récupérés (23 nouveaux)
   👤 5 nouveaux leads créés
   🔗 23 emails affectés aux leads
   💬 15 interactions enregistrées
   ```

---

## 🆘 En Cas de Problème

### Erreur persiste après configuration

1. Vérifier que le mot de passe contient bien tous les caractères : `TaxiAssur2025!,&`
2. Attendre 1-2 minutes que les secrets se propagent
3. Rafraîchir la page de l'inbox (F5)
4. Réessayer la synchronisation

### Mot de passe refusé

Si l'erreur indique "authentication failed" :
1. Tester la connexion manuellement avec un client email (Thunderbird, Outlook)
2. Vérifier auprès d'IONOS que le compte n'est pas bloqué
3. Contacter support IONOS : support@ionos.fr

### 502 Gateway continue

Si le 502 persiste :
1. Vérifier les logs dans Supabase Dashboard > Edge Functions > Logs
2. Chercher "sync-ionos-imap" dans les logs
3. Vérifier le message d'erreur exact

---

## 📋 Alternative : Configuration via CLI

Si vous préférez la ligne de commande :

```bash
# Installer la CLI Supabase
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref drohhxrkoequjphvabvq

# Ajouter les secrets
supabase secrets set IONOS_EMAIL_USER="team@taxiassur.com"
supabase secrets set IONOS_EMAIL_PASSWORD="TaxiAssur2025!,&"
supabase secrets set IONOS_IMAP_HOST="imap.ionos.fr"
supabase secrets set IONOS_IMAP_PORT="993"
supabase secrets set IONOS_SMTP_HOST="smtp.ionos.fr"
supabase secrets set IONOS_SMTP_PORT="465"

# Vérifier
supabase secrets list
```

---

## ✅ Checklist Finale

- [ ] Accès Supabase Dashboard confirmé
- [ ] 6 secrets IONOS ajoutés
- [ ] Test de synchronisation réussi
- [ ] Emails apparaissent dans l'inbox
- [ ] Pas d'erreur 502

---

## 🎯 Résultat Attendu

Une fois configuré, votre inbox CRM affichera :

- ✅ Emails IONOS synchronisés automatiquement
- ✅ Emails Brevo synchronisés
- ✅ Création automatique de leads depuis emails
- ✅ Statistiques en temps réel
- ✅ Bouton "Synchroniser maintenant" fonctionnel

**Synchronisation automatique** : Toutes les 15 minutes via cron job

---

**Temps de configuration** : 5 minutes
**Difficulté** : ⭐ Facile
**Support** : team@taxiassur.com
