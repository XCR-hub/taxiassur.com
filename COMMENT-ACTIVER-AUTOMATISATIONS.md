# 🎯 COMMENT ACTIVER LES AUTOMATISATIONS

## 📍 Pourquoi elles sont OFF par défaut ?

**Pour la SÉCURITÉ en production** :
- Les automatisations sont désactivées par défaut pour éviter toute exécution non désirée
- Tu dois les activer manuellement après configuration
- Cela te permet de vérifier que tout fonctionne avant activation

---

## 🚀 MÉTHODE 1 : VIA LE BACKOFFICE (NOUVEAU - RECOMMANDÉ)

### Étape 1 : Va dans le Dashboard

1. Ouvre ton backoffice : https://taxiassur.fr/backoffice
2. Clique sur "Dashboard" dans le menu

### Étape 2 : Section "Automatisations"

Tu verras une section avec :
- **Titre** : "Automatisations (X/16 actives)"
- **2 NOUVEAUX BOUTONS** :
  - 🟢 **TOUT ACTIVER** (bouton vert)
  - 🔴 **TOUT ARRÊTER** (bouton rouge)

### Étape 3 : Activer TOUT en un clic

1. **Clique sur le bouton vert "TOUT ACTIVER"**
2. Une alerte confirme : "✅ Toutes les automatisations sont activées !"
3. Les cartes changent de couleur :
   - OFF (gris) → ON (vert)
4. Le compteur passe de "X/16" → "16/16 actives"

**C'EST FAIT ! Toutes les automatisations sont maintenant actives.**

### Étape 4 : Activer/Désactiver individuellement

Chaque carte d'automatisation a un bouton :
- **OFF** (gris) → Clique pour activer
- **ON** (vert) → Clique pour désactiver

---

## 🗄️ MÉTHODE 2 : VIA SQL (SI TU PRÉFÈRES)

### Étape 1 : Ouvre Supabase

https://drohhxrkoequjphvabvq.supabase.co

### Étape 2 : SQL Editor

1. Menu gauche → "SQL Editor"
2. Clique "New query"

### Étape 3 : Copie cette requête

```sql
-- Activer TOUTES les automatisations
UPDATE automation_status
SET
  is_enabled = true,
  updated_at = NOW()
WHERE is_enabled = false;

-- Vérifier l'activation
SELECT
  name as "Automatisation",
  is_enabled as "Activée",
  frequency as "Fréquence"
FROM automation_status
ORDER BY name;
```

### Étape 4 : Exécute (RUN)

Tu verras toutes les automatisations avec `is_enabled = true`

---

## 📊 LES 16 AUTOMATISATIONS DISPONIBLES

### Automatisations Marketing (5)

1. ✅ **Calcul automatique récompenses ambassadeurs** (daily)
2. ✅ **Prospection automatique opportunités backlinks** (daily)
3. ✅ **Partage automatique sur réseaux sociaux** (daily)
4. ✅ **Surveillance automatique concurrence** (daily)
5. ✅ **Génération automatique contenu IA** (daily)

### Automatisations SEO (6)

6. ✅ **Soumission automatique IndexNow multi-moteurs** (hourly)
7. ✅ **Ping automatique Google & Bing** (daily)
8. ✅ **Mise à jour métriques SEO toutes pages** (hourly)
9. ✅ **Régénération automatique du sitemap XML** (daily)
10. ✅ **Génération contenu IA (blog/FAQ)** (daily)
11. ✅ **Optimisation méta-descriptions** (daily)

### Automatisations CRM (5)

12. ✅ **Relance automatique leads non contactés** (hourly)
13. ✅ **Scoring automatique des leads** (daily)
14. ✅ **Email automatique de bienvenue** (instant)
15. ✅ **Alerte leads prioritaires** (hourly)
16. ✅ **Export automatique leads** (daily)

---

## 🔍 VÉRIFICATION

### Dans le Backoffice

1. Recharge la page
2. Section "Automatisations"
3. Tu dois voir : **"16/16 actives"**
4. Toutes les cartes sont vertes avec badge "ON"

### Dans Supabase

```sql
SELECT COUNT(*) as total_actives
FROM automation_status
WHERE is_enabled = true;
```

Résultat attendu : `16`

---

## ⚙️ FRÉQUENCES D'EXÉCUTION

- **hourly** : Toutes les heures (leads, métriques SEO)
- **daily** : Une fois par jour à 00:00 UTC (contenu, backlinks, réseaux sociaux)
- **instant** : Déclenché immédiatement après un événement (email bienvenue)

---

## 🎯 QUAND LES AUTOMATISATIONS S'EXÉCUTENT ?

Après activation :
- **Hourly** : Dès la prochaine heure (ex: si tu actives à 14h30, prochaine exécution à 15h00)
- **Daily** : Dès minuit (00:00 UTC)
- **Instant** : Immédiatement sur événement

Tu peux voir les exécutions dans :
- Dashboard → Section "Automatisations" → Chaque carte montre "Runs : X/Y"
- Supabase → Table `automation_status` → Colonnes `total_runs`, `successful_runs`, `last_run_at`

---

## 📈 MONITORING

### Voir les statistiques

Chaque carte affiche :
- **Fréquence** : hourly/daily
- **Runs** : Nombre d'exécutions réussies / total
- **Dernier run** : Date/heure de la dernière exécution
- **Status** : ON (vert) ou OFF (gris)

### Voir les logs détaillés

```sql
SELECT
  name,
  total_runs,
  successful_runs,
  failed_runs,
  last_run_at,
  last_run_status,
  last_error
FROM automation_status
ORDER BY last_run_at DESC;
```

---

## ❌ DÉSACTIVER UNE AUTOMATISATION

### Méthode 1 : Via le Backoffice

1. Clique sur le bouton "ON" (vert) de l'automatisation
2. Il passe à "OFF" (gris)
3. L'automatisation est désactivée

### Méthode 2 : Via SQL

```sql
UPDATE automation_status
SET is_enabled = false
WHERE name = 'lead_followup'; -- Remplace par le nom
```

### Désactiver TOUT

Clique sur le bouton rouge **"TOUT ARRÊTER"** dans le Dashboard

---

## 🚨 EN CAS DE PROBLÈME

### Automatisation ne s'exécute pas ?

1. Vérifie qu'elle est bien ON (vert)
2. Vérifie la dernière exécution :
   ```sql
   SELECT name, is_enabled, last_run_at, last_error
   FROM automation_status
   WHERE name = 'ton_automatisation';
   ```
3. Vérifie les logs d'erreur dans `last_error`

### Trop d'exécutions / Trop de ressources ?

Désactive temporairement certaines automatisations hourly :
- Garde uniquement les essentielles (leads, métriques critiques)
- Passe les autres en daily

### Reset une automatisation

```sql
UPDATE automation_status
SET
  total_runs = 0,
  successful_runs = 0,
  failed_runs = 0,
  last_run_at = NULL,
  last_error = NULL
WHERE name = 'ton_automatisation';
```

---

## 💡 CONSEILS

### Pour démarrer

1. **Active TOUT** avec le bouton vert "TOUT ACTIVER"
2. **Surveille** pendant 24h
3. **Ajuste** si nécessaire (désactive celles qui ne servent pas)

### Configuration optimale

Pour un site en production, garde activées :
- ✅ Toutes les automatisations SEO (ping, sitemap, métriques)
- ✅ Relance leads automatique
- ✅ Partage réseaux sociaux
- ✅ Génération contenu IA

---

## 🎉 RÉSUMÉ

**Pour activer TOUT en 10 secondes** :

1. Ouvre le backoffice Dashboard
2. Clique sur le bouton vert "TOUT ACTIVER"
3. ✅ C'est fait !

**Les 16 automatisations sont maintenant actives et tournent automatiquement !**
