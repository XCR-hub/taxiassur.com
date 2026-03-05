# ✅ Configuration du Webhook Bolt.new - Guide Rapide

**URL récupérée:** `https://api.bolt.new/v1/deploy/github-mcmcpmfr`

---

## 🎯 Action Immédiate - 2 Minutes

### Option 1: Interface Web Supabase (Recommandée ✅)

1. **Allez sur votre Dashboard Supabase:**
   - https://supabase.com/dashboard

2. **Cliquez sur votre projet TaxiAssur**

3. **Allez dans:**
   ```
   Settings → Vault (dans le menu de gauche)
   ```

   Ou directement:
   ```
   https://supabase.com/dashboard/project/[VOTRE-PROJET-ID]/settings/vault
   ```

4. **Cliquez sur le bouton "New secret"**

5. **Remplissez:**
   ```
   Name: BOLT_REBUILD_WEBHOOK_URL
   Value: https://api.bolt.new/v1/deploy/github-mcmcpmfr
   ```

6. **Cliquez sur "Add secret"**

✅ **C'est tout ! Webhook configuré en 30 secondes.**

---

### Option 2: Via Terminal (Si Supabase CLI installé)

```bash
# Configuration automatique
npm run configure:bolt-webhook

# OU directement avec Supabase CLI
supabase secrets set BOLT_REBUILD_WEBHOOK_URL="https://api.bolt.new/v1/deploy/github-mcmcpmfr"
```

---

## 🔍 Vérification

### Vérifier que le secret est bien configuré:

```bash
supabase secrets list | grep BOLT_REBUILD_WEBHOOK_URL
```

Vous devriez voir:
```
BOLT_REBUILD_WEBHOOK_URL
```

---

## 🧪 Test Rapide

Testez que tout fonctionne:

```bash
# 1. Invoquer la fonction manuellement
supabase functions invoke git-auto-publisher

# 2. Voir les logs
supabase functions logs git-auto-publisher
```

---

## ⚙️ Configuration Additionnelle (Optionnel)

### Mettre à jour l'URL de votre repository GitHub

Si l'URL du repository n'est pas encore configurée correctement:

1. **Trouvez l'URL de votre repository GitHub**
   - Exemple: `https://github.com/votre-username/taxiassur`

2. **Mettez à jour dans Supabase:**

Via SQL Editor dans Supabase:
```sql
UPDATE git_repository_config
SET repository_url = 'https://github.com/VOTRE-USERNAME/taxiassur'
WHERE id = (SELECT id FROM git_repository_config LIMIT 1);
```

---

## 📊 Résultat Attendu

Une fois configuré, le système fonctionnera automatiquement:

```
┌─────────────────────────────────────────┐
│   Toutes les 10 minutes, le système:    │
└─────────────────────────────────────────┘

1. 📝 Vérifie s'il y a du contenu à publier
   └─> Table: code_publish_queue

2. 🔄 Commit sur GitHub
   └─> Via API GitHub + token

3. 🚀 Déclenche le rebuild Bolt.new
   └─> Via webhook configuré

4. ✅ Bolt.new rebuild automatiquement
   └─> En ~2-3 minutes

5. 🌐 Site mis à jour
   └─> Nouveau contenu visible
```

---

## 🆘 Besoin d'Aide ?

### Le secret n'apparaît pas dans la liste ?

**Attendez 30 secondes** puis réessayez:
```bash
supabase secrets list
```

### Vous ne trouvez pas la section "Vault" ?

Essayez ces chemins alternatifs:
- Settings → API → Secrets
- Settings → Database → Extensions (puis onglet "Vault")
- Project Settings → Vault

### Erreur "Supabase CLI not found" ?

Utilisez l'interface web (Option 1) qui fonctionne toujours.

---

## 🎉 Prochaines Étapes

Après avoir configuré le webhook:

1. ✅ Le webhook est prêt
2. 🤖 Les crons SEO vont publier automatiquement
3. 📈 Suivez les publications dans le dashboard admin
4. 🚀 Profitez du système autonome !

---

**Date:** 5 mars 2026
**Webhook:** `https://api.bolt.new/v1/deploy/github-mcmcpmfr`
**Secret Supabase:** `BOLT_REBUILD_WEBHOOK_URL`
**Status:** ⏳ À configurer manuellement
