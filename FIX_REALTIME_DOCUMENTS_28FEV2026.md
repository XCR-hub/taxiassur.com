# Fix Realtime Documents CRM - 28 Février 2026

## 🎯 Problème résolu

**Symptômes:**
- Le CRM se déconnecte quand un prospect upload un document
- Notification reçue mais le CRM ne se met pas à jour en live
- Il faut rafraîchir manuellement (F5) pour voir les nouveaux documents

**Cause:**
- Aucune subscription realtime sur la table `crm_lead_documents`
- Le CRM n'écoute que les changements sur `crm_leads`, pas sur les documents

## ✅ Solution implémentée

### 1. Hook Realtime Documents (`useRealtimeDocuments.ts`)

Nouveau hook personnalisé qui :
- Écoute les changements INSERT, UPDATE, DELETE sur `crm_lead_documents`
- Filtre par `lead_id` si spécifié
- Gère automatiquement la connexion/déconnexion
- Logs détaillés pour debugging

**Fichier:** `src/hooks/useRealtimeDocuments.ts`

```typescript
useRealtimeDocuments({
  leadId: 'xxx',
  onDocumentChange: () => {
    // Rafraîchir la liste
  },
  enabled: true
});
```

### 2. Système de Toast Notifications

Affiche une notification visuelle quand un document est uploadé :
- Toast animé en haut à droite
- Disparaît automatiquement après 5 secondes
- Animation fluide (slide-in-right)

**Fichiers:**
- `src/components/crm/DocumentToast.tsx`
- `src/index.css` (animations)

### 3. Intégration dans le CRM

**Modifications dans `CRMLeadDetail.tsx`:**
- Import du hook `useRealtimeDocuments`
- Import du système de toast
- Callback `handleDocumentChange` qui :
  - Affiche le toast
  - Rafraîchit les stats
  - Recharge les données du lead

**Modifications dans `DocumentBasket.tsx`:**
- Subscribe aux changements de documents
- Rafraîchit automatiquement le panier

### 4. Migration Database

**Migration:** `20260228103000_enable_realtime_crm_documents_28fev2026.sql`

Active la publication realtime sur la table `crm_lead_documents` :

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE crm_lead_documents;
```

### 5. Composant de Debug (optionnel)

**Fichier:** `src/components/crm/RealtimeDebugger.tsx`

Pour vérifier la connexion realtime en temps réel :
- Affiche le statut de connexion
- Compte les events reçus
- Montre les derniers events

## 📋 Fichiers modifiés

1. ✅ `src/hooks/useRealtimeDocuments.ts` (CRÉÉ)
2. ✅ `src/components/crm/DocumentToast.tsx` (CRÉÉ)
3. ✅ `src/components/crm/RealtimeDebugger.tsx` (CRÉÉ)
4. ✅ `src/backoffice/CRMLeadDetail.tsx` (MODIFIÉ)
5. ✅ `src/components/crm/DocumentBasket.tsx` (MODIFIÉ)
6. ✅ `src/index.css` (MODIFIÉ - ajout animations)
7. ✅ Migration database appliquée

## 🧪 Comment tester

### Test 1: Upload depuis l'espace prospect

1. Ouvrir le CRM sur un lead
2. Ouvrir l'espace prospect du même lead dans un autre onglet
3. Uploader un document depuis l'espace prospect
4. **Résultat attendu:**
   - Toast "Nouveau document reçu!" apparaît
   - Le compteur de documents se met à jour automatiquement
   - Le document apparaît dans la liste sans F5

### Test 2: Vérifier la connexion realtime

1. Ajouter dans `CRMLeadDetail.tsx` :
```tsx
import RealtimeDebugger from '@/components/crm/RealtimeDebugger';

// Dans le JSX
<RealtimeDebugger show={true} />
```

2. Ouvrir le CRM
3. Vérifier que le status est "SUBSCRIBED"
4. Uploader un document
5. Le debugger devrait montrer l'event reçu

### Test 3: Vérifier les logs console

Quand un document est uploadé, vous devriez voir dans la console :
```
🔌 Subscribing to documents-realtime-{leadId}...
✅ Realtime documents subscribed (documents-realtime-{leadId})
📄 New document inserted: {...}
📄 Document change detected, refreshing...
```

## 🔧 Troubleshooting

### Le realtime ne fonctionne pas

**Vérifier que Realtime est activé dans Supabase Dashboard:**
1. Aller dans Database → Tables
2. Sélectionner `crm_lead_documents`
3. Settings → Enable Realtime
4. Cocher INSERT, UPDATE, DELETE

**Vérifier les RLS policies:**
```sql
-- La table doit avoir RLS activé
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'crm_lead_documents';

-- Doit retourner rowsecurity = true
```

**Vérifier la publication:**
```sql
-- Vérifier que la table est dans la publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

### Le CRM se déconnecte encore

**Possible cause:** Trop de subscriptions simultanées

**Solution:** Le hook `useRealtimeDocuments` gère déjà le cleanup automatique.

Vérifier qu'il n'y a pas de `supabase.channel()` orphelins sans `removeChannel()`.

### Les notifications ne s'affichent pas

**Vérifier que le toast est bien monté:**
```tsx
// Dans CRMLeadDetail.tsx
<DocumentToastContainer toasts={toasts} onRemove={removeToast} />
```

**Vérifier que showToast est appelé:**
```typescript
const handleDocumentChange = useCallback(() => {
  console.log('🔔 SHOWING TOAST'); // Debug
  showToast('Nouveau document reçu!', 'success');
  // ...
}, []);
```

## 📊 Performance

**Impact minimal:**
- Une seule connexion WebSocket par lead ouvert
- Cleanup automatique quand on quitte la page
- Debounce intégré pour éviter trop de rafraîchissements

**Optimisations:**
- Filter côté Supabase (`filter: 'lead_id=eq.xxx'`)
- Unsubscribe automatique au unmount
- Logs uniquement en développement

## 🚀 Prochaines étapes possibles

1. **Ajouter le realtime sur d'autres tables:**
   - `lead_company_quotes` (devis)
   - `crm_production_contracts` (contrats)
   - `email_messages` (emails)

2. **Améliorer les notifications:**
   - Son de notification (optionnel)
   - Badge sur l'onglet browser
   - Push notifications si l'onglet est en arrière-plan

3. **Dashboard temps réel:**
   - Nombre de leads actifs en temps réel
   - Statistiques live
   - Alertes automatiques

## 📝 Notes importantes

- ✅ Le realtime fonctionne uniquement pour les utilisateurs authentifiés
- ✅ Les RLS policies s'appliquent toujours
- ✅ Pas de risque de voir les documents d'autres leads
- ✅ La connexion se reconnecte automatiquement en cas de perte
- ✅ Compatible avec tous les navigateurs modernes

## 🎉 Résultat final

Le CRM est maintenant **100% temps réel** :
- Pas besoin de rafraîchir manuellement
- Notifications instantanées
- Expérience utilisateur fluide
- Pas de déconnexion
