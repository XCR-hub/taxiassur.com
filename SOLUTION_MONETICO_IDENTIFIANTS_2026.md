# 🔧 Solution Monético - Récupération des Identifiants

**Problème actuel :** "Le site de votre commerçant n'a pas été identifié par notre serveur"

**Cause :** Les identifiants Monético dans le code ne correspondent pas à ceux enregistrés chez Monético.

---

## 📋 Identifiants Actuels dans le Code

```javascript
TPE: '7374133'
Société: 'taxiassur'
Clé MAC: '106FA85BF342FD4EE95C883D82865B5CC1F63890'
```

**⚠️ Au moins UN de ces paramètres est incorrect.**

---

## ✅ SOLUTION : Récupérer les Vrais Identifiants

### Étape 1 : Connexion à Monético Manager

1. Allez sur : **https://www.monetico-services.com/**
2. Connectez-vous avec vos identifiants
3. Sélectionnez votre compte commerçant

### Étape 2 : Récupérer le TPE

**Menu : Administration > Profil**

Vous verrez :
```
Numéro TPE : XXXXXXX
```

✅ **Notez ce numéro EXACT**

### Étape 3 : Récupérer le Code Société

**Menu : Administration > Profil**

Vous verrez :
```
Code Société : xxxxxxxxx
```

✅ **Notez ce code EXACT (sensible à la casse !)**

### Étape 4 : Récupérer la Clé MAC

**Menu : Administration > Sécurité**

Vous verrez :
```
Clé pour le calcul du sceau (MAC) : XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

✅ **Copiez cette clé COMPLÈTE (40 caractères)**

### Étape 5 : Vérifier l'Environnement

**Question importante :** Voulez-vous tester en **TEST** ou utiliser la **PRODUCTION** ?

- **TEST** : Pour faire des tests sans vrais paiements
- **PRODUCTION** : Pour accepter de vrais paiements

**Vérifiez :** Le TPE que vous utilisez correspond-il à l'environnement voulu ?

---

## 📞 Une Fois les Identifiants Obtenus

**Donnez-moi les 3 informations suivantes :**

1. ✅ **TPE** : `__________`
2. ✅ **Code Société** : `__________`
3. ✅ **Clé MAC** : `________________________________________`

**Et aussi :**
- Environnement : **TEST** ou **PRODUCTION** ?

Je mettrai à jour le code immédiatement et tout fonctionnera !

---

## 🎯 Alternative : Mode TEST Immédiat

Si vous voulez tester MAINTENANT sans attendre les vrais identifiants, je peux activer le **mode TEST Monético**.

**Avantages :**
- ✅ Fonctionne immédiatement
- ✅ Permet de tester le workflow complet
- ✅ Aucun vrai paiement

**Inconvénient :**
- ⚠️ Les paiements ne sont pas réels

**Pour activer le mode TEST, dites-moi simplement "Active le mode TEST"**

---

## 📧 Contact Monético Support

Si vous ne trouvez pas ces informations :

**Support Monético :**
- 📞 Téléphone : 0 825 120 120
- ✉️ Email : support@monetico.fr
- 🌐 Site : https://www.monetico-services.com/

**Demandez :**
- Vos identifiants de TEST et PRODUCTION
- Vos clés MAC correspondantes

---

## 🚀 Prochaine Étape

**Option A :** Récupérez les identifiants réels et donnez-les moi

**Option B :** Demandez-moi d'activer le mode TEST pour tester immédiatement
