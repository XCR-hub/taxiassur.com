# Solution : Erreur Google CSE API 403 (Forbidden)

## 🔴 Erreur Affichée

```
GET https://www.googleapis.com/customsearch/v1?key=AIzaSy...&cx=73ba86...&q=taxi+partenariat 403 (Forbidden)
```

**Message popup** :
```
❌ 🔑 Clés API Google CSE invalides ou quota dépassé. Vérifiez votre console Google Cloud.
```

## 📊 Causes Possibles

### 1. Quota Journalier Dépassé (Le Plus Probable)

**Limite gratuite** : 100 requêtes/jour
**Reset** : Tous les jours à minuit (heure Pacific, USA)

**Vérification** :
1. Console Google Cloud : https://console.cloud.google.com
2. Navigation : API & Services > Quotas & System Limits
3. Recherchez : "Custom Search API"
4. Regardez : "Queries per day"

**Solution immédiate** :
- ⏰ **Attendez demain** (minuit heure Pacific)
- OU 💰 **Passez au plan payant** (5$/1000 requêtes)
- OU 🎭 **Utilisez le mode simulation** (données de test)

### 2. Clés API Invalides

**Vérification du fichier `.env`** :
```env
VITE_GOOGLE_CSE_API_KEY=AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
VITE_GOOGLE_CSE_CX=73ba86b5aae9b4add
```

**Problèmes possibles** :
- ❌ Clé API révoquée ou expirée
- ❌ Restrictions IP/domaine trop strictes
- ❌ API Custom Search non activée
- ❌ Projet Google Cloud sans facturation

### 3. API Non Activée

**Activation** :
1. https://console.cloud.google.com/apis/library/customsearch.googleapis.com
2. Cliquez sur "ACTIVER"
3. Attendez 1-2 minutes

### 4. Facturation Non Activée

Pour utiliser Google Custom Search (même l'offre gratuite), la facturation doit être activée :

1. https://console.cloud.google.com/billing
2. Cliquez sur "Associer un compte de facturation"
3. Ajoutez une carte bancaire valide
4. **Rassurez-vous** : Les 100 premières requêtes/jour sont GRATUITES

## ✅ Solutions Par Ordre de Priorité

### Solution 1 : Vérifier le Quota (La Plus Simple)

**Étapes** :
1. Allez sur : https://console.cloud.google.com/apis/dashboard
2. Cliquez sur "Custom Search API"
3. Onglet "Quotas"
4. Regardez "Requests per day" : 100/100 = quota dépassé

**Si quota dépassé** :
- Option A : Attendez jusqu'à demain
- Option B : Passez au plan payant (voir Solution 4)
- Option C : Utilisez le mode simulation (voir Solution 5)

### Solution 2 : Vérifier et Regénérer les Clés

**API Key** :
1. https://console.cloud.google.com/apis/credentials
2. Trouvez votre clé API
3. Vérifiez les restrictions :
   - Application restrictions : HTTP referrers
   - Autorisez : `http://localhost:*`, `https://taxiassur.com/*`
   - API restrictions : Custom Search API seulement

**CX (Custom Search Engine ID)** :
1. https://programmablesearchengine.google.com/controlpanel/all
2. Sélectionnez votre moteur de recherche
3. Copiez le "Search engine ID" (cx)
4. Mettez à jour `.env` avec la nouvelle valeur

### Solution 3 : Activer l'API et la Facturation

**Activer Custom Search API** :
```
1. https://console.cloud.google.com/apis/library
2. Recherchez "Custom Search API"
3. Cliquez sur "ACTIVER"
```

**Activer la Facturation** :
```
1. https://console.cloud.google.com/billing
2. Créer ou associer un compte de facturation
3. Ajouter une carte bancaire
4. Accepter les conditions
```

**⚠️ Important** : Même avec facturation, les 100 premières requêtes/jour restent GRATUITES.

### Solution 4 : Passer au Plan Payant

**Tarification** :
- 100 premières requêtes/jour : **GRATUIT**
- 1 à 10,000 requêtes/jour : **5$ pour 1000 requêtes**
- Maximum : 10,000 requêtes/jour

**Activation** :
1. Facturation déjà activée (voir Solution 3)
2. Les requêtes au-delà de 100/jour seront automatiquement facturées
3. Configurez des alertes budgétaires pour éviter les surprises

**Estimation des coûts** :
- 500 requêtes/jour = ~60$/mois (400 requêtes payantes × 30 jours × 0.005$)
- 200 requêtes/jour = ~15$/mois (100 requêtes payantes × 30 jours × 0.005$)

### Solution 5 : Utiliser le Mode Simulation (Sans API)

Le système a un **mode simulation intégré** qui fonctionne sans clés API.

**Activation automatique** :
- Si `VITE_GOOGLE_CSE_API_KEY` ou `VITE_GOOGLE_CSE_CX` sont vides dans `.env`
- Le mode simulation s'active automatiquement

**Résultats simulés** :
```json
{
  "items": [
    {
      "title": "Résultat simulation pour: taxi partenariat",
      "link": "https://exemple-annuaire-taxi.fr/partenaires",
      "snippet": "Exemple de prospect trouvé par Partner Finder..."
    },
    {
      "title": "Association Taxi - taxi partenariat",
      "link": "https://exemple-federation-taxi.org/contact",
      "snippet": "Exemple d'association taxi trouvée..."
    },
    {
      "title": "Blog Transport - taxi partenariat",
      "link": "https://exemple-blog-taxi.fr/partenariat",
      "snippet": "Exemple de blog taxi trouvé..."
    }
  ],
  "hasNextPage": false,
  "remainingQuota": 100
}
```

**Pour activer le mode simulation** :
1. Éditez `.env`
2. Commentez ou supprimez les lignes :
   ```env
   # VITE_GOOGLE_CSE_API_KEY=
   # VITE_GOOGLE_CSE_CX=
   ```
3. Redémarrez l'application
4. Le message apparaîtra : "🔍 Partner Finder: Mode simulation (clés API Google non configurées)"

**Avantages** :
- ✅ Pas de limite de requêtes
- ✅ Pas de coût
- ✅ Permet de tester l'interface
- ✅ Idéal pour développement/démo

**Inconvénients** :
- ❌ Données fictives
- ❌ Toujours les mêmes résultats
- ❌ Ne trouve pas de vrais prospects

## 🎯 Recommandation Finale

### Pour Production
1. **Activez la facturation** Google Cloud (obligatoire)
2. **Utilisez l'offre gratuite** (100 requêtes/jour)
3. **Optimisez l'utilisation** :
   - Cachez les résultats localement
   - Limitez les recherches répétées
   - Utilisez Supabase pour stocker les prospects trouvés

### Pour Développement
1. **Mode simulation** (sans API)
2. Testez l'interface et les fonctionnalités
3. Passez à l'API réelle uniquement pour les tests finaux

### Optimisation du Quota

**Cache local implémenté** :
```typescript
// Le système compte les requêtes par jour
localStorage.getItem('cse_call_count') // Nombre de requêtes aujourd'hui
localStorage.getItem('cse_last_reset') // Date du dernier reset
```

**Reset automatique** : À minuit, le compteur repart à 0

**Throttling** : 1 seconde minimum entre chaque requête

## 📞 Support

### Documentation Officielle
- API Custom Search : https://developers.google.com/custom-search/v1/overview
- Tarification : https://developers.google.com/custom-search/v1/overview#pricing
- Quotas : https://developers.google.com/custom-search/v1/overview#quotas

### Erreurs Courantes

| Code | Message | Solution |
|------|---------|----------|
| 403 | Forbidden | Quota dépassé OU clés invalides |
| 400 | Bad Request | Vérifiez les paramètres de recherche |
| 429 | Too Many Requests | Trop de requêtes trop vite, attendez |
| 401 | Unauthorized | Clé API invalide ou manquante |

## ✅ Checklist de Vérification

Avant de contacter le support :

- [ ] J'ai vérifié le quota dans Google Cloud Console
- [ ] J'ai attendu jusqu'au lendemain (reset minuit Pacific)
- [ ] La facturation est activée sur mon projet Google Cloud
- [ ] L'API Custom Search est activée
- [ ] Mes clés API sont correctes dans `.env`
- [ ] J'ai redémarré l'application après modification de `.env`
- [ ] J'ai testé le mode simulation (sans clés API)
- [ ] J'ai vérifié les restrictions sur ma clé API (domaines autorisés)

---

**Dernière mise à jour** : 2025-10-09

**Version système** : Compatible avec toutes les versions incluant `src/lib/cse.ts`
