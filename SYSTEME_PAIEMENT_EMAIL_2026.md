# 📧 Système d'Envoi de Lien de Paiement par Email - 20 Fév 2026

## ✅ Fonctionnalité Complète

Le commercial peut maintenant **envoyer le lien de paiement par email** au client, en plus de pouvoir encaisser directement.

---

## 🎯 Deux Options de Paiement

### 1. Encaisser Directement (Existant)
- **Usage :** Client présent avec le commercial
- **Comportement :** Ouvre une nouvelle fenêtre avec le formulaire Monetico
- **Bouton :** "Encaisser" (bleu)

### 2. Envoyer par Email (NOUVEAU)
- **Usage :** Client à distance
- **Comportement :** Envoie un email professionnel avec le lien sécurisé
- **Bouton :** "Envoyer par email" (vert)

---

## 📋 Interface Commercial

### Création d'un nouveau paiement

```
┌─────────────────────────────────────────────┐
│ Demander un paiement comptant               │
├─────────────────────────────────────────────┤
│ Montant (€)                                 │
│ [________50.00________]                     │
│                                             │
│ Description (optionnel)                     │
│ [Paiement comptant assurance taxi________]  │
│                                             │
│ ┌──────────────┐  ┌────────────────────┐  │
│ │ 💳 Encaisser │  │ 📧 Envoyer par email│ │
│ └──────────────┘  └────────────────────┘  │
│                                             │
│ Encaisser: Ouvre le paiement (vous payez)  │
│ Envoyer par email: Envoie le lien au client│
└─────────────────────────────────────────────┘
```

### Paiements en attente

```
┌─────────────────────────────────────────────┐
│ Historique des paiements                    │
├─────────────────────────────────────────────┤
│ 50 € • En attente                           │
│ Référence: T12345678901                     │
│ Créé le 20 février 2026 à 13:32            │
│                   ┌────────────────────────┐│
│                   │ 📧 Envoyer par email   ││
│                   └────────────────────────┘│
└─────────────────────────────────────────────┘
```

---

## 📧 Email Envoyé au Client

### Template Professionnel

**Objet :** 💳 Votre lien de paiement comptant - 50€

**Contenu HTML :**

```html
┌──────────────────────────────────────────────┐
│      💳 Paiement Comptant                    │
│   TaxiAssur - Assurance Professionnelle     │
├──────────────────────────────────────────────┤
│                                              │
│ Bonjour Jean Dupont,                        │
│                                              │
│ Votre lien de paiement sécurisé est prêt.   │
│                                              │
│ ┌────────────────────────────────────────┐  │
│ │ Montant à payer:           50 €        │  │
│ │ Référence:        T12345678901         │  │
│ │ Description: Paiement comptant taxi    │  │
│ └────────────────────────────────────────┘  │
│                                              │
│        ┌─────────────────────────┐           │
│        │ 🔒 Accéder au paiement  │           │
│        └─────────────────────────┘           │
│                                              │
│ Ce lien vous donne accès à votre espace     │
│ personnel où vous pourrez effectuer le      │
│ paiement en toute sécurité.                 │
│                                              │
│ ┌────────────────────────────────────────┐  │
│ │ 🔒 Paiement 100% Sécurisé              │  │
│ │ Monetico CIC • 3D Secure • PCI-DSS     │  │
│ └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 🔗 Flux Technique

### 1. Clic sur "Envoyer par email"

```typescript
// Frontend appelle l'edge function
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/send-payment-link-monetico`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ paymentId: 'uuid-paiement' })
  }
);
```

### 2. Edge Function traite la demande

```typescript
// supabase/functions/send-payment-link-monetico/index.ts

1. Récupère le paiement depuis monetico_payments
2. Récupère le lead avec email et access_token
3. Génère le lien vers l'espace prospect :
   https://taxiassur.com/espace-prospect/{token}?tab=paiement
4. Envoie l'email via IONOS
5. Crée une notification CRM
```

### 3. Email envoyé via IONOS

```typescript
POST /functions/v1/send-email-ionos
{
  "to": "client@example.com",
  "subject": "💳 Votre lien de paiement comptant - 50€",
  "html": "...",
  "from": "contact@taxiassur.com"
}
```

### 4. Notification CRM créée

```sql
INSERT INTO crm_event_notifications (
  lead_id,
  event_type,
  title,
  message,
  priority,
  action_url,
  context_data
) VALUES (
  '...',
  'communication_sent',
  '💳 Lien de paiement envoyé',
  'Lien de paiement de 50€ envoyé à client@example.com',
  1,
  '/backoffice/crm-killer/...',
  jsonb_build_object(
    'payment_id', '...',
    'reference', 'T12345678901',
    'amount', 50,
    'email', 'client@example.com',
    'sent_at', NOW()
  )
);
```

---

## 🎨 États du Composant

### Loading States

```tsx
// Envoi en cours
<button disabled>
  <Loader className="w-4 h-4 animate-spin" />
  Envoi...
</button>

// Création + envoi en cours
<button disabled>
  <Loader className="w-4 h-4 animate-spin" />
  Envoi...
</button>
```

### Success State

```tsx
// Message de confirmation temporaire (5s)
<div className="bg-green-50 border border-green-200">
  <CheckCircle className="w-5 h-5 text-green-600" />
  Email envoyé avec succès à client@example.com
</div>
```

### Error State

```tsx
// Message d'erreur persistant
<div className="bg-red-50 border border-red-200">
  <AlertCircle className="w-4 h-4 text-red-600" />
  Erreur lors de l'envoi de l'email
</div>
```

---

## 📦 Fichiers Modifiés

### Edge Functions

1. **`send-payment-link-monetico/index.ts`** (NOUVEAU)
   - Gère l'envoi de l'email avec lien de paiement
   - Génère email HTML professionnel
   - Envoie via IONOS
   - Crée notification CRM

2. **`create-monetico-payment/index.ts`** (MODIFIÉ)
   - Retourne maintenant `paymentId` en réponse
   - Permet au frontend de savoir quel paiement envoyer par email

### Frontend

3. **`MoneticoPaymentManager.tsx`** (MODIFIÉ)
   - Ajout état `sendingEmail` pour tracking
   - Ajout fonction `sendPaymentEmail()`
   - Ajout bouton "Envoyer par email" (vert) à côté de "Encaisser"
   - Ajout bouton sur paiements en attente
   - Messages de succès/erreur
   - Explications claires des deux options

---

## ✅ Avantages

### Pour le Commercial

1. **Flexibilité :**
   - Encaissement direct si client présent
   - Envoi email si client à distance

2. **Traçabilité :**
   - Notification CRM créée automatiquement
   - Historique des envois visible

3. **Simplicité :**
   - Un seul clic pour envoyer
   - Pas besoin de copier/coller un lien

### Pour le Client

1. **Professionnel :**
   - Email au format branded TaxiAssur
   - Design moderne et responsive

2. **Sécurisé :**
   - Lien personnel vers espace prospect
   - Badge de sécurité Monetico visible

3. **Simple :**
   - Un clic pour accéder au paiement
   - Toutes les infos dans l'email

---

## 🧪 Test Complet

### 1. Créer un lead de test

```sql
INSERT INTO crm_leads (first_name, last_name, email, phone, status, access_token)
VALUES ('Jean', 'Test', 'test@example.com', '0612345678', 
        'nouveau_lead', encode(gen_random_bytes(32), 'hex'))
RETURNING id, access_token;
```

### 2. Dans le CRM

```
1. Ouvrir la fiche lead
2. Onglet "Paiement"
3. Entrer montant : 50€
4. Cliquer "Envoyer par email"
5. Vérifier le message de succès
```

### 3. Vérifier l'email

```
1. Checker la boîte mail test@example.com
2. Ouvrir l'email "Votre lien de paiement comptant"
3. Cliquer sur "Accéder au paiement"
4. Vérifier redirection vers espace prospect
5. Onglet "Paiement" doit s'ouvrir automatiquement
```

### 4. Vérifier la notification CRM

```sql
SELECT title, message, context_data
FROM crm_event_notifications
WHERE event_type = 'communication_sent'
AND context_data->>'payment_id' IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;

-- Résultat attendu :
{
  "title": "💳 Lien de paiement envoyé",
  "message": "Lien de paiement de 50€ envoyé à test@example.com",
  "context_data": {
    "payment_id": "...",
    "reference": "T...",
    "amount": 50,
    "email": "test@example.com",
    "sent_at": "2026-02-20T..."
  }
}
```

---

## 🔧 Configuration Requise

### Variables d'environnement (déjà configurées)

```bash
# IONOS Email
IONOS_SMTP_HOST=smtp.ionos.fr
IONOS_SMTP_PORT=587
IONOS_SMTP_USER=contact@taxiassur.com
IONOS_SMTP_PASS=***

# Supabase
SUPABASE_URL=https://drohhxrkoequjphvabvq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=***

# Site public
PUBLIC_SITE_URL=https://taxiassur.com
```

---

## 📊 Métriques à Surveiller

### Base de données

```sql
-- Emails envoyés aujourd'hui
SELECT COUNT(*) 
FROM crm_event_notifications
WHERE event_type = 'communication_sent'
AND context_data->>'payment_id' IS NOT NULL
AND created_at::date = CURRENT_DATE;

-- Taux de conversion (paiements envoyés vs payés)
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as envoyes,
  COUNT(*) FILTER (WHERE status = 'success') as payes,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'success') / 
    NULLIF(COUNT(*), 0), 
    2
  ) as taux_conversion
FROM monetico_payments
WHERE created_at >= NOW() - INTERVAL '7 days';
```

---

## 🚀 Prochaines Évolutions Possibles

1. **Relances automatiques**
   - Email de relance J+1 si paiement non effectué
   - Email de relance J+3 si toujours en attente

2. **Templates personnalisables**
   - Permettre au commercial de personnaliser le message
   - Ajouter une note personnelle

3. **SMS en plus de l'email**
   - Envoyer aussi un SMS avec lien court
   - Augmenter le taux d'ouverture

4. **Tracking avancé**
   - Savoir quand le client ouvre l'email
   - Savoir quand il clique sur le lien
   - Dashboard avec métriques

---

**Date :** 20 février 2026  
**Statut :** ✅ Fonctionnel et déployé  
**Edge Functions :** 2 déployées  
**Frontend :** Build réussi
