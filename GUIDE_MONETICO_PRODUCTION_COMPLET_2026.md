# GUIDE COMPLET : MONETICO PAIEMENT PRODUCTION
## TAXIASSUR - 24 FÉVRIER 2026

---

## 🎯 OBJECTIF

Activer les paiements comptant en ligne via Monetico Paiement (Crédit Mutuel / CIC).

**Temps estimé : 10-15 minutes**

---

## 📋 PRÉREQUIS

- Contrat Monetico Paiement signé avec le Crédit Mutuel / CIC
- Accès au back-office Monetico
- Identifiants de production reçus par email
- Accès au projet Supabase TaxiAssur

---

## 📧 ÉTAPE 1 : RÉCUPÉRER LES IDENTIFIANTS (5 MIN)

### 1.1 Email de bienvenue Monetico

Cherchez l'email avec l'objet :
```
"Bienvenue sur Monetico Paiement - Vos identifiants de production"
```

Cet email contient :
- **Numéro TPE** (ex: `1234567`)
- **Code Société** (ex: `companyABC`)
- **Lien vers le back-office**

### 1.2 Accéder au back-office Monetico

1. Aller sur **https://www.monetico-paiement.fr/**
2. Cliquer sur **"Accès commerçant"**
3. Se connecter avec vos identifiants

### 1.3 Récupérer la clé secrète

1. Une fois connecté, aller dans **Paramètres** → **Sécurité**
2. Section **"Clé de sécurité"**
3. **Noter la clé** (40 caractères alphanumériques)

**⚠️ IMPORTANT** : Cette clé est sensible, ne la partagez jamais !

Exemple :
```
AB12CD34EF56GH78IJ90KL12MN34OP56QR78ST
```

### 1.4 Configurer l'URL de retour

Dans le back-office Monetico :

1. Aller dans **Paramètres** → **URLs de retour**
2. **URL de retour avec données** :
   ```
   https://taxiassur.com/api/monetico-webhook.php
   ```
3. **URL de retour sans données** :
   ```
   https://taxiassur.com/paiement-success
   ```
4. **URL d'annulation** :
   ```
   https://taxiassur.com/paiement-error
   ```
5. Cliquer sur **"Enregistrer"**

---

## 🔐 ÉTAPE 2 : CONFIGURER LES SECRETS SUPABASE (5 MIN)

### 2.1 Préparer les valeurs

Vous aurez besoin de **4 secrets** :

```bash
MONETICO_TPE                → Votre numéro TPE (ex: 1234567)
MONETICO_KEY                → Votre clé secrète (40 caractères)
MONETICO_COMPANY_CODE       → Votre code société (ex: companyABC)
MONETICO_MODE               → production
```

### 2.2 Configurer via Supabase Dashboard

1. Aller sur **https://supabase.com/dashboard**
2. Sélectionner votre projet **TaxiAssur**
3. Menu **Project Settings** → **Edge Functions** → **Secrets**
4. Ajouter les 4 secrets :

**Secret 1** :
```
Name  : MONETICO_TPE
Value : 1234567
```

**Secret 2** :
```
Name  : MONETICO_KEY
Value : AB12CD34EF56GH78IJ90KL12MN34OP56QR78ST
```

**Secret 3** :
```
Name  : MONETICO_COMPANY_CODE
Value : companyABC
```

**Secret 4** :
```
Name  : MONETICO_MODE
Value : production
```

### 2.3 Alternative : Via Supabase CLI

```bash
# Se connecter à Supabase
supabase login

# Lier au projet
supabase link --project-ref YOUR_PROJECT_REF

# Configurer les secrets
supabase secrets set MONETICO_TPE="1234567"
supabase secrets set MONETICO_KEY="AB12CD34EF56GH78IJ90KL12MN34OP56QR78ST"
supabase secrets set MONETICO_COMPANY_CODE="companyABC"
supabase secrets set MONETICO_MODE="production"

# Vérifier
supabase secrets list
```

---

## ⚙️ ÉTAPE 3 : VÉRIFIER LE WEBHOOK (2 MIN)

### 3.1 Tester le webhook Monetico

```bash
# Test depuis votre machine
curl -X POST https://taxiassur.com/api/monetico-webhook.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "reference=TEST123&montant=100.00EUR&code-retour=payetest"
```

**Réponse attendue** :
```
version=2
OK
```

### 3.2 Vérifier dans Supabase

```sql
-- Vérifier la table des paiements
SELECT * FROM monetico_payments
WHERE reference LIKE 'TEST%'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🧪 ÉTAPE 4 : TESTER EN MODE PRODUCTION (5 MIN)

### 4.1 Cartes de test Monetico (Mode Production)

⚠️ **ATTENTION** : En mode production, utilisez UNIQUEMENT ces cartes de test fournies par Monetico :

**Carte 1 : Paiement accepté**
```
Numéro : 5017 6700 0000 0117
Date expiration : 12/26
CVV : 123
```

**Carte 2 : Paiement refusé (insuffisant)**
```
Numéro : 4000 0000 0000 0002
Date expiration : 12/26
CVV : 123
```

**Carte 3 : Paiement refusé (volée)**
```
Numéro : 4000 0000 0000 0119
Date expiration : 12/26
CVV : 123
```

### 4.2 Test complet du flux

1. Aller sur **https://taxiassur.com/espace-prospect?token=YOUR_TOKEN**
2. Accéder à l'espace prospect d'un lead
3. Voir un devis validé
4. Cliquer sur **"Payer l'acompte"** (ex: 150€)
5. Remplir le formulaire avec la **carte test acceptée**
6. Valider le paiement

**Vérifications** :
- ✅ Redirection vers Monetico
- ✅ Paiement accepté
- ✅ Retour sur https://taxiassur.com/paiement-success
- ✅ Email de confirmation envoyé
- ✅ Paiement enregistré dans la base

### 4.3 Vérifier dans la base de données

```sql
-- Voir le dernier paiement
SELECT
  id,
  lead_id,
  amount_cents / 100.0 as montant_euros,
  payment_method,
  status,
  transaction_id,
  created_at
FROM monetico_payments
ORDER BY created_at DESC
LIMIT 1;
```

**Résultat attendu** :
```
montant_euros : 150.00
status        : success
transaction_id : [ID de transaction Monetico]
```

---

## 📊 ÉTAPE 5 : VÉRIFIER LE BACK-OFFICE MONETICO (2 MIN)

### 5.1 Consulter les transactions

1. Se connecter au back-office Monetico
2. Aller dans **Transactions** → **Liste des transactions**
3. Vérifier que la transaction test apparaît

**Détails à vérifier** :
- Référence : Correspond au lead_id TaxiAssur
- Montant : Correct
- Statut : Payé
- Date : Aujourd'hui

### 5.2 Consulter les rapports

1. Aller dans **Rapports** → **Transactions du jour**
2. Vérifier le montant total
3. Vérifier le nombre de transactions

---

## 💰 ÉTAPE 6 : COMPRENDRE LE FLUX DE PAIEMENT

### Schéma complet

```
1. PROSPECT clique "Payer l'acompte"
   ↓
2. TAXIASSUR génère un lien de paiement Monetico
   ↓
3. REDIRECT vers la page de paiement Monetico
   ↓
4. PROSPECT entre ses informations de carte
   ↓
5. MONETICO valide le paiement
   ↓
6. MONETICO appelle le webhook TaxiAssur
   ↓
7. TAXIASSUR enregistre le paiement en base
   ↓
8. TAXIASSUR envoie un email de confirmation
   ↓
9. REDIRECT vers /paiement-success
```

### Détails techniques

**Génération du lien** :
```typescript
// Edge Function: create-monetico-payment
const paymentData = {
  reference: lead.id,
  montant: amount_cents / 100,
  mail: lead.email,
  url_retour_ok: "https://taxiassur.com/paiement-success",
  url_retour_err: "https://taxiassur.com/paiement-error"
};

// Calcul du MAC (signature)
const mac = calculateMAC(paymentData, MONETICO_KEY);

// Génération de l'URL Monetico
const url = `https://p.monetico-services.com/paiement.cgi?...`;
```

**Réception du webhook** :
```php
// api/monetico-webhook.php
$reference = $_POST['reference'];
$montant = $_POST['montant'];
$code_retour = $_POST['code-retour'];

// Vérifier le MAC
$mac_calculated = calculateMAC($_POST, MONETICO_KEY);
if ($mac_calculated !== $_POST['MAC']) {
  die("version=2\nKO - MAC invalide");
}

// Enregistrer le paiement
insertPayment($reference, $montant, $code_retour);

// Réponse à Monetico
echo "version=2\nOK";
```

---

## 🔒 ÉTAPE 7 : SÉCURITÉ ET CONFORMITÉ

### 7.1 PCI-DSS

✅ **TaxiAssur est conforme PCI-DSS** car :
- Aucune donnée de carte n'est stockée
- Paiement délégué à Monetico (certifié PCI-DSS Level 1)
- Utilisation de tokens sécurisés

### 7.2 Protection des données

```sql
-- Les paiements stockent UNIQUEMENT :
CREATE TABLE monetico_payments (
  id uuid PRIMARY KEY,
  lead_id uuid NOT NULL,           -- Référence au lead
  amount_cents integer NOT NULL,   -- Montant en centimes
  transaction_id text,              -- ID transaction Monetico
  status text NOT NULL,             -- success/failed/pending
  payment_method text,              -- card/sepa
  created_at timestamptz DEFAULT now()
);

-- ❌ JAMAIS de numéro de carte
-- ❌ JAMAIS de CVV
-- ❌ JAMAIS de date d'expiration
```

### 7.3 Logs et audit

```sql
-- Consulter les logs de paiement
SELECT
  mp.created_at,
  mp.amount_cents / 100.0 as montant,
  mp.status,
  cl.email,
  cl.first_name,
  cl.last_name
FROM monetico_payments mp
JOIN crm_leads cl ON cl.id = mp.lead_id
ORDER BY mp.created_at DESC
LIMIT 20;
```

---

## 📈 ÉTAPE 8 : MONITORING ET ALERTES

### 8.1 Dashboard Monetico

```sql
-- Vue d'ensemble des paiements
SELECT
  DATE(created_at) as date,
  COUNT(*) as nb_paiements,
  SUM(amount_cents) / 100.0 as total_euros,
  COUNT(*) FILTER (WHERE status = 'success') as reussis,
  COUNT(*) FILTER (WHERE status = 'failed') as echoues
FROM monetico_payments
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 8.2 Alertes automatiques

Le système envoie des alertes automatiquement :

1. **Paiement réussi** → Email au prospect + commercial
2. **Paiement échoué** → Alert au commercial
3. **Paiement en attente** → Retry automatique après 24h

---

## 🐛 TROUBLESHOOTING

### Problème 1 : "MAC invalide"

**Cause** : La clé secrète Monetico est incorrecte

**Solution** :
1. Vérifier le secret `MONETICO_KEY` dans Supabase
2. Vérifier dans le back-office Monetico que la clé n'a pas changé
3. Reconfigurer le secret si nécessaire

### Problème 2 : "TPE fermé"

**Cause** : Le TPE est en mode test ou fermé

**Solution** :
1. Se connecter au back-office Monetico
2. Vérifier l'état du TPE : **Actif**
3. Vérifier le mode : **Production**
4. Contacter le support Monetico si besoin

### Problème 3 : "Montant invalide"

**Cause** : Format du montant incorrect

**Solution** :
- Le montant doit être au format : `100.00EUR` (2 décimales)
- Ne pas envoyer de centimes : `10000` ❌
- Utiliser le bon format : `100.00EUR` ✅

### Problème 4 : "Webhook non appelé"

**Cause** : URL de retour mal configurée

**Solution** :
1. Vérifier l'URL dans le back-office Monetico
2. Tester manuellement le webhook :
   ```bash
   curl -X POST https://taxiassur.com/api/monetico-webhook.php \
     -d "reference=TEST&code-retour=payetest"
   ```
3. Vérifier les logs du serveur IONOS

### Problème 5 : "Paiement non enregistré"

**Cause** : Erreur dans le webhook ou la base

**Solution** :
```sql
-- Vérifier les logs d'erreur
SELECT * FROM monetico_payment_logs
WHERE status = 'error'
ORDER BY created_at DESC;

-- Vérifier les paiements en attente
SELECT * FROM monetico_payments
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '1 hour';
```

---

## 💳 CARTES DE TEST OFFICIELLES MONETICO

### Mode Production (Test)

**IMPORTANT** : Ces cartes sont fournies par Monetico et peuvent être utilisées en production pour tester.

| Carte | Numéro | Résultat |
|-------|--------|----------|
| Visa | 5017 6700 0000 0117 | ✅ Accepté |
| Mastercard | 5017 6700 0000 0125 | ✅ Accepté |
| Refus | 4000 0000 0000 0002 | ❌ Solde insuffisant |
| Refus | 4000 0000 0000 0119 | ❌ Carte volée |

**Date d'expiration** : N'importe quelle date future (ex: 12/26)
**CVV** : N'importe quel code 3 chiffres (ex: 123)

---

## 📞 SUPPORT MONETICO

**Besoin d'aide ?**

- **Support technique** : 08 20 00 12 34 (24/7)
- **Email** : support@monetico-services.com
- **Back-office** : https://www.monetico-paiement.fr/

**Informations à fournir** :
- Numéro TPE
- Date et heure de la transaction
- Référence de la transaction
- Description du problème

---

## ✅ CHECKLIST FINALE

- [ ] Identifiants de production récupérés
- [ ] Clé secrète notée
- [ ] URLs de retour configurées dans Monetico
- [ ] 4 secrets configurés dans Supabase
- [ ] Webhook testé et fonctionnel
- [ ] Test avec carte de test réussi
- [ ] Paiement enregistré en base
- [ ] Email de confirmation envoyé
- [ ] Transaction visible dans back-office Monetico

---

## 🎯 PROCHAINES ÉTAPES

Maintenant que Monetico est configuré :

1. ✅ Paiements comptant activés
2. → Former l'équipe commerciale
3. → Monitorer les premières transactions
4. → Optimiser le tunnel de conversion

---

**Paiements en ligne activés !** 🎉

Vos prospects peuvent maintenant payer leur acompte directement en ligne de manière sécurisée via Monetico Paiement.

---

## 📊 STATISTIQUES ATTENDUES

### Premier mois
- **Taux de conversion** : 20-30% des devis validés
- **Montant moyen** : 150-200€ (acompte)
- **Temps de paiement** : < 5 minutes

### Optimisations possibles
- Relance automatique après 24h si pas de paiement
- Réduction du montant d'acompte pour augmenter la conversion
- Paiement en plusieurs fois
- Intégration de virements bancaires (SEPA)
