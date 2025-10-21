# 🚀 Démarrage Rapide - Générateur IA Réseaux Sociaux

## ❌ Problème Actuel
Erreur 500 lors du clic sur **"Générer avec IA"** dans `/backoffice/social-media`

## ✅ Solution en 3 Étapes (10 minutes)

### ÉTAPE 1 : Insérer les Templates Viraux (2 min)

1. **Ouvrir** : Supabase Dashboard → SQL Editor
2. **Copier/Coller** le contenu de : `FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql`
3. **Cliquer** : RUN
4. **Vérifier** : Doit afficher "5 templates actifs"

⚠️ **Important** : Utilisez la **V2** qui évite les erreurs de doublon (`ON CONFLICT`)

### ÉTAPE 2 : Configurer la Clé OpenAI (5 min)

#### A. Obtenir une Clé OpenAI

1. **Aller sur** : https://platform.openai.com/api-keys
2. **Se connecter** (créer un compte si besoin)
3. **Cliquer** : "Create new secret key"
4. **Nom** : `TaxiAssur-Production`
5. **Copier** la clé : `sk-proj-xxxxx...`

⚠️ **Important :**
- La clé ne s'affiche qu'UNE FOIS
- Vous devez avoir du crédit ou une carte enregistrée
- Coût estimé : ~$10/mois pour usage normal

#### B. Ajouter la Clé dans Supabase

1. **Aller sur** : https://supabase.com/dashboard
2. **Sélectionner** : Votre projet TaxiAssur
3. **Menu** : Settings → Edge Functions
4. **Section** : "Secrets and Environment Variables"
5. **Cliquer** : "Add new secret"
6. **Nom** : `OPENAI_API_KEY`
7. **Valeur** : Coller votre clé `sk-proj-xxxxx...`
8. **Save**

### ÉTAPE 3 : Tester le Générateur (3 min)

1. **Ouvrir** : https://taxiassur.com/backoffice/social-media
2. **Cliquer** : "Générer avec IA" (bouton avec icône wand)
3. **Attendre** : 5-10 secondes
4. **Résultat attendu** :
   ```
   ✅ 1 publication(s) générée(s) avec succès |
   Template: Question Choc - Assurance |
   Potentiel: 7.2M+ vues |
   Score humanisation: 85%
   ```

## 🎯 Résultats

Après configuration, le générateur peut créer :

### Types de Contenu Viral
- ✅ Posts LinkedIn professionnels
- ✅ Publications Facebook engageantes
- ✅ Tweets percutants
- ✅ Stories Instagram

### Templates Disponibles (5)
1. **Question Choc** - 7.2M vues moyennes
2. **Histoire Personnelle** - 5.8M vues
3. **Top 5 Erreurs** - 8.5M vues
4. **Avant/Après** - 6.4M vues
5. **Mythe vs Réalité** - 7.8M vues

### Caractéristiques
- 🤖 Contenu généré par GPT-4
- 👤 Humanisé (non détectable comme IA)
- 🎯 Optimisé pour engagement maximum
- 📊 Hashtags automatiques
- ⏰ Suggestion heure optimale publication

## 🔍 Vérification Rapide

### Check 1 : Templates OK ?
```sql
SELECT COUNT(*) FROM viral_templates WHERE is_active = true;
-- Résultat attendu : 5
```

### Check 2 : Fonction RPC OK ?
```sql
SELECT name, avg_views FROM get_viral_template('assurance');
-- Doit retourner au moins 1 template
```

### Check 3 : Clé OpenAI OK ?
1. Supabase Dashboard → Edge Functions → Secrets
2. Voir : `OPENAI_API_KEY` dans la liste
3. Status : 🟢 (vert)

## ⚠️ Dépannage Express

### Erreur : "No viral template found"
**Cause :** Étape 1 pas faite
**Solution :** Exécuter `FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql`

### Erreur : "OPENAI_API_KEY not configured"
**Cause :** Étape 2 pas faite ou mal faite
**Solution :** Vérifier Settings → Edge Functions → Secrets

### Erreur : "Incorrect API key"
**Cause :** Clé OpenAI invalide
**Solution :** Régénérer une nouvelle clé sur platform.openai.com

### Erreur : "You exceeded your current quota"
**Cause :** Pas de crédit OpenAI
**Solution :** Ajouter du crédit sur platform.openai.com/account/billing

### Erreur 500 autre
**Solution :**
1. Ouvrir la console navigateur (F12)
2. Regarder l'erreur exacte
3. Vérifier les logs : Supabase → Edge Functions → Logs → `ai-viral-content-generator`

## 💰 Coûts

### OpenAI (GPT-4)
- **Par génération** : ~$0.04
- **10 posts/jour** : ~$12/mois
- **5 posts/jour** : ~$6/mois

### Alternative Économique
Modifier pour utiliser GPT-3.5-Turbo (10x moins cher) :
- **Par génération** : ~$0.004
- **10 posts/jour** : ~$1.2/mois

## 📚 Documentation Complète

Pour plus de détails, voir :
- `CONFIGURATION-OPENAI-SUPABASE.md` - Guide complet configuration
- `FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql` - Script d'installation (sans erreur)
- `FIX-GENERATEUR-IA-SOCIAL-MEDIA.sql` - Version originale (peut avoir erreur ON CONFLICT)
- Edge Function : `supabase/functions/ai-viral-content-generator/index.ts`

## ✅ Checklist Finale

- [ ] Templates viraux insérés (5 templates actifs)
- [ ] Clé OpenAI créée et copiée
- [ ] Secret OPENAI_API_KEY configuré dans Supabase
- [ ] Test "Générer avec IA" réussi
- [ ] Message de succès avec contenu généré

**Tout est coché ?** 🎉 Le système est opérationnel !

## 🎓 Utilisation

1. **Générer** : Clic sur "Générer avec IA"
2. **Éditer** : Modifier le contenu généré si besoin
3. **Planifier** : Choisir date/heure de publication
4. **Publier** : Cliquer "Publier maintenant" ou laisser auto-publier

Le générateur utilise des templates viraux testés qui ont généré entre 5.8M et 8.5M de vues en moyenne. Le contenu est humanisé pour éviter la détection IA et optimisé pour maximiser l'engagement.

---

**Besoin d'aide ?**
- Vérifier les logs : Supabase → Functions → Logs
- Console navigateur (F12) pour erreurs frontend
- Documentation : `CONFIGURATION-OPENAI-SUPABASE.md`
