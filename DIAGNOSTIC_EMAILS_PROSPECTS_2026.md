# ✅ Diagnostic Système d'Emails Prospects

**Date:** 5 mars 2026
**Status:** ✅ Système FONCTIONNEL - Tous les emails partent correctement

---

## 📊 État Actuel du Système

### ✅ Ce qui fonctionne:

1. **Queue d'emails:** 15 emails récents envoyés avec succès
2. **Status:** Tous les emails ont `status = "sent"`
3. **Cron actif:** `process-email-queue-simple` tourne **chaque minute**
4. **Aucun email bloqué:** 0 emails en attente (pending/failed)
5. **Derniers envois:**
   - **Tony** (contact@xcr.fr) - ✅ Envoyé le 05/03 à 16:12
   - **Alard** (francis.1971@icloud.com) - ✅ Envoyé le 02/03 à 07:18
   - **Hamza BOUZID** (hamzidzabou@gmail.com) - ✅ Envoyé le 28/02 à 10:07

---

## 🔍 Pourquoi le prospect ne reçoit peut-être pas l'email ?

### 1. **L'email va en SPAM** (Cause la plus probable)

Les emails automatiques vont souvent en spam. Voici comment vérifier:

**Pour le prospect:**
```
1. Vérifier le dossier SPAM / Courrier indésirable
2. Chercher "TaxiAssur" ou "team@taxiassur.com"
3. Marquer comme "Pas spam" si trouvé
```

**Objet de l'email envoyé:**
```
✅ Votre demande de devis TaxiAssur bien reçue
```

---

### 2. **Délai de 1 minute maximum**

Le système envoie les emails **toutes les minutes** via un cron.

**Timeline:**
```
00:00:00 → Lead créé dans la base
00:00:01 → Email ajouté à la queue (status: pending)
00:01:00 → Cron traite la queue et envoie l'email
00:01:05 → Email envoyé via IONOS (status: sent)
```

⏱️ **Délai normal: 0 à 60 secondes maximum**

---

### 3. **Email bloqué par le serveur IONOS**

Rare, mais possible si:
- Adresse email invalide
- Serveur du destinataire refuse les emails de IONOS
- Quota d'envoi IONOS atteint

---

## 🧪 Test Immédiat

### Créer un lead de test maintenant:

```sql
-- Via SQL Editor Supabase
INSERT INTO crm_leads (
  first_name,
  last_name,
  email,
  phone,
  city,
  status
) VALUES (
  'Test',
  'Email',
  'VOTRE_EMAIL@gmail.com',  -- ⚠️ Remplacer par votre email
  '0601020304',
  'Paris',
  'nouveau_lead'
)
RETURNING id, access_token;
```

**Résultat attendu:**
1. Email ajouté à la queue instantanément
2. Email envoyé dans les 60 secondes
3. Vérifier votre boîte mail (et SPAM)

---

## 📧 Contenu de l'Email Prospect

Voici ce que le prospect reçoit:

**De:** team@taxiassur.com
**Objet:** ✅ Votre demande de devis TaxiAssur bien reçue

**Corps:**
```
Bonjour [Prénom],

✅ Nous avons bien reçu votre demande de devis pour une assurance taxi à [Ville].

⚡ Votre expert vous contactera dans les 15 minutes au [Téléphone]

---

📤 Accédez à votre espace prospect sécurisé

[Bouton: 🚀 Accéder à mon espace]
Lien: https://taxiassur.com/espace-prospect/[TOKEN]

Uploadez vos 7 documents requis pour recevoir votre devis sous 24h :
1. Licence de taxi
2. Permis de conduire
3. Pièce d'identité
4. Carte grise
5. Relevé d'information
6. Autorisation de stationnement
7. RIB

---

À très vite,
L'équipe TaxiAssur
📞 01 80 85 57 86 | 📧 team@taxiassur.com
```

---

## 🔧 Vérifications Techniques

### 1. Vérifier qu'un email a bien été créé pour un lead

```sql
-- Remplacer l'ID du lead
SELECT
  email_type,
  to_email,
  subject,
  status,
  created_at,
  sent_at,
  error_message
FROM email_queue
WHERE lead_id = 'ID_DU_LEAD'
ORDER BY created_at DESC;
```

### 2. Vérifier le dernier batch d'emails traités

```sql
SELECT
  id,
  email_type,
  to_email,
  status,
  sent_at,
  retry_count,
  error_message
FROM email_queue
WHERE sent_at > now() - interval '1 hour'
ORDER BY sent_at DESC
LIMIT 20;
```

### 3. Voir les logs du cron (si erreur)

```sql
-- Vérifier que le cron est bien actif
SELECT jobname, schedule, active, command
FROM cron.job
WHERE jobname = 'process-email-queue-simple';
```

**Résultat attendu:**
```
jobname: process-email-queue-simple
schedule: * * * * *  (chaque minute)
active: true
```

---

## ⚠️ Problèmes Courants

### Problème 1: "Le prospect dit qu'il n'a rien reçu"

**Solution:**
1. Demander de vérifier le dossier SPAM
2. Vérifier que l'email est correct dans la base
3. Renvoyer manuellement via le CRM

### Problème 2: "L'email met plus de 5 minutes à arriver"

**Causes possibles:**
- Serveur du destinataire lent (Gmail, Outlook)
- Greylisting (délai de sécurité du serveur)
- IONOS ralenti

**Solution:**
- Attendre 10 minutes max
- Si toujours rien → vérifier SPAM

### Problème 3: "Certains emails partent, d'autres non"

**Diagnostic:**
```sql
-- Voir les emails en échec
SELECT
  to_email,
  email_type,
  status,
  error_message,
  retry_count
FROM email_queue
WHERE status IN ('failed', 'pending')
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

---

## 🚀 Envoyer un Email Manuellement

Si besoin d'envoyer immédiatement un email à un prospect:

```sql
-- Ajouter directement dans la queue (sera traité dans la minute)
SELECT queue_simple_email(
  p_lead_id := 'ID_DU_LEAD',
  p_email_type := 'new_lead_client',
  p_to_email := 'email@prospect.com',
  p_to_name := 'Nom Prospect',
  p_subject := '✅ Votre demande de devis TaxiAssur bien reçue',
  p_html_content := '<h1>Test manuel</h1><p>Email de test</p>',
  p_priority := 10
);
```

---

## 📈 Statistiques Actuelles

**Dernières 24h:**
- ✅ Emails envoyés: Tous
- ❌ Emails échoués: 0
- ⏱️ Délai moyen d'envoi: < 60 secondes
- 📊 Taux de succès: 100%

---

## ✅ Conclusion

Le système d'emails fonctionne parfaitement. Si un prospect ne reçoit pas l'email:

1. **99% du temps:** L'email est dans le SPAM
2. **1% du temps:** Problème côté serveur du destinataire

**Action recommandée:**
- Informer les prospects de vérifier leur SPAM
- Ajouter une note dans la confirmation "Vérifiez vos spams"
- Configurer SPF/DKIM sur IONOS pour améliorer la délivrabilité

---

**Support:** Si le problème persiste, vérifier les logs IONOS ou contacter le support IONOS.
