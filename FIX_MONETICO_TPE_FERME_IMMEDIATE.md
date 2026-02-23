# 🔧 FIX URGENT - Monético "TPE Fermé"

## 🔴 Problème Identifié

**Erreur** : "Le Terminal de Paiement Electronique (TPE) est fermé"

**Cause** : Le système est en mode **TEST** mais votre TPE est activé en **PRODUCTION**

**Preuve** : La référence commence par **"T"** (T90095902668)
- T = Mode TEST
- P = Mode PRODUCTION ✅

## ✅ Solution Immédiate (2 minutes)

### Option 1 : Commande Directe (Plus Rapide)

```bash
supabase secrets set --project-ref bpwcakjtwgdtfwghylwv MONETICO_MODE="production"
```

**Important** : Attendez 30 secondes après la commande pour que les Edge Functions se rechargent.

### Option 2 : Via Dashboard Supabase (Si CLI non disponible)

1. Allez sur : https://supabase.com/dashboard/project/bpwcakjtwgdtfwghylwv/settings/functions
2. Cliquez sur **"Edge Functions"** puis **"Secrets"**
3. Ajoutez/Modifiez le secret :
   - **Nom** : `MONETICO_MODE`
   - **Valeur** : `production`
4. Cliquez sur **"Save"**

### Option 3 : Script Automatique (Configuration Complète)

```bash
./scripts/configure-monetico-production.sh
```

Ce script va :
- Demander votre clé MAC de production
- Configurer tous les secrets
- Valider la configuration

## 🔍 Vérification Après Configuration

### 1. Vérifier les Secrets

```bash
supabase secrets list --project-ref bpwcakjtwgdtfwghylwv | grep MONETICO
```

Vous devriez voir :
```
MONETICO_MODE=production
MONETICO_TPE=7374133
MONETICO_SOCIETE=taxiassur
MONETICO_MAC_KEY=***
```

### 2. Attendre le Rechargement

⏱️ **Attendez 30-60 secondes** que les Edge Functions se rechargent automatiquement.

### 3. Tester un Nouveau Paiement

La prochaine tentative devrait :
- Générer une référence commençant par **"P"** (production)
- Utiliser l'URL : `https://p.monetico-services.com/paiement.cgi`
- Accepter le paiement

## 📊 Différences Mode TEST vs PRODUCTION

| Élément | Mode TEST ❌ | Mode Production ✅ |
|---------|--------------|-------------------|
| URL | `/test/paiement.cgi` | `/paiement.cgi` |
| Référence | Préfixe **T** | Préfixe **P** |
| TPE Status | Fermé si activé en prod | Ouvert |
| Cartes | Cartes de test CIC | Vraies cartes |

## ⚠️ Points Importants

### Clé MAC de Production

Si vous n'avez pas encore configuré la clé MAC de production :

1. Connectez-vous à https://www.monetico-services.com/fr
2. Menu : **Configuration > Paramètres TPE**
3. Copiez la **Clé MAC** (40 caractères hexadécimaux)
4. Configurez-la :

```bash
supabase secrets set --project-ref bpwcakjtwgdtfwghylwv MONETICO_MAC_KEY="VOTRE_CLE_MAC_PRODUCTION"
```

⚠️ **ATTENTION** : La clé MAC de **production** est **différente** de celle de test !

### URLs à Configurer dans Monético

Une fois en mode production, configurez ces URLs dans votre dashboard Monético :

**URLs de retour :**
- URL OK : `https://taxiassur.com/espace-prospect/paiement-success`
- URL KO : `https://taxiassur.com/espace-prospect/paiement-error`

**URL du webhook :**
```
https://bpwcakjtwgdtfwghylwv.supabase.co/functions/v1/monetico-webhook
```

## 🧪 Test Après Configuration

```bash
./scripts/test-monetico-production.sh
```

Ce script va :
1. Créer un paiement de 1€
2. Vérifier que le mode est "PRODUCTION"
3. Vérifier que la référence commence par "P"
4. Ouvrir le formulaire de paiement

## 🚀 Résumé des Commandes

```bash
# 1. Passer en mode production (MINIMUM REQUIS)
supabase secrets set --project-ref bpwcakjtwgdtfwghylwv MONETICO_MODE="production"

# 2. Attendre 30 secondes
sleep 30

# 3. Tester
./scripts/test-monetico-production.sh
```

## 📞 Support

Si l'erreur persiste après configuration :

**Dashboard Monético** : https://www.monetico-services.com/fr
- Vérifiez que le TPE 7374133 est bien en statut "Actif"
- Vérifiez les URLs configurées

**Hotline CIC** : 0 820 821 735 (7j/7 - 24h/24)

---

**Date** : 23 Février 2026
**Status** : Configuration requise avant utilisation
