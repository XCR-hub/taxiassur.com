# 🔐 Guide d'Intégration EDI Signature

## 📋 Introduction

EDI Signature est la plateforme de signature électronique de référence pour les courtiers d'assurance en France. Elle permet de gérer les signatures électroniques de contrats avec un workflow tripartite (courtier, assureur, client).

**Plateforme :** https://www.edisignature.fr/
**Éditeur :** EDICourtage (PLANETE CSCA + ABT)
**Conformité :** eIDAS, hébergement 100% France

---

## 🔑 1. Obtenir vos Identifiants API

### Étape 1 : Créer un compte EDI Signature

1. **Aller sur** : https://www.edisignature.fr/
2. **Contacter le service commercial** :
   - Email : contact@edicourtage.fr
   - Téléphone : 01 43 23 15 15
3. **Demander un compte API** pour votre cabinet de courtage
4. **Fournir vos informations** :
   - Raison sociale
   - ORIAS (obligatoire pour courtiers)
   - Coordonnées cabinet

### Étape 2 : Récupérer vos clés API

Une fois votre compte activé, vous recevrez :

```
API_KEY : edi_live_xxxxxxxxxxxxxxxxxxxxx
API_SECRET : edi_secret_yyyyyyyyyyyyyyyyy
WEBHOOK_SECRET : whsec_zzzzzzzzzzzzzzzz
ACCOUNT_ID : votre-identifiant-courtier
```

### Étape 3 : Configuration dans votre .env

```env
# EDI Signature API
VITE_EDI_SIGNATURE_API_KEY=edi_live_xxxxxxxxxxxxxxxxxxxxx
VITE_EDI_SIGNATURE_SECRET=edi_secret_yyyyyyyyyyyyyyyyy
VITE_EDI_SIGNATURE_WEBHOOK_SECRET=whsec_zzzzzzzzzzzzzzzz
VITE_EDI_SIGNATURE_ACCOUNT_ID=votre-identifiant-courtier
VITE_EDI_SIGNATURE_ENV=production  # ou "sandbox" pour tests
```

---

## 🔧 2. Architecture d'Intégration

### Workflow Signature

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   COURTIER  │────▶│ EDI Signature│────▶│   CLIENT    │
│  (Vous)     │     │   Plateforme │     │ (Signature) │
└─────────────┘     └──────────────┘     └─────────────┘
       ▲                    │                     │
       │                    │                     │
       └────────────────────┴─────────────────────┘
              Webhook de notification
```

### Endpoints API EDI Signature

**Base URL Production :** `https://api.edisignature.fr/v1`
**Base URL Sandbox :** `https://sandbox-api.edisignature.fr/v1`

**Endpoints principaux :**
- `POST /signature-requests` - Créer une demande de signature
- `GET /signature-requests/{id}` - Récupérer le statut
- `POST /signature-requests/{id}/send` - Envoyer au client
- `GET /signature-requests/{id}/download` - Télécharger le document signé
- `DELETE /signature-requests/{id}` - Annuler une demande

---

## 📝 3. Créer une Demande de Signature

### Exemple de requête API

```javascript
// Créer une demande de signature de contrat
const createSignatureRequest = async (leadData, contractPDF) => {
  const formData = new FormData();

  // Métadonnées
  formData.append('title', `Contrat Assurance Taxi - ${leadData.name}`);
  formData.append('subject', 'Signature de votre contrat d\'assurance taxi');
  formData.append('message', 'Veuillez signer votre contrat d\'assurance');

  // Signataires
  formData.append('signers[0][name]', leadData.name);
  formData.append('signers[0][email]', leadData.email);
  formData.append('signers[0][phone]', leadData.phone);
  formData.append('signers[0][order]', '1');

  // Document à signer
  formData.append('file', contractPDF);

  // Webhook de retour
  formData.append('webhook_url', 'https://votresite.com/webhooks/edi-signature');

  // Envoi à l'API EDI Signature
  const response = await fetch('https://api.edisignature.fr/v1/signature-requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EDI_API_KEY}`,
      'X-Account-Id': EDI_ACCOUNT_ID
    },
    body: formData
  });

  const result = await response.json();
  return result;
};
```

### Réponse API

```json
{
  "id": "sig_req_abc123xyz",
  "status": "pending",
  "title": "Contrat Assurance Taxi - Jean Dupont",
  "created_at": "2025-01-14T10:30:00Z",
  "expires_at": "2025-02-14T10:30:00Z",
  "signers": [
    {
      "id": "signer_1",
      "name": "Jean Dupont",
      "email": "jean.dupont@example.com",
      "status": "pending",
      "signed_at": null,
      "signature_url": "https://app.edisignature.fr/sign/token_unique_123"
    }
  ],
  "documents": [
    {
      "id": "doc_1",
      "name": "contrat-assurance-taxi.pdf",
      "status": "pending"
    }
  ],
  "webhook_url": "https://votresite.com/webhooks/edi-signature"
}
```

---

## 🔔 4. Webhooks de Notification

### Configuration Webhook

EDI Signature envoie des webhooks à chaque événement important :

**Événements disponibles :**
- `signature_request.viewed` - Document consulté par le client
- `signature_request.signed` - Document signé
- `signature_request.completed` - Toutes signatures terminées
- `signature_request.declined` - Signature refusée
- `signature_request.expired` - Demande expirée

### Exemple de payload webhook

```json
{
  "event": "signature_request.signed",
  "timestamp": "2025-01-14T11:45:00Z",
  "data": {
    "signature_request_id": "sig_req_abc123xyz",
    "signer": {
      "id": "signer_1",
      "name": "Jean Dupont",
      "email": "jean.dupont@example.com",
      "signed_at": "2025-01-14T11:45:00Z"
    },
    "document": {
      "id": "doc_1",
      "download_url": "https://api.edisignature.fr/v1/documents/doc_1/download"
    }
  },
  "signature": "sha256_hash_for_verification"
}
```

### Vérification de la signature webhook

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 💾 5. Stockage des Données

### Table Supabase : `signature_requests`

```sql
CREATE TABLE signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) NOT NULL,
  edi_request_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  title text NOT NULL,
  document_url text,
  signature_url text,
  signed_document_url text,
  viewed_at timestamptz,
  signed_at timestamptz,
  completed_at timestamptz,
  expired_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read signature requests"
  ON signature_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert signature requests"
  ON signature_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update signature requests"
  ON signature_requests FOR UPDATE
  TO authenticated
  USING (true);
```

---

## 🚀 6. Intégration dans le Backoffice

### Interface LeadManager

**Nouveau bouton "Envoyer pour Signature"** :
1. Charge le contrat PDF (ou génère à la volée)
2. Envoie à l'API EDI Signature
3. Stocke la demande dans Supabase
4. Affiche l'URL de signature
5. Envoie l'email au client avec le lien

**Suivi en temps réel :**
- Badge "En attente de signature"
- Horloge avec date d'expiration
- Notification quand signé
- Téléchargement du document signé

---

## 📧 7. Email de Notification au Client

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #4F46E5; color: white; padding: 30px; text-align: center;">
    <h1>🖊️ Signature de Votre Contrat</h1>
  </div>

  <div style="padding: 30px;">
    <p>Bonjour {{name}},</p>

    <p>Votre contrat d'assurance taxi est prêt à être signé électroniquement.</p>

    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>📄 Document :</strong> {{contract_title}}</p>
      <p><strong>⏰ Expire le :</strong> {{expiry_date}}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{signature_url}}"
         style="background: #4F46E5; color: white; padding: 15px 30px;
                text-decoration: none; border-radius: 8px; display: inline-block;
                font-weight: bold;">
        ✍️ Signer le Contrat
      </a>
    </div>

    <p style="color: #6B7280; font-size: 14px;">
      ✅ Signature 100% sécurisée via EDI Signature<br>
      ✅ Conforme eIDAS et RGPD<br>
      ✅ Hébergement en France
    </p>
  </div>

  <div style="background: #F9FAFB; padding: 20px; text-align: center;
              color: #6B7280; font-size: 12px;">
    <p>TaxiAssur - Courtier en assurance ORIAS N° 12345678</p>
  </div>
</body>
</html>
```

---

## 🔒 8. Sécurité et Conformité

### Bonnes pratiques

✅ **Stockage sécurisé des clés API**
- Variables d'environnement uniquement
- Jamais dans le code source
- Rotation régulière des secrets

✅ **Vérification des webhooks**
- Toujours vérifier la signature HMAC
- Filtrer les événements attendus
- Logger tous les webhooks reçus

✅ **RGPD et conservation**
- Informer le client de la signature électronique
- Conserver les documents signés 10 ans (réglementation assurance)
- Permettre l'accès et la suppression des données

✅ **Traçabilité**
- Logger toutes les actions
- Horodatage certifié
- Preuve de signature juridiquement valable

---

## 📊 9. Statistiques et Monitoring

### Tableaux de bord

**Métriques importantes :**
- Nombre de contrats envoyés
- Taux de signature (%)
- Délai moyen de signature
- Taux d'expiration
- Taux de refus

**Alertes à configurer :**
- Contrat non signé après 7 jours
- Contrat expirant dans 2 jours
- Signature refusée
- Erreur API EDI Signature

---

## 🧪 10. Tests et Environnement Sandbox

### Mode Test

Utilisez l'environnement sandbox pour vos tests :

```env
VITE_EDI_SIGNATURE_ENV=sandbox
VITE_EDI_SIGNATURE_API_KEY=edi_test_xxxxxxxxxxxxxxxxxxxxx
```

**Emails de test :**
- `test.signer@edisignature.fr` - Signe automatiquement
- `test.decliner@edisignature.fr` - Refuse automatiquement
- `test.expirer@edisignature.fr` - Expire après 5 minutes

### Checklist de tests

- [ ] Créer une demande de signature
- [ ] Recevoir l'email de notification
- [ ] Signer le document
- [ ] Recevoir le webhook `signature_request.signed`
- [ ] Télécharger le document signé
- [ ] Tester le refus de signature
- [ ] Tester l'expiration
- [ ] Vérifier la conformité RGPD

---

## 📞 Support et Documentation

**Contact EDI Signature :**
- 📧 Email : support@edicourtage.fr
- ☎️ Téléphone : 01 43 23 15 15
- 🌐 Site : https://www.edisignature.fr/
- 📚 Documentation : https://docs.edisignature.fr/ (accès client)

**Centre d'aide :**
- FAQ : https://www.edisignature.fr/faq
- Tutoriels vidéo disponibles après connexion
- Webinaires mensuels pour les courtiers

---

## 🎯 Résumé des Étapes

1. ✅ Créer un compte EDI Signature
2. ✅ Récupérer vos clés API
3. ✅ Configurer les variables d'environnement
4. ✅ Créer la table `signature_requests` dans Supabase
5. ✅ Intégrer l'API dans le backoffice
6. ✅ Configurer les webhooks
7. ✅ Tester en environnement sandbox
8. ✅ Déployer en production

---

## 💡 Avantages EDI Signature

✅ **Spécialisé assurance** - Workflow courtier/assureur/client
✅ **Conformité totale** - eIDAS, RGPD, hébergement France
✅ **Intégration simple** - API REST standard
✅ **Réseau établi** - 270 courtiers, 15 assureurs connectés
✅ **Support dédié** - Équipe spécialisée courtage
✅ **Tarifs adaptés** - Modèle par signature ou forfait mensuel

---

**Date de création :** 14 janvier 2025
**Version :** 1.0
**Auteur :** Documentation TaxiAssur
