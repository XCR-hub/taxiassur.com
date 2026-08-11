# 🧪 Test Rapide Monético - Checklist 5 Minutes

## 📋 Avant de tester

### ✅ Étape 1 : Vérifier le mode TEST

```bash
# Dans Supabase Dashboard
# Settings → Edge Functions → Secrets

# Vérifiez que ces secrets existent :
MONETICO_MODE = test
MONETICO_TEST_TPE = 7374133
MONETICO_TEST_SOCIETE = taxiassur
MONETICO_TEST_MAC_KEY = (votre clé de test)
```

### ✅ Étape 2 : Copier la carte de test

```
NUMÉRO : 5017670000001800
DATE   : 12/26
CVV    : 123
```

---

## 🚀 Procédure de test

### TEST 1 : Paiement de 50€ (devrait RÉUSSIR)

1. **Aller sur votre espace prospect**
   ```
   https://taxiassur.com/espace-prospect?token=VOTRE_TOKEN
   ```

2. **Cliquer sur "Payer l'acompte"**

3. **Sur la page Monético, saisir :**
   ```
   Numéro de carte : 5017670000001800
   Date expiration : 12/26
   CVV             : 123
   Nom titulaire   : TEST
   ```

4. **Cliquer sur "Valider"**

5. **Résultat attendu :**
   - ✅ Redirection vers page de succès
   - ✅ Message "Paiement réussi"
   - ✅ Statut dans CRM = "paid"

---

### TEST 2 : Paiement refusé (pour tester les erreurs)

**Même procédure mais avec la carte refus :**
```
Numéro : 5017670000000800
Date   : 12/26
CVV    : 123
```

**Résultat attendu :**
- ❌ Message "Paiement refusé"
- ❌ Retour sur page d'erreur
- ❌ Statut dans CRM = "failed"

---

## 🔍 Vérification après test

### Dans Supabase

```sql
-- Aller sur : SQL Editor

-- Voir les dernières transactions
SELECT
  reference,
  amount,
  status,
  customer_email,
  card_last4,
  created_at
FROM monetico_payments
ORDER BY created_at DESC
LIMIT 5;
```

**Résultat attendu pour TEST 1 :**
```
reference          | amount | status | card_last4
-------------------|--------|--------|------------
TEST1738262789123  | 50.00  | paid   | 1800
```

### Dans les logs

```
Supabase Dashboard
→ Edge Functions
→ create-monetico-payment
→ Logs (dernières 24h)

Cherchez :
✅ "Mode: 🧪 TEST"
✅ "MAC calculé: xxxxx"
✅ "URL: https://p.monetico-services.com/test/paiement.cgi"
```

---

## ❌ Si ça ne marche PAS

### Erreur : "Le numéro de carte est erroné"

**Causes :**
1. Faute de frappe dans le numéro
2. Vous n'êtes pas en mode TEST
3. Les identifiants TEST ne sont pas configurés

**Solution :**
```bash
# 1. Vérifier la carte (copier-coller)
5017670000001800

# 2. Vérifier le mode dans Supabase Secrets
MONETICO_MODE=test

# 3. Regarder les logs pour voir l'URL utilisée
# Doit être : https://p.monetico-services.com/test/paiement.cgi
```

### Erreur : "MAC invalide" ou "Authentification échouée"

**Cause :** Clé MAC incorrecte

**Solution :**
```bash
# Vérifier dans Supabase Secrets
MONETICO_TEST_MAC_KEY = (demander à Ingineco)

# La clé doit être en HEXADÉCIMAL (40 caractères)
# Exemple : [REDACTED_MONETICO_MAC_KEY]
```

### Erreur : "TPE inconnu"

**Cause :** Numéro de TPE incorrect

**Solution :**
```bash
# Vérifier dans Supabase Secrets
MONETICO_TEST_TPE = 7374133

# Si vous avez un autre TPE de test, utilisez celui-ci
```

---

## 📊 Tableau de diagnostic rapide

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| "Carte erronée" | Faute de frappe | Copier-coller `5017670000001800` |
| "MAC invalide" | Mauvaise clé | Vérifier `MONETICO_TEST_MAC_KEY` |
| "TPE inconnu" | Mauvais TPE | Vérifier `MONETICO_TEST_TPE` |
| Redirection vers prod | Mode prod activé | Changer `MONETICO_MODE=test` |
| Rien ne se passe | Erreur JS | Ouvrir Console navigateur (F12) |

---

## ✅ Checklist finale

Avant de dire "ça marche" :

```
☑️ J'ai testé avec 5017670000001800
☑️ Le paiement a été accepté
☑️ Je vois la transaction dans monetico_payments
☑️ Le statut est "paid"
☑️ J'ai testé une carte refusée (0800)
☑️ L'erreur est bien gérée
☑️ Les logs sont propres
```

---

## 🎯 Test ultra-rapide (30 secondes)

```bash
# 1. Ouvrir
https://taxiassur.com/espace-prospect?token=XXX

# 2. Cliquer "Payer acompte"

# 3. Saisir
5017670000001800 | 12/26 | 123

# 4. Valider

# 5. Voir "Paiement réussi" ✅
```

---

## 📞 Support

**Toujours un problème ?**

1. ✅ Ouvrez la console navigateur (F12)
2. ✅ Faites le test
3. ✅ Copiez les erreurs rouges
4. ✅ Regardez les logs Supabase
5. ✅ Envoyez-moi les infos

**Contacts :**
- Support Monético : https://www.monetico-paiement.fr/fr/contact.html
- Dashboard Monético : https://www.monetico-paiement.fr/connexion/

---

**Version : 2026-02-20**
**Durée estimée : 5 minutes**
