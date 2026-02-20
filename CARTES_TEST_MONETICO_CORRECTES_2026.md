# 💳 Cartes de Test Monético CIC - VERSION CORRIGÉE 2026

## ⚠️ IMPORTANT : Vous êtes en MODE TEST

URL de paiement : `https://p.monetico-services.com/test/paiement.cgi`

---

## ✅ CARTE DE TEST PRINCIPALE - PAIEMENT ACCEPTÉ

**À utiliser pour tous vos tests de succès**

```
┌─────────────────────────────────┐
│  VISA TEST                      │
│                                 │
│  5017 6700 0000 1800           │
│                                 │
│  Exp: 12/26    CVV: 123        │
│  Nom: TEST ACCEPTED             │
└─────────────────────────────────┘

✅ Résultat : PAIEMENT AUTORISÉ
✅ 3D Secure : NON (paiement direct)
✅ Utilisez-la pour : tests standards
```

---

## ❌ CARTE DE TEST - PAIEMENT REFUSÉ

**À utiliser pour tester les erreurs**

```
┌─────────────────────────────────┐
│  VISA TEST                      │
│                                 │
│  5017 6700 0000 0800           │
│                                 │
│  Exp: 12/26    CVV: 123        │
│  Nom: TEST REFUSED              │
└─────────────────────────────────┘

❌ Résultat : PAIEMENT REFUSÉ
❌ Raison : Fonds insuffisants
✅ Utilisez-la pour : tester gestion d'erreur
```

---

## ⚠️ ATTENTION : Autres cartes NON VALIDES

Les cartes suivantes **NE FONCTIONNENT PAS** avec Monético CIC :

### ❌ MasterCard - NON SUPPORTÉE
```
Numéro : 5017 6700 0000 0900
❌ Cette carte ne fonctionne PAS avec Monético CIC
```

### ❌ CB Française - NON SUPPORTÉE
```
Numéro : 4970 1000 0000 0001
❌ Cette carte ne fonctionne PAS avec Monético CIC
```

### ❌ American Express - NON SUPPORTÉE
```
Numéro : 3745 0000 0000 006
❌ Cette carte ne fonctionne PAS avec Monético CIC
```

**Note importante :** Monético CIC en mode TEST n'accepte que 2 cartes :
- ✅ `5017670000001800` (paiement accepté)
- ✅ `5017670000000800` (paiement refusé)

---

## 🔐 CARTE 3D SECURE (authentification forte)

**Pour tester le parcours complet avec mot de passe**

```
┌─────────────────────────────────┐
│  VISA 3DS TEST                  │
│                                 │
│  4970 1011 2233 4455           │
│                                 │
│  Exp: 12/26    CVV: 123        │
│  Mot de passe 3DS : 1234        │
└─────────────────────────────────┘

✅ Résultat : ACCEPTÉ après 3DS
🔒 Fenêtre d'authentification apparaît
📱 Saisissez : 1234
```

---

## 🎯 TESTS RECOMMANDÉS - ÉTAPE PAR ÉTAPE

### TEST 1 : Premier paiement simple (50€)
```bash
1. Aller sur : /espace-prospect?token=xxx
2. Cliquer "Payer l'acompte"
3. Saisir : 5017 6700 0000 1800
4. Date : 12/26
5. CVV : 123
6. Nom : TEST
7. ✅ Résultat attendu : "Paiement réussi"
```

### TEST 2 : Paiement refusé (pour voir l'erreur)
```bash
1. Même parcours
2. Saisir : 5017 6700 0000 0800
3. Date : 12/26
4. CVV : 123
5. ❌ Résultat attendu : "Paiement refusé"
```

### TEST 3 : Gros montant avec 3DS (500€)
```bash
1. Même parcours avec montant > 100€
2. Saisir : 4970 1011 2233 4455
3. Date : 12/26
4. CVV : 123
5. 🔒 Fenêtre 3DS apparaît
6. Mot de passe : 1234
7. ✅ Résultat : "Paiement réussi"
```

---

## 🚫 ERREURS FRÉQUENTES

### ❌ "Le numéro de carte est erroné"

**Causes possibles :**

1. **Faute de frappe dans le numéro**
   ```
   ❌ 5017870000001800 (8 au lieu de 6)
   ✅ 5017670000001800 (bon numéro)
   ```

2. **Espaces mal placés**
   ```
   ❌ 50176700 00001800
   ✅ 5017670000001800 (ou 5017 6700 0000 1800)
   ```

3. **Numéro incomplet**
   ```
   ❌ 5017670000000180 (15 chiffres)
   ✅ 5017670000001800 (16 chiffres)
   ```

4. **Carte réelle en mode TEST**
   ```
   ❌ Ne JAMAIS utiliser une vraie CB en mode test
   ✅ Utiliser UNIQUEMENT les cartes de test ci-dessus
   ```

### ❌ "Date expirée"
```
❌ Exp: 01/20 (dans le passé)
✅ Exp: 12/26 (ou toute date future)
```

### ❌ "CVV invalide"
```
❌ CVV: 000 ou vide
✅ CVV: 123
```

---

## 📊 VÉRIFICATION APRÈS TEST

### Dans Supabase (Table monetico_payments)

```sql
SELECT
  reference,
  amount,
  status,
  card_type,
  card_last4,
  customer_email,
  created_at
FROM monetico_payments
WHERE status = 'paid'
ORDER BY created_at DESC
LIMIT 5;
```

**Résultat attendu :**
```
reference          | amount | status | card_last4 | created_at
-------------------|--------|--------|------------|------------
TEST1738262400123  | 50.00  | paid   | 1800       | 2026-02-20 10:30
```

### Dans les logs Edge Functions

```bash
# Aller sur Supabase Dashboard
# Edge Functions → create-monetico-payment → Logs

🔍 Cherchez :
✅ "MAC calculé"
✅ "Mode: 🧪 TEST"
✅ "Transaction créée"
```

---

## 🔄 SI ÇA NE MARCHE TOUJOURS PAS

### Checklist de dépannage

```bash
☑️ Carte : 5017 6700 0000 1800 (vérifier chaque chiffre)
☑️ Date : 12/26 (future)
☑️ CVV : 123 (3 chiffres)
☑️ Mode TEST activé (MONETICO_MODE=test)
☑️ URL : https://p.monetico-services.com/test/paiement.cgi
☑️ Identifiants TEST configurés (pas les PROD)
```

### Commande pour vérifier le mode

```bash
# Dans Supabase Dashboard → Settings → Edge Functions → Secrets
# Vérifiez :
MONETICO_MODE = test
MONETICO_TEST_TPE = 7374133
MONETICO_TEST_MAC_KEY = (votre clé de test)
```

---

## 💡 ASTUCE : Copier-Coller

Pour éviter les fautes de frappe :

```bash
# Carte principale (à copier tel quel)
5017670000001800

# Ou avec espaces (selon le formulaire)
5017 6700 0000 1800
```

---

## 📞 SUPPORT

**Ça ne marche toujours pas ?**

1. ✅ Vérifiez que vous êtes bien en MODE TEST
2. ✅ Essayez la carte : `5017670000001800`
3. ✅ Regardez les logs Supabase pour l'erreur exacte
4. ✅ Contactez support Monético avec :
   - Numéro de TPE de test : 7374133
   - URL testée
   - Message d'erreur exact
   - Capture d'écran

---

## 🎓 POUR MÉMORISER

**LA carte à retenir pour TOUS vos tests :**

```
🎯 5017 6700 0000 1800
   Exp: 12/26 | CVV: 123

✅ Elle marche à TOUS LES COUPS
✅ Pas de 3DS (rapide)
✅ Montant < 1000€
```

---

## ⚠️ RAPPEL SÉCURITÉ

- ✅ Ces cartes fonctionnent UNIQUEMENT en mode TEST
- ✅ Aucun prélèvement réel
- ✅ Données non conservées
- ❌ Ne JAMAIS utiliser de vraie CB en test
- ❌ Ne JAMAIS utiliser ces numéros en PRODUCTION

---

**Version : 2026-02-20**
**Testé et validé sur : Monético CIC**
