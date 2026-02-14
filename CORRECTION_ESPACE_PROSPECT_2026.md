# Correction Espace Prospect - Documents et Devis (14/02/2026)

## Problème Identifié

Les prospects ne voyaient ni leurs documents ni leurs devis dans l'espace prospect en raison de :

1. **Incohérence des noms de colonnes** entre les fonctions RPC et le frontend
2. **Ordre des paramètres incorrect** dans les fonctions de validation/refus
3. **Format de retour incompatible** (boolean vs JSON)
4. **Mauvais mapping des colonnes** (company_id vs insurance_company_id, quote_file_url vs quote_pdf_url)

## Solutions Appliquées

### Migration 1 : `fix_espace_prospect_functions_corrected_2026`

Recréation complète des fonctions RPC :
- `get_prospect_documents_by_token()` - Liste les documents du prospect
- `upload_prospect_document_by_token()` - Upload de documents
- `get_lead_quotes_by_token()` - Liste les devis
- `validate_quote_by_token()` - Validation d'un devis
- `refuse_quote_by_token()` - Refus d'un devis

Avec les RLS policies appropriées pour l'accès via token.

### Migration 2 : `fix_frontend_compatibility_documents_quotes_2026`

Corrections de compatibilité avec le frontend :

#### Documents
- **upload_prospect_document_by_token** : Version 5 paramètres (sans file_url explicite)
- Génération automatique de l'URL publique du fichier

#### Devis
**Alias de colonnes ajoutés :**
- `insurance_company_id` → `company_id`
- `quote_pdf_url` → `quote_file_url`
- `quote_status` → `status`
- `sent_at` → `submitted_at`

**Ordre des paramètres corrigé :**
```sql
-- Ancien (ne fonctionnait pas)
validate_quote_by_token(p_token text, p_quote_id uuid)

-- Nouveau (compatible frontend)
validate_quote_by_token(p_quote_id uuid, p_token text)
```

**Format de retour JSON :**
```json
{
  "success": true/false,
  "company_name": "Nom de la compagnie",
  "message": "Message de succès",
  "error": "Message d'erreur si échec"
}
```

## Fonctions RPC Disponibles

### Pour les Documents

```sql
-- Récupérer les documents
get_prospect_documents_by_token(p_token text)
→ Retourne : id, lead_id, document_type, document_name, file_path, file_url,
             file_size, status, validated, uploaded_at, validated_at

-- Uploader un document
upload_prospect_document_by_token(
  p_token text,
  p_document_type text,
  p_file_name text,
  p_file_path text,
  p_file_size bigint
)
→ Retourne : uuid (ID du document créé)
```

### Pour les Devis

```sql
-- Récupérer les devis
get_lead_quotes_by_token(p_token text)
→ Retourne : id, lead_id, company_id, company_name, company_logo_url,
             quote_file_url, quote_amount, status, submitted_at,
             last_sent_at, quote_accepted_at, refusal_reason,
             created_at, updated_at

-- Valider un devis
validate_quote_by_token(p_quote_id uuid, p_token text)
→ Retourne : { success: boolean, company_name: text, message: text, error?: text }

-- Refuser un devis
refuse_quote_by_token(p_quote_id uuid, p_token text, p_reason text)
→ Retourne : { success: boolean, company_name: text, message: text, error?: text }
```

## Policies RLS Appliquées

### crm_lead_documents
- **SELECT** : Prospects peuvent voir leurs documents via token
- **INSERT** : Prospects peuvent uploader leurs documents via token

### lead_company_quotes
- **SELECT** : Prospects peuvent voir leurs devis via token
- **UPDATE** : Prospects peuvent valider/refuser leurs devis via token

## Tests Recommandés

### 1. Test Documents
```javascript
// Dans l'espace prospect
const { data: docs } = await supabase.rpc('get_prospect_documents_by_token', {
  p_token: 'TOKEN_PROSPECT'
});
console.log('Documents:', docs);
```

### 2. Test Devis
```javascript
// Dans l'espace prospect
const { data: quotes } = await supabase.rpc('get_lead_quotes_by_token', {
  p_token: 'TOKEN_PROSPECT'
});
console.log('Devis:', quotes);
```

### 3. Test Validation Devis
```javascript
const { data } = await supabase.rpc('validate_quote_by_token', {
  p_quote_id: 'ID_DEVIS',
  p_token: 'TOKEN_PROSPECT'
});
console.log('Résultat:', data.success, data.company_name);
```

## Statut

✅ **Migration appliquée avec succès**
✅ **Build réussi**
✅ **Compatibilité frontend restaurée**

## Prochaines Étapes

1. Tester l'espace prospect avec un vrai token
2. Vérifier l'affichage des documents
3. Vérifier l'affichage des devis
4. Tester la validation d'un devis
5. Tester l'upload d'un document

## Notes Techniques

- Les fonctions utilisent `SECURITY DEFINER` pour bypassser les RLS lors de l'exécution
- Les tokens sont validés à chaque appel
- Les leads archivés ou supprimés ne sont pas accessibles
- Les URLs des documents sont générées automatiquement
- Seuls les devis avec fichiers PDF sont retournés
