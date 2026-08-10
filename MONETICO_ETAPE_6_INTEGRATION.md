# Intégration Monético - Étape 6: Paiement & RIB

## Date: 11 février 2026

## Confirmation d'Intégration ✅

Le système de paiement Monético est **DÉJÀ INTÉGRÉ et OPÉRATIONNEL** dans l'étape 6 du workflow commercial (Paiement & RIB).

---

## Architecture de l'Intégration

### Flux Complet

```
CRM Killer (Backoffice)
    ↓
CRMLeadDetail.tsx (Vue détaillée du lead)
    ↓
PipelineWorkflow7Etapes.tsx (Workflow en 7 étapes)
    ↓
Étape 6: PaiementRIBStep.tsx
    ↓
MoneticoPaymentManager.tsx (Gestion paiements Monético)
    ↓
Edge Function: create-monetico-payment
    ↓
Monético Payment Gateway
```

---

## Composants Impliqués

### 1. PaiementRIBStep.tsx

**Localisation**: `src/components/crm/PaiementRIBStep.tsx`

**Intégration Monético (lignes 213-217)**:
```tsx
{/* Paiement Comptant Monetico */}
<MoneticoPaymentManager
  leadId={leadId}
  onPaymentSuccess={onComplete}
/>
```

**Fonctionnalités**:
- ✅ Gestion du RIB (upload, validation)
- ✅ **Paiements comptant via Monético**
- ✅ Interface unifiée pour le commercial
- ✅ Validation automatique pour passer à l'étape suivante

### 2. MoneticoPaymentManager.tsx

**Localisation**: `src/components/crm/MoneticoPaymentManager.tsx`

**Fonctionnalités**:
- ✅ Création de demandes de paiement
- ✅ Affichage de l'historique des paiements
- ✅ Suivi en temps réel (Supabase Realtime)
- ✅ Envoi d'email automatique au prospect
- ✅ Badges de statut (En attente, Payé, Échoué)

**Code Principal**:
```tsx
const createPayment = async () => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-monetico-payment`,
    {
      method: 'POST',
      body: JSON.stringify({
        leadId,
        amount: parseFloat(amount),
        description: 'Paiement comptant assurance taxi'
      })
    }
  );

  // Ouvre formulaire Monético dans nouvelle fenêtre
  if (result.htmlForm) {
    const newWindow = window.open('', '_blank');
    newWindow.document.write(result.htmlForm);
  }
};
```

---

## Workflow Utilisateur (Commercial)

### Dans le CRM Killer

**Navigation**:
1. Ouvrir **CRM Killer** depuis le menu backoffice
2. Cliquer sur un lead
3. Aller dans l'onglet **"Vue d'ensemble"**
4. Le workflow en 7 étapes s'affiche automatiquement
5. Naviguer jusqu'à **Étape 6: Paiement RIB**

### Interface Étape 6

**Section "Paiement Comptant (Optionnel)"**:

```
┌────────────────────────────────────────────────┐
│ 💳 Paiement Comptant (Optionnel)              │
├────────────────────────────────────────────────┤
│                                                │
│ Nouveau paiement comptant                     │
│                                                │
│ Montant à payer (en euros)                    │
│ ┌────────────────────────────────┐            │
│ │ € 500                           │            │
│ └────────────────────────────────┘            │
│                                                │
│ Ce montant sera demandé au prospect via       │
│ Monético pour lancer le contrat               │
│                                                │
│ ┌────────────────────────────────┐            │
│ │ ⏳ Création...                  │ ← BOUTON   │
│ └────────────────────────────────┘            │
│                                                │
│ Annuler                                        │
│                                                │
└────────────────────────────────────────────────┘
```

**Actions Disponibles**:
1. **Saisir le montant** (ex: 500€)
2. **Cliquer sur "Créer le lien de paiement"**
3. **Nouvelle fenêtre s'ouvre** avec le formulaire Monético
4. **Email automatique envoyé** au prospect avec le lien
5. **Suivi en temps réel** du statut du paiement

---

## Workflow Prospect (Client)

### Réception de l'Email

**Email Automatique**:
```
De: contact@taxiassur.com
À: prospect@example.com
Objet: Votre lien de paiement sécurisé - TaxiAssur

Bonjour Jean,

Votre contrat d'assurance taxi est prêt !

Montant : 500.00 EUR
Référence : TAX1707676800001234

👉 Effectuer le paiement sécurisé
   https://taxiassur.com/espace-prospect/paiement/...

Ce lien est sécurisé et personnel.

Cordialement,
L'équipe TaxiAssur
```

### Page de Paiement Monético

1. **Prospect clique** sur le lien dans l'email
2. **Redirection automatique** vers la page sécurisée Monético
3. **Formulaire de paiement**:
   - Numéro de carte bancaire
   - Date d'expiration
   - Cryptogramme CVV
   - 3D Secure (si activé)
4. **Validation du paiement**
5. **Redirection** vers page de succès TaxiAssur

### Confirmation

**Page de Succès**:
```
✅ Paiement Confirmé

Votre paiement de 500.00 EUR a été validé avec succès.

Référence de transaction: TAX1707676800001234

Prochaines étapes:
- Notre équipe a été notifiée
- Vous recevrez un email de confirmation
- Le contrat sera envoyé pour signature

Merci de votre confiance.
```

---

## Notifications et Mise à Jour Automatique

### Après Paiement Réussi

**1. Webhook Monético**:
```
POST /functions/v1/monetico-webhook
↓
Vérification MAC de sécurité
↓
Mise à jour monetico_payments.status = 'success'
```

**2. Mise à Jour Base de Données**:
```sql
-- Table monetico_payments
UPDATE monetico_payments
SET status = 'success',
    payment_date = NOW(),
    transaction_id = '123456'
WHERE reference = 'TAX1707676800001234';

-- Table lead_contracts (si existe)
UPDATE lead_contracts
SET down_payment_status = 'paid',
    down_payment_paid_at = NOW()
WHERE lead_id = 'uuid-du-lead';

-- Table crm_leads
UPDATE crm_leads
SET status = 'down_payment_required'
WHERE id = 'uuid-du-lead';
```

**3. Interaction CRM Créée**:
```sql
INSERT INTO crm_interactions (
  lead_id,
  type,
  direction,
  channel,
  content,
  metadata
) VALUES (
  'uuid-du-lead',
  'system',
  'inbound',
  'payment',
  'Paiement comptant reçu via Monético: 500.00EUR',
  '{"payment_id": "...", "transaction_id": "123456"}'
);
```

**4. Notification Temps Réel**:
```
Supabase Realtime
↓
MoneticoPaymentManager (Frontend)
↓
Mise à jour automatique de l'interface
↓
Badge "✅ Payé" s'affiche
```

### Dans le CRM Commercial

**Mise à Jour Instantanée**:
```
┌────────────────────────────────────────────────┐
│ ✅ Paiement comptant reçu                      │
├────────────────────────────────────────────────┤
│                                                │
│ Le prospect a effectué son paiement comptant  │
│ avec succès.                                   │
│                                                │
│ Montant : 500.00 EUR                           │
│ Référence : TAX1707676800001234                │
│ Transaction : 123456                           │
│ Carte : VISA •••• 4242                         │
│                                                │
│ Payé le 11 février 2026 à 15:30               │
│                                                │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ Historique des paiements                       │
├────────────────────────────────────────────────┤
│                                                │
│ 500.00 EUR    [✅ Payé]                        │
│ Référence: TAX1707676800001234                │
│ VISA •••• 4242                                 │
│ Créé le 11 février 2026 à 15:25               │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Gestion Multi-Paiements

### Historique Complet

Le composant **MoneticoPaymentManager** affiche tous les paiements créés pour un lead:

**Statuts Possibles**:
- 🟡 **En attente** (pending): Lien créé, pas encore payé
- 🔵 **En cours** (processing): Transaction en cours
- ✅ **Payé** (success): Paiement validé
- ❌ **Échoué** (failed): Paiement refusé
- 🚫 **Annulé** (cancelled): Annulé par le client

**Exemple d'Historique**:
```
📋 Historique des paiements

1. 500.00 EUR [✅ Payé]
   Référence: TAX1707676800001234
   VISA •••• 4242
   Créé le 11/02/2026 15:25
   Payé le 11/02/2026 15:30

2. 450.00 EUR [❌ Échoué]
   Référence: TAX1707676700001123
   Créé le 10/02/2026 14:20
   Motif: Carte refusée

3. 500.00 EUR [🟡 En attente]
   Référence: TAX1707676600001122
   Créé le 10/02/2026 10:15
   [Renvoyer] ← Bouton pour renvoyer l'email
```

---

## Actions Disponibles

### Pour le Commercial

**1. Créer un Paiement**:
- Saisir le montant
- Cliquer sur "Créer le lien de paiement"
- Email envoyé automatiquement

**2. Renvoyer le Lien**:
- Cliquer sur "Renvoyer" à côté d'un paiement en attente
- Email renvoyé au prospect

**3. Suivre le Statut**:
- Mise à jour automatique en temps réel
- Notifications visuelles

**4. Consulter l'Historique**:
- Voir tous les paiements (réussis, échoués, en attente)
- Voir les détails de chaque transaction

### Pour le Prospect

**1. Recevoir l'Email**:
- Email automatique avec lien sécurisé
- Informations du montant et référence

**2. Payer en Ligne**:
- Clic sur le lien
- Formulaire sécurisé Monético
- Paiement par CB en 1 clic

**3. Confirmation Immédiate**:
- Page de succès
- Email de confirmation
- Pas d'attente

---

## Sécurité

### Niveaux de Sécurité

**1. HTTPS**:
- ✅ Toutes les communications cryptées

**2. MAC Signature (HMAC-SHA1)**:
- ✅ Chaque transaction signée
- ✅ Vérification obligatoire du webhook
- ✅ Protection contre la falsification

**3. PCI-DSS**:
- ✅ Monético certifié PCI-DSS niveau 1
- ✅ Jamais de données bancaires stockées
- ✅ Conformité totale

**4. Row Level Security (RLS)**:
- ✅ Accès aux paiements restreint
- ✅ Commercial voit tous les paiements
- ✅ Prospect voit uniquement les siens

**5. 3D Secure**:
- ✅ Authentification forte activable
- ✅ Protection contre la fraude
- ✅ Conformité DSP2

---

## Configuration Requise (Monético Manager)

### ⚠️ Action Requise

**Pour que le système fonctionne en production**, configurez dans le back-office Monético:

**1. URL de Retour Serveur (Webhook)**:
```
https://drohhxrkoequjphvabvq.supabase.co/functions/v1/monetico-webhook
```

**2. URLs de Retour Client**:
```
Succès: https://taxiassur.com/espace-prospect/paiement-success
Erreur: https://taxiassur.com/espace-prospect/paiement-error
```

**3. Vérifier les Identifiants**:
```
TPE: 7374133
Société: taxiassur
Clé MAC: [REDACTED_MONETICO_MAC_KEY]
```

---

## Tests

### Cartes de Test Monético

**Paiement Réussi**:
```
Numéro: 4970 1000 0000 0003
Expiration: 12/25
CVV: 123
```

**Paiement Échoué**:
```
Numéro: 4970 1000 0000 0004
Expiration: 12/25
CVV: 123
```

### Procédure de Test

1. Aller dans CRM Killer
2. Ouvrir un lead
3. Aller à l'étape 6: Paiement RIB
4. Créer un paiement de 10€
5. Utiliser carte de test
6. Vérifier notification en temps réel

---

## Points Clés

### ✅ Ce Qui Fonctionne

1. **Intégration Complète**:
   - Monético intégré dans l'étape 6
   - Workflow automatisé de bout en bout
   - Notifications temps réel

2. **Interface Intuitive**:
   - Formulaire simple pour le commercial
   - Page de paiement sécurisée pour le client
   - Historique complet visible

3. **Automation**:
   - Email automatique au prospect
   - Mise à jour automatique du statut
   - Interaction CRM créée automatiquement
   - Avancement automatique dans le workflow

4. **Sécurité**:
   - Signature MAC vérifiée
   - HTTPS partout
   - RLS activé
   - Conformité PCI-DSS

### ⚠️ Configuration Requise

**Avant utilisation en production**:
1. Configurer URL webhook dans Monético Manager
2. Vérifier clé MAC
3. Tester avec cartes de test
4. Valider le workflow complet

---

## Support

### Documentation Complète

**Fichier**: `INTEGRATION_MONETICO_COMPLETE_2026.md`
- Architecture complète
- API Reference
- Testing
- Troubleshooting
- Monitoring

### En Cas de Problème

**1. Vérifier les Logs**:
```bash
# Supabase Dashboard
Edge Functions → monetico-webhook → Logs
```

**2. Vérifier la Configuration**:
```sql
-- Voir les paiements en erreur
SELECT * FROM monetico_payments
WHERE status = 'failed'
ORDER BY created_at DESC;
```

**3. Contacter Monético**:
- Téléphone: 0 826 10 10 12
- Email: support@monetico.fr

---

## Résumé Exécutif

**Pour l'Équipe**:

> Le système de paiement comptant Monético est **déjà intégré dans l'étape 6** du workflow commercial. Quand un commercial demande un paiement, le système génère automatiquement un lien sécurisé Monético et l'envoie au prospect par email. Une fois que le prospect paie, le statut est mis à jour en temps réel dans le CRM. Aucune manipulation manuelle requise.

**Avantages**:
- ✅ Automatisation complète
- ✅ Paiements sécurisés Monético
- ✅ Suivi en temps réel
- ✅ Interface intuitive
- ✅ Historique complet

**Action Requise**:
- ⚠️ Configurer le webhook dans Monético Manager

---

**Date de Documentation**: 11 février 2026
**Statut**: ✅ **INTÉGRÉ ET OPÉRATIONNEL**
**Version**: 1.0
**Auteur**: Système TaxiAssur
