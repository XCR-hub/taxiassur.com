# Configuration Webhook Monético - Guide Pas à Pas

## Date: 11 février 2026

## 🎯 Problème Identifié

Dans votre capture d'écran Monético Manager, je vois que:
- ✅ TPE: **7374133** (correct)
- ✅ Code Site: **taxiassur** (correct)
- ❌ **URL de l'interface retour commerçant**: **http://** (VIDE - À CONFIGURER)
- ❌ **Environnement**: **TEST** (À passer en PRODUCTION après tests)

---

## 🔧 Configuration Requise

### Étape 1: Configurer l'URL du Webhook

**Dans le tableau Monético Manager que vous voyez**:

1. **Cliquer sur "Modifier"** à droite de la ligne `taxiassur`

2. **Dans le champ "URL du CGI2" ou "URL de l'interface retour commerçant"**, entrer:
   ```
   https://drohhxrkoequjphvabvq.supabase.co/functions/v1/monetico-webhook
   ```

3. **Méthode d'appel CGI2**: Sélectionner **POST**

4. **Email(s) d'alerte**: Garder `TCERDA@XCR.FR` (déjà configuré)

5. **Email(s) de notification**: Garder `TCERDA@XCR.FR` (déjà configuré)

6. **Cliquer sur "Enregistrer" ou "Valider"**

---

## 📋 Informations Complètes pour la Configuration

### URLs à Configurer

**1. URL de Retour Serveur (Interface Retour Commerçant)**:
```
https://drohhxrkoequjphvabvq.supabase.co/functions/v1/monetico-webhook
```
> Cette URL reçoit les notifications de paiement de Monético

**2. Méthode HTTP**:
```
POST
```

**3. Format des données**:
```
application/x-www-form-urlencoded
```

---

## 🔐 Vérification de la Clé MAC

Dans votre code actuel, la clé MAC est:
```
[REDACTED_MONETICO_MAC_KEY]
```

**À Vérifier dans Monético Manager**:
1. Aller dans **Paramétrage avancé** → **Clé de sécurité**
2. Vérifier que la clé MAC correspond exactement
3. Si différente, mettre à jour dans le code

**⚠️ Important**: La clé MAC doit être **IDENTIQUE** dans:
- Monético Manager (back-office)
- `create-monetico-payment/index.ts` (ligne 13)
- `monetico-webhook/index.ts` (ligne 10)

---

## 🧪 Tests en Environnement TEST

### Avant de Passer en Production

**1. Créer un Paiement Test**:
- Montant: 10.00 EUR
- Dans le CRM, étape 6: Paiement RIB
- Créer le lien de paiement

**2. Utiliser une Carte de Test**:
```
Numéro: 4970 1000 0000 0003
Expiration: 12/25
CVV: 123
```

**3. Vérifier le Webhook**:
- Aller dans Supabase Dashboard
- Edge Functions → monetico-webhook → Logs
- Vérifier que le webhook a été appelé
- Vérifier la réponse: `version=2\ncdr=0`

**4. Vérifier la Base de Données**:
```sql
SELECT * FROM monetico_payments
WHERE reference LIKE 'TAX%'
ORDER BY created_at DESC
LIMIT 1;
```
Status doit être: `success`

---

## 🚀 Passage en Production

### Conditions Requises

Monético exige **3 paiements tests réussis** sur les 7 derniers jours.

**Procédure**:
1. Faire 3 paiements tests de 10€ avec carte de test
2. Vérifier que tous sont en `success`
3. Dans Monético Manager:
   - Cliquer sur **"Passer le TPE en production"**
   - Confirmer le passage

### Après Passage en Production

**1. Basculer l'Environnement**:
- Dans Monético Manager, cliquer sur:
  ```
  Basculer vers la PRODUCTION
  ```

**2. Vérifier la Configuration**:
- L'URL du webhook doit rester la même
- Les emails de surveillance restent identiques
- La clé MAC ne change pas

**3. URLs de Retour Client**:
Dans Monético Manager, configurer aussi:

**URL de retour OK (succès)**:
```
https://taxiassur.com/espace-prospect/paiement-success
```

**URL de retour KO (erreur)**:
```
https://taxiassur.com/espace-prospect/paiement-error
```

---

## 📊 Monitoring

### Logs à Surveiller

**1. Supabase Edge Functions**:
```
Dashboard → Edge Functions → monetico-webhook → Logs
```

**Exemple de log réussi**:
```
Monetico webhook received: {
  reference: 'TAX1707676800001234',
  code_retour: 'paiement',
  montant: '500.00EUR',
  numauto: '123456'
}
Payment updated successfully: { paymentId: '...', status: 'success' }
```

**2. Base de Données**:
```sql
-- Vérifier les paiements récents
SELECT
  reference,
  amount,
  status,
  payment_date,
  created_at
FROM monetico_payments
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**3. Emails de Notification**:
- Monético enverra des emails à `TCERDA@XCR.FR`
- En cas de problème avec le webhook
- Pour chaque paiement réussi (si configuré)

---

## ⚠️ Troubleshooting

### Problème 1: "Paiement reste en pending"

**Cause**: Webhook non reçu par Monético

**Solution**:
1. Vérifier que l'URL du webhook est correcte
2. Vérifier les logs Supabase pour erreurs
3. Tester manuellement le webhook:
```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/monetico-webhook \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'reference=TAX123&montant=10.00EUR&code_retour=paiement'
```

### Problème 2: "Erreur MAC invalide"

**Cause**: Clé MAC différente entre Monético et le code

**Solution**:
1. Récupérer la clé MAC dans Monético Manager
2. Mettre à jour dans les 2 edge functions:
   - `create-monetico-payment/index.ts`
   - `monetico-webhook/index.ts`
3. Redéployer les fonctions:
```bash
# Dans Supabase Dashboard
Edge Functions → create-monetico-payment → Deploy
Edge Functions → monetico-webhook → Deploy
```

### Problème 3: "Webhook appelé mais erreur 500"

**Cause**: Erreur dans le code du webhook

**Solution**:
1. Voir les logs détaillés:
```
Edge Functions → monetico-webhook → Logs
```
2. Vérifier la structure des données reçues
3. Vérifier que la table `monetico_payments` existe
4. Vérifier les permissions RLS

---

## 📱 Test Complet End-to-End

### Scénario de Test

**1. Commercial crée le paiement**:
```
CRM Killer → Lead Detail → Étape 6
Montant: 10.00 EUR
Clic "Créer le lien de paiement"
```

**2. Email envoyé automatiquement**:
```
Vérifier inbox du prospect
Email: "Votre lien de paiement sécurisé"
Cliquer sur le lien
```

**3. Page Monético**:
```
Formulaire de paiement s'affiche
Saisir carte test: 4970 1000 0000 0003
Valider
```

**4. Webhook reçu**:
```
Vérifier logs Supabase
Statut: success
Response: version=2\ncdr=0
```

**5. Base de données mise à jour**:
```sql
SELECT * FROM monetico_payments
WHERE reference = 'TAX...'
-- status doit être 'success'
```

**6. CRM mis à jour en temps réel**:
```
Retourner dans CRM Killer
Badge "✅ Payé" doit s'afficher automatiquement
```

---

## 🔒 Sécurité

### Checklist Sécurité

**✅ Avant Production**:
- [ ] URL webhook en HTTPS (pas HTTP)
- [ ] Clé MAC vérifiée et identique
- [ ] Vérification MAC activée dans le webhook
- [ ] RLS activé sur table monetico_payments
- [ ] Logs activés pour monitoring
- [ ] Emails d'alerte configurés
- [ ] 3 paiements tests réussis

**✅ En Production**:
- [ ] Environnement Monético en PRODUCTION
- [ ] URLs de retour client configurées
- [ ] Monitoring actif
- [ ] Backup régulier de la BDD
- [ ] Procédure d'escalade en cas d'incident

---

## 📞 Support

### En Cas de Problème

**1. Support Technique Monético**:
- Téléphone: **0 826 10 10 12** (0,15€/min)
- Email: **support@monetico.fr**
- Horaires: Lun-Ven 9h-18h

**2. Documentation Monético**:
- Guide Technique: Dans le back-office Monético
- FAQ: https://www.monetico-paiement.fr/fr/faq/

**3. Support Interne**:
- Email: `TCERDA@XCR.FR` (configuré dans Monético)
- Vérifier logs Supabase en priorité
- Consulter cette documentation

---

## 📝 Récapitulatif Configuration

### À Faire Maintenant

**1. Dans Monético Manager**:
```
Paramétrage → Interface Retour
↓
Modifier le code site "taxiassur"
↓
URL du CGI2: https://drohhxrkoequjphvabvq.supabase.co/functions/v1/monetico-webhook
↓
Méthode: POST
↓
Enregistrer
```

**2. Tester**:
```
Créer paiement test 10€
↓
Payer avec carte test
↓
Vérifier webhook reçu
↓
Vérifier status = success
```

**3. Passer en Production**:
```
3 paiements tests OK
↓
Cliquer "Passer le TPE en production"
↓
Basculer vers PRODUCTION
```

---

## ✅ Validation Finale

### Après Configuration Complète

**Le système doit**:
- ✅ Créer des paiements depuis le CRM
- ✅ Envoyer emails automatiquement
- ✅ Rediriger vers Monético
- ✅ Recevoir les webhooks
- ✅ Mettre à jour la BDD
- ✅ Notifier en temps réel
- ✅ Afficher badge "Payé"

**Test de Production**:
```
Paiement réel de 1€
↓
Carte bancaire réelle
↓
Tout doit fonctionner automatiquement
```

---

## 📊 Tableau de Bord Monético

### Navigation

**Pour Accéder à la Configuration**:
```
Connexion: https://www.monetico-paiement.fr
↓
Tableau de bord
↓
Paramétrage avancé
↓
Interface Retour
↓
Modifier code site "taxiassur"
```

---

**Document créé le**: 11 février 2026
**Contact**: TCERDA@XCR.FR
**Statut**: ⚠️ **CONFIGURATION WEBHOOK REQUISE**
**Action**: Configurer l'URL du webhook dans Monético Manager

---

## 🎯 Action Immédiate Requise

**ÉTAPE 1**: Cliquer sur **"Modifier"** dans le tableau Monético Manager

**ÉTAPE 2**: Dans le champ **"URL du CGI2"**, entrer:
```
https://drohhxrkoequjphvabvq.supabase.co/functions/v1/monetico-webhook
```

**ÉTAPE 3**: Cliquer sur **"Enregistrer"**

**ÉTAPE 4**: Faire un test avec carte test 4970 1000 0000 0003

**C'est tout !** Une fois cette URL configurée, le système Monético sera pleinement opérationnel.
