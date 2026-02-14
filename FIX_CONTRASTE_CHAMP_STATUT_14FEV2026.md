# FIX ERREUR UPLOAD DEVIS - Cache PostgREST - 14 Février 2026

## 🔴 Erreur Rencontrée

```
Erreur lors de l'upload du devis
Erreur base de données: Could not find the 'insurance_company_id' column 
of 'lead_company_quotes' in the schema cache
```

## 🎯 Cause Racine

**Cache PostgREST non synchronisé** : Le client Supabase dans le navigateur a un cache du schéma de base de données qui n'inclut pas la colonne `insurance_company_id`, même si elle existe bien dans la base.

## ✅ Corrections Appliquées

### 1. Migration pour Forcer le Reload du Cache

Une migration a été créée qui :
- Envoie des signaux `NOTIFY` à PostgREST
- Met à jour les commentaires de table (force l'invalidation du cache)
- Rafraîchit les statistiques de la table

**Fichier** : `supabase/migrations/.../fix_postgrest_cache_lead_company_quotes_14fev2026.sql`

### 2. Vérification

La colonne existe bien dans la base :
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'lead_company_quotes'
AND column_name = 'insurance_company_id';
-- ✅ Résultat : insurance_company_id
```

L'INSERT SQL fonctionne :
```sql
INSERT INTO lead_company_quotes (..., insurance_company_id, ...)
-- ✅ Succès
```

## 🚀 Solution Immédiate (Utilisateur)

### Étape 1 : Vider le Cache Navigateur

**Chrome / Edge / Brave** :
1. `Ctrl + Shift + Delete`
2. Cocher : **"Images et fichiers en cache"** + **"Données hébergées d'applications"**
3. Période : **"Depuis toujours"**
4. Cliquer : **"Effacer les données"**

**Firefox** :
1. `Ctrl + Shift + Delete`
2. Cocher : **"Cache"** + **"Données de site web hors connexion"**
3. Période : **"Tout"**
4. **"Effacer maintenant"**

### Étape 2 : Recharger Complètement la Page

1. Fermer l'onglet taxiassur.com
2. Ouvrir un **nouvel onglet**
3. Aller sur : https://taxiassur.com/backoffice/crm-killer
4. Forcer le rechargement : `Ctrl + Shift + R`

### Étape 3 : Réessayer l'Upload

1. Sélectionner le lead
2. Aller dans **"Étape 3 : Saisie Devis"**
3. Choisir la compagnie (Generali, 2MA, etc.)
4. Uploader le PDF du devis
5. Cliquer sur **"Cliquez pour uploader un devis"**

**Résultat attendu** : ✅ Devis [Compagnie] uploadé avec succès !

---

## 🔍 Diagnostic Technique

### Pourquoi ce problème arrive ?

PostgREST (l'API REST de Supabase) maintient un **cache du schéma** pour des raisons de performance. Quand une migration ajoute une colonne :

1. La colonne est créée en base ✅
2. PostgREST doit recharger son cache (NOTIFY)
3. Le client Supabase dans le navigateur doit aussi se rafraîchir

Si le navigateur garde un **cache obsolète**, il envoie des requêtes avec l'ancien schéma → erreur.

### Vérification Post-Fix

Après avoir vidé le cache, ouvrir la console (F12) et taper :

```javascript
// Vérifier la version du schéma
await supabase.from('lead_company_quotes').select('insurance_company_id').limit(1)
// Devrait retourner : { data: [...], error: null }
// PAS : { error: { message: "Could not find..." } }
```

---

## 📋 Checklist de Résolution

- [x] Migration appliquée (NOTIFY + commentaires)
- [x] Colonne vérifiée en base (existe)
- [x] INSERT SQL testé (fonctionne)
- [ ] **Cache navigateur vidé** (à faire par l'utilisateur)
- [ ] **Page rechargée** (Ctrl + Shift + R)
- [ ] **Upload devis réessayé** (devrait fonctionner)

---

## 🛠️ Prévention Future

Pour éviter ce problème à l'avenir :

### 1. Après chaque migration importante

```bash
# Côté serveur (automatique maintenant)
NOTIFY pgrst, 'reload schema';
```

### 2. Côté client (dans le code)

Ajouter un mécanisme de **retry avec reload** :

```typescript
// Dans supabase-instance.ts
const insertWithRetry = async (table, data) => {
  try {
    return await supabase.from(table).insert(data);
  } catch (error) {
    if (error.message.includes('schema cache')) {
      // Forcer le reload du client
      await supabase.removeAllChannels();
      // Retry
      return await supabase.from(table).insert(data);
    }
    throw error;
  }
};
```

### 3. Notification utilisateur

Ajouter un banner en haut du backoffice :

```typescript
if (schemaOutOfDate) {
  return (
    <div className="bg-yellow-500 text-white p-2 text-center">
      ⚠️ Nouvelle mise à jour détectée. 
      <button onClick={() => window.location.reload()}>
        Cliquer ici pour recharger
      </button>
    </div>
  );
}
```

---

## 📊 Résumé

| Problème | Cause | Solution |
|----------|-------|----------|
| "Could not find column" | Cache PostgREST obsolète | Migration NOTIFY + commentaires |
| Erreur persiste côté client | Cache navigateur | Vider cache + Ctrl+Shift+R |
| Schéma pas à jour | Service Worker | Désinscrire SW (DevTools) |

---

**Date** : 14 février 2026 - 16:50
**Status** : ✅ Backend fixé, cache utilisateur à vider
**Prochaine étape** : Vider cache navigateur + recharger page
