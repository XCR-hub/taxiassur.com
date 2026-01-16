# Liaison Automatique de l'Historique des Emails

## 🎯 Problème résolu

Quand un client envoie un email directement (sans passer par le formulaire web), le lead n'existe pas encore dans le CRM. Lorsqu'on crée manuellement le lead depuis cet email, on perdait tout l'historique de la conversation antérieure.

**Désormais, quand vous créez un lead depuis un email, TOUT l'historique des emails de ce client est automatiquement lié au nouveau lead !**

---

## ✨ Fonctionnalités

### 1. **Création de lead avec historique complet**

Quand vous ouvrez un email d'un expéditeur inconnu dans l'Inbox Multicanal :

1. Le système détecte qu'aucun lead n'existe pour cet email
2. Un bouton **"Créer le lead + lier l'historique"** apparaît
3. Au clic :
   - ✅ Le lead est créé avec les infos extraites de l'email
   - ✅ **TOUS les emails antérieurs** de ce même expéditeur sont recherchés
   - ✅ Tous ces emails sont liés au nouveau lead
   - ✅ Les interactions correspondantes sont créées dans le CRM
   - ✅ Vous voyez immédiatement le nombre d'emails et d'interactions liés

**Résultat** : Vous avez instantanément toute la conversation depuis le début dans le CRM !

---

### 2. **Re-synchronisation de l'historique pour leads existants**

Si un lead existe déjà mais que des emails ne sont pas liés (par exemple, s'il a écrit avant la création du lead) :

1. Ouvrez un email de ce client
2. Le système détecte le lead existant
3. Deux boutons apparaissent :
   - **"Voir le lead"** : Ouvre la fiche du lead
   - **"Sync historique"** : Re-synchronise tous les emails de cet expéditeur

Le bouton "Sync historique" permet de :
- ✅ Rechercher tous les emails du même expéditeur
- ✅ Les lier au lead existant
- ✅ Créer uniquement les interactions manquantes (évite les doublons)

---

## 🔄 Comment ça marche techniquement

### Fonction `linkEmailHistoryToLead()`

Cette fonction intelligente :

1. **Recherche** tous les emails de l'expéditeur (même adresse email)
2. **Lie** tous ces emails au lead (mise à jour de `lead_id`)
3. **Crée** les interactions CRM correspondantes
4. **Évite les doublons** : vérifie les interactions existantes avant d'en créer de nouvelles
5. **Retourne** le nombre d'emails liés et d'interactions créées

```typescript
const { linkedCount, interactionsCreated } = await linkEmailHistoryToLead(
  leadId,
  senderEmail
);
```

---

## 📋 Cas d'usage

### Cas 1 : Premier contact par email

**Situation** : Un prospect vous écrit directement à team@taxiassur.com

1. L'email arrive dans l'Inbox Multicanal
2. Vous cliquez dessus → Le système indique "Aucun lead trouvé"
3. Vous cliquez sur **"Créer le lead + lier l'historique"**
4. 🎉 Le lead est créé avec TOUT l'historique (même les emails précédents)

**Avantage** : Vous voyez immédiatement si c'est la première fois qu'il écrit ou s'il a déjà contacté plusieurs fois.

---

### Cas 2 : Lead créé plus tard

**Situation** : Un client vous a écrit 3 fois en janvier, mais vous avez créé son lead seulement en février après un appel téléphonique

1. Allez dans l'Inbox Multicanal
2. Ouvrez un des emails du client
3. Le système trouve le lead existant
4. Cliquez sur **"Sync historique"**
5. 🎉 Les 3 emails de janvier sont maintenant liés au lead !

**Avantage** : Vous récupérez rétroactivement tout l'historique même si le lead a été créé après les premiers échanges.

---

### Cas 3 : Plusieurs adresses email du même client

**Situation** : Un client vous a écrit avec `contact@taxiparis.com` puis avec `contact@societeparis.com`

**Important** : Le système lie l'historique par **adresse email exacte**. Si le client utilise plusieurs adresses :

1. Créez le lead depuis le premier email
2. Quand vous recevez un email de la deuxième adresse, ouvrez-le
3. Cliquez sur "Sync historique" pour lier les emails de cette adresse aussi
4. Vous pouvez aussi **fusionner les adresses** dans la fiche du lead pour regrouper tout l'historique

---

## 🎨 Interface utilisateur

### Dans la vue email (Inbox Multicanal)

#### Si le lead n'existe pas :

```
┌────────────────────────────────────────────┐
│  [← Retour]         [Créer le lead +       │
│                      lier l'historique] 🔵  │
└────────────────────────────────────────────┘
```

#### Si le lead existe :

```
┌─────────────────────────────────────────────────┐
│  [← Retour]  [Voir le lead] 🟢  [Sync          │
│                                 historique] 🔵   │
└─────────────────────────────────────────────────┘
```

---

## 💬 Messages de confirmation

### Lors de la création d'un lead :

```
✅ Lead créé avec succès !

👤 Jean Dupont
📧 5 email(s) lié(s) automatiquement
💬 5 interaction(s) créée(s)

Tout l'historique de cette conversation est maintenant dans le CRM !
```

### Lors de la synchronisation de l'historique :

```
✅ Historique synchronisé !

📧 8 email(s) lié(s)
💬 3 nouvelle(s) interaction(s)
```

---

## 🔍 Avantages

### 1. **Gain de temps**
Plus besoin de chercher manuellement les anciens emails ou de copier-coller l'historique dans les notes.

### 2. **Contexte complet**
Vous voyez immédiatement toute la conversation depuis le premier contact.

### 3. **Aucune perte d'information**
Même si le client a écrit 10 fois avant que vous créiez son lead, tout est récupéré automatiquement.

### 4. **Interactions CRM à jour**
Toutes les interactions sont créées automatiquement dans le CRM avec les bonnes dates.

### 5. **Évite les doublons**
Le système vérifie les interactions existantes et ne crée que les nouvelles.

---

## 🎯 Workflow complet

### Scénario : Client inconnu qui vous écrit

1. **Email arrive** → Apparaît dans l'Inbox Multicanal
2. **Vous ouvrez** → Système détecte : "Pas de lead trouvé"
3. **Vous cliquez** "Créer le lead + lier l'historique"
4. **Système crée** :
   - Le lead dans `crm_leads`
   - Lie tous les emails de cet expéditeur
   - Crée toutes les interactions
5. **Vous voyez** :
   - Confirmation avec le nombre d'emails/interactions
   - Bouton "Voir le lead" pour accéder directement à la fiche
6. **Dans le CRM** :
   - Timeline complète avec tous les emails
   - Vous pouvez répondre directement
   - Vous voyez toute l'historique de la conversation

---

## 🛠️ Détails techniques

### Tables concernées

- **`email_messages`** : Stocke tous les emails
  - Champ `lead_id` : ID du lead lié (NULL si pas encore lié)
  - Champ `from_email` : Adresse de l'expéditeur (clé de recherche)

- **`crm_leads`** : Stocke les leads
  - Création avec `source: 'email'` quand créé depuis un email

- **`crm_interactions`** : Stocke toutes les interactions
  - Type `email` avec le contenu et les métadonnées
  - Lien vers `email_messages` via `metadata.email_id`

### Logique d'évitement des doublons

```typescript
// Récupère les interactions existantes
const existingInteractions = await supabase
  .from('crm_interactions')
  .select('metadata')
  .eq('lead_id', leadId);

// Extrait les email_id déjà présents
const existingEmailIds = new Set(
  existingInteractions.map(i => i.metadata?.email_id).filter(Boolean)
);

// Ne crée que les nouvelles interactions
const newInteractions = interactions.filter(
  i => !existingEmailIds.has(i.metadata.email_id)
);
```

---

## 📝 Notes importantes

1. **La recherche se fait par adresse email exacte** : Si un client utilise plusieurs adresses, il faut lier chaque adresse séparément.

2. **Les emails envoyés PAR vous** sont aussi liés : Toute la conversation (inbound + outbound) est récupérée.

3. **Les pièces jointes sont conservées** : Les attachments des emails sont préservés dans `email_messages.attachments`.

4. **Ordre chronologique respecté** : Les interactions sont créées avec la bonne date (`created_at = email.received_at`).

5. **Performance** : La recherche se fait en une seule requête SQL, puis les mises à jour en parallèle pour maximiser la vitesse.

---

## 🚀 Prochaines évolutions possibles

- [ ] Fusion automatique de leads avec plusieurs adresses email
- [ ] Détection des alias email (jean.dupont@... et j.dupont@...)
- [ ] Suggestion de fusion quand deux leads ont des noms similaires
- [ ] Export de l'historique complet en PDF
- [ ] Recherche d'historique par domaine (tous les emails @taxiparis.com)

---

## 📞 Support

Si vous rencontrez un problème :
1. Vérifiez que l'email a bien un `from_email` valide
2. Vérifiez que le lead a bien un email renseigné
3. Consultez les logs dans la console du navigateur
4. Contactez le support technique

---

**Date de création** : 16 janvier 2026
**Version** : 1.0
**Auteur** : Système TaxiAssur CRM
