# CORRECTION API - MIGRATION VERS SUPABASE ✅

## Problème Résolu
L'API PHP `/api/lead.php` retournait une erreur 404 car Vite Preview ne peut pas exécuter PHP en local.

## Solution Implémentée
Migration complète vers **Supabase Database** pour une solution native, fonctionnelle en local ET en production.

## Changements Effectués

### 1. Nouvelle Fonction `createLead()` dans `src/lib/leads.ts`
Fonction TypeScript qui sauvegarde directement dans Supabase :

```typescript
export async function createLead(input: CreateLeadInput): Promise<{
  success: boolean;
  error?: string;
  leadId?: string
}>
```

**Avantages:**
- Fonctionne en local (npm run dev)
- Fonctionne en production
- Pas besoin de serveur PHP
- RLS Supabase protège les données
- TypeScript type-safe

### 2. Composants Mis à Jour

Tous les formulaires utilisent maintenant `createLead()` au lieu de `/api/lead.php`:

- ✅ `src/components/FormLead.tsx`
- ✅ `src/components/EnhancedFormLead.tsx`
- ✅ `src/components/Hero.tsx`
- ✅ `src/components/LeadForm.tsx`

### 3. Table Supabase Utilisée
**Table:** `crm_leads`

**Colonnes:**
- name
- email
- phone
- city
- status (taxi/vtc/autre)
- immatriculation
- lead_status (nouveau/contacté/devis envoyé/client/perdu)
- source
- notes
- created_at

## Test Local

```bash
# Démarrer le serveur de dev
npm run dev

# Ouvrir http://localhost:5173
# Tester le formulaire sur la homepage
# Le lead sera sauvegardé dans Supabase immédiatement
```

## Test Production

```bash
# Build
npm run build

# Les formulaires fonctionnent maintenant directement avec Supabase
# Plus besoin de PHP pour les leads
```

## Vérification Supabase

1. Ouvrir Supabase Dashboard: https://app.supabase.com
2. Aller dans "Table Editor"
3. Sélectionner la table `crm_leads`
4. Voir les nouveaux leads apparaître en temps réel

## API PHP (Legacy)

L'API PHP `/api/lead.php` existe toujours pour la **compatibilité production** si nécessaire, mais:
- N'est plus utilisée par le frontend
- Peut être conservée pour des webhooks externes
- Peut être supprimée si non utilisée ailleurs

## Points Importants

### Sécurité
- RLS activé sur `crm_leads`
- Validation côté client avec Zod
- Anti-spam honeypot
- Rate limiting via hooks

### Performance
- Insertion directe dans Supabase (plus rapide que PHP)
- Pas de round-trip serveur supplémentaire
- WebSocket en temps réel disponible

### Développement
- Fonctionne immédiatement en local
- Pas besoin de configurer PHP
- TypeScript full-stack
- Tests unitaires possibles

## Prochaines Étapes

### Option 1: Garder les deux systèmes
- Frontend → Supabase (actuel)
- Webhooks externes → PHP API (si nécessaire)

### Option 2: Migration complète
- Supprimer `/api/lead.php`
- Créer des Edge Functions Supabase pour webhooks
- Solution 100% Supabase

## Commandes Utiles

```bash
# Dev local avec Supabase
npm run dev

# Build production
npm run build

# Tester en local (sans PHP)
npm run preview
```

## Status Final
✅ Formulaires fonctionnent en local
✅ Formulaires fonctionnent en production
✅ Leads sauvegardés dans Supabase
✅ Plus d'erreur 404
✅ TypeScript type-safe
✅ Build réussi

## Migration Future (Recommandé)

Pour une architecture 100% moderne:

1. **Email notifications** → Edge Function `send-email`
2. **Webhooks** → Edge Function avec authentification
3. **Suppression PHP** → Nettoyer `/api/` folder

Tout fonctionne maintenant avec Supabase uniquement !
