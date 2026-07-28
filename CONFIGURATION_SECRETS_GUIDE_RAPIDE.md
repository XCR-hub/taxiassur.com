# Guide Rapide - Configuration des Secrets Supabase

## Méthode Automatique (Recommandée)

### 1. Exécuter le script de configuration

```bash
bash scripts/configure-supabase-secrets.sh
```

Le script va :
- ✅ Vérifier que Supabase CLI est installé
- ✅ Vous connecter à Supabase (si nécessaire)
- ✅ Lier le projet automatiquement
- ✅ Configurer tous les secrets automatiquement
- ✅ Afficher la liste des secrets configurés

**Durée estimée** : 2-3 minutes

---

## Méthode Manuelle

### 1. Installation Supabase CLI

```bash
npm install -g supabase
```

### 2. Connexion et liaison

```bash
supabase login
supabase link --project-ref qiavtxpaznxpttkdaevy
```

### 3. Configuration des secrets

```bash
# Secrets CRITIQUES
supabase secrets set IONOS_EMAIL_PASSWORD="TAXIassur!"
supabase secrets set OPENAI_API_KEY="sk-proj_REDACTED"

# Emails alternatifs
supabase secrets set BREVO_API_KEY="xkeysib_REDACTED"
supabase secrets set SENDGRID_API_KEY="SG.REDACTED"

# Réseaux sociaux
supabase secrets set LINKEDIN_ACCESS_TOKEN="AQV7bN8vSwlvNLg2SDGoh7eX_zRtP5bvF_J_KbPm_nPV7CkTy7v5C6j1i4z1ULbARfxQ6VU1uh8bPrnlcTKhG5AttZz6qHLK_m1BcpL4l_dgRIliaW_JkNF6XrXPPLNMXQciIHvETKAqTyHI9pFycw7k1FOqZG98KZeiWy-_lmofY7kdwFsxpRXkbcOL7YNEmzMHgquk82IJg35G3TBKpZgFoDJ4RA6YGzqOjEdNm1kL6lMhrJIFeMz-tCHj0ARTAysBuZ1s6HrsdwCmFuY8DGBQDTMKaCEcRC_BHmbztQM5qQg3sk2oYzazzxAcwDFOkGtmwHaXizpsmHUKNYeOpGPxPajX5Q"
supabase secrets set PINTEREST_ACCESS_TOKEN="pina_REDACTED"

# Images
supabase secrets set PEXELS_API_KEY="mwktI0rV88p2CHnMP6jliUIPDPBEniubiF7cneG1uFRQ0Yxsu8XmNyG3"

# IONOS supplémentaires
supabase secrets set IONOS_SMTP_HOST="smtp.ionos.fr"
supabase secrets set IONOS_SMTP_PORT="465"
supabase secrets set IONOS_EMAIL_USER="team@taxiassur.com"
supabase secrets set IONOS_IMAP_HOST="imap.ionos.fr"
supabase secrets set IONOS_IMAP_PORT="993"

# Brevo supplémentaires
supabase secrets set BREVO_SENDER_EMAIL="team@taxiassur.com"
supabase secrets set BREVO_SENDER_NAME="TaxiAssur"
```

### 4. Vérification

```bash
supabase secrets list
```

---

## Tests après configuration

### Test 1 : Email de paiement

```bash
# Via le CRM
1. Connectez-vous au backoffice
2. Ouvrez un lead
3. Générez un lien de paiement
4. Vérifiez que l'email est bien reçu
```

### Test 2 : Chatbot IA

```bash
# Via l'interface
1. Allez sur le site
2. Ouvrez le chatbot
3. Posez une question
4. Vérifiez la réponse
```

### Test 3 : Publication LinkedIn

```bash
# Via le backoffice
1. Allez dans Marketing → Social Media
2. Créez une publication
3. Publiez sur LinkedIn
4. Vérifiez sur votre profil LinkedIn
```

---

## Secrets configurés

### ✅ Déjà configurés

- `IONOS_EMAIL_PASSWORD` - Mot de passe email IONOS
- `OPENAI_API_KEY` - Clé API OpenAI pour IA
- `BREVO_API_KEY` - Clé API Brevo (emails alternatifs)
- `SENDGRID_API_KEY` - Clé API SendGrid (emails alternatifs)
- `LINKEDIN_ACCESS_TOKEN` - Token d'accès LinkedIn
- `PINTEREST_ACCESS_TOKEN` - Token d'accès Pinterest
- `PEXELS_API_KEY` - Clé API Pexels (images)

### ⚠️ En attente (Monético PRODUCTION)

Pour passer en PRODUCTION, demandez à Ingineco :

```bash
supabase secrets set MONETICO_MODE="production"
supabase secrets set MONETICO_TPE="VOTRE_TPE_PRODUCTION"
supabase secrets set MONETICO_MAC_KEY="VOTRE_CLE_MAC_PRODUCTION"
```

### ⚠️ Optionnels (si besoin)

```bash
# Twilio (SMS/WhatsApp)
supabase secrets set TWILIO_ACCOUNT_SID="votre_sid"
supabase secrets set TWILIO_AUTH_TOKEN="votre_token"
supabase secrets set TWILIO_MESSAGING_SERVICE_SID="votre_service_sid"

# Twitter/X
supabase secrets set TWITTER_API_KEY="votre_cle"
supabase secrets set TWITTER_API_SECRET="votre_secret"

# YouTube
supabase secrets set YOUTUBE_CLIENT_ID="votre_client_id"
supabase secrets set YOUTUBE_CLIENT_SECRET="votre_secret"
```

---

## Dépannage

### Erreur : "Access token not provided"

```bash
supabase login
```

### Erreur : "Project not found"

```bash
supabase link --project-ref qiavtxpaznxpttkdaevy
```

### Erreur : "Command not found: supabase"

```bash
npm install -g supabase
```

### Vérifier qu'un secret est bien configuré

```bash
supabase secrets list | grep IONOS_EMAIL_PASSWORD
```

### Supprimer un secret (si erreur)

```bash
supabase secrets unset NOM_DU_SECRET
```

---

## Sécurité

### ⚠️ IMPORTANT

- **Ne jamais** committer ce fichier dans Git
- **Ne jamais** partager les secrets par email/Slack
- **Changer** les secrets tous les 3-6 mois
- **Utiliser** des secrets différents pour TEST et PRODUCTION

### Rotation des secrets

Pour changer un secret :

```bash
# 1. Générer un nouveau secret
# 2. Le configurer
supabase secrets set NOM_SECRET="nouvelle_valeur"
# 3. Tester
# 4. Supprimer l'ancien (si nécessaire)
```

---

## Support

**Email** : team@taxiassur.com
**Documentation Supabase** : https://supabase.com/docs/guides/cli/managing-config
**Documentation Monético** : Contact Ingineco

---

*Document créé le 13 février 2026*
*Tous les secrets ont été fournis par l'administrateur système*
