# Configuration Session Administrateur

## Problème Résolu

Vous étiez déconnecté automatiquement après actualisation de la page. Ce problème a été corrigé en 3 étapes :

## 1. ✅ Corrections Appliquées (Automatique)

### A. Système de Keep-Alive Intelligent
Un système automatique rafraîchit maintenant votre session :
- Toutes les 5 minutes (vérification)
- 30 minutes avant expiration (rafraîchissement proactif)
- Sur activité utilisateur (après 10 minutes d'inactivité)
- Stockage sécurisé dans localStorage

### B. Pipeline Corrigé
- Ajout du support complet des anciens statuts (`DOCUMENTS_REQUIRED`, `DOCUMENTS_RECEIVED`, etc.)
- Transitions de migration automatiques vers le nouveau système
- Validation améliorée pour éviter les statuts `undefined`

### C. Affichage Emails
- Fond sombre (#111827) pour éviter le texte blanc sur blanc
- Texte blanc forcé avec `!important` pour tous les emails HTML
- Bouton de changement de thème (soleil/lune) en haut à droite

## 2. ⚠️ ACTION REQUISE : Vider le Cache

**CRITIQUE** : Vous DEVEZ vider le cache de votre navigateur pour voir les corrections :

1. **Chrome/Edge** : `Ctrl + Shift + Suppr` (Windows) ou `Cmd + Shift + Suppr` (Mac)
2. Cochez **"Images et fichiers en cache"**
3. Cliquez sur **"Effacer les données"**
4. Rechargez la page : `F5` ou `Ctrl + R`

Sans vider le cache, vous continuerez à utiliser l'ancien JavaScript qui causait les erreurs.

## 3. 🔧 Configuration Optionnelle Supabase

Pour augmenter encore la durée de session, configurez Supabase (optionnel) :

### Étapes dans le Dashboard Supabase

1. Allez sur https://supabase.com/dashboard/project/YOUR_PROJECT
2. Cliquez sur **"Authentication"** dans le menu gauche
3. Cliquez sur l'onglet **"Configuration"**
4. Trouvez la section **"JWT Expiry"**
5. Changez la valeur par défaut :
   - Par défaut : `3600` (1 heure)
   - Recommandé : `604800` (7 jours)
   - Maximum : `2592000` (30 jours)

6. Cliquez sur **"Save"**

### Pourquoi c'est optionnel ?

Avec le système de keep-alive automatique, votre session sera rafraîchie automatiquement avant expiration. Vous ne serez plus déconnecté même si vous laissez la page ouverte toute la journée.

## 4. 🧪 Test de Vérification

Après avoir vidé le cache :

1. Connectez-vous au backoffice
2. Ouvrez la console développeur (F12)
3. Vous devriez voir :
   ```
   ✅ Session rafraîchie avec succès (expire dans XX min)
   ```
4. Cliquez sur un lead pour vérifier le pipeline
5. Les étapes "Documents" → "Devis" doivent fonctionner sans erreur

## 5. 📊 Logs de Debug

Le système affiche maintenant des logs clairs dans la console :

- `✅ Session rafraîchie avec succès` : Le keep-alive fonctionne
- `⏳ Session OK (expire dans X min)` : Pas besoin de rafraîchir
- `⚠️ Session invalide, redirection vers login` : Session expirée définitivement
- `✅ Changement de statut: X → Y` : Pipeline fonctionne correctement

## 6. ❓ Dépannage

### Problème : Toujours déconnecté après F5

**Solution** : Videz VRAIMENT le cache
- Chrome : `chrome://settings/clearBrowserData`
- Cochez "Images et fichiers en cache"
- Sélectionnez "Dernières 24 heures"
- Effacez

### Problème : Erreur "invalid enum value"

**Solution** : Les anciens leads ont des statuts obsolètes
- Cliquez sur le lead concerné
- Le système propose automatiquement des transitions de migration
- Exemple : `DOCUMENTS_RECEIVED` → "Migrer - Générer Devis"

### Problème : Emails toujours illisibles

**Solution** : Cache CSS non vidé
1. Ouvrez DevTools (F12)
2. Clic droit sur le bouton actualiser
3. Choisissez "Vider le cache et actualiser de force"

## 7. 📈 Améliorations Futures

Si vous voulez aller plus loin :

- Activer la persistance session Supabase (30 jours)
- Configurer un système de token refresh côté serveur
- Ajouter un mode "Remember Me" pour ne jamais déconnecter

## Support

Si le problème persiste après avoir vidé le cache, vérifiez :
1. La console JavaScript (F12) pour les erreurs
2. L'onglet "Network" pour voir les appels API échoués
3. Les logs de session dans localStorage (`taxiassur-auth`)
