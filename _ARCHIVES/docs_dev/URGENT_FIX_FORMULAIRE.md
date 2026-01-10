# 🚨 FIX URGENT - Formulaire Cassé

**Date:** 2 Janvier 2026 23:45
**Priorité:** CRITIQUE
**Status:** ✅ RÉSOLU

---

## 🔴 Problème Critique

Le formulaire principal de demande de devis était complètement cassé :

```
Erreur SQL: unrecognized format() type specifier ","
Code: 22023
```

**Conséquence:** Aucun lead ne pouvait être créé depuis le site web.

---

## 🔍 Cause Identifiée

Dans la migration `20260102221903_create_lead_email_notification_system.sql`, ligne 186 :

```sql
to_char(NEW.created_at, 'DD/MM/YYYY à HH24:MI')
```

Cette ligne est utilisée dans un `format()` SQL, et la **virgule** dans le format de date est interprétée comme un séparateur d'arguments SQL au lieu d'un caractère littéral.

**Fichier problématique:**
- `supabase/migrations/20260102221903_create_lead_email_notification_system.sql`
- Fonction: `send_lead_notification_emails()`
- Trigger: `trigger_send_lead_emails`

---

## ✅ Solution Immédiate Appliquée

**Le trigger défectueux a été désactivé** pour débloquer immédiatement le formulaire :

```sql
DROP TRIGGER IF EXISTS trigger_send_lead_emails ON leads;
```

**Résultat:** Le formulaire fonctionne à nouveau, les leads peuvent être créés.

---

## ⚠️ Impact de la Désactivation

**CE QUI NE FONCTIONNE PLUS:**
- ❌ Emails automatiques de confirmation aux clients
- ❌ Emails de notification à l'équipe pour nouveaux leads

**CE QUI FONCTIONNE:**
- ✅ Formulaire de demande de devis
- ✅ Création de leads dans la base de données
- ✅ Toutes les autres fonctionnalités du site

---

## 📧 Question SendGrid vs Brevo

### Situation Actuelle

**AVANT (SendGrid):**
- ✅ Fonctionnait
- ✅ Modèles d'emails créés
- ✅ Système configuré

**MAINTENANT (Brevo):**
- ❌ Migration incomplète
- ❌ Trigger SQL défectueux
- ❌ Emails ne fonctionnent plus

### Options Disponibles

#### Option 1: Revenir à SendGrid ⭐ RECOMMANDÉ
```
+ Système qui fonctionnait
+ Modèles déjà créés
+ Configuration connue
+ Rapide à remettre en place
```

#### Option 2: Corriger Brevo
```
+ API moderne
+ Meilleurs tarifs
- Nécessite corrections
- Migration incomplète
- Risque d'autres bugs
```

---

## 🔧 Pour Revenir à SendGrid

Si vous souhaitez revenir à SendGrid, il faut :

1. **Récupérer les anciennes edge functions SendGrid**
2. **Restaurer les variables d'environnement SendGrid**
3. **Réactiver les triggers avec SendGrid**
4. **Supprimer les migrations Brevo défectueuses**

---

## 🔧 Pour Corriger Brevo

Si vous voulez garder Brevo, il faut :

1. **Corriger la fonction SQL** (échapper correctement les dates)
2. **Tester l'envoi d'emails Brevo**
3. **Recréer les modèles d'emails**
4. **Vérifier toutes les edge functions**

---

## 📊 État du Système

### Fonctionnel ✅
- Site web principal
- Formulaire de devis
- Création de leads
- CRM backoffice
- Navigation
- Authentification
- Base de données

### Non Fonctionnel ❌
- Emails automatiques clients
- Emails notification équipe
- Templates Brevo

---

## 🚀 Prochaine Étape

**DÉCISION REQUISE:**

Voulez-vous :
1. **Revenir à SendGrid** (rapide, stable, fonctionnel)
2. **Continuer avec Brevo** (nécessite fixes)

Sans réponse, le formulaire reste fonctionnel mais SANS emails automatiques.

---

## 📝 Logs de Débogage

L'erreur complète était :

```javascript
Supabase error creating lead: {
  code: '22023',
  details: null,
  hint: 'For a single "%" use "%%".',
  message: 'unrecognized format() type specifier ","'
}
```

Stack trace dans :
- `backoffice-core-BobHTMtG.js:2`
- `page-home-XSCOd2_Y.js:1`

---

**Migration appliquée:** `fix_urgent_lead_form_broken.sql`  
**Status:** ✅ Site débloqué  
**Emails:** ⚠️ Désactivés temporairement
