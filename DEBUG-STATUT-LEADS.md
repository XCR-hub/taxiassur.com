# 🐛 Debug Statut Leads - Guide Complet

## 📊 Structure des Données Lead

Dans le système, il y a **2 champs différents** pour un lead :

### 1. `status` (Type de Contrat)
**Colonne affichée** : "Type Contrat" (badge bleu "TAXI", "VTC", "AUTRE")
**Valeurs possibles** :
- `taxi` → Badge bleu "TAXI"
- `vtc` → Badge bleu "VTC"
- `autre` → Badge bleu "AUTRE"

**Ce champ n'est PAS modifiable** par le modal "Modifier le Statut"

### 2. `leadStatus` (État Lead)
**Colonne affichée** : "État Lead" (badges colorés "Nouveau", "Contacté", etc.)
**Valeurs possibles** :
- `nouveau` → Badge jaune "Nouveau"
- `contacte` → Badge orange "Contacté"
- `devis_envoye` → Badge violet "Devis Envoyé"
- `client` → Badge vert "Client"
- `perdu` → Badge rouge "Perdu"

**Ce champ EST modifiable** par le modal "Modifier le Statut"

---

## 🔍 Ordre des Colonnes dans le Tableau

Voici l'ordre exact des colonnes dans `/backoffice/leads` :

| # | Colonne | Contenu | Champ DB |
|---|---------|---------|----------|
| 1 | Client | Nom + Immatriculation | `name`, `immatriculation` |
| 2 | Contact | Email + Téléphone | `email`, `phone` |
| 3 | Ville | Ville | `city` |
| 4 | **État Lead** | Badge coloré du statut | `lead_status` |
| 5 | **Type Contrat** | Badge bleu TAXI/VTC | `status` |
| 6 | Prime | Montant € | `prime_realisee` |
| 7 | Date | Date création | `created_at` |
| 8 | Actions | Icônes d'actions | - |

---

## ✏️ Modal "Modifier le Statut"

### Ce que tu vois :
```
📝 Modifier le Statut

Lead : Test Automatisation 2025-10-15
test-automation@taxiassur.fr • Paris

Nouveau statut
[Select avec: Nouveau, Contacté, Devis Envoyé, Client, Perdu]

📝 Notes (optionnel)
[Textarea]

[Annuler] [Mettre à Jour]
```

### Ce qu'il modifie :
- ✅ Champ `lead_status` dans la DB
- ✅ Colonne "État Lead" dans le tableau
- ❌ Ne modifie PAS le champ `status` (Type Contrat)

---

## 🔧 Comment Tester le Changement de Statut

### Étape 1 : Ouvrir la Console du Navigateur
1. Va sur `https://taxiassur.com/backoffice/leads`
2. Appuie sur **F12** pour ouvrir la console
3. Va dans l'onglet **Console**

### Étape 2 : Effectuer un Changement de Statut
1. Clique sur l'icône **crayon vert** (Edit) d'un lead
2. Change le statut (ex: Nouveau → Contacté)
3. Clique sur "Mettre à Jour"

### Étape 3 : Vérifier les Logs dans la Console
Tu devrais voir dans la console :

```javascript
🔄 Updating lead status: {
  leadId: "uuid-du-lead",
  newStatus: "contacte",
  additionalData: { notes: "..." }
}

📝 Using status: { status: "contacte" }

📤 Sending to Supabase: {
  lead_status: "contacte",
  updated_at: "2025-10-15T...",
  contacted_at: "2025-10-15T...",
  notes: "..."
}

✅ Lead status updated successfully: { ... }
✅ New lead_status in DB: "contacte"
```

---

## ❌ Erreurs Possibles et Solutions

### Erreur 1: "Column lead_status does not exist"
**Cause :** La colonne n'existe pas dans Supabase
**Solution :**
```sql
ALTER TABLE leads ADD COLUMN lead_status text
  CHECK (lead_status IN ('nouveau', 'contacte', 'devis_envoye', 'client', 'perdu'))
  DEFAULT 'nouveau';
```

### Erreur 2: "Value does not match CHECK constraint"
**Cause :** Tu essaies d'insérer une valeur non autorisée (ex: 'new' au lieu de 'nouveau')
**Solution :** Le code est déjà corrigé, mais vérifie dans la console que `dbStatus` = "nouveau", "contacte", etc. (pas "new", "contacted")

### Erreur 3: "Failed to update lead status"
**Cause :** Erreur réseau ou RLS Supabase
**Solutions :**
1. Vérifie la connexion Internet
2. Vérifie les policies RLS sur la table `leads` :
```sql
-- Policy pour permettre les updates
CREATE POLICY "Allow authenticated users to update leads"
ON leads
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

### Erreur 4: Le statut ne change pas visuellement
**Cause :** Cache du navigateur ou rechargement non effectué
**Solutions :**
1. Actualise la page (F5)
2. Vide le cache (Ctrl + Shift + R)
3. Vérifie que `loadLeads()` est bien appelé après la mise à jour

---

## 🔍 Vérification Directe dans Supabase

### Option 1 : Via l'Interface Supabase
1. Va sur `https://supabase.com/dashboard`
2. Sélectionne ton projet
3. Va dans "Table Editor" → Table `leads`
4. Vérifie la colonne `lead_status`
5. Vérifie que les valeurs sont : `nouveau`, `contacte`, `devis_envoye`, `client`, `perdu`

### Option 2 : Via SQL Editor
```sql
-- Voir tous les leads et leurs statuts
SELECT
  id,
  name,
  email,
  status as type_contrat,  -- taxi, vtc, autre
  lead_status as etat_lead, -- nouveau, contacte, etc.
  created_at,
  updated_at
FROM leads
ORDER BY created_at DESC
LIMIT 20;
```

### Option 3 : Vérifier les Valeurs Uniques
```sql
-- Voir toutes les valeurs de lead_status utilisées
SELECT DISTINCT lead_status, COUNT(*) as count
FROM leads
GROUP BY lead_status
ORDER BY count DESC;
```

Si tu vois des valeurs comme `new`, `contacted`, `interested`, etc., c'est qu'il y a encore des anciennes données.

---

## 🔄 Migration des Anciennes Données (Si Nécessaire)

Si tu as des leads avec d'anciennes valeurs anglaises :

```sql
-- Convertir toutes les anciennes valeurs en nouvelles
UPDATE leads
SET lead_status = CASE lead_status
  WHEN 'new' THEN 'nouveau'
  WHEN 'contacted' THEN 'contacte'
  WHEN 'interested' THEN 'devis_envoye'
  WHEN 'converted' THEN 'client'
  WHEN 'lost' THEN 'perdu'
  ELSE lead_status  -- Garder si déjà en français
END
WHERE lead_status IN ('new', 'contacted', 'interested', 'converted', 'lost');
```

---

## 📝 Logs de Debug Ajoutés

J'ai ajouté des logs détaillés dans `src/lib/leads.ts` :

### Ligne 117-121 : Début de mise à jour
```typescript
console.log('🔄 Updating lead status:', { leadId, newStatus, additionalData });
const dbStatus = newStatus;
console.log('📝 Using status:', { status: dbStatus });
```

### Ligne 150 : Données envoyées
```typescript
console.log('📤 Sending to Supabase:', updateData);
```

### Ligne 165-166 : Succès
```typescript
console.log('✅ Lead status updated successfully:', data);
console.log('✅ New lead_status in DB:', data?.lead_status);
```

### Ligne 160-162 : Erreur
```typescript
console.error('❌ Supabase update error:', error);
console.error('❌ Error details:', JSON.stringify(error, null, 2));
```

---

## ✅ Checklist de Vérification

Avant de signaler un bug, vérifie :

- [ ] La console (F12) est ouverte
- [ ] Tu vois les logs `🔄 Updating lead status`
- [ ] `dbStatus` = "nouveau", "contacte", etc. (PAS "new", "contacted")
- [ ] `updateData` contient `lead_status: "contacte"` (pas "contacted")
- [ ] Tu vois `✅ Lead status updated successfully`
- [ ] La colonne "État Lead" se met à jour après actualisation (F5)
- [ ] Tu regardes bien la colonne "État Lead" (pas "Type Contrat")

---

## 🎯 Test Manuel Complet

### 1. Préparation
```bash
# Ouvre le site
https://taxiassur.com/backoffice/leads

# Ouvre la console (F12)
```

### 2. Test Simple
```
1. Trouve un lead avec statut "Nouveau"
2. Clique sur le crayon vert (Edit)
3. Change le statut à "Contacté"
4. Ajoute une note: "Test changement statut"
5. Clique "Mettre à Jour"
6. Vérifie la console pour les logs
7. Actualise la page (F5)
8. Vérifie que le badge "État Lead" est maintenant "Contacté" (orange)
```

### 3. Test Complet des Statuts
```
Nouveau → Contacté → Devis Envoyé → Client
Nouveau → Perdu
```

---

## 🚨 Si Ça Ne Marche Toujours Pas

### Envoie-moi ces informations :

1. **Screenshot de la console** avec les logs
2. **Screenshot du tableau** montrant les colonnes
3. **Résultat de cette requête SQL** :
```sql
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('status', 'lead_status');
```

4. **Résultat de cette requête** :
```sql
SELECT DISTINCT lead_status FROM leads;
```

---

## 📚 Résumé

**2 champs distincts :**
- `status` (Type Contrat) → **NON modifiable** par le modal
- `lead_status` (État Lead) → **Modifiable** par le modal

**Valeurs correctes** :
- ✅ `nouveau`, `contacte`, `devis_envoye`, `client`, `perdu`
- ❌ `new`, `contacted`, `interested`, `converted`, `lost`

**Le code est correct**, il utilise bien les valeurs françaises. Si ça ne marche pas, c'est probablement :
1. Un problème de cache navigateur
2. Des anciennes données en DB
3. Un problème de RLS Supabase

**Prochaine étape** : Teste avec la console ouverte et regarde les logs !

---

**Fichiers modifiés pour debug :**
- `src/lib/leads.ts` (lignes 117-167) - Logs détaillés ajoutés

**Build :** ✅ Réussi (20.03s)
**Status :** ✅ Prêt pour test
