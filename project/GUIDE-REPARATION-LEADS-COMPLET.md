# 🚨 GUIDE COMPLET : RÉPARATION TABLE LEADS

## ❌ ERREUR ACTUELLE
```
ERROR: 22P02: invalid input value for enum lead_status_enum: "taxi"
```

## 🔍 DIAGNOSTIC

### Problème identifié
1. La colonne `lead_status` est un **ENUM PostgreSQL** (au lieu de TEXT)
2. L'ENUM n'accepte pas certaines valeurs
3. Il y a confusion entre `status` (type de contrat) et `lead_status` (état du lead)

### Ce qui devrait être
- **`status`** → Type de contrat : `'taxi'`, `'vtc'`, `'autre'`
- **`lead_status`** → État du lead : `'nouveau'`, `'contacté'`, `'devis envoyé'`, `'client'`, `'perdu'`

---

## ✅ SOLUTION EN 3 ÉTAPES

### ÉTAPE 1 : Diagnostic (Facultatif mais recommandé)

**Ouvrez Supabase SQL Editor** et exécutez :
```sql
-- Voir la structure actuelle
SELECT
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('status', 'lead_status')
ORDER BY column_name;
```

**Résultat attendu :**
- Si vous voyez `udt_name: lead_status_enum` → C'est bien le problème ENUM
- Si vous voyez `data_type: text` → Le problème est ailleurs

---

### ÉTAPE 2 : Réparation (OBLIGATOIRE)

**Exécutez le script complet dans Supabase SQL Editor :**

📄 **Fichier : `FIX-LEAD-STATUS-ENUM-TO-TEXT.sql`**

Ce script va :
1. ✅ Convertir `lead_status` de ENUM → TEXT
2. ✅ Convertir `status` de ENUM → TEXT (si nécessaire)
3. ✅ Supprimer tous les ENUM (lead_status_enum, status_enum, etc.)
4. ✅ Ajouter des contraintes CHECK pour valider les valeurs
5. ✅ Ajouter toutes les colonnes manquantes
6. ✅ Nettoyer les données invalides existantes
7. ✅ Afficher la structure finale

**Comment faire :**
1. Ouvrez le fichier `FIX-LEAD-STATUS-ENUM-TO-TEXT.sql`
2. Copiez TOUT le contenu
3. Collez dans Supabase SQL Editor
4. Cliquez sur **RUN** (ou Ctrl+Enter)
5. Vérifiez qu'il n'y a pas d'erreurs

**⚠️ IMPORTANT :** Ce script conserve toutes les données existantes !

---

### ÉTAPE 3 : Test d'insertion

**Exécutez le script de test :**

📄 **Fichier : `TEST-INSERT-LEAD.sql`**

Ce script va :
1. Afficher la structure
2. Insérer un lead de test (exactement comme le formulaire)
3. Afficher les derniers leads créés

**Si le test réussit** : ✅ La base est réparée !
**Si le test échoue** : ❌ Partagez-moi l'erreur exacte

---

## 🎯 APRÈS LA RÉPARATION

### 1. Upload le frontend
Le dossier `/dist` est déjà prêt avec les bonnes valeurs :
- `lead_status: 'nouveau'` ✅
- `status: 'taxi'` ✅

### 2. Testez le formulaire
1. Remplissez le formulaire sur votre site
2. Vérifiez que vous recevez les 3 emails
3. Allez sur `/backoffice/leads`
4. Le lead devrait apparaître !

---

## 🐛 DÉPANNAGE

### Si vous avez encore des erreurs

**Erreur : "column does not exist"**
→ Relancez `FIX-LEAD-STATUS-ENUM-TO-TEXT.sql` (il ajoute les colonnes manquantes)

**Erreur : "check constraint violated"**
→ Vérifiez que vous utilisez les bonnes valeurs :
  - `status`: `'taxi'`, `'vtc'`, `'autre'`
  - `lead_status`: `'nouveau'`, `'contacté'`, `'devis envoyé'`, `'client'`, `'perdu'`

**Erreur : "permission denied"**
→ Vérifiez les policies RLS (le script ne les modifie pas)

**Table vide après réparation**
→ Normal si elle était vide avant. Testez l'insertion avec `TEST-INSERT-LEAD.sql`

---

## 📝 RÉSUMÉ DES FICHIERS

| Fichier | Usage |
|---------|-------|
| `FIX-LEAD-STATUS-ENUM-TO-TEXT.sql` | **OBLIGATOIRE** - Répare la structure |
| `TEST-INSERT-LEAD.sql` | Test rapide après réparation |
| `DIAGNOSTIC-STRUCTURE-LEADS.sql` | Diagnostic détaillé (facultatif) |
| `FIX-LEADS-STRUCTURE-COMPLETE.sql` | Alternative si ENUM déjà supprimé |

---

## ✅ CHECKLIST FINALE

- [ ] Exécuté `FIX-LEAD-STATUS-ENUM-TO-TEXT.sql`
- [ ] Pas d'erreurs dans SQL Editor
- [ ] Test d'insertion réussi (`TEST-INSERT-LEAD.sql`)
- [ ] Upload du `/dist` sur IONOS
- [ ] Formulaire testé sur le site
- [ ] Lead visible dans `/backoffice/leads`

---

## 🆘 BESOIN D'AIDE ?

Si après avoir suivi ce guide vous avez encore des erreurs :
1. Copiez l'erreur EXACTE
2. Exécutez ce diagnostic :
```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'leads';
```
3. Partagez-moi les résultats

---

**Le code frontend est déjà corrigé. Il ne reste plus qu'à réparer la base de données !**
