# 🗄️ SCHÉMA DATABASE CRM TAXIASSUR - COMPLET

## 📊 Vue d'ensemble

Le schéma database implémente un **CRM IA-first** pour le marché assurance taxi avec 8 modules interconnectés et plus de 40 tables.

---

## 🧱 ARCHITECTURE GLOBALE

### Modules implémentés

1. **CORE** - Leads, Clients, Véhicules
2. **PIPELINE** - États, Transitions, Workflows, Tasks
3. **IA** - Agents, Décisions, Gouvernance, Apprentissage
4. **COMMUNICATION** - Messages, Templates, Canaux
5. **PRODUCTION** - Documents, Signatures, Paiements, Contrats
6. **RÉTENTION** - Scores, Churn, Cross-sell
7. **SINISTRES** - Claims, Assistance
8. **AUDIT** - Logs, Events, RGPD, Notes

---

## 📋 TABLES PAR MODULE

### MODULE 1 : CORE (Leads & Clients)

#### `crm_leads` (★ Table centrale)
**Prospects/Leads avec scoring et état pipeline**

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | PK |
| `first_name` | TEXT | Prénom |
| `last_name` | TEXT | Nom |
| `email` | TEXT | Email (validé) |
| `phone` | TEXT | Téléphone (validé) |
| `status` | lead_status | État pipeline |
| `lead_score` | INTEGER | Score 0-100 |
| `temperature` | TEXT | COLD/WARM/HOT |
| `assigned_to` | UUID | Commercial assigné |
| `next_followup_at` | TIMESTAMPTZ | Prochaine relance |
| `converted_to_client` | BOOLEAN | Converti ? |
| `consent_marketing` | BOOLEAN | RGPD marketing |
| `metadata` | JSONB | Données flexibles |

**Index** : status, assigned_to, email, phone, next_followup_at

#### `crm_clients` (★ Clients convertis)
**Clients ayant souscrit au moins un contrat**

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | PK |
| `lead_id` | UUID | Lead d'origine |
| `lifetime_value` | DECIMAL | Valeur vie client |
| `retention_score` | INTEGER | Score rétention 0-100 |
| `churn_risk_score` | INTEGER | Risque churn 0-100 |
| `account_manager_id` | UUID | Gestionnaire compte |
| `next_renewal_date` | DATE | Prochaine échéance |

**Index** : status, renewal, churn_risk

#### `crm_vehicles`
**Véhicules assurés (taxi/VTC)**

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | PK |
| `client_id` | UUID | Propriétaire |
| `registration_number` | TEXT | Immatriculation |
| `make` | TEXT | Marque |
| `model` | TEXT | Modèle |
| `vehicle_type` | TEXT | TAXI/VTC/TAXI_VTC |

---

### MODULE 2 : PIPELINE (Workflows & États)

#### `crm_state_transitions`
**Historique transitions d'état avec traçabilité**

| Colonne | Type | Description |
|---------|------|-------------|
| `lead_id` | UUID | Lead concerné |
| `from_state` | lead_status | État départ |
| `to_state` | lead_status | État arrivée |
| `triggered_by` | TEXT | SYSTEM/AI/USER/WORKFLOW |
| `ai_decision_id` | UUID | Décision IA source |
| `reason` | TEXT | Justification |

#### `crm_workflows`
**Définitions de workflows automatisés**

| Colonne | Type | Description |
|---------|------|-------------|
| `name` | TEXT | Nom workflow |
| `trigger_event` | event_type | Événement déclencheur |
| `steps` | JSONB | Actions séquentielles |
| `enabled` | BOOLEAN | Actif ? |

#### `crm_workflow_runs`
**Exécutions de workflows**

| Colonne | Type | Description |
|---------|------|-------------|
| `workflow_id` | UUID | Workflow exécuté |
| `lead_id` | UUID | Lead concerné |
| `status` | TEXT | PENDING/RUNNING/COMPLETED/FAILED |
| `current_step` | INTEGER | Étape en cours |

#### `crm_tasks`
**Tâches manuelles assignées**

| Colonne | Type | Description |
|---------|------|-------------|
| `assigned_to` | UUID | Utilisateur assigné |
| `title` | TEXT | Titre tâche |
| `task_type` | TEXT | CALL/EMAIL/MEETING |
| `priority` | TEXT | LOW/NORMAL/HIGH/URGENT |
| `due_date` | TIMESTAMPTZ | Échéance |
| `status` | TEXT | TODO/IN_PROGRESS/COMPLETED |

---

### MODULE 3 : IA (Multi-Agents + Gouvernance)

#### `crm_ai_agents`
**Configuration des 6 agents IA spécialisés**

| Colonne | Type | Description |
|---------|------|-------------|
| `agent_type` | ai_agent_type | SALES/RETENTION/PRODUCTION/COMPLIANCE/VOICE/ANALYST |
| `name` | TEXT | Nom agent |
| `model_name` | TEXT | Modèle IA utilisé |
| `prompt_template` | TEXT | Prompt système |
| `enabled` | BOOLEAN | Actif ? |
| `success_rate` | DECIMAL | Taux succès |

**Agents implémentés** :
- 🎯 **SALES_AGENT** - Optimise vente et relances
- 🛡️ **RETENTION_AGENT** - Prévient churn
- 📄 **PRODUCTION_AGENT** - Gère docs/signature/paiement
- ⚖️ **COMPLIANCE_AGENT** - Vérifie RGPD
- 📞 **VOICE_AGENT** - Scripts appels
- 📊 **ANALYST_AGENT** - Optimise KPI

#### `crm_ai_decisions` (★ Traçabilité IA)
**Décisions IA avec rationale complète**

| Colonne | Type | Description |
|---------|------|-------------|
| `lead_id` | UUID | Lead concerné |
| `governance_session_id` | UUID | Session arbitrage |
| `decision_type` | TEXT | Type décision |
| `rationale` | TEXT | Justification complète |
| `confidence` | DECIMAL | Confiance 0-100 |
| `actions` | JSONB | Actions à exécuter |
| `status` | TEXT | PENDING/EXECUTED/REJECTED |
| `overridden` | BOOLEAN | Override humain ? |
| `outcome` | TEXT | SUCCESS/FAILURE |

#### `crm_ai_governance_sessions`
**Sessions d'arbitrage multi-agents (IA Council)**

| Colonne | Type | Description |
|---------|------|-------------|
| `agents_consulted` | ai_agent_type[] | Agents consultés |
| `arbitration_method` | TEXT | Méthode vote |
| `winner_agent_type` | ai_agent_type | Agent gagnant |
| `compliance_passed` | BOOLEAN | Conforme ? |
| `duration_ms` | INTEGER | Durée traitement |

#### `crm_ai_recommendations`
**Recommandations individuelles par agent**

#### `crm_ai_learning_features`
**Features extraites pour apprentissage continu**

#### `crm_ai_strategy_performance`
**Performance tracking des stratégies IA**

---

### MODULE 4 : COMMUNICATION (Multicanal)

#### `crm_message_templates`
**Templates versionnés multicanaux**

| Colonne | Type | Description |
|---------|------|-------------|
| `template_key` | TEXT | Clé unique |
| `email_subject` | TEXT | Sujet email |
| `email_html` | TEXT | Contenu HTML |
| `sms_content` | TEXT | Contenu SMS |
| `variables` | TEXT[] | Variables disponibles |
| `version` | INTEGER | Version template |

**Templates essentiels** :
- LEAD_CONFIRMATION
- DOCS_REQUEST
- QUOTE_SENT
- SIGNATURE_LINK
- PAYMENT_REQUEST
- CONTRACT_ACTIVE

#### `crm_interactions`
**Historique communications avec tracking**

| Colonne | Type | Description |
|---------|------|-------------|
| `channel` | communication_channel | EMAIL/SMS/WHATSAPP/VOICE |
| `direction` | TEXT | INBOUND/OUTBOUND |
| `content` | TEXT | Contenu message |
| `status` | message_status | QUEUED/SENT/DELIVERED/READ/CLICKED/REPLIED |
| `sent_at` | TIMESTAMPTZ | Date envoi |
| `delivered_at` | TIMESTAMPTZ | Date livraison |
| `read_at` | TIMESTAMPTZ | Date lecture |
| `triggered_by` | TEXT | SYSTEM/AI/USER/WORKFLOW |

---

### MODULE 5 : PRODUCTION (Documents, Signatures, Paiements)

#### `crm_documents`
**Documents téléchargés avec validation**

| Colonne | Type | Description |
|---------|------|-------------|
| `document_type` | document_type | CARTE_GRISE/PERMIS/CARTE_PRO_TAXI/RIB... |
| `storage_path` | TEXT | Chemin storage |
| `doc_status` | document_status | REQUIRED/RECEIVED/VALIDATED/REJECTED |
| `validated_by` | UUID | Valideur |
| `expires_at` | DATE | Date expiration |

**Types documents** : CARTE_GRISE, PERMIS_CONDUIRE, CARTE_PRO_TAXI, KBIS, RIB, RELEVE_INFO, CONTRAT, ATTESTATION...

#### `crm_document_checklists`
**Checklist documents requis (auto-générée)**

#### `crm_signatures`
**Signatures électroniques avec suivi**

| Colonne | Type | Description |
|---------|------|-------------|
| `provider` | TEXT | Provider signature |
| `signature_url` | TEXT | URL signature |
| `sig_status` | signature_status | PENDING/SENT/VIEWED/SIGNED |
| `sent_at` | TIMESTAMPTZ | Date envoi |
| `signed_at` | TIMESTAMPTZ | Date signature |

#### `crm_payments`
**Paiements avec tracking complet**

| Colonne | Type | Description |
|---------|------|-------------|
| `amount` | DECIMAL | Montant |
| `payment_type` | TEXT | INITIAL/RENEWAL/ADJUSTMENT |
| `provider` | TEXT | Provider paiement |
| `pay_status` | payment_status | PENDING/COMPLETED/FAILED |

#### `crm_contracts`
**Contrats d'assurance actifs**

| Colonne | Type | Description |
|---------|------|-------------|
| `contract_number` | TEXT | N° contrat unique |
| `product_type` | TEXT | TAXI/VTC/TAXI_VTC/FLEET |
| `annual_premium` | DECIMAL | Prime annuelle |
| `start_date` | DATE | Début contrat |
| `end_date` | DATE | Fin contrat |
| `contract_status` | TEXT | ACTIVE/SUSPENDED/CANCELLED |

---

### MODULE 6 : RÉTENTION (Anti-Churn)

#### `crm_retention_scores`
**Scores de rétention calculés par IA**

| Colonne | Type | Description |
|---------|------|-------------|
| `score` | INTEGER | Score 0-100 |
| `churn_probability` | DECIMAL | Proba churn 0-100 |
| `factors` | JSONB | Facteurs contributifs |
| `segment` | TEXT | HIGH_VALUE_SAFE/CRITICAL_RISK... |
| `recommended_actions` | JSONB | Actions proposées |

#### `crm_churn_signals`
**Signaux faibles de churn détectés**

| Colonne | Type | Description |
|---------|------|-------------|
| `signal_type` | TEXT | PAYMENT_FAILURE/NO_RESPONSE/COMPLAINT... |
| `severity` | TEXT | LOW/MEDIUM/HIGH/CRITICAL |
| `description` | TEXT | Description signal |
| `actions_triggered` | BOOLEAN | Actions lancées ? |
| `resolved` | BOOLEAN | Résolu ? |

**Types signaux** : PAYMENT_FAILURE, NO_RESPONSE_MULTIPLE, COMPLAINT_FILED, CLAIM_DISSATISFACTION, COMPETITOR_INQUIRY...

#### `crm_cross_sell_opportunities`
**Opportunités de vente additionnelle**

| Colonne | Type | Description |
|---------|------|-------------|
| `product_type` | TEXT | PROTECTION_JURIDIQUE/SANTE/RETRAITE/MRP... |
| `propensity_score` | DECIMAL | Score propension 0-100 |
| `expected_value` | DECIMAL | Valeur attendue |
| `opp_status` | TEXT | IDENTIFIED/CONTACTED/CONVERTED |

---

### MODULE 7 : SINISTRES & ASSISTANCE

#### `crm_claims`
**Déclarations de sinistres avec workflow**

| Colonne | Type | Description |
|---------|------|-------------|
| `claim_number` | TEXT | N° sinistre unique |
| `claim_type` | TEXT | ACCIDENT/VOL/INCENDIE/BRIS_GLACE... |
| `incident_date` | DATE | Date incident |
| `estimated_amount` | DECIMAL | Montant estimé |
| `claim_status` | TEXT | DECLARED/UNDER_REVIEW/APPROVED/PAID |
| `assigned_to` | UUID | Gestionnaire sinistre |

#### `crm_assistance_requests`
**Demandes d'assistance routière avec tracking temps réel**

| Colonne | Type | Description |
|---------|------|-------------|
| `assistance_type` | TEXT | PANNE/REMORQUAGE/VEHICULE_REMPLACEMENT... |
| `location` | TEXT | Localisation |
| `latitude` | DECIMAL | GPS |
| `urgency` | TEXT | LOW/NORMAL/HIGH/EMERGENCY |
| `assist_status` | TEXT | REQUESTED/DISPATCHED/IN_PROGRESS |
| `provider_eta` | TIMESTAMPTZ | ETA prestataire |

---

### MODULE 8 : AUDIT & RGPD

#### `crm_audit_logs` (★ Immuable)
**Journal d'audit immuable avec traçabilité complète**

| Colonne | Type | Description |
|---------|------|-------------|
| `user_id` | UUID | Utilisateur |
| `action` | TEXT | Action effectuée |
| `entity_type` | TEXT | Type entité |
| `entity_id` | UUID | ID entité |
| `old_values` | JSONB | Valeurs avant |
| `new_values` | JSONB | Valeurs après |
| `rationale` | TEXT | Justification |
| `ip_address` | INET | IP origine |

**Pas de modification/suppression possible (immuable)**

#### `crm_events`
**Événements système déclenchant workflows**

| Colonne | Type | Description |
|---------|------|-------------|
| `event_type` | event_type | LEAD_CREATED/QUOTE_SENT/PAYMENT_CONFIRMED... |
| `payload` | JSONB | Données événement |
| `source` | TEXT | SYSTEM/USER/EXTERNAL/WORKFLOW/AI |
| `processed` | BOOLEAN | Traité ? |

**21 types d'événements** : LEAD_CREATED, CONTACT_CONFIRMED, DOCS_REQUIRED, QUOTE_SENT, SIGNATURE_COMPLETED, PAYMENT_CONFIRMED, CONTRACT_ACTIVATED, RISK_CHURN_DETECTED...

#### `crm_gdpr_requests`
**Demandes RGPD (accès, rectification, effacement)**

| Colonne | Type | Description |
|---------|------|-------------|
| `request_type` | TEXT | ACCESS/RECTIFICATION/ERASURE/PORTABILITY... |
| `gdpr_status` | TEXT | PENDING/IN_PROGRESS/COMPLETED |
| `data_exported_path` | TEXT | Chemin export données |

#### `crm_notes`
**Notes internes sur leads/clients**

| Colonne | Type | Description |
|---------|------|-------------|
| `note_type` | TEXT | GENERAL/CALL/MEETING/IMPORTANT |
| `content` | TEXT | Contenu note |
| `is_pinned` | BOOLEAN | Épinglée ? |

---

## 🔗 RELATIONS PRINCIPALES

```
crm_leads (1) ──→ (N) crm_interactions
           ──→ (N) crm_documents
           ──→ (N) crm_signatures
           ──→ (N) crm_payments
           ──→ (N) crm_state_transitions
           ──→ (N) crm_tasks
           ──→ (N) crm_events
           ──→ (1) crm_clients (conversion)

crm_clients (1) ──→ (N) crm_contracts
            ──→ (N) crm_vehicles
            ──→ (N) crm_claims
            ──→ (N) crm_assistance_requests
            ──→ (N) crm_retention_scores
            ──→ (N) crm_churn_signals
            ──→ (N) crm_cross_sell_opportunities

crm_ai_governance_sessions (1) ──→ (N) crm_ai_recommendations
                            ──→ (1) crm_ai_decisions

crm_workflows (1) ──→ (N) crm_workflow_runs
```

---

## 📊 TYPES ENUMS

### `lead_status` (19 états)
Pipeline complet du lead au client :
- NEW_LEAD
- CONTACT_ATTEMPTED
- CONTACT_CONFIRMED
- DOCUMENTS_REQUIRED
- DOCUMENTS_PARTIAL
- READY_FOR_QUOTE
- QUOTE_SENT
- NO_RESPONSE
- RELANCE_ACTIVE
- SIGNATURE_PENDING
- SIGNED
- PAYMENT_PENDING
- ACTIVE_CLIENT
- CROSS_SELLING
- RISK_CHURN
- CLIENT_LOST
- SINISTER
- ATTESTATION_REQUEST
- SUPPORT_ASSISTANCE

### `event_type` (21 événements)
LEAD_CREATED, CONTACT_CONFIRMED, DOCS_REQUIRED, DOCS_RECEIVED, QUOTE_READY, QUOTE_SENT, NO_RESPONSE_24H, NO_RESPONSE_48H, SIGNATURE_SENT, SIGNATURE_COMPLETED, PAYMENT_LINK_SENT, PAYMENT_CONFIRMED, PAYMENT_FAILED, CONTRACT_ACTIVATED, ATTESTATION_REQUESTED, SINISTER_DECLARED, ASSISTANCE_REQUESTED, RISK_CHURN_DETECTED, CROSS_SELL_OPPORTUNITY, CLIENT_SATISFACTION_LOW, RENEWAL_DUE

### `communication_channel` (6 canaux)
EMAIL, SMS, WHATSAPP, VOICE_CALL, IN_APP, POSTAL

### `message_status` (9 statuts)
QUEUED, SENT, DELIVERED, READ, CLICKED, REPLIED, FAILED, BOUNCED, UNSUBSCRIBED

### `ai_agent_type` (6 agents)
SALES_AGENT, RETENTION_AGENT, PRODUCTION_AGENT, COMPLIANCE_AGENT, VOICE_AGENT, ANALYST_AGENT

### `document_type` (15 types)
CARTE_GRISE, PERMIS_CONDUIRE, CARTE_PRO_TAXI, KBIS, RIB, JUSTIFICATIF_DOMICILE, RELEVE_INFO, CONTRAT, CONDITIONS_GENERALES, IPID, MANDAT_SEPA, ATTESTATION, CONSTAT_AMIABLE, FACTURE, AUTRE

---

## 🔒 SÉCURITÉ (RLS)

### Tables avec RLS activé

Toutes les tables sensibles ont Row Level Security activé :
- ✅ crm_leads
- ✅ crm_clients
- ✅ crm_vehicles
- ✅ crm_documents
- ✅ crm_signatures
- ✅ crm_payments
- ✅ crm_contracts
- ✅ crm_interactions
- ✅ crm_ai_decisions
- ✅ crm_audit_logs (lecture seule)
- ✅ crm_claims
- ✅ crm_retention_scores
- ✅ crm_notes

### Policies principales

**Admins/Managers** : Accès complet sur toutes tables
**Sales** : Accès leads assignés + clients gérés
**Production** : Accès documents + signatures + paiements
**Claims** : Accès sinistres
**Support** : Accès assistance
**Read-Only** : Lecture uniquement

---

## ⚡ OPTIMISATIONS

### Index créés (80+)

Chaque table dispose d'index optimisés sur :
- Foreign keys
- Colonnes de recherche fréquente (email, phone, status)
- Colonnes de tri (created_at, updated_at)
- Colonnes de filtrage (status, assigned_to)
- Index partiels avec WHERE clauses

### Triggers automatiques

- `updated_at` automatique sur 20+ tables
- Création événement `LEAD_CREATED` automatique
- Création checklist documents automatique

---

## 📈 MÉTRIQUES

- **40+ tables** créées
- **80+ index** optimisés
- **8 modules** fonctionnels
- **19 états** pipeline
- **21 types** d'événements
- **6 agents** IA configurés
- **15 types** de documents
- **RLS** sur toutes tables sensibles
- **Audit trail** immuable

---

## 🚀 PROCHAINES ÉTAPES

### Pour backend (NestJS)

1. Générer **DTOs TypeScript** depuis schéma
2. Créer **services** par module
3. Implémenter **ChannelEngine** (communication multicanale)
4. Implémenter **AIGovernanceEngine** (arbitrage multi-agents)
5. Implémenter **WorkflowEngine** (exécution workflows)
6. Créer **jobs BullMQ** (relances, détection churn, etc.)

### Pour frontend (Next.js)

1. Dashboard global (KPI + actions IA)
2. Pipeline Kanban (glisser-déposer)
3. Fiche lead/client (timeline + décisions IA)
4. Inbox multicanale
5. Production (docs + signature + paiement)
6. Sinistres & assistance
7. Rétention (signaux churn)

---

## 📚 DOCUMENTATION TECHNIQUE

### Conventions

- **Préfixe `crm_`** : toutes les tables CRM
- **Suffixe `_status`** : colonnes de statut renommées si conflit avec enum
- **JSONB** : metadata flexibles sur tables principales
- **TIMESTAMPTZ** : toutes les dates avec timezone
- **UUID** : tous les IDs
- **CHECK constraints** : validation données en base
- **Foreign keys CASCADE** : nettoyage automatique

### Nomenclature colonnes statut

Pour éviter conflits avec types enum, colonnes statut renommées :
- `doc_status` pour crm_documents
- `sig_status` pour crm_signatures
- `pay_status` pour crm_payments
- `contract_status` pour crm_contracts
- `claim_status` pour crm_claims
- `assist_status` pour crm_assistance_requests
- `msg_status` pour crm_interactions
- `gdpr_status` pour crm_gdpr_requests

---

## ✅ STATUT FINAL

**🎯 SCHÉMA DATABASE COMPLET APPLIQUÉ AVEC SUCCÈS**

Toutes les migrations ont été appliquées sur Supabase.

Le schéma est prêt pour :
- Développement backend (NestJS)
- Développement frontend (Next.js)
- Implémentation IA multi-agents
- Event-driven workflows
- Communication multicanale
- Production complète
- Rétention & anti-churn
- Audit & RGPD
