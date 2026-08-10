# Système de Paiement Monetico - TaxiAssur 2026

## Vue d'ensemble

Système complet de paiement comptant via Monetico CIC intégré à l'étape 6 du pipeline commercial. Le prospect peut effectuer un paiement sécurisé avant la finalisation du contrat.

## Configuration Monetico

### Identifiants
- **TPE**: 7374133
- **Société**: taxiassur
- **Clé MAC**: [REDACTED_MONETICO_MAC_KEY]
- **Version**: 3.0
- **Langue**: FR
- **Mode**: Paiement immédiat

### URLs
- **Serveur de paiement**: https://p.monetico-services.com/paiement.cgi
- **URL de retour (webhook)**: https://[votre-projet].supabase.co/functions/v1/monetico-webhook
- **URL succès**: https://taxiassur.com/espace-prospect/paiement-success
- **URL échec**: https://taxiassur.com/espace-prospect/paiement-error

## Architecture du système

### Base de données

#### Table `monetico_payments`
```sql
CREATE TABLE monetico_payments (
  id uuid PRIMARY KEY,
  lead_id uuid REFERENCES crm_leads(id),
  reference text UNIQUE,           -- Référence unique TAXtimestamp
  transaction_id text,              -- ID retourné par Monetico
  amount numeric(10,2),             -- Montant en euros
  currency text DEFAULT 'EUR',
  status text,                      -- pending, processing, success, failed, cancelled
  payment_date timestamptz,
  card_type text,
  card_last4 text,
  authorization_number text,
  monetico_data jsonb,
  mac_sent text,                    -- MAC envoyé
  mac_received text,                -- MAC reçu pour validation
  payment_url text,
  customer_email text,
  customer_name text,
  description text,
  created_at timestamptz,
  updated_at timestamptz
);
```

### Edge Functions

#### 1. create-monetico-payment
**URL**: `/functions/v1/create-monetico-payment`

Génère un lien de paiement sécurisé Monetico.

**Requête**:
```json
{
  "leadId": "uuid",
  "amount": 500.00,
  "description": "Paiement comptant assurance taxi"
}
```

**Réponse**:
```json
{
  "success": true,
  "paymentId": "uuid",
  "reference": "TAX1706810234567",
  "paymentUrl": "https://p.monetico-services.com/paiement.cgi",
  "formData": {
    "version": "3.0",
    "TPE": "7374133",
    "montant": "500.00EUR",
    "reference": "TAX1706810234567",
    "MAC": "calculated_mac",
    ...
  },
  "htmlForm": "<html>...</html>"
}
```

**Processus**:
1. Récupère les infos du lead
2. Génère une référence unique
3. Calcule le MAC (HMAC-SHA1)
4. Crée l'enregistrement en base
5. Génère le formulaire HTML de redirection
6. Retourne les données pour redirection automatique

#### 2. monetico-webhook
**URL**: `/functions/v1/monetico-webhook`

Reçoit les notifications de paiement de Monetico.

**Paramètres POST** (form-data):
- `reference`: Référence de la transaction
- `montant`: Montant + devise (ex: 500.00EUR)
- `code_retour`: paiement, payetest, Annulation
- `cvx`: Contrôle CVV
- `motifrefus`: Raison du refus si échec
- `numauto`: Numéro d'autorisation
- `date`: Date de transaction
- `TPE`: Numéro TPE
- `MAC`: Signature pour validation
- `brand`: Type de carte
- `modepaiement`: Mode de paiement avec 4 derniers chiffres

**Processus**:
1. Valide le MAC reçu
2. Récupère le paiement par référence
3. Met à jour le statut
4. Crée une notification pour les admins
5. Ajoute une entrée timeline
6. Répond à Monetico: `version=2\ncdr=0`

### Composants Frontend

#### MoneticoPaymentManager
**Emplacement**: `src/components/crm/MoneticoPaymentManager.tsx`

Composant React pour gérer les paiements Monetico dans le CRM.

**Props**:
```typescript
{
  leadId: string;
  onPaymentSuccess?: () => void;
}
```

**Fonctionnalités**:
- Affichage de l'historique des paiements
- Création de nouveaux paiements
- Mise à jour en temps réel via Supabase Realtime
- Envoi automatique des emails au prospect
- Gestion des statuts (pending, success, failed)

#### Intégration dans PaiementRIBStep
Le composant est intégré dans l'étape 6 du pipeline commercial.

```tsx
<MoneticoPaymentManager
  leadId={leadId}
  onPaymentSuccess={onComplete}
/>
```

### Pages de retour

#### PaiementSuccess
**Route**: `/espace-prospect/paiement-success`

Page affichée après un paiement réussi.

**Paramètres URL**:
- `reference`: Référence de la transaction
- `montant`: Montant payé
- `token`: Token d'accès prospect (optionnel)

#### PaiementError
**Route**: `/espace-prospect/paiement-error`

Page affichée après un paiement échoué.

**Paramètres URL**:
- `reference`: Référence de la transaction
- `motifrefus`: Raison du refus
- `token`: Token d'accès prospect (optionnel)

## Flux de paiement complet

### 1. Création du paiement (Commercial)

```
Commercial (CRM)
  → Saisit le montant
  → Clique sur "Créer le lien de paiement"
  → Edge Function create-monetico-payment
  → Enregistrement en base (status: pending)
  → Génération du formulaire Monetico
  → Ouverture nouvelle fenêtre vers Monetico
  → Email automatique envoyé au prospect
```

### 2. Paiement par le prospect

```
Prospect
  → Reçoit l'email avec le lien
  → Clique sur le lien
  → Redirigé vers Monetico
  → Saisit ses coordonnées bancaires
  → Valide le paiement
  → Monetico traite le paiement
```

### 3. Retour du paiement

```
Monetico
  → Envoie notification webhook
  → Edge Function monetico-webhook
  → Validation du MAC
  → Mise à jour du statut en base
  → Création notification admin
  → Ajout timeline lead
  → Redirection prospect vers page succès/erreur
```

### 4. Notification et suivi

```
Système
  → Notification temps réel CRM
  → Email confirmation prospect
  → Débloquage étape 7 si succès
  → Mise à jour automatique du pipeline
```

## Calcul du MAC (Message Authentication Code)

Le MAC est calculé avec HMAC-SHA1 pour sécuriser les échanges.

### Pour l'envoi du paiement
```javascript
const macString = `${version}*${tpe}*${date}*${montant}*${reference}*${texteLibre}*${version}*${langue}*${societe}*${mail}*${urlRetour}*${urlOK}*${urlKO}`;

const mac = HMAC_SHA1(macString, macKey);
```

### Pour la validation du retour
```javascript
const macString = `${TPE}*${date}*${montant}*${reference}*${code_retour}*${cvx}*${motifrefus}*${authentification}*${numauto}`;

const calculatedMAC = HMAC_SHA1(macString, macKey);
if (calculatedMAC === receivedMAC) {
  // Paiement valide
}
```

## Sécurité

### Validation des paiements
1. **Validation du MAC**: Vérification cryptographique de l'authenticité
2. **Vérification de la référence**: Unicité et existence en base
3. **Statut idempotent**: Évite les doubles traitements
4. **RLS Supabase**: Contrôle d'accès aux données

### Protection des données
- Clé MAC stockée dans les variables d'environnement
- Pas de stockage des données bancaires complètes
- Logs sécurisés sans informations sensibles
- HTTPS obligatoire pour tous les échanges

## Gestion des erreurs

### Codes de retour Monetico
- `paiement`: Paiement accepté
- `payetest`: Paiement test accepté
- `Annulation`: Paiement annulé par le porteur
- Autres: Refus (voir motifrefus)

### Motifs de refus courants
- Solde insuffisant
- Carte expirée ou invalide
- Limite dépassée
- Erreur de saisie
- Refus banque émettrice

### Gestion applicative
```typescript
try {
  // Création paiement
} catch (error) {
  // Log l'erreur
  // Notification admin
  // Message utilisateur
}
```

## Tests

### Mode test Monetico
Utilisez ces cartes de test:
- **Visa**: 4000000000000000
- **Mastercard**: 5000000000000000
- **CVV**: 123
- **Date**: N'importe quelle date future

### Tests edge functions
```bash
# Test création paiement
curl -X POST https://[projet].supabase.co/functions/v1/create-monetico-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [anon-key]" \
  -d '{"leadId":"uuid","amount":100.00}'

# Test webhook
curl -X POST https://[projet].supabase.co/functions/v1/monetico-webhook \
  -d "reference=TAX123&montant=100.00EUR&code_retour=paiement..."
```

## Monitoring et logs

### Événements trackés
1. Création du paiement
2. Ouverture du lien de paiement
3. Validation/refus par Monetico
4. Webhook reçu
5. Erreurs et tentatives échouées

### Dashboard analytics
Accès via le CRM:
- Nombre de paiements par statut
- Montant total collecté
- Taux de conversion
- Temps moyen de traitement
- Raisons de refus principales

## Maintenance

### Renouvellement clé MAC
1. Obtenir nouvelle clé depuis l'espace Monetico
2. Mettre à jour la variable d'environnement
3. Redéployer les edge functions
4. Tester avec un paiement test

### Changement d'URLs
1. Mettre à jour les constantes dans `create-monetico-payment/index.ts`
2. Déployer la fonction
3. Mettre à jour les URLs dans l'espace Monetico

## Support et documentation

### Ressources Monetico
- Documentation API: https://www.monetico-paiement.fr/documentation/
- Support technique: support@monetico.fr
- Espace marchand: https://www.monetico-services.com/

### Logs Supabase
```sql
-- Voir les paiements récents
SELECT * FROM monetico_payments
ORDER BY created_at DESC
LIMIT 10;

-- Statistiques par statut
SELECT status, COUNT(*), SUM(amount)
FROM monetico_payments
GROUP BY status;

-- Paiements échoués
SELECT * FROM monetico_payments
WHERE status = 'failed'
ORDER BY created_at DESC;
```

## Évolutions futures

### Améliorations prévues
1. Paiements récurrents (abonnements)
2. Remboursements depuis le CRM
3. Export comptable automatique
4. Rapprochement bancaire
5. Multi-devises
6. Paiements fractionnés

### Optimisations
1. Cache des paiements côté client
2. Compression des webhooks
3. Rate limiting intelligent
4. Retry automatique en cas d'échec réseau
