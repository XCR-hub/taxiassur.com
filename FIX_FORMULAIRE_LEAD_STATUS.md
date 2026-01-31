# CORRECTION CRITIQUE - Formulaire de Devis

## Problème Identifié

Quand un prospect remplit le formulaire sur le site web (demande de devis), **le lead n'apparaît PAS dans le pipeline Kanban**.

### Exemple Concret

Prospect : **YAHIAOUI FETHALLAH**
- Email : sarladeivtc@gmail.com
- Téléphone : 0755461073
- Ville : Bordeaux
- Immatriculation : AA-642-FA
- Date : 30/01/2026 18:15:44

➡️ **Résultat** : Lead créé dans la base ✓ mais invisible dans le pipeline ✗

## Cause Racine

Le fichier `/src/lib/email.ts` (ligne 49) utilisait le mauvais statut :

```typescript
// ❌ AVANT (Ancien système anglais)
status: 'NEW_LEAD'

// ✅ APRÈS (Nouveau système français)
status: 'NOUVEAU_LEAD'
```

Le pipeline Kanban affiche uniquement les statuts du nouveau système français :
- `NOUVEAU_LEAD` ✓ (visible)
- `COLLECTE_DOCUMENTS` ✓
- `DEVIS` ✓
- etc.

Le statut `NEW_LEAD` (ancien système) n'est **pas affiché** dans le pipeline.

## Impact

**TOUS les leads** créés depuis le formulaire web depuis la migration vers le nouveau système étaient **invisibles** dans le pipeline.

Ils existaient dans la base de données mais n'apparaissaient nulle part dans l'interface.

## Solution Appliquée

### 1. Correction du Code (✅ FAIT)

**Fichier** : `/src/lib/email.ts` ligne 49

**Changement** :
```typescript
status: 'NOUVEAU_LEAD', // ✅ Utilise le nouveau système français
```

**Build** : ✅ Compilé dans `/dist`

### 2. Bouton de Synchronisation (✅ AJOUTÉ)

Un bouton **"Sync Emails"** a été ajouté dans le Pipeline Kanban pour synchroniser manuellement :
- Force la récupération des emails IONOS
- Crée automatiquement les leads manquants
- Rafraîchit le pipeline

## Tests de Validation

### Test 1 : Nouveau Lead via Formulaire

1. Videz le cache navigateur : `Ctrl + Shift + Suppr`
2. Allez sur la page d'accueil du site
3. Remplissez le formulaire de demande de devis avec des informations test
4. Cliquez sur "Envoyer"
5. Allez dans **Pipeline Kanban** (backoffice)
6. **RÉSULTAT ATTENDU** : Le lead apparaît dans la colonne "Nouveau Lead" ✓

### Test 2 : Lead YAHIAOUI FETHALLAH

Le lead qui a été créé le 30/01/2026 à 18:15:44 doit maintenant être **re-créé** avec le bon statut.

**Options** :

#### Option A : Re-soumettre le Formulaire
Le prospect remplit à nouveau le formulaire (s'il accepte).

#### Option B : Création Manuelle
1. Dans le backoffice, cliquez sur **"Nouveau Lead"**
2. Entrez les informations :
   - Nom : YAHIAOUI
   - Prénom : FETHALLAH
   - Email : sarladeivtc@gmail.com
   - Téléphone : 0755461073
   - Ville : Bordeaux
   - Immatriculation : AA-642-FA
3. Statut sera automatiquement `NOUVEAU_LEAD`
4. Cliquez sur "Créer"

#### Option C : Correction SQL (AVANCÉ)

Si vous voulez corriger le lead existant dans la base :

```sql
-- Vérifier si le lead existe
SELECT id, first_name, last_name, email, status, created_at
FROM crm_leads
WHERE email = 'sarladeivtc@gmail.com';

-- Si trouvé avec status 'NEW_LEAD', corriger :
UPDATE crm_leads
SET status = 'NOUVEAU_LEAD'
WHERE email = 'sarladeivtc@gmail.com'
  AND status = 'NEW_LEAD';
```

**⚠️ ATTENTION** : Utilisez cette méthode uniquement si vous êtes à l'aise avec SQL.

## Vérification Post-Déploiement

### Checklist

- [ ] Code corrigé dans `/src/lib/email.ts`
- [ ] Projet compilé : `npm run build`
- [ ] Dossier `/dist` uploadé sur IONOS
- [ ] Cache navigateur vidé : `Ctrl + Shift + Suppr`
- [ ] Test formulaire effectué
- [ ] Nouveau lead visible dans Pipeline Kanban
- [ ] Email de notification reçu à team@taxiassur.com

### Indicateurs de Succès

Après déploiement et test, vous devez voir :

1. **Dans le Pipeline Kanban** :
   - Colonne "Nouveau Lead" contient le lead test
   - Statut affiché : "🆕 Nouveau Lead"

2. **Email de notification** :
   - Sujet : "Nouveau Lead : [NOM] - [VILLE]"
   - Contenu avec toutes les infos du prospect
   - Lien vers l'espace commercial

3. **Dans la base de données** :
   ```sql
   SELECT status FROM crm_leads ORDER BY created_at DESC LIMIT 1;
   -- Résultat attendu : NOUVEAU_LEAD
   ```

## Autres Formulaires Affectés

Cette correction s'applique à **TOUS** les formulaires du site qui créent des leads :

- ✅ Formulaire page d'accueil
- ✅ Formulaire page "Demande de devis"
- ✅ Formulaires pages villes (Paris, Lyon, Marseille, etc.)
- ✅ Formulaire "Quelle assurance taxi"
- ✅ Formulaire "Prix assurance taxi"
- ✅ Formulaire "Assurance taxi VTC"

Tous utilisent la même fonction `submitSecureLead()` donc ils sont tous corrigés.

## Migration des Anciens Leads

Si vous avez des leads créés avant cette correction avec le statut `NEW_LEAD` :

### Script de Migration

```sql
-- Compter les leads à migrer
SELECT COUNT(*) FROM crm_leads WHERE status = 'NEW_LEAD';

-- Migrer tous les leads NEW_LEAD vers NOUVEAU_LEAD
UPDATE crm_leads
SET 
  status = 'NOUVEAU_LEAD',
  updated_at = NOW()
WHERE status = 'NEW_LEAD';

-- Vérifier la migration
SELECT status, COUNT(*) 
FROM crm_leads 
GROUP BY status 
ORDER BY status;
```

### Exécution du Script

1. Allez dans le **Dashboard Supabase** : https://supabase.com/dashboard
2. Sélectionnez votre projet TaxiAssur
3. Menu de gauche : **SQL Editor**
4. Copiez-collez le script ci-dessus
5. Cliquez sur **"Run"**
6. Rafraîchissez le Pipeline Kanban

➡️ Tous les anciens leads apparaissent maintenant !

## Prévention Future

Pour éviter ce problème à l'avenir :

### 1. Tests Automatisés

Créer un test qui vérifie que le statut correspond au nouveau système :

```typescript
// test: form-submission.test.ts
test('Form creates lead with correct status', async () => {
  const result = await submitSecureLead(mockLeadData);
  expect(result.success).toBe(true);
  
  const lead = await supabase
    .from('crm_leads')
    .select('status')
    .eq('email', mockLeadData.email)
    .single();
    
  expect(lead.data.status).toBe('NOUVEAU_LEAD');
});
```

### 2. Constantes Centralisées

Utiliser des constantes au lieu de chaînes en dur :

```typescript
// lib/crm-pipeline.ts
export const LEAD_STATUS = {
  NOUVEAU_LEAD: 'NOUVEAU_LEAD',
  COLLECTE_DOCUMENTS: 'COLLECTE_DOCUMENTS',
  // etc.
} as const;

// lib/email.ts
import { LEAD_STATUS } from './crm-pipeline';

status: LEAD_STATUS.NOUVEAU_LEAD, // ✓ Impossible de se tromper
```

### 3. Migration Schema

Supprimer complètement les anciens statuts de l'enum SQL :

```sql
-- Retirer NEW_LEAD de l'enum lead_status
ALTER TYPE lead_status RENAME TO lead_status_old;
CREATE TYPE lead_status AS ENUM (
  'NOUVEAU_LEAD',
  'COLLECTE_DOCUMENTS',
  'DEVIS',
  'DECISION_CLIENT',
  'PAIEMENT',
  'CONTRAT_SIGNATURE',
  'CLIENT_ACTIF',
  'RELANCE',
  'PERDU',
  'RECONTACT_PROGRAMME',
  'SINISTRE'
);
-- Puis migrer les données...
```

## Déploiement Production

### Étapes

1. **Build local** : `npm run build`
2. **Vérifier** : Fichier `/dist/assets/lib-core-*.js` doit contenir `NOUVEAU_LEAD`
3. **Upload** : Transférer `/dist` complet vers IONOS via FTP
4. **Test** : Soumettre un lead test et vérifier qu'il apparaît
5. **Migration** : Exécuter le script SQL de migration des anciens leads
6. **Validation** : Vérifier que tous les leads sont visibles

### Commandes Rapides

```bash
# Build
npm run build

# Vérifier la correction
grep -r "NOUVEAU_LEAD" dist/assets/lib-core-*.js
# Doit trouver au moins 1 occurrence

# Si vous utilisez rsync pour déployer
rsync -avz --delete dist/ user@server:/path/to/webroot/
```

## Support

Si le problème persiste après déploiement :

1. **Vérifier le cache** : Mode incognito pour tester
2. **Console navigateur** : `F12` → Onglet "Console" → Chercher erreurs
3. **Logs Supabase** : Dashboard → Logs → Filtrer par "crm_leads"
4. **SQL direct** : Vérifier manuellement dans la base :
   ```sql
   SELECT * FROM crm_leads 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

---

**IMPORTANT** : Cette correction est **critique** pour le bon fonctionnement du système de gestion des leads. Déployez-la dès que possible !
