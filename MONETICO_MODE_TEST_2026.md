# 🔧 Configuration Monético - Mode TEST Activé

**Date :** 11 février 2026
**Statut :** Mode TEST activé (URL de test configurée)

---

## ✅ Ce qui a été fait

1. **URL de test Monético activée** : `https://p.monetico-services.com/test/paiement.cgi`
2. **Edge function déployée** : `create-monetico-payment`
3. **Webhook configuré** : `monetico-webhook`

---

## ⚠️ ACTION REQUISE

**Le mode TEST utilise l'URL de test, MAIS vous devez quand même fournir VOS identifiants de TEST.**

Monético ne fournit pas d'identifiants "génériques". Chaque commerçant a ses propres identifiants de TEST.

---

## 📋 Comment Obtenir Vos Identifiants de TEST

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
| URL Monético | ✅ Mode TEST activé |
| Edge Function | ✅ Déployée |
| Webhook | ✅ Configuré |
| Identifiants | ⚠️ À mettre à jour avec vos identifiants de TEST |

---

## 💡 Alternative : Passer Directement en Production

Si vous préférez ne pas utiliser le mode TEST et passer directement en production :

1. Récupérez vos identifiants de **PRODUCTION** depuis Monético Manager
2. Donnez-les moi
3. Je changerai l'URL de TEST vers l'URL de PRODUCTION

**Avantage :** Un seul environnement à gérer
**Inconvénient :** Pas de possibilité de tester avant

---

## 📝 Prochaine Étape

**Répondez avec :**

**Option 1 :** "Voici mes identifiants de TEST : TPE = ..., Société = ..., Clé MAC = ..."

**Option 2 :** "Je vais appeler Monético pour obtenir les identifiants de TEST"

**Option 3 :** "Je préfère passer directement en PRODUCTION"
