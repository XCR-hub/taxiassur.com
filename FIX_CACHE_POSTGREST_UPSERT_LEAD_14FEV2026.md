# Fix Cache PostgREST - upsert_lead - 14 Février 2026

## Problème Identifié

Erreur: `Could not find the function public.upsert_lead in the schema cache`

### Tests Effectués

✅ La fonction EXISTS dans la base de données
✅ La fonction FONCTIONNE via SQL direct  
✅ Les permissions sont CORRECTES
❌ Le cache PostgREST n'est PAS synchronisé

### Test SQL (Fonctionne)

```sql
SELECT * FROM upsert_lead(
  'Milly-la-Forêt',
  'tcerda@xcr.fr',
  'Tony',
  'CERDA',
  '{"vehicle_type": "Taxi"}'::jsonb,
  '0180855781',
  'website'
);
-- ✅ Retourne: lead_id, access_token, is_new
```

## Cause

Sur Supabase Cloud, NOTIFY pgrst n'est pas instantané.
Le cache peut mettre 5-10 minutes à se recharger.

## Solution

**ATTENDRE 5-10 MINUTES** puis retester le formulaire.

Si ça ne fonctionne toujours pas:
1. Dashboard Supabase → Settings → API → Restart API
2. Ou attendre 15-20 minutes (rechargement automatique)

## Fonction Finale

Signature: `upsert_lead(p_city, p_email, p_first_name, p_last_name, p_metadata, p_phone, p_source)`
