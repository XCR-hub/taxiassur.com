# Configuration des Emails via Brevo (Supabase Edge Functions)

## Problème Identifié

Les emails ne sont pas envoyés car l'Edge Function `send-email` ne trouve pas la clé API Brevo.

## Solution : Configurer les Secrets Supabase

### Étape 1 : Accéder à votre Dashboard Supabase

1. Connectez-vous à [https://supabase.com](https://supabase.com)
2. Sélectionnez votre projet TaxiAssur
3. Dans le menu de gauche, cliquez sur **Edge Functions**

### Étape 2 : Configurer les Secrets

1. Cliquez sur l'onglet **Secrets** (en haut)
2. Ajoutez les secrets suivants :

```bash
BREVO_API_KEY=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
BREVO_SENDER_EMAIL=team@taxiassur.com
BREVO_SENDER_NAME=TaxiAssur
```

### Étape 3 : Redéployer l'Edge Function

Après avoir ajouté les secrets, les Edge Functions les utiliseront automatiquement. Pas besoin de redéployer.

## Vérifier que ça Fonctionne

### Test Rapide depuis la Console Supabase

1. Allez dans **Edge Functions**
2. Sélectionnez la fonction `send-email`
3. Cliquez sur **Invoke**
4. Testez avec ce payload :

```json
{
  "to": "votre-email@example.com",
  "subject": "Test TaxiAssur",
  "text": "Ceci est un test",
  "html": "<h1>Test</h1><p>Ceci est un test</p>"
}
```

## Destinataires Configurés

Désormais, **4 emails** sont envoyés automatiquement à chaque nouveau lead :

1. ✅ **team@taxiassur.com** (nouveau ! email principal)
2. ✅ **commercial@xcr.fr** (notification équipe commerciale)
3. ✅ **tcerda@xcr.fr** (copie pour suivi)
4. ✅ **Email du client** (confirmation automatique)

## Emails HTML Professionnels

Les emails sont maintenant envoyés en **double format** :
- **Texte brut** : pour compatibilité maximale
- **HTML stylisé** : avec design professionnel aux couleurs TaxiAssur

## Amélioration du Logging

Le système enregistre maintenant :
- ✅ Nombre d'emails envoyés avec succès
- ❌ Détails des emails qui ont échoué
- 📊 Logs visibles dans la console du navigateur

## Problèmes Courants

### "Email service not configured"
➡️ Vérifiez que `BREVO_API_KEY` est bien configuré dans les secrets Supabase

### "Invalid API key"
➡️ Vérifiez que la clé API Brevo est valide sur [https://app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api)

### Emails en spam
➡️ Configurez SPF, DKIM et DMARC pour votre domaine dans Brevo

## Support

En cas de problème persistant :
1. Consultez les logs dans Supabase Edge Functions
2. Vérifiez la console du navigateur (F12)
3. Testez l'API Brevo directement depuis Postman
