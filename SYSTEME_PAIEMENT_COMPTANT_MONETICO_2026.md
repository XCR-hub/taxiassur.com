# Système de Paiement Comptant Monético - 2026

## 📋 Vue d'ensemble

Système complet de paiement comptant **optionnel** à l'étape 6 du pipeline commercial pour lancer les contrats d'assurance.

### ✅ Ce qui est implémenté

1. **Interface utilisateur complète** dans l'étape 6 (Paiement RIB)
2. **Table de base de données** `lead_down_payments`
3. **Edge functions** pour l'intégration Monético
4. **Workflow automatisé** avec notifications
5. **Système de webhooks** pour les confirmations de paiement

---

## 🎯 Fonctionnement

### Étape 1 : Création de la demande de paiement

Le commercial peut **optionnellement** demander un paiement comptant :

```
Interface → Bouton "+ Demander un paiement comptant"
         → Saisie du montant (ex: 500.00 €)
         → Clic sur "Créer la demande"
         → Enregistrement dans lead_down_payments
```

### Étape 2 : Génération du lien de paiement

```
Edge Function: create-monetico-payment
├── Calcul des paramètres Monético
├── Génération du MAC (signature)
├── Création de l'URL de paiement
└── Envoi d'email au prospect avec le lien
```

### Étape 3 : Paiement par le prospect

```
Prospect reçoit l'email
    → Clique sur le lien de paiement
    → Redirigé vers la page Monético
    → Effectue le paiement
    → Monético traite la transaction
```

### Étape 4 : Confirmation via webhook

```
Webhook Monético → monetico-webhook edge function
                → Vérification du MAC
                → Mise à jour du statut (paid/failed)
                → Notification au commercial
                → Lead peut passer à l'étape 7
```

---

## 🗄️ Structure de la base de données

### Table `lead_down_payments`

```sql
CREATE TABLE lead_down_payments (
  id uuid PRIMARY KEY,
  lead_id uuid REFERENCES crm_leads,

  -- Montant
  amount numeric(10, 2) NOT NULL,
  currency text DEFAULT 'EUR',
  payment_method text DEFAULT 'monetico',

  -- Statut
  status text CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),

  -- Monético
  payment_url text,              -- URL de paiement envoyée au prospect
  transaction_id text,            -- Numéro d'autorisation
  monetico_reference text,        -- Référence unique
  monetico_order_id text,         -- ID de commande

  -- Dates
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users
);
```

### Statuts possibles

- **pending** : En attente de paiement
- **paid** : Paiement confirmé par Monético
- **failed** : Paiement échoué
- **cancelled** : Annulé par le commercial
- **refunded** : Remboursé

---

## 🔧 Configuration Monético requise

### Paramètres à fournir

Pour compléter l'intégration, vous devez fournir les informations suivantes de votre compte Monético :

```javascript
// Configuration Monético
const MONETICO_CONFIG = {
  // Identifiants
  TPE: 'VOTRE_NUMERO_TPE',           // Numéro de terminal
  SOCIETE: 'VOTRE_NOM_SOCIETE',      // Nom de votre société

  // Clés de sécurité
  VERSION: '3.0',                     // Version de l'API
  MAC_KEY: 'VOTRE_CLE_MAC',          // Clé pour calculer le MAC

  // URLs de retour
  URL_OK: 'https://taxiassur.com/payment-success',
  URL_KO: 'https://taxiassur.com/payment-error',

  // URLs Monético
  PAYMENT_URL: 'https://p.monetico-services.com/paiement.cgi',
  WEBHOOK_URL: 'https://kgsivvblaxrvxvpupbjw.supabase.co/functions/v1/monetico-webhook',

  // Paramètres
  LGUE: 'FR',                        // Langue
  TEXTE_LIBRE: 'Paiement comptant assurance taxi'
};
```

### Informations nécessaires

1. **TPE** : Numéro de terminal fourni par Monético
2. **Société** : Nom de votre société
3. **Clé MAC** : Clé secrète pour signer les requêtes
4. **Mode** : Test ou Production

---

## 📝 À faire pour finaliser l'intégration

### Dans `create-monetico-payment/index.ts`

```typescript
// LIGNE 24-40 : À remplacer
// TODO: Intégration API Monético à compléter

// 1. Importer la fonction de calcul du MAC
import { calculateMoneticoMAC } from '../_shared/monetico-utils.ts';

// 2. Préparer les paramètres
const params = {
  TPE: Deno.env.get('MONETICO_TPE'),
  date: formatMoneticoDate(new Date()),
  montant: `${amount}EUR`,
  reference: paymentId,
  lgue: 'FR',
  societe: Deno.env.get('MONETICO_SOCIETE'),
  url_retour_ok: `${Deno.env.get('FRONTEND_URL')}/payment-success`,
  url_retour_err: `${Deno.env.get('FRONTEND_URL')}/payment-error`,
};

// 3. Calculer le MAC
const mac = calculateMoneticoMAC(params, Deno.env.get('MONETICO_MAC_KEY'));
params.MAC = mac;

// 4. Construire l'URL
const paymentUrl = buildMoneticoURL(params);
```

### Dans `monetico-webhook/index.ts`

```typescript
// LIGNE 30-35 : À remplacer
// TODO: Vérifier le MAC

// 1. Extraire le MAC reçu
const receivedMAC = webhookData.MAC;

// 2. Recalculer le MAC
const calculatedMAC = calculateMoneticoMAC(webhookData, Deno.env.get('MONETICO_MAC_KEY'));

// 3. Vérifier
if (receivedMAC !== calculatedMAC) {
  return new Response('Invalid MAC', { status: 403 });
}

// 4. Déterminer le statut
let status = 'failed';
if (webhookData.code_retour === 'payetest' || webhookData.code_retour === 'paiement') {
  status = 'paid';
}
```

---

## 🔐 Variables d'environnement à configurer

Dans Supabase Dashboard → Settings → Edge Functions → Secrets :

```bash
MONETICO_TPE=votre_numero_tpe
MONETICO_SOCIETE=TaxiAssur
MONETICO_MAC_KEY=REDACTED
MONETICO_VERSION=3.0
FRONTEND_URL=https://taxiassur.com
```

---

## 📧 Email automatique au prospect

L'email sera envoyé automatiquement avec :

```
Sujet : Paiement comptant pour votre assurance taxi

Bonjour [Prénom],

Votre devis d'assurance taxi est prêt !

Pour finaliser la souscription, nous vous invitons à régler
le paiement comptant de [MONTANT]€.

[BOUTON : Payer en ligne de façon sécurisée]

Ce paiement permet de lancer votre contrat immédiatement.

Cordialement,
L'équipe TaxiAssur
```

---

## 🎨 Interface dans le CRM (Étape 6)

### Section "Paiement Comptant"

```
┌─────────────────────────────────────────────────┐
│ 💶 Paiement Comptant (Optionnel)          ✓     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Aucun paiement créé                           │
│                                                 │
│  [+ Demander un paiement comptant]             │
│                                                 │
│  ℹ️ Option facultative : Demandez un paiement  │
│     comptant pour lancer le contrat.           │
└─────────────────────────────────────────────────┘
```

### Formulaire de création

```
┌─────────────────────────────────────────────────┐
│ Nouveau paiement comptant                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Montant à payer (en euros)                    │
│  ┌──────────────────────────────────┐          │
│  │ 500.00                        € │          │
│  └──────────────────────────────────┘          │
│  Ce montant sera demandé au prospect           │
│  via Monético pour lancer le contrat           │
│                                                 │
│  [💳 Créer la demande]  [Annuler]              │
└─────────────────────────────────────────────────┘
```

### Paiement en attente

```
┌─────────────────────────────────────────────────┐
│ 💳 500.00 €                                     │
│    En attente de paiement                       │
│                                [Voir] [Annuler] │
└─────────────────────────────────────────────────┘
```

### Paiement confirmé

```
┌─────────────────────────────────────────────────┐
│ ✓ 500.00 €                                      │
│    Payé le 5 février 2026 à 15:30               │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Workflow complet

```
Étape 5: Signature Devis
    ↓ [Upload devis signé]
    ↓ [Confirmer signature]
    ↓
Étape 6: Paiement RIB
    ↓
    ├─→ Vérification RIB présent ?
    │   └─→ NON → Email automatique demandant RIB
    │
    ├─→ [OPTIONNEL] Demande paiement comptant
    │   ├─→ Commercial saisit montant
    │   ├─→ Génération lien Monético
    │   ├─→ Email envoyé au prospect
    │   ├─→ Prospect paie en ligne
    │   └─→ Webhook confirme paiement
    │
    └─→ RIB validé
        ↓
Étape 7: Contrat Final
```

---

## ✅ Checklist d'intégration

- [x] Table `lead_down_payments` créée
- [x] Interface UI dans PaiementRIBStep.tsx
- [x] Edge function `create-monetico-payment` créée
- [x] Edge function `monetico-webhook` créée
- [x] RLS et sécurité configurés
- [x] Système de notifications intégré
- [ ] **Paramètres Monético à fournir**
- [ ] **Calcul du MAC à implémenter**
- [ ] **URLs de retour à configurer**
- [ ] **Tests en mode sandbox Monético**
- [ ] **Email automatique à personnaliser**
- [ ] **Passage en production**

---

## 📞 Prochaines étapes

**Pour finaliser l'intégration, transmettez :**

1. Numéro de TPE Monético
2. Nom de la société
3. Clé MAC secrète
4. Mode (test/production)
5. Documentation API Monético si disponible

Une fois ces informations fournies, je compléterai :
- Le calcul du MAC
- La construction des URLs
- La vérification des webhooks
- Les tests en mode sandbox

---

## 🎯 Avantages du système

1. **Optionnel** : Le commercial choisit s'il demande un comptant ou non
2. **Flexible** : Montant libre défini par le commercial
3. **Sécurisé** : Paiement via Monético, plateforme certifiée PCI-DSS
4. **Automatisé** : Emails et confirmations automatiques
5. **Traçable** : Historique complet dans la base de données
6. **Intégré** : S'inscrit naturellement dans le workflow commercial

---

## 📊 Statistiques disponibles

Le système permet de suivre :
- Nombre de demandes de paiement créées
- Taux de conversion (paid / total)
- Montant moyen des paiements comptant
- Délai moyen entre demande et paiement
- Taux d'échec et raisons

Vue SQL disponible : `down_payments_summary`

---

**Date de création** : 5 février 2026
**Statut** : Infrastructure prête, intégration API en attente des paramètres Monético
**Version** : 1.0
