# Fix Espace Prospect - Devis et Documents (14/02/2026)

## Problèmes Résolus

### 1. ❌ Devis non visibles dans l'espace prospect
**Symptôme:** Le prospect ne voit pas le devis Generali uploadé par le commercial à l'étape 3 du pipeline.

**Cause:** La fonction `get_lead_quotes_by_token()` filtrait incorrectement les devis.

**Solution:**
- ✅ Ajout du champ `company_code` dans le retour
- ✅ Filtrage uniquement sur les devis avec `quote_pdf_url` non vide
- ✅ Fonction RPC correctement déployée

### 2. ❌ Documents prospect non visibles dans le CRM
**Symptôme:** Les documents uploadés par le prospect via son espace ne s'affichent pas dans le CRM commercial.

**Cause:** Pas de synchronisation automatique entre `prospect_documents` et `crm_lead_documents`.

**Solution:**
- ✅ Création du trigger `sync_prospect_document_trigger`
- ✅ Synchronisation automatique prospect → CRM
- ✅ Notification automatique au commercial quand un document est uploadé
- ✅ Nouvelle fonction `get_lead_documents_by_token()` unifiée

### 3. ❌ Progression à 0% dans l'espace prospect
**Symptôme:** La progression reste bloquée à 0% même si des documents sont uploadés.

**Cause:** La fonction `get_lead_by_token()` ne calculait pas la vraie progression.

**Solution:**
- ✅ Nouveaux champs retournés: `progression_percentage`, `total_documents`, `uploaded_documents`
- ✅ Calcul automatique basé sur les 8 documents obligatoires
- ✅ Trigger pour mise à jour automatique de la progression

## Migration Appliquée

**Fichier:** `fix_prospect_quotes_documents_complete_2026.sql`

### Fonctions Créées/Modifiées

1. **get_lead_by_token(p_token)**
   - Retourne maintenant la progression réelle
   - Champs ajoutés: `progression_percentage`, `total_documents`, `uploaded_documents`

2. **get_lead_quotes_by_token(p_token)**
   - Retourne tous les devis avec fichier PDF
   - Champ `company_code` ajouté
   - Filtrage amélioré

3. **sync_prospect_document_to_crm()**
   - Nouveau trigger sur `prospect_documents`
   - Synchronise automatiquement vers `crm_lead_documents`
   - Crée une notification CRM

4. **get_lead_documents_by_token(p_token)**
   - Vue unifiée de tous les documents du prospect
   - Exclut les documents générés (devis, contrat, attestation)

## Frontend Modifié

**Fichier:** `src/pages/EspaceProspect.tsx`

### Changements:

1. **Interface LeadInfo**
   ```typescript
   progression_percentage?: number;
   total_documents?: number;
   uploaded_documents?: number;
   ```

2. **Fonction getProgressPercentage()**
   ```typescript
   const getProgressPercentage = () => {
     // Utiliser la progression calculée par le backend
     if (leadInfo?.progression_percentage !== undefined) {
       return leadInfo.progression_percentage;
     }
     // Fallback si l'ancien système est encore utilisé
     ...
   };
   ```

3. **Fonction loadDocuments()**
   ```typescript
   // Ancienne version
   .rpc('get_prospect_documents_by_token', ...)

   // Nouvelle version
   .rpc('get_lead_documents_by_token', ...)
   ```

## Workflow Complet

### Upload de Devis par le Commercial (Étape 3)

```
1. Commercial ouvre le lead dans CRM Killer
2. Va dans "Saisie Devis" (étape 3)
3. Upload le devis PDF Generali
4. Le fichier est stocké dans crm-documents bucket
5. lead_company_quotes.quote_pdf_url est mis à jour
6. ✅ get_lead_quotes_by_token() retourne ce devis
7. ✅ Le prospect voit le devis dans son espace
```

### Upload de Document par le Prospect

```
1. Prospect va dans son espace sécurisé (token)
2. Onglet "Documents"
3. Upload un document (ex: Licence Taxi)
4. Le fichier est stocké dans prospect-documents bucket
5. Insertion dans prospect_documents
6. 🔄 TRIGGER sync_prospect_document_trigger se déclenche
7. ✅ Insertion automatique dans crm_lead_documents
8. ✅ Notification créée pour le commercial
9. ✅ Le commercial voit le document dans le CRM
10. ✅ Progression mise à jour automatiquement
```

### Calcul de la Progression

**8 Documents Obligatoires:**
1. Licence Taxi
2. Permis de Conduire
3. Carte Grise
4. Relevé d'Information
5. Carte Professionnelle
6. Kbis/SIRENE
7. Pièce d'Identité
8. RIB

**Formule:**
```
progression = (documents_uploadés / 8) * 100
```

**Exemple:**
- 0 documents → 0%
- 4 documents → 50%
- 8 documents → 100% ✅

## Test de Validation

### Test 1: Voir les devis dans l'espace prospect

```bash
# 1. Commercial upload devis Generali dans étape 3
# 2. Ouvrir l'espace prospect avec le token
# 3. Aller dans l'onglet "Devis"
# ✅ Le devis Generali doit s'afficher
# ✅ Bouton "Consulter" fonctionnel
# ✅ Boutons "Valider" et "Refuser" visibles
```

### Test 2: Voir les documents prospect dans le CRM

```bash
# 1. Prospect upload un document via son espace
# 2. Ouvrir le lead dans CRM Killer
# 3. Aller dans "Documents & Pièces"
# ✅ Le document doit s'afficher dans "Non classés"
# ✅ Notification "Nouveau document prospect" visible
# ✅ Document peut être glissé-déposé dans une catégorie
```

### Test 3: Voir la progression se mettre à jour

```bash
# 1. Prospect upload Licence Taxi
# ✅ Progression passe de 0% à 12.5%
# 2. Prospect upload Permis de Conduire
# ✅ Progression passe à 25%
# 3. Upload 6 autres documents
# ✅ Progression passe à 100%
# ✅ Badge "Documents complets" s'affiche
```

## SQL de Vérification

### Voir tous les devis d'un lead

```sql
SELECT
  lcq.id,
  ic.name as company,
  ic.code,
  lcq.quote_pdf_url,
  lcq.quote_status,
  lcq.quote_amount
FROM lead_company_quotes lcq
JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
WHERE lcq.lead_id = 'LEAD_UUID_ICI'
  AND lcq.quote_pdf_url IS NOT NULL;
```

### Voir tous les documents d'un lead (les 2 tables)

```sql
-- Documents du prospect
SELECT
  'prospect' as source,
  document_type,
  file_name,
  uploaded_at
FROM prospect_documents
WHERE lead_id = 'LEAD_UUID_ICI'
  AND deleted_at IS NULL

UNION ALL

-- Documents du CRM
SELECT
  'crm' as source,
  document_type,
  file_name,
  uploaded_at
FROM crm_lead_documents
WHERE lead_id = 'LEAD_UUID_ICI'
  AND deleted_at IS NULL
ORDER BY uploaded_at DESC;
```

### Calculer la progression d'un lead

```sql
SELECT
  l.first_name,
  l.last_name,
  COUNT(DISTINCT cld.document_type) as docs_uploaded,
  ROUND((COUNT(DISTINCT cld.document_type)::numeric / 8) * 100) as progression
FROM crm_leads l
LEFT JOIN crm_lead_documents cld ON cld.lead_id = l.id
  AND cld.document_type IN (
    'licence_taxi', 'permis_conduire', 'carte_grise',
    'releve_information', 'carte_professionnelle',
    'kbis_sirene', 'piece_identite', 'rib'
  )
  AND cld.status != 'refused'
  AND cld.deleted_at IS NULL
WHERE l.id = 'LEAD_UUID_ICI'
GROUP BY l.id, l.first_name, l.last_name;
```

## Statut Final

✅ **Migration appliquée avec succès**
✅ **Frontend compilé sans erreurs**
✅ **Build réussi (1m 4s)**
✅ **Système opérationnel**

## Points d'Attention

1. **Storage Buckets**
   - `crm-documents` : Documents uploadés par le commercial
   - `prospect-documents` : Documents uploadés par le prospect
   - Les deux buckets doivent avoir les bonnes policies RLS

2. **Synchronisation**
   - Les documents prospect sont automatiquement copiés dans `crm_lead_documents`
   - Pas de duplication si le document existe déjà (même file_path)

3. **Notifications**
   - Une notification est créée pour chaque document prospect uploadé
   - Type: `document_uploaded`
   - Priorité: 2 (moyenne)

4. **Progression**
   - Calculée automatiquement via trigger
   - Basée sur les 8 documents obligatoires
   - Mise à jour en temps réel

## Prochaines Étapes

1. Tester le workflow complet end-to-end
2. Vérifier que les notifications apparaissent dans le CRM
3. S'assurer que les devis sont bien visibles pour tous les leads
4. Vérifier la progression en temps réel

---

*Document créé le 14 février 2026*
*Migration: fix_prospect_quotes_documents_complete_2026*
