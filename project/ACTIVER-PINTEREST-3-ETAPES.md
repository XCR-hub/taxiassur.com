# ✅ Activer Pinterest en 3 Étapes

## 📋 Prérequis
Vous avez déjà :
- ✅ App Pinterest ID : `1534523`
- ✅ Access Token : `pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA`

---

## 🚀 3 Étapes Simples

### Étape 1 : Exécuter le SQL de Configuration

1. Aller sur https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
2. Cliquer sur **SQL Editor** (icône ⚡)
3. Copier TOUT le contenu du fichier **`FIX-PINTEREST-CONFIGURATION-COMPLETE.sql`**
4. Coller dans l'éditeur
5. Cliquer sur **Run** (ou Ctrl+Enter)

✅ **Résultat attendu :**
```
Query executed successfully
1 row(s) returned
```

Vous verrez :
- `platform: pinterest`
- `is_active: true`
- `is_connected: true`
- `token_preview: pina_AMATW2QXAABNSBAAGCAB4DLX...`

---

### Étape 2 : Ajouter le Secret Supabase

1. Dans le menu gauche, cliquer sur **⚙️ Project Settings**
2. Aller dans **Edge Functions** → **Secrets**
3. Cliquer sur **Add a new secret**
4. Ajouter :

```
Name: PINTEREST_ACCESS_TOKEN
Value: pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA
```

5. Cliquer sur **Save**

✅ **Le secret est maintenant accessible à toutes vos Edge Functions**

---

### Étape 3 : Déployer l'Edge Function Pinterest

#### Option A : Via Supabase CLI (si installé)

```bash
supabase functions deploy pinterest-publisher
```

#### Option B : Via le Dashboard (recommandé)

1. Aller dans **Edge Functions** (icône ⚡ dans le menu gauche)
2. Cliquer sur **Deploy new function**
3. Nom : `pinterest-publisher`
4. Uploader le fichier : `supabase/functions/pinterest-publisher/index.ts`
5. Cliquer sur **Deploy**

✅ **L'Edge Function est déployée et prête !**

---

## 🎉 C'est Prêt ! Comment Tester ?

### Test Rapide via Backoffice

1. Aller sur `https://taxiassur.com/backoffice/social-media`
2. Cocher **Pinterest**
3. Cliquer sur **"Générer avec IA"**
4. Vérifier le contenu généré
5. Cliquer sur **"Publier maintenant"**
6. ✅ Épingle publiée sur Pinterest !

### Test Direct via API

```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/pinterest-publisher \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "5 Erreurs à Éviter en Assurance Taxi",
    "description": "Ne faites plus ces erreurs qui vous coûtent cher ! Découvrez nos conseils d'\''experts pour économiser jusqu'\''à 30% sur votre assurance taxi. #AssuranceTaxi #ConseilleurAssurance #Taxi",
    "link": "https://taxiassur.com/blog/5-erreurs-assurance-taxi",
    "image_url": "https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg"
  }'
```

✅ **Réponse attendue :**
```json
{
  "success": true,
  "pin_id": "123456789012345678",
  "pin_url": "https://www.pinterest.com/pin/123456789012345678/",
  "board_id": "987654321098765432",
  "created_at": "2025-10-21T23:00:00Z"
}
```

---

## 🎯 Vérifier que Tout Fonctionne

### Vérification 1 : La Configuration SQL

Exécutez dans Supabase SQL Editor :

```sql
SELECT
  platform,
  is_active,
  is_connected,
  auto_publish,
  LEFT(access_token, 20) || '...' as token
FROM social_networks
WHERE platform = 'pinterest';
```

✅ Devrait retourner :
```
platform: pinterest
is_active: true
is_connected: true
auto_publish: true
token: pina_AMATW2QXAABNSB...
```

### Vérification 2 : Le Secret Supabase

1. **Project Settings** → **Edge Functions** → **Secrets**
2. Vérifier que `PINTEREST_ACCESS_TOKEN` est présent

### Vérification 3 : L'Edge Function

1. Aller dans **Edge Functions**
2. Vérifier que `pinterest-publisher` est **deployed**
3. Status doit être **Active**

---

## 📊 Que Fait Pinterest Automatiquement ?

Quand vous publiez depuis le backoffice :

1. ✅ **Génère le contenu** avec OpenAI (titre + description optimisés SEO)
2. ✅ **Récupère une image** depuis Pexels (haute qualité, licence gratuite)
3. ✅ **Publie sur Pinterest** via l'API v5
4. ✅ **Enregistre dans `social_posts`** avec métriques
5. ✅ **Affiche dans le dashboard** avec lien vers l'épingle

---

## 🔥 Automatisation Complète (Bonus)

Une fois configuré, vous pouvez activer la publication automatique :

```sql
-- Activer la publication automatique quotidienne
UPDATE social_networks
SET
  auto_publish = true,
  config = jsonb_set(
    config,
    '{auto_schedule}',
    'true'
  )
WHERE platform = 'pinterest';
```

Pinterest publiera alors automatiquement :
- 📌 **3 épingles/jour**
- ⏰ **Aux heures optimales** (10h, 14h, 19h)
- 🎨 **Avec images Pexels** automatiques
- 📝 **Contenu généré par IA**

---

## 🆘 Problèmes Courants

### Erreur : "access_token manquant"
➡️ **Solution** : Vérifier que le secret `PINTEREST_ACCESS_TOKEN` est bien ajouté dans Supabase

### Erreur : "Board not found"
➡️ **Solution** : Créer au moins 1 board sur Pinterest.com

### Erreur : "Invalid token"
➡️ **Solution** : Le token expire après 24h. Générer un nouveau token sur https://developers.pinterest.com/apps/1534523/

### Erreur 403
➡️ **Solution** : Vérifier que l'app Pinterest a les bonnes permissions :
  - `pins:read`
  - `pins:write`
  - `boards:read`

---

## 📚 Documentation

- 📖 Guide complet : `PINTEREST-PRET-A-UTILISER.md`
- 🔧 Configuration API : `GUIDE-CONFIGURATION-PINTEREST-API.md`
- ✅ Vérification domain : `VERIFICATION-PINTEREST-AJOUTEE.md`

---

## ✅ Checklist Finale

- [ ] SQL exécuté (`FIX-PINTEREST-CONFIGURATION-COMPLETE.sql`)
- [ ] Secret ajouté dans Supabase (`PINTEREST_ACCESS_TOKEN`)
- [ ] Edge Function déployée (`pinterest-publisher`)
- [ ] Test de publication réussi
- [ ] Premier post visible sur Pinterest
- [ ] Stats visibles dans le backoffice

---

## 🎉 Terminé !

**Pinterest est maintenant complètement intégré à TaxiAssur !**

Vous pouvez :
- ✅ Publier en 1 clic depuis le backoffice
- ✅ Générer du contenu avec IA
- ✅ Récupérer les statistiques
- ✅ Automatiser les publications

**Besoin d'aide ?** → Voir `PINTEREST-PRET-A-UTILISER.md` pour tous les détails
