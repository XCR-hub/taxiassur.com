# 🔍 Analyse du Système de Paiement Comptant CIC - TaxiAssur.com

**Date**: 14 janvier 2026
**Status**: ⚠️ Partiellement implémenté - Nécessite complément

---

## ✅ Ce qui EXISTE déjà

### 1. Tables de base de données
- ✅ `lead_payments` : Table pour enregistrer les paiements
- ✅ `lead_signatures` : Table pour gérer les signatures électroniques
- ✅ `lead_contracts` : Table pour gérer les contrats
- ✅ `available_payment_types` : Catalogue des modes de paiement

### 2. Fonctions Supabase
- ✅ `create_signature_request()` : Créer une demande de signature
- ✅ `record_signature()` : Enregistrer une signature électronique
- ✅ `record_payment_complete()` : Enregistrer un paiement complet

### 3. Composants Frontend
- ✅ `ElectronicSignature` : Composant de signature électronique
- ✅ `PaymentGateway` : Classe générique pour gérer les paiements
- ✅ Composants CRM complets

### 4. Flux actuel
```
Prospect → Demande devis → Upload docs → Validation → Devis générés
→ Acceptation devis → RIB/Dates → Contrat créé → Signature → Paiement → Attestation
```

---

## ❌ Ce qui MANQUE selon le cahier des charges

### Section 7 - Signature et finalisation

**Cahier des charges** :
> "Il paie le comptant si besoin (comptant à régler par le client : montant a régler sécurisé pour lancer son contrat si besoin) il faut que le commercial coche : **Le client doit régler un comptant** : si coché alors lien vers le paiement (le commercial doit entrer le montant du comptant à régler par le client) et l'envoi vers l'**api bancaire du CIC**. une fois le paiement validé : Il signe électroniquement le contrat."

### 🔴 Fonctionnalités manquantes :

#### 1. Base de données
- ❌ Colonne `requires_down_payment` (boolean) dans `lead_contracts`
- ❌ Colonne `down_payment_amount` (decimal) dans `lead_contracts`
- ❌ Colonne `down_payment_status` (enum) dans `lead_contracts`
- ❌ Colonne `down_payment_transaction_id` (text) dans `lead_contracts`
- ❌ Colonne `down_payment_paid_at` (timestamptz) dans `lead_contracts`
- ❌ Colonne `down_payment_link` (text) dans `lead_contracts`

#### 2. Interface CRM Commercial
- ❌ **Case à cocher** "Le client doit régler un comptant"
- ❌ **Champ de saisie** pour le montant du comptant (en euros)
- ❌ **Génération automatique** du lien de paiement CIC
- ❌ **Affichage du statut** du paiement comptant (en attente, payé, échoué)
- ❌ **Bouton "Générer le contrat"** visible seulement si :
  - Comptant non requis OU
  - Comptant requis ET payé

#### 3. Intégration API CIC
- ❌ **Configuration API CIC** (clés, endpoints, environnement test/prod)
- ❌ **Edge Function** `create-cic-payment-link` pour générer les liens de paiement
- ❌ **Edge Function** `cic-webhook-handler` pour recevoir les notifications de paiement
- ❌ **Vérification de signature** des webhooks CIC
- ❌ **Gestion des échecs** de paiement
- ❌ **Gestion des remboursements** si nécessaire

#### 4. Interface Prospect (Espace Sécurisé)
- ❌ **Page de paiement dédiée** avec :
  - Montant à payer affiché clairement
  - Informations sur le contrat
  - Redirection sécurisée vers CIC
  - Page de retour après paiement (succès/échec)
- ❌ **Notifications multicanales** lors du paiement :
  - Email de confirmation de paiement
  - SMS de confirmation
  - WhatsApp (optionnel)
  - Notification push

#### 5. Logique de flux conditionnelle
- ❌ **Blocage de la signature** tant que le comptant n'est pas payé (si requis)
- ❌ **Message d'information** clair au prospect expliquant qu'il doit payer avant de signer
- ❌ **Relances automatiques** si le comptant n'est pas payé après X jours
- ❌ **Expiration du lien de paiement** après X jours (ex: 7 jours)

#### 6. Notifications et Suivi
- ❌ **Templates d'emails** spécifiques comptant :
  - "Votre lien de paiement est prêt"
  - "Rappel : paiement en attente"
  - "Paiement confirmé ! Vous pouvez maintenant signer"
- ❌ **Dashboard commercial** avec indicateur "Comptant en attente"
- ❌ **Statistiques** sur les taux de paiement des comptants

---

## 🎯 Flux attendu (à implémenter)

```
┌────────────────────────────────────────────────────────────────┐
│                    FLUX AVEC COMPTANT CIC                       │
└────────────────────────────────────────────────────────────────┘

1. Prospect accepte un devis
   └─> Saisit RIB + dates d'effet et de prélèvement

2. Commercial crée le contrat dans l'extranet assureur
   └─> Récupère le PDF du contrat
   └─> Upload le contrat dans TaxiAssur

3. Commercial coche "Comptant requis" ✅
   ├─> Saisit le montant (ex: 450€)
   ├─> Clique sur "Générer le lien de paiement CIC"
   └─> Système génère un lien unique sécurisé

4. Prospect reçoit notification multicanale
   ├─> Email : "Votre contrat est prêt - Paiement requis"
   ├─> SMS : "TaxiAssur : Payez votre comptant de 450€ [lien]"
   └─> WhatsApp : Message personnalisé avec lien

5. Prospect clique sur le lien de paiement
   ├─> Affichage : Montant, détails contrat
   ├─> Redirection vers plateforme CIC sécurisée
   └─> Paiement par CB (3D Secure)

6. CIC envoie webhook à TaxiAssur
   ├─> Vérification signature webhook
   ├─> Mise à jour BDD : down_payment_status = 'paid'
   └─> Notification prospect : "Paiement confirmé !"

7. Prospect peut MAINTENANT signer le contrat
   ├─> Accès à la page de signature débloqué
   └─> Signature électronique sur canvas

8. Une fois signé
   ├─> Commercial transmet contrat à l'assureur
   ├─> Récupère les attestations
   └─> Upload dans l'espace client

9. Client informé immédiatement
   └─> Attestation disponible en téléchargement
```

---

## 🛠️ Plan d'implémentation

### Phase 1 : Base de données (30 min)
1. Créer migration `add_down_payment_to_contracts.sql`
2. Ajouter colonnes à `lead_contracts`
3. Créer enum `down_payment_status`
4. Ajouter indexes sur colonnes de paiement

### Phase 2 : Configuration CIC (1h)
1. Créer fichier `.env.example` avec clés CIC
2. Documenter l'obtention des clés API CIC
3. Créer fonction helper `cic-api-client.ts`
4. Gérer environnement test/production

### Phase 3 : Edge Functions (2h)
1. `create-cic-payment-link` : Générer lien de paiement
2. `cic-webhook-handler` : Recevoir notifications de paiement
3. `verify-cic-signature` : Valider webhooks
4. Tests unitaires

### Phase 4 : Interface CRM (2h)
1. Modifier `LeadQuotesContracts.tsx`
2. Ajouter section "Comptant à régler"
3. Case à cocher + champ montant
4. Bouton "Générer lien paiement"
5. Affichage statut paiement en temps réel

### Phase 5 : Interface Prospect (2h)
1. Créer composant `DownPaymentPage.tsx`
2. Page de paiement avec récapitulatif
3. Redirection vers CIC
4. Pages retour (succès/échec)
5. Bloquer signature si comptant non payé

### Phase 6 : Notifications (1h)
1. Templates d'emails comptant
2. SMS automatiques
3. WhatsApp (optionnel)
4. Push notifications

### Phase 7 : Tests & Documentation (1h)
1. Tests E2E du flux complet
2. Documentation technique
3. Guide utilisateur commercial
4. Guide utilisateur prospect

**Total estimé : 9-10 heures de développement**

---

## 📊 Priorité des développements

### 🔴 Priorité HAUTE (MVP)
1. Migration BDD (colonnes comptant)
2. Interface CRM : case à cocher + montant
3. Edge Function génération lien CIC
4. Edge Function webhook CIC
5. Page paiement prospect
6. Blocage signature si non payé

### 🟠 Priorité MOYENNE (Nice to have)
7. Dashboard statistiques comptant
8. Relances automatiques paiement
9. Expiration lien paiement
10. Templates emails avancés

### 🟢 Priorité BASSE (Future)
11. Gestion remboursements
12. Multi-devises (EUR, CHF, etc.)
13. Paiement en plusieurs fois
14. Export comptable automatique

---

## 🔐 Sécurité à implémenter

1. **Signature des webhooks CIC** : Vérifier que les notifications viennent bien de CIC
2. **Validation montant** : Vérifier que le montant payé correspond au montant requis
3. **Timeout des liens** : Expirer les liens après 7 jours
4. **Logs d'audit** : Tracer tous les paiements (tentatives, succès, échecs)
5. **HTTPS obligatoire** : Toutes les transactions via SSL/TLS
6. **PCI-DSS** : Ne JAMAIS stocker de données CB (délégué à CIC)
7. **RGPD** : Consentement pour le traitement des paiements

---

## 📝 Variables d'environnement à ajouter

```env
# CIC Payment Gateway
CIC_API_KEY=xxx
CIC_API_SECRET=xxx
CIC_MERCHANT_ID=xxx
CIC_ENVIRONMENT=test|production
CIC_WEBHOOK_SECRET=xxx
CIC_RETURN_URL=https://taxiassur.com/payment/callback
CIC_CANCEL_URL=https://taxiassur.com/payment/cancel
```

---

## 🚦 Critères d'acceptation

### ✅ Le système est considéré comme complet quand :

1. ✅ Commercial peut cocher "Comptant requis"
2. ✅ Commercial peut saisir un montant en euros
3. ✅ Système génère un lien de paiement CIC unique
4. ✅ Prospect reçoit le lien par email/SMS/WhatsApp
5. ✅ Prospect peut payer via CIC (CB sécurisée)
6. ✅ Webhook CIC est reçu et traité correctement
7. ✅ Statut paiement est mis à jour en temps réel
8. ✅ Prospect ne peut PAS signer avant paiement (si requis)
9. ✅ Prospect peut signer APRÈS paiement validé
10. ✅ Notifications sont envoyées à chaque étape
11. ✅ Commercial voit le statut du comptant dans le CRM
12. ✅ Aucun paiement ne peut être perdu ou dupliqué

---

## 📞 Contact CIC pour intégration

Pour obtenir les accès API CIC :
1. Contacter le service commercial CIC
2. Demander l'activation du module "Paiement en ligne"
3. Récupérer : API Key, Secret, Merchant ID
4. Activer l'environnement de test
5. Configurer les URLs de webhook et de retour

**Documentation CIC** : https://www.cic.fr/fr/banque/entreprises/paiement-en-ligne

---

## 🎯 Prochaines étapes recommandées

**Choix 1 : Implémentation complète (9-10h)**
- Je développe toutes les fonctionnalités ci-dessus
- Intégration API CIC réelle
- Tests E2E complets

**Choix 2 : MVP Rapide (3-4h)**
- Interface CRM avec case à cocher + montant
- Mock de l'API CIC (simulation)
- Blocage signature si comptant requis
- Interface prospect basique
→ Permet de valider le flux, intégration CIC plus tard

**Choix 3 : Documentation seule (1h)**
- Guide d'intégration CIC détaillé
- Spécifications techniques complètes
- Pour implémentation ultérieure par l'équipe

**Que préfères-tu ?** 🤔
