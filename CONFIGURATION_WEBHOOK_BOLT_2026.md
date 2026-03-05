# Configuration du Webhook Bolt.new ✅

**URL du webhook récupérée:** `https://api.bolt.new/v1/deploy/github-mcmcpmfr`

---

## 🎯 Objectif

Configurer le webhook Bolt.new pour permettre au système TaxiAssur de rebuilder automatiquement l'application après chaque publication Git automatisée.

---

## 📋 Configuration Manuelle (Recommandée)

### Étape 1: Accéder aux secrets Supabase

1. **Aller sur le Dashboard Supabase:**
   ```
   https://supabase.com/dashboard
   ```

2. **Sélectionner votre projet TaxiAssur**

3. **Aller dans Settings → Vault (Secrets):**
   ```
   https://supabase.com/dashboard/project/[votre-projet-id]/settings/vault
   ```

### Étape 2: Ajouter le secret

1. **Cliquer sur "New secret"**

2. **Remplir les champs:**
   - **Name:** `BOLT_REBUILD_WEBHOOK_URL`
   - **Value:** `https://api.bolt.new/v1/deploy/github-mcmcpmfr`

3. **Cliquer sur "Add secret"**

✅ **C'est fait !**

---

## 🤖 Configuration via Script (Alternative)

Si vous avez Supabase CLI installé localement:

```bash
# Exécuter le script de configuration
npm run configure:bolt-webhook

# OU directement
bash scripts/configure-bolt-webhook.sh
```

---

## 🔍 Vérification de la Configuration

### Vérifier que le secret est bien configuré:

```bash
# Lister tous les secrets
supabase secrets list

# Devrait afficher BOLT_REBUILD_WEBHOOK_URL dans la liste
```

### Tester la fonction Edge:

```bash
# Tester manuellement
supabase functions invoke git-auto-publisher
```

---

## 📊 Comment ça fonctionne ?

### Workflow Complet

```
┌─────────────────────────────────────────────────────────────┐
│                   SYSTÈME AUTO-PUBLICATION                   │
└─────────────────────────────────────────────────────────────┘

1. 🤖 IA génère du contenu SEO
   └─> Articles de blog, pages ville, actualités...

2. 📝 Contenu ajouté dans code_publish_queue
   └─> Table Supabase avec fichiers à publier

3. ⏰ Cron déclenche toutes les 10 minutes
   └─> Fonction: git-auto-publisher

4. 🔄 Fonction lit la queue et commit sur GitHub
   └─> API GitHub + Token authentifié

5. 🚀 Webhook Bolt.new déclenché
   └─> https://api.bolt.new/v1/deploy/github-mcmcpmfr

6. 🏗️ Bolt.new rebuild automatiquement
   └─> Nouveau build en ~2-3 minutes

7. ✅ Site mis à jour avec nouveau contenu
   └─> Visible sur taxiassur.pro
```

---

## 🎛️ Configuration Git Repository

Le système a besoin de la configuration Git dans la table `git_repository_config`:

```sql
-- Vérifier la config actuelle
SELECT * FROM git_repository_config;

-- Si vide, créer la configuration
INSERT INTO git_repository_config (
  repository_url,
  branch_name,
  auto_commit_enabled,
  auto_deploy_enabled,
  commit_message_prefix
) VALUES (
  'https://github.com/[votre-username]/taxiassur',
  'main',
  true,
  true,
  '[AI-SEO]'
);
```

---

## 🧪 Test Complet du Système

### 1. Ajouter un fichier de test dans la queue:

```sql
-- Insérer un test dans la queue
INSERT INTO code_publish_queue (
  file_path,
  file_content,
  operation,
  commit_message,
  triggered_by,
  status
) VALUES (
  'public/test-webhook.txt',
  'Test webhook Bolt.new - ' || NOW()::TEXT,
  'create',
  'Test webhook auto-deploy',
  'admin-test',
  'pending'
);
```

### 2. Déclencher manuellement la publication:

```bash
supabase functions invoke git-auto-publisher
```

### 3. Vérifier les logs:

```bash
# Logs de la fonction
supabase functions logs git-auto-publisher

# Devrait afficher:
# ✅ fichier publié
# ✅ Rebuild Bolt.new déclenché
```

### 4. Vérifier sur Bolt.new:

- Aller sur https://bolt.new
- Ouvrir votre projet
- Vérifier que le rebuild a démarré (icône de build en cours)

### 5. Vérifier sur GitHub:

- Aller sur votre repository
- Vérifier le dernier commit
- Le fichier `public/test-webhook.txt` devrait apparaître

---

## 🔧 Dépannage

### Le webhook ne se déclenche pas ?

**1. Vérifier le secret:**
```bash
supabase secrets list | grep BOLT_REBUILD_WEBHOOK_URL
```

**2. Vérifier les logs de la fonction:**
```bash
supabase functions logs git-auto-publisher --tail
```

**3. Vérifier que GitHub Token est configuré:**
```bash
supabase secrets list | grep GITHUB_TOKEN
```

**4. Tester le webhook manuellement:**
```bash
curl -X POST https://api.bolt.new/v1/deploy/github-mcmcpmfr \
  -H "Content-Type: application/json" \
  -d '{"source":"test","trigger":"manual"}'
```

### Le commit GitHub échoue ?

**Vérifier les permissions du token GitHub:**
- Aller sur: https://github.com/settings/tokens
- Vérifier que le token a les permissions: `repo`, `workflow`

### Bolt.new ne rebuild pas automatiquement ?

**Vérifier dans Bolt.new:**
- Settings → Git
- ✅ "Auto-deploy when pushed to main" doit être activé
- Branch: `main` (même branche que la config)

---

## 📈 Statistiques et Monitoring

### Dashboard de publication

Le backoffice TaxiAssur inclut un dashboard de monitoring:

```
/admin/dashboard → Section "Auto-Publication Git"
```

**Métriques disponibles:**
- ✅ Nombre de publications réussies
- ❌ Nombre d'échecs
- ⏱️ Dernière publication
- 📊 Historique des commits
- 🔄 Status du rebuild Bolt.new

---

## 🎯 Résumé

✅ **Webhook configuré:** `https://api.bolt.new/v1/deploy/github-mcmcpmfr`

✅ **Secret Supabase à créer:**
```
Name: BOLT_REBUILD_WEBHOOK_URL
Value: https://api.bolt.new/v1/deploy/github-mcmcpmfr
```

✅ **Fonction Edge qui l'utilise:** `git-auto-publisher`

✅ **Fréquence:** Cron toutes les 10 minutes

✅ **Résultat:** Site TaxiAssur mis à jour automatiquement avec nouveau contenu SEO

---

## 🚀 Prochaines Étapes

1. ✅ Configurer le secret dans Supabase
2. 🧪 Tester avec un fichier de test
3. 🎯 Activer les crons de génération SEO automatique
4. 📈 Monitorer les publications dans le dashboard
5. 🎉 Profiter de la publication automatique !

---

**Date de configuration:** 5 mars 2026
**Webhook URL:** `https://api.bolt.new/v1/deploy/github-mcmcpmfr`
**Status:** ⏳ Configuration manuelle requise
