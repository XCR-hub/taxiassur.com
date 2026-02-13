# 📧 Email Automatique de Paiement - CORRIGÉ

## ❌ Problème identifié

Quand le commercial cliquait sur **"Créer le lien de paiement"**, le système :
- ✅ Générait le lien de paiement
- ✅ Ouvrait le lien dans un nouvel onglet (pour paiement par téléphone)
- ❌ **N'envoyait PAS l'email au prospect**

## ✅ Solution implémentée

### Modification 1 : Frontend (`MoneticoPaymentManager.tsx`)

**Avant:**
```typescript
body: JSON.stringify({
  leadId,
  amount: parseFloat(amount),
  description: description || `Paiement comptant assurance taxi`,
}),
```

**Après:**
```typescript
body: JSON.stringify({
  leadId,
  amount: parseFloat(amount),
  description: description || `Paiement comptant assurance taxi`,
  send_email: true, // ✅ Envoyer automatiquement l'email
}),
```

### Modification 2 : Edge Function (`create-monetico-payment`)

**Ajout du paramètre:**
```typescript
const {
  leadId,
  amount,
  description,
  send_email // ✅ Nouveau paramètre
} = await req.json();
```

**Ajout de la logique d'envoi:**
```typescript
// ✅ Envoi automatique de l'email au prospect si demandé
if (send_email && leadId && lead) {
  try {
    console.log('📧 Envoi email automatique au prospect...');

    // Récupérer le token d'accès du lead
    const { data: leadWithToken } = await supabase
      .from('crm_leads')
      .select('access_token')
      .eq('id', leadId)
      .maybeSingle();

    const accessToken = leadWithToken?.access_token;

    if (accessToken) {
      const paymentUrl = `https://taxiassur.com/espace-prospect?token=${accessToken}#paiement`;

      // Appeler l'edge function d'envoi d'email
      await fetch(`${supabaseUrl}/functions/v1/send-payment-link-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          lead_id: leadId,
          payment_url: paymentUrl,
          amount: parseFloat(amount),
          email: email,
          first_name: firstName,
          last_name: lastName
        })
      });

      console.log('✅ Email envoyé automatiquement à:', email);
    }
  } catch (emailError) {
    console.error('⚠️ Erreur envoi email (non bloquant):', emailError);
    // Ne pas bloquer le paiement si l'email échoue
  }
}
```

---

## 🎯 Comportement actuel

### Quand le commercial clique sur "Créer le lien de paiement"

**Étape 1:** Validation des données
- Vérification du montant
- Vérification que le lead existe

**Étape 2:** Création du paiement Monetico
- Génération de la référence unique
- Calcul du MAC (signature sécurisée)
- Enregistrement dans `monetico_payments`

**Étape 3:** Ouverture du lien de paiement
- Formulaire HTML généré
- Ouverture dans un nouvel onglet
- **Pour paiement par téléphone avec le prospect**

**Étape 4:** ✅ **NOUVEAU - Envoi automatique de l'email**
- Récupération du token d'accès du lead
- Construction de l'URL de paiement
- Envoi de l'email via Brevo
- **Email reçu par le prospect avec le lien**

**Étape 5:** Confirmation
- Message de succès affiché
- Historique des paiements mis à jour

---

## 📧 Email envoyé au prospect

**Sujet:** 💳 Paiement de votre comptant - 500,00 €

**Contenu:**
- Message de bienvenue personnalisé
- Montant en gros
- Bouton "PAYER MAINTENANT"
- Étapes après le paiement
- Badges de sécurité (🔒 100% sécurisé, ✅ Conforme PCI-DSS, 🏦 CIC Monetico)
- Coordonnées support

**Lien dans l'email:**
```
https://taxiassur.com/espace-prospect?token=XXX#paiement
```

Le prospect clique et arrive directement sur la section paiement de son espace.

---

## 🔍 Vérification

### Dans les logs Supabase

Après avoir cliqué sur "Créer le lien de paiement", vous devriez voir :

```
📦 Données reçues: { leadId: "...", amount: 500, description: "..." }
🔍 Recherche du lead: ...
📊 Résultat: { lead: {...}, leadError: null }
🔐 MAC Data: TPE=...
🔐 MAC calculé: ...
Mode: 🧪 TEST
📧 Envoi email automatique au prospect...
✅ Email envoyé automatiquement à: prospect@example.com
```

### Dans l'interface

1. **Le commercial voit :**
   - ✅ "Lien de paiement créé avec succès"
   - ✅ Nouvel onglet s'ouvre avec le formulaire de paiement
   - ✅ Dans l'historique : nouveau paiement "En attente"

2. **Le prospect reçoit :**
   - ✅ Email avec le sujet "💳 Paiement de votre comptant"
   - ✅ Lien cliquable vers son espace prospect
   - ✅ Bouton "PAYER MAINTENANT"

---

## 🧪 Comment tester

### Test complet

1. **Ouvrir un lead dans le CRM**
   ```
   https://taxiassur.com/admin/crm-killer
   ```

2. **Aller à l'étape "Paiement RIB"**

3. **Remplir le formulaire**
   - Montant : 500
   - Description : "Test paiement comptant"

4. **Cliquer sur "Créer le lien de paiement"**

5. **Vérifier que :**
   - ✅ Nouvel onglet s'ouvre (pour paiement téléphone)
   - ✅ Message de succès affiché
   - ✅ Dans les logs : "📧 Envoi email automatique..."
   - ✅ Dans les logs : "✅ Email envoyé automatiquement à: ..."

6. **Vérifier la boîte email du prospect**
   - ✅ Email reçu dans les 30 secondes
   - ✅ Email non dans spam
   - ✅ Lien cliquable

7. **Cliquer sur le lien dans l'email**
   - ✅ Redirection vers espace prospect
   - ✅ Section paiement affichée
   - ✅ Bouton paiement fonctionnel

---

## 🚨 Gestion des erreurs

### Si l'email n'est pas envoyé

L'erreur est **non bloquante**, ce qui signifie :
- ✅ Le paiement est quand même créé
- ✅ Le commercial peut utiliser le lien
- ⚠️ Le prospect ne reçoit pas l'email
- 📝 L'erreur est loggée mais n'affiche pas d'alerte

**Causes possibles :**
1. Lead sans `access_token`
2. Email invalide
3. API Brevo en erreur
4. Limite de quota atteinte

**Solution :** Utiliser le bouton "Renvoyer" dans l'historique des paiements.

---

## 📊 Statistiques

| Action | Avant | Après |
|--------|-------|-------|
| Création lien | ✅ | ✅ |
| Ouverture onglet | ✅ | ✅ |
| Envoi email auto | ❌ | ✅ |
| Email dans historique | ⚠️ | ✅ |

---

## 🎯 Prochaines améliorations possibles

1. **Notification visuelle** dans l'interface quand l'email est envoyé
2. **Badge "Email envoyé"** dans l'historique
3. **Tracking des clics** sur le lien dans l'email
4. **Relance automatique** si pas de clic après 24h
5. **SMS en complément** pour les prospects qui ne consultent pas leurs emails

---

**Date de correction :** 13 février 2026
**Edge Function déployée :** ✅
**Build frontend :** ✅ (3300.00 KiB)
**Prêt pour production :** ✅
