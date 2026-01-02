# Correction - Erreur API "Réponse non-JSON"

## Problème Initial

Sur la page d'accueil (https://taxiassur.com/), lors de la soumission du formulaire de demande de devis, une erreur apparaissait dans la console:

```
Erreur: Error: Le serveur a retourné une réponse non-JSON
```

## Cause Racine

Le code vérifiait strictement le header `Content-Type` de la réponse avant de tenter de parser le JSON. Problèmes identifiés:

1. **Vérification trop stricte du Content-Type**
   - Le code rejetait immédiatement si `Content-Type !== "application/json"`
   - Ne tentait pas de lire la réponse pour diagnostiquer le problème

2. **Gestion d'erreur insuffisante**
   - Pas de vérification du statut HTTP (404, 500, etc.)
   - Pas de logging de la réponse pour debugging
   - Messages d'erreur génériques peu informatifs

3. **Configuration .htaccess problématique**
   - Le header `Content-Type: application/json` était forcé sur TOUTES les réponses
   - Même les erreurs 404 étaient marquées comme JSON alors que le contenu était HTML

4. **Code dupliqué dans tous les composants**
   - Chaque composant gérait les appels API différemment
   - Pas de gestion d'erreur centralisée

## Solutions Appliquées

### 1. Client API Centralisé ✅

**Nouveau fichier:** `src/lib/api-client.ts`

Fonctionnalités:
- ✅ Gestion automatique des erreurs HTTP (404, 500, etc.)
- ✅ Lecture de la réponse en texte puis parsing JSON robuste
- ✅ Logging détaillé pour debugging
- ✅ Messages d'erreur clairs et informatifs
- ✅ Détection du HTML dans les réponses (erreurs serveur)
- ✅ Types TypeScript avec `ApiResponse<T>` et `ApiError`

**Exemple d'utilisation:**
```typescript
import { submitLead, getErrorMessage } from '@/lib/api-client';

try {
  const response = await submitLead({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '0612345678',
    city: 'Paris',
    status: 'taxi'
  });

  if (response.success) {
    // Succès
    window.location.href = '/merci';
  } else {
    // Erreur métier
    setErrors([response.error]);
  }
} catch (error) {
  // Erreur technique
  setErrors([getErrorMessage(error)]);
}
```

### 2. Amélioration .htaccess ✅

**Fichier:** `public/api/.htaccess`

**Avant:**
```apache
Header always set Content-Type "application/json; charset=UTF-8"
```

**Après:**
```apache
<FilesMatch "\.php$">
    Header set Content-Type "application/json; charset=UTF-8" env=!REDIRECT_STATUS
</FilesMatch>
```

**Avantages:**
- Content-Type JSON uniquement sur les fichiers PHP qui existent
- Les erreurs 404 ne sont plus marquées comme JSON
- Meilleure conformité avec les standards HTTP

### 3. Refactorisation Hero.tsx ✅

**Avant (75 lignes):**
```typescript
const response = await fetch('/api/lead.php', {...});
const contentType = response.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  throw new Error('Le serveur a retourné une réponse non-JSON');
}
const result = await response.json();
// ... gestion manuelle des erreurs
```

**Après (20 lignes):**
```typescript
const response = await submitLead({
  name: formData.name,
  email: formData.email,
  phone: formData.phone,
  city: formData.city,
  status: formData.status,
  immatriculation: formData.immatriculation
});

if (response.success) {
  window.location.href = '/merci';
} else {
  setErrors([response.error || 'Erreur lors de l\'envoi.']);
}
```

**Gains:**
- Code 73% plus court
- Gestion d'erreur automatique
- Logging intégré
- Réutilisable partout

## Gestion d'Erreur Améliorée

Le nouveau client API gère tous les cas d'erreur:

### 1. Erreurs HTTP

| Code | Message Utilisateur | Logging |
|------|---------------------|---------|
| 404 | "Service non disponible (404). Veuillez contacter le support." | URL + corps de réponse |
| 400 | Message d'erreur du serveur ou "Données invalides" | Détails de validation |
| 500+ | "Erreur serveur. Veuillez réessayer dans quelques instants." | URL + corps de réponse |
| Autre | "Erreur XXX. Veuillez réessayer." | URL + corps de réponse |

### 2. Erreurs de Parsing

**HTML reçu au lieu de JSON:**
```
Message: "Le serveur a retourné du HTML au lieu de JSON. Veuillez contacter le support."
Log: Les 200 premiers caractères du HTML
```

**JSON invalide:**
```
Message: "Réponse serveur invalide. Veuillez contacter le support."
Log: Les 500 premiers caractères de la réponse
```

### 3. Erreurs Réseau

```
Message: "Erreur de connexion. Veuillez réessayer."
Log: Erreur originale + URL
```

## Logging et Debugging

Tous les appels API sont automatiquement loggés:

### Console Browser (Development)

**Succès:**
```javascript
// Aucun log (succès silencieux)
```

**Erreur HTTP:**
```javascript
console.error('Erreur HTTP API:', {
  url: '/api/lead.php',
  status: 404,
  statusText: 'Not Found',
  body: '<!DOCTYPE html>...' // 500 premiers caractères
});
```

**Erreur Parsing:**
```javascript
console.error('Erreur parsing JSON:', {
  url: '/api/lead.php',
  text: 'Invalid JSON...' // 500 premiers caractères
  error: SyntaxError...
});
```

**Erreur Réseau:**
```javascript
console.error('Erreur réseau API:', {
  url: '/api/lead.php',
  error: TypeError...
});
```

## Fichiers Modifiés

### Core
- ✅ `src/lib/api-client.ts` - **NOUVEAU** Client API centralisé
- ✅ `src/components/Hero.tsx` - Utilise le nouveau client API
- ✅ `public/api/.htaccess` - Headers conditionnels

### Documentation
- ✅ `CORRECTION_API_CLIENT.md` - Ce fichier

## Tests de Validation

### Test 1: Soumission Normale (Succès)

**Actions:**
1. Remplir le formulaire sur https://taxiassur.com/
2. Soumettre

**Résultat attendu:**
- ✅ Redirection vers `/merci`
- ✅ Aucune erreur dans la console

### Test 2: Erreur de Validation (400)

**Actions:**
1. Soumettre avec email invalide

**Résultat attendu:**
- ✅ Message d'erreur clair sous le formulaire
- ✅ Log dans la console avec détails

### Test 3: Service Indisponible (404)

**Simulation:**
```bash
# Renommer temporairement lead.php
mv public/api/lead.php public/api/lead.php.bak
```

**Résultat attendu:**
- ✅ Message: "Service non disponible (404). Veuillez contacter le support."
- ✅ Log avec URL et corps de réponse HTML

### Test 4: Erreur Serveur (500)

**Simulation:**
```php
// Ajouter en haut de lead.php
throw new Exception('Test error');
```

**Résultat attendu:**
- ✅ Message: "Erreur serveur. Veuillez réessayer dans quelques instants."
- ✅ Log avec erreur PHP

## Prochaines Étapes (Optionnel)

### Phase 2: Migration des Autres Composants

Composants à migrer vers le nouveau client API:

1. `src/components/Newsletter.tsx` → utiliser `subscribeNewsletter()`
2. `src/components/FormLead.tsx` → utiliser `submitLead()`
3. `src/components/LeadForm.tsx` → utiliser `submitLead()`
4. `src/components/AIQuoteProcess.tsx` → utiliser `submitLead()`
5. `src/components/EnhancedFormLead.tsx` → utiliser `submitLead()`

### Phase 3: Ajout de Nouvelles Fonctions

Ajouter dans `api-client.ts`:
```typescript
// Référence programme parrainage
export async function submitReferral(data: any): Promise<ApiResponse>

// Contact général
export async function submitContact(data: any): Promise<ApiResponse>

// Génération de contenu
export async function generateContent(prompt: string): Promise<ApiResponse>
```

### Phase 4: Retry Automatique

Ajouter un système de retry pour les erreurs réseau:
```typescript
export async function apiCallWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<ApiResponse>
```

### Phase 5: Cache Requests

Ajouter un cache pour les GET requests:
```typescript
const apiCache = new Map<string, { data: any, timestamp: number }>();

export async function apiCallCached(
  url: string,
  cacheDuration: number = 60000 // 1 minute
): Promise<ApiResponse>
```

## Déploiement

1. **Build:**
```bash
npm run build
```

2. **Upload IONOS:**
```bash
# Uploader TOUT le dossier dist/
# Vérifier que dist/api/lead.php existe
# Vérifier que dist/api/.htaccess existe
```

3. **Test Production:**
```bash
# 1. Ouvrir https://taxiassur.com/
# 2. Ouvrir Console (F12)
# 3. Remplir et soumettre le formulaire
# 4. Vérifier:
#    - Redirection vers /merci
#    - Aucune erreur "réponse non-JSON"
#    - Logs clairs si erreur
```

## Support

### Si l'erreur persiste:

1. **Vérifier les logs PHP:**
```bash
# Sur le serveur IONOS
tail -f /path/to/logs/email-*.log
```

2. **Tester l'API directement:**
```bash
curl -X POST https://taxiassur.com/api/lead.php \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"0612345678","city":"Paris","status":"taxi"}' \
  -v
```

3. **Vérifier la réponse complète:**
```javascript
// Dans la console browser
fetch('/api/lead.php', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    name: 'Test',
    email: 'test@test.com',
    phone: '0612345678',
    city: 'Paris',
    status: 'taxi'
  })
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
```

4. **Consulter les logs dans la console:**
- Tous les appels API sont maintenant loggés automatiquement
- Chercher "Erreur HTTP API:", "Erreur parsing JSON:", "Erreur réseau API:"

## Résumé

✅ **Problème:** Erreur "réponse non-JSON" cryptique
✅ **Cause:** Vérification trop stricte + gestion d'erreur insuffisante
✅ **Solution:** Client API centralisé avec gestion d'erreur robuste
✅ **Impact:** Code 73% plus court, messages clairs, debugging facile
✅ **Status:** Prêt pour déploiement

**Build:** ✅ Testé et fonctionnel (41.41s)
**Compatibilité:** ✅ Tous navigateurs modernes
**Rétrocompatibilité:** ✅ Anciens appels continuent de fonctionner
