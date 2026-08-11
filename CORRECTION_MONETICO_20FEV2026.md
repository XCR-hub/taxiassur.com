# ✅ CORRECTION COMPLÈTE Monético - 20 FÉV 2026

## 🚨 Problèmes identifiés et résolus

### 1️⃣ Référence trop longue (RÉSOLU ✅)
**Problème :** Référence 36 caractères → Monético limite à 12  
**Solution :** Format `Txxxxxxxxx` (12 caractères max)  
**Fichier :** `supabase/functions/create-monetico-payment/index.ts`

### 2️⃣ React Error #300 - Boucle infinie (RÉSOLU ✅)
**Problème :** useEffect avec fonctions dans les dépendances  
**Solution :** Retirer `loadLeadInfo` et `loadDocuments` des dépendances  
**Fichier :** `src/pages/EspaceProspect.tsx`

### 3️⃣ lead_id NOT NULL empêche facturation libre (RÉSOLU ✅)
**Problème :** Impossible d'insérer paiements sans lead  
**Solution :** `ALTER COLUMN lead_id DROP NOT NULL`  
**Migration :** `fix_monetico_payments_lead_id_nullable_20fev2026.sql`

---

## 🎯 Pourquoi le webhook retournait `cdr=1` ?

Votre test du **20 février 13h00** :
```
Référence : T88772503037
Montant : 50 EUR
Code retour : payetest
```

**Le paiement n'existait PAS dans la base de données !**

### Flux CORRECT (à suivre) :
1. 🖥️ Frontend appelle `create-monetico-payment` Edge Function
2. 💾 Edge Function **CRÉE** l'entrée dans `monetico_payments`
3. 🔀 Edge Function génère le formulaire et redirige vers Monético
4. 💳 Client paie sur Monético
5. 📨 Webhook reçoit notification → **TROUVE** le paiement → répond `cdr=0`

### Flux INCORRECT (ce qui s'est passé) :
1. ❌ Test direct depuis l'interface Monético
2. ❌ Paiement créé côté Monético SANS passer par notre système
3. ❌ Webhook cherche le paiement dans notre DB → **INTROUVABLE**
4. ❌ Webhook répond `cdr=1` (erreur)

**Résultat :** Email d'erreur de Monético avec `CGI2 : NOK`

---

## ✅ CORRECTIFS APPLIQUÉS

### Migration base de données
```sql
-- Permet les paiements sans lead (facturation libre)
ALTER TABLE monetico_payments 
ALTER COLUMN lead_id DROP NOT NULL;

-- Index pour performance
CREATE INDEX idx_monetico_payments_lead_id 
ON monetico_payments(lead_id) 
WHERE lead_id IS NOT NULL;
```

### Code Edge Function (déjà correct)
```typescript
// Génère référence 12 caractères
function generateReference(): string {
  const timestamp = Date.now().toString().slice(-8); // 8 chiffres
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 chiffres
  const prefix = TEST_MODE ? 'T' : 'P'; // 1 caractère
  return `${prefix}${timestamp}${random}`; // Total = 12 caractères
}

// Insertion dans DB AVANT redirection Monético
await supabase.from('monetico_payments').insert({
  reference,
  lead_id: leadId || null, // ✅ Maintenant autorisé !
  amount: parseFloat(amount),
  status: 'pending',
  // ...
});
```

---

## 🧪 COMMENT TESTER CORRECTEMENT

### Option A : Via l'Espace Prospect (recommandé)

1. **Créer un lead test** :
```sql
INSERT INTO crm_leads (
  first_name, last_name, email, phone, 
  status, access_token
) VALUES (
  'Jean', 'Test', 'test@example.com', '0612345678',
  'nouveau_lead', encode(gen_random_bytes(32), 'hex')
) RETURNING id, access_token;
```

2. **Accéder à l'espace prospect** :
```
https://taxiassur.com/espace-prospect/{ACCESS_TOKEN}?tab=paiement
```

3. **Cliquer sur "Payer l'acompte"** → vous serez redirigé vers Monético

4. **Payer avec carte de test** :
```
Numéro : 5017 6700 0000 0000
Expiration : 12/26
CVV : 123
```

5. **Vérifier le webhook** :
```sql
SELECT reference, status, amount, created_at 
FROM monetico_payments 
ORDER BY created_at DESC LIMIT 5;
```

### Option B : Test API direct

```bash
curl -X POST 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/create-monetico-payment' \
  -H 'Authorization: Bearer VOTRE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "leadId": "LEAD_UUID_ICI",
    "amount": 50,
    "description": "Test paiement acompte"
  }'
```

### Option C : Facturation libre (sans lead)

```bash
curl -X POST 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/create-monetico-payment' \
  -H 'Authorization: Bearer VOTRE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 100,
    "customerEmail": "client@example.com",
    "customerFirstName": "Marie",
    "customerLastName": "Dupont",
    "customerPhone": "0687654321",
    "description": "Facture libre"
  }'
```

---

## 🔍 VÉRIFICATIONS POST-TEST

### 1. Vérifier l'insertion dans la DB
```sql
SELECT * FROM monetico_payments 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

✅ Doit montrer le paiement avec `status = 'pending'`

### 2. Vérifier le webhook
```sql
SELECT reference, status, transaction_id, payment_date
FROM monetico_payments 
WHERE status = 'paid'
ORDER BY payment_date DESC LIMIT 5;
```

✅ Après paiement, le `status` doit passer à `'paid'`

### 3. Vérifier la notification CRM
```sql
SELECT title, message, event_type, created_at
FROM crm_event_notifications
WHERE event_type = 'payment_received'
ORDER BY created_at DESC LIMIT 5;
```

✅ Doit créer une notification "Paiement reçu 💰"

---

## 📊 CARTES DE TEST MONÉTICO

### ✅ Cartes qui fonctionnent (BIN autorisés)

| Numéro | Type | Expiration | CVV | Résultat |
|--------|------|------------|-----|----------|
| **5017 6700 0000 0000** | Mastercard | 12/26 | 123 | ✅ Accepté |
| 4970 1000 0000 0003 | Visa | 12/26 | 123 | ✅ Accepté |
| 3741 111111 11111 | Amex | 12/26 | 1234 | ✅ Accepté |

### ❌ Cartes à NE PAS utiliser

Les cartes des forums (4111 1111..., 5555 5555...) sont **REFUSÉES** par Monético test.

---

## 🚀 DÉPLOIEMENT

### 1. Build et déploiement
```bash
npm run build
npm run deploy
```

### 2. Déployer les Edge Functions
```bash
# Webhook Monético
supabase functions deploy monetico-webhook

# Création paiement
supabase functions deploy create-monetico-payment
```

### 3. Vérifier les secrets Supabase
```bash
supabase secrets list
```

Secrets requis :
- `MONETICO_TEST_TPE` = `7374133`
- `MONETICO_TEST_SOCIETE` = `taxiassur`
- `MONETICO_TEST_MAC_KEY` = `[REDACTED_MONETICO_MAC_KEY]`
- `MONETICO_MODE` = `test`

---

## ✅ CHECKLIST FINALE

- [x] Migration `lead_id` nullable appliquée
- [x] Référence réduite à 12 caractères
- [x] React Error #300 corrigé
- [x] Fonction `process_monetico_payment` existe
- [x] Webhook répond `text/plain` avec `\n`
- [ ] **Test complet flux paiement**
- [ ] Vérifier email confirmation client
- [ ] Vérifier notification commercial
- [ ] Déployer en production

---

## 📞 CONTACT INGINECO

Si problème persiste :
- **Support :** centrecom@e-i.com
- **Hotline :** 0 820 821 735
- **Documentation :** Monético_Paiement_documentation_tableau_de_bord_v1.0.pdf

---

**Date :** 20 février 2026 13:45  
**Statut :** ✅ Corrections appliquées  
**Prochaine étape :** Tester le flux complet (Option A recommandée)
