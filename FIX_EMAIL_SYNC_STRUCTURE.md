# Fix : Synchronisation Emails → Leads → Interactions → Documents

## 🎯 Problème résolu

**Situation initiale :**
- ✅ La synchronisation IMAP récupère les emails → Ils vont dans `email_messages`
- ❌ Les emails ne sont PAS liés aux leads (pas de `lead_id`)
- ❌ Aucune interaction n'est créée dans `crm_interactions`
- ❌ Les pièces jointes ne sont pas extraites
- ❌ La timeline du lead reste vide ("0 interactions")
- ❌ Aucun document n'apparaît

**Résultat :** Vous aviez les emails dans l'Inbox Multicanal mais rien dans les fiches leads.

---

## ✅ Solution mise en place

### 1. **Trigger automatique : Email → Interaction + Documents**

Quand un email est lié à un lead (automatiquement ou manuellement), le système crée **automatiquement** :

#### ✅ Une interaction dans `crm_interactions` avec :
- Type : `email`
- Direction : `inbound` ou `outbound`
- Sujet et contenu de l'email
- Date exacte de réception
- Métadonnées (email_id, expéditeur, pièces jointes, etc.)

#### ✅ Extraction des pièces jointes en documents avec :
- Détection intelligente du type de document (RIB, KBIS, permis, etc.)
- Création automatique dans `prospect_documents`
- Lien vers l'email d'origine
- Conservation de toutes les métadonnées

**Fichier** : Migration `create_auto_email_interaction_and_documents.sql`

---

### 2. **Fonction de liaison en masse : `link_unassigned_emails_to_leads()`**

Cette fonction recherche tous les emails non assignés (`lead_id IS NULL`) et les lie automatiquement aux leads existants.

**Comment ça marche :**
```sql
-- Recherche par email exact
SELECT id FROM crm_leads WHERE email = email_message.from_email

-- Si trouvé → Lie l'email au lead
UPDATE email_messages SET lead_id = found_lead_id, auto_matched = true

-- Le trigger crée automatiquement l'interaction et extrait les documents
```

**Retour :**
```json
{
  "success": true,
  "emails_linked": 15,
  "interactions_created": 15,
  "message": "✅ 15 emails liés à des leads existants, 15 interactions créées"
}
```

---

### 3. **Fonction pour un lead spécifique : `link_lead_email_history()`**

Lie tous les emails d'un expéditeur spécifique à son lead.

**Exemple :**
```sql
SELECT link_lead_email_history('taxidujeremy@gmail.com')
```

**Retour :**
```json
{
  "success": true,
  "lead_id": "uuid-du-lead",
  "emails_linked": 5,
  "total_interactions": 5,
  "message": "✅ 5 emails liés au lead, 5 interactions au total"
}
```

---

### 4. **Interface simplifiée et claire**

#### Avant (confus) :
```
[Importer historique] → Pas clair, qu'est-ce que ça fait ?
```

#### Après (clair) :
```
[Lier emails → leads] → Lie automatiquement les emails aux leads existants
```

**Titre du bouton** : "Lier emails → leads"
**Tooltip** : "Lie automatiquement les emails aux leads existants et crée les interactions"

---

## 🔄 Workflow complet

### Scénario 1 : Nouveau lead créé APRÈS les premiers emails

1. **Jérémy vous écrit 3 fois en janvier** → Emails dans `email_messages` mais `lead_id = NULL`
2. **Vous créez son lead en février** → Lead dans `crm_leads`
3. **Vous cliquez sur "Lier emails → leads"** → Le système :
   - ✅ Trouve les 3 emails de taxidujeremy@gmail.com
   - ✅ Les lie au lead de Jérémy
   - ✅ Crée 3 interactions dans la timeline
   - ✅ Extrait les pièces jointes en documents

**Résultat** : Tout l'historique depuis janvier apparaît dans la fiche de Jérémy !

---

### Scénario 2 : Synchronisation en cours

Quand vous cliquez sur **"Synchroniser maintenant"** :

1. **Récupère les nouveaux emails** de l'IMAP
2. **Le trigger `auto_match_email_to_lead()`** :
   - Cherche si un lead existe pour cet email
   - Si trouvé → Lie automatiquement l'email
3. **Le trigger `create_interaction_from_email()`** :
   - Crée l'interaction automatiquement
   - Extrait les pièces jointes

**Résultat** : Les nouveaux emails apparaissent directement dans les timelines des leads !

---

### Scénario 3 : Créer un lead depuis un email (fonctionnalité précédente)

Dans l'Inbox Multicanal, quand vous ouvrez un email :

1. **Si le lead n'existe pas** → Bouton **"Créer le lead + lier l'historique"**
2. **Au clic** :
   - ✅ Crée le lead
   - ✅ Recherche TOUS les emails du même expéditeur
   - ✅ Les lie au nouveau lead
   - ✅ Crée toutes les interactions
   - ✅ Extrait tous les documents

---

## 📊 Détection intelligente des types de documents

Le système détecte automatiquement le type de document selon le nom du fichier :

| Nom du fichier contient | Type détecté |
|-------------------------|--------------|
| `rib`, `bank` | `rib` |
| `kbis`, `siret` | `kbis` |
| `permis`, `license` | `permis_conduire` |
| `identite`, `carte` | `piece_identite` |
| `carte grise`, `vehicule` | `carte_grise` |
| `assurance`, `attestation` | `attestation_assurance_actuelle` |
| Autre | `autre` |

**Exemple :**
- Email avec PJ : `rib_taxiparis.pdf`
- Système détecte : Type `rib`
- Document créé dans la catégorie RIB automatiquement

---

## 🎨 Amélioration de l'interface

### Inbox Multicanal

**Avant :**
```
[Importer historique]  [Synchroniser maintenant]
```

**Après :**
```
[Lier emails → leads]  [Synchroniser maintenant]
```

### Dans la vue d'un email

**Si lead trouvé :**
```
[Voir le lead] 🟢  [Sync historique] 🔵
```

**Si lead non trouvé :**
```
[Créer le lead + lier l'historique] 🔵
```

---

## 🔧 Détails techniques

### Tables modifiées

#### `email_messages`
- Champ `lead_id` : ID du lead lié (NULL si pas encore lié)
- Champ `auto_matched` : Boolean, true si lié automatiquement
- Champ `attachments` : JSONB, pièces jointes de l'email

#### `crm_interactions`
- Type `email` avec contenu et métadonnées
- Lien vers l'email via `metadata.email_id`
- Date exacte de l'email (`created_at = email.received_at`)

#### `prospect_documents`
- Champ `source` : `'email'` pour les documents extraits d'emails
- Champ `metadata` : Contient `email_id`, `email_subject`, `email_date`

---

### Triggers créés

#### 1. `trigger_create_interaction_from_email`
- **Quand** : AFTER INSERT OR UPDATE OF lead_id ON email_messages
- **Action** :
  - Crée l'interaction dans `crm_interactions`
  - Extrait les pièces jointes en documents
  - Évite les doublons

#### 2. `trigger_auto_match_email` (existant, amélioré)
- **Quand** : BEFORE INSERT ON email_messages
- **Action** :
  - Recherche un lead correspondant par email
  - Assigne automatiquement le `lead_id`

---

### Fonctions RPC disponibles

#### `link_unassigned_emails_to_leads()`
```typescript
const { data } = await supabase.rpc('link_unassigned_emails_to_leads');
// Retourne : { success, emails_linked, interactions_created, message }
```

#### `link_lead_email_history(email: string)`
```typescript
const { data } = await supabase.rpc('link_lead_email_history', {
  lead_email: 'taxidujeremy@gmail.com'
});
// Retourne : { success, lead_id, emails_linked, total_interactions, message }
```

---

## 🎯 Ce qui a été corrigé

| Problème | Solution |
|----------|----------|
| ❌ Emails synchronisés mais timeline vide | ✅ Trigger crée automatiquement les interactions |
| ❌ Pièces jointes perdues | ✅ Extraction automatique en documents |
| ❌ Emails non liés aux leads | ✅ Fonction de liaison automatique |
| ❌ Bouton "Importer historique" confus | ✅ Renommé "Lier emails → leads" avec tooltip |
| ❌ Pas de documents extraits | ✅ Détection intelligente du type + création auto |

---

## 🚀 Comment utiliser

### Pour lier tous les emails non assignés

1. Allez dans **Inbox Multicanal**
2. Cliquez sur **"Lier emails → leads"** (bouton vert)
3. Attendez le message de confirmation
4. ✅ Tous les emails non assignés sont maintenant liés !

### Pour synchroniser de nouveaux emails

1. Cliquez sur **"Synchroniser maintenant"**
2. Les nouveaux emails sont récupérés ET automatiquement liés
3. ✅ Les interactions et documents sont créés automatiquement !

### Pour créer un lead depuis un email

1. Ouvrez un email d'un expéditeur inconnu
2. Cliquez sur **"Créer le lead + lier l'historique"**
3. ✅ Le lead est créé avec tout l'historique !

---

## 📝 Migration des données existantes

La migration a automatiquement :
- ✅ Créé les interactions pour tous les emails déjà liés
- ✅ Extrait tous les documents des emails existants
- ✅ Préservé les dates originales

**Log de la migration :**
```
Migration terminée : X interactions créées, Y documents extraits
```

---

## 🎉 Résultat final

**Avant :**
- Emails dans l'inbox ✅
- Timeline vide ❌
- Aucun document ❌

**Après :**
- Emails dans l'inbox ✅
- Timeline complète ✅
- Documents extraits ✅
- Historique complet ✅

**Tout est automatique maintenant !**

---

## 📞 Support

Si un email n'est pas lié automatiquement :
1. Vérifiez que l'email du lead est correct dans `crm_leads`
2. Vérifiez que l'email de l'expéditeur est identique
3. Cliquez sur "Lier emails → leads" pour forcer la liaison
4. Ou utilisez "Créer le lead + lier l'historique" si le lead n'existe pas

---

**Date** : 16 janvier 2026
**Version** : 2.0
**Statut** : ✅ Opérationnel
