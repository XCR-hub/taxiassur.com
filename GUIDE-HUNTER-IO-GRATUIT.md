# 🎯 GUIDE: Hunter.io - 25 Emails Gratuits/Mois

**Objectif:** Extraire automatiquement les emails de contact des sites détectés

---

## 📋 ÉTAPE 1: CRÉER UN COMPTE HUNTER.IO (GRATUIT)

### **A) Inscription**

1. Allez sur: https://hunter.io/users/sign_up
2. Remplissez le formulaire:
   - Email professionnel
   - Mot de passe
   - Nom de votre entreprise: `TaxiAssur`
3. Vérifiez votre email
4. Cliquez sur le lien de confirmation

### **B) Plan Gratuit**

✅ **Inclus dans le plan gratuit:**
- **25 recherches d'emails/mois**
- Email Finder (trouver emails par domaine)
- Email Verifier (vérifier validité)
- API Access

❌ **Non inclus:**
- Bulk tasks (exports massifs)
- Campaigns (sequences emails)

**💡 Astuce:** 25 emails/mois = ~6 opportunités de backlinks/semaine = **Suffisant pour démarrer!**

---

## 🔑 ÉTAPE 2: OBTENIR VOTRE CLÉ API

### **A) Accéder à l'API Key**

1. Connectez-vous: https://hunter.io/users/sign_in
2. Cliquez sur votre profil (coin haut droite)
3. Menu: **"API"**
4. Ou accès direct: https://hunter.io/api-keys

### **B) Copier la Clé**

```
Vous verrez:
┌─────────────────────────────────────────────────────┐
│ Your API Key                                        │
│ ••••••••••••••••••••••••••••••••••••••••••••••••••  │
│ [Show] [Copy]                                       │
└─────────────────────────────────────────────────────┘
```

1. Cliquez sur **[Show]**
2. Cliquez sur **[Copy]**
3. La clé ressemble à: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

## 🔐 ÉTAPE 3: AJOUTER LA CLÉ DANS SUPABASE

### **Option A: Via Dashboard Supabase** ⭐ **RECOMMANDÉ**

1. Allez sur: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
2. Menu latéral: **"Settings"** → **"Vault"**
3. Cliquez sur **"New Secret"**
4. Remplissez:
   ```
   Name:  HUNTER_IO_API_KEY
   Secret: [COLLEZ VOTRE CLÉ ICI]
   ```
5. Cliquez **"Save"**

### **Option B: Via SQL Editor**

1. Allez dans **"SQL Editor"**
2. Exécutez:
   ```sql
   SELECT vault.create_secret(
     'HUNTER_IO_API_KEY',
     'VOTRE_CLE_API_ICI'
   );
   ```

---

## ✅ ÉTAPE 4: VÉRIFIER L'INSTALLATION

### **Test SQL dans Supabase**

Exécutez dans **SQL Editor**:

```sql
-- Vérifier que le secret existe
SELECT 
  name, 
  created_at,
  'Secret exists ✅' as status
FROM vault.secrets
WHERE name = 'HUNTER_IO_API_KEY';

-- Résultat attendu:
-- name                  | created_at              | status
-- HUNTER_IO_API_KEY     | 2025-10-23 15:30:00    | Secret exists ✅
```

---

## 🧪 ÉTAPE 5: TESTER HUNTER.IO

### **Test Externe (dans votre navigateur)**

Ouvrez cette URL (remplacez `VOTRE_CLE` par votre vraie clé):

```
https://api.hunter.io/v2/domain-search?domain=mma.fr&api_key=VOTRE_CLE&limit=1
```

**Réponse attendue:**
```json
{
  "data": {
    "domain": "mma.fr",
    "emails": [
      {
        "value": "contact@mma.fr",
        "type": "generic",
        "confidence": 95,
        "first_name": null,
        "last_name": null,
        "position": null
      }
    ]
  },
  "meta": {
    "requests": {
      "used": 1,
      "available": 24
    }
  }
}
```

✅ Si vous voyez `"used": 1, "available": 24"` → **FONCTIONNE!**

---

## 📊 ÉTAPE 6: MONITORER VOTRE QUOTA

### **Dashboard Hunter.io**

https://hunter.io/api-keys

Vous verrez:
```
Monthly Requests
━━━━━━━━━━━━━━━━━━━━ 24/25 (96%)

Last request: 2 minutes ago
Next reset: in 12 days
```

### **Optimiser les 25 Requêtes**

**✅ BON Usage:**
- 1 requête = 1 domaine complet scanné
- Récupère tous les emails d'un site
- Priorisez emails génériques (contact@, info@)

**❌ MAUVAIS Usage:**
- Ne pas faire 1 requête par email
- Ne pas tester avec votre propre domaine

---

## 🚀 ÉTAPE 7: DÉPLOYER L'EDGE FUNCTION

La fonction `scan-backlinks` utilise maintenant Hunter.io automatiquement:

```bash
# Déployer la fonction mise à jour
supabase functions deploy scan-backlinks
```

**Comportement:**
1. Si `HUNTER_IO_API_KEY` existe → utilise Hunter.io
2. Si absente → continue sans extraction email (fallback gracieux)

---

## 🎯 RÉSULTATS ATTENDUS

### **Avec Hunter.io Configuré:**

```
Scan quotidien (6h):
├─ Google CSE trouve 30-50 opportunités/jour
├─ Hunter.io extrait emails pour les 30-50 sites
├─ Quota: 25 emails/mois → ~6 sites/semaine avec email
└─ Sauvegarde dans backlink_opportunities

Outreach automatique (10h, lun-ven):
├─ Envoie 10 emails/jour max
├─ Uniquement aux sites avec contact_email rempli
└─ Logs dans backlink_outreach_log
```

### **Métriques Prévues (Mois 1):**

| Métrique | Sans Hunter.io | Avec Hunter.io |
|----------|----------------|----------------|
| Opportunités détectées | 300-500 | 300-500 |
| Emails trouvés | 0 | **25** ✅ |
| Emails envoyés | 0 | **~20** ✅ |
| Taux de réponse estimé | N/A | **5-10%** |
| Backlinks acquis | 0 | **1-2** 🎯 |

---

## 💰 UPGRADE PLAN (OPTIONNEL)

Si 25 emails/mois ne suffisent plus:

### **Plan Starter - $49/mois**
- **500 recherches/mois**
- Email Verifier illimité
- Chrome Extension
- Support prioritaire

**ROI:** Si 1 backlink DA40+ = +10% trafic → Rentable dès 2-3 backlinks/mois

---

## 🛟 DÉPANNAGE

### **Erreur: "Invalid API key"**

```bash
# Vérifiez le secret dans Supabase
SELECT name FROM vault.secrets WHERE name = 'HUNTER_IO_API_KEY';

# Si vide, recréez:
SELECT vault.create_secret('HUNTER_IO_API_KEY', 'VOTRE_VRAIE_CLE');
```

### **Erreur: "Quota exceeded"**

- Attendez le 1er du mois pour reset
- Ou upgrade vers plan payant
- Ou désactivez temporairement Hunter.io (le système continue de fonctionner)

### **Aucun Email Trouvé**

**Normal pour:**
- Sites personnels/blogs
- Nouveaux domaines (<6 mois)
- Sites sans pages "Contact"

**Solution:**
- Le système marque `contact_email = NULL`
- Ces opportunités peuvent être contactées manuellement via backoffice

---

## ✅ CHECKLIST FINALE

- [ ] Compte Hunter.io créé (gratuit)
- [ ] Clé API copiée
- [ ] Secret `HUNTER_IO_API_KEY` ajouté dans Supabase Vault
- [ ] Test SQL réussi (secret existe)
- [ ] Test API Hunter.io réussi (24/25 disponible)
- [ ] Edge function `scan-backlinks` redéployée
- [ ] Cron job `daily_backlink_scan` actif
- [ ] Premier scan testé → emails extraits ✅

---

## 📞 SUPPORT

**Hunter.io:**
- Docs: https://hunter.io/api-docs/v2
- Support: support@hunter.io
- Status: https://status.hunter.io

**Questions fréquentes:**
- "Puis-je utiliser plusieurs API keys?" → Non, 1 compte = 1 clé
- "Le quota se cumule?" → Non, reset le 1er de chaque mois
- "Puis-je partager mon compte?" → Non, contre ToS
