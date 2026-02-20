# 🔧 Correction Affichage Paiement dans l'Espace Prospect - 20 Fév 2026

## ❌ Problème Identifié

Le prospect reçoit bien l'email avec le lien de paiement (`?tab=paiement`), mais :

1. ❌ L'onglet "Paiement" affiche "Devis non accepté"
2. ❌ Aucun bouton de paiement n'est visible
3. ❌ Le prospect ne peut pas procéder au paiement comptant

### Cause Racine

**Logique conditionnelle incorrecte dans l'espace prospect**

```typescript
// AVANT (incorrect)
{!leadInfo.quote_accepted_at ? (
  <div>Devis non accepté</div>  // ❌ Bloque l'affichage du paiement
) : (
  <ClientSubscriptionForm />    // Formulaire RIB
)}
```

Le système vérifiait si un devis avait été accepté avant d'afficher les options de paiement. Or, pour les **paiements comptants créés par le commercial**, le prospect n'a pas besoin d'avoir accepté un devis préalablement.

---

## ✅ Corrections Appliquées

### 1. Chargement des Paiements en Attente

**Fichier :** `src/pages/EspaceProspect.tsx`

**Ajout d'un état pour stocker les paiements :**

```typescript
const [pendingPayments, setPendingPayments] = useState<any[]>([]);
```

**Chargement via RPC sécurisé :**

```typescript
// Utiliser la fonction RPC get_payments_by_token
const { data: payments } = await anonClient
  .rpc('get_payments_by_token', { p_token: token })
  .then(res => ({
    data: res.data?.filter((p: any) => p.status === 'pending'),
    error: res.error
  }));

if (payments) {
  setPendingPayments(payments || []);
}
```

### 2. Nouvelle Logique d'Affichage

**Fichier :** `src/pages/EspaceProspect.tsx`

**AVANT :**
```typescript
{!leadInfo.quote_accepted_at ? (
  <div>Devis non accepté</div>
) : (
  <ClientSubscriptionForm />
)}
```

**APRÈS :**
```typescript
{/* PRIORITÉ 1 : Afficher les paiements en attente */}
{pendingPayments.length > 0 && (
  <div className="space-y-4">
    {pendingPayments.map((payment) => (
      <div key={payment.id} className="bg-gradient-to-br from-blue-900/40">
        <h4>{payment.description}</h4>
        <p>Montant : {payment.amount} €</p>
        <p>Référence : {payment.payment_reference}</p>
        
        <ClientMoneticoPayment
          leadId={leadInfo.id}
          amount={parseFloat(payment.amount)}
          reference={payment.payment_reference}
          description={payment.description}
        />
      </div>
    ))}
  </div>
)}

{/* PRIORITÉ 2 : Si pas de paiement ET pas de devis */}
{pendingPayments.length === 0 && !leadInfo.quote_accepted_at && (
  <div>Devis non accepté - Acceptez d'abord un devis</div>
)}

{/* PRIORITÉ 3 : Si devis accepté, formulaire RIB */}
{leadInfo.quote_accepted_at && (
  <ClientSubscriptionForm />
)}
```

### 3. Nouveau Composant ClientMoneticoPayment

**Fichier créé :** `src/components/client/ClientMoneticoPayment.tsx`

Ce composant gère l'affichage du bouton de paiement Monetico :

```typescript
interface Props {
  leadId: string;
  amount: number;
  reference: string;
  description?: string;
}

export default function ClientMoneticoPayment({ leadId, amount, reference, description }: Props) {
  const handlePayment = async () => {
    // Appeler create-monetico-payment avec la référence existante
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-monetico-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          leadId,
          amount,
          description,
          customReference: reference, // Utiliser la référence existante
        }),
      }
    );

    const result = await response.json();

    // Afficher le formulaire HTML Monetico dans une nouvelle fenêtre
    if (result.success && result.htmlForm) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(result.htmlForm);
        newWindow.document.close();
      }
    }
  };

  return (
    <button onClick={handlePayment} className="...">
      🔒 Accéder au paiement
    </button>
  );
}
```

### 4. Utilisation de la Fonction RPC Existante

**Fonction RPC utilisée :** `get_payments_by_token(p_token text)`

Cette fonction :
- ✅ Vérifie le token du prospect
- ✅ Récupère tous les paiements associés au lead
- ✅ Respecte les politiques RLS (Row Level Security)
- ✅ Fonctionne en mode anonyme

---

## 🎯 Workflow Complet Corrigé

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Commercial crée un paiement comptant dans le CRM        │
│    → Montant: 100€, Description: "Acompte 30%"             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Commercial clique "Envoyer par email"                    │
│    → Edge Function: send-payment-link-monetico              │
│    → Email envoyé au prospect avec lien                     │
│    → Lien: /espace-prospect/[TOKEN]?tab=paiement           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Prospect clique sur le lien dans l'email                │
│    → Arrive sur l'espace prospect                           │
│    → Onglet "Paiement" activé automatiquement              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Système charge les paiements en attente                 │
│    → RPC: get_payments_by_token(token)                      │
│    → Filtre status = 'pending'                              │
│    → Affiche la liste des paiements                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Prospect voit le paiement avec le bouton                │
│    ┌─────────────────────────────────────────────┐         │
│    │ 💳 Paiement comptant assurance taxi         │         │
│    │ Montant : 100.00 €                          │         │
│    │ Référence : T12345678901                    │         │
│    │                                             │         │
│    │ 🔒 Paiement 100% Sécurisé                   │         │
│    │ [🔒 Accéder au paiement]                    │         │
│    └─────────────────────────────────────────────┘         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Prospect clique sur "Accéder au paiement"               │
│    → Appel: create-monetico-payment                         │
│    → Paramètres: leadId, amount, reference existante       │
│    → Génère formulaire HTML Monetico                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Formulaire Monetico s'ouvre dans nouvelle fenêtre       │
│    → Auto-submit vers Monetico CIC                          │
│    → Prospect entre ses coordonnées bancaires               │
│    → Paiement sécurisé 3D Secure                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Webhook Monetico confirme le paiement                   │
│    → Mise à jour status: 'paid'                             │
│    → Notification au commercial                             │
│    → Lead passe à 'contrat_final'                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Fichiers Modifiés

1. **`src/pages/EspaceProspect.tsx`**
   - Ajout état `pendingPayments`
   - Chargement paiements via RPC
   - Nouvelle logique d'affichage prioritaire
   - Import `ClientMoneticoPayment`

2. **`src/components/client/ClientMoneticoPayment.tsx`** (nouveau)
   - Composant dédié au paiement Monetico
   - Gestion formulaire HTML auto-submit
   - Ouverture dans nouvelle fenêtre

3. **`supabase/functions/send-payment-link-monetico/index.ts`**
   - Correction paramètres email (htmlBody, toName, fromEmail, fromName)

---

## 🧪 Test de la Correction

### Dans le CRM

1. Ouvrir un lead
2. Onglet "Paiement RIB"
3. Demander un paiement supplémentaire
4. Montant: 100€, Description: "Acompte 30%"
5. Cliquer "Encaisser" (crée le paiement)
6. Cliquer "Envoyer par email"

### Résultat attendu

```
✅ Email envoyé avec succès à client@example.com
```

### Dans l'Email du Prospect

```
📧 De: TaxiAssur <contact@taxiassur.com>
📧 Objet: 💳 Votre lien de paiement comptant - 100€

[Email avec bouton "🔒 Accéder au paiement"]
[Lien: https://taxiassur.com/espace-prospect/[TOKEN]?tab=paiement]
```

### Dans l'Espace Prospect

1. Prospect clique sur le lien
2. Arrive directement sur l'onglet "Paiement"
3. Voit le paiement en attente :

```
┌──────────────────────────────────────────────┐
│ 💳 Paiement comptant assurance taxi          │
│                                              │
│ Montant : 100.00 €                           │
│ Référence : T98868843361                     │
│                                              │
│ 🔒 Paiement 100% Sécurisé                    │
│ Vos données bancaires sont protégées par     │
│ Monetico Paiement (CIC)                      │
│                                              │
│ [🔒 Accéder au paiement]                     │
└──────────────────────────────────────────────┘
```

4. Clique sur le bouton
5. Nouvelle fenêtre s'ouvre avec le formulaire Monetico
6. Entre ses coordonnées bancaires
7. Valide le paiement

---

## 🛡️ Sécurité

### Politiques RLS

✅ **Table monetico_payments**
- Prospect peut voir ses paiements via token (anonyme)
- Admins peuvent tout voir (authentifiés)
- Fonction RPC `get_payments_by_token` sécurisée

### Validation du Token

```sql
-- get_payments_by_token vérifie:
SELECT cl.id INTO v_lead_id
FROM crm_leads cl
WHERE cl.access_token = p_token
  AND (cl.deleted_at IS NULL OR cl.deleted_at > NOW())
  AND (cl.archived_at IS NULL OR cl.archived_at > NOW());
```

### Génération Formulaire

- ✅ MAC HMAC-SHA1 avec clé hexadécimale
- ✅ Référence unique (12 caractères max)
- ✅ Mode TEST activé
- ✅ URLs de retour sécurisées
- ✅ 3D Secure activé

---

## 📊 Impact

### Avant la correction

- ❌ Prospect ne peut pas payer
- ❌ Message "Devis non accepté" bloque l'accès
- ❌ Workflow incomplet
- ❌ Paiements comptants impossibles

### Après la correction

- ✅ Prospect voit tous ses paiements en attente
- ✅ Bouton de paiement visible et fonctionnel
- ✅ Formulaire Monetico s'ouvre correctement
- ✅ Workflow complet et fluide
- ✅ Paiements multiples supportés
- ✅ Emails de notification fonctionnels
- ✅ Tracking complet dans le CRM

---

## 📈 Améliorations Futures

1. **Affichage de l'historique des paiements**
   - Afficher aussi les paiements 'paid', 'failed'
   - Badge de statut coloré

2. **Notification en temps réel**
   - WebSocket pour notifier le paiement réussi
   - Mettre à jour automatiquement le statut

3. **Email de confirmation**
   - Envoyer un email au prospect après paiement réussi
   - Avec reçu PDF

4. **Gestion des échecs**
   - Afficher le message d'erreur Monetico
   - Proposer de réessayer

---

## ✅ Résultat Final

Le système de paiement dans l'espace prospect fonctionne maintenant parfaitement :

1. ✅ **Emails de paiement envoyés** (corrigé)
2. ✅ **Lien redirige vers l'onglet Paiement** (fonctionnel)
3. ✅ **Paiements en attente affichés** (nouveau)
4. ✅ **Bouton de paiement visible** (nouveau)
5. ✅ **Formulaire Monetico s'ouvre** (nouveau)
6. ✅ **Workflow complet de bout en bout** (corrigé)

---

**Date :** 20 février 2026  
**Statut :** ✅ Corrigé, testé et déployé  
**Impact :** Critique - Paiements comptants fonctionnels  
**Build :** ✓ Réussi (1m 15s)
