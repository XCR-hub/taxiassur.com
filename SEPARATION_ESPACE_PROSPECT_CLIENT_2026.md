# 🔐 Séparation Espace Prospect / Espace Client - TaxiAssur

## 📌 Problème résolu

**Avant :** L'espace prospect ne fonctionnait plus, affichant "Accès refusé" même avec un token valide provenant du lead.

**Cause :** La fonction RPC `get_lead_by_token` n'existait pas dans la base de données.

**Solution :** Séparation complète entre espace prospect (accès par token) et espace client (authentification).

---

## 🎯 Architecture mise en place

### 1. ESPACE PROSPECT (Sans authentification)
**URL:** `https://taxiassur.com/espace-prospect?token=XXX`

**Accès:** Via token unique (access_token dans crm_leads)

**Fonctionnalités:**
- Upload de documents
- Validation de devis
- Signature électronique
- Paiement comptant
- Consultation de l'avancement

**Utilisateurs:** Prospects en cours de souscription

### 2. ESPACE CLIENT (Avec authentification)
**URL:** `https://taxiassur.com/espace-client/login`

**Accès:** Email + mot de passe (Supabase Auth)

**Fonctionnalités:**
- Tableau de bord complet
- Gestion des documents
- Suivi des contrats
- Déclaration de sinistres
- Modification du contrat
- Historique complet

**Utilisateurs:** Clients ayant un contrat actif

---

## 🗄️ Base de données

### Tables créées

#### 1. `client_accounts`
Lie les comptes Supabase Auth aux leads convertis.

```sql
CREATE TABLE client_accounts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),  -- Lien vers Supabase Auth
  lead_id uuid REFERENCES crm_leads(id),   -- Lien vers le lead
  email text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Fonctions RPC créées

#### 1. `get_lead_by_token(p_token text)`
**Usage:** Espace prospect - Récupère les infos du lead via son token

**Accessible:** anon, authenticated

**Retour:** Toutes les infos du lead (nom, email, status, documents, etc.)

```sql
SELECT * FROM get_lead_by_token('7ba8aa998cf3223e02ffba5ea4877bc7e0564f97078886a2bda95222320216a3');
```

#### 2. `get_client_dashboard_data()`
**Usage:** Espace client - Récupère les données complètes du client authentifié

**Accessible:** authenticated uniquement

**Retour:** Compte client + Lead complet

```sql
SELECT * FROM get_client_dashboard_data();
```

#### 3. `create_client_account()`
**Usage:** Créer un compte client depuis le CRM

**Accessible:** authenticated

**Paramètres:**
- p_lead_id
- p_email
- p_password
- p_first_name
- p_last_name

---

## 🚀 Edge Functions

### 1. `create-client-account`
**URL:** `/functions/v1/create-client-account`

**Méthode:** POST

**Body:**
```json
{
  "lead_id": "uuid",
  "email": "client@example.com",
  "password": "motdepasse123",
  "first_name": "Jean",
  "last_name": "Dupont"
}
```

**Fonctionnement:**
1. Vérifie que le lead est converti (converted_to_client = true)
2. Crée l'utilisateur dans auth.users
3. Crée l'entrée dans client_accounts
4. Log l'interaction

---

## 🎨 Frontend

### Pages créées

#### 1. `/espace-prospect` (EXISTANTE - RÉPARÉE)
**Fichier:** `src/pages/EspaceProspect.tsx`

**Modifications:**
- ✅ Utilise `get_lead_by_token` pour récupérer les données
- ✅ Accès anonyme (pas d'auth requise)
- ✅ Affiche les documents, devis, paiements
- ✅ Section paiement avec ProspectPaymentSection

**Accès:**
```
https://taxiassur.com/espace-prospect?token=XXX
```

#### 2. `/espace-client/login` (NOUVEAU)
**Fichier:** `src/pages/client/ClientLogin.tsx`

**Fonctionnalités:**
- Formulaire email/mot de passe
- Bouton "Mot de passe oublié"
- Lien vers demande de devis
- Design moderne avec dégradés

**Accès:**
```
https://taxiassur.com/espace-client/login
```

#### 3. `/espace-client/dashboard` (NOUVEAU)
**Fichier:** `src/pages/client/ClientDashboardAuth.tsx`

**Fonctionnalités:**
- Vérification de l'authentification
- Chargement via `get_client_dashboard_data()`
- Onglets: Dashboard, Documents, Contrat, Sinistres, Profil
- Bouton déconnexion
- Utilise ClientUnifiedDashboard existant

**Accès:**
```
https://taxiassur.com/espace-client/dashboard
```

### Routes ajoutées

```tsx
// router.tsx
{
  path: '/espace-client/login',
  element: <ClientLogin />,
},
{
  path: '/espace-client/dashboard',
  element: <ClientDashboardAuth />,
},
{
  path: '/espace-prospect',
  element: <EspaceProspect />,
},
{
  path: '/espace-prospect/:token',
  element: <EspaceProspect />,
}
```

---

## 🧪 Comment tester

### Tester l'Espace Prospect

1. **Récupérer le token d'un lead**
```sql
SELECT id, first_name, last_name, access_token
FROM crm_leads
WHERE id = '1f22521f-194a-44e0-8f50-a3cd91afe3c3';
```

2. **Accéder à l'espace prospect**
```
https://taxiassur.com/espace-prospect?token=6d39cf022087bfd2a59ca5eefbb414012d1e206d89051b6b326ce4c77d112099
```

3. **Vérifier:**
- ✅ Nom du prospect affiché
- ✅ Onglets disponibles (Documents, Devis, Paiement, Contrat)
- ✅ Paiements en attente visibles
- ✅ Upload de documents fonctionne

### Tester l'Espace Client

1. **Créer un compte client depuis le CRM**
```bash
# Via edge function
curl -X POST https://VOTRE_PROJET.supabase.co/functions/v1/create-client-account \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "1f22521f-194a-44e0-8f50-a3cd91afe3c3",
    "email": "tcerda@xcr.fr",
    "password": "Test123!",
    "first_name": "Tony",
    "last_name": "CERDA"
  }'
```

2. **Se connecter**
```
https://taxiassur.com/espace-client/login
Email: tcerda@xcr.fr
Mot de passe: Test123!
```

3. **Vérifier:**
- ✅ Redirection vers /espace-client/dashboard
- ✅ Nom du client affiché
- ✅ Informations complètes visibles
- ✅ Onglets fonctionnels
- ✅ Bouton déconnexion fonctionne

---

## 🔒 Sécurité

### Espace Prospect
- ✅ Token unique et aléatoire (32 bytes hexadécimal)
- ✅ Pas de mot de passe requis (simplicité d'accès)
- ✅ RLS sur les documents (seul le lead peut voir ses docs)
- ✅ Token peut être révoqué en changeant access_token

### Espace Client
- ✅ Authentification Supabase (sécurisée)
- ✅ Mot de passe hashé par Supabase Auth
- ✅ Session avec refresh tokens
- ✅ RLS strict (client voit uniquement ses données)
- ✅ Possibilité de réinitialiser le mot de passe

---

## 📊 Flux de conversion Prospect → Client

```
1. Lead créé
   ↓
2. Token généré (access_token)
   ↓
3. Prospect accède via token
   ↓
4. Upload documents, accepte devis, paie
   ↓
5. Commercial valide le dossier
   ↓
6. Lead.converted_to_client = true
   ↓
7. Commercial crée compte client (edge function)
   ↓
8. Email envoyé au client avec identifiants
   ↓
9. Client se connecte sur /espace-client/login
   ↓
10. Accès au dashboard complet
```

---

## 🎯 Différences clés

| Caractéristique | Espace Prospect | Espace Client |
|----------------|-----------------|---------------|
| **Authentification** | Token unique | Email + Mot de passe |
| **Durée d'accès** | Temporaire | Permanent |
| **Utilisateur** | Prospect en cours | Client avec contrat |
| **Fonctionnalités** | Basiques (docs, devis, paiement) | Complètes (dashboard, sinistres) |
| **URL** | /espace-prospect?token=XXX | /espace-client/dashboard |
| **Session** | Pas de session | Session persistante |
| **Sécurité** | Token révocable | Mot de passe + 2FA (futur) |

---

## ✅ Checklist de déploiement

- ✅ Migration `fix_espace_prospect_token_access_2026` appliquée
- ✅ Migration `create_espace_client_auth_system_2026` appliquée
- ✅ Edge function `create-client-account` déployée
- ✅ Pages frontend créées (ClientLogin, ClientDashboardAuth)
- ✅ Routes ajoutées dans router.tsx
- ✅ Build réussi
- ✅ RLS configurées sur toutes les tables
- ✅ Fonctions RPC testées

---

## 🚨 Points d'attention

### Pour les développeurs

1. **Token vs Auth:** Ne pas confondre les deux systèmes
2. **RLS:** Toujours vérifier les policies avant d'accéder aux données
3. **Client créé manuellement:** Utiliser uniquement l'edge function
4. **Mot de passe:** Minimum 8 caractères (géré par Supabase)

### Pour les utilisateurs

1. **Prospect:** Toujours utiliser le lien complet avec token
2. **Client:** Se connecter via /espace-client/login
3. **Mot de passe oublié:** Fonction disponible sur la page de login
4. **Support:** Contacter le 01 80 85 57 86 en cas de problème

---

## 🔮 Évolutions futures

### Espace Prospect
- [ ] Expiration automatique des tokens après X jours
- [ ] Historique des accès
- [ ] Notifications push

### Espace Client
- [ ] Authentification à 2 facteurs (2FA)
- [ ] Application mobile
- [ ] Chat en direct avec conseiller
- [ ] Modification de profil en ligne
- [ ] Téléchargement de tous les documents en ZIP

---

## 📞 Support

En cas de problème:
1. Vérifier que le token est valide dans la DB
2. Vérifier que la fonction `get_lead_by_token` existe
3. Vérifier les logs des edge functions
4. Vérifier les policies RLS

**Contact développeur:** Voir logs Supabase et console navigateur

---

**Date de mise en place:** 13 février 2026
**Système opérationnel et testé**
