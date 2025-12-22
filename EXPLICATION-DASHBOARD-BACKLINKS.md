# 📊 EXPLICATION DASHBOARD BACKLINKS

## POURQUOI TOUT EST À 0 ?

### Situation actuelle
✅ **27 sites scrapés**  
✅ **16 opportunités en status "pending"** (avec emails valides)  
❌ **0 emails envoyés**  
❌ **0 sites contactés**

### Pourquoi les compteurs sont à 0 ?

Le dashboard compte les données depuis **2 tables différentes** :

#### 1. Table `backlink_opportunities`
Contient les sites scrapés avec leur status :
- `new` = Scanné mais pas encore traité
- `pending` = Prêt à contacter (avec email)
- `contacted` = Email déjà envoyé
- `responded` = A répondu
- `acquired` = Backlink obtenu

#### 2. Table `backlink_outreach_log`
Contient l'historique de **tous les emails envoyés** avec :
- `action_type = 'email_sent'` → Email envoyé
- `action_type = 'email_opened'` → Email ouvert
- `action_type = 'email_replied'` → Email répondu

### Le problème
Vos opportunités sont en **"pending"** mais **aucun email n'a été envoyé**.

Le status "pending" signifie **"prêt à envoyer"**, pas **"envoyé"**.

---

## COMMENT ENVOYER LES EMAILS

### Méthode 1 : Bouton "Envoyer Emails" (NOUVEAU)
1. Aller sur https://taxiassur.com/backoffice/backlink-reports
2. Voir l'alerte bleue : **"16 emails prêts à envoyer"**
3. Cliquer sur le bouton bleu **"Envoyer Emails"**
4. Confirmer : **"Envoyer 5 emails maintenant ?"**
5. Attendre 10-30 secondes
6. Message : **"✅ 5 emails envoyés !"**
7. Cliquer sur **"Actualiser"**
8. Le dashboard affiche maintenant :
   - **Emails Envoyés : 5**
   - **Sites Contactés : 5**

### Méthode 2 : SQL manuel (ancienne méthode)
Exécuter `FIX-BACKLINK-ENVOI-FINAL-V3.sql` dans Supabase

### Méthode 3 : Automatique (cron job)
Un cron job envoie **5 emails/jour à 10h** automatiquement.

---

## APRÈS ENVOI, QUE VERREZ-VOUS ?

### Dashboard mis à jour
```
Sites Scrapés : 27
Emails Envoyés : 5  ← Nouvelles données !
Réponses : 0        (normal, il faut attendre 24-48h)
Backlinks Acquis : 0
```

### Détail des Relances
```
Sites Contactés : 5
1ère Relance : 0
2ème Relance : 0
3ème Relance : 0
```

### Dans 7 jours
Si pas de réponse, relance automatique :
```
1ère Relance : 5
```

### Dans 30 jours
Résultat attendu :
```
Emails Envoyés : 16 (tous les emails pending)
Réponses positives : 3-5
Backlinks Acquis : 1-2
```

---

## PRÉREQUIS IMPORTANT

### SendGrid API Key
Pour que les emails partent **réellement** :

1. **Créer compte SendGrid** (gratuit 100 emails/jour)
   - https://signup.sendgrid.com/

2. **Obtenir API Key**
   - Dashboard → Settings → API Keys
   - Create API Key → Full Access
   - Copier la clé : `SG.xxxxxxxxxxxxx`

3. **Configurer dans Supabase**
   - Supabase Dashboard
   - Project Settings → Edge Functions → Secrets
   - Add secret : `SENDGRID_API_KEY = SG.xxxxxxxxxxxxx`

⚠️ **Sans SendGrid**, le bouton retournera une erreur.

---

## VÉRIFICATION TECHNIQUE

### Tables concernées
```sql
-- Voir les opportunités "pending"
SELECT domain, contact_email, status
FROM backlink_opportunities
WHERE status = 'pending' AND contact_email IS NOT NULL;

-- Résultat : 16 lignes

-- Voir les emails envoyés
SELECT * FROM backlink_outreach_log
WHERE action_type = 'email_sent';

-- Résultat : 0 lignes (pour l'instant)
```

### Après envoi de 5 emails
```sql
-- Voir les emails envoyés
SELECT 
  bl.recipient_email,
  bl.created_at,
  bo.domain
FROM backlink_outreach_log bl
LEFT JOIN backlink_opportunities bo ON bl.opportunity_id = bo.id
WHERE bl.action_type = 'email_sent'
ORDER BY bl.created_at DESC;

-- Résultat : 5 lignes

-- Voir les opportunités contactées
SELECT domain, status, contacted_at
FROM backlink_opportunities
WHERE status = 'contacted';

-- Résultat : 5 lignes
```

---

## WORKFLOW COMPLET

### 1. Scraping (automatique, quotidien)
- Cron job scan 10 nouveaux sites/jour
- Ajoute dans `backlink_opportunities` avec status `new`
- Si email trouvé → passe automatiquement en `pending`

### 2. Envoi initial (manuel ou auto)
- Prend 5 opportunités `pending`
- Envoie email personnalisé via SendGrid
- Crée log dans `backlink_outreach_log`
- Change status `pending` → `contacted`

### 3. Relances automatiques
- J+7 si pas de réponse → 1ère relance
- J+14 si pas de réponse → 2ème relance
- J+21 si pas de réponse → 3ème relance

### 4. Réponses
- Email positif → status `responded` + sentiment `positive`
- Email négatif → status `rejected` + sentiment `negative`
- Backlink vérifié → status `acquired`

---

## AMÉLIORATION AJOUTÉE

### Alerte visuelle
Quand il y a des emails en attente, une bannière bleue s'affiche :

```
🔵 16 emails prêts à envoyer
Cliquez sur le bouton "Envoyer Emails" ci-dessus pour lancer 
la campagne d'outreach. Les emails seront envoyés aux sites 
scrapés avec un message personnalisé.
```

### Bouton "Envoyer Emails"
- Bleu, visible dans le header
- Demande confirmation avant envoi
- Affiche résultat : "✅ 5 emails envoyés !"
- Rafraîchit automatiquement le dashboard

---

## TROUBLESHOOTING

### "Erreur envoi emails"
**Cause** : SendGrid API Key manquante  
**Solution** : Configurer dans Supabase Secrets

### "0 emails envoyés" après clic
**Cause** : Edge Function pas déployée  
**Solution** : Vérifier Supabase Dashboard → Edge Functions

### "Toujours en pending"
**Cause** : Pas cliqué sur "Envoyer Emails"  
**Solution** : Cliquer sur le bouton bleu dans le header

---

## FICHIERS MODIFIÉS

1. `BacklinkReports.tsx` :
   - ✅ Ajout bouton "Envoyer Emails"
   - ✅ Ajout alerte visuelle
   - ✅ Appel Edge Function `backlink-auto-outreach`

2. `FIX-BACKLINK-ENVOI-FINAL-V3.sql` :
   - ✅ Change "new" → "pending"
   - ✅ Crée campagne active
   - ✅ Trigger automatique

3. `EXPLICATION-DASHBOARD-BACKLINKS.md` :
   - ✅ Ce document explicatif
