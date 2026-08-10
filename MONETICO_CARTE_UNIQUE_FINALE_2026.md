# ✅ MONÉTICO - Carte de Test Unique Validée

## 🎯 Configuration finale validée

**Date :** 20 février 2026  
**Statut :** ✅ FONCTIONNEL

---

## 💳 CARTE DE TEST VALIDÉE

### ✅ Carte Unique qui fonctionne

```
Numéro : 5017670000001800
Date   : 12/26
CVV    : 123

Résultat : ✅ Paiement ACCEPTÉ
```

**Copier-coller rapide :**
```
5017670000001800
```

---

## ❌ Carte de refus non disponible

La carte **5017670000000800** (mentionnée dans la documentation) **NE FONCTIONNE PAS** avec votre configuration Monético actuelle.

### Pour tester un paiement refusé

Contactez **Ingineco** (votre prestataire) ou **Monético** :

**Ingineco :**
- Email : support@ingineco.com

**Monético :**
- Email : support.monetico@monetico.fr
- Tél : 01 70 99 91 00

**Demande :** 
```
Objet : Demande carte de test pour paiement refusé

Bonjour,

Nous avons besoin d'une carte de test pour simuler un paiement REFUSÉ.

Configuration actuelle :
- TPE : 7374133
- Société : taxiassur
- Mode : TEST
- Carte acceptée qui fonctionne : 5017670000001800
- Carte refusée qui ne fonctionne pas : 5017670000000800

Pouvez-vous nous fournir une carte de test valide pour tester les refus ?

Cordialement
```

---

## ✅ Configuration MODE TEST confirmée

**Vérification dans l'Edge Function :**

```typescript
// Mode TEST actif par défaut
const TEST_MODE = (Deno.env.get('MONETICO_MODE') || 'test') === 'test';
// ✅ TEST_MODE = true

// URL de test correcte
urlServeur: 'https://p.monetico-services.com/test/paiement.cgi'
// ✅ /test/ présent dans l'URL

// Identifiants
TPE      : 7374133
Société  : taxiassur
Clé MAC  : [REDACTED_MONETICO_MAC_KEY]
```

---

## 📋 Historique des corrections

### ❌ Cartes testées qui NE fonctionnent PAS
```
5017670000000800  (carte de refus documentée mais invalide)
4970100000000003  (carte standard Monético - incompatible)
4970100000000004  (carte standard Monético - incompatible)
4970100000000001  (CB France standard - incompatible)
5555555555554444  (MasterCard standard - incompatible)
```

### ✅ Carte validée qui FONCTIONNE
```
5017670000001800 ← Seule carte valide avec votre config
```

---

## 🚀 Fichiers mis à jour

```
✅ src/components/MoneticoTestCard.tsx
   - Carte unique validée
   - Avertissement carte refus non disponible

✅ src/components/crm/MoneticoPaymentManager.tsx
   - Carte unique affichée
   - Info pour obtenir carte de refus

✅ Build régénéré avec succès
```

---

## 📦 Déploiement

### 1. Uploader le build
```bash
Uploader /dist sur IONOS
Vider cache navigateur (Ctrl+Shift+R)
```

### 2. Tester la carte
```
Carte  : 5017670000001800
Date   : 12/26
CVV    : 123
Résultat : ✅ Paiement accepté
```

---

## 🎯 Pour vos tests

### Test paiement ACCEPTÉ ✅
```
1. CRM → Lead → Paiement comptant
2. Carte : 5017670000001800
3. Date : 12/26
4. CVV : 123
5. Valider
6. ✅ Paiement accepté
```

### Test paiement REFUSÉ ❌
```
Option 1 : Demander carte de refus à Ingineco/Monético

Option 2 : Utiliser une vraie carte avec montant trop élevé
(Attention : peut déclencher des alertes bancaires)

Option 3 : Tester en production avec petits montants
```

---

## ⚙️ Secrets Supabase (optionnel)

Si vous voulez configurer des identifiants TEST différents :

```bash
# Dans Supabase Dashboard → Edge Functions → Secrets

MONETICO_MODE=test
MONETICO_TEST_TPE=7374133
MONETICO_TEST_SOCIETE=taxiassur
MONETICO_TEST_MAC_KEY=[REDACTED_MONETICO_MAC_KEY]
```

Mais la configuration actuelle fonctionne déjà !

---

## 📊 Résumé Final

| Élément | Statut | Valeur/Action |
|---------|--------|---------------|
| Carte Succès | ✅ OK | 5017670000001800 |
| Carte Refus | ❌ Manquante | Contacter Ingineco |
| Mode TEST | ✅ Actif | test/paiement.cgi |
| Build | ✅ OK | Régénéré |
| Configuration | ✅ OK | Validée |

---

## 🎉 C'est prêt !

**Vous pouvez tester les paiements avec la carte 5017670000001800**

Pour les tests de refus, contactez Ingineco pour obtenir une carte spécifique.

---

## 📚 Sources

- [Documentation Technique Monético v3.0](https://www.monetico-services.com/fr/info/documentations/CM-CIC_paiement_documentation_technique_v3_0b.pdf)
- [Environnement de test](https://www.monetico-paiement.fr/fr/piloter-suivre/parametrage/environnement-de-test.html)
- [Documentation Monext cartes de test](https://docs.monext.fr/display/DT/Les+cartes+de+test)

---

**Version : 4.0 - FINALE**  
**Statut : ✅ VALIDÉ ET TESTÉ**  
**Carte unique : 5017670000001800**
