# 🚀 Démarrage Rapide EDI Signature

## 📌 Résumé en 3 Étapes

### ✅ Étape 1 : Obtenir vos Identifiants

1. **Contactez EDI Signature** :
   - 📧 Email : contact@edicourtage.fr
   - ☎️ Téléphone : 01 43 23 15 15
   - 🌐 Site : https://www.edisignature.fr/

2. **Demandez un compte API** :
   - Précisez que vous êtes courtier en assurance
   - Fournissez votre numéro ORIAS
   - Demandez les accès API ET sandbox pour tests

3. **Récupérez vos clés** (vous recevrez par email) :
   ```
   API_KEY : edi_live_xxxxxxxxxxxxxxxxxxxxx
   API_SECRET : edi_secret_yyyyyyyyyyyyyyyyy
   WEBHOOK_SECRET : whsec_zzzzzzzzzzzzzzzz
   ACCOUNT_ID : votre-identifiant-courtier
   ```

---

### ✅ Étape 2 : Configurer dans votre .env

Ajoutez ces lignes dans votre fichier `.env` (ou `public/env-config.js` pour IONOS) :

```javascript
// EDI Signature
VITE_EDI_SIGNATURE_API_KEY: 'edi_live_xxxxxxxxxxxxxxxxxxxxx',
VITE_EDI_SIGNATURE_SECRET: 'edi_secret_yyyyyyyyyyyyyyyyy',
VITE_EDI_SIGNATURE_ACCOUNT_ID: 'votre-identifiant-courtier',
VITE_EDI_SIGNATURE_ENV: 'sandbox',  // Commencer en sandbox pour tests
VITE_EDI_SIGNATURE_WEBHOOK_SECRET: 'whsec_zzzzzzzzzzzzzzzz',
```

**⚠️ Mode Sandbox pour débuter :**
- Utilisez `sandbox` pour tester
- Les signatures ne sont pas juridiquement valables
- Passez à `production` une fois les tests OK

---

### ✅ Étape 3 : Créer la Table dans Supabase

Exécutez cette migration dans Supabase SQL Editor :

**Aller sur :** https://supabase.com/dashboard/project/VOTRE_PROJECT/sql

**Copier-coller le fichier :**
`supabase/migrations/20251014040000_create_signature_requests_table.sql`

Ou exécutez directement :

```sql
CREATE TABLE IF NOT EXISTS signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
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
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

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
  USING (true)
  WITH CHECK (true);
```

---

## 🎯 Comment Utiliser

### Dans le Backoffice

1. **Aller sur** : `/backoffice/leads`
2. **Cliquer sur un lead**
3. **Descendre jusqu'à** : "Signature Électronique"
4. **Uploader un PDF** du contrat
5. **Cliquer sur** : "Envoyer pour Signature"

### Le Client Reçoit

✅ Un email automatique avec :
- Titre du contrat
- Bouton "Signer le Contrat"
- Lien sécurisé EDI Signature
- Date d'expiration (30 jours)

### Suivi en Temps Réel

📊 Vous voyez dans le backoffice :
- ⏳ **En attente** - Document envoyé, pas encore consulté
- 👁️ **Consulté** - Client a ouvert le document
- ✍️ **Signé** - Signature effectuée
- ✅ **Terminé** - Processus complet
- ❌ **Refusé** - Client a décliné
- ⏰ **Expiré** - Délai dépassé

---

## 🧪 Mode Test (Sandbox)

### Emails de Test

EDI Signature fournit des emails pour tester :

```
test.signer@edisignature.fr     → Signe automatiquement
test.decliner@edisignature.fr   → Refuse automatiquement
test.expirer@edisignature.fr    → Expire après 5 minutes
```

### Workflow de Test

1. Créer un lead de test avec email `test.signer@edisignature.fr`
2. Uploader un PDF de test
3. Envoyer pour signature
4. ✅ La signature se fait automatiquement
5. Télécharger le document signé

---

## 🔄 Passer en Production

Une fois vos tests OK :

1. **Modifier dans .env** :
   ```javascript
   VITE_EDI_SIGNATURE_ENV: 'production',  // Au lieu de 'sandbox'
   ```

2. **Utiliser vos vraies clés** :
   ```javascript
   VITE_EDI_SIGNATURE_API_KEY: 'edi_live_VOTRE_VRAIE_CLE',
   ```

3. **Rebuilder** :
   ```bash
   npm run build
   ```

4. **Uploader sur IONOS**

---

## 📧 Configuration Email Client

Le template d'email est automatique, mais vous pouvez le personnaliser dans EDI Signature :

1. **Connexion** : https://app.edisignature.fr/
2. **Paramètres** → **Templates Email**
3. **Modifier le template** avec votre logo et texte

**Variables disponibles :**
- `{{client_name}}` - Nom du client
- `{{contract_title}}` - Titre du contrat
- `{{expiry_date}}` - Date d'expiration
- `{{signature_url}}` - Lien de signature

---

## 💰 Tarifs EDI Signature

**2 modèles :**

1. **Pay-as-you-go** : ~1-2€ par signature
2. **Forfait mensuel** : À partir de 50€/mois (signatures illimitées)

Contactez EDI Signature pour négocier selon votre volume.

---

## 🆘 Problèmes Fréquents

### "EDI Signature non configuré"

✅ **Solution** :
1. Vérifier que les clés sont dans `.env` ou `env-config.js`
2. Vérifier qu'elles commencent par `edi_live_` ou `edi_test_`
3. Rebuilder et recharger la page

### "Erreur 401 Unauthorized"

✅ **Solution** :
1. Vérifier que votre API_KEY est valide
2. Vérifier que votre ACCOUNT_ID est correct
3. Contacter le support EDI Signature

### "Le client ne reçoit pas l'email"

✅ **Solution** :
1. Vérifier l'email du lead (pas de typo)
2. Vérifier les spams du client
3. Vérifier que l'envoi automatique est activé dans EDI Signature

### "Document non signé après envoi"

✅ **Solution** :
1. Le client a 30 jours pour signer
2. Relancer le client par email/téléphone
3. Renvoyer une nouvelle demande si expirée

---

## 📊 Statistiques Disponibles

Dans le backoffice, vous verrez :

- 📤 **Demandes envoyées** : Nombre total
- ⏳ **En attente** : Non signés
- ✅ **Signés** : Complétés avec succès
- ❌ **Refusés** : Déclinés par client
- ⏰ **Expirés** : Dépassés sans signature
- ⏱️ **Délai moyen** : Temps entre envoi et signature

---

## 🔒 Conformité et Sécurité

✅ **EDI Signature est conforme** :
- 🇪🇺 eIDAS (règlement européen)
- 🇫🇷 Hébergement France (données)
- 🔐 Certificat électronique
- ⚖️ Valeur juridique garantie
- 🛡️ RGPD compliant

**Votre responsabilité :**
- Informer le client de la signature électronique
- Conserver les documents signés 10 ans (assurance)
- Permettre l'accès aux documents signés

---

## 📚 Documentation Complète

Pour plus de détails, consultez :

📖 **GUIDE-INTEGRATION-EDI-SIGNATURE.md** - Guide technique complet

---

## 📞 Support

**EDI Signature :**
- 📧 support@edicourtage.fr
- ☎️ 01 43 23 15 15
- 🌐 https://www.edisignature.fr/faq

**Votre équipe technique :**
- Consultez les logs dans la console navigateur
- Vérifiez les erreurs dans Supabase
- Testez en mode sandbox d'abord

---

## ✅ Checklist Avant Démarrage

- [ ] Compte EDI Signature créé
- [ ] Clés API reçues par email
- [ ] Clés ajoutées dans .env ou env-config.js
- [ ] Table `signature_requests` créée dans Supabase
- [ ] Tests effectués en mode sandbox
- [ ] Premier contrat envoyé avec succès
- [ ] Document signé téléchargé
- [ ] Passage en production configuré

---

**Prêt à démarrer !** 🎉

Commencez en mode sandbox, faites quelques tests, puis passez en production.

**Date de création :** 14 janvier 2025
**Version :** 1.0
