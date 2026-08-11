# Guide Configuration Monético MODE TEST 2026

## Problème Actuel

L'erreur **"Le site de votre commerçant n'a pas été identifié"** signifie que Monético rejette la transaction car :

1. ❌ Les identifiants utilisés ne sont pas valides
2. ❌ Le TPE n'est pas reconnu par le serveur
3. ❌ La clé MAC ne correspond pas

---

## Solution : Activer le Mode TEST

### Étape 1 : Obtenir vos identifiants de TEST

Vous devez vous connecter à votre **Monético Manager TEST** :

**URL de connexion** :
```
https://www.monetico-services.com/fr/identification/authentification.html
```

**Dans le Manager Test** :
1. Allez dans **Configuration**
2. Section **Paramètres de test**
3. Notez ces 3 informations :

```
TPE de test         : XXXXXXX (7 chiffres)
Société de test     : XXXXXXXX
Clé MAC de test     : XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (40 caractères hexa)
```

---

### Étape 2 : Configurer la Edge Function

**Fichier à modifier** :
```
supabase/functions/create-monetico-payment/index.ts
```

**Lignes 14-26** - Remplacez par VOS identifiants :

```typescript
const TEST_MODE = true; // ✅ Laisser à true pour les tests

const MONETICO_CONFIG = TEST_MODE ? {
  // 🧪 REMPLACEZ PAR VOS VRAIS IDENTIFIANTS DE TEST
  tpe: 'VOTRE_TPE_TEST',              // ⚠️ Ex: 1234567
  societe: 'VOTRE_SOCIETE_TEST',      // ⚠️ Ex: MyCompanyTest
  macKey: 'VOTRE_CLE_MAC_TEST',       // ⚠️ 40 caractères
  version: '3.0',
  langue: 'FR',
  urlServeur: 'https://p.monetico-services.com/test/paiement.cgi',  // ✅ GARDER /test/
  urlOK: 'https://taxiassur.com/espace-prospect/paiement-success',
  urlKO: 'https://taxiassur.com/espace-prospect/paiement-error',
}
```

---

### Étape 3 : Re-déployer la fonction

**Depuis Supabase Dashboard** :
1. Allez dans **Edge Functions**
2. Sélectionnez `create-monetico-payment`
3. Cliquez **Deploy**

**OU en ligne de commande** :
```bash
supabase functions deploy create-monetico-payment --no-verify-jwt
```

---

### Étape 4 : Tester le paiement

**Cartes de test Monético** :

#### ✅ Paiement RÉUSSI
```
Numéro : 5017670000001800
Date expiration : 12/26
CVV : 123
```

#### ❌ Paiement REFUSÉ
```
Numéro : 5017670000000800
Date expiration : 12/26
CVV : 123
```

---

## Vérifications Importantes

### ✅ Checklist avant test

- [ ] TPE de test saisi (7 chiffres)
- [ ] Société de test saisie (sans espaces)
- [ ] Clé MAC de test saisie (40 caractères hexa)
- [ ] `TEST_MODE = true`
- [ ] URL contient `/test/paiement.cgi`
- [ ] Fonction re-déployée
- [ ] Carte de test utilisée

---

## Debugging : Vérifier les logs

**Dans Supabase Dashboard** :
1. Edge Functions → `create-monetico-payment`
2. Onglet **Logs**
3. Regardez les lignes :
   ```
   Mode: 🧪 TEST
   URL: https://p.monetico-services.com/test/paiement.cgi
   TPE: VOTRE_TPE_TEST
   MAC Data: ...
   ```

**Ce que vous devriez voir** :
```json
{
  "success": true,
  "reference": "TEST17392848390001234",
  "mode": "TEST",
  "actionUrl": "https://p.monetico-services.com/test/paiement.cgi"
}
```

---

## Passage en PRODUCTION

**Quand vos tests fonctionnent** :

### Étape 1 : Obtenir identifiants PRODUCTION
Dans **Monético Manager PRODUCTION** :
- TPE de production
- Société de production
- Clé MAC de production

### Étape 2 : Modifier le code
```typescript
const TEST_MODE = false; // ⚠️ PASSER À false
```

Les identifiants production sont déjà dans le code (lignes 28-36) :
```typescript
{
  tpe: '7374133',
  societe: 'taxiassur',
  macKey: '[REDACTED_MONETICO_MAC_KEY]',
  version: '3.0',
  langue: 'FR',
  urlServeur: 'https://p.monetico-services.com/paiement.cgi',  // SANS /test/
}
```

### Étape 3 : Re-déployer
```bash
supabase functions deploy create-monetico-payment --no-verify-jwt
```

---

## Erreurs Courantes

### "Commerçant non identifié"
➡️ TPE ou Société incorrects
➡️ Vérifiez dans Monético Manager

### "Erreur de sceau (MAC)"
➡️ Clé MAC incorrecte
➡️ Vérifiez les 40 caractères hexa

### "Erreur 404"
➡️ URL incorrecte
➡️ En TEST : doit contenir `/test/`
➡️ En PROD : sans `/test/`

### "Transaction refusée"
➡️ Normal avec carte de test refus
➡️ Testez avec carte succès : 5017670000001800

---

## Support Monético

**Assistance technique** :
- Email : support.monetico@monetico.fr
- Tél : 01 70 99 91 00
- Doc : https://www.monetico-paiement.fr/fr/info/documentations/

**Informations à fournir** :
- Votre TPE (test ou production)
- Message d'erreur exact
- Logs de la transaction
- Date/heure de la tentative

---

## Résumé Rapide

**3 choses à faire MAINTENANT** :

1. **Connectez-vous à Monético Manager TEST**
   - Récupérez TPE / Société / Clé MAC de test

2. **Modifiez le fichier** `create-monetico-payment/index.ts`
   - Lignes 19-21 avec vos identifiants test
   - Laissez `TEST_MODE = true`

3. **Re-déployez et testez**
   - Deploy la fonction
   - Testez avec carte : 5017670000001800

---

## Prochaines Étapes

Une fois les tests OK :
- ✅ Passer en PRODUCTION (`TEST_MODE = false`)
- ✅ Vérifier les webhooks de retour
- ✅ Tester avec vraie CB
- ✅ Activer la comptabilité automatique

---

**La fonction est déjà déployée en MODE TEST**, il suffit maintenant de remplacer les identifiants de test fictifs par vos vrais identifiants de test Monético !
