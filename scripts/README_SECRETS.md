# Configuration des Secrets Supabase

## Script Automatique

Le script `configure-supabase-secrets.sh` configure automatiquement tous les secrets nécessaires pour TaxiAssur.

### Utilisation

```bash
# Via npm (recommandé)
npm run secrets:configure

# Ou directement
bash scripts/configure-supabase-secrets.sh
```

### Prérequis

- Supabase CLI installé : `npm install -g supabase`
- Connexion Internet
- Compte Supabase avec accès au projet

### Secrets configurés

Le script configure automatiquement :

#### Critiques (emails et paiements)
- `IONOS_EMAIL_PASSWORD` - Mot de passe IONOS pour envoi d'emails
- `IONOS_SMTP_HOST` - Serveur SMTP IONOS
- `IONOS_SMTP_PORT` - Port SMTP (465)
- `IONOS_EMAIL_USER` - Email IONOS (team@taxiassur.com)
- `IONOS_IMAP_HOST` - Serveur IMAP IONOS
- `IONOS_IMAP_PORT` - Port IMAP (993)

#### Intelligence Artificielle
- `OPENAI_API_KEY` - Clé API OpenAI pour chatbot et analyses

#### Emails alternatifs
- `BREVO_API_KEY` - Clé API Brevo
- `BREVO_SENDER_EMAIL` - Email expéditeur Brevo
- `BREVO_SENDER_NAME` - Nom expéditeur Brevo
- `SENDGRID_API_KEY` - Clé API SendGrid

#### Réseaux sociaux
- `LINKEDIN_ACCESS_TOKEN` - Token d'accès LinkedIn
- `PINTEREST_ACCESS_TOKEN` - Token d'accès Pinterest

#### Médias
- `PEXELS_API_KEY` - Clé API Pexels pour images

### Vérification

Pour vérifier que les secrets sont bien configurés :

```bash
npm run secrets:list
```

### Dépannage

#### Erreur : "Command not found: supabase"

```bash
npm install -g supabase
```

#### Erreur : "Access token not provided"

```bash
supabase login
```

#### Erreur : "Project not found"

Le script essaie de lier automatiquement le projet. Si ça échoue :

```bash
supabase link --project-ref qiavtxpaznxpttkdaevy
```

### Sécurité

⚠️ **IMPORTANT** : Ce script contient des secrets sensibles. Ne pas :
- Committer dans Git
- Partager par email/Slack
- Publier en ligne

Les secrets sont configurés directement sur Supabase et ne sont jamais stockés en clair sur le serveur.

### Support

**Email** : team@taxiassur.com
**Téléphone** : 01 80 85 57 86
**Documentation** : Voir `CONFIGURATION_SECRETS_GUIDE_RAPIDE.md` à la racine du projet

---

*Script créé le 13 février 2026*
