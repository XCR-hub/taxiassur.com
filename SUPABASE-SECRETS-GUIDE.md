# Configuration des Secrets Supabase

## Secrets à Configurer dans Supabase Dashboard

### Accès aux Secrets
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Menu gauche → **Settings** → **Edge Functions**
4. Section **Secrets** → Cliquer **Manage secrets**

---

## Liste des Secrets

### 1. OpenAI API Key (Générateur IA)
```bash
OPENAI_API_KEY=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
```
**Utilisé par** :
- `generate-seo-content` (Générateur articles IA)
- `chatbot` (ChatBot GPT)

**Coût** : ~$0.01 par génération article

---

### 2. SendGrid API Key (Emails)
```bash
SENDGRID_API_KEY=VOTRE_CLE_SENDGRID_ICI
```
**Utilisé par** :
- `send-email` (Envoi devis/contrats)
- `email-auto-responder` (Réponses auto)

**Comment obtenir** :
1. https://signup.sendgrid.com/
2. Settings → API Keys → Create API Key
3. Permissions : Full Access (Mail Send)

---

### 3. SMTP Configuration (Alternative à SendGrid)
```bash
SMTP_HOST=smtp.ionos.fr
SMTP_PORT=587
SMTP_USER=contact@taxiassur.com
SMTP_PASS=VOTRE_MOT_DE_PASSE_EMAIL
```
**Note** : Choisir SendGrid OU SMTP, pas les deux

---

### 4. SerpAPI Key (Analyse Tendances)
```bash
SERPAPI_KEY=420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202
```
**Utilisé par** :
- `serp-lead-optimizer` (Optimisation leads)
- `scan-backlinks` (Analyse backlinks)

**Déjà configuré** : ✅

---

### 5. Google Custom Search (Recherche Site)
```bash
GOOGLE_CSE_API_KEY=AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
GOOGLE_CSE_CX=73ba86b5aae9b4add
```
**Utilisé par** : Frontend recherche site

**Déjà configuré** : ✅

---

## Variables Supabase (Automatiques)

Ces variables sont automatiquement disponibles dans les Edge Functions :

```bash
SUPABASE_URL=https://drohhxrkoequjphvabvq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL=postgresql://postgres:...
```

**Ne PAS configurer manuellement** ✅

---

## Priorités Configuration

### Immédiat (Critique)
1. ✅ **OPENAI_API_KEY** - Pour générateur IA
2. ⚠️ **SENDGRID_API_KEY** - Pour emails devis/contrats

### Important
3. ✅ **SERPAPI_KEY** - Déjà configuré
4. ⚠️ **SMTP_HOST/USER/PASS** - Si pas SendGrid

### Optionnel
5. ✅ **GOOGLE_CSE_API_KEY** - Déjà configuré

---

## Procédure d'Application

### Via Dashboard (Recommandé)
```
1. Supabase Dashboard → Settings → Edge Functions
2. Section Secrets → Manage secrets
3. Cliquer "+ New secret"
4. Name: OPENAI_API_KEY
5. Value: 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
6. Cliquer "Add secret"
7. Répéter pour chaque secret
```

### Via CLI (Alternative)
```bash
npx supabase secrets set OPENAI_API_KEY=sk-nymqmTY1...
npx supabase secrets set SENDGRID_API_KEY=SG.xxx...
npx supabase secrets set SERPAPI_KEY=420c1db6...
```

---

## Vérification des Secrets

### Lister les Secrets Configurés
```bash
npx supabase secrets list
```

### Tester Edge Function avec Secret
```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"test","type":"blog"}'
```

---

## Sécurité

### ✅ Bonnes Pratiques
- Secrets stockés côté serveur (Edge Functions)
- Jamais exposés au frontend
- Rotation régulière des clés
- Accès restreint par RLS

### ❌ À Éviter
- Mettre secrets dans .env frontend
- Commit secrets dans Git
- Partager clés publiquement

---

## Dépannage

### Erreur "OPENAI_API_KEY not found"
```bash
# Vérifier secret existe
npx supabase secrets list

# Ajouter si manquant
npx supabase secrets set OPENAI_API_KEY=sk-xxx...

# Redéployer fonction
npx supabase functions deploy generate-seo-content
```

### Erreur "SendGrid authentication failed"
```bash
# Vérifier clé valide sur sendgrid.com
# Settings → API Keys → Vérifier status

# Recréer clé si nécessaire
# Mettre à jour secret Supabase
npx supabase secrets set SENDGRID_API_KEY=SG.new-key...
```

---

## État Actuel

| Secret | Statut | Urgence |
|--------|--------|---------|
| OPENAI_API_KEY | ⚠️ À configurer | 🔴 Critique |
| SENDGRID_API_KEY | ⚠️ À configurer | 🔴 Critique |
| SERPAPI_KEY | ✅ Configuré | ✅ OK |
| GOOGLE_CSE_API_KEY | ✅ Configuré | ✅ OK |
| SMTP_* | ⚪ Optionnel | ⚪ Si pas SendGrid |

---

## Prochaines Étapes

1. **Configurer OpenAI** (générateur IA fonctionne)
2. **Configurer SendGrid** (emails devis fonctionnent)
3. **Tester générateur IA** dans backoffice
4. **Tester envoi emails** dans lead manager

