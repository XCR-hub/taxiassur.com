# Système de Gestion de Leads Multi-Véhicules - 25 Février 2026

## Vue d'ensemble

Un prospect qui souhaite assurer plusieurs véhicules (2 taxis, taxi + VTC, etc.) peut désormais créer plusieurs dossiers avec le même email. Le système détecte l'email existant et propose un choix intelligent.

---

## Fonctionnalités implémentées

### 1. Détection automatique d'email existant

Lorsqu'un prospect remplit le formulaire avec un email déjà connu :
- Le système vérifie automatiquement si l'email existe
- Un modal s'affiche AVANT la soumission
- Aucun lead n'est créé tant que le prospect n'a pas fait son choix

### 2. Modal de choix intelligent

Le modal affiche :
- Les informations du dossier existant (nom, ville, date de création)
- 2 options claires :
  - **Option 1 :** Accéder au dossier existant (renvoyer les accès)
  - **Option 2 :** Créer un nouveau dossier (pour véhicule supplémentaire)

### 3. Option 1 : Renvoyer les accès

Si le prospect choisit d'accéder à son dossier existant :
- Aucun nouveau lead créé
- 1 email envoyé au prospect avec le lien d'accès à son espace
- Le système propose de revenir pour créer un 2ème dossier si nécessaire

### 4. Option 2 : Créer un nouveau dossier

Si le prospect choisit de créer un nouveau dossier :
- Un NOUVEAU lead est créé (même si l'email existe)
- Le lead est marqué comme "Véhicule #2" (ou #3, #4, etc.)
- Les métadonnées incluent `vehicle_number` pour le suivi
- 2 emails envoyés :
  - **Équipe :** "🚗 VÉHICULE #2 LEAD: [Nom] (Client existant)"
  - **Prospect :** "Nouveau dossier TaxiAssur créé - Véhicule #2"

---

## Architecture technique

### Base de données (Supabase)

#### Fonction `check_existing_email(p_email text)`
```sql
RETURNS TABLE(
  email_exists boolean,
  lead_id uuid,
  first_name text,
  last_name text,
  phone text,
  city text,
  vehicle_count int,
  created_at timestamptz
)
```
- Vérifie si un email existe dans `crm_leads`
- Compte le nombre de véhicules existants
- Retourne les informations du premier lead trouvé

#### Fonction `resend_lead_access(p_email text)`
```sql
RETURNS TABLE(
  lead_id uuid,
  access_token text,
  success boolean
)
```
- Récupère le token d'accès du lead existant
- Ajoute un email à la queue pour renvoyer les accès
- Email : "🔑 Vos accès TaxiAssur - Dossier existant"

#### Fonction `upsert_lead(..., p_force_new_lead boolean DEFAULT false)`
- **Nouveau paramètre :** `p_force_new_lead`
- Si `false` (défaut) : Comportement classique (mise à jour si existe)
- Si `true` : Force la création d'un nouveau lead même si l'email existe
- Ajoute `vehicle_number` dans les métadonnées
- Emails adaptés selon le contexte

### Frontend (React + TypeScript)

#### Composant `ExistingLeadChoiceModal`
- Fichier : `src/components/ExistingLeadChoiceModal.tsx`
- Modal moderne avec 2 boutons d'action
- Affiche les infos du lead existant
- Design responsive et accessible

#### Composant `FormLead` (modifié)
- Fichier : `src/components/FormLead.tsx`
- Vérifie l'email AVANT soumission via `checkExistingEmail()`
- Affiche le modal si email existe
- Gère les 2 choix du prospect
- Passe `forceNew: true` à `createLead()` si demandé

#### Lib `leads.ts` (modifié)
- Fichier : `src/lib/leads.ts`
- **Nouvelle fonction :** `checkExistingEmail(email: string)`
- **Nouvelle fonction :** `resendAccess(email: string)`
- **Modifié :** `createLead(input, forceNew = false)`
- Passe `p_force_new_lead` à la RPC `upsert_lead`

---

## Flux utilisateur complet

### Cas 1 : Email nouveau (premier dossier)
```
1. Prospect remplit le formulaire
2. Clic sur "Demander mon devis"
3. Vérification email → N'existe pas
4. Création du lead
5. Redirection vers /merci?token=XXX
6. 2 emails envoyés (équipe + prospect)
```

### Cas 2 : Email existant → Accéder au dossier
```
1. Prospect remplit le formulaire avec email existant
2. Clic sur "Demander mon devis"
3. Vérification email → Existe !
4. Affichage du modal avec les infos du dossier
5. Prospect choisit "Accéder à mon dossier existant"
6. 1 email envoyé au prospect avec le lien d'accès
7. Message de confirmation affiché
8. Formulaire réinitialisé
```

### Cas 3 : Email existant → Créer nouveau dossier
```
1. Prospect remplit le formulaire avec email existant
2. Clic sur "Demander mon devis"
3. Vérification email → Existe !
4. Affichage du modal avec les infos
5. Prospect choisit "Créer un nouveau dossier"
6. Création d'un NOUVEAU lead avec p_force_new_lead=true
7. Redirection vers /merci?token=YYY (nouveau token)
8. 2 emails envoyés :
   - Équipe : "VÉHICULE #2 LEAD: [Nom] (Client existant)"
   - Prospect : "Nouveau dossier créé - Véhicule #2"
```

---

## Exemples d'emails

### Email prospect : Accès dossier existant
```
Sujet : 🔑 Vos accès TaxiAssur - Dossier existant

Bonjour [Nom],

Vous avez déjà un dossier chez TaxiAssur.

Voici votre lien d'accès à votre espace prospect sécurisé :

[Bouton: Accéder à mon espace]

💡 Vous souhaitez assurer un 2ème véhicule ?
Retournez sur notre site et remplissez à nouveau le formulaire.
Nous créerons un nouveau dossier pour votre 2ème véhicule.

L'équipe TaxiAssur
```

### Email équipe : Véhicule supplémentaire
```
Sujet : 🚗 VÉHICULE #2 LEAD: Jean Dupont - Paris (Client existant)

Véhicule #2 (même client)

Nom: Jean Dupont
Email: jean@email.com
Téléphone: 06 12 34 56 78
Ville: Paris
Véhicule supplémentaire ajouté le: 25/02/2026 à 14:30

⚠️ Client existant : Ce client a déjà 1 dossier(s).
Il souhaite assurer un véhicule supplémentaire.

[Bouton: Voir le lead]
```

### Email prospect : Nouveau véhicule
```
Sujet : ✅ Nouveau dossier TaxiAssur créé - Véhicule #2

Bonjour Jean,

🚗 Véhicule #2 : Nous créons un nouveau dossier
pour votre véhicule supplémentaire.

✅ Nous avons bien reçu votre demande de devis
pour une assurance taxi à Paris.

⚡ Votre expert vous contactera dans les 15 minutes
au 06 12 34 56 78

[Bouton: Accéder à mon espace]

(Liste des 7 documents requis)

L'équipe TaxiAssur
```

---

## Avantages du système

### Pour le prospect
- ✅ Pas de confusion : choix clair entre accéder ou créer
- ✅ Gain de temps : peut retrouver son dossier existant facilement
- ✅ Flexibilité : peut assurer autant de véhicules qu'il veut
- ✅ Expérience fluide : tout est automatique

### Pour l'équipe
- ✅ Notification claire : "VÉHICULE #2" visible immédiatement
- ✅ Contexte : sait que c'est un client existant
- ✅ Suivi amélioré : compteur de véhicules dans les métadonnées
- ✅ Moins d'erreurs : pas de doublons involontaires

### Pour le business
- ✅ Upsell facilité : encourager plusieurs véhicules
- ✅ Rétention : clients qui reviennent pour d'autres besoins
- ✅ Données propres : chaque véhicule = 1 dossier
- ✅ Analytics : peut compter les clients multi-véhicules

---

## Tests recommandés

### Test 1 : Email nouveau
```
Email : test-nouveau-25fev-1@example.com
Résultat attendu : Lead créé directement, pas de modal
```

### Test 2 : Email existant → Accès
```
Email : abdammarie@gmail.com (existe déjà)
Action : Choisir "Accéder à mon dossier existant"
Résultat attendu : 1 email reçu avec lien d'accès
```

### Test 3 : Email existant → Nouveau
```
Email : abdammarie@gmail.com (existe déjà)
Action : Choisir "Créer un nouveau dossier"
Résultat attendu : 
- Nouveau lead créé dans crm_leads
- 2 emails reçus (équipe + prospect)
- Email équipe mentionne "VÉHICULE #2"
```

### Test 4 : 3ème véhicule
```
Email : abdammarie@gmail.com (existe 2 fois déjà)
Action : Créer un nouveau dossier
Résultat attendu : Email équipe mentionne "VÉHICULE #3"
```

---

## Maintenance et évolution

### Requêtes SQL utiles

**Compter les clients multi-véhicules :**
```sql
SELECT 
  email,
  COUNT(*) as nb_vehicules,
  STRING_AGG(id::text, ', ') as lead_ids
FROM crm_leads
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY nb_vehicules DESC;
```

**Voir les véhicules d'un client :**
```sql
SELECT 
  id,
  first_name,
  city,
  metadata->>'vehicle_number' as vehicle_number,
  created_at
FROM crm_leads
WHERE email = 'abdammarie@gmail.com'
ORDER BY created_at;
```

### Évolutions possibles

1. **Dashboard multi-véhicules :**
   - Vue dédiée pour les clients avec plusieurs véhicules
   - Comparaison des devis entre véhicules
   - Gestion groupée des documents

2. **Réduction multi-véhicules :**
   - Détection automatique de plusieurs véhicules
   - Application d'une réduction sur le 2ème/3ème véhicule
   - Badge "Client fidèle" dans le CRM

3. **Import en masse :**
   - Formulaire dédié pour flottes
   - Upload CSV de plusieurs véhicules d'un coup
   - Un dossier par véhicule créé automatiquement

4. **Notifications intelligentes :**
   - Rappel si 1 véhicule assuré mais pas l'autre
   - Suggestion de compléter la flotte
   - Offres spéciales multi-véhicules

---

## Fichiers modifiés

- ✅ `supabase/migrations/20260225XXXXXX_create_check_existing_email_function_25fev2026.sql`
- ✅ `src/components/ExistingLeadChoiceModal.tsx` (NOUVEAU)
- ✅ `src/components/FormLead.tsx` (MODIFIÉ)
- ✅ `src/lib/leads.ts` (MODIFIÉ)
- ✅ Fonction DB `upsert_lead()` (MODIFIÉE : +1 paramètre)

---

## Compatibilité

- ✅ 100% rétrocompatible : ancien comportement préservé si `force_new = false`
- ✅ Pas d'impact sur les leads existants
- ✅ Tous les builds passent
- ✅ TypeScript sans erreur

---

## Documentation utilisateur

### Pour les prospects (FAQ à ajouter)

**Q : J'ai déjà un dossier, puis-je assurer un 2ème véhicule ?**
R : Oui ! Remplissez à nouveau le formulaire avec le même email.
Nous vous proposerons de créer un nouveau dossier pour votre 2ème véhicule.

**Q : Puis-je assurer un taxi ET un VTC ?**
R : Absolument ! Chaque véhicule aura son propre dossier et devis personnalisé.

**Q : J'ai oublié mon lien d'accès, comment le retrouver ?**
R : Remplissez le formulaire avec votre email et choisissez
"Accéder à mon dossier existant". Vous recevrez votre lien par email.

---

**Date de création :** 25 Février 2026  
**Auteur :** Système TaxiAssur
**Version :** 1.0
**Status :** ✅ Production Ready
