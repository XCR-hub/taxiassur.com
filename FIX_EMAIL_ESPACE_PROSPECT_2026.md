# Fix : Erreur lors de l'envoi de l'email d'accès espace prospect

## Problème

Lors du clic sur le bouton "Envoyer accès espace prospect" dans le CRM, une erreur générique s'affichait :

```
taxiassur.com indique
Erreur lors de l'envoi de l'email
```

Sans détails sur la cause réelle du problème.

---

## Diagnostic

### 1. **Gestion d'erreur insuffisante dans le frontend**

Le code dans `CRMLeadDetail.tsx` ne capturait pas les détails de l'erreur :

```typescript
// ❌ AVANT (pas de détails d'erreur)
const { error } = await supabase.functions.invoke('send-email-universal', {
  body: { ... }
});

if (error) throw error;
alert('Email d\'accès envoyé avec succès !');
```

### 2. **Pas de logs diagnostiques dans Edge Function**

La fonction `send-email-universal` ne loggait pas la configuration SMTP, rendant le diagnostic difficile.

### 3. **Secret SMTP potentiellement manquant**

Il y avait deux noms de secrets possibles :
- `IONOS_EMAIL_PASSWORD` (utilisé dans le code)
- `IONOS_SMTP_PASSWORD` (présent dans Supabase)

La fonction ne gérait qu'un seul nom.

---

## Solutions Implémentées

### ✅ 1. Amélioration gestion d'erreur frontend

**Fichier** : `src/backoffice/CRMLeadDetail.tsx`

```typescript
// ✅ APRÈS (détails complets de l'erreur)
const { data, error } = await supabase.functions.invoke('send-email-universal', {
  body: { ... }
});

if (error) {
  console.error('Edge Function error:', error);
  throw new Error(error.message || 'Erreur Edge Function');
}

if (data && !data.success) {
  console.error('Email sending failed:', data);
  const failedDetails = data.failed?.[0];
  throw new Error(failedDetails?.error || 'Échec de l\'envoi email');
}

alert('Email d\'accès envoyé avec succès !');
```

**Bénéfices** :
- Affiche le message d'erreur exact de l'Edge Function
- Affiche les détails d'échec si l'envoi SMTP a échoué
- Permet de diagnostiquer précisément le problème

### ✅ 2. Ajout de logs diagnostiques SMTP

**Fichier** : `supabase/functions/send-email-universal/index.ts`

```typescript
// Logs de configuration SMTP
console.log("📧 SMTP Configuration:");
console.log("  Host:", SMTP_HOST);
console.log("  Port:", SMTP_PORT);
console.log("  User:", SMTP_USER);
console.log("  Password configured:", !!SMTP_PASS);
```

**Bénéfices** :
- Permet de vérifier la configuration dans les logs Supabase
- Identifie immédiatement si un secret est manquant

### ✅ 3. Fallback pour les secrets SMTP

**Fichier** : `supabase/functions/send-email-universal/index.ts`

```typescript
// ✅ Support de 2 noms de secrets
let SMTP_PASS = Deno.env.get("IONOS_EMAIL_PASSWORD");
if (!SMTP_PASS) {
  SMTP_PASS = Deno.env.get("IONOS_SMTP_PASSWORD");
}

if (!SMTP_PASS) {
  console.error("❌ IONOS_EMAIL_PASSWORD ou IONOS_SMTP_PASSWORD non configuré");
  throw new Error("Configuration SMTP manquante. Veuillez configurer IONOS_EMAIL_PASSWORD ou IONOS_SMTP_PASSWORD dans les secrets Supabase.");
}
```

**Bénéfices** :
- Compatibilité avec les deux noms de secrets
- Message d'erreur clair si aucun secret n'est configuré

### ✅ 4. Déploiement de la fonction corrigée

```bash
supabase functions deploy send-email-universal --no-verify-jwt
```

---

## Vérification

### 1. Vérifier les secrets Supabase

```sql
-- Vérifier que les secrets IONOS sont configurés
SELECT name
FROM vault.secrets
WHERE name LIKE '%IONOS%' OR name LIKE '%EMAIL%'
ORDER BY name;
```

**Secrets requis** :
- ✅ `IONOS_SMTP_HOST` (smtp.ionos.fr)
- ✅ `IONOS_SMTP_PORT` (587)
- ✅ `IONOS_EMAIL_USER` (team@taxiassur.com)
- ✅ `IONOS_EMAIL_PASSWORD` ou `IONOS_SMTP_PASSWORD`

### 2. Tester l'envoi d'email

1. Ouvrir une fiche lead dans le CRM
2. Vérifier que le lead a :
   - Un email valide
   - Un `access_token` (généré automatiquement)
3. Cliquer sur "Envoyer accès espace prospect"
4. Observer :
   - Si erreur : Le message d'erreur détaillé s'affiche
   - Si succès : "Email d'accès envoyé avec succès !"

### 3. Consulter les logs Supabase

Dans le dashboard Supabase → Functions → send-email-universal → Logs :

```
📧 SMTP Configuration:
  Host: smtp.ionos.fr
  Port: 587
  User: team@taxiassur.com
  Password configured: true

📧 Sending email via IONOS SMTP Universal
To: prospect@example.com
Subject: Accès à votre espace prospect TaxiAssur

✅ Email sent to: prospect@example.com (tracking: uuid-xxx)
```

---

## Tests

### Test 1 : Lead avec email valide

**Étapes** :
1. Lead avec email : `test@example.com`
2. Lead avec `access_token` : `abc123`
3. Cliquer sur "Envoyer accès espace prospect"

**Résultat attendu** :
- ✅ Email envoyé avec succès
- ✅ Confirmation affichée
- ✅ Email reçu avec le lien d'accès

### Test 2 : Secret SMTP manquant

**Simulation** :
1. Retirer temporairement `IONOS_EMAIL_PASSWORD`
2. Cliquer sur "Envoyer accès espace prospect"

**Résultat attendu** :
- ❌ Message : "Configuration SMTP manquante. Veuillez configurer IONOS_EMAIL_PASSWORD ou IONOS_SMTP_PASSWORD dans les secrets Supabase."

### Test 3 : Email invalide

**Étapes** :
1. Lead avec email : `invalide@domaine-inexistant-xyz.com`
2. Cliquer sur "Envoyer accès espace prospect"

**Résultat attendu** :
- ❌ Message SMTP : "Échec de l'envoi email: [détails erreur SMTP]"

---

## Template d'Email

L'email envoyé contient :

### Header
- Gradient orange (couleur TaxiAssur)
- Titre : "Accès à votre Espace Prospect"
- Sous-titre : "TaxiAssur - Assurance Taxi Professionnelle"

### Corps
- Personnalisation : "Bonjour [Prénom] [Nom]"
- Description de l'espace prospect
- **Bouton CTA** : "Accéder à mon espace" (lien avec token)
- Lien direct copiable
- Astuce : "Ajoutez cette page à vos favoris"

### Footer
- Coordonnées TaxiAssur
- Email : team@taxiassur.com
- Site : www.taxiassur.com

### Lien d'accès

```
https://taxiassur.com/espace-prospect/[ACCESS_TOKEN]
```

Le token permet au prospect d'accéder à :
- Ses devis des compagnies
- Ses documents
- L'état d'avancement de son dossier

---

## Sécurité

### Token d'accès

- Généré automatiquement lors de la création du lead
- Unique par lead
- Permet l'accès sans authentification (pour simplicité prospect)
- **RLS Policy** : Le prospect ne voit QUE ses propres données

### Politique RLS

```sql
-- Le prospect accède uniquement à ses données via son token
CREATE POLICY "Prospect access via token"
  ON crm_leads
  FOR SELECT
  USING (access_token = current_setting('request.jwt.claims', true)::json->>'access_token');
```

---

## Métriques & Tracking

L'email est automatiquement tracké :

### Tracking activé

```typescript
{
  trackOpens: true,    // Pixel de tracking 1x1
  trackClicks: true    // Liens modifiés pour tracking
}
```

### Table : `email_sends`

Chaque email génère un enregistrement avec :
- `tracking_id` (UUID)
- `email_to` (prospect@example.com)
- `subject` ("Accès à votre espace prospect TaxiAssur")
- `status` ('sent', 'opened', 'clicked')
- `lead_id` (UUID du lead)
- `opened_at` (timestamp du premier open)
- `clicked_at` (timestamp du premier clic)

### Interaction CRM

Une interaction est créée automatiquement :

```json
{
  "lead_id": "uuid-du-lead",
  "type": "email",
  "direction": "outbound",
  "subject": "Accès à votre espace prospect TaxiAssur",
  "to_email": "prospect@example.com",
  "from_email": "team@taxiassur.com"
}
```

---

## Prochaines améliorations

### Phase 2

- [ ] Bouton "Renvoyer l'email" avec confirmation
- [ ] Historique des envois par lead
- [ ] Template personnalisable par commercial
- [ ] Support des pièces jointes

### Phase 3

- [ ] Notifications push quand le prospect consulte l'espace
- [ ] Statistiques d'engagement par email
- [ ] A/B testing des templates
- [ ] Envoi automatique après validation des devis

---

## Résumé

### Ce qui a été corrigé

1. ✅ Gestion d'erreur frontend améliorée avec détails
2. ✅ Logs diagnostiques SMTP ajoutés
3. ✅ Fallback pour les deux noms de secrets
4. ✅ Messages d'erreur clairs et actionnables
5. ✅ Edge Function redéployée
6. ✅ Build réussi

### Comment tester

```bash
# 1. Dans le CRM, ouvrir une fiche lead
# 2. Cliquer sur "Envoyer accès espace prospect"
# 3. Vérifier :
#    - Pas d'erreur = Email envoyé ✅
#    - Erreur = Message détaillé affiché (ex: "SMTP config manquante")
```

### En cas d'erreur persistante

1. Vérifier les logs Supabase Functions
2. Vérifier que les secrets IONOS sont configurés
3. Tester avec un email valide
4. Consulter ce guide pour diagnostiquer

**Le système est maintenant robuste et donne des messages d'erreur clairs pour faciliter le diagnostic !**
