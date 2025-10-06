# ACTIONS FINALES À FAIRE - TaxiAssur Configuration

## ✅ CE QUI A ÉTÉ FAIT

1. **Sécurité automation_schedule** : RLS activé avec succès ✅
2. **Variables Supabase** : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY déjà configurées ✅
3. **Fichier .env local** : Mis à jour avec la bonne URL Supabase ✅
4. **11 Edge Functions** : Code prêt au déploiement ✅
5. **Build vérifié** : Projet compile sans erreur ✅

---

## 🔴 ACTIONS CRITIQUES À FAIRE MAINTENANT

### ACTION 1 : Récupérer vos clés API Supabase

**Vous devez mettre à jour le fichier `.env` avec vos vraies clés.**

1. Allez sur : https://supabase.com/dashboard/project/viuuznfqkauatkjcegcj/settings/api

2. Copiez ces valeurs :
   - **Project URL** (commence par `https://viuuznfqkauatkjcegcj.supabase.co`)
   - **anon public** (clé publique)
   - **service_role** (clé secrète - ATTENTION : à ne jamais exposer)

3. Ouvrez le fichier `.env` dans votre projet et remplacez :

```env
VITE_SUPABASE_URL=https://viuuznfqkauatkjcegcj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi... [VOTRE VRAIE CLÉ ANON]
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... [VOTRE VRAIE CLÉ SERVICE_ROLE]
```

---

### ACTION 2 : Configurer les secrets pour Edge Functions

**Vos Edge Functions ont besoin de 3 secrets :**

1. Allez sur : https://supabase.com/dashboard/project/viuuznfqkauatkjcegcj/settings/functions

2. Dans la section **"Secrets"**, cliquez sur **"Add new secret"** et ajoutez :

| Clé | Valeur | Pourquoi |
|-----|--------|----------|
| `SENDGRID_API_KEY` | Votre clé SendGrid | Envoi automatique d'emails (lead, outreach, etc.) |
| `OPENAI_API_KEY` | Votre clé OpenAI | Chatbot IA et génération contenu SEO |
| `FROM_EMAIL` | `contact@taxiassur.com` | Adresse expéditeur des emails |

**Comment obtenir ces clés :**

- **SendGrid** : https://sendgrid.com → API Keys → Create API Key (choisir "Full Access")
- **OpenAI** : https://platform.openai.com/api-keys → Create new secret key

---

### ACTION 3 : Déployer les Edge Functions

**Les 11 fonctions à déployer :**

Je ne peux pas les déployer directement, mais vous avez 2 options :

#### Option A : Via l'interface Supabase (Recommandé)

1. Allez sur : https://supabase.com/dashboard/project/viuuznfqkauatkjcegcj/functions
2. Cliquez sur **"Deploy new function"**
3. Pour chaque fonction, uploadez le dossier correspondant :
   - `supabase/functions/chatbot/`
   - `supabase/functions/send-email/`
   - `supabase/functions/auto-followup/`
   - etc. (les 11 fonctions listées)

#### Option B : Via Supabase CLI

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
supabase link --project-ref viuuznfqkauatkjcegcj

# Déployer toutes les fonctions
supabase functions deploy chatbot
supabase functions deploy send-email
supabase functions deploy auto-followup
supabase functions deploy webhook-email-receiver
supabase functions deploy generate-seo-content
supabase functions deploy cron-orchestrator
supabase functions deploy send-outreach-emails
supabase functions deploy email-auto-responder
supabase functions deploy scan-backlinks
supabase functions deploy automation-dashboard-api
supabase functions deploy partner-scraper-outreach
```

---

### ACTION 4 : Vérifier RLS sur toutes les tables

1. Allez dans **SQL Editor** : https://supabase.com/dashboard/project/viuuznfqkauatkjcegcj/sql/new

2. Exécutez cette requête pour vérifier l'état RLS :

```sql
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

3. **Vérifiez que TOUTES les tables ont `rls_enabled = true`**

4. Si une table n'a pas RLS, activez-le avec :

```sql
ALTER TABLE nom_de_la_table ENABLE ROW LEVEL SECURITY;

-- Puis créez les policies appropriées
CREATE POLICY "Service role full access"
  ON nom_de_la_table FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

### ACTION 5 : Tester le formulaire de devis

1. **Démarrez le serveur dev** (normalement déjà démarré automatiquement)

2. Allez sur : http://localhost:5173

3. Remplissez le formulaire de devis avec des données de test :
   - Nom : "Test Lead"
   - Email : "test@example.com"
   - Téléphone : "0612345678"
   - Ville : "Paris"

4. Vérifiez dans Supabase que le lead est bien enregistré :
   - https://supabase.com/dashboard/project/viuuznfqkauatkjcegcj/editor
   - Table : `leads`
   - Vous devriez voir votre nouveau lead

---

## 📊 CHECKLIST FINALE

Cochez au fur et à mesure :

- [ ] `.env` mis à jour avec les vraies clés API Supabase
- [ ] Secrets Edge Functions configurés (SENDGRID_API_KEY, OPENAI_API_KEY, FROM_EMAIL)
- [ ] 11 Edge Functions déployées
- [ ] RLS vérifié sur toutes les tables (toutes à `true`)
- [ ] Formulaire de devis testé et lead enregistré dans Supabase

---

## 🚀 APRÈS CONFIGURATION

Une fois tout fait, vous aurez :

1. ✅ Un système de leads 100% fonctionnel
2. ✅ Un chatbot IA opérationnel
3. ✅ L'envoi d'emails automatiques
4. ✅ La prospection backlinks automatisée
5. ✅ Le suivi et la relance des leads
6. ✅ La génération de contenu SEO automatique
7. ✅ Un tableau de bord d'automatisation

---

## 🆘 BESOIN D'AIDE ?

Si vous rencontrez un problème :

1. **Clés API manquantes** : Vérifiez que vous avez bien copié les clés complètes (elles sont longues !)
2. **Edge Functions qui ne se déploient pas** : Vérifiez que les secrets sont bien configurés
3. **Formulaire qui ne fonctionne pas** : Vérifiez la console navigateur (F12) pour voir les erreurs
4. **RLS qui bloque** : Vérifiez que la policy `service_role` existe sur la table

---

## 📝 NOTES IMPORTANTES

- **SÉCURITÉ** : Ne partagez JAMAIS votre `service_role` key publiquement
- **COÛTS** :
  - Supabase : Gratuit jusqu'à 500 MB DB + 2 GB bande passante
  - SendGrid : Gratuit jusqu'à 100 emails/jour
  - OpenAI : ~$0.002 par conversation chatbot
- **PRODUCTION** : Quand vous passerez en production, pensez à mettre à jour les CORS dans les Edge Functions

---

**Dernière mise à jour** : Suite à votre configuration Supabase actuelle
**Projet ID** : viuuznfqkauatkjcegcj
**Status** : ✅ Prêt pour déploiement final
