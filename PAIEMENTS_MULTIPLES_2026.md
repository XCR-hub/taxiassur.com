# 💰 Système de Paiements Multiples - 20 Fév 2026

## ✅ Fonctionnalité Complète

Le commercial peut maintenant **demander autant de paiements qu'il souhaite** pour un même prospect.

---

## 🎯 Cas d'Usage

### Exemples Pratiques

1. **Acomptes et soldes**
   - Acompte 30% : 150€
   - Solde 70% : 350€
   - Total : 500€

2. **Frais fractionnés**
   - Prime annuelle : 600€
   - Frais de dossier : 50€
   - Total : 650€

3. **Paiements échelonnés**
   - 1er paiement : 200€
   - 2e paiement : 200€
   - 3e paiement : 200€
   - Total : 600€

4. **Compléments**
   - Paiement initial : 500€ (payé)
   - Garantie supplémentaire : 100€ (à payer)
   - Total : 600€

---

## 📊 Interface CRM Améliorée

### Résumé des paiements (nouveau)

```
┌─────────────────────────────────────────────┐
│ Total payé          │ En attente            │
│ 500.00 €           │ 100.00 €              │
│ 2 paiement(s) réussi(s) │ 1 paiement(s) en attente │
└─────────────────────────────────────────────┘
```

### Formulaire (toujours visible)

```
┌─────────────────────────────────────────────┐
│ Demander un paiement supplémentaire         │
├─────────────────────────────────────────────┤
│ Montant: [100€]                             │
│ Description: [Garantie supplémentaire]      │
│                                             │
│ ┌──────────────┐  ┌────────────────────┐  │
│ │ 💳 Encaisser │  │ 📧 Envoyer par email│ │
│ └──────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Historique des paiements (amélioré)

```
┌─────────────────────────────────────────────┐
│ Historique des paiements (3)    Total: 700€ │
├─────────────────────────────────────────────┤
│ #3  500.00€  ✅ Payé                        │
│ Réf: T12345678903                           │
│ VISA •••• 1800                              │
│ Créé le 20 février 2026 à 14:30            │
│ Payé le 20 février 2026 à 14:32            │
├─────────────────────────────────────────────┤
│ #2  100.00€  ⏳ En attente  [📧 Renvoyer]   │
│ Réf: T12345678902                           │
│ Créé le 20 février 2026 à 13:15            │
├─────────────────────────────────────────────┤
│ #1  100.00€  ✅ Payé                        │
│ Réf: T12345678901                           │
│ VISA •••• 1800                              │
│ Créé le 19 février 2026 à 10:00            │
│ Payé le 19 février 2026 à 10:05            │
└─────────────────────────────────────────────┘
```

---

## 🎨 Améliorations Visuelles

### Badges de statut colorés

- **✅ Payé** : Fond vert (`bg-green-50 border-green-200`)
- **⏳ En attente** : Fond jaune (`bg-yellow-50 border-yellow-200`)
- **❌ Échoué** : Fond rouge (`bg-red-50 border-red-200`)

### Numérotation inversée

Les paiements sont numérotés du plus récent (#3) au plus ancien (#1).

### Informations enrichies

- **Montant** : Taille plus grande, gras
- **Référence** : Police monospace pour faciliter la lecture
- **Date de paiement** : Affichée en vert si payé
- **Carte bancaire** : Type et 4 derniers chiffres si disponible

---

## 🔄 Changements Techniques

### Suppression de la limitation

**AVANT** (un seul paiement possible) :
```tsx
{!hasSuccessfulPayment && (
  <div>Formulaire de création</div>
)}
```

**APRÈS** (paiements illimités) :
```tsx
{/* Formulaire toujours visible */}
<div>
  <h3>
    {hasSuccessfulPayment 
      ? 'Demander un paiement supplémentaire' 
      : 'Demander un paiement comptant'}
  </h3>
  {/* Formulaire */}
</div>
```

### Calculs automatiques

```tsx
const totalPaid = payments
  .filter(p => p.status === 'success')
  .reduce((sum, p) => sum + p.amount, 0);

const totalPending = payments
  .filter(p => p.status === 'pending')
  .reduce((sum, p) => sum + p.amount, 0);
```

### Badge de résumé

```tsx
{payments.length > 0 && (
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p>Total payé</p>
        <p className="text-2xl font-bold text-green-600">
          {totalPaid.toFixed(2)} €
        </p>
        <p className="text-xs">
          {successCount} paiement(s) réussi(s)
        </p>
      </div>
      <div>
        <p>En attente</p>
        <p className="text-2xl font-bold text-orange-600">
          {totalPending.toFixed(2)} €
        </p>
        <p className="text-xs">
          {pendingCount} paiement(s) en attente
        </p>
      </div>
    </div>
  </div>
)}
```

---

## 📧 Emails Multiples

Chaque paiement peut être envoyé par email indépendamment :

### Email 1 (Acompte)
```
Objet: 💳 Votre lien de paiement comptant - 150€
Montant: 150.00€
Description: Acompte 30%
```

### Email 2 (Solde)
```
Objet: 💳 Votre lien de paiement comptant - 350€
Montant: 350.00€
Description: Solde 70%
```

Le client reçoit des emails distincts pour chaque paiement demandé.

---

## 🔔 Notifications CRM

Chaque action génère une notification :

### Création paiement
```
📧 Lien de paiement envoyé
Lien de paiement de 150€ envoyé à client@example.com
(Réf: T12345678901 - Acompte 30%)
```

### Paiement réussi
```
✅ Paiement reçu
Paiement de 150€ reçu via VISA •••• 1800
(Réf: T12345678901)
```

---

## 💡 Avantages

### Pour le Commercial

1. **Flexibilité totale**
   - Créer autant de paiements que nécessaire
   - Adapter selon la situation client

2. **Suivi précis**
   - Vue globale : total payé vs en attente
   - Historique complet de tous les paiements

3. **Gestion facile**
   - Renvoyer un email pour un paiement spécifique
   - Identifier rapidement les paiements en attente

### Pour le Client

1. **Clarté**
   - Un email par paiement
   - Montants et descriptions clairs

2. **Flexibilité**
   - Payer en plusieurs fois
   - Chaque paiement indépendant

3. **Sécurité**
   - Chaque paiement a sa propre référence unique
   - Traçabilité complète

---

## 🧪 Scénario de Test Complet

### 1. Créer le premier paiement (acompte)

```
Commercial:
1. Montant: 150€
2. Description: "Acompte 30%"
3. Clic "Envoyer par email"

Résultat:
✅ Email envoyé avec succès à client@example.com
📊 Total payé: 0€ | En attente: 150€
```

### 2. Client paie l'acompte

```
Client:
1. Ouvre l'email
2. Clique "Accéder au paiement"
3. Paie avec carte 5017 6700 0000 1800

Résultat:
✅ Paiement réussi
📊 Total payé: 150€ | En attente: 0€
Badge: "✅ Payé" avec infos carte
```

### 3. Créer le deuxième paiement (solde)

```
Commercial:
1. Le formulaire est toujours visible
2. Titre change: "Demander un paiement supplémentaire"
3. Montant: 350€
4. Description: "Solde 70%"
5. Clic "Envoyer par email"

Résultat:
✅ Email envoyé avec succès à client@example.com
📊 Total payé: 150€ | En attente: 350€
Historique: 2 paiements (#2 en attente, #1 payé)
```

### 4. Vérifier l'historique

```sql
SELECT 
  reference,
  amount,
  status,
  description,
  created_at
FROM monetico_payments
WHERE lead_id = 'uuid-du-lead'
ORDER BY created_at DESC;

-- Résultat :
-- T12345678902 | 350 | pending | Solde 70%      | 2026-02-20 15:00
-- T12345678901 | 150 | success | Acompte 30%    | 2026-02-20 14:00
```

---

## 📈 Métriques Utiles

### Dashboard commercial

```sql
-- Paiements multiples par lead
SELECT 
  l.first_name,
  l.last_name,
  COUNT(*) as nb_paiements,
  SUM(CASE WHEN mp.status = 'success' THEN mp.amount ELSE 0 END) as total_paye,
  SUM(CASE WHEN mp.status = 'pending' THEN mp.amount ELSE 0 END) as total_attente,
  SUM(mp.amount) as total_global
FROM crm_leads l
JOIN monetico_payments mp ON mp.lead_id = l.id
GROUP BY l.id, l.first_name, l.last_name
HAVING COUNT(*) > 1
ORDER BY nb_paiements DESC;
```

### Taux de conversion par type

```sql
-- Conversion acompte vs solde
SELECT 
  CASE 
    WHEN description LIKE '%Acompte%' THEN 'Acompte'
    WHEN description LIKE '%Solde%' THEN 'Solde'
    ELSE 'Autre'
  END as type_paiement,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as payes,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*),
    2
  ) as taux_conversion
FROM monetico_payments
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1;
```

---

## 🚀 Évolutions Futures Possibles

1. **Templates de paiements**
   - Preset "Acompte 30% / Solde 70%"
   - Preset "3 mensualités"
   - Calcul automatique

2. **Échéancier automatique**
   - Définir un calendrier de paiements
   - Envoi automatique des relances
   - Notifications avant échéance

3. **Réconciliation**
   - Lier plusieurs paiements à un contrat
   - Vue consolidée par contrat
   - Export comptable

4. **Règles métier**
   - Bloquer deuxième paiement si premier impayé
   - Alerte si total dépasse un seuil
   - Validation manager si montant élevé

---

## 📦 Fichiers Modifiés

### Frontend

**`MoneticoPaymentManager.tsx`** - Modifications majeures :

1. ✅ Suppression limitation paiement unique
2. ✅ Ajout badge récapitulatif (total payé/en attente)
3. ✅ Formulaire toujours visible
4. ✅ Titre dynamique du formulaire
5. ✅ Historique amélioré avec numérotation
6. ✅ Badges colorés par statut
7. ✅ Date de paiement affichée
8. ✅ Total dans header historique

### Aucune modification backend

Les edge functions existantes fonctionnent parfaitement :
- `create-monetico-payment` : Crée chaque paiement indépendamment
- `send-payment-link-monetico` : Envoie email pour chaque paiement
- `monetico-webhook` : Gère chaque retour de paiement

---

## ✅ Résultat Final

Le système permet maintenant :

1. **Création illimitée** de paiements par prospect
2. **Suivi précis** avec totaux automatiques
3. **Historique complet** avec tous les paiements
4. **Envoi email** indépendant pour chaque paiement
5. **Interface claire** avec badges colorés et numérotation

Le commercial a une **flexibilité totale** pour gérer tous les scénarios de paiement.

---

**Date :** 20 février 2026  
**Statut :** ✅ Fonctionnel et déployé  
**Build :** Réussi  
**Compatibilité :** Totale avec système existant
