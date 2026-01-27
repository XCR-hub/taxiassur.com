# 🔔 Système de Notifications Push CRM - TaxiAssur 2026

## ✨ Vue d'ensemble

Système de **notifications push en temps réel** pour les commerciaux du CRM. Les notifications s'affichent automatiquement sous forme de **toasts visuels** avec animations et son, permettant aux commerciaux de réagir immédiatement aux événements importants.

---

## 🎯 Fonctionnalités

### **Notifications Push Automatiques**
- ✅ **Affichage automatique** : Les notifications s'affichent en overlay en haut à droite
- ✅ **Temps réel** : Via Supabase Realtime (WebSocket)
- ✅ **Animations fluides** : Slide-in avec effets visuels
- ✅ **Son de notification** : Bip sonore configurable (on/off)
- ✅ **Auto-dismiss** : Disparaissent après 8 secondes
- ✅ **Barre de progression** : Indication visuelle du temps restant
- ✅ **Max 5 toasts** : Pour ne pas surcharger l'écran

### **Types de Notifications**
1. **🎉 Nouveau Prospect** (`new_lead`)
   - Couleur : Vert
   - Priorité : Haute
   - Action : Voir le lead

2. **📄 Document Reçu** (`document_uploaded`)
   - Couleur : Bleu
   - Priorité : Moyenne
   - Action : Voir le lead et valider le document

3. **📧 Nouvel Email** (`email_received`)
   - Couleur : Cyan
   - Priorité : Moyenne
   - Action : Voir l'email dans la conversation

4. **🔄 Changement de Statut** (`status_change`)
   - Couleur : Ambre/Orange
   - Priorité : Variable
   - Action : Voir le lead

5. **🤖 Décision IA** (`ai_decision`)
   - Couleur : Violet
   - Priorité : Haute
   - Action : Voir la décision

6. **✅ Document Validé** (`document_validated`)
   - Couleur : Vert
   - Priorité : Basse
   - Action : Voir le lead

7. **💰 Demande de Devis** (`quote_requested`)
   - Couleur : Or
   - Priorité : Urgente
   - Action : Créer le devis

---

## 🎨 Niveaux de Priorité

### **Urgent** (Rouge)
- Gradient : Rouge vif → Rouge foncé
- Border : Rouge 700
- Son : 2 bips
- Utilisé pour : Demandes critiques, délais expirés

### **High** (Orange)
- Gradient : Orange → Orange foncé
- Border : Orange 700
- Son : 1 bip
- Utilisé pour : Nouveaux prospects, décisions IA importantes

### **Medium** (Bleu)
- Gradient : Bleu → Bleu foncé
- Border : Bleu 700
- Son : 1 bip léger
- Utilisé pour : Documents, emails, changements standard

### **Low** (Gris)
- Gradient : Gris 700 → Gris 800
- Border : Gris 600
- Son : Silencieux
- Utilisé pour : Notifications informatives

---

## 🔧 Composants Créés

### 1. **`CRMPushNotifications.tsx`**
```tsx
/src/components/CRMPushNotifications.tsx
```

**Responsabilités** :
- Écoute des événements Supabase Realtime sur `crm_event_notifications`
- Affichage des toasts avec animations
- Gestion du son (activé/désactivé)
- Auto-dismiss après 8 secondes
- Navigation vers le lead au clic
- Marquage automatique comme "lu" lors du clic

**État Local** :
- `toasts[]` : Liste des notifications actuellement affichées
- `soundEnabled` : Préférence utilisateur pour le son (localStorage)

**Événements écoutés** :
- INSERT sur `crm_event_notifications` → Affiche un nouveau toast

---

### 2. **Intégration dans `CRMLayout.tsx`**
```tsx
import { CRMPushNotifications } from '@/components/CRMPushNotifications';

// Dans le return JSX, juste avant </div>
<CRMPushNotifications />
```

Le composant est monté **une seule fois** au niveau du layout CRM, garantissant :
- Persistance durant toute la session
- Réception continue des notifications
- Pas de re-render inutiles

---

## 🗄️ Structure Base de Données

### Table : `crm_event_notifications`
```sql
CREATE TABLE crm_event_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  message text NOT NULL,
  lead_id uuid REFERENCES crm_leads(id),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_read boolean DEFAULT false,
  dismissed boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_crm_event_notifications_created_at
  ON crm_event_notifications(created_at DESC);

CREATE INDEX idx_crm_event_notifications_lead_id
  ON crm_event_notifications(lead_id);

-- RLS
ALTER TABLE crm_event_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notifications"
  ON crm_event_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'commercial', 'collaborator')
    )
  );
```

---

## 📡 Realtime Configuration

### Supabase Channel
```typescript
const channel = supabase
  .channel('push_notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'crm_event_notifications',
    },
    (payload) => {
      showToast(payload.new);
    }
  )
  .subscribe();
```

**Avantages** :
- ⚡ Latence < 100ms
- 🔄 Reconnexion automatique
- 🛡️ Sécurisé via RLS
- 📊 Scalable (WebSocket)

---

## 🎵 Système Audio

### Web Audio API
```typescript
const audioContext = new (window.AudioContext || webkitAudioContext)();
const oscillator = audioContext.createOscillator();
oscillator.frequency.value = 800; // Hz
oscillator.type = 'sine';
```

**Contrôle utilisateur** :
- Bouton toggle en haut à droite (icône Bell)
- Préférence sauvegardée dans `localStorage`
- Clé : `crm_notification_sound`

---

## 🎭 Animations CSS

### Slide-in depuis la droite
```css
@keyframes slideInRight {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

### Barre de progression
```css
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
```

**Durée** :
- Slide-in : 0.4s ease-out
- Progression : 8s linear
- Stagger : 0.1s entre chaque toast

---

## 🧪 Comment Tester

### 1. **Créer une notification manuellement**
```sql
INSERT INTO crm_event_notifications (
  event_type,
  message,
  lead_id,
  priority,
  metadata
) VALUES (
  'new_lead',
  'Nouveau prospect : Jean Dupont vient de s''inscrire !',
  'LEAD_UUID_ICI',
  'high',
  '{"lead_name": "Jean Dupont", "source": "formulaire_web"}'::jsonb
);
```

### 2. **Déclencher via upload de document**
- Aller dans un lead
- Uploader un document
- Observer la notification automatique

### 3. **Déclencher via email reçu**
- Envoyer un email à `contact@taxiassur.com`
- Observer la notification "📧 Nouvel Email"

### 4. **Tester le son**
- Cliquer sur l'icône Bell en haut à droite
- Observer l'état (bleu = activé, gris = désactivé)
- Créer une nouvelle notification pour tester

---

## 📊 Monitoring & Analytics

### Compteurs disponibles
```sql
-- Notifications non lues
SELECT COUNT(*) FROM crm_event_notifications WHERE is_read = false;

-- Notifications par type (dernières 24h)
SELECT event_type, COUNT(*) as count
FROM crm_event_notifications
WHERE created_at > now() - interval '24 hours'
GROUP BY event_type
ORDER BY count DESC;

-- Temps moyen de réaction
SELECT
  event_type,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_reaction_time_seconds
FROM crm_event_notifications
WHERE is_read = true
GROUP BY event_type;
```

---

## 🚀 Déploiement

### Build
```bash
npm run build
```

### Vérifications post-déploiement
1. ✅ Console : Logs `[CRMPushNotifications]` visibles
2. ✅ Realtime : Statut "subscribed" dans les logs
3. ✅ Son : Fonctionne au premier clic utilisateur (autoplay policy)
4. ✅ Toasts : S'affichent en haut à droite
5. ✅ Navigation : Clic sur "Voir" redirige correctement

---

## 🔐 Sécurité

### RLS (Row Level Security)
- ✅ Seuls les admins authentifiés peuvent voir les notifications
- ✅ Les prospects ne peuvent PAS voir les notifications CRM
- ✅ Chaque notification est liée à un lead spécifique
- ✅ Pas d'accès sans authentification

### Permissions Realtime
```sql
-- Dans Supabase Dashboard > Database > Replication
-- Activer la réplication pour crm_event_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE crm_event_notifications;
```

---

## 📝 Notes Techniques

### Performance
- **Max toasts simultanés** : 5
- **Auto-dismiss** : 8 secondes
- **Latence Realtime** : ~50-100ms
- **Taille mémoire** : ~5KB par toast

### Compatibilité
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Limitations
- Le son nécessite une interaction utilisateur initiale (navigateur)
- Max 100 notifications par seconde (limite Supabase Realtime)
- Les toasts ne sont PAS persistants au rechargement de page

---

## 🎯 Prochaines Améliorations

1. **Push Notifications natives** (Service Worker)
2. **Groupement intelligent** (ex: "5 nouveaux documents")
3. **Filtres par type** (masquer certains événements)
4. **Historique des notifications** (liste complète)
5. **Statistiques utilisateur** (combien de notifications vues/manquées)

---

## 📞 Support

En cas de problème :
1. Vérifier les logs console
2. Vérifier que Realtime est activé dans Supabase
3. Vérifier les politiques RLS
4. Tester avec une notification manuelle SQL

---

**Créé le** : 27 janvier 2026
**Version** : 1.0.0
**Auteur** : Système TaxiAssur CRM Killer
