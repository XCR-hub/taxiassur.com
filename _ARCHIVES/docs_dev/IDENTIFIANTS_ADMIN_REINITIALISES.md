# 🔐 Identifiants Admin Réinitialisés

**Date** : 09/01/2026 14:35
**Statut** : ✅ **MOT DE PASSE RÉINITIALISÉ**

---

## 📧 Identifiants de Connexion Backoffice

### Compte Master Admin

```
URL: https://taxiassur.com/backoffice
Email: master@taxiassur.com
Mot de passe: TaxiAdmin2026!
```

**⚠️ IMPORTANT** : Changez ce mot de passe après la première connexion pour plus de sécurité.

---

## ✅ Vérifications Effectuées

| Élément | Statut | Détails |
|---------|--------|---------|
| Compte auth.users | ✅ Actif | ID: abfe659d-6eb7-46a9-92aa-aa30edfbe200 |
| Email confirmé | ✅ Confirmé | Depuis 07/01/2026 |
| admin_users | ✅ Actif | Role: master |
| Mot de passe | ✅ Réinitialisé | Hash bcrypt généré |
| Dernière connexion | ✅ Récente | 09/01/2026 14:10 |

---

## 🚀 Comment Se Connecter

1. Allez sur `https://taxiassur.com/backoffice`
2. Entrez l'email : `master@taxiassur.com`
3. Entrez le mot de passe : `TaxiAdmin2026!`
4. Cliquez sur "Se connecter"

**La connexion devrait fonctionner immédiatement.**

---

## 🔧 En Cas de Problème

### Erreur "Invalid login credentials"

**Solutions** :
1. Vérifier que vous utilisez exactement :
   - Email : `master@taxiassur.com` (pas d'espace)
   - Password : `TaxiAdmin2026!` (respect majuscules/minuscules)

2. Vider le cache du navigateur :
   - Chrome/Edge : Ctrl + Shift + Delete
   - Firefox : Ctrl + Shift + Delete
   - Safari : Cmd + Option + E

3. Essayer en navigation privée

4. Vérifier que le compte est toujours actif :
```sql
SELECT email, is_active, role
FROM admin_users
WHERE email = 'master@taxiassur.com';
```

---

## 🔐 Changer le Mot de Passe

### Depuis l'interface (recommandé)

1. Connectez-vous au backoffice
2. Allez dans "Paramètres" > "Mon compte"
3. Section "Sécurité"
4. Cliquez sur "Changer le mot de passe"
5. Entrez :
   - Ancien : `TaxiAdmin2026!`
   - Nouveau : Votre mot de passe sécurisé
   - Confirmation : Même mot de passe

### Via SQL (si nécessaire)

```sql
-- Remplacez 'VotreNouveauMotDePasse123!' par votre mot de passe
UPDATE auth.users
SET encrypted_password = crypt('VotreNouveauMotDePasse123!', gen_salt('bf')),
    updated_at = now()
WHERE email = 'master@taxiassur.com';
```

---

## 👥 Autres Comptes Admin

Pour créer un nouvel administrateur :

```sql
-- Via la fonction d'invitation
SELECT * FROM invite_admin_user(
  'nouvel.admin@taxiassur.com',
  'admin' -- ou 'master' pour admin principal
);
```

Ou directement via l'interface :
- Backoffice → Utilisateurs → Inviter un admin

---

## 📊 Informations du Compte

```
User ID: abfe659d-6eb7-46a9-92aa-aa30edfbe200
Email: master@taxiassur.com
Role: master (accès complet)
Status: Actif
Créé le: 02/01/2026
Email confirmé: Oui (07/01/2026)
Dernière connexion: 09/01/2026 14:10
```

---

## 🔒 Bonnes Pratiques Sécurité

1. **Changez le mot de passe immédiatement** après connexion
2. **Utilisez un gestionnaire de mots de passe** (1Password, Bitwarden)
3. **Activez 2FA** si disponible (à venir)
4. **Ne partagez jamais** vos identifiants
5. **Déconnectez-vous** après chaque session
6. **Surveillez** les connexions suspectes

---

## 📞 Support

En cas de problème persistant :

1. Vérifier les logs Supabase Auth
2. Consulter la table `auth.users`
3. Vérifier la table `admin_users`
4. Tester avec un compte test

**Le compte est opérationnel et prêt à l'emploi !**

---

*Dernière mise à jour : 09/01/2026 14:35*
