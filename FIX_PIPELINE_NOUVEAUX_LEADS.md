# Correction Pipeline - Nouveaux Leads Non Affichés

## Problème Identifié

Les nouveaux leads arrivant par email (comme celui de YAHIAOUI FETHALLAH) n'apparaissent pas automatiquement dans le pipeline Kanban.

## Cause Racine

Deux problèmes combinés :

1. **Statut incorrect** : La fonction de création automatique des leads utilisait le statut `NEW_LEAD` (ancien système anglais) au lieu de `NOUVEAU_LEAD` (nouveau système français)

2. **Synchronisation IMAP lente** : Les emails ne sont pas récupérés instantanément depuis le serveur IONOS. Les crons s'exécutent toutes les 3-5 minutes.

## Solutions Appliquées

### 1. Correction du Statut de Création (DÉPLOYÉE)

La fonction Edge `auto-create-leads-from-emails` utilise maintenant le bon statut :
```typescript
status: 'NOUVEAU_LEAD' // ✅ Nouveau système français
// au lieu de
status: 'NEW_LEAD' // ❌ Ancien système anglais
```

**Statut** : ✅ Déployé sur Supabase

### 2. Bouton de Synchronisation Manuelle (AJOUTÉ)

Un nouveau bouton vert **"Sync Emails"** a été ajouté dans le pipeline :

**Localisation** : En haut à droite, entre "Actualiser" et "Nouveau Lead"

**Fonction** :
1. Force la synchronisation des emails IONOS (récupère les nouveaux emails)
2. Crée automatiquement les leads depuis ces emails
3. Rafraîchit le pipeline pour afficher les nouveaux leads

**Utilisation** :
- Cliquez sur **"Sync Emails"** pour forcer la synchronisation
- Attendez 5-10 secondes
- Un message vert confirmera : "✅ Synchronisation terminée ! X leads créés"
- Les nouveaux leads apparaissent immédiatement dans la colonne "Nouveau Lead"

### 3. Synchronisation Automatique

Les crons existants continuent de fonctionner en arrière-plan :
- `auto-sync-emails-every-minute` : Toutes les minutes
- `auto-create-leads-from-emails` : Toutes les 3 minutes
- `sync-ionos-emails-intake` : Toutes les 5 minutes

Mais pour un résultat **immédiat**, utilisez le bouton "Sync Emails".

## Comment Utiliser

### Cas d'usage : Nouveau lead par email

1. Vous recevez un email d'un prospect sur `team@taxiassur.com`
2. Allez dans **Pipeline Kanban**
3. Cliquez sur **"Sync Emails"** (bouton vert)
4. Patientez 5-10 secondes
5. Le lead apparaît dans la colonne **"Nouveau Lead"**

### Indicateurs visuels

- **Bouton normal** : "Sync Emails" avec icône Mail
- **En cours** : "Synchronisation..." avec icône qui bounce
- **Succès** : Bannière verte "✅ Synchronisation terminée ! X leads créés"
- **Erreur** : Bannière rouge "❌ Erreur lors de la synchronisation"

## Vérification

Pour vérifier que tout fonctionne :

1. **Videz le cache** : `Ctrl + Shift + Suppr` → Cochez "Images et fichiers en cache"
2. Rechargez la page
3. Le bouton **"Sync Emails"** doit être visible (fond vert clair)
4. Cliquez dessus pour tester

## Différences Ancien vs Nouveau Système

### Ancien Système (Avant)
- Attendre 3-5 minutes que les crons s'exécutent
- Actualiser manuellement la page
- Pas de feedback visuel
- Statut `NEW_LEAD` (anglais) causait des erreurs

### Nouveau Système (Après)
- Synchronisation immédiate sur demande
- Feedback visuel en temps réel
- Statut `NOUVEAU_LEAD` (français) compatible avec le pipeline
- Message de confirmation clair

## Dépannage

### Problème : Le bouton n'apparaît pas

**Solution** : Cache navigateur
1. `Ctrl + Shift + Suppr`
2. Cochez "Images et fichiers en cache"
3. Effacez
4. Rechargez : `F5`

### Problème : "Erreur lors de la synchronisation"

**Causes possibles** :
1. Problème de connexion IMAP IONOS
2. Variables d'environnement manquantes
3. Timeout réseau

**Vérification** :
1. Ouvrez la console (`F12`)
2. Regardez les erreurs en rouge
3. Vérifiez que les variables IONOS sont configurées :
   - `IONOS_IMAP_HOST`
   - `IONOS_IMAP_USER`
   - `IONOS_IMAP_PASSWORD`

### Problème : Le lead est créé mais n'apparaît pas

**Solution** : Rafraîchir le pipeline
1. Cliquez sur **"Actualiser"** (bouton à côté de "Sync Emails")
2. Ou rechargez la page : `F5`

**Vérification** :
1. Ouvrez **Inbox Multicanal**
2. Vérifiez que l'email est bien présent
3. Si l'email a un badge "Lead associé", c'est bon
4. Cliquez sur le lead pour accéder au détail

## Logs de Debug

Lors d'une synchronisation, ouvrez la console (`F12`) pour voir :

```
📧 5 emails à traiter
📬 Traitement email: prospect@example.com - "Demande de devis"
✨ Nouveau lead créé: Jean Dupont (prospect@example.com)
🔗 Email lié au lead
✅ Emails synchronisés
✅ Leads créés
```

## Prochaines Étapes

Pour améliorer encore le système :

1. **Webhook temps réel** : Configurer IONOS pour envoyer un webhook à chaque email reçu
2. **Notification push** : Alerter l'utilisateur dès qu'un nouveau lead est créé
3. **IA de classification** : Classer automatiquement les leads par priorité
4. **Auto-réponse** : Envoyer un email de confirmation automatique

## Statut des Déploiements

- ✅ **Fonction Edge corrigée** : Déployée sur Supabase
- ✅ **Bouton Sync Emails** : Compilé dans `/dist`
- ⏳ **À déployer** : Uploadez `/dist` sur IONOS pour voir le bouton

---

**IMPORTANT** : N'oubliez pas de vider le cache après déploiement !
