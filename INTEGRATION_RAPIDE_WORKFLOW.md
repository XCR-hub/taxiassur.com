# Intégration Rapide du Workflow 7 Étapes dans le CRM

## Option 1 : Remplacement Complet (Recommandé)

Remplacez le contenu actuel de la page de détail du lead par le nouveau workflow.

### Dans `src/backoffice/CRMLeadDetail.tsx`

Ajoutez l'import :
```typescript
import PipelineWorkflow7Etapes from '@/components/crm/PipelineWorkflow7Etapes';
```

Remplacez la section du contenu principal par :
```typescript
<PipelineWorkflow7Etapes
  leadId={leadId!}
  leadData={lead}
/>
```

## Option 2 : Ajout d'un Onglet (Alternative)

Gardez l'interface actuelle et ajoutez un onglet "Workflow" dans `LeadWorkflowTabs`.

### Étape 1 : Modifier LeadWorkflowTabs

Dans `src/components/crm/LeadWorkflowTabs.tsx`, ajoutez :

```typescript
export type WorkflowTab =
  | 'overview'
  | 'documents'
  | 'quotes'
  | 'communications'
  | 'timeline'
  | 'workflow';  // <-- Nouveau

const tabs: { id: WorkflowTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'workflow', label: 'Workflow 7 Étapes', icon: GitBranch }, // <-- Nouveau
  { id: 'documents', label: 'Documents', icon: FileText },
  // ... autres onglets
];
```

### Étape 2 : Dans CRMLeadDetail

```typescript
import PipelineWorkflow7Etapes from '@/components/crm/PipelineWorkflow7Etapes';

// Dans le composant, dans la section des onglets :
{activeTab === 'workflow' && (
  <PipelineWorkflow7Etapes
    leadId={leadId!}
    leadData={lead}
  />
)}
```

## Option 3 : Vue Conditionnelle

Affichez le workflow 7 étapes seulement pour les leads qui utilisent le nouveau pipeline.

```typescript
{lead.pipeline_stage ? (
  <PipelineWorkflow7Etapes
    leadId={leadId!}
    leadData={lead}
  />
) : (
  // Ancienne interface
  <OldLeadInterface />
)}
```

---

## Migration des Leads Existants

Si vous voulez migrer les leads existants vers le nouveau pipeline :

```sql
-- Migrer tous les leads "nouveau_lead" vers le nouveau système
UPDATE crm_leads
SET pipeline_stage =
  CASE
    WHEN status = 'nouveau_lead' THEN 'nouveau_lead'
    WHEN status = 'documents_en_attente' THEN 'collecte_documents'
    WHEN status = 'pret_pour_devis' THEN 'saisie_devis'
    WHEN status = 'devis_envoye' THEN 'validation_devis_prospect'
    WHEN status = 'won' THEN 'client_actif'
    ELSE 'nouveau_lead'
  END
WHERE pipeline_stage IS NULL;
```

---

## Test Rapide

1. **Créez un lead de test :**
```typescript
const { data } = await supabase
  .from('crm_leads')
  .insert({
    email: 'test@example.com',
    first_name: 'Jean',
    last_name: 'Test',
    phone: '0612345678',
    pipeline_stage: 'nouveau_lead'
  })
  .select()
  .single();
```

2. **Accédez à la page de détail :**
```
/backoffice/crm-killer/lead/{id}
```

3. **Vous devriez voir :**
- La barre de progression des 7 étapes
- L'étape 1 active avec le bouton d'appel
- La possibilité de passer à l'étape 2

---

## Dépannage

### Le workflow ne s'affiche pas
- Vérifiez que `lead.pipeline_stage` existe dans la base
- Vérifiez que l'import du composant est correct
- Vérifiez la console pour les erreurs

### Les emails ne sont pas envoyés
- Vérifiez que les edge functions sont déployées
- Vérifiez les variables d'environnement Brevo
- Vérifiez les logs dans Supabase Dashboard

### Les documents ne s'uploadent pas
- Vérifiez que les buckets storage existent
- Vérifiez les policies RLS sur les buckets
- Vérifiez les permissions de l'utilisateur

### La progression automatique ne fonctionne pas
- Vérifiez que les triggers sont bien créés (via la migration)
- Vérifiez les logs de la base de données
- Testez la fonction `get_lead_pipeline_status(lead_id)`

---

## Prochaine Étape : Interface Prospect

L'étape 4 nécessite une interface côté prospect. Voici un exemple de base :

### Dans `src/pages/EspaceProspect.tsx`

Ajoutez une section pour les devis :

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function QuotesSection({ leadId }) {
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    loadQuotes();
  }, [leadId]);

  async function loadQuotes() {
    const { data } = await supabase
      .from('lead_company_quotes')
      .select(`
        *,
        company:insurance_companies(*)
      `)
      .eq('lead_id', leadId);

    setQuotes(data || []);
  }

  async function validateQuote(quote) {
    if (!confirm(`Valider le devis ${quote.company.name} ?`)) return;

    await supabase
      .from('lead_quote_validations')
      .insert({
        lead_id: leadId,
        quote_id: quote.id,
        insurance_company_id: quote.insurance_company_id
      });

    alert('Devis validé ! Vous allez recevoir un email de confirmation.');
  }

  return (
    <div className="space-y-4">
      <h2>Vos Devis</h2>

      {quotes.map((quote) => (
        <div key={quote.id} className="border rounded-lg p-4">
          <h3>{quote.company.name}</h3>

          <a
            href={supabase.storage
              .from('contract-documents')
              .getPublicUrl(quote.file_path).data.publicUrl}
            target="_blank"
            className="text-blue-600"
          >
            Télécharger le devis
          </a>

          <button
            onClick={() => validateQuote(quote)}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
          >
            Valider ce devis
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## Support

Si vous rencontrez des problèmes :

1. Vérifiez le fichier `WORKFLOW_7_ETAPES_IMPLEMENTATION_2026.md`
2. Consultez les logs Supabase
3. Testez chaque étape individuellement
4. Vérifiez que toutes les migrations sont appliquées

**Le workflow est prêt à l'emploi !**
