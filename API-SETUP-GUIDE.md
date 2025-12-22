# 🚀 Guide de Configuration des APIs - TaxiAssur Backoffice

## ✅ APIs Configurées

### 1. Google Custom Search Engine (Partner Finder)
**Status:** ✅ CONFIGURÉ

```env
VITE_CSE_API_KEY=AIzaSyBMdJggXK49R_h8x__U6lIxiWEE8Gbjesk
VITE_CSE_CX=73ba86b5aae9b4add
```

**Activation requise:**
1. Allez sur https://console.cloud.google.com/apis/library
2. Recherchez "Custom Search API"
3. Cliquez sur "ACTIVER" (si pas déjà fait)
4. Attendez 2-3 minutes que l'API soit active

**Test:**
- Accédez au backoffice: http://localhost:5173/backoffice
- Mot de passe: `taxiassur2024`
- Cliquez sur "Partner Finder"
- Cliquez sur "Rechercher" avec une requête par défaut
- Vous devriez voir des résultats de sites partenaires potentiels

**Quotas:**
- 100 requêtes/jour (gratuit)
- 1 requête/seconde max
- Le système affiche le quota restant

---

## ⚠️ APIs À Configurer

### 2. Make.com Webhook Secret
**Status:** ⚠️ EN ATTENTE

**Actuel:**
```env
VITE_MAKE_SECRET=change_me_secure_token_2024
```

**À faire:**
1. **Générer un token sécurisé:**

**Sur Windows PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Sur Linux/Mac:**
```bash
openssl rand -hex 32
```

**Ou en ligne:**
- https://www.uuidgenerator.net/
- Générez 2 UUIDs et concaténez-les

2. **Remplacez dans `.env`:**
```env
VITE_MAKE_SECRET=votre_token_généré_ici
```

3. **Configurez dans Make.com:**
- Créez un scénario Make.com
- Ajoutez un webhook
- Dans les headers du webhook, ajoutez:
  - Key: `X-MAKE-SECRET`
  - Value: `votre_token_généré_ici`

**Utilisé par:**
- Lead Manager (envoi des leads)
- Outreach Composer (emails automatiques)
- News Manager (agrégation de contenu)
- Content Manager (génération de contenu)

---

### 3. SendGrid API (Email Automatique)
**Status:** ❌ NON CONFIGURÉ

**Pourquoi en avez-vous besoin:**
- Envoi automatique des emails de lead
- Follow-up automatique des prospects
- Campagnes d'outreach pour backlinks
- Emails partenaires

**Comment obtenir:**
1. Créez un compte sur https://sendgrid.com (gratuit: 100 emails/jour)
2. Allez dans Settings → API Keys
3. Cliquez "Create API Key"
4. Nom: `TaxiAssur Backoffice`
5. Permissions: "Full Access"
6. Copiez la clé (elle ne s'affiche qu'une fois!)

**Ajoutez au `.env`:**
```env
VITE_SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Configuration Supabase Edge Functions:**
Les edge functions ont besoin de cette clé côté serveur.

Dans votre dashboard Supabase:
1. Project Settings → Edge Functions → Secrets
2. Ajoutez: `SENDGRID_API_KEY=SG.xxxxxxxxx`

---

## 📊 Status des Modules Backoffice

| Module | APIs Requises | Status |
|--------|---------------|--------|
| Dashboard | Supabase | ✅ OK |
| Lead Manager | Supabase, Make Secret | ⚠️ Partiel |
| Partner Finder | Google CSE, Supabase | ✅ OK |
| Backlink Prospector | Google CSE, Supabase | ✅ OK |
| Outreach Composer | Make Secret, SendGrid | ⚠️ Partiel |
| News Manager | Make Secret | ⚠️ Partiel |
| Content Manager | Make Secret | ⚠️ Partiel |
| SEO Tools | - | ✅ OK |

---

## 🧪 Plan de Test

### Test 1: Partner Finder (Google CSE)
1. Accéder au backoffice
2. Aller dans "Partner Finder"
3. Sélectionner une requête: "assurance taxi paris"
4. Cliquer "Rechercher"
5. **Résultat attendu:** Liste de 10 sites avec domaines, titres, snippets
6. **Si erreur 403:** L'API Custom Search n'est pas activée → Voir section "Activation requise"

### Test 2: Backlink Prospector (Supabase + CSE)
1. Aller dans "Backlink Prospector"
2. Cliquer "Scanner Nouvelles Opportunités"
3. **Résultat attendu:** Liste de sites qui linkent vers vos concurrents
4. Les opportunités sont sauvegardées dans Supabase

### Test 3: Lead Manager (Supabase)
1. Aller dans "Lead Manager"
2. Voir la liste des leads capturés
3. Changer le statut d'un lead
4. **Résultat attendu:** Le changement est persisté dans Supabase

---

## 🔧 Prochaines Étapes

**Priorité 1 - Immédiat:**
- [x] Google CSE configuré
- [ ] Générer et configurer VITE_MAKE_SECRET
- [ ] Tester Partner Finder

**Priorité 2 - Cette semaine:**
- [ ] Configurer SendGrid pour emails automatiques
- [ ] Tester envoi de leads vers Make.com
- [ ] Tester campagnes d'outreach

**Priorité 3 - Amélioration:**
- [ ] Ajouter Google Analytics (VITE_GTAG_ID)
- [ ] Ajouter Meta Pixel (VITE_META_PIXEL_ID)
- [ ] Configurer OpenAI pour génération de contenu IA

---

## 🐛 Troubleshooting

### "API Key not found" dans Partner Finder
- Vérifiez que `.env` contient bien `VITE_CSE_API_KEY`
- Redémarrez le serveur de dev: `npm run dev`
- Les variables VITE_* nécessitent un rebuild

### "403 Forbidden" lors d'une recherche CSE
- L'API Custom Search n'est pas activée dans Google Cloud Console
- Allez sur https://console.cloud.google.com/apis/library/customsearch.googleapis.com
- Cliquez "ENABLE"

### "Daily limit exceeded"
- Quota gratuit CSE: 100 requêtes/jour
- Le compteur se réinitialise à minuit (UTC)
- Le backoffice affiche le quota restant

### Les webhooks Make.com ne reçoivent rien
- Vérifiez que `VITE_MAKE_SECRET` est identique dans:
  - Votre `.env`
  - Les headers du webhook Make.com
- Les secrets doivent correspondre exactement (sensible à la casse)

---

## 📞 Support

Si un module ne fonctionne pas après configuration:
1. Vérifiez les variables d'environnement dans `.env`
2. Redémarrez le serveur: `npm run dev`
3. Ouvrez la console navigateur (F12) pour voir les erreurs
4. Vérifiez les quotas API (Google CSE, SendGrid)
