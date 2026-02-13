# Distinction Espace Prospect vs Espace Client

## Contexte

Il existe **deux espaces distincts** avec des objectifs et des accès différents :

1. **Espace Prospect** - Phase commerciale (Lead)
2. **Espace Client** - Phase post-vente (Client actif)

## 1. Espace Prospect (Lead)

### Objectif
Espace temporaire utilisé pendant la phase commerciale jusqu'à la finalisation du contrat.

### Caractéristiques
- **URL** : `/espace-prospect/{access_token}`
- **Authentification** : Via token d'accès unique (64 caractères hexadécimaux)
- **Durée de vie** : Du premier contact jusqu'à la signature du contrat
- **Statut du lead** : Toutes les étapes du pipeline commercial (1 à 7)
- **Génération du token** : Automatique lors de la création du lead (trigger SQL)

### Fonctionnalités
- Upload de documents par le prospect
- Consultation des devis des compagnies
- Validation ou refus des devis
- Signature électronique du devis choisi
- Upload du RIB
- Paiement comptant si nécessaire

### Accès depuis le CRM
Dans la fiche détaillée d'un lead (`CRMLeadDetail.tsx` et `LeadCompanyQuotes.tsx`) :

**Boutons disponibles** :
- "Copier lien espace prospect" : Copie l'URL avec le token
- "Envoyer accès espace prospect" : Envoie un email avec le lien d'accès

**Code exemple** :
```typescript
// URL générée
const link = `${window.location.origin}/espace-prospect/${lead.access_token}`;

// Envoi d'email
await supabase.functions.invoke('send-email-universal', {
  body: {
    to: lead.email,
    subject: 'Accès à votre espace prospect TaxiAssur',
    template: 'prospect_access',
    variables: {
      first_name: lead.first_name,
      access_link: link
    }
  }
});
```

## 2. Espace Client (Post-vente)

### Objectif
Espace permanent pour les clients ayant finalisé leur contrat.

### Caractéristiques
- **URL** : `/espace-client`
- **Authentification** : Via Supabase Auth (email/password)
- **Durée de vie** : Permanent (tant que le client est actif)
- **Statut** : `CLIENT_ACTIF` dans la table `crm_clients`
- **Compte utilisateur** : Créé dans `auth.users`

### Fonctionnalités
- Gestion du contrat d'assurance
- Consultation des documents
- Déclaration de sinistres
- Modification des informations
- Renouvellement du contrat
- Historique des paiements

### Accès depuis le CRM
Dans la page "Gestion des Clients" (`ClientsManager.tsx`) :

**Boutons disponibles** :
- "Envoyer accès espace client" : Envoie les identifiants de connexion
- Accès à la fiche complète du client

## 3. Transition Prospect → Client

### Moment de la transition
Quand le prospect passe de l'étape 7 "Contrat Final" à "Client Actif"

### Processus automatique
1. Le lead atteint le statut `CLIENT_ACTIF`
2. Un compte utilisateur Supabase est créé (via `auth.signup`)
3. Le prospect est migré vers la table `crm_clients`
4. L'espace prospect devient inaccessible
5. L'espace client est activé avec les nouveaux identifiants

### Migration des données
- Documents → Copiés dans l'espace client
- Contrat → Lié au compte client
- Historique → Conservé pour traçabilité

## 4. Base de données

### Table crm_leads (Prospects)
```sql
- id (uuid)
- email (text)
- prenom (text)
- nom (text)
- telephone (text)
- access_token (text) -- TOKEN UNIQUE 64 caractères
- pipeline_stage (enum) -- Étapes 1 à 7
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Trigger automatique** :
```sql
CREATE TRIGGER trg_crm_leads_access_token
  BEFORE INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION generate_crm_lead_access_token();
```

### Table crm_clients (Clients actifs)
```sql
- id (uuid)
- user_id (uuid) -- Référence auth.users
- lead_id (uuid) -- Lien avec le lead d'origine
- email (text)
- prenom (text)
- nom (text)
- telephone (text)
- contract_number (text)
- status (text) -- CLIENT_ACTIF, SUSPENDU, etc.
- created_at (timestamptz)
```

## 5. Sécurité

### Espace Prospect
- **RLS activé** : Accès uniquement via `access_token` valide
- **Pas d'authentification** : Token suffit (lien sécurisé)
- **Durée limitée** : Token valide jusqu'à activation client
- **Permissions** : Lecture/écriture limitée aux données du prospect

```sql
CREATE POLICY "Prospects can access via token"
  ON prospect_documents
  FOR SELECT
  TO anon, authenticated
  USING (
    lead_id IN (
      SELECT id FROM crm_leads 
      WHERE access_token = current_setting('request.jwt.claims', true)::json->>'access_token'
    )
  );
```

### Espace Client
- **RLS activé** : Accès uniquement aux données du client connecté
- **Authentification requise** : Login/password via Supabase Auth
- **Session sécurisée** : JWT tokens avec expiration
- **Permissions** : Accès complet aux données personnelles

```sql
CREATE POLICY "Clients can access own data"
  ON crm_clients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

## 6. Corrections appliquées

### Fichiers modifiés
1. `src/backoffice/CRMLeadDetail.tsx`
   - Renommé `copyClientSpaceLink` → `copyProspectSpaceLink`
   - Renommé `sendClientSpaceEmail` → `sendProspectSpaceEmail`
   - Changé tous les textes : "espace client" → "espace prospect"

2. `src/backoffice/LeadCompanyQuotes.tsx`
   - Renommé `copyClientSpaceLink` → `copyProspectSpaceLink`
   - Renommé `sendClientAccessEmail` → `sendProspectAccessEmail`
   - Changé tous les textes : "espace client" → "espace prospect"

### Impact
- ✅ Clarté pour les utilisateurs du CRM
- ✅ Cohérence terminologique dans tout le système
- ✅ Évite la confusion entre les deux espaces
- ✅ Sécurité renforcée (bons tokens, bonnes URLs)

## 7. Workflow complet

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE PROSPECT (Lead) - Pipeline Commercial                │
│                                                               │
│  1. Nouveau Lead                                             │
│     ↓ Token généré automatiquement                          │
│  2. Collecte Documents                                       │
│     ↓ Via /espace-prospect/{token}                          │
│  3. Saisie Devis                                            │
│  4. Validation Devis                                         │
│  5. Signature Devis                                          │
│  6. Paiement RIB                                            │
│  7. Contrat Final                                           │
│     ↓ Transition automatique                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE CLIENT - Gestion Post-vente                          │
│                                                               │
│  • Compte Supabase créé                                      │
│  • Login/password envoyé                                     │
│  • Accès via /espace-client                                  │
│  • Gestion contrat permanent                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 8. À faire (pour l'activation Client)

Pour activer la transition automatique Prospect → Client :

1. Créer une edge function `activate-client` :
   ```typescript
   - Créer le compte Supabase auth
   - Générer un mot de passe temporaire
   - Migrer les données vers crm_clients
   - Envoyer l'email avec les identifiants
   - Désactiver l'access_token du prospect
   ```

2. Ajouter un trigger sur `crm_leads` :
   ```sql
   WHEN pipeline_stage = 'production' 
   AND status = 'CLIENT_ACTIF'
   THEN CALL activate_client(lead_id)
   ```

3. Créer la page `/espace-client` avec :
   - Formulaire de connexion Supabase
   - Dashboard client
   - Gestion du contrat
   - Documents
   - Sinistres

---

**Date de création** : 13/02/2026  
**Build validé** : ✅ Compilation réussie  
**Tests** : À effectuer après déploiement
