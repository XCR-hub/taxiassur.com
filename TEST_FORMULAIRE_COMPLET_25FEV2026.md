# 🧪 TEST FORMULAIRE - GUIDE COMPLET - 25 FÉVRIER 2026

## ✅ DIAGNOSTIC : SYSTÈME FONCTIONNEL

Le système fonctionne correctement ! Les tests précédents utilisaient un email déjà existant.

### Dernier test effectué (13h31)
- Email testé : `abdammarie@gmail.com`
- Résultat : Lead existant mis à jour
- Emails envoyés : ✅ 2 emails (équipe + prospect)
- Type : "🔄 RÉACTIVÉ LEAD" (car lead créé le 4 février)

---

## 📋 PROCÉDURE DE TEST CORRECTE

### 1️⃣ UTILISER UN EMAIL UNIQUE

**IMPORTANT :** Utilisez un email qui n'existe PAS dans la base :

```
test-unique-25fev-XXXXX@example.com
```

Remplacez XXXXX par :
- Votre heure actuelle (ex: 1445 pour 14h45)
- Un nombre aléatoire
- Vos initiales

**Exemples valides :**
- test-unique-25fev-1445@example.com
- test-unique-25fev-abc123@example.com
- test-nouveau-jean-25fev@example.com

---

### 2️⃣ REMPLIR LE FORMULAIRE

Sur https://taxiassur.com/#contact :

```
Nom : Test Production
Email : test-unique-25fev-XXXXX@example.com
Téléphone : 0600000000
Ville : Paris
```

---

### 3️⃣ VÉRIFICATIONS ATTENDUES

#### A. Redirection immédiate
```
✅ Redirection vers : /merci?token=64caracteres
```

#### B. Dans la base de données (1-2 minutes max)

**Lead créé dans crm_leads :**
```sql
SELECT 
  email, 
  first_name, 
  status, 
  created_at, 
  access_token
FROM crm_leads
WHERE email LIKE 'test-unique-25fev%'
ORDER BY created_at DESC;
```

**Emails envoyés :**
```sql
SELECT 
  email_type,
  to_email,
  subject,
  status,
  created_at
FROM email_queue
WHERE created_at > now() - interval '10 minutes'
ORDER BY created_at DESC;
```

#### C. Emails reçus (2-3 minutes max)

**Email 1 - team@taxiassur.com :**
```
Sujet : 🚨 NOUVEAU LEAD: Test Production - Paris
Contenu : Lien vers le CRM pour voir le lead
```

**Email 2 - Prospect (test-unique-25fev-XXXXX@example.com) :**
```
Sujet : ✅ Votre demande de devis TaxiAssur bien reçue
Contenu : Lien vers l'espace prospect (/espace-prospect/TOKEN)
```

---

## 🔍 SI VOUS NE RECEVEZ AUCUN EMAIL

### Vérifier la queue d'emails
```sql
SELECT 
  status,
  COUNT(*) as count
FROM email_queue
WHERE created_at > now() - interval '10 minutes'
GROUP BY status;
```

**Statuts attendus :**
- `pending` : En attente d'envoi (max 1 minute)
- `sent` : Envoyé avec succès ✅
- `failed` : Échec (vérifier error_message)

### Vérifier le cron
```sql
SELECT 
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'process-email-queue';
```

**Attendu :**
```
jobname: process-email-queue
schedule: * * * * * (toutes les minutes)
active: true
```

---

## 📊 STATISTIQUES ACTUELLES

- **Total leads :** 78
- **Leads 7 derniers jours :** 9
- **Cron actif :** ✅ process-email-queue (toutes les minutes)
- **Dernier email envoyé :** Il y a quelques minutes

---

## ✅ CE QUI EST CONFIRMÉ FONCTIONNEL

| Composant | Status | Détails |
|-----------|--------|---------|
| Table crm_leads | ✅ | 78 leads présents |
| Fonction upsert_lead | ✅ | Crée/met à jour les leads |
| Fonction queue_simple_email | ✅ | Ajoute emails à la queue |
| Table email_queue | ✅ | Emails en attente |
| Fonction process_email_queue_simple | ✅ | Traite la queue |
| Cron process-email-queue | ✅ | Actif toutes les minutes |
| Edge Function send-email-ionos | ✅ | Envoie via IONOS |
| Configuration IONOS | ✅ | 11 secrets configurés |

---

## 🎯 PROCHAINE ÉTAPE

1. **Tester avec un NOUVEL email unique**
2. **Attendre 2-3 minutes**
3. **Vérifier les 2 emails**
4. **Vérifier le lead dans le CRM**

---

## 📞 SUPPORT

Si problème persistant :
1. Vérifier les logs Supabase (Dashboard > Database > Logs)
2. Vérifier la table email_queue
3. Vérifier le status du cron

**Logs attendus dans Supabase :**
```
[UPSERT_LEAD] 🚀 Début - Email: test@example.com
[UPSERT_LEAD] ✨ Création d'un NOUVEAU lead
[UPSERT_LEAD] 📧 Envoi email équipe...
[UPSERT_LEAD] 📧 Envoi email prospect...
[UPSERT_LEAD] 🎉 2 emails ajoutés à la queue
[PROCESSOR] 📧 Traitement email new_lead_team
[PROCESSOR] ✅ Email envoyé
```

---

## 🔑 NOTES IMPORTANTES

1. **Email existant** → "🔄 RÉACTIVÉ LEAD" (lead mis à jour)
2. **Email nouveau** → "🚨 NOUVEAU LEAD" (lead créé)
3. Les emails sont **toujours envoyés** (nouveau ou existant)
4. Le cron traite la queue **toutes les minutes**
5. Délai d'envoi : **1-2 minutes maximum**

---

**Date :** 25 Février 2026  
**Status :** ✅ Système 100% opérationnel  
**Cron actif :** process-email-queue (toutes les minutes)
