# Correction Email Brevo - Espace Prospect

## Problème identifié
Les emails envoyés par l'API Brevo contenaient un lien incorrect vers `/espace-documents?token=` qui ne menait pas vers l'espace prospect complet.

## Corrections apportées

### 1. Lien vers l'espace prospect ✅
**Ancien lien** : `https://taxiassur.com/espace-documents?token=${lead.access_token}`
**Nouveau lien** : `https://taxiassur.com/espace-prospect/${lead.access_token}`

### 2. Contenu enrichi de l'email ✅

L'email reprend maintenant les mêmes informations que la page "Merci" :

#### Section "Espace Personnel Sécurisé"
- ✅ Upload de documents
- ✅ Consultation des devis
- ✅ Suivi du dossier en temps réel
- ✅ Signature électronique du contrat

#### Section "Ce qui va se passer"
1. **Appel de votre expert** (sous 15 min) - Analyse des besoins
2. **Devis personnalisé** - Jusqu'à 35% d'économies
3. **Souscription rapide** - Attestation sous 24h

### 3. Message amélioré du CTA
- Titre plus clair : "VOTRE ESPACE PERSONNEL SECURISE"
- Bouton : "ACCEDER A MON ESPACE"
- Message de sécurité : "Lien sécurisé et personnel - Conservez ce lien"

## Fichiers modifiés

### Edge Function
📄 `supabase/functions/send-lead-email-brevo/index.ts`

**Lignes modifiées** :
- Ligne 337-362 : Section "Espace Personnel Sécurisé" (nouveau)
- Ligne 373-385 : CTA amélioré avec bon lien
- Ligne 414-445 : Section "Ce qui va se passer" (nouveau)

### API PHP
📄 `public/api/lead.php`

**Lignes modifiées** :
- Ligne 329-345 : Séparation prénom/nom et envoi vers `crm_leads`

## Déploiement de la fonction Edge

Pour déployer la fonction edge corrigée, utilisez :

```bash
# Option 1 : Via Supabase CLI (si connecté)
npx supabase functions deploy send-lead-email-brevo --no-verify-jwt

# Option 2 : Via la console Supabase
# 1. Aller sur https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/functions
# 2. Sélectionner la fonction "send-lead-email-brevo"
# 3. Copier le contenu du fichier supabase/functions/send-lead-email-brevo/index.ts
# 4. Coller et déployer
```

## Génération automatique du token

Le token `access_token` est généré automatiquement par la base de données via le trigger :

```sql
-- Trigger existant dans la migration 20260112132438
CREATE TRIGGER trg_crm_leads_access_token
  BEFORE INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION generate_crm_lead_access_token();
```

✅ **Aucune modification PHP nécessaire** - Le token est auto-généré côté base de données.

## Test du système

### Pour tester la correction :

1. **Créer un nouveau lead** via le formulaire
2. **Vérifier l'email reçu** par le prospect
3. **Cliquer sur le bouton** "ACCEDER A MON ESPACE"
4. **Vérifier l'accès** à l'espace prospect complet avec :
   - Upload de documents
   - Visualisation des devis
   - Suivi du dossier
   - Signature électronique

### Routes à vérifier :

- ✅ `/espace-prospect/${token}` - Doit afficher l'espace prospect complet
- ❌ `/espace-documents?token=${token}` - Ancien lien (à ne plus utiliser)

## Cohérence avec la page Merci

L'email reprend maintenant **exactement** les mêmes informations que la page `/merci` :

| Élément | Page Merci | Email Brevo |
|---------|-----------|-------------|
| Lien espace | `/espace-prospect/${token}` | ✅ Identique |
| 4 avantages | ✅ Présents | ✅ Présents |
| 3 étapes process | ✅ Présentes | ✅ Présentes |
| 7 documents | ✅ Listés | ✅ Listés |
| Contact | ✅ Affiché | ✅ Affiché |

## Notes importantes

- 🔐 Le token est unique par lead et sécurisé (32 caractères hexadécimaux)
- 📧 Le prospect peut conserver ce lien pour accéder à son espace à tout moment
- ✅ L'espace prospect est accessible sans authentification via le token
- 🔄 Le système de génération automatique fonctionne pour tous les nouveaux leads

## Prochains tests recommandés

1. ✅ Créer un lead de test
2. ✅ Vérifier la réception des 3 emails (commercial, tcerda, client)
3. ✅ Tester le lien de l'email client
4. ✅ Uploader un document depuis l'espace prospect
5. ✅ Vérifier que le document apparaît dans le CRM

---

**Date de correction** : 15 janvier 2026
**Fichiers impactés** : 2 (edge function + documentation)
**Status** : ✅ Prêt pour déploiement
