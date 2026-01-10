# 📧 GUIDE - Synchronisation Emails IONOS IMAP

## 🎯 Problème actuel

Votre inbox CRM est vide parce que les emails IONOS ne sont pas synchronisés. La table `email_messages` dans Supabase est vide (0 emails).

## ✅ Ce qui a été corrigé

1. **Amélioration de la fonction de synchronisation** :
   - Utilise maintenant `sync-ionos-imap` directement
   - Affiche des messages détaillés de succès/erreur
   - Compte le nombre d'emails synchronisés

2. **Interface améliorée** :
   - Messages de status visibles (succès en vert, erreur en rouge)
   - Indication du nombre d'emails récupérés
   - Bouton "Synchroniser" avec animation

---

## 🔧 CONFIGURATION REQUISE

### 1. Vérifier le compte email dans Supabase

Le compte `team@taxiassur.com` existe déjà dans la table `email_accounts` avec :
- ✅ `imap_host`: imap.ionos.fr
- ✅ `imap_port`: 993
- ✅ `imap_username`: team@taxiassur.com
- ❓ `imap_password_encrypted`: **DOIT ÊTRE CONFIGURÉ**

### 2. Ajouter le mot de passe IMAP

Le mot de passe IMAP IONOS doit être ajouté dans Supabase :

#### Option A : Via SQL (recommandé)

```sql
UPDATE email_accounts
SET imap_password_encrypted = 'VOTRE_MOT_DE_PASSE_IONOS'
WHERE email = 'team@taxiassur.com';
```

#### Option B : Créer un mot de passe d'application IONOS

1. Connectez-vous sur https://www.ionos.fr/
2. Allez dans **Email** → **Paramètres**
3. Créez un **mot de passe d'application** spécifique pour IMAP
4. Utilisez ce mot de passe dans la configuration

---

## 🚀 TEST DE SYNCHRONISATION

### Étape 1 : Accéder à l'inbox

```
https://taxiassur.com/backoffice/crm-killer/inbox
```

### Étape 2 : Cliquer sur "Synchroniser"

Le bouton "Synchroniser" en haut à droite va :
1. Se connecter à `imap.ionos.fr:993`
2. Récupérer jusqu'à 500 emails de la boîte INBOX
3. Récupérer jusqu'à 200 emails du dossier Sent
4. Afficher le résultat

### Étape 3 : Vérifier les messages

Vous verrez un message :
- ✅ **Vert** : "Synchronisation réussie ! X nouveaux emails..."
- ❌ **Rouge** : Message d'erreur détaillé

---

## 🐛 RÉSOLUTION DES PROBLÈMES

### Erreur : "No active email accounts found"

**Cause** : Le compte n'est pas actif dans la base

**Solution** :
```sql
UPDATE email_accounts
SET is_active = true
WHERE email = 'team@taxiassur.com';
```

### Erreur : "IMAP connection failed: Invalid credentials"

**Cause** : Mot de passe IMAP incorrect ou manquant

**Solutions** :
1. Vérifiez le mot de passe IONOS
2. Créez un mot de passe d'application spécifique
3. Vérifiez que l'accès IMAP est activé sur IONOS

### Erreur : "IMAP connection failed: Timeout"

**Cause** : Le serveur IMAP ne répond pas

**Solutions** :
1. Vérifiez que `imap.ionos.fr` est accessible
2. Vérifiez le port 993
3. Vérifiez le pare-feu Supabase

### Aucun email récupéré (0 inserted)

**Cause** : Tous les emails sont déjà synchronisés

**Explication** : C'est normal ! La synchronisation ne duplique pas les emails déjà dans la base.

---

## 🔍 DIAGNOSTIC AVANCÉ

### Vérifier la connexion IMAP manuellement

```sql
-- Voir les logs de la dernière synchronisation
SELECT
  email,
  last_sync_at,
  is_active
FROM email_accounts
WHERE email = 'team@taxiassur.com';
```

### Tester la edge function directement

```bash
curl -X POST \
  'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/sync-ionos-imap' \
  -H 'Authorization: Bearer VOTRE_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### Vérifier les emails synchronisés

```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE direction = 'inbound') as received,
  COUNT(*) FILTER (WHERE direction = 'outbound') as sent,
  MAX(received_at) as last_email
FROM email_messages;
```

---

## 📊 AUTOMATISATION

### Cron job actif

Un cron job est déjà configuré pour synchroniser automatiquement les emails :

```
jobname: fetch-email-replies-hourly
schedule: 0 * * * *  (toutes les heures)
```

### Forcer une synchronisation manuelle

Depuis l'inbox CRM, cliquez simplement sur le bouton **"Synchroniser"**.

---

## ✅ CHECKLIST

Avant de tester, assurez-vous que :

- [ ] Le compte `team@taxiassur.com` existe dans `email_accounts`
- [ ] `is_active = true`
- [ ] `imap_host = 'imap.ionos.fr'`
- [ ] `imap_port = 993`
- [ ] `imap_password_encrypted` est défini
- [ ] Le mot de passe IMAP est correct
- [ ] L'accès IMAP est activé sur IONOS
- [ ] La edge function `sync-ionos-imap` est déployée

---

## 🎯 PROCHAINES ÉTAPES

1. **Ajouter le mot de passe IMAP** dans `email_accounts`
2. **Tester la synchronisation** depuis l'inbox
3. **Vérifier les emails** apparaissent dans la liste
4. **Configurer les automatisations** (classement IA, réponses auto)

---

## 📞 SUPPORT

Si le problème persiste après avoir :
- Vérifié le mot de passe IMAP
- Testé la synchronisation manuelle
- Regardé les logs de la edge function

Vérifiez les points suivants :
1. Le compte email IONOS est actif et accessible
2. L'accès IMAP est activé dans les paramètres IONOS
3. Aucun blocage IP/firewall côté IONOS
4. Les credentials sont corrects (email + mot de passe)

---

**Date** : 10 janvier 2026
**Status** : Interface améliorée, diagnostic ajouté
**Action requise** : Configurer le mot de passe IMAP IONOS
