# 🚀 MONÉTICO PAIEMENT - PASSAGE EN PRODUCTION

## ✅ Confirmation CIC - Mode Production Activé

**Date de mise en production** : 23 Février 2026

**Détails de configuration :**
- **TPE** : 7374133
- **Code société** : taxiassur
- **Langues** : FR, EN
- **Dashboard** : https://www.monetico-services.com/fr

## 🔐 Configuration Requise

### 1. Identifiants de Production

```bash
MONETICO_MODE="production"
MONETICO_TPE="7374133"
MONETICO_SOCIETE="taxiassur"
MONETICO_MAC_KEY=REDACTED
```

⚠️ **IMPORTANT** : La clé MAC de production peut être différente de celle de test.
Récupérez-la depuis votre tableau de bord Monético :
https://www.monetico-services.com/fr

### 2. URLs de Production

- **URL de paiement** : `https://p.monetico-services.com/paiement.cgi`
- **Webhook URL** : `https://bpwcakjtwgdtfwghylwv.supabase.co/functions/v1/monetico-webhook`

### 3. Configuration Webhook sur Monético

Dans votre tableau de bord Monético :
1. Aller dans **Configuration > URLs de notification**
2. URL de retour OK : `https://taxiassur.com/espace-prospect/paiement-success`
3. URL de retour KO : `https://taxiassur.com/espace-prospect/paiement-error`
4. URL de notification serveur : `https://bpwcakjtwgdtfwghylwv.supabase.co/functions/v1/monetico-webhook`

## 🚀 Déploiement des Secrets

### Option 1 : Script Automatique (Recommandé)

```bash
./scripts/configure-monetico-production.sh
```

### Option 2 : Commandes Manuelles

```bash
# Passer en mode production
supabase secrets set MONETICO_MODE="production"

# Configurer les identifiants
supabase secrets set MONETICO_TPE="7374133"
supabase secrets set MONETICO_SOCIETE="taxiassur"

# ⚠️ IMPORTANT : Remplacer par votre vraie clé MAC de production
supabase secrets set MONETICO_MAC_KEY=REDACTED
```

### Option 3 : Via Dashboard Supabase

1. https://supabase.com/dashboard/project/bpwcakjtwgdtfwghylwv/settings/functions
2. Edge Functions > Secrets
3. Ajouter/Modifier les secrets :
   - `MONETICO_MODE` = `production`
   - `MONETICO_TPE` = `7374133`
   - `MONETICO_SOCIETE` = `taxiassur`
   - `MONETICO_MAC_KEY` = `[Votre clé MAC production]`

## 🔍 Où Trouver la Clé MAC de Production ?

1. Connectez-vous à https://www.monetico-services.com/fr
2. Menu **Configuration** > **Paramètres TPE**
3. Section **Clé de sécurité** ou **Clé MAC**
4. Copiez la clé hexadécimale (40 caractères)

**Format attendu** : `106FA85BF342FD4EE95C883D82865B5CC1F63890` (exemple)

## 🧪 Tests Après Configuration

### Test 1 : Vérifier le Mode

```bash
# Les logs devraient afficher "Mode: 🚀 PRODUCTION"
# et non "Mode: 🧪 TEST"
```

### Test 2 : Paiement de Test Production

⚠️ **ATTENTION** : En production, utilisez des VRAIES cartes bancaires

```bash
# Test avec petit montant
curl -X POST "https://bpwcakjtwgdtfwghylwv.supabase.co/functions/v1/create-monetico-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1.00,
    "customerEmail": "test@taxiassur.com",
    "customerFirstName": "Test",
    "customerLastName": "Production",
    "description": "Test paiement production"
  }'
```

### Test 3 : Vérifier les Logs

```sql
-- Vérifier les paiements en production
SELECT
  reference,
  amount,
  status,
  monetico_data->>'mode' as mode,
  created_at
FROM monetico_payments
WHERE monetico_data->>'mode' = 'PRODUCTION'
ORDER BY created_at DESC
LIMIT 10;
```

## 📊 Différences Test vs Production

| Paramètre | Mode Test | Mode Production |
|-----------|-----------|-----------------|
| URL Paiement | `p.monetico-services.com/test/paiement.cgi` | `p.monetico-services.com/paiement.cgi` |
| Référence | Préfixe `T` (ex: T12345678901) | Préfixe `P` (ex: P12345678901) |
| Cartes | Cartes de test CIC | Vraies cartes bancaires |
| Clé MAC | Clé de test | Clé de production |
| Débits réels | Non | **OUI - Vrais débits** |

## ⚠️ IMPORTANT - Sécurité Production

### À FAIRE Immédiatement

1. ✅ Vérifier que la clé MAC de production est différente de celle de test
2. ✅ Tester avec un paiement de 1€ avant de mettre en ligne
3. ✅ Configurer les notifications webhook dans Monético
4. ✅ Vérifier les emails de confirmation de paiement
5. ✅ Tester le processus complet : paiement → webhook → mise à jour lead

### À NE PAS FAIRE

- ❌ Ne JAMAIS committer la clé MAC dans le code
- ❌ Ne JAMAIS exposer la clé MAC dans les logs
- ❌ Ne JAMAIS utiliser les cartes de test en production
- ❌ Ne JAMAIS désactiver la vérification MAC du webhook

## 🔄 Rollback en Mode Test

Si vous devez repasser en test temporairement :

```bash
supabase secrets set MONETICO_MODE="test"
```

## 📱 Intégration Frontend

Le frontend détecte automatiquement le mode depuis la réponse :

```typescript
const response = await supabase.functions.invoke('create-monetico-payment', {
  body: {
    leadId: lead.id,
    amount: downPayment.amount,
    description: 'Acompte assurance taxi'
  }
});

// response.data.mode === "PRODUCTION" ou "TEST"
```

## 📧 Support Monético

**Hotline Commerçants**
- 📞 0 820 821 735 (7j/7, 24h/24)
- 📧 centrecom@e-i.com
- 💻 https://www.monetico-services.com/fr

## 🎯 Checklist de Mise en Production

- [ ] Récupérer la clé MAC de production depuis le dashboard Monético
- [ ] Configurer les secrets Supabase avec les identifiants de production
- [ ] Vérifier `MONETICO_MODE="production"`
- [ ] Configurer les URLs de retour dans Monético
- [ ] Configurer l'URL du webhook dans Monético
- [ ] Tester un paiement de 1€ en production
- [ ] Vérifier que le webhook fonctionne
- [ ] Vérifier les emails de confirmation
- [ ] Monitorer les premiers paiements réels
- [ ] Documenter le processus pour l'équipe

## 📝 Logs et Monitoring

### Voir les Paiements Production

```sql
-- Paiements du jour
SELECT
  reference,
  amount,
  status,
  customer_email,
  monetico_data->>'mode' as mode,
  created_at
FROM monetico_payments
WHERE DATE(created_at) = CURRENT_DATE
  AND monetico_data->>'mode' = 'PRODUCTION'
ORDER BY created_at DESC;

-- Statistiques production
SELECT
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM monetico_payments
WHERE monetico_data->>'mode' = 'PRODUCTION'
GROUP BY status;
```

### Logs Edge Functions

Dashboard Supabase > Edge Functions > Logs
Filtrer par : `create-monetico-payment` et `monetico-webhook`

---

**Date de création** : 23 Février 2026
**Statut** : ✅ TPE en production - Configuration en attente
**Prochaine étape** : Configurer les secrets et tester
