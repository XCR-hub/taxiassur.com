# Synchronisation Pipeline Commercial ↔ Pipeline Kanban - 2026

## 📋 Vue d'ensemble

Système de synchronisation automatique entre le **Pipeline Commercial** (7 étapes) utilisé par les commerciaux et le **Pipeline Kanban** visible dans le tableau de bord CRM.

### ✅ Principe

Le commercial travaille dans le **Pipeline Commercial** (workflow étape par étape) et le **statut Kanban** se met à jour **automatiquement** pour refléter la progression.

---

## 🔄 Mapping Pipeline Commercial → Kanban

| Pipeline Commercial (7 étapes) | Pipeline Kanban | Déclenchement |
|-------------------------------|-----------------|---------------|
| 1. Nouveau Lead | Nouveau Lead | Automatique |
| 2. Collecte Documents | Collecte Documents | Automatique |
| 3. Saisie Devis | Devis | Automatique |
| 4. Validation Devis | Décision Client | Automatique |
| 5. Signature Devis | Décision Client | Automatique |
| 6. Paiement RIB | Paiement | Automatique |
| 7. Contrat Final | Contrat & Signature | Automatique |
| **[Bouton Valider]** | **Client Actif** | **Manuel** |

---

## ⚙️ Fonctionnement technique

### 1. Synchronisation automatique

```
Trigger SQL sur table crm_leads
    ↓
Détection changement de pipeline_stage
    ↓
Fonction map_pipeline_stage_to_status()
    ↓
Mise à jour automatique du champ status
    ↓
Notification créée dans crm_event_notifications
```

### 2. Code du trigger

```sql
CREATE TRIGGER trigger_sync_pipeline_to_kanban
  BEFORE UPDATE OF pipeline_stage ON crm_leads
  FOR EACH ROW
  WHEN (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage)
  EXECUTE FUNCTION sync_pipeline_to_kanban();
```

### 3. Fonction de mapping

```sql
CREATE FUNCTION map_pipeline_stage_to_status(p_pipeline_stage text)
RETURNS lead_status
AS $$
BEGIN
  RETURN CASE p_pipeline_stage
    WHEN 'nouveau_lead' THEN 'NOUVEAU_LEAD'
    WHEN 'collecte_documents' THEN 'COLLECTE_DOCUMENTS'
    WHEN 'saisie_devis' THEN 'DEVIS'
    WHEN 'validation_devis' THEN 'DECISION_CLIENT'
    WHEN 'validation_devis_prospect' THEN 'DECISION_CLIENT'
    WHEN 'signature_devis' THEN 'DECISION_CLIENT'
    WHEN 'paiement_rib' THEN 'PAIEMENT'
    WHEN 'contrat_final' THEN 'CONTRAT_SIGNATURE'
    ELSE NULL
  END;
END;
$$;
```

---

## 🎯 Workflow complet

### Étape 1 : Nouveau Lead
```
Pipeline Commercial : nouveau_lead
         ↓ [Automatique]
Pipeline Kanban : NOUVEAU_LEAD
```

### Étape 2 : Collecte Documents
```
Pipeline Commercial : collecte_documents
         ↓ [Automatique]
Pipeline Kanban : COLLECTE_DOCUMENTS
```

### Étape 3 : Saisie Devis
```
Pipeline Commercial : saisie_devis
         ↓ [Automatique]
Pipeline Kanban : DEVIS
```

### Étapes 4 & 5 : Validation et Signature Devis
```
Pipeline Commercial : validation_devis_prospect
         ↓ [Automatique]
Pipeline Kanban : DECISION_CLIENT

Pipeline Commercial : signature_devis
         ↓ [Automatique]
Pipeline Kanban : DECISION_CLIENT (reste inchangé)
```

### Étape 6 : Paiement RIB
```
Pipeline Commercial : paiement_rib
         ↓ [Automatique]
         ↓ [Vérification RIB manquant]
         ↓ [Email automatique si nécessaire]
Pipeline Kanban : PAIEMENT
```

### Étape 7 : Contrat Final
```
Pipeline Commercial : contrat_final
         ↓ [Automatique]
Pipeline Kanban : CONTRAT_SIGNATURE
         ↓ [Commercial upload documents]
         ↓ [Commercial clique "Finaliser le Contrat"]
         ↓ [MANUEL via fonction RPC]
Pipeline Kanban : CLIENT_ACTIF
```

---

## 🚀 Activation manuelle en "Client Actif"

### Bouton "Finaliser le Contrat"

À l'étape 7 (Contrat Final), le commercial doit :

1. ✅ Uploader les 3 documents finaux :
   - Contrat signé
   - Attestation d'assurance
   - Mémo du véhicule

2. ✅ Cliquer sur le bouton **"Finaliser le Contrat et Activer le Client"**

3. 🎯 Le système appelle automatiquement :

```typescript
const { data, error } = await supabase
  .rpc('activate_lead_as_client', {
    p_lead_id: leadId
  });
```

### Fonction RPC `activate_lead_as_client`

```sql
CREATE FUNCTION activate_lead_as_client(p_lead_id uuid)
RETURNS jsonb
AS $$
BEGIN
  -- Vérifier que le lead est à l'étape contrat_final
  IF v_lead.pipeline_stage != 'contrat_final' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Le lead doit être à l''étape Contrat Final'
    );
  END IF;

  -- Mettre à jour le statut en CLIENT_ACTIF
  UPDATE crm_leads
  SET status = 'CLIENT_ACTIF'
  WHERE id = p_lead_id;

  -- Logger l'événement
  INSERT INTO crm_event_notifications (...);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lead activé avec succès'
  );
END;
$$;
```

### Actions déclenchées lors de l'activation

1. 📧 **Email de félicitations** envoyé au client
2. 🔐 **Accès à l'espace client** communiqué
3. 📊 **Notification** créée pour l'équipe
4. ✅ **Statut Kanban** : `CLIENT_ACTIF`

---

## 🔐 Sécurité et traçabilité

### Protections mises en place

1. **Pas de régression possible** : Le trigger ne modifie pas le statut si le lead est déjà `CLIENT_ACTIF` ou `PERDU`

2. **Validation stricte** : La fonction `activate_lead_as_client` vérifie que :
   - Le lead existe
   - Le lead est à l'étape `contrat_final`
   - Le lead n'est pas déjà `CLIENT_ACTIF`

3. **Traçabilité complète** : Chaque changement de statut est loggé dans `crm_event_notifications`

### Notifications automatiques

```sql
INSERT INTO crm_event_notifications (
  lead_id,
  event_type,
  title,
  message,
  priority,
  metadata
) VALUES (
  p_lead_id,
  'status_auto_updated',
  'Statut Kanban mis à jour',
  'Passage automatique de X à Y',
  'low',
  jsonb_build_object(
    'old_status', old_status,
    'new_status', new_status,
    'pipeline_stage', pipeline_stage,
    'trigger', 'automatic'
  )
);
```

---

## 📊 Visualisation dans le CRM

### Pipeline Commercial (Vue Commerciaux)

```
┌─────────────────────────────────────────────────────────────────┐
│ Pipeline Commercial - 7 Étapes                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ①──②──③──④──⑤──⑥──⑦                                           │
│  ✓  ✓  ✓  ✓  ○  ○  ○                                           │
│                                                                 │
│  Étape actuelle : Signature Devis                              │
│                                                                 │
│  [Passer à l'étape suivante]                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline Kanban (Vue Manager)

```
┌──────────┬──────────┬──────┬──────────┬──────────┬──────────┬──────────┐
│ Nouveau  │ Collecte │ Devis│ Décision │ Paiement │ Contrat  │ Client   │
│ Lead     │ Docs     │      │ Client   │          │ Signature│ Actif    │
├──────────┼──────────┼──────┼──────────┼──────────┼──────────┼──────────┤
│ 41 leads │ 8 leads  │2 lds │ 0 leads  │ 0 leads  │ 0 leads  │ 95 leads │
│          │          │      │          │          │          │          │
│ Card 1   │ Card 5   │Card 8│          │          │          │ Card X   │
│ Card 2   │ Card 6   │Card 9│          │          │          │ Card Y   │
│ Card 3   │ Card 7   │      │          │          │          │ ...      │
│ Card 4   │          │      │          │          │          │          │
└──────────┴──────────┴──────┴──────────┴──────────┴──────────┴──────────┘
```

---

## 🎨 Avantages du système

### Pour les commerciaux

1. ✅ **Interface simplifiée** : Workflow étape par étape clair
2. ✅ **Pas de double saisie** : Le statut Kanban se met à jour tout seul
3. ✅ **Actions guidées** : À chaque étape, les actions à faire sont claires
4. ✅ **Validation manuelle** : Contrôle total sur l'activation du client

### Pour les managers

1. ✅ **Vision d'ensemble** : Tableau Kanban mis à jour en temps réel
2. ✅ **Traçabilité** : Historique complet des changements de statut
3. ✅ **Notifications** : Alertes sur les événements importants
4. ✅ **Reporting** : Statistiques sur la progression des leads

### Pour le système

1. ✅ **Cohérence des données** : Un seul workflow source de vérité
2. ✅ **Automatisation** : Moins d'erreurs humaines
3. ✅ **Performance** : Trigger optimisé avec index
4. ✅ **Sécurité** : Validations strictes et RLS

---

## 📈 Statistiques et reporting

### Requêtes utiles

**Nombre de leads par étape du pipeline commercial :**

```sql
SELECT
  pipeline_stage,
  COUNT(*) as count
FROM crm_leads
WHERE status NOT IN ('PERDU', 'CLIENT_LOST')
GROUP BY pipeline_stage
ORDER BY
  CASE pipeline_stage
    WHEN 'nouveau_lead' THEN 1
    WHEN 'collecte_documents' THEN 2
    WHEN 'saisie_devis' THEN 3
    WHEN 'validation_devis_prospect' THEN 4
    WHEN 'signature_devis' THEN 5
    WHEN 'paiement_rib' THEN 6
    WHEN 'contrat_final' THEN 7
  END;
```

**Durée moyenne par étape :**

```sql
SELECT
  en1.metadata->>'new_status' as status,
  AVG(EXTRACT(EPOCH FROM (en2.created_at - en1.created_at))) / 86400 as avg_days
FROM crm_event_notifications en1
JOIN crm_event_notifications en2 ON en1.lead_id = en2.lead_id
WHERE en1.event_type = 'status_auto_updated'
  AND en2.event_type = 'status_auto_updated'
  AND en2.created_at > en1.created_at
GROUP BY 1;
```

**Taux de conversion par étape :**

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'CLIENT_ACTIF') * 100.0 / COUNT(*) as conversion_rate
FROM crm_leads
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## 🔧 Configuration et maintenance

### Ajout d'une nouvelle étape

Pour ajouter une nouvelle étape au pipeline commercial :

1. Ajouter la valeur dans l'enum `lead_status` si nécessaire
2. Mettre à jour la fonction `map_pipeline_stage_to_status`
3. Mettre à jour la fonction `get_next_kanban_status`
4. Ajouter l'étape dans `PIPELINE_STEPS` du composant React
5. Créer le composant step correspondant

### Désactivation temporaire

Pour désactiver la synchronisation automatique :

```sql
ALTER TABLE crm_leads DISABLE TRIGGER trigger_sync_pipeline_to_kanban;
```

Pour réactiver :

```sql
ALTER TABLE crm_leads ENABLE TRIGGER trigger_sync_pipeline_to_kanban;
```

---

## 🐛 Dépannage

### Le statut Kanban ne se met pas à jour

1. Vérifier que le trigger est activé :
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_sync_pipeline_to_kanban';
```

2. Vérifier les logs de notifications :
```sql
SELECT * FROM crm_event_notifications
WHERE event_type = 'status_auto_updated'
ORDER BY created_at DESC
LIMIT 10;
```

3. Tester le mapping manuellement :
```sql
SELECT map_pipeline_stage_to_status('collecte_documents');
-- Devrait retourner 'COLLECTE_DOCUMENTS'
```

### Erreur lors de l'activation du client

1. Vérifier que le lead est à l'étape `contrat_final`
2. Vérifier que tous les documents sont uploadés
3. Consulter les logs de la fonction RPC

---

## 📅 Historique des modifications

- **5 février 2026** : Création du système de synchronisation
- **5 février 2026** : Ajout du mapping pour `validation_devis_prospect`
- **5 février 2026** : Intégration avec le bouton "Finaliser le Contrat"

---

## ✅ Checklist de déploiement

- [x] Fonction `map_pipeline_stage_to_status` créée
- [x] Fonction `sync_pipeline_to_kanban` créée
- [x] Trigger `trigger_sync_pipeline_to_kanban` créé
- [x] Fonction `activate_lead_as_client` créée
- [x] Fonction `get_next_kanban_status` créée
- [x] Index de performance ajoutés
- [x] Composant `ContratSignatureStep` modifié
- [x] Tests de mapping validés
- [x] Documentation complète

---

**Date de création** : 5 février 2026
**Version** : 1.0
**Statut** : ✅ Production Ready
