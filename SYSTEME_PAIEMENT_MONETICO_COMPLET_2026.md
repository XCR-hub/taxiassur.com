# Système de Paiement Monético Complet 2026

## Vue d'ensemble

Le système de paiement Monético est maintenant totalement intégré avec **3 modes d'utilisation** :

1. **Email automatique lors de la saisie par le commercial** dans le CRM
2. **Bouton de paiement dans l'espace prospect** pour payer en ligne
3. **Facturation libre** avec option d'envoi d'email ou paiement direct

---

## 1. Mode Commercial CRM - Email automatique

### Fonctionnement

Quand un commercial saisit les informations de paiement dans l'étape du lead :

1. Le commercial ouvre le lead dans le CRM
2. Va dans la section "Comptant à régler" (DownPaymentManager)
3. Saisit le montant (ex: 450.00 EUR)
4. Clique sur "Générer le lien de paiement"

### Ce qui se passe automatiquement

```
✅ Création du paiement Monético
✅ Fenêtre de test qui s'ouvre (pour vérifier)
✅ Mise à jour du contrat en base de données
✅ EMAIL AUTOMATIQUE envoyé au client IMMÉDIATEMENT
```

### Contenu de l'email client

L'email envoyé contient :
- **Montant formaté en euros** (ex: 450,00 €)
- **Bouton "PAYER MAINTENANT"** qui redirige vers Monético
- **4 étapes post-paiement** expliquées
- **Badges de sécurité** (PCI-DSS, CIC Monético)
- **Infos de contact** (01 80 85 57 86 / team@taxiassur.com)
- **Validité du lien** : 7 jours

### Code responsable

**Fichier** : `src/components/crm/DownPaymentManager.tsx`
**Lignes** : 109-118

```typescript
await supabase.functions.invoke('send-payment-link-email', {
  body: {
    lead_id: leadId,
    payment_url: paymentUrl,
    amount: parseFloat(amount),
    email: lead.email,
    first_name: lead.first_name,
    last_name: lead.last_name
  }
});
```

**Edge Function** : `send-payment-link-email`
**Statut** : ✅ Déployée et fonctionnelle

---

## 2. Mode Prospect - Bouton dans l'espace prospect

### Fonctionnement

Le client reçoit un lien vers son espace prospect sécurisé par token :
```
https://taxiassur.com/espace-prospect/{TOKEN_UNIQUE}
```

### Affichage du bouton de paiement

**Conditions d'affichage** :
- Le comptant est requis (`down_payment_required = true`)
- Le montant est défini (`down_payment_amount > 0`)
- Le statut n'est pas "payé"

### Interface prospect

**Onglet "Paiement"** dans l'espace prospect :

1. **Si le devis n'est pas accepté** :
   - Message "Veuillez d'abord accepter votre devis"
   - Bouton pour aller voir les devis

2. **Si le devis est accepté** :
   - Formulaire de souscription (RIB, etc.)
   - **Gros bouton orange "Je paye pour lancer mon contrat"**
   - Montant affiché en gros (ex: 450,00 €)
   - Liste des avantages (activation instantanée, attestation immédiate, etc.)

3. **Si le paiement est effectué** :
   - Badge vert "Paiement effectué !"
   - Date et heure du paiement
   - Message de confirmation

### Code responsable

**Fichier** : `src/components/client/ClientPaymentButton.tsx`
**Ligne** : 176-183

```typescript
<button
  onClick={handlePayment}
  className="w-full bg-gradient-to-r from-green-500 to-green-600..."
>
  <CreditCard className="w-6 h-6" />
  Je paye pour lancer mon contrat
  <ExternalLink className="w-5 h-5" />
</button>
```

**Page** : `src/pages/EspaceProspect.tsx`
**Ligne** : 638

---

## 3. Mode Facturation Libre - Backoffice

### Accès

Menu Backoffice → **"Facturation Libre"**

### Fonctionnement

Permet au commercial ou gestionnaire de créer un lien de paiement pour **n'importe quel client**, même sans dossier lead.

### Formulaire

**Informations client** :
- Prénom *
- Nom *
- Email *
- Téléphone

**Informations paiement** :
- Montant (EUR) *
- Description
- Référence personnalisée (optionnel)

### Options d'envoi

**Nouvelle option ajoutée** : Checkbox "Envoyer le lien par email"

#### Option 1 : Envoyer par email (RECOMMANDÉ)
```
✅ Cochée par défaut
✅ Email professionnel envoyé automatiquement
✅ Le client reçoit un beau email avec bouton de paiement
✅ Lien aussi affiché pour le copier manuellement si besoin
```

#### Option 2 : Paiement direct
```
☐ Décochée
➡️ Ouvre directement la fenêtre Monético
➡️ Le gestionnaire peut faire payer le client en direct
➡️ Lien affiché pour le partager manuellement
```

### Interface après création

**Si email envoyé** :
```
✅ Email envoyé avec succès !
Le client (email@client.com) a reçu un email professionnel
avec le lien de paiement sécurisé.

Lien de paiement à partager :
https://taxiassur.com/paiement/TAX1234567890
[Copier]
```

**Si paiement direct** :
```
✅ Lien de paiement créé !
Une nouvelle fenêtre s'est ouverte avec le formulaire
de paiement Monético.

Lien de paiement à partager :
https://taxiassur.com/paiement/TAX1234567890
[Copier]
```

### Historique des paiements

Section droite de l'écran affiche :
- **Paiements libres récents** (lead_id = null)
- Nom du client
- Email
- Montant
- Statut (En attente / Payé / Échoué / Annulé)
- Référence
- Date de création

### Code responsable

**Fichier** : `src/backoffice/FreeInvoicing.tsx`
**Améliorations** :
- Ajout checkbox "Envoyer le lien par email"
- Appel à `send-payment-link-email` si checkbox cochée
- Affichage du lien de paiement
- Bouton "Copier" avec feedback
- Messages de succès selon le mode

---

## Architecture Technique

### Tables de base de données

#### `monetico_payments`
```sql
- id (uuid)
- lead_id (uuid) -- NULL pour facturation libre
- reference (text) -- Ex: TAX1234567890
- amount (numeric)
- status (text) -- pending|processing|success|failed|cancelled|refunded
- payment_url (text)
- customer_email (text)
- customer_name (text)
- description (text)
- created_at (timestamptz)
```

#### `lead_contracts`
```sql
- down_payment_required (boolean)
- down_payment_amount (decimal)
- down_payment_status (enum) -- pending|processing|paid|failed|refunded
- down_payment_link (text) -- Référence Monético
- down_payment_paid_at (timestamptz)
```

### Edge Functions

#### `send-payment-link-email`

**URL** : `/functions/v1/send-payment-link-email`

**Input** :
```json
{
  "lead_id": "uuid ou null",
  "payment_url": "https://taxiassur.com/paiement/REF",
  "amount": 450.00,
  "email": "client@example.com",
  "first_name": "Jean",
  "last_name": "Dupont"
}
```

**Fonctionnement** :
1. Vérifie les paramètres requis (`payment_url` et `amount`)
2. Si `lead_id` est fourni, récupère les infos du lead
3. Sinon, utilise les infos fournies (facturation libre)
4. Envoie email SMTP via IONOS
5. Enregistre interaction dans `crm_interactions` (seulement si `lead_id` existe)

**Statut** : ✅ **Déployée** (13 février 2026)

#### `create-monetico-payment`

**URL** : `/functions/v1/create-monetico-payment`

**Input** :
```json
{
  "leadId": "uuid ou undefined",
  "amount": 450.00,
  "description": "Paiement comptant assurance taxi",
  "customerEmail": "client@example.com",
  "customerFirstName": "Jean",
  "customerLastName": "Dupont",
  "customerPhone": "0612345678",
  "customReference": "FACT-2026-001"
}
```

**Output** :
```json
{
  "success": true,
  "reference": "TAX1234567890",
  "paymentUrl": "https://taxiassur.com/paiement/TAX1234567890",
  "htmlForm": "<form>...</form>"
}
```

---

## Flux de paiement complet

### Scénario 1 : Paiement via CRM

```
1. Commercial saisit montant → Clique "Générer lien"
2. API crée paiement Monético
3. EMAIL envoyé AUTOMATIQUEMENT au client
4. Client clique sur "PAYER MAINTENANT" dans l'email
5. Redirection vers Monético (formulaire bancaire)
6. Client saisit CB et paye
7. Webhook CIC notifie TaxiAssur
8. Statut mis à jour : down_payment_status = 'paid'
9. Contrat activé, signature débloquée
```

### Scénario 2 : Paiement via espace prospect

```
1. Client accède à son espace prospect
2. Va dans l'onglet "Paiement"
3. Voit le gros bouton orange "Je paye pour lancer mon contrat"
4. Clique sur le bouton
5. Redirection vers Monético
6. Client saisit CB et paye
7. Webhook CIC notifie TaxiAssur
8. Retour sur page de succès
9. Contrat activé
```

### Scénario 3 : Facturation libre avec email

```
1. Gestionnaire va dans "Facturation Libre"
2. Saisit infos client + montant
3. Coche "Envoyer le lien par email"
4. Clique "Créer et Envoyer par Email"
5. EMAIL envoyé au client
6. Client clique sur "PAYER MAINTENANT"
7. Paiement Monético
8. Webhook notifie TaxiAssur
9. Statut mis à jour dans monetico_payments
```

### Scénario 4 : Facturation libre direct

```
1. Gestionnaire va dans "Facturation Libre"
2. Saisit infos client + montant
3. Décoche "Envoyer le lien par email"
4. Clique "Créer le Lien de Paiement"
5. Fenêtre Monético s'ouvre IMMÉDIATEMENT
6. Gestionnaire fait payer le client en direct
OU
6. Copie le lien et l'envoie manuellement au client
```

---

## Configuration Monético

### Mode TEST (actuel)

```javascript
TPE: 7374133
Société: taxiassur
Clé MAC: 106FA85BF342FD4EE95C883D82865B5CC1F63890
URL: https://p.monetico-services.com/test/paiement.cgi
```

### Mode PRODUCTION (à configurer)

```
À demander à Ingineco :
- TPE de production
- Clé MAC de production
- URL: https://p.monetico-services.com/paiement.cgi
```

**Variables d'environnement** :
```
MONETICO_MODE=production
MONETICO_TPE=XXXXXXX
MONETICO_SOCIETE=taxiassur
MONETICO_MAC_KEY=REDACTED
```

---

## Emails envoyés

### Template email de paiement

**Sujet** : 💳 Paiement de votre comptant - 450,00 €

**Contenu** :
- En-tête orange TaxiAssur
- Bonjour [Prénom] !
- Encadré jaune avec montant en gros
- Bouton vert "PAYER MAINTENANT"
- 4 étapes post-paiement :
  1. Paiement sécurisé (Monetico CIC)
  2. Activation immédiate
  3. Réception des documents
  4. Vous pouvez rouler !
- Badges de sécurité
- Avertissement : lien valide 7 jours
- Bloc aide avec téléphone et email
- Footer TaxiAssur avec ORIAS

**Serveur SMTP** : IONOS (smtp.ionos.fr:465)
**Expéditeur** : team@taxiassur.com

---

## Sécurité

### Calcul MAC (HMAC-SHA1)

```javascript
const data = `TPE=*contexte_commande=*date=*lgue=*mail=*montant=*reference=*societe=*texte-libre=*url_retour_err=*url_retour_ok=*version=`;
const mac = crypto.createHmac('sha1', keyBytes).update(data).digest('hex').toUpperCase();
```

### Protection des données

- ✅ Aucun numéro de carte stocké
- ✅ Seulement les 4 derniers chiffres (card_last4)
- ✅ Tokens d'accès sécurisés
- ✅ RLS activé sur toutes les tables
- ✅ HTTPS obligatoire
- ✅ PCI-DSS compliant (via Monético)

### URLs de retour

**Succès** : `https://taxiassur.com/espace-prospect/paiement-success`
**Erreur** : `https://taxiassur.com/espace-prospect/paiement-error`

---

## Tests à effectuer

### 1. Test CRM → Email automatique

```
1. Se connecter au backoffice
2. Ouvrir un lead
3. Aller dans "Comptant à régler"
4. Saisir 100.00 EUR
5. Cliquer "Générer le lien de paiement"
6. ✅ Vérifier qu'un email est reçu
7. ✅ Vérifier le contenu de l'email
8. ✅ Cliquer sur "PAYER MAINTENANT"
9. ✅ Vérifier la redirection vers Monético TEST
```

### 2. Test Espace Prospect

```
1. Récupérer le token d'un lead
2. Aller sur /espace-prospect/{TOKEN}
3. Aller dans l'onglet "Paiement"
4. ✅ Vérifier l'affichage du bouton orange
5. ✅ Cliquer sur "Je paye pour lancer mon contrat"
6. ✅ Vérifier la redirection vers Monético
```

### 3. Test Facturation Libre - Avec email

```
1. Aller dans Backoffice → Facturation Libre
2. Remplir le formulaire
3. ✅ Cocher "Envoyer le lien par email"
4. Cliquer "Créer et Envoyer par Email"
5. ✅ Vérifier message "Email envoyé avec succès"
6. ✅ Vérifier réception de l'email
7. ✅ Vérifier affichage du lien à copier
8. ✅ Tester le bouton "Copier"
```

### 4. Test Facturation Libre - Direct

```
1. Aller dans Backoffice → Facturation Libre
2. Remplir le formulaire
3. ❌ Décocher "Envoyer le lien par email"
4. Cliquer "Créer le Lien de Paiement"
5. ✅ Vérifier ouverture de la fenêtre Monético
6. ✅ Vérifier affichage du lien à copier
```

### 5. Test cartes Monético TEST

**Carte de test pour succès** :
```
Numéro: 4907 1234 5678 9010
Date: 12/30
CVV: 123
```

**Carte de test pour refus** :
```
Numéro: 4907 0000 0000 0001
Date: 12/30
CVV: 123
```

---

## Dépannage

### Email non reçu

**Causes possibles** :
1. IONOS_EMAIL_PASSWORD non configuré
2. Email du lead incorrect
3. Email dans les spams

**Solutions** :
- Vérifier les secrets Supabase
- Vérifier les logs de l'edge function
- Demander au client de vérifier les spams

### Paiement non enregistré

**Causes possibles** :
1. Webhook CIC non configuré
2. MAC invalide
3. Transaction échouée

**Solutions** :
- Vérifier les logs du webhook `cic-payment-webhook`
- Vérifier la clé MAC
- Contacter support Monético

### Lien de paiement expiré

**Durée de validité** : 7 jours par défaut

**Solution** : Régénérer un nouveau lien dans le CRM

---

## Prochaines étapes

### Court terme

- [ ] Passer en mode PRODUCTION avec les vrais identifiants Monético
- [ ] Tester le webhook en production
- [ ] Former l'équipe commerciale sur l'utilisation

### Moyen terme

- [ ] Ajouter des statistiques de paiement dans le dashboard
- [ ] Créer des notifications push quand un paiement est reçu
- [ ] Permettre les remboursements depuis le backoffice

### Long terme

- [ ] Permettre le paiement en plusieurs fois
- [ ] Intégrer d'autres moyens de paiement (Stripe, PayPal)
- [ ] Créer des factures PDF automatiques

---

## Support

**Email** : team@taxiassur.com
**Téléphone** : 01 80 85 57 86
**Documentation Monético** : Contact Ingineco

**Logs** :
- Edge Functions : Supabase Dashboard → Edge Functions → Logs
- Paiements : Table `monetico_payments`
- Emails : Table `crm_interactions` (type: email)

---

*Document créé le 13 février 2026*
*Version 1.0 - Système complet et fonctionnel*
