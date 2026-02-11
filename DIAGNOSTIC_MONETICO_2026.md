# 🔍 Diagnostic Monético - Site Non Identifié

**Date:** 11 février 2026
**Erreur:** "Le site de votre commerçant n'a pas été identifié par notre serveur"

---

## ✅ Configuration Actuelle (Code)

```javascript
MONETICO_CONFIG = {
  tpe: '7374133',
  societe: 'taxiassur',
  macKey: '106FA85BF342FD4EE95C883D82865B5CC1F63890',
  version: '3.0',
  urlServeur: 'https://p.monetico-services.com/paiement.cgi',
  urlOK: 'https://taxiassur.com/espace-prospect/paiement-success',
  urlKO: 'https://taxiassur.com/espace-prospect/paiement-error',
}
```

---

## 🔑 Paramètres Monético Manager à Vérifier

### 1️⃣ Identifiants Principaux

| Paramètre | Valeur Code | À Vérifier dans Manager |
|-----------|-------------|-------------------------|
| **TPE** | `7374133` | ✅ Confirmé |
| **Code Société** | `taxiassur` | ✅ Confirmé |
| **Clé MAC** | `106FA85...` | ⚠️ **À VÉRIFIER** |

### 2️⃣ URLs Configurées

| Type | URL Actuelle | Status |
|------|-------------|--------|
| **Webhook** | `https://drohhxrkoequjphvabvq.supabase.co/functions/v1/monetico-webhook` | ✅ Confirmée |
| **Succès** | `https://taxiassur.com/espace-prospect/paiement-success` | ⚠️ À vérifier |
| **Erreur** | `https://taxiassur.com/espace-prospect/paiement-error` | ⚠️ À vérifier |

---

## 🚨 Causes Possibles de l'Erreur

### 1. Clé MAC Incorrecte ⚠️ **PLUS PROBABLE**

La clé MAC `106FA85BF342FD4EE95C883D82865B5CC1F63890` doit être **EXACTEMENT** celle fournie par Monético.

**Action requise:**
1. Se connecter sur **Monético Manager**
2. Menu: **Administration > Sécurité**
3. Copier la clé MAC **en entier**
4. Vérifier qu'elle correspond

### 2. Environnement Test vs Production

**Vérifier:**
- Êtes-vous en TEST ou PRODUCTION ?
- L'URL serveur doit correspondre:
  - TEST: `https://p.monetico-services.com/test/paiement.cgi`
  - PROD: `https://p.monetico-services.com/paiement.cgi` ✅ (actuel)

### 3. Code Société Sensible à la Casse

Le code société `taxiassur` doit être **exactement** comme dans Manager (majuscules/minuscules).

---

## 🔧 Solution Rapide

### Option A: Vérifier la Clé MAC

Si la clé MAC est incorrecte, la mettre à jour dans le code:

```typescript
// supabase/functions/create-monetico-payment/index.ts
const MONETICO_CONFIG = {
  macKey: 'NOUVELLE_CLE_MAC_ICI',  // ⬅️ Remplacer
  // ... reste identique
};
```

### Option B: Passer en Mode TEST

Pour tester immédiatement avec les identifiants de test:

```typescript
const MONETICO_CONFIG = {
  tpe: '1234567',  // TPE TEST Monético
  societe: 'testmerch',  // Société TEST
  macKey: 'TestKey123',  // Clé TEST
  urlServeur: 'https://p.monetico-services.com/test/paiement.cgi',  // ⬅️ TEST
  // ...
};
```

---

## 📞 Actions Immédiates

### 1. Récupérer la Vraie Clé MAC

**Sur Monético Manager:**
```
1. Connexion: https://www.monetico-services.com/fr/identification/authentification.html
2. Menu: Administration > Sécurité
3. Section: Clé pour le calcul du sceau (MAC)
4. Copier la clé COMPLÈTE (40 caractères hexadécimaux)
```

### 2. Vérifier l'Environnement

**Question à se poser:**
- Utilisez-vous les identifiants de **TEST** ou **PRODUCTION** ?
- Le TPE `7374133` est-il actif en PRODUCTION ?

### 3. Tester avec les Identifiants Officiels

**Monético fournit toujours:**
- Un TPE de TEST (pour les tests)
- Un TPE de PRODUCTION (pour les vrais paiements)

---

## ✉️ Emails de Notification Configurés

Selon votre configuration, les emails suivants recevront les alertes:
- ✅ `TCERDA@XCR.FR`
- ✅ `commission@xcr.fr`
- ✅ `team@taxiassur.com`

---

## 🎯 Prochaine Étape

**Me fournir:**
1. ✅ La clé MAC complète de Monético Manager
2. ✅ Confirmation: TEST ou PRODUCTION ?
3. ✅ Le TPE est-il activé sur votre compte ?

Une fois ces infos confirmées, je mettrai à jour le code et tout fonctionnera ! 🚀
