# Résumé des Changements - Système d'Appel Téléphonique

## Fichiers Créés

### 1. `/src/components/crm/CallDialog.tsx`
Dialogue complet d'appel téléphonique avec les fonctionnalités suivantes :
- **Chronomètre** : Mesure automatique de la durée de l'appel
- **Enregistrement audio** : Possibilité d'enregistrer la conversation (avec permission microphone)
- **Prise de notes** : Zone de texte pour ajouter des notes pendant/après l'appel
- **Statuts** : idle → ringing → active → ended
- **Sauvegarde** : Enregistre l'interaction dans `crm_interactions` avec métadonnées
- **Upload audio** : Stocke les enregistrements dans le bucket Supabase `call-recordings`

### 2. `/src/components/crm/PipelineStepWorkflow.tsx`
Workflow refait complètement avec :
- **Synchronisation Kanban** : Les 7 étapes du pipeline Kanban
- **Navigation libre** : 3 façons de naviguer (stepper, boutons, sauts rapides)
- **Alerte d'urgence** : Pour l'étape "Nouveau Lead", affiche une alerte si < 15 minutes depuis création
- **Bouton CTA** : "Appeler le client dans les 15 minutes" qui ouvre le CallDialog
- **Intégration complète** : Le CallDialog s'ouvre depuis l'étape 1

## Modifications de Fichiers

### `/src/backoffice/CRMLeadDetail.tsx`
- Import changé : `StepByStepWorkflow` → `PipelineStepWorkflow`
- Utilisation du nouveau composant avec `onStageChanged` callback

## Migrations Base de Données

### `add_pipeline_stage_to_crm_leads_v2`
- Ajout colonne `pipeline_stage_id` à `crm_leads`
- Fonction de synchronisation automatique entre statut et stage
- Mapping de tous les statuts vers les 7 étapes du pipeline
- Trigger pour maintenir la cohérence

### `create_call_recordings_bucket_v2`
- Création bucket `call-recordings` dans Supabase Storage
- Limite : 10MB par fichier
- Types acceptés : audio/webm, audio/mpeg, audio/wav, audio/ogg
- RLS activé : Les utilisateurs authentifiés peuvent upload/read/delete leurs enregistrements

## Fonctionnalités Clés

### Pour l'Étape 1 "Nouveau Lead"

1. **Alerte d'urgence automatique** si le lead a < 15 minutes
   - Affichage du temps restant
   - Message sur l'augmentation de conversion x7
   - Bouton CTA prominent

2. **Bouton "Appeler le client"**
   - Toujours visible dans l'étape 1
   - Animation pulse si urgence < 15 min
   - Ouvre le CallDialog

3. **CallDialog**
   - Affiche les infos du lead (nom, téléphone, email)
   - Simulation de sonnerie (2 secondes)
   - Chronomètre en temps réel
   - Bouton enregistrement audio
   - Zone de notes pendant l'appel
   - Sauvegarde dans timeline avec durée et fichier audio

## Utilisation

1. Ouvrez un lead en étape "Nouveau Lead"
2. Vous verrez l'alerte orange si < 15 minutes
3. Cliquez sur "Appeler maintenant" ou "Appeler le client"
4. Le dialogue s'ouvre avec les infos du lead
5. Cliquez "Démarrer l'appel"
6. Pendant l'appel :
   - Cliquez "Enregistrer" pour capturer l'audio
   - Ajoutez des notes
7. Cliquez "Raccrocher" quand terminé
8. Ajoutez/complétez vos notes
9. Cliquez "Sauvegarder"
10. L'interaction est enregistrée dans la timeline

## Avantages

- ✅ Homogénéité avec le pipeline Kanban
- ✅ Navigation libre (avancer, reculer, sauter)
- ✅ Alerte d'urgence pour nouveaux leads
- ✅ Chronomètre et enregistrement audio
- ✅ Traçabilité complète des appels
- ✅ Statistiques et conseils IA par étape
