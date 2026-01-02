# Guide d'accès au Backoffice TaxiAssur

## Problème résolu
- Page noire causée par une dépendance circulaire dans `supabase.ts`
- Build réussi et fonctionnel

## Créer l'utilisateur master

### Méthode 1 : Via le Dashboard Supabase (RECOMMANDÉ)

1. Connectez-vous sur https://supabase.com/dashboard
2. Sélectionnez votre projet : **drohhxrkoequjphvabvq**
3. Dans le menu de gauche, cliquez sur **Authentication** → **Users**
4. Cliquez sur le bouton **Add user** (en haut à droite)
5. Sélectionnez **Create new user**
6. Remplissez les champs :
   ```
   Email: master@taxiassur.com
   Password: TaxiAssur2026!
   ```
7. ✅ **IMPORTANT** : Cochez la case **Auto Confirm User**
8. Cliquez sur **Create user**

### Méthode 2 : Utiliser le compte existant

Vous avez déjà ce compte actif :
```
Email: tcerda@xcr.fr
Rôle: collaborator
```

Vous pouvez utiliser ce compte pour accéder au backoffice dès maintenant.

## Connexion au backoffice

1. Allez sur : `https://votre-domaine.com/admin-dashboard`
2. Entrez vos identifiants
3. Accès immédiat au dashboard complet

## Structure des rôles

- **master** : Accès complet à toutes les fonctionnalités
- **collaborator** : Accès aux fonctionnalités de gestion courante

## En cas de problème

Si vous ne pouvez pas vous connecter :

1. Vérifiez que l'utilisateur existe dans **Supabase Auth** (Authentication → Users)
2. Vérifiez que l'utilisateur existe dans la table **admin_users**
3. Vérifiez que `is_active = true` dans la table `admin_users`
4. Assurez-vous que l'utilisateur est **confirmé** dans Supabase Auth

## Vérification en SQL

Pour vérifier l'utilisateur dans la base de données :

```sql
SELECT email, role, is_active, created_at
FROM admin_users
WHERE email = 'master@taxiassur.com';
```

Résultat attendu :
```
email: master@taxiassur.com
role: master
is_active: true
created_at: [date]
```
