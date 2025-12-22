# 📧 Réponse à Victoire ROBERT - EDICourtage

## 📋 Contexte

**Email reçu de :** Victoire ROBERT (Support EDICourtage)
**Date :** 15/10/2025, 14:25
**Ticket :** #32701

### Message de Victoire

> "Je vous remercie de ces précisions. Malheureusement, votre offre actuelle ne permet de vous interconnecter qu'avec un logiciel métier existant. Je ne peux donc pas vous fournir ce que vous demandez.
>
> Pour un développement extérieur, je vous invite à vous rapprocher de notre commercial en copie de mail pour faire évoluer votre offre."

## 🎯 Réponse Suggérée

---

**Objet :** RE: Compte API + clés sandbox + clés production - Suite échange

Bonjour Victoire,

Je vous remercie pour votre retour et ces précisions.

Je comprends que mon offre actuelle ne couvre pas l'intégration API pour un développement web externe. Je souhaite donc faire évoluer mon offre pour inclure cette fonctionnalité.

**Objectif :** Intégrer EDI Signature directement dans mon site web TaxiAssur.fr via votre API REST.

Pourriez-vous me préciser :

1. **Offre commerciale nécessaire**
   - Quel type d'abonnement/package inclut l'accès API pour développement web ?
   - Tarification associée (mensuelle/annuelle) ?
   - Coût par signature électronique ?

2. **Délai de mise en place**
   - Combien de temps pour activer cette option une fois l'offre souscrite ?
   - Procédure à suivre ?

3. **Contact commercial**
   - Je vois qu'un commercial est en copie : pouvez-vous m'indiquer son nom et contact direct pour que je puisse échanger avec lui sur cette évolution d'offre ?

4. **Documentation technique**
   - En attendant, puis-je accéder à la documentation API pour préparer l'intégration ?

**Contexte technique rappel :**
- Site : https://taxiassur.fr (React + Supabase)
- Volume estimé : 50-100 signatures/mois
- Type de documents : Contrats d'assurance taxi/VTC
- Intégration : API REST + Webhooks

Je reste disponible pour un échange téléphonique si besoin : **06 83 52 67 51**

Merci d'avance pour votre accompagnement dans cette évolution.

Cordialement,

**Tony CERDA**
TaxiAssur.fr
Excellence Coverage Risks / XCR
Tel: 01 80 85 57 86
Email: team@taxiassur.com
Mobile: 06 83 52 67 51

---

## 📊 Analyse de la Situation

### Ce que tu as compris ✅

1. **Offre actuelle insuffisante**
   - Ton abonnement EDICourtage actuel ne permet que l'interconnexion avec un logiciel métier existant
   - Pas d'accès API pour développement web custom

2. **Solution**
   - Contacter le commercial pour faire évoluer ton offre
   - Souscrire à un package incluant l'accès API

### Ce qu'il faut faire 🎯

1. **Répondre à Victoire** (email ci-dessus)
2. **Contacter le commercial** (en copie du mail)
3. **Négocier l'offre** incluant :
   - Accès API REST
   - Clés sandbox (tests)
   - Clés production
   - Documentation technique
   - Support intégration

4. **Budget à prévoir**
   - Probablement un surcoût mensuel/annuel
   - Coût par signature (à vérifier)

## 🔄 Solutions Alternatives Pendant l'Attente

### Option 1 : Yousign (concurrent)
```
https://yousign.com
- API REST complète
- Sandbox gratuit
- 14 jours d'essai gratuit
- 1€/signature environ
- Documentation excellente
```

### Option 2 : DocuSign
```
https://www.docusign.fr
- Leader mondial
- API REST robuste
- Sandbox gratuit
- Plus cher (2-3€/signature)
```

### Option 3 : Universign
```
https://www.universign.com
- Solution française
- API REST
- Certifié eIDAS
- Tarifs sur devis
```

### Option 4 : Implémenter signature temporaire
En attendant EDICourtage, tu peux :
1. Utiliser un formulaire de consentement simple
2. Enregistrer l'acceptation en DB avec horodatage
3. Générer un PDF du contrat
4. Envoyer par email pour validation
5. Migrer vers EDI Signature plus tard

## 💡 Recommandations

### Court Terme (Cette Semaine)
1. ✅ Répondre à Victoire (email ci-dessus)
2. ✅ Contacter le commercial EDICourtage
3. ✅ Demander devis pour offre API
4. ⏳ Tester Yousign en parallèle (gratuit 14j)

### Moyen Terme (2-4 Semaines)
1. Comparer :
   - **EDICourtage** (si offre acceptable)
   - **Yousign** (alternative française simple)
   - **DocuSign** (si gros volume)

2. Choisir selon :
   - Prix par signature
   - Facilité intégration
   - Support technique
   - Certification juridique

### Long Terme (Production)
1. Intégrer la solution choisie
2. Tester en sandbox
3. Passer en production
4. Automatiser avec Edge Functions Supabase

## 🔧 Code Prêt pour Intégration

Le composant `ElectronicSignature.tsx` est déjà préparé pour EDICourtage.

Il suffit de :
1. Ajouter les clés API dans `.env`
2. Configurer l'endpoint EDI
3. Tester

```typescript
// .env
VITE_EDI_API_KEY=ta_cle_sandbox
VITE_EDI_ENDPOINT=https://sandbox.edicourtage.fr/api/signature

// Plus tard en prod
VITE_EDI_API_KEY=ta_cle_production
VITE_EDI_ENDPOINT=https://api.edicourtage.fr/signature
```

## 📁 Fichiers Liés

- `src/components/ElectronicSignature.tsx` - Composant signature prêt
- `src/lib/edi-signature.ts` - Logique d'intégration EDI
- `GUIDE-INTEGRATION-EDI-SIGNATURE.md` - Guide complet intégration
- `DEMARRAGE-EDI-SIGNATURE.md` - Guide démarrage rapide

## ✅ Actions Immédiates

1. **Copie l'email de réponse** ci-dessus
2. **Envoie-le à Victoire** en répondant au ticket #32701
3. **Appelle le commercial** (si coordonnées en copie mail)
4. **Teste Yousign** en parallèle (14j gratuit) : https://yousign.com

## 🎯 Résumé Ultra-Court

**Problème :** Ton offre EDICourtage ne permet pas l'intégration API web

**Solution :** Contacter le commercial pour évoluer vers offre "API Developer"

**Action NOW :** Envoie l'email de réponse ci-dessus à Victoire + appelle le commercial

**Plan B :** Tester Yousign en parallèle (gratuit 14j, API simple, doc excellente)

---

**Besoin d'aide pour l'intégration technique ? Dis-moi quand tu as les clés API !** 🚀
