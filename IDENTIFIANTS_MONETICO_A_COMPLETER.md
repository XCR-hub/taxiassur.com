# Identifiants Monético à Compléter

## 🧪 MODE TEST

### Où les trouver ?
1. Connectez-vous sur : https://www.monetico-services.com/fr/test/client/Accueil.aspx
2. Allez dans **Paramétrage** → **Obtention de la clé de sécurité**
3. Notez ces 3 informations :

---

### ⚠️ VOS IDENTIFIANTS DE TEST (à compléter)

```
TPE de test         : _____________ (7 chiffres, visible dans "Choix du TPE")
Société de test     : _____________ (visible dans "Choix du TPE")
Clé MAC de test     : ____________________________________________ (40 caractères hexa)
```

---

## 📍 Où les utiliser ?

**Fichier** : `supabase/functions/create-monetico-payment/index.ts`

**Lignes 19-21** :
```typescript
const MONETICO_CONFIG = TEST_MODE ? {
  tpe: 'VOTRE_TPE_ICI',              // ⚠️ Ex: 1234567
  societe: 'VOTRE_SOCIETE_ICI',      // ⚠️ Ex: MyCompanyTest
  macKey: 'VOTRE_CLE_MAC_ICI',       // ⚠️ 40 caractères
  version: '3.0',
  langue: 'FR',
  urlServeur: 'https://p.monetico-services.com/test/paiement.cgi',
  urlOK: 'https://taxiassur.com/espace-prospect/paiement-success',
  urlKO: 'https://taxiassur.com/espace-prospect/paiement-error',
}
```

---

## ✅ Après Modification

1. **Re-déployez la fonction** :
   ```bash
   supabase functions deploy create-monetico-payment --no-verify-jwt
   ```

2. **Testez avec une carte de test** :
   ```
   Carte : 5017670000001800
   Exp   : 12/26
   CVV   : 123
   ```

3. **Vérifiez les logs** dans Supabase Dashboard → Edge Functions

---

## 🚀 Passage en PRODUCTION (plus tard)

Quand vos tests seront OK :

1. **Modifiez ligne 14** :
   ```typescript
   const TEST_MODE = false;  // ⚠️ Passer à false
   ```

2. Les identifiants PROD sont déjà dans le code (lignes 29-31)

3. Re-déployez

---

## 📞 Besoin d'Aide ?

**Si vous n'arrivez pas à vous connecter** :
- Email : centrecom@e-i.com
- Tél : 0820 821 735

**Si vous avez oublié vos identifiants** :
- Demandez un nouveau mot de passe au support
- Ou demandez un nouvel identifiant

---

## 🎯 Résumé

**Vous DEVEZ** :
1. ✅ Vous connecter au tableau de bord TEST Monético
2. ✅ Récupérer TPE / Société / Clé MAC
3. ✅ Les mettre dans le fichier `index.ts`
4. ✅ Re-déployer la fonction
5. ✅ Tester avec carte 5017670000001800

**Le document PDF que vous m'avez donné** :
- ✅ Explique comment UTILISER le tableau de bord
- ❌ Ne contient PAS vos identifiants personnels
- ✅ Utile pour comprendre le fonctionnement

**Prochaine action** : Se connecter sur le tableau de bord TEST !
