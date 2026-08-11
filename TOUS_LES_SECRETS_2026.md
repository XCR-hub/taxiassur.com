# Liste Complète des Secrets - TaxiAssur 2026

## Vue d'ensemble

**Total : 50+ secrets** configurés automatiquement via le script

---

## 1. EMAILS (13 secrets)

### IONOS (10 secrets)
```bash
IONOS_EMAIL_PASSWORD=REDACTED
IONOS_SMTP_PASSWORD=REDACTED
IONOS_IMAP_PASSWORD=REDACTED
IONOS_SMTP_HOST=smtp.ionos.fr
IONOS_SMTP_PORT=465
IONOS_SMTP_USER=smtp.ionos.fr
IONOS_EMAIL_USER=team@taxiassur.com
IONOS_IMAP_HOST=imap.ionos.fr
IONOS_IMAP_PORT=993
IONOS_IMAP_USER=team@taxiassur.com
```

### Brevo (3 secrets)
```bash
BREVO_API_KEY=xkeysib_REDACTED
BREVO_SENDER_EMAIL=team@taxiassur.com
BREVO_SENDER_NAME=TaxiAssur
```

### SendGrid (1 secret)
```bash
SENDGRID_API_KEY=SG.REDACTED
```

### Resend (1 secret)
```bash
RESEND_API_KEY=re_5QaqcEPK_NFR2iEmg21JwvCWRzjQrNQgn
```

---

## 2. INTELLIGENCE ARTIFICIELLE (5 secrets)

### OpenAI
```bash
OPENAI_API_KEY=sk-proj_REDACTED
```

### Anthropic (Claude)
```bash
ANTHROPIC_API_KEY=sk-ant_REDACTED
```

### Google Gemini
```bash
GEMINI_API_KEY=AIzaSyAa5iNz0pdx-BhzGfaq2sALto3vGbE-lOg
```

### OpenRouter
```bash
OPENROUTER_API_KEY=sk-or-v1_REDACTED
```

### Hugging Face
```bash
HUGGINGFACE_API_KEY=hf_REDACTED
```

---

## 3. RÉSEAUX SOCIAUX (4 secrets)

### LinkedIn
```bash
LINKEDIN_ACCESS_TOKEN=AQV7bN8vSwlvNLg2SDGoh7eX_zRtP5bvF_J_KbPm_nPV7CkTy7v5C6j1i4z1ULbARfxQ6VU1uh8bPrnlcTKhG5AttZz6qHLK_m1BcpL4l_dgRIliaW_JkNF6XrXPPLNMXQciIHvETKAqTyHI9pFycw7k1FOqZG98KZeiWy-_lmofY7kdwFsxpRXkbcOL7YNEmzMHgquk82IJg35G3TBKpZgFoDJ4RA6YGzqOjEdNm1kL6lMhrJIFeMz-tCHj0ARTAysBuZ1s6HrsdwCmFuY8DGBQDTMKaCEcRC_BHmbztQM5qQg3sk2oYzazzxAcwDFOkGtmwHaXizpsmHUKNYeOpGPxPajX5Q
LINKEDIN_CLIENT_ID=78jlte9c2mbjw5
LINKEDIN_CLIENT_SECRET=WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==
```

### Pinterest
```bash
PINTEREST_ACCESS_TOKEN=pina_REDACTED
```

---

## 4. SMS & WHATSAPP (3 secrets)

### Twilio
```bash
TWILIO_ACCOUNT_SID=ACe735b7f24703a4b496ca1c816c1d610f
TWILIO_AUTH_TOKEN=REDACTED
TWILIO_MESSAGING_SERVICE_SID=MGcefbb28732fdb969fea3f71913738f17
```

---

## 5. SEO & GOOGLE SERVICES (12 secrets)

### Google Search Console
```bash
GOOGLE_SEARCH_CONSOLE_API_KEY=AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
GOOGLE_SEARCH_CONSOLE_CREDENTIALS={"type":"service_account",...}
```

### Google Custom Search Engine (CSE)
```bash
GOOGLE_CSE_API_KEY=AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
GOOGLE_CSE_CX=73ba86b5aae9b4add
GOOGLE_CSE_CX_ID=73ba86b5aae9b4add
```

### Google OAuth & Places
```bash
GOOGLE_CLIENT_ID=99189284491-trog606nhubrt4su0bskpacc388420gm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX_REDACTED
GOOGLE_OAUTH_JSON={"client_id":"...","client_secret":"..."}
GOOGLE_PLACES_API_KEY=AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
```

### SERP API
```bash
SERP_API_KEY=420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202
```

---

## 6. LEAD GENERATION (2 secrets)

### Hunter.io
```bash
HUNTER_API_KEY=1e15e1c7b4db255256872dc4bf9939f3b655981c
HUNTER_IO_API_KEY=1e15e1c7b4db255256872dc4bf9939f3b655981c
```

---

## 7. AUTOMATION (2 secrets)

### Make.com
```bash
MAKE_API_TOKEN=REDACTED
```

### Site Configuration
```bash
SITE_URL=https://taxiassur.com
```

---

## 8. DÉPLOIEMENT & FTP (6 secrets)

### IONOS FTP/SFTP
```bash
FTP_HOST=home749874859.1and1-data.host
FTP_USER=acc1591324770
FTP_PASSWORD=REDACTED
FTP_PORT=22
FTP_PROTOCOL=sftp
```

### GitHub
```bash
GITHUB_REPO=XCR-hub/taxiassur.com
```

---

## 9. MÉDIAS (1 secret)

### Pexels
```bash
PEXELS_API_KEY=mwktI0rV88p2CHnMP6jliUIPDPBEniubiF7cneG1uFRQ0Yxsu8XmNyG3
```

---

## 10. PAIEMENTS - MONÉTICO (À configurer pour PRODUCTION)

### Mode TEST (actuel)
```bash
MONETICO_MODE=test
MONETICO_TEST_TPE=7374133
MONETICO_TEST_SOCIETE=taxiassur
MONETICO_TEST_MAC_KEY=[REDACTED_MONETICO_MAC_KEY]
```

### Mode PRODUCTION (à demander à Ingineco)
```bash
MONETICO_MODE=production
MONETICO_TPE=<À_DEMANDER>
MONETICO_MAC_KEY=REDACTED
```

---

## Configuration Automatique

### Via le script (RECOMMANDÉ)

```bash
npm run secrets:configure
```

**Durée** : 3-5 minutes
**Résultat** : Tous les 50+ secrets configurés automatiquement

### Vérification

```bash
npm run secrets:list
```

---

## Utilisation par Edge Function

### Emails
**Fonctions utilisant IONOS** :
- `send-payment-link-email`
- `send-email-ionos`
- `send-quote-email`
- `send-client-access`
- `send-lead-notification`
- `sync-ionos-imap-v2`
- `fetch-email-replies`

### Intelligence Artificielle
**Fonctions utilisant les APIs IA** :
- `chatbot` (OpenAI)
- `llm-brain` (OpenAI)
- `llm-council-chat` (Multi-modèles)
- `ia-council` (Multi-modèles)
- `ai-email-responder` (OpenAI/Claude)
- `generate-seo-content` (OpenAI)

### Réseaux Sociaux
**Fonctions utilisant LinkedIn/Pinterest** :
- `linkedin-publisher`
- `linkedin-scraper`
- `pinterest-publisher`
- `social-media-publisher`

### SMS/WhatsApp
**Fonctions utilisant Twilio** :
- `send-sms`
- `send-whatsapp`
- `twilio-webhook`

---

## Tests après Configuration

### 1. Test Email
```bash
# Via le backoffice
1. Générer un lien de paiement
2. Vérifier réception de l'email
```

### 2. Test IA
```bash
# Via le chatbot
1. Ouvrir le chatbot
2. Poser une question
3. Vérifier la réponse
```

### 3. Test LinkedIn
```bash
# Via le backoffice
1. Marketing → Social Media
2. Créer une publication
3. Publier sur LinkedIn
```

### 4. Test SMS/WhatsApp
```bash
# Via le backoffice
1. CRM → Lead
2. Envoyer un SMS/WhatsApp
3. Vérifier réception
```

---

## Sécurité

### ⚠️ IMPORTANT

- **Ne JAMAIS** committer ces secrets dans Git
- **Ne JAMAIS** partager par email/Slack
- **Changer** tous les 3-6 mois
- **2FA activé** sur tous les comptes

### Secrets Critiques

Les secrets suivants sont **critiques** et doivent être protégés en priorité :

1. `IONOS_EMAIL_PASSWORD` - Accès complet aux emails
2. `OPENAI_API_KEY` - Coûts potentiels élevés
3. `MONETICO_MAC_KEY` - Sécurité des paiements
4. `FTP_PASSWORD` - Accès au serveur
5. `ANTHROPIC_API_KEY` - Coûts potentiels élevés

---

## Support

**Email** : team@taxiassur.com
**Téléphone** : 01 80 85 57 86

### Fournisseurs

- **IONOS** : https://www.ionos.fr
- **OpenAI** : https://platform.openai.com
- **Anthropic** : https://console.anthropic.com
- **Google Cloud** : https://console.cloud.google.com
- **Twilio** : https://console.twilio.com
- **Make.com** : https://www.make.com
- **Hunter.io** : https://hunter.io
- **Pexels** : https://www.pexels.com/api

---

*Document créé le 13 février 2026*
*50+ secrets configurés et documentés*
*Configuration automatique via script*
