# Rapport de Diagnostic - Leads & Documents

Date: 3 février 2026
Système: TaxiAssur CRM

---

## Résumé Exécutif

Le diagnostic complet a révélé plusieurs problèmes de synchronisation entre les anciennes et nouvelles tables. Les données existent mais ne sont pas au bon endroit.

### Problèmes Identifiés

1. **57 documents** sont dans `prospect_documents` au lieu de `crm_lead_documents`
2. **0 emails** dans `email_messages` (source à identifier)
3. **1 doublon** d'email à fusionner
4. **18 leads** sans aucune interaction

---

## Analyse Détaillée

### 1. Leads (crm_leads)

**Total**: 24 leads

**Répartition par statut**:
- NOUVEAU_LEAD: 13
- COLLECTE_DOCUMENTS: 3
- DEVIS: 2
- RECONTACT_PROGRAMME: 3
- RELANCE: 1
- CLIENT_ACTIF: 1
- CLIENT_LOST: 1

**Qualité des données**:
- ✓ Tous les leads ont un email
- ⚠️ 3 leads avec informations incomplètes (nom/prénom manquant)
- ⚠️ 18 leads sans aucune interaction enregistrée

### 2. Documents

#### Dans prospect_documents (ancien système)
- **Total**: 57 documents
- **Leads concernés**: 6
- **Validés**: 4
- **Non validés**: 53

**Types de documents**:
- Autres: 44
- Licence taxi: 4
- Permis conduire: 3
- RIB: 2
- Carte grise: 1
- Pièce identité: 1
- Licence professionnelle: 1
- Relevé information: 1

#### Dans crm_lead_documents (nouveau système)
- **Total**: 0 documents
- **Problème**: Tous les documents sont restés dans l'ancienne table

### 3. Emails

#### Dans email_messages
- **Total**: 0 emails
- **Problème**: Les emails ne sont pas synchronisés dans cette table

**Impact**:
- L'historique complet ne peut pas afficher les emails
- Impossible de lier automatiquement les emails aux leads
- Aucune pièce jointe d'email n'est disponible

### 4. Doublons

**Email en doublon**: tcerda@xcr.fr
- Lead 1: Créé le 14/01/2026 - NOUVEAU_LEAD
- Lead 2: Créé le 02/02/2026 - NOUVEAU_LEAD

---

## Actions Recommandées

### Action 1: Migration des Documents (PRIORITAIRE)

**Commande**:
```bash
node scripts/sync-leads-documents.js --real
```

**Ce qui sera fait**:
- Migration de 57 documents de `prospect_documents` vers `crm_lead_documents`
- Conservation du statut de validation
- Préservation de tous les métadonnées
- Aucune suppression (conservation des deux copies)

**Résultat attendu**:
- Les documents seront visibles dans le nouveau système CRM
- Le système de validation fonctionnera correctement
- L'historique complet affichera tous les documents

### Action 2: Fusion du Doublon

**Commande**:
```bash
node scripts/sync-leads-documents.js --real
```

**Ce qui sera fait**:
- Conservation du lead le plus complet (avec le plus de données)
- Transfert de tous les documents et interactions vers le lead conservé
- Suppression du lead en double

**Résultat attendu**:
- Un seul lead pour tcerda@xcr.fr
- Toutes les données conservées
- Historique unifié

### Action 3: Investigation des Emails

**Problème**: Les emails ne sont pas dans `email_messages`

**Questions à résoudre**:
1. Où sont stockés les emails actuellement ?
2. Y a-t-il une autre table qui contient les emails ?
3. Les emails sont-ils synchronisés depuis un provider externe ?

**Recommandation**:
- Vérifier les cron jobs de synchronisation email
- Vérifier les edge functions `sync-ionos-imap`, `sync-brevo-emails`, etc.
- Activer manuellement la synchronisation si nécessaire

---

## Commandes Disponibles

### 1. Diagnostic Complet
```bash
node scripts/diagnostic-leads-documents.js
```
Analyse complète sans modification

### 2. Synchronisation (Mode Test)
```bash
node scripts/sync-leads-documents.js
```
Montre ce qui sera fait sans appliquer les modifications

### 3. Synchronisation (Mode Réel)
```bash
node scripts/sync-leads-documents.js --real
```
Applique réellement les modifications

---

## Impact sur le Système

### Avant Synchronisation
- ❌ Documents invisibles dans le CRM moderne
- ❌ Historique incomplet
- ❌ Doublons de leads
- ❌ Pas d'emails visibles

### Après Synchronisation
- ✅ Tous les documents visibles
- ✅ Validation des documents fonctionnelle
- ✅ Pas de doublons
- ⚠️ Emails toujours manquants (nécessite action séparée)

---

## Sécurité

✓ Tous les scripts ont été testés en mode dry-run
✓ Aucune suppression de données (sauf fusion de doublons)
✓ Possibilité de rollback via backup Supabase
✓ Logs détaillés de toutes les opérations

---

## Prochaines Étapes

1. **Exécuter la synchronisation** pour récupérer les 57 documents
2. **Investiguer le système d'emails** pour comprendre pourquoi ils ne sont pas synchronisés
3. **Nettoyer les 18 leads** sans interaction (les valider ou les supprimer)
4. **Compléter les 3 leads** avec informations manquantes

---

## Notes Techniques

### Tables Impliquées
- `crm_leads` - Leads principaux (24 entrées)
- `prospect_documents` - Ancienne table documents (57 entrées)
- `crm_lead_documents` - Nouvelle table documents (0 entrées)
- `email_messages` - Emails (0 entrées) ⚠️
- `email_attachments` - Pièces jointes emails (0 entrées) ⚠️

### Colonnes Corrigées
- `crm_lead_documents.validation_status` → `crm_lead_documents.status` ✓

### Buckets Storage
- `prospect-documents` - Documents uploadés par prospects
- `crm-documents` - Documents système CRM

---

**Auteur**: Script de diagnostic automatique
**Version**: 1.0
**Date**: 3 février 2026
