# ✅ Configuration Brevo - Instructions Simples

## Résultat du test

**Votre clé API Brevo fonctionne parfaitement !**

- ✅ Connexion API réussie
- ✅ Email de test envoyé à : abdammarie@gmail.com
- 📬 Vérifiez votre boîte mail (inbox ou spam)

## 🚀 Pour activer les emails automatiques

Vous devez ajouter la clé dans **Supabase Secrets** :

### Option A : Via le Dashboard Web (Plus Simple) ⭐

1. **Ouvrez** : https://app.supabase.com/project/_/settings/functions

2. **Cliquez** sur l'onglet **"Secrets"** ou **"Edge Function Secrets"**

3. **Ajoutez** un nouveau secret :
   - **Name** : `BREVO_API_KEY`
   - **Value** : `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`

4. **Cliquez** sur **"Add secret"** ou **"Create"**

5. **Attendez** 10-20 secondes (propagation)

### Option B : Demander à l'équipe technique

Si vous n'avez pas accès aux secrets Supabase, transmettez cette information :

```
Secret à configurer dans Supabase :
Nom : BREVO_API_KEY
Valeur : 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
```

## 🧪 Vérification après configuration

1. Retournez dans votre **Backoffice → Facturation Libre**

2. Cliquez sur **"Tester la configuration email (Brevo)"**

3. Vous devriez voir :
   ```
   ✅ Configuration Brevo OK
   Compte: abdammarie@gmail.com
   Plan: Free
   Crédits: 300/jour (gratuit)
   ```

4. Testez ensuite un vrai lien de paiement avec email

## 📧 Systèmes qui seront activés

Une fois configuré, ces emails partiront automatiquement :

- ✅ **Liens de paiement** (Facturation Libre)
- ✅ **Nouveaux leads** (notifications admin)
- ✅ **Documents uploadés** (notifications prospect)
- ✅ **Validation de devis** (emails clients)
- ✅ **Newsletters** (campagnes marketing)

## 🔐 Sécurité

- La clé est stockée de façon sécurisée dans Supabase
- Elle n'est jamais exposée dans le code frontend
- Seules les Edge Functions backend y ont accès

---

**Prochaine étape** : Une fois le secret ajouté dans Supabase, tous les emails partiront automatiquement !
