# Harmonisation Complète du Système (14/02/2026)

## Problèmes Résolus ✅

### 1. **Devis invisibles dans l'espace prospect**
**Cause** : La fonction `get_lead_quotes_by_token()` filtrait les devis sans PDF
**Solution** : Modification pour retourner TOUS les devis, même en attente

### 2. **Impossible d'inviter un commercial**
**Cause** : Fonction `create_commercial_default_permissions()` manquante
**Solution** : Création complète de la fonction et de la table `user_permissions`

### 3. **Incohérence entre pipeline et espace prospect**
**Cause** : Colonnes manquantes dans `crm_leads`
**Solution** : Ajout de toutes les colonnes nécessaires

## Migrations Appliquées

### Migration : `fix_system_complete_drop_recreate_2026`

**Actions effectuées :**

#### 1. Colonnes ajoutées à `crm_leads`
```sql
- contract_signed_at (timestamptz)
- payment_completed_at (timestamptz)
- contract_pdf_url (text)
- attestation_pdf_url (text)
- converted_to_client (boolean)
- client_since (timestamptz)
- deleted_at (timestamptz)
- archived_at (timestamptz)
```

#### 2. Table `user_permissions` créée
```sql
CREATE TABLE user_permissions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  permission_type text NOT NULL,
  can_view boolean,
  can_edit boolean,
  can_delete boolean,
  can_create boolean,
  UNIQUE(user_id, permission_type)
)
```

#### 3. Fonctions RPC harmonisées

**a) `get_lead_quotes_by_token(p_token text)`**
- Retourne **TOUS** les devis (même sans PDF)
- Compatible avec le frontend (alias de colonnes)
- Filtrage sur deleted_at uniquement

**b) `get_lead_by_token(p_token text)`**
- Retourne toutes les infos du lead
- Calcul dynamique de `documents_complete`
- Récupération du devis validé
- Retourne `selected_company_id`

**c) `create_commercial_default_permissions(p_user_id uuid)`**
- Créé automatiquement lors de l'invitation
- Permissions CRM complètes
- Permissions analytics en lecture seule
- Pas d'accès aux settings

## Structure des Données

### Flux Complet d'un Lead

```
1. NOUVEAU LEAD (nouveau_lead)
   ↓
2. COLLECTE DOCUMENTS (collecte_documents)
   - Documents uploadés dans crm_lead_documents
   ↓
3. SAISIE DEVIS (saisie_devis)
   - Devis créés dans lead_company_quotes
   - Status: "pending"
   - quote_pdf_url: NULL au début
   ↓
4. VALIDATION DEVIS (validation_devis)
   - Le prospect valide un devis via l'espace prospect
   - Status passe à "validated"
   - quote_accepted_at = NOW()
   - Lead passe automatiquement à l'étape suivante
   ↓
5. SIGNATURE DEVIS (signature_devis)
   ↓
6. PAIEMENT RIB (paiement_rib)
   ↓
7. CONTRAT FINAL (contrat_final)
   - converted_to_client = true
   - client_since = NOW()
```

### Mapping Colonnes Frontend ↔ Database

| Frontend | Database | Table |
|----------|----------|-------|
| `company_id` | `insurance_company_id` | lead_company_quotes |
| `quote_file_url` | `quote_pdf_url` | lead_company_quotes |
| `status` | `quote_status` | lead_company_quotes |
| `submitted_at` | `sent_at` | lead_company_quotes |

## Fonctions RPC Disponibles

### Espace Prospect (accès via token)

```javascript
// Récupérer les infos du lead
await supabase.rpc('get_lead_by_token', { p_token: token })

// Récupérer les documents
await supabase.rpc('get_prospect_documents_by_token', { p_token: token })

// Uploader un document
await supabase.rpc('upload_prospect_document_by_token', {
  p_token: token,
  p_document_type: 'permis_conduire',
  p_file_name: 'permis.pdf',
  p_file_path: 'path/in/storage',
  p_file_size: 123456
})

// Récupérer les devis
await supabase.rpc('get_lead_quotes_by_token', { p_token: token })

// Valider un devis
await supabase.rpc('validate_quote_by_token', {
  p_quote_id: quoteId,
  p_token: token
})
// Retourne : { success: true, company_name: "...", message: "..." }

// Refuser un devis
await supabase.rpc('refuse_quote_by_token', {
  p_quote_id: quoteId,
  p_token: token,
  p_reason: "Trop cher"
})
```

### Gestion Utilisateurs (service_role uniquement)

```javascript
// Via Edge Function invite-admin-user
await supabase.functions.invoke('invite-admin-user', {
  body: {
    email: 'commercial@example.com',
    full_name: 'Jean Dupont',
    role: 'commercial',
    permissions: [] // Optionnel, sinon permissions par défaut
  }
})
```

## RLS Policies Appliquées

### crm_lead_documents
```sql
✅ SELECT : Prospects via token + Admins authentifiés
✅ INSERT : Prospects via token + Admins authentifiés
```

### lead_company_quotes
```sql
✅ SELECT : Prospects via token + Admins authentifiés
✅ UPDATE : Prospects via token (validation/refus) + Admins authentifiés
```

### user_permissions
```sql
✅ ALL : Admins et Super Admins
✅ SELECT : Utilisateur pour ses propres permissions
```

## Tests Recommandés

### 1. Test Espace Prospect

```javascript
// Obtenir un token de test
const { data: lead } = await supabase
  .from('crm_leads')
  .select('access_token, email')
  .limit(1)
  .single();

console.log('Token:', lead.access_token);
console.log('URL:', `https://taxiassur.com/espace-prospect/${lead.access_token}`);

// Tester l'affichage des devis
const { data: quotes } = await supabase.rpc('get_lead_quotes_by_token', {
  p_token: lead.access_token
});
console.log('Devis:', quotes);
```

### 2. Test Invitation Commercial

```javascript
// Dans le backoffice
await supabase.functions.invoke('invite-admin-user', {
  body: {
    email: 'test-commercial@example.com',
    full_name: 'Test Commercial',
    role: 'commercial'
  }
});

// Vérifier les permissions créées
const { data: perms } = await supabase
  .from('user_permissions')
  .select('*')
  .eq('user_id', userId);
console.log('Permissions:', perms);
```

### 3. Test Pipeline

```javascript
// Vérifier qu'un lead dans le pipeline a ses devis
const { data: lead } = await supabase
  .from('crm_leads')
  .select(`
    id,
    email,
    pipeline_stage,
    lead_company_quotes (
      id,
      insurance_company_id,
      quote_status,
      quote_amount
    )
  `)
  .eq('email', 'tcerda@xcr.fr')
  .single();

console.log('Lead:', lead);
console.log('Devis:', lead.lead_company_quotes);
```

## Points d'Attention

### ⚠️ Affichage des Devis

Les devis s'affichent maintenant **même sans PDF**. Le frontend doit gérer l'affichage selon le statut :
- `pending` : "En attente de traitement"
- `sent` : "Devis envoyé, en attente de votre validation"
- `validated` : "Devis validé ✓"
- `refused` : "Devis refusé"

### ⚠️ Workflow Automatique

Quand un prospect **valide un devis** :
1. Le devis passe à `quote_status = 'validated'`
2. Le lead passe automatiquement à `status = 'signature_devis'`
3. Le `pipeline_stage` est mis à jour
4. Une notification est créée pour l'équipe

### ⚠️ Permissions Commerciaux

Les commerciaux invités ont automatiquement :
- ✅ Accès complet CRM (leads, contacts, activités)
- ✅ Gestion documents (sans suppression)
- ✅ Gestion devis (sans suppression)
- ✅ Vue analytics (lecture seule)
- ❌ Pas d'accès aux réglages
- ❌ Pas de gestion utilisateurs

## Statut Final

✅ **Devis visibles dans l'espace prospect**
✅ **Invitation des commerciaux fonctionnelle**
✅ **Cohérence complète pipeline ↔ espace prospect**
✅ **Build réussi sans erreurs**
✅ **Toutes les fonctions RPC harmonisées**

## Prochaines Étapes Suggérées

1. **Tester en conditions réelles**
   - Créer un lead de test
   - Uploader des documents
   - Créer des devis
   - Valider un devis depuis l'espace prospect
   - Vérifier la synchronisation dans le pipeline

2. **Inviter un commercial de test**
   - Vérifier la réception de l'email
   - Tester la première connexion
   - Vérifier les permissions CRM

3. **Monitoring**
   - Surveiller les logs de l'edge function `invite-admin-user`
   - Vérifier que les devis s'affichent correctement
   - S'assurer que le workflow automatique fonctionne

## Support Technique

En cas de problème :

1. **Devis ne s'affichent toujours pas**
   - Vérifier que `lead_company_quotes` contient des données
   - Vérifier que le `access_token` est valide
   - Vérifier les RLS policies dans Supabase Dashboard

2. **Invitation échoue**
   - Vérifier les logs de l'edge function
   - Vérifier que les secrets sont configurés
   - Vérifier que la table `user_permissions` existe

3. **Incohérence pipeline**
   - Vérifier que `pipeline_stage` et `status` sont synchronisés
   - Utiliser la fonction de synchronisation si nécessaire
