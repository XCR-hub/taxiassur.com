# Secrets Supabase - Configuration Complète 2026

## Variables d'environnement Frontend (.env)

```bash
VITE_SUPABASE_URL=https://qiavtxpaznxpttkdaevy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXZ0eHBhem54cHR0a2RhZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njg1ODUsImV4cCI6MjA4NjU0NDU4NX0.FvEbDxwQy8tsTgeGr4skoJh2KXWJldlSm1RIhoDPY5g
```

---

## Secrets Supabase Edge Functions

### 1. Secrets Système Supabase (Auto-configurés)

Ces secrets sont **automatiquement configurés** par Supabase et disponibles dans toutes les Edge Functions :

```bash
SUPABASE_URL=https://qiavtxpaznxpttkdaevy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret_automatique>
SUPABASE_ANON_KEY=<secret_automatique>
```

**Utilisé dans** : Toutes les Edge Functions qui accèdent à la base de données

---

### 2. Secrets Monético CIC (Paiement)

#### Mode TEST (actuel)

```bash
MONETICO_MODE=test
MONETICO_TEST_TPE=7374133
MONETICO_TEST_SOCIETE=taxiassur
MONETICO_TEST_MAC_KEY=106FA85BF342FD4EE95C883D82865B5CC1F63890
```

#### Mode PRODUCTION (à configurer)

```bash
MONETICO_MODE=production
MONETICO_TPE=<À_DEMANDER_À_INGINECO>
MONETICO_SOCIETE=taxiassur
MONETICO_MAC_KEY=REDACTED
MONETICO_URL=https://p.monetico-services.com/paiement.cgi
```

**Utilisé dans** :
- `create-monetico-payment/index.ts`
- `create-monetico-payment/index-with-secrets.ts`
- `monetico-webhook/index.ts`
- `cic-payment-webhook/index.ts`

**Statut** : ✅ Configuré en mode TEST, ⚠️ Attente identifiants PRODUCTION

---

### 3. Secrets IONOS (Emails SMTP/IMAP)

```bash
# SMTP (Envoi d'emails)
IONOS_SMTP_HOST=smtp.ionos.fr
IONOS_SMTP_PORT=465
IONOS_EMAIL_USER=team@taxiassur.com
IONOS_EMAIL_PASSWORD=REDACTED

# IMAP (Réception d'emails)
IONOS_IMAP_HOST=imap.ionos.fr
IONOS_IMAP_PORT=993
```

**Utilisé dans** :
- `send-email-ionos/index.ts`
- `send-quote-email/index.ts`
- `send-client-access/index.ts`
- `send-payment-link-email/index.ts`
- `send-lead-notification/index.ts`
- `send-email-universal/index.ts`
- `process-lead-queue/index.ts`
- `sync-ionos-imap-v2/index.ts`
- `sync-ionos-imap/index.ts`
- `fetch-email-replies/index.ts`

**Statut** : ⚠️ **IONOS_EMAIL_PASSWORD requis**

---

### 4. Secrets Brevo (Alternative emails)

```bash
BREVO_API_KEY=<SECRET_REQUIS>
BREVO_SENDER_EMAIL=team@taxiassur.com
BREVO_SENDER_NAME=TaxiAssur
```

**Utilisé dans** :
- `send-email/index.ts`
- `relance-engine/index.ts`
- `send-crm-email/index.ts`

**Statut** : ⚠️ **Optionnel** (IONOS est le système principal)

---

### 5. Secrets Twilio (SMS & WhatsApp)

```bash
TWILIO_ACCOUNT_SID=<SECRET_REQUIS>
TWILIO_AUTH_TOKEN=REDACTED
TWILIO_MESSAGING_SERVICE_SID=<SECRET_REQUIS>
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Utilisé dans** :
- `send-sms/index.ts`
- `send-whatsapp/index.ts`
- `twilio-webhook/index.ts`

**Statut** : ⚠️ **Optionnel** (si vous utilisez SMS/WhatsApp)

---

### 6. Secrets OpenAI (Intelligence Artificielle)

```bash
OPENAI_API_KEY=<SECRET_REQUIS>
```

**Utilisé dans** :
- `chatbot/index.ts`
- `llm-brain/index.ts`
- `llm-rag-agent/index.ts`
- `ia-council/index.ts`
- `llm-autonomous-orchestrator/index.ts`
- `ai-email-responder/index.ts`
- `ai-pattern-analyzer/index.ts`
- `generate-seo-content/index.ts`

**Statut** : ⚠️ **Requis pour les fonctionnalités IA**

---

### 7. Secrets Pexels (Images)

```bash
PEXELS_API_KEY=<SECRET_REQUIS>
```

**Utilisé dans** :
- `news-auto-publisher/index.ts`
- `generate-seo-content/index.ts`

**Statut** : ⚠️ **Optionnel** (pour génération automatique d'images)

---

### 8. Secrets SendGrid (Alternative emails)

```bash
SENDGRID_API_KEY=<SECRET_REQUIS>
```

**Utilisé dans** :
- `sync-sendgrid-emails/index.ts`

**Statut** : ⚠️ **Optionnel** (alternative à IONOS/Brevo)

---

### 9. Secrets LinkedIn (Réseaux sociaux)

```bash
LINKEDIN_ACCESS_TOKEN=<SECRET_REQUIS>
LINKEDIN_CLIENT_ID=<SECRET_REQUIS>
LINKEDIN_CLIENT_SECRET=<SECRET_REQUIS>
```

**Utilisé dans** :
- `linkedin-scraper/index.ts`
- `linkedin-publisher/index.ts`
- `linkedin-oauth-exchange/index.ts`

**Statut** : ⚠️ **Optionnel** (pour publication LinkedIn automatique)

---

### 10. Secrets Pinterest (Réseaux sociaux)

```bash
PINTEREST_ACCESS_TOKEN=<SECRET_REQUIS>
PINTEREST_CLIENT_ID=<SECRET_REQUIS>
PINTEREST_CLIENT_SECRET=<SECRET_REQUIS>
```

**Utilisé dans** :
- `pinterest-publisher/index.ts`
- `pinterest-oauth-exchange/index.ts`

**Statut** : ⚠️ **Optionnel** (pour publication Pinterest automatique)

---

### 11. Secrets Twitter/X (Réseaux sociaux)

```bash
TWITTER_API_KEY=<SECRET_REQUIS>
TWITTER_API_SECRET=<SECRET_REQUIS>
TWITTER_ACCESS_TOKEN=<SECRET_REQUIS>
TWITTER_ACCESS_SECRET=<SECRET_REQUIS>
```

**Utilisé dans** :
- (Fichiers à identifier)

**Statut** : ⚠️ **Optionnel** (pour publication Twitter/X automatique)

---

### 12. Secrets YouTube (Réseaux sociaux)

```bash
YOUTUBE_CLIENT_ID=<SECRET_REQUIS>
YOUTUBE_CLIENT_SECRET=<SECRET_REQUIS>
YOUTUBE_ACCESS_TOKEN=<SECRET_REQUIS>
YOUTUBE_REFRESH_TOKEN=<SECRET_REQUIS>
```

**Utilisé dans** :
- (Fichiers à identifier)

**Statut** : ⚠️ **Optionnel** (pour publication YouTube automatique)

---

## Configuration des secrets Supabase

### Méthode 1 : Via l'interface Supabase Dashboard

1. Aller sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet : **qiavtxpaznxpttkdaevy**
3. Aller dans **Settings** → **Edge Functions** → **Secrets**
4. Cliquer sur **Add secret**
5. Remplir :
   - **Name** : Nom de la variable (ex: `IONOS_EMAIL_PASSWORD`)
   - **Value** : Valeur du secret

### Méthode 2 : Via le CLI Supabase

```bash
# Se connecter
supabase login

# Lier le projet
supabase link --project-ref qiavtxpaznxpttkdaevy

# Ajouter un secret
supabase secrets set IONOS_EMAIL_PASSWORD="votre_mot_de_passe"

# Ajouter plusieurs secrets
supabase secrets set \
  IONOS_EMAIL_PASSWORD="votre_mot_de_passe" \
  MONETICO_TPE="votre_tpe" \
  MONETICO_MAC_KEY=REDACTED

# Lister tous les secrets
supabase secrets list
```

---

## Secrets CRITIQUES à configurer immédiatement

### Priorité 1 : Paiements (Fonctionnalité critique)

```bash
✅ MONETICO_MODE=test (déjà configuré)
✅ MONETICO_TEST_TPE=7374133 (déjà configuré)
✅ MONETICO_TEST_SOCIETE=taxiassur (déjà configuré)
✅ MONETICO_TEST_MAC_KEY=106FA85BF342FD4EE95C883D82865B5CC1F63890 (déjà configuré)

⚠️ À CONFIGURER POUR PRODUCTION :
❌ MONETICO_TPE (demander à Ingineco)
❌ MONETICO_MAC_KEY (demander à Ingineco)
```

### Priorité 2 : Emails (Fonctionnalité critique)

```bash
❌ IONOS_EMAIL_PASSWORD (obligatoire pour tous les emails)
```

**Impact** : Sans ce secret, **AUCUN EMAIL ne peut être envoyé** (leads, paiements, notifications, etc.)

### Priorité 3 : Intelligence Artificielle (Fonctionnalités avancées)

```bash
❌ OPENAI_API_KEY (pour chatbot, analyses IA, etc.)
```

**Impact** : Les fonctionnalités IA ne fonctionneront pas (chatbot, recommandations, analyses automatiques)

---

## Secrets Optionnels (Fonctionnalités additionnelles)

Ces secrets ne sont **pas nécessaires** pour le fonctionnement de base, mais activent des fonctionnalités supplémentaires :

- **Twilio** : SMS et WhatsApp
- **Brevo** : Alternative pour les emails
- **SendGrid** : Autre alternative pour les emails
- **Pexels** : Génération automatique d'images
- **LinkedIn/Pinterest/Twitter/YouTube** : Publication automatique sur les réseaux sociaux

---

## Script de configuration rapide

Créez un fichier `configure-secrets.sh` :

```bash
#!/bin/bash

# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref qiavtxpaznxpttkdaevy

# Configurer les secrets CRITIQUES
echo "Configuration des secrets critiques..."

# IONOS Email (PRIORITÉ 1)
read -sp "IONOS_EMAIL_PASSWORD: " IONOS_PASS
echo
supabase secrets set IONOS_EMAIL_PASSWORD="$IONOS_PASS"

# Monético Production (PRIORITÉ 2 - si disponible)
read -p "Avez-vous les identifiants Monético PRODUCTION ? (o/n) " HAS_MONETICO
if [ "$HAS_MONETICO" = "o" ]; then
  read -p "MONETICO_TPE: " MONETICO_TPE
  read -p "MONETICO_MAC_KEY: " MONETICO_MAC_KEY
  supabase secrets set \
    MONETICO_MODE="production" \
    MONETICO_TPE="$MONETICO_TPE" \
    MONETICO_MAC_KEY=REDACTED
fi

# OpenAI (PRIORITÉ 3 - si disponible)
read -p "Avez-vous une clé OpenAI ? (o/n) " HAS_OPENAI
if [ "$HAS_OPENAI" = "o" ]; then
  read -sp "OPENAI_API_KEY: " OPENAI_KEY
  echo
  supabase secrets set OPENAI_API_KEY="$OPENAI_KEY"
fi

echo "✅ Configuration terminée !"
echo "Liste des secrets configurés :"
supabase secrets list
```

Utilisation :
```bash
chmod +x configure-secrets.sh
./configure-secrets.sh
```

---

## Vérification des secrets configurés

### Vérifier via le Dashboard

1. Aller sur Supabase Dashboard
2. Settings → Edge Functions → Secrets
3. Vérifier que les secrets critiques sont présents

### Vérifier via le CLI

```bash
supabase secrets list
```

### Tester un secret dans une Edge Function

Créer une fonction de test :

```typescript
// supabase/functions/test-secrets/index.ts
Deno.serve(async (req) => {
  const secrets = {
    ionos_email: Deno.env.get("IONOS_EMAIL_PASSWORD") ? "✅ Configuré" : "❌ Manquant",
    monetico_mode: Deno.env.get("MONETICO_MODE") || "Non configuré",
    openai: Deno.env.get("OPENAI_API_KEY") ? "✅ Configuré" : "❌ Manquant",
  };

  return new Response(JSON.stringify(secrets, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
});
```

Déployer et tester :
```bash
supabase functions deploy test-secrets
curl https://qiavtxpaznxpttkdaevy.supabase.co/functions/v1/test-secrets
```

---

## Sécurité des secrets

### Bonnes pratiques

✅ **À FAIRE** :
- Utiliser des secrets différents pour TEST et PRODUCTION
- Changer les secrets régulièrement (tous les 3-6 mois)
- Ne JAMAIS committer les secrets dans Git
- Utiliser des mots de passe forts (16+ caractères)
- Activer l'authentification 2FA sur tous les comptes

❌ **À NE JAMAIS FAIRE** :
- Hardcoder les secrets dans le code
- Partager les secrets par email/Slack
- Utiliser les mêmes secrets sur plusieurs projets
- Stocker les secrets en clair dans des fichiers

### Rotation des secrets

Quand changer un secret :
1. **Immédiatement** : Si un secret est compromis
2. **Trimestriellement** : Pour les secrets critiques (paiement, email)
3. **Annuellement** : Pour les secrets moins sensibles (APIs tierces)

Processus de rotation :
1. Générer le nouveau secret
2. Configurer le nouveau secret dans Supabase
3. Tester que tout fonctionne
4. Supprimer l'ancien secret
5. Documenter le changement

---

## Support et Documentation

### Où obtenir les clés API ?

- **Monético** : Contact Ingineco (fournisseur)
- **IONOS** : Dashboard IONOS → Email & Office → team@taxiassur.com
- **OpenAI** : [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Twilio** : [https://console.twilio.com](https://console.twilio.com)
- **Brevo** : [https://app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api)
- **Pexels** : [https://www.pexels.com/api](https://www.pexels.com/api)
- **LinkedIn** : [https://www.linkedin.com/developers](https://www.linkedin.com/developers)
- **Pinterest** : [https://developers.pinterest.com](https://developers.pinterest.com)

### Contacts

- **Support TaxiAssur** : team@taxiassur.com
- **Support Supabase** : [https://supabase.com/support](https://supabase.com/support)
- **Support Ingineco (Monético)** : Contact commercial

---

## Checklist de configuration

### Avant le lancement en production

- [ ] ✅ VITE_SUPABASE_URL configuré (.env)
- [ ] ✅ VITE_SUPABASE_ANON_KEY configuré (.env)
- [ ] ❌ IONOS_EMAIL_PASSWORD configuré (Supabase secrets)
- [ ] ❌ MONETICO_TPE production (demander à Ingineco)
- [ ] ❌ MONETICO_MAC_KEY production (demander à Ingineco)
- [ ] ❌ MONETICO_MODE=production (changer de test à production)
- [ ] ❌ OPENAI_API_KEY (si IA activée)
- [ ] ⚠️ TWILIO (si SMS/WhatsApp activés)
- [ ] ⚠️ LinkedIn/Pinterest (si réseaux sociaux activés)

### Tests à effectuer après configuration

- [ ] Test envoi email lead
- [ ] Test création lien de paiement Monético
- [ ] Test email de paiement
- [ ] Test chatbot IA (si configuré)
- [ ] Test SMS (si configuré)
- [ ] Test publication réseaux sociaux (si configuré)

---

*Document créé le 13 février 2026*
*Dernière mise à jour : 13 février 2026*
*Version : 1.0*
