# ⚡ CONFIGURATION RAPIDE GITHUB + BOLT.NEW (5 MINUTES)

## 🎯 Objectif

Permettre aux IA de publier automatiquement du code sur GitHub, qui déclenche un rebuild automatique sur Bolt.new.

---

## 📋 ÉTAPE 1: Créer un token GitHub (2 min)

### 1.1 Aller sur GitHub

```
https://github.com/settings/tokens/new
```

### 1.2 Remplir le formulaire

**Token name**: `TaxiAssur IA Publisher`

**Expiration**: `No expiration` (ou 1 an)

**Scopes à cocher**:
- ✅ `repo` (tous les sous-scopes)
  - ✅ repo:status
  - ✅ repo_deployment
  - ✅ public_repo
  - ✅ repo:invite
  - ✅ security_events

**Cliquer**: `Generate token`

### 1.3 Copier le token

```
ghp_REDACTED
```

⚠️ **IMPORTANT**: Copiez-le immédiatement, vous ne pourrez plus le revoir!

---

## 📋 ÉTAPE 2: Configurer le token dans Supabase (1 min)

### Option A: Via l'interface Supabase

1. Aller sur: https://supabase.com/dashboard/project/YOUR-PROJECT-ID/settings/vault
2. Cliquer `New Secret`
3. Name: `GITHUB_TOKEN`
4. Value: `ghp_REDACTED`
5. Cliquer `Add secret`

### Option B: Via la ligne de commande

```bash
# Si vous avez Supabase CLI installé
supabase secrets set GITHUB_TOKEN=REDACTED
```

---

## 📋 ÉTAPE 3: Configurer votre repository dans Supabase (30 sec)

```sql
-- Depuis l'onglet SQL Editor de Supabase
UPDATE git_repository_config
SET
  repository_url = 'https://github.com/VOTRE-USERNAME/taxiassur',
  branch_name = 'main',
  auto_commit_enabled = true,
  auto_deploy_enabled = true
WHERE id = (SELECT id FROM git_repository_config LIMIT 1);
```

Remplacez `VOTRE-USERNAME` par votre username GitHub!

---

## 📋 ÉTAPE 4: Connecter GitHub à Bolt.new (1 min)

### 4.1 Aller sur Bolt.new

```
https://bolt.new/~/YOUR-PROJECT
```

### 4.2 Settings → Git

1. Cliquer `Connect to GitHub`
2. Autoriser Bolt.new
3. Sélectionner le repository `taxiassur`
4. Branch: `main`

### 4.3 Activer Auto-Deploy

```
☑️ Automatically deploy when changes are pushed to main
```

Cliquer `Save`

---

## 📋 ÉTAPE 5: Tester le système (1 min)

### 5.1 Déclencher une publication test

```sql
-- Depuis SQL Editor Supabase
SELECT add_code_to_publish_queue(
  p_file_path := 'TEST_IA_PUBLICATION.md',
  p_file_content := '# Test Publication IA

Ce fichier a été créé automatiquement par le système IA de TaxiAssur.

Date: ' || now()::text,
  p_operation := 'create',
  p_commit_message := 'Test publication automatique IA',
  p_triggered_by := 'configuration-test',
  p_priority := 10
);
```

### 5.2 Forcer publication immédiate

```sql
SELECT trigger_immediate_publish();
```

### 5.3 Vérifier le résultat (2 minutes)

1. **GitHub**: Vérifier le commit
   - https://github.com/VOTRE-USERNAME/taxiassur/commits/main
   - Vous devriez voir: `[IA SEO] Test publication automatique IA`

2. **Bolt.new**: Vérifier le rebuild
   - Aller sur Bolt.new → Deployments
   - Vous devriez voir un nouveau déploiement en cours

3. **Vérifier le fichier**
   - https://github.com/VOTRE-USERNAME/taxiassur/blob/main/TEST_IA_PUBLICATION.md
   - Le fichier doit être présent

---

## ✅ Vérification finale

```sql
-- Vérifier les stats de publication
SELECT * FROM get_publish_stats();
```

Résultat attendu:
```json
{
  "pending": 0,
  "processing": 0,
  "published": 1,    // ← Devrait être au minimum 1
  "failed": 0,
  "success_rate": 100.0
}
```

```sql
-- Voir l'historique
SELECT
  file_path,
  success,
  commit_sha,
  published_at
FROM code_publish_history
ORDER BY published_at DESC
LIMIT 5;
```

---

## 🎉 CONFIGURATION TERMINÉE!

### Que se passe-t-il maintenant automatiquement?

**Toutes les 6 heures**:
1. 🔍 GSC sync → Détecte opportunités SEO
2. 🤖 IA analyse → Décide quoi créer/optimiser
3. 💻 Génère du code React automatiquement
4. 📝 Ajoute à la queue de publication

**Toutes les 10 minutes**:
1. 🚀 Publie le code sur GitHub
2. 🔨 Bolt.new rebuild automatiquement
3. 🌐 Nouvelles pages en ligne

**Résultat**: Votre site se développe tout seul! 🤖✨

---

## 🔧 Configuration avancée (optionnel)

### Webhook Bolt.new pour rebuild instantané

Si vous voulez rebuild immédiatement au lieu d'attendre que Bolt détecte:

1. **Créer un webhook Bolt.new**
   - Settings → Webhooks → Add webhook
   - URL: Copiez l'URL du webhook
   - Events: `Push to main`

2. **Configurer dans Supabase**
   ```bash
   supabase secrets set BOLT_REBUILD_WEBHOOK_URL=https://webhook.bolt.new/xxxxx
   ```

3. **Activer dans la config**
   ```sql
   UPDATE git_repository_config
   SET auto_deploy_enabled = true;
   ```

---

## 🐛 Troubleshooting

### Le commit n'apparaît pas sur GitHub

1. Vérifier le token:
   ```sql
   -- Le secret doit exister
   SELECT name FROM vault.secrets WHERE name = 'GITHUB_TOKEN';
   ```

2. Vérifier les erreurs:
   ```sql
   SELECT error_message FROM code_publish_history
   WHERE success = false
   ORDER BY published_at DESC
   LIMIT 5;
   ```

### Bolt.new ne rebuild pas

1. Vérifier que Auto-deploy est activé
2. Vérifier que la branche est bien `main`
3. Forcer un rebuild manuel pour tester

### Queue bloquée

```sql
-- Réinitialiser les publications bloquées
UPDATE code_publish_queue
SET status = 'pending', attempts = 0
WHERE status = 'processing'
  AND updated_at < now() - interval '30 minutes';
```

---

## 📞 Support

Si vous rencontrez un problème:

1. Vérifier les logs:
   ```sql
   SELECT * FROM code_publish_history
   WHERE success = false
   ORDER BY published_at DESC;
   ```

2. Forcer une nouvelle tentative:
   ```sql
   SELECT trigger_immediate_publish();
   ```

3. Vérifier la config Git:
   ```sql
   SELECT * FROM git_repository_config;
   ```

---

## 🎓 Prochaines étapes

Une fois configuré:

1. ✅ Laisser tourner 24h
2. ✅ Vérifier les stats le lendemain
3. ✅ Observer les nouvelles pages créées
4. ✅ Profiter du SEO automatique!

**Votre CRM devient une machine à générer du trafic SEO automatiquement!** 🚀
