# Unification Table Leads - Architecture Multicanal

## Problème Résolu

**Avant :** Multiples tables pour gérer les leads créant confusion et données dupliquées :
- `leads` (14 leads) - Formulaires web
- `crm_leads_enhanced` (7 leads) - CRM commercial
- `exit_intent_leads` - Popups
- Et 10+ autres tables liées

**Maintenant :** UNE SEULE table `leads` pour TOUS les usages.

---

## Table `leads` - Source Unique de Vérité

### Colonnes Principales

#### Identification
- `id` (uuid) - Identifiant unique
- `name` (text) - Nom complet
- `first_name` (text) - Prénom (auto-calculé)
- `last_name` (text) - Nom (auto-calculé)
- `email` (text) - Email **REQUIS**
- `phone` (text) - Téléphone **REQUIS**
- `city` (text) - Ville **REQUIS**
- `company_name` (text) - Nom entreprise

#### Marketing & Business
- `activity_type` (text) - Type: taxi/vtc/flotte (défaut: 'taxi')
- `vehicle_count` (integer) - Nombre de véhicules (défaut: 1)
- `current_insurer` (text) - Assureur actuel
- `current_premium_annual` (numeric) - Prime annuelle actuelle
- `immatriculation` (text) - Plaque véhicule

#### Scoring IA
- `behavior_score` (integer) - Score comportemental 0-100
- `lead_score` (integer) - Score qualité global 0-100
- `conversion_probability` (numeric) - Probabilité conversion 0-100%
- `estimated_value_annual` (numeric) - Valeur estimée contrat/an
- `time_on_page` (integer) - Temps passé sur site (secondes)

#### Workflow CRM
- `stage` (text) - Étape pipeline CRM:
  - Nouveau Lead
  - Premier Contact
  - Qualifié
  - Devis Envoyé
  - Négociation
  - Accord Verbal
  - Contrat Signé
  - Perdu

- `lead_status` (text) - Statut technique:
  - nouveau
  - contacte
  - qualifie
  - devis_envoye
  - negociation
  - accord_verbal
  - client
  - perdu

- `status` (text) - Type activité (taxi/vtc/moto)
- `source` (text) - Origine (website_form/referral/partner...)
- `assigned_to` (uuid) - Commercial assigné

#### Dates & Timeline
- `created_at` (timestamptz) - Date création
- `updated_at` (timestamptz) - Dernière mise à jour
- `first_contact_at` (timestamptz) - Premier contact
- `last_contact_at` (timestamptz) - Dernier contact
- `contacted_at` (timestamptz) - Date contact
- `next_followup_at` (timestamptz) - Prochain suivi
- `devis_envoye_at` (timestamptz) - Date envoi devis
- `client_at` (timestamptz) - Date conversion client
- `converted_at` (timestamptz) - Date conversion
- `conversion_date` (timestamptz) - Date conversion

#### Emails & Communications
- `emails_sent` (integer) - Nombre emails envoyés
- `last_email_sent_at` (timestamptz) - Dernier email
- `quote_sent` (boolean) - Devis envoyé
- `quote_sent_at` (timestamptz) - Date envoi devis

#### Business Value
- `prime_realisee` (numeric) - Prime réalisée
- `notes` (text) - Notes commerciales

#### Tracking & Flexibilité
- `fingerprint` (text) - Empreinte navigateur
- `tags` (text[]) - Tags flexibles
- `custom_fields` (jsonb) - Champs personnalisés
- `ai_notes` (jsonb) - Notes IA automatiques
- `metadata` (jsonb) - Métadonnées additionnelles

---

## Automatisations Intelligentes

### 1. Auto-Sync Name → First/Last
```sql
-- Trigger automatique
INSERT INTO leads (name, email, phone, city)
VALUES ('Jean Dupont', 'jean@mail.com', '0612345678', 'Paris');

-- Résultat automatique :
-- first_name = 'Jean'
-- last_name = 'Dupont'
```

### 2. Auto-Sync lead_status → stage
```sql
UPDATE leads SET lead_status = 'qualifie' WHERE id = '...';

-- stage devient automatiquement 'Qualifié'
```

### 3. Auto-Calculate Lead Score
```sql
-- behavior_score → lead_score automatique
-- + calcul conversion_probability basé sur:
--   - 70% behavior_score
--   - 30% time_on_page
```

### 4. Auto-Estimate Value
```sql
-- Estimation automatique basée sur:
-- - prime_realisee si disponible
-- - Sinon: vehicle_count × tarif moyen activité
--   - Taxi: 2400€/véhicule/an
--   - VTC: 2200€/véhicule/an
--   - Flotte: 2100€/véhicule/an
```

---

## Vues Pratiques SQL

### Hot Leads (Leads Chauds)
```sql
SELECT * FROM v_hot_leads;
-- Retourne tous les leads avec score >= 70 et actifs
```

### Pipeline CRM
```sql
SELECT * FROM v_crm_pipeline;
-- Statistiques par étape : count, valeur totale, scores moyens
```

### Analytics Quotidiennes
```sql
SELECT * FROM v_daily_leads_analytics;
-- Stats des 30 derniers jours par jour
```

### Stats Globales
```sql
SELECT * FROM get_crm_stats();
-- Retourne :
--   - total_leads
--   - hot_leads
--   - qualified_leads
--   - converted_leads
--   - lost_leads
--   - total_pipeline_value
--   - avg_lead_score
--   - avg_conversion_probability
--   - conversion_rate
```

---

## Usages par Service

### ✅ Formulaire Web
```typescript
// Capture lead depuis formulaire
const { data, error } = await supabase
  .from('leads')
  .insert({
    name: 'Jean Dupont',
    email: 'jean@mail.com',
    phone: '0612345678',
    city: 'Paris',
    source: 'website_form'
  });
// Auto-calculs : first_name, last_name, lead_score, estimated_value
```

### ✅ CRM Commercial
```typescript
// Charger tous les leads pour CRM
const { data: leads } = await supabase
  .from('leads')
  .select('*')
  .order('lead_score', { ascending: false });

// Mettre à jour statut
await supabase
  .from('leads')
  .update({
    lead_status: 'qualifie',
    contacted_at: new Date()
  })
  .eq('id', leadId);
// Auto-sync stage = 'Qualifié'
```

### ✅ IA Automatisée
```typescript
// Edge Function: Scoring automatique
const { data: newLeads } = await supabase
  .from('leads')
  .select('*')
  .eq('lead_score', 0)
  .limit(100);

for (const lead of newLeads) {
  const score = await calculateLeadScore(lead);
  await supabase
    .from('leads')
    .update({
      lead_score: score,
      ai_notes: { last_scored: new Date(), model: 'gpt-4' }
    })
    .eq('id', lead.id);
}
```

### ✅ Marketplace Partenaires
```typescript
// Vendre leads qualifiés aux courtiers
const { data: hotLeads } = await supabase
  .from('leads')
  .select('*')
  .gte('lead_score', 80)
  .eq('assigned_to', null)
  .limit(50);
```

### ✅ Email/SMS/WhatsApp
```typescript
// Campagne email ciblée
const { data: targets } = await supabase
  .from('leads')
  .select('*')
  .eq('stage', 'Devis Envoyé')
  .lt('emails_sent', 3)
  .is('next_followup_at', null);

for (const lead of targets) {
  await sendFollowUpEmail(lead);
  await supabase
    .from('leads')
    .update({
      emails_sent: lead.emails_sent + 1,
      last_email_sent_at: new Date()
    })
    .eq('id', lead.id);
}
```

### ✅ Analytics & Reporting
```typescript
// Dashboard KPIs
const stats = await supabase.rpc('get_crm_stats');
console.log(`Taux de conversion: ${stats.conversion_rate}%`);
console.log(`Valeur pipeline: ${stats.total_pipeline_value}€`);
```

---

## Migration Edge Functions

### État Actuel
Les edge functions utilisent encore `crm_leads_enhanced` et doivent être migrées.

### Script de Migration
```bash
node scripts/migrate-edge-functions-to-leads.js
```

### Fichiers à Migrer
- ✅ crm-ai-assistant/index.ts (migré manuellement)
- ⚠️ crm-automation-engine/index.ts (6 occurrences)
- ⚠️ pipeline-automation-engine/index.ts (13 occurrences)
- ⚠️ realtime-monitoring-engine/index.ts (3 occurrences)
- ⚠️ team-email-handler/index.ts
- ⚠️ inbound-email-handler/index.ts
- ⚠️ pattern-learning-engine/index.ts
- ⚠️ ultra-autonomous-self-healer/index.ts
- ⚠️ auto-backup-system/index.ts

**Total : ~38 occurrences à corriger**

---

## Index Performances

### Index Créés
```sql
-- Recherches CRM
idx_leads_stage ON leads(stage)
idx_leads_lead_status ON leads(lead_status)
idx_leads_assigned_to ON leads(assigned_to)
idx_leads_lead_score ON leads(lead_score DESC)
idx_leads_conversion_probability ON leads(conversion_probability DESC)

-- Dates & Followups
idx_leads_next_followup ON leads(next_followup_at)
idx_leads_created_at ON leads(created_at DESC)
idx_leads_updated_at ON leads(updated_at DESC)

-- Recherche Full-Text
idx_leads_email_search ON leads USING gin(to_tsvector('french', email))
idx_leads_name_search ON leads USING gin(to_tsvector('french', name))

-- Analytics
idx_leads_analytics ON leads(lead_status, stage, created_at)
```

---

## Avantages Architecture Unifiée

### ✅ Performance
- 1 seule requête au lieu de joins multiples
- Index optimisés pour tous les cas d'usage
- Cache simplifié

### ✅ Cohérence Données
- Source unique de vérité
- Pas de duplication
- Synchronisation automatique

### ✅ Maintenabilité
- 1 table à maintenir au lieu de 15
- Documentation centralisée
- Évolutions simplifiées

### ✅ Flexibilité
- Colonnes JSONB pour extensions (custom_fields, ai_notes, metadata)
- Tags pour catégorisation libre
- Triggers pour automatisations

### ✅ Reporting
- Vues SQL prédéfinies
- Fonction stats globales
- Analytics en temps réel

---

## Prochaines Étapes

### 1. Migration Edge Functions
```bash
# Exécuter le script de migration
node scripts/migrate-edge-functions-to-leads.js

# Vérifier les changements
git diff supabase/functions

# Déployer
supabase functions deploy
```

### 2. Tests Complets
- ✅ Formulaire web → capture lead
- ✅ CRM → afficher tous leads
- ⚠️ Edge functions → vérifier après migration
- ⚠️ Emails automatiques → tester envoi

### 3. Monitoring
```sql
-- Vérifier nombre de leads
SELECT COUNT(*) FROM leads;

-- Vérifier scoring automatique
SELECT COUNT(*) FROM leads WHERE lead_score > 0;

-- Vérifier estimations valeur
SELECT COUNT(*) FROM leads WHERE estimated_value_annual > 0;

-- Vérifier conversions name → first/last
SELECT COUNT(*) FROM leads WHERE first_name IS NOT NULL;
```

---

## Support & Documentation

### Commandes Utiles

#### Stats Rapides
```sql
SELECT * FROM get_crm_stats();
```

#### Leads à Contacter Aujourd'hui
```sql
SELECT * FROM leads
WHERE next_followup_at::date = CURRENT_DATE
ORDER BY lead_score DESC;
```

#### Top 10 Leads Chauds
```sql
SELECT * FROM v_hot_leads LIMIT 10;
```

#### Pipeline Value par Étape
```sql
SELECT * FROM v_crm_pipeline;
```

### Fonctions Disponibles
- `split_name_to_first_last()` - Découpe names existants
- `sync_lead_status_to_stage()` - Synchronise statuts
- `sync_behavior_to_lead_score()` - Calcule scores
- `estimate_lead_value()` - Estime valeurs
- `get_crm_stats()` - Statistiques globales

---

## Migration File

Migration Supabase : `supabase/migrations/[timestamp]_unify_leads_table_complete.sql`

**Status :** ✅ Appliquée avec succès

---

## Questions Fréquentes

### Pourquoi une seule table ?
- Performance : 1 requête au lieu de 3-5
- Cohérence : pas de duplication
- Simplicité : maintenance plus facile

### Que faire des anciennes tables ?
- `crm_leads_enhanced` : conservée temporairement (désactivée)
- Suppression après validation complète (30 jours)

### Les données sont-elles sauvegardées ?
- ✅ Migration sans perte de données
- ✅ Backup automatique avant migration
- ✅ Rollback possible si nécessaire

### Comment ajouter des champs personnalisés ?
```sql
-- Option 1 : Ajouter colonne (recommandé pour champs fréquents)
ALTER TABLE leads ADD COLUMN mon_champ text;

-- Option 2 : Utiliser custom_fields (recommandé pour champs rares)
UPDATE leads
SET custom_fields = custom_fields || '{"mon_champ": "valeur"}'::jsonb
WHERE id = '...';
```

---

## Auteur & Date

**Créé le :** 2 Janvier 2026
**Migration :** unify_leads_table_complete.sql
**Status :** ✅ Production Ready (frontend OK, edge functions à migrer)

---

**🎯 NEXT ACTIONS :**
1. Exécuter `node scripts/migrate-edge-functions-to-leads.js`
2. Tester edge functions localement
3. Déployer edge functions
4. Valider emails automatiques
5. Monitoring 48h
