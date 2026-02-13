# Configuration de Brevo pour l'envoi d'emails

## Clé API Brevo reçue
La clé API Brevo a été fournie et doit être configurée dans Supabase.

## Instructions de configuration

### Méthode 1 : Via le Dashboard Supabase (Recommandée)

1. **Aller sur votre projet Supabase**
   - URL : https://app.supabase.com
   - Sélectionnez votre projet TaxiAssur

2. **Accéder aux Edge Functions**
   - Dans le menu de gauche, cliquez sur **"Edge Functions"**
   - Puis cliquez sur **"Manage secrets"** ou **"Secrets"**

3. **Ajouter le secret**
   - Cliquez sur **"New secret"** ou **"Add new secret"**
   - **Name** : `BREVO_API_KEY`
   - **Value** : La clé que vous avez fournie (commence par xkeysib-)
   - Cliquez sur **"Create"** ou **"Save"**

4. **Vérifier**
   - Le secret devrait apparaître dans la liste
   - Toutes les edge functions auront maintenant accès à cette clé

### Méthode 2 : Via Supabase CLI (Si installée localement)

```bash
supabase secrets set BREVO_API_KEY=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
```

## Test après configuration

1. Retournez dans **Facturation Libre** sur votre backoffice
2. Cliquez sur le bouton **"Tester la configuration email (Brevo)"**
3. Vous devriez voir :
   ```
   ✅ Configuration Brevo OK
   Compte: votre@email.com
   Plan: ...
   Crédits: ...
   ```

4. Ensuite, testez l'envoi d'un email de paiement

## En cas de problème

Si après configuration vous voyez encore une erreur :
- Vérifiez que le nom du secret est exactement `BREVO_API_KEY` (sensible à la casse)
- Attendez 10-20 secondes après la configuration (propagation)
- Rafraîchissez la page du backoffice
- Re-testez

## Edge Functions utilisant Brevo

Les fonctions suivantes utilisent cette clé :
- `send-payment-link-email` - Envoi des liens de paiement
- `send-lead-email-brevo` - Emails automatiques nouveaux leads
- `send-document-notification` - Notifications de documents
- `send-email-universal` - Envoi d'emails génériques
- `send-newsletter-universal` - Envoi de newsletters

Une fois configurée, tous ces systèmes fonctionneront automatiquement.
