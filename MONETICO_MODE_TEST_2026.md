# 🔧 Configuration Monético - Mode TEST Activé

**Date :** 12 février 2026
**Statut :** ✅ Mode TEST activé et déployé (TPE en test chez Ingineco)

---

## ✅ Ce qui a été fait

1. **URL de test Monético activée** : `https://p.monetico-services.com/test/paiement.cgi`
2. **Mode par défaut changé** : `TEST` au lieu de `PRODUCTION`
3. **Edge functions déployées** :
   - ✅ `create-monetico-payment` (génération paiements)
   - ✅ `monetico-webhook` (réception retours)
4. **Identifiants actuels utilisés** : TPE 7374133 avec URL de test

---

## 🎯 Configuration Actuelle

Le système utilise vos **identifiants de production existants** (TPE 7374133, société taxiassur, clé MAC) mais les envoie vers l'**URL de test Monético**.

Cela permet de tester le système en attendant qu'Ingineco active le TPE en production.

---

## 💳 Cartes de Test Monético

Pour tester le système, utilisez ces **cartes de test officielles** :

### ✅ Paiement RÉUSSI
```
Numéro : 4970 1000 0000 0003
Date : 12/25
CVV : 123
```

### ❌ Paiement REFUSÉ
```
Numéro : 4970 1000 0000 0001
Date : 12/25
CVV : 123
```

### 🔐 Paiement 3D Secure
```
Numéro : 4970 1000 0000 0011
Date : 12/25
CVV : 123
```

---

## 🧪 Comment Tester

1. Allez dans **CRM Killer** → Ouvrez un lead
2. Onglet **"Paiement RIB"**
3. Remplissez le formulaire (montant: 50€)
4. Cliquez sur **"Créer le lien de paiement"**
5. Utilisez une carte de test ci-dessus
6. Vérifiez que le paiement est traité

Dans la console (F12), vous devriez voir :
```
Mode: 🧪 TEST
URL: https://p.monetico-services.com/test/paiement.cgi
```

---

## 📋 Comment Obtenir Vos Identifiants de TEST (Optionnel)

### Étape 1 : Connexion Monético Manager

1. Allez sur : **https://www.monetico-services.com/**
2. Connectez-vous avec vos identifiants
3. Sélectionnez votre compte commerçant

### Étape 2 : Récupérer les Identifiants de TEST

**Menu : Administration → Profil/Sécurité**

Vous devriez voir **2 environnements** :
- **TEST** (pour les tests)
- **PRODUCTION** (pour les vrais paiements)

**Récupérez pour l'environnement TEST :**

```
✅ TPE de TEST : ________________
✅ Code Société de TEST : ________________
✅ Clé MAC de TEST : ________________________________________
```

---

## 🚀 Une Fois les Identifiants Obtenus

**Donnez-moi ces 3 valeurs et je mettrai à jour le code.**

Exemple :
```
TPE TEST : 1234567
Société TEST : taxiassur_test
Clé MAC TEST : ABC123...XYZ (40 caractères)
```

---

## 📞 Si Vous N'avez Pas d'Identifiants de TEST

**Contactez le support Monético :**

- 📞 **0 825 120 120**
- ✉️ **support@monetico.fr**

**Demandez :**
- "Je veux activer un environnement de TEST pour le TPE 7374133"
- "J'ai besoin des identifiants de TEST (TPE, Société, Clé MAC)"

Ils vous fourniront des identifiants de TEST dans les 24-48h.

---

## 🎯 État Actuel du Système

| Composant | Statut |
|-----------|--------|
| URL Monético | ✅ Mode TEST activé (`/test/paiement.cgi`) |
| Edge Function create-monetico-payment | ✅ Déployée en mode TEST |
| Edge Function monetico-webhook | ✅ Déployée en mode TEST |
| Identifiants | ✅ TPE 7374133 utilisé avec URL de test |
| Base de données | ✅ Table `monetico_payments` prête |

---

## 💡 Alternative : Passer Directement en Production

Si vous préférez ne pas utiliser le mode TEST et passer directement en production :

1. Récupérez vos identifiants de **PRODUCTION** depuis Monético Manager
2. Donnez-les moi
3. Je changerai l'URL de TEST vers l'URL de PRODUCTION

**Avantage :** Un seul environnement à gérer
**Inconvénient :** Pas de possibilité de tester avant

---

## 🔄 Passer en Mode PRODUCTION

Quand Ingineco activera le TPE en production, deux options :

### Option 1 : Via Secrets Supabase (Recommandé)

1. Allez dans **Supabase Dashboard** → **Edge Functions** → **Secrets**
2. Ajoutez ou modifiez :
   ```
   MONETICO_MODE=production
   ```
3. Le système basculera automatiquement en production

### Option 2 : Je Modifie le Code

Dites-moi simplement : "Passe en mode production" et je modifierai le code pour utiliser l'URL de production par défaut.

---

## 📝 État Final

**✅ Système prêt pour les tests**

Le mode TEST est activé et vous pouvez commencer à tester les paiements avec les cartes de test Monético.

**Prochaines étapes suggérées :**

1. Tester un paiement avec une carte de test RÉUSSI
2. Tester un paiement avec une carte de test REFUSÉ
3. Vérifier que les données sont bien enregistrées dans `monetico_payments`
4. Vérifier que le webhook fonctionne correctement
5. Attendre l'activation du TPE en production par Ingineco
