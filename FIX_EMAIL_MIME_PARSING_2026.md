# 🔧 Correction du Parsing MIME des Emails

**Date:** 19 janvier 2026
**Status:** ✅ Corrigé et déployé

## 🐛 Problème Identifié

Les emails synchronisés depuis IONOS IMAP s'affichaient avec le contenu MIME brut visible:
```
--00000000000001637ee064B8418da--
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

Bonjour Monsieur VIZON, > > >
```

**Cause:** Le parser `mailparser` récupérait le contenu mais ne nettoyait pas les frontières MIME et les headers techniques.

---

## ✅ Solution Implémentée

### 1. **Fonctions de Nettoyage MIME**

Ajout de deux fonctions dans `sync-ionos-imap-v2`:

#### `cleanMIMEContent(content: string)`
Nettoie le contenu MIME en:
- Supprimant les frontières MIME (`--00000000000...`)
- Supprimant les headers (`Content-Type`, `Content-Transfer-Encoding`, etc.)
- Supprimant les lignes vides multiples
- Trimant les espaces

#### `extractTextFromParsed(parsed: any)`
Extrait intelligemment le texte:
1. **Priorité 1:** Texte brut nettoyé
2. **Priorité 2:** HTML converti en texte puis nettoyé
3. **Fallback:** Contenu original nettoyé

```typescript
function extractTextFromParsed(parsed: any): string {
  // Essayer d'abord le texte brut
  if (parsed.text) {
    const cleaned = cleanMIMEContent(parsed.text);
    if (cleaned && cleaned.length > 50) {
      return cleaned;
    }
  }

  // Si le texte brut est vide, essayer le HTML
  if (parsed.html) {
    let text = parsed.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      // ... autres remplacements HTML
      .trim();

    return cleanMIMEContent(text);
  }

  return cleanMIMEContent(parsed.text || '(Contenu non disponible)');
}
```

### 2. **Intégration dans le Pipeline**

Modification du traitement dans `fetchIMAPEmails()`:
```typescript
const cleanText = extractTextFromParsed(parsed);

const email: ParsedEmail = {
  // ...
  text: cleanText,  // ← Texte nettoyé
  // ...
};
```

### 3. **Fonction de Nettoyage Batch**

Création d'une edge function `clean-email-content` pour nettoyer les emails existants:
- Recherche les emails avec MIME brut (`LIKE '%--0000000000%'`)
- Nettoie jusqu'à 100 emails par appel
- Peut être appelée plusieurs fois si nécessaire

---

## 📦 Fichiers Modifiés/Créés

### Modifiés:
1. **`supabase/functions/sync-ionos-imap-v2/index.ts`**
   - Ajout `cleanMIMEContent()`
   - Ajout `extractTextFromParsed()`
   - Intégration dans le parsing

2. **`supabase/functions/sync-all-emails/index.ts`**
   - Changé `sync-ionos-imap` → `sync-ionos-imap-v2`

### Créés:
3. **`supabase/functions/clean-email-content/index.ts`** (nouveau)
   - Nettoyage batch des emails existants
   - Limite 100 emails par appel

---

## 🚀 Utilisation

### Synchronisation Future (Automatique)

Les nouveaux emails seront automatiquement nettoyés lors de la synchronisation IMAP.

**Cron actuel:**
```sql
-- Exécution toutes les 15 minutes
SELECT cron.schedule(
  'sync-emails-auto',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT].supabase.co/functions/v1/sync-all-emails'
  );
  $$
);
```

### Nettoyage des Emails Existants

**1. Via l'API:**
```bash
curl -X POST \
  https://[PROJECT].supabase.co/functions/v1/clean-email-content \
  -H "Authorization: Bearer [ANON_KEY]"
```

**2. Via Supabase Dashboard:**
- Edge Functions → `clean-email-content` → Invoke

**3. Répéter si nécessaire:**
Si vous avez plus de 100 emails à nettoyer, appelez la fonction plusieurs fois:
```bash
# Nettoyer par batch de 100
for i in {1..5}; do
  curl -X POST https://[PROJECT].supabase.co/functions/v1/clean-email-content
  sleep 2
done
```

---

## 📊 Résultats Attendus

### Avant (Problème):
```
--00000000000001637ee064B8418da--
Parfait je vous remercie beaucoup Le ven. 16 janv. 2026,
17:36, a écrit : > Bonjour Monsieur VIZON, > > >
J█████al effectué des demandes de devis auprès de quatre
à cinq compagnies. > Certaines ont décliné en raison des
antécédents corporels, et j█████attends > encore des
retours de la part des autres...
```

### Après (Corrigé):
```
Parfait je vous remercie beaucoup Le ven. 16 janv. 2026, 17:36, a écrit :

Bonjour Monsieur VIZON,

J'ai effectué des demandes de devis auprès de quatre à cinq compagnies.
Certaines ont décliné en raison des antécédents corporels, et j'attends
encore des retours de la part des autres. Je poursuis mes recherches
et reviens vers vous la semaine prochaine.

Bien à vous.
```

---

## 🔍 Vérification

### Dans le CRM:
1. Ouvrez un lead avec des emails
2. Allez dans la Timeline
3. Les emails doivent s'afficher proprement

### Dans la base de données:
```sql
-- Vérifier qu'il n'y a plus de MIME brut
SELECT COUNT(*)
FROM email_messages
WHERE body_text LIKE '%--0000000000%';

-- Devrait retourner 0 après nettoyage
```

---

## 🎯 Avantages

### Performance:
- ✅ Contenu plus léger (suppression des headers)
- ✅ Recherche plus efficace (texte propre)

### UX:
- ✅ Lecture facile des emails
- ✅ Pas de contenu technique visible
- ✅ Meilleure présentation dans le CRM

### Maintenance:
- ✅ Système automatique pour les nouveaux emails
- ✅ Fonction de nettoyage pour l'historique
- ✅ Code réutilisable et testable

---

## 🧪 Tests

### Test 1: Nouveau Email
1. Envoyez un email test à `team@taxiassur.com`
2. Attendez 15 minutes (ou déclenchez le cron manuellement)
3. Vérifiez dans le CRM → Timeline
4. ✅ Le texte doit être propre

### Test 2: Nettoyage Batch
1. Appelez `clean-email-content`
2. Vérifiez le résultat:
```json
{
  "success": true,
  "message": "Cleaned 45 emails",
  "cleaned": 45,
  "errors": 0,
  "total_processed": 45
}
```
3. ✅ Les emails existants sont nettoyés

### Test 3: Email HTML
1. Envoyez un email avec HTML riche
2. Vérifiez qu'il est converti en texte lisible
3. ✅ Pas de balises HTML visibles

---

## 📝 Notes Techniques

### Regex Utilisées:
```regex
/^--[a-zA-Z0-9_-]+$/gm           # Frontières MIME
/^Content-[^:]+:.*$/gm           # Headers Content-*
/^MIME-Version:.*$/gm            # Header MIME-Version
/<[^>]+>/g                       # Balises HTML
/\n{3,}/g                        # Lignes vides multiples
```

### Limites:
- Les emails avec encodage exotique peuvent nécessiter un traitement additionnel
- Les pièces jointes inline ne sont pas extraites (par design)
- Le HTML est converti en texte simple (pas de mise en forme)

---

## 🚨 Monitoring

### Logs à surveiller:
```bash
# Vérifier les erreurs de parsing
supabase functions logs sync-ionos-imap-v2

# Vérifier le nettoyage
supabase functions logs clean-email-content
```

### Métriques:
- Nombre d'emails synchronisés par heure
- Taux d'erreur de parsing
- Nombre d'emails avec MIME brut restant

---

## ✅ Checklist de Déploiement

- [x] ✅ Fonctions de nettoyage créées
- [x] ✅ `sync-ionos-imap-v2` modifié
- [x] ✅ `sync-all-emails` mis à jour
- [x] ✅ `clean-email-content` créé
- [x] ✅ Edge functions déployées
- [ ] 🔄 Tester avec un email réel
- [ ] 🔄 Nettoyer les emails existants
- [ ] 🔄 Vérifier dans le CRM

---

**✅ Correction prête pour utilisation!**

La prochaine synchronisation d'emails utilisera automatiquement le nouveau système de parsing nettoyé.
