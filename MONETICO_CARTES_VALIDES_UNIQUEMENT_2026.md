# ⚠️ ATTENTION : Seules 2 cartes de test sont valides pour Monético CIC

## ❌ Problème identifié

Vous avez testé 3 cartes qui **NE FONCTIONNENT PAS** avec Monético CIC :

```
❌ 4970100000000001 (CB France)       → ERREUR
❌ 5017670000000900 (MasterCard)      → ERREUR  
❌ 5017670000000800 (VISA Refus)      → Normale (test erreur)
```

---

## ✅ SEULES 2 cartes sont valides

### Carte 1 : Paiement ACCEPTÉ
```
Numéro : 5017670000001800
Date   : 12/26
CVV    : 123
```

### Carte 2 : Paiement REFUSÉ (pour tester les erreurs)
```
Numéro : 5017670000000800
Date   : 12/26
CVV    : 123
```

---

## 🚫 Cartes NON supportées par Monético CIC

Les cartes suivantes **ne marchent PAS** :

| Numéro | Type | Statut |
|--------|------|--------|
| 4970100000000001 | CB France | ❌ Non supportée |
| 5017670000000900 | MasterCard | ❌ Non supportée |
| 3745000000006 | Amex | ❌ Non supportée |

**Raison :** Monético CIC en mode TEST n'accepte que 2 cartes spécifiques.

---

## 🎯 Tests à faire

### ✅ Test 1 : Paiement réussi
```bash
Carte : 5017670000001800
Date  : 12/26
CVV   : 123

Résultat attendu : ✅ PAIEMENT ACCEPTÉ
```

### ✅ Test 2 : Paiement refusé
```bash
Carte : 5017670000000800
Date  : 12/26
CVV   : 123

Résultat attendu : ❌ PAIEMENT REFUSÉ
```

---

## 📝 Corrections appliquées

### Fichiers mis à jour
- ✅ `CARTES_TEST_MONETICO_CORRECTES_2026.md`
- ✅ `CARTE_TEST_SIMPLE.txt`
- ✅ `src/components/MoneticoTestCard.tsx`

### Changements
- ❌ Suppression des cartes invalides de la documentation
- ✅ Clarification : seulement 2 cartes valides
- ⚠️ Ajout d'avertissements sur les cartes non supportées

---

## 🔧 Si vous avez une interface de test

Si vous avez créé une page ou interface qui affiche 4 cartes de test, **supprimez les 2 cartes invalides** :

```tsx
// ❌ À SUPPRIMER
const invalidCards = [
  '4970100000000001', // CB France - ne marche pas
  '5017670000000900'  // MasterCard - ne marche pas
];

// ✅ À GARDER UNIQUEMENT
const validCards = [
  '5017670000001800', // Accepté
  '5017670000000800'  // Refusé
];
```

---

## 💡 Pour vérifier si une carte est valide

**Méthode simple :** Testez-la sur l'environnement Monético

1. Allez sur : https://p.monetico-services.com/test/paiement.cgi
2. Saisissez la carte
3. Si erreur "Carte invalide" → La carte n'est PAS supportée

**Cartes confirmées valides :**
- ✅ 5017670000001800
- ✅ 5017670000000800

**Toutes les autres = INVALIDES**

---

## 📞 Support Monético

Si vous avez besoin d'autres cartes de test :

1. Contactez le support Monético : https://www.monetico-paiement.fr/contact
2. Demandez la liste officielle des cartes de test CIC
3. Vérifiez votre contrat de test

**Note :** En général, seules 2 cartes sont fournies en environnement de test.

---

## ✅ Récapitulatif

**Ce qui marche :**
- ✅ 5017670000001800 (succès)
- ✅ 5017670000000800 (refus)

**Ce qui NE marche PAS :**
- ❌ 4970100000000001
- ❌ 5017670000000900
- ❌ Toute autre carte

**Action à faire :**
- Utiliser UNIQUEMENT les 2 cartes valides
- Supprimer les références aux cartes invalides
- Mettre à jour vos interfaces de test

---

**Date : 20 février 2026**
**Version : 1.0 - FINALE**
