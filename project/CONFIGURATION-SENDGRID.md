# ⚡ CONFIGURATION SENDGRID - GUIDE RAPIDE (15 MIN)

## ÉTAPE 1 : CRÉER LE COMPTE (3 MIN)

### A) Inscription SendGrid

1. **Allez sur :** https://signup.sendgrid.com/

2. **Remplissez le formulaire :**
   ```
   Email : votre_email@gmail.com
   Password : (créez un mot de passe fort)
   ```

3. **Vérifiez votre email**
   - Cliquez sur le lien reçu par email
   - Confirmez votre compte

4. **Choisissez votre plan :**
   ```
   FREE PLAN : 100 emails/jour (pour tester)
   OU
   ESSENTIALS : 19$/mois = 50 000 emails/mois (recommandé)
   ```

---

## ÉTAPE 2 : VÉRIFIER VOTRE DOMAINE (5 MIN)

### A) Authentification Domaine (CRITIQUE)

1. **Dans SendGrid Dashboard :**
   ```
   Settings → Sender Authentication → Authenticate Your Domain
   ```

2. **Entrez votre domaine :**
   ```
   Domain : taxiassur.com
   ```

3. **SendGrid vous donne 3 enregistrements DNS :**

   ```
   Exemple (vos valeurs seront différentes) :

   Type : CNAME
   Host : em7234
   Value : u7234567.wl123.sendgrid.net

   Type : CNAME
   Host : s1._domainkey
   Value : s1.domainkey.u7234567.wl123.sendgrid.net

   Type : CNAME
   Host : s2._domainkey
   Value : s2.domainkey.u7234567.wl123.sendgrid.net
   ```

### B) Ajoutez dans IONOS DNS

1. **Connectez-vous à IONOS :**
   ```
   https://www.ionos.fr/
   → Domaines & SSL
   → taxiassur.com
   → Gérer DNS
   ```

2. **Ajoutez les 3 enregistrements CNAME**

3. **Attendez 5-10 minutes** (propagation DNS)

4. **Vérifiez dans SendGrid :**
   ```
   Cliquez "Verify" dans SendGrid
   ✅ "Authenticated" doit apparaître
   ```

---

## ÉTAPE 3 : CRÉER LA CLÉ API (2 MIN)

### A) Génération de la Clé

1. **Dans SendGrid :**
   ```
   Settings → API Keys → Create API Key
   ```

2. **Configuration :**
   ```
   API Key Name : TaxiAssur Production
   API Key Permissions : Full Access
   ```

3. **Cliquez "Create & View"**

4. **COPIEZ LA CLÉ** (elle commence par `SG.`) :
   ```
   SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   ⚠️ **IMPORTANT : Elle ne sera affichée qu'une seule fois !**

---

## ÉTAPE 4 : AJOUTER DANS SUPABASE (2 MIN)

### A) Via Dashboard Supabase

1. **Allez sur :** https://supabase.com/dashboard

2. **Sélectionnez votre projet TaxiAssur**

3. **Naviguez vers :**
   ```
   Project Settings → Edge Functions → Secrets
   ```

4. **Cliquez "New Secret"**

5. **Ajoutez la clé :**
   ```
   Name : SENDGRID_API_KEY
   Value : SG.xxxxxxxxxxx (collez votre clé)
   ```

6. **Cliquez "Save"**

---

## ÉTAPE 5 : TESTER L'ENVOI (3 MIN)

### A) Test depuis le Terminal

```bash
# Remplacez VOTRE_URL par votre URL Supabase
curl -X POST https://VOTRE_URL.supabase.co/functions/v1/send-outreach-emails \
-H "Content-Type: application/json" \
-d '{
  "action": "send_single",
  "emailData": {
    "to_email": "VOTRE_EMAIL@gmail.com",
    "subject": "Test TaxiAssur - Email Automatique",
    "body": "Bonjour,\n\nCeci est un test d'envoi automatique depuis le système TaxiAssur.\n\nSi vous recevez cet email, tout fonctionne parfaitement !\n\nCordialement,\nL'équipe TaxiAssur",
    "template_type": "test"
  }
}'
```

### B) Vérifications

1. **Vérifiez votre boîte email**
   - Email reçu en < 10 secondes ✅
   - Expéditeur : contact@taxiassur.com ✅

2. **Si email non reçu :**
   - Vérifiez les SPAMS
   - Vérifiez authentification domaine dans SendGrid
   - Consultez Activity Feed dans SendGrid Dashboard

---

## 🎯 CHECKLIST FINALE

- [ ] Compte SendGrid créé
- [ ] Plan sélectionné (Free ou Essentials)
- [ ] Domaine authentifié (3 CNAME ajoutés)
- [ ] Clé API générée
- [ ] Clé ajoutée dans Supabase Secrets
- [ ] Email de test envoyé
- [ ] Email de test reçu ✅

---

## 🔧 TROUBLESHOOTING

### Problème 1 : Email Non Reçu

**Cause possible :** Domaine non authentifié

**Solution :**
```
SendGrid → Settings → Sender Authentication
→ Vérifier que "Authenticated" est vert ✅
→ Si rouge, vérifier DNS IONOS
```

### Problème 2 : Erreur API Key

**Cause possible :** Clé mal copiée ou permissions insuffisantes

**Solution :**
```
1. Générer nouvelle clé dans SendGrid
2. Permissions : Full Access
3. Copier TOUTE la clé (commence par SG.)
4. Remplacer dans Supabase Secrets
```

### Problème 3 : DNS Non Propagé

**Cause possible :** Délai de propagation DNS

**Solution :**
```
Attendre 10-30 minutes
Vérifier avec : https://dnschecker.org/
Rechercher : em7234.taxiassur.com
```

### Problème 4 : Quota Dépassé

**Cause possible :** Plan Free (100 emails/jour)

**Solution :**
```
Upgrade vers Essentials (19$/mois)
OU
Attendre 24h pour reset quota
```

---

## 💰 COÛTS SENDGRID

### Plan FREE
- **Prix :** 0€
- **Emails :** 100/jour (3000/mois)
- **Limites :** Pas d'IP dédiée
- **Bon pour :** Tests, démarrage

### Plan ESSENTIALS (Recommandé)
- **Prix :** 19$/mois (~18€)
- **Emails :** 50 000/mois
- **Inclus :** Support, Analytics, Templates
- **Bon pour :** Production, scaling

### Plan PRO
- **Prix :** 89$/mois (~83€)
- **Emails :** 100 000/mois
- **Inclus :** IP dédiée, support prioritaire
- **Bon pour :** Volume élevé

---

## 📊 MÉTRIQUES À SURVEILLER

### Dashboard SendGrid

1. **Activity Feed**
   - Emails envoyés
   - Emails livrés
   - Bounces (échecs)
   - Spam reports

2. **Stats**
   - Taux d'ouverture (objectif : >40%)
   - Taux de clic (objectif : >15%)
   - Bounces (objectif : <2%)
   - Spam (objectif : <0.1%)

3. **Alerts**
   - Configurer alertes si :
     - Bounce rate > 5%
     - Spam rate > 0.5%
     - Quota atteint 80%

---

## 🎉 CONFIGURATION TERMINÉE !

Vous êtes maintenant prêt à envoyer **50 000 emails/mois** automatiquement !

**Prochaine étape :**
```
→ Ajoutez les 20 prospects
→ Lancez la première campagne
→ Observez les résultats arriver ! 🚀
```

---

## 📞 SUPPORT SENDGRID

**Documentation :** https://docs.sendgrid.com/
**Support :** https://support.sendgrid.com/
**Status :** https://status.sendgrid.com/

---

**Temps total : ~15 minutes**
**Difficulté : ★☆☆☆☆ (Facile)**
**Résultat : Emails automatiques fonctionnels ! ✅**
