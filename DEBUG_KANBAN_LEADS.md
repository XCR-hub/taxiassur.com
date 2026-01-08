# 🔍 DEBUG : Détails des Leads dans le Kanban

## ✅ Corrections Appliquées

### 1. Système vérifié et fonctionnel

**Route configurée** : `/backoffice/crm-killer/lead/:leadId`
- ✅ Component : `CRMLeadDetail`
- ✅ Protection : `AuthGuard`
- ✅ Navigation : `navigate(\`/backoffice/crm-killer/lead/${lead.id}\`)`

**Base de données** :
- ✅ Table : `crm_leads`
- ✅ Colonne statut : `status` (type ENUM)
- ✅ Données de test présentes

### 2. Logs de débogage ajoutés

**Dans CRMPipelineKanban** :
```javascript
onClick={() => {
  console.log('Navigating to lead:', lead.id, lead);
  navigate(`/backoffice/crm-killer/lead/${lead.id}`);
}}
```

**Dans CRMLeadDetail** :
```javascript
console.log('Loading lead data for:', leadId);
console.log('Lead data loaded:', leadData);
console.log('Timeline:', timelineData);
console.log('Decisions:', decisionsData);
console.log('Documents:', docsData);
console.log('Retention score:', scoreData);
```

---

## 🧪 Comment Tester

### Étape 1 : Ouvrir la Console
1. Uploadez `/dist/` sur IONOS
2. Allez sur le Kanban : `/backoffice/crm-killer/pipeline`
3. Ouvrez la console du navigateur (F12)

### Étape 2 : Cliquer sur un Lead
1. Cliquez sur une carte de lead dans n'importe quelle colonne
2. Vérifiez dans la console :
   ```
   Navigating to lead: [ID] {...lead data...}
   Loading lead data for: [ID]
   Lead data loaded: {...}
   ```

### Étape 3 : Vérifier l'Affichage
La page de détail devrait afficher :
- 🎯 **En-tête** : Nom, email, statut avec icône
- 📊 **Scores** : Qualité, Rétention
- 📋 **4 Onglets** :
  - **Timeline** : Historique des événements
  - **Documents** : Checklist des docs
  - **IA** : Décisions automatiques
  - **Rétention** : Score de fidélisation

---

## 🐛 Résolution des Problèmes

### Problème : Rien ne se passe au clic
**Console** : Vérifiez les erreurs JavaScript
**Solution** :
- Vérifiez que vous êtes connecté (AuthGuard)
- Vérifiez l'URL dans la barre d'adresse

### Problème : Erreur "Failed to load lead"
**Console** : `Error details: {...}`
**Solutions possibles** :
1. Lead n'existe pas dans `crm_leads`
2. Problème de permissions RLS
3. Connexion Supabase

**Vérification SQL** :
```sql
SELECT id, first_name, last_name, email, status
FROM crm_leads
WHERE id = 'LEAD_ID_ICI';
```

### Problème : Page blanche
**Console** : Erreur de rendu React
**Solution** :
- Vérifiez que `lead.status` existe dans `PIPELINE_STATUSES`
- Vérifiez les données null/undefined

---

## 📊 Structure des Données

### CRMLead
```typescript
{
  id: string;
  first_name: string;
  last_name: string;
  full_name: string; // Auto-généré
  email: string;
  phone: string;
  status: PipelineStatus;
  quality_score?: number;
  retention_score?: number;
  last_contact?: string;
  notes?: string;
  tags?: string[];
}
```

### Services Utilisés
1. **pipelineService** : Gestion du pipeline
2. **aiGovernanceService** : Décisions IA
3. **channelEngineService** : Communications
4. **productionService** : Documents
5. **retentionService** : Scores de fidélisation

---

## ✅ Checklist de Vérification

- [ ] Console ouverte (F12)
- [ ] Kanban chargé avec des leads
- [ ] Clic sur une carte
- [ ] Log "Navigating to lead" affiché
- [ ] Redirection vers `/backoffice/crm-killer/lead/[ID]`
- [ ] Log "Loading lead data" affiché
- [ ] Page de détail chargée avec données
- [ ] Onglets fonctionnels (Timeline, Documents, IA, Rétention)

---

## 🎯 Prochaines Étapes

Si tout fonctionne :
1. ✅ Retirer les `console.log()` pour la production
2. ✅ Ajouter des messages d'erreur utilisateur-friendly
3. ✅ Optimiser le chargement avec cache

Si problème persiste :
1. 📝 Copier les logs de la console
2. 📝 Copier l'URL actuelle
3. 📝 Décrire exactement ce qui se passe
4. 📧 Partager ces informations

---

**Build actuel** : ✅ Prêt pour déploiement
**Fichiers modifiés** :
- `src/backoffice/CRMPipelineKanban.tsx`
- `src/backoffice/CRMLeadDetail.tsx`
