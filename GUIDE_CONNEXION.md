# Guide de Connexion - TaxiAssur BackOffice

## URLs de Connexion

Plusieurs URLs vous permettent d'accéder au BackOffice :

### Routes principales :
- **`/admin/login`** - Page de connexion principale (recommandée)
- **`/login`** - Redirige vers `/admin/login`
- **`/backoffice`** - Redirige vers `/admin/login`
- **`/backoffice/*`** - Toute route commençant par `/backoffice` redirige vers `/admin/login`

### Après connexion :
- **`/admin/dashboard`** - Tableau de bord principal
- **`/admin/crm/pipeline`** - Pipeline commercial Kanban
- **`/admin/crm/leads/:leadId`** - Détail d'un lead
- **`/admin/crm/inbox`** - Boîte de réception multicanal
- **`/admin/pending-documents`** - Documents en attente de validation
- **`/admin/quote-queue`** - File d'attente des devis
- **`/admin/insurance-companies`** - Gestion des compagnies d'assurance

## Comment se connecter

1. Accédez à l'une des URLs de connexion ci-dessus
2. Entrez votre email et mot de passe administrateur
3. Cliquez sur "Se connecter"
4. Vous serez automatiquement redirigé vers le dashboard

## Système d'authentification

Le système utilise :
- **Supabase Auth** pour l'authentification
- **Table `admin_users`** pour vérifier les droits administrateur
- **Session permanente** (30 jours) stockée dans localStorage
- **Vérification automatique** des permissions à chaque connexion

## En cas de problème

Si vous ne pouvez pas vous connecter :

1. **Vérifiez vos identifiants** dans la base de données Supabase
2. **Vérifiez que l'utilisateur existe** dans la table `auth.users`
3. **Vérifiez les permissions** dans la table `admin_users`
4. **Consultez la console du navigateur** (F12) pour voir les erreurs éventuelles

### Commandes utiles pour créer un admin :

```sql
-- 1. Créer l'utilisateur dans Supabase Auth (via le dashboard Supabase)

-- 2. Lier l'utilisateur à admin_users
INSERT INTO admin_users (user_id, email, role)
VALUES (
  'uuid-de-l-utilisateur',
  'admin@taxiassur.com',
  'admin'
);
```

## Page 404 personnalisée

Une page 404 personnalisée a été créée pour toutes les routes inexistantes. Elle propose :
- Retour à l'accueil
- Accès à l'espace administrateur
- Liens vers les pages populaires
- Numéro de téléphone pour le support

## Routes disponibles

### Public :
- `/` - Page d'accueil
- `/assurance-taxi` - Page assurance taxi
- `/devis` - Formulaire de devis
- `/contact` - Page de contact
- `/blog` - Blog
- `/faq` - Questions fréquentes

### Client :
- `/client/dashboard` - Tableau de bord client
- `/client/documents` - Documents client
- `/client/profil` - Profil client
- `/client/sinistres` - Sinistres client
- `/client/paiements` - Paiements client

### Prospect :
- `/espace-prospect` - Espace prospect
- `/prospect/documents/:token` - Upload de documents avec token

### Admin (nécessite authentification) :
Toutes les routes sous `/admin/*` nécessitent une connexion admin valide.

## Support

En cas de problème persistant, contactez le support technique avec :
- L'URL exacte que vous essayez d'accéder
- Le message d'erreur affiché
- Une capture d'écran de la console (F12)
