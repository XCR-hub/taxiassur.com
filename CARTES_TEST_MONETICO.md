# Cartes de Test Monético - Référence Rapide

## Cartes Bancaires de Test Officielles

### ✅ VISA - Paiement ACCEPTÉ
```
Numéro      : 5017670000001800
Exp         : 12/26
CVV         : 123
Résultat    : Paiement autorisé
```

### ❌ VISA - Paiement REFUSÉ
```
Numéro      : 5017670000000800
Exp         : 12/26
CVV         : 123
Résultat    : Paiement refusé (fonds insuffisants)
```

---

## Autres Cartes de Test

### MASTERCARD - Acceptée
```
Numéro      : 5017670000000900
Exp         : 12/26
CVV         : 123
```

### AMERICAN EXPRESS - Acceptée
```
Numéro      : 374500000000006
Exp         : 12/26
CVV         : 1234
```

### CB - Acceptée
```
Numéro      : 4970100000000001
Exp         : 12/26
CVV         : 123
```

---

## Scénarios de Test

### Test 3D Secure
```
Numéro      : 4970101122334455
Exp         : 12/26
CVV         : 123
Mot de passe: 1234
```

### Test Carte Expirée
```
Numéro      : 5017670000002800
Exp         : 01/20 (passée)
CVV         : 123
Résultat    : Carte expirée
```

### Test CVV Invalide
Utilisez n'importe quelle carte avec CVV = 000

---

## Montants de Test Spéciaux

### Montant < 10€
- Pas de 3D Secure
- Autorisation directe

### Montant > 10€ et < 100€
- 3D Secure optionnel selon config

### Montant > 100€
- 3D Secure obligatoire
- Fenêtre d'authentification

---

## Tests Recommandés

### Test 1 : Paiement Simple Réussi
```
Carte   : 5017670000001800
Montant : 50.00€
CVV     : 123
Résultat: ✅ Succès
```

### Test 2 : Paiement Refusé
```
Carte   : 5017670000000800
Montant : 50.00€
CVV     : 123
Résultat: ❌ Refusé
```

### Test 3 : Petit Montant
```
Carte   : 5017670000001800
Montant : 5.00€
CVV     : 123
Résultat: ✅ Succès rapide
```

### Test 4 : Gros Montant (3DS)
```
Carte   : 4970101122334455
Montant : 500.00€
CVV     : 123
3DS     : 1234
Résultat: ✅ Succès après 3DS
```

---

## Comportements Attendus

### Paiement Accepté
1. Redirection vers Monético
2. Formulaire CB pré-rempli (mode test)
3. Validation instantanée
4. Retour URL succès
5. Statut = `paid`

### Paiement Refusé
1. Redirection vers Monético
2. Formulaire CB
3. Message erreur "Refusé"
4. Retour URL erreur
5. Statut = `failed`

---

## Vérifications POST-Test

### Dans votre BDD (monetico_payments)
```sql
SELECT
  reference,
  amount,
  status,
  card_type,
  card_last4,
  authorization_number,
  created_at
FROM monetico_payments
WHERE status = 'paid'
ORDER BY created_at DESC
LIMIT 5;
```

### Logs à vérifier
- ✅ Transaction créée (pending)
- ✅ Webhook reçu (paid/failed)
- ✅ Email envoyé au client
- ✅ Notification CRM créée

---

## Tableau Récapitulatif

| Carte               | Numéro           | Résultat | 3DS   | Usage            |
|---------------------|------------------|----------|-------|------------------|
| VISA Succès         | 5017670000001800 | ✅ OK    | Non   | Test standard    |
| VISA Refus          | 5017670000000800 | ❌ KO    | Non   | Test erreur      |
| VISA 3DS            | 4970101122334455 | ✅ OK    | Oui   | Test sécurisé    |
| MasterCard          | 5017670000000900 | ✅ OK    | Non   | Test multi-carte |
| CB France           | 4970100000000001 | ✅ OK    | Non   | Test CB locale   |

---

## Notes Importantes

### En Mode TEST
- ✅ Aucun prélèvement réel
- ✅ Pas de frais bancaires
- ✅ Données non conservées chez Monético
- ✅ Illimité en nombre de tests
- ✅ Réinitialisation quotidienne

### Cartes RÉELLES
- ❌ NE JAMAIS utiliser en mode TEST
- ❌ Risque de vraie transaction
- ❌ Problèmes de sécurité

---

## Passage en Production

**Avant de passer en prod** :
1. ✅ Tous les tests passent
2. ✅ Webhooks fonctionnent
3. ✅ Emails envoyés OK
4. ✅ Comptabilité mise à jour
5. ✅ Identifiants PROD configurés
6. ✅ `TEST_MODE = false`

**Après passage en prod** :
1. Test avec vraie CB (petit montant)
2. Vérifier transaction dans Manager Prod
3. Vérifier comptabilité
4. Vérifier remontée bancaire

---

## Support

**Problème avec une carte de test ?**
- Vérifiez que `TEST_MODE = true`
- Vérifiez l'URL : `/test/paiement.cgi`
- Consultez les logs Supabase
- Contactez support Monético

**Carte recommandée pour démo** :
```
🎯 5017670000001800 (VISA Succès)
   Exp: 12/26 | CVV: 123
   Fonctionne à tous les coups !
```
