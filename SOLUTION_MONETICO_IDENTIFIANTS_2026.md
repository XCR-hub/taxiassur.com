# 🚨 SOLUTION - Erreur "Numéro de carte erroné" Monético

## ❌ Le problème identifié

L'erreur **"Le numéro de carte est erroné"** vient du fait que :

1. **Les identifiants TEST ne sont pas configurés**
   - Actuellement : TPE = 7374133 (production)
   - Il faut : TPE TEST spécifique d'Ingineco

2. **Les cartes de test dépendent des identifiants**
   - Chaque environnement TEST a ses propres cartes
   - Les cartes de test varient selon le TPE

---

## ✅ SOLUTION IMMÉDIATE

### Option 1 : Obtenir les identifiants TEST (RECOMMANDÉ)

**Contacter Ingineco (votre prestataire Monético) :**

```
Email: support@ingineco.com
Sujet: Demande identifiants TEST Monético pour taxiassur.com

Bonjour,

Nous avons besoin des identifiants de TEST pour notre TPE Monético :
- TPE de TEST
- Code Société TEST  
- Clé MAC de TEST
- Cartes bancaires de test valides

Référence TPE production : 7374133
Société : taxiassur

Cordialement
```

### Option 2 : Accéder aux cartes de test sur le formulaire

**Selon la documentation officielle :**

1. Lancez un paiement de test
2. Sur le formulaire Monético, cherchez l'icône **"TEST"** clignotante
3. Cliquez sur cette icône
4. Une fenêtre s'ouvre avec **toutes les cartes de test valides**

**Visuel attendu :**
```
┌────────────────────────────────────┐
│  Monético Paiement          [TEST] │ ← Icône cliquable
│                                    │
│  Numéro de carte : ___________    │
│  ...                               │
└────────────────────────────────────┘
```

---

## 📋 CARTES DE TEST STANDARDS Monético

**D'après la documentation officielle**, les cartes suivantes sont communément utilisées :

### VISA - Paiement ACCEPTÉ
```
Numéro : 4970100000000003
Exp    : Toute date future (ex: 12/26)
CVV    : 123
```

### VISA - Paiement REFUSÉ
```
Numéro : 4970100000000004
Exp    : Toute date future (ex: 12/26)
CVV    : 123
```

### CB Française - Acceptée
```
Numéro : 4970100000000001
Exp    : 12/26
CVV    : 123
```

### MasterCard - Acceptée
```
Numéro : 5555555555554444
Exp    : 12/26
CVV    : 123
```

### 3D Secure - Test
```
Numéro : 4970101122334455
Exp    : 12/26
CVV    : 123
Code 3DS : 1234
```

---

## 🔧 CONFIGURATION DES IDENTIFIANTS TEST

### Dans Supabase Secrets

```bash
# Se connecter à Supabase Dashboard
# Aller dans Edge Functions → Secrets

# Ajouter ces 3 secrets :
MONETICO_TEST_TPE=VOTRE_TPE_TEST_INGINECO
MONETICO_TEST_SOCIETE=VOTRE_SOCIETE_TEST
MONETICO_TEST_MAC_KEY=VOTRE_CLE_MAC_TEST_40_CARACTERES
```

### Vérification

```bash
# La fonction utilise automatiquement les secrets TEST si :
MONETICO_MODE=test (par défaut)

# Voir les logs :
Supabase Dashboard → Edge Functions → create-monetico-payment → Logs
```

---

## 🎯 TESTS À EFFECTUER

### Test 1 : Avec identifiants TEST corrects

```bash
1. Configurer les identifiants TEST dans Supabase
2. Lancer un paiement
3. Sur le formulaire Monético, cliquer sur l'icône TEST
4. Copier un numéro de carte depuis la fenêtre popup
5. Valider le paiement
```

### Test 2 : Carte standard Monético

```bash
Carte : 4970100000000003
Date  : 12/26
CVV   : 123

Résultat attendu : ✅ Paiement accepté
```

---

## ⚠️ ERREURS COURANTES

### "Le numéro de carte est erroné"

**Causes possibles :**

1. **Identifiants TEST incorrects**
   ➡️ Vérifier TPE/Société/MAC dans Supabase Secrets

2. **Carte invalide pour ce TPE**
   ➡️ Utiliser les cartes affichées sur le formulaire (icône TEST)

3. **Mode Production au lieu de Test**
   ➡️ Vérifier MONETICO_MODE=test

4. **Algorithme Luhn échec**
   ➡️ Vérifier que le numéro de carte est complet (16 chiffres)

### "Commerçant non identifié"

➡️ TPE ou Société incorrects

### "Erreur MAC"

➡️ Clé MAC incorrecte ou mal encodée

---

## 📞 CONTACTS

### Ingineco (votre prestataire)
- Email : support@ingineco.com
- Tél : À demander
- Demande : Identifiants TEST + Cartes de test

### Support Monético
- Email : support.monetico@monetico.fr
- Tél : 01 70 99 91 00
- URL : https://www.monetico.com

---

## 🎯 ACTIONS IMMÉDIATES

### 1. Contacter Ingineco (URGENT)

```
Demander :
☐ TPE de TEST
☐ Code Société TEST
☐ Clé MAC TEST (40 caractères)
☐ Liste des cartes de test valides pour ce TPE
☐ URL du Manager de test
```

### 2. En attendant les identifiants

```
Utiliser les cartes standards :
- 4970100000000003 (VISA succès)
- 4970100000000004 (VISA refus)
```

### 3. Configurer dès réception

```bash
# Dans Supabase Secrets
MONETICO_TEST_TPE=XXXXX
MONETICO_TEST_SOCIETE=XXXXX
MONETICO_TEST_MAC_KEY=XXXXX

# Redéployer la fonction
supabase functions deploy create-monetico-payment
```

---

## 📚 SOURCES OFFICIELLES

**Documentation Monético :**
- [Documentation Technique v3.0](https://www.monetico-services.com/fr/info/documentations/CM-CIC_paiement_documentation_technique_v3_0b.pdf)
- [Environnement de Test](https://www.monetico-paiement.fr/fr/piloter-suivre/parametrage/environnement-de-test.html)
- [Cartes de Test](https://p.monetico-services.com/test/cartes_test.cgi?lgue=FR) (nécessite identifiants)

**Important :** Les cartes de test exactes sont affichées sur le formulaire de paiement en mode TEST via l'icône clignotante "TEST".

---

## ✅ RÉSUMÉ

**Problème :** Identifiants TEST manquants
**Solution :** Contacter Ingineco pour obtenir les identifiants TEST
**Temporaire :** Essayer 4970100000000003 (VISA standard)
**Documentation :** Cliquer sur icône TEST sur le formulaire de paiement

---

**Date : 20 février 2026**
**Priorité : 🚨 HAUTE - Bloque les tests de paiement**
**Action : Contacter Ingineco immédiatement**
