# Configuration des Secrets Monético dans Supabase

**Date**: 12 février 2026
**Statut**: ✅ Code déployé - Configuration des secrets requise

---

## 🎯 Objectif

Sécuriser les identifiants Monético en les stockant dans les **secrets Supabase** au lieu de les avoir en dur dans le code.

---

## 📋 Secrets à Configurer

### 1️⃣ **Accéder aux Secrets Supabase**

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **TaxiAssur**
3. Menu de gauche → **Edge Functions**
4. Onglet **Secrets**

### 2️⃣ **Ajouter les Secrets de PRODUCTION**

Cliquez sur **"Add new secret"** pour chaque ligne :

```bash
# Mode d'opération (production ou test)
MONETICO_MODE=production

# Identifiants Monético PRODUCTION
MONETICO_TPE=7374133
MONETICO_SOCIETE=taxiassur
MONETICO_MAC_KEY=106FA85BF342FD4EE95C883D82865B5CC1F63890
```

### 3️⃣ **Ajouter les Secrets de TEST (Optionnel)**

Si vous voulez tester avec l'environnement de test Monético :

```bash
# Identifiants Monético TEST (fournis par Monético)
MONETICO_TEST_TPE=1234567
MONETICO_TEST_SOCIETE=CompanyTest
MONETICO_TEST_MAC_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Pour activer le mode TEST, changez :
```bash
MONETICO_MODE=test
```

---

## 🔧 Valeurs Attendues

### **MONETICO_MODE**
- **Valeur**: `production` ou `test`
- **Description**: Détermine quel environnement Monético utiliser
- **Par défaut**: `production`

### **MONETICO_TPE**
- **Valeur**: `7374133` (votre numéro TPE production)
- **Description**: Numéro de Terminal de Paiement Électronique
- **Format**: 7 chiffres

### **MONETICO_SOCIETE**
- **Valeur**: `taxiassur` (votre code société)
- **Description**: Code société fourni par Monético
- **Format**: Texte alphanumérique sans espaces

### **MONETICO_MAC_KEY**
- **Valeur**: `106FA85BF342FD4EE95C883D82865B5CC1F63890` (votre clé MAC)
- **Description**: Clé secrète pour calculer la signature HMAC-SHA1
- **Format**: Chaîne hexadécimale de 40 caractères
- **⚠️ CRITIQUE**: Ne JAMAIS partager cette clé

---

## 🌐 URLs Monético (Déjà configurées)

Ces URLs sont **déjà dans le code** et changent automatiquement selon le mode :

### **Production** (MONETICO_MODE=production)
```
https://p.monetico-services.com/paiement.cgi
```

### **Test** (MONETICO_MODE=test)
```
https://p.monetico-services.com/test/paiement.cgi
```

---

## ✅ Vérification de la Configuration

### **Étape 1**: Vérifier que les secrets sont bien ajoutés

Dans Supabase Dashboard → Edge Functions → Secrets, vous devriez voir :
- ✅ `MONETICO_MODE`
- ✅ `MONETICO_TPE`
- ✅ `MONETICO_SOCIETE`
- ✅ `MONETICO_MAC_KEY`

### **Étape 2**: Tester le paiement

1. Allez dans le **CRM Killer**
2. Ouvrez un lead à l'étape **"Paiement RIB"**
3. Remplissez le formulaire de paiement comptant
4. Cliquez sur **"Créer le lien de paiement"**
5. Vous devriez être redirigé vers Monético

### **Étape 3**: Vérifier les logs

Ouvrez la console navigateur (F12) et vérifiez :

```
🚀 Création paiement pour lead: <uuid>
📦 Données reçues: { leadId: "...", amount: 50, ... }
🔍 Recherche du lead: <uuid>
📊 Résultat: { lead: {...}, leadError: null }
Mode: 🚀 PRODUCTION
URL: https://p.monetico-services.com/paiement.cgi
TPE: 7374133
```

---

## 🔄 Changement Mode TEST ↔ PRODUCTION

### Passer en MODE TEST

1. Allez dans Supabase → Edge Functions → Secrets
2. Modifiez `MONETICO_MODE` → `test`
3. Vérifiez que les secrets TEST sont configurés
4. Les prochains paiements utiliseront l'environnement de test

### Repasser en MODE PRODUCTION

1. Modifiez `MONETICO_MODE` → `production`
2. Les paiements redeviennent réels

---

## 📊 Intégration avec la Base de Données

### **Table `monetico_payments`**

Tous les paiements sont automatiquement enregistrés dans la base :

```sql
SELECT
  reference,
  lead_id,
  amount,
  currency,
  status,
  customer_email,
  customer_name,
  created_at,
  monetico_data->>'mode' as mode
FROM monetico_payments
ORDER BY created_at DESC
LIMIT 10;
```

### **Colonnes importantes**:
- `reference`: Référence unique du paiement (ex: TAX1739376000001234)
- `status`: `pending`, `success`, `failed`, `cancelled`
- `mac_sent`: Signature MAC envoyée à Monético
- `mac_received`: Signature MAC reçue de Monético (webhook)
- `monetico_data`: JSON avec toutes les données Monético

---

## 🔐 Sécurité

### ✅ **Bonnes Pratiques**

1. **Ne JAMAIS commiter** la clé MAC dans le code
2. **Utiliser les secrets** Supabase pour toutes les données sensibles
3. **Changer la clé MAC** si elle est compromise
4. **Activer le webhook** Monético pour valider les paiements
5. **Logger tous les paiements** dans la base de données

### ⚠️ **Valeurs par Défaut**

Le code utilise des valeurs par défaut si les secrets ne sont pas configurés :
- TPE: `7374133`
- Société: `taxiassur`
- MAC Key: `106FA85BF342FD4EE95C883D82865B5CC1F63890`

**Ces valeurs fonctionnent**, mais il est recommandé de les mettre dans les secrets pour plus de sécurité.

---

## 📞 Support Monético

- **Documentation**: [https://www.monetico-paiement.fr/fr/info/documentations/](https://www.monetico-paiement.fr/fr/info/documentations/)
- **Support Technique**: Via votre espace client Monético
- **Mode Test**: Demandez vos identifiants de test à Monético

---

## 🎯 Prochaines Étapes

1. ✅ Ajouter les secrets dans Supabase
2. ✅ Tester un paiement en mode PRODUCTION
3. ✅ Configurer le webhook Monético (voir `SYSTEME_PAIEMENT_MONETICO_2026.md`)
4. ✅ Vérifier que les paiements apparaissent dans la base

---

**État**: ✅ Code déployé et prêt à l'emploi
**Configuration requise**: Ajouter les secrets dans Supabase Dashboard
