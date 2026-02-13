# Guide d'Ajustement des Sélecteurs CSS

## Introduction

Les sélecteurs CSS utilisés dans les fonctions d'import sont des **approximations** créées sans accès aux portails réels des assureurs.

Ce guide explique comment ajuster ces sélecteurs une fois que vous avez accès aux vrais portails.

## Prérequis

- Accès au portail de l'assureur (username/password)
- Navigateur Chrome ou Firefox avec outils de développement
- Accès au code source de la fonction edge `web-import-executor`

## Processus d'Ajustement

### Étape 1: Inspection Manuelle du Portail

1. **Ouvrir le portail dans Chrome**
   ```
   Exemple: https://www.sollyazar.com/espace-client
   ```

2. **Ouvrir les DevTools**
   - Appuyer sur `F12` ou `Cmd+Option+I` (Mac)
   - Aller dans l'onglet "Elements"

3. **Identifier les éléments importants**
   - Champs de connexion (username, password)
   - Bouton de connexion
   - Numéro de contrat
   - Informations véhicule
   - Liens de documents

### Étape 2: Extraire les Bons Sélecteurs

#### Méthode 1: Copier le sélecteur CSS

1. Clic droit sur l'élément dans la page
2. "Inspecter" (ou "Inspect Element")
3. Dans les DevTools, clic droit sur la ligne HTML
4. Copy → Copy selector
5. Vous obtenez un sélecteur comme:
   ```
   #root > div > form > input[type="text"]
   ```

#### Méthode 2: Utiliser la Console

1. Dans DevTools, aller dans l'onglet "Console"
2. Taper:
   ```javascript
   document.querySelector('#votre-selecteur')
   ```
3. Si ça retourne l'élément, le sélecteur est bon
4. Si ça retourne `null`, le sélecteur est incorrect

#### Méthode 3: Identifier par attributs

Chercher des attributs uniques:
- `id="contract-number"`
- `name="username"`
- `class="doc-link"`
- `data-contract="12345"`

Préférer dans l'ordre:
1. **ID** (`#contract-number`) - Unique et stable
2. **Name** (`input[name="username"]`) - Souvent stable
3. **Class spécifique** (`.numero-contrat`) - Attention aux classes génériques
4. **Data-attributes** (`[data-doc-id="123"]`) - Très stable
5. **Structure** (`div > p > span`) - Fragile, éviter si possible

### Étape 3: Tester les Sélecteurs

#### Test dans la Console

```javascript
// Test d'un sélecteur unique
document.querySelector('#contract-number')?.textContent

// Test d'une liste d'éléments
document.querySelectorAll('.document-link').forEach(el => {
  console.log(el.textContent, el.href)
})

// Test d'extraction de données
const data = {
  contract: document.querySelector('.numero-contrat')?.textContent?.trim(),
  premium: document.querySelector('.montant-prime')?.textContent?.trim(),
  vehicle: document.querySelector('.immatriculation')?.textContent?.trim()
};
console.log(data);
```

#### Script de Test Complet

Copier ce script dans la console pour tester tous les sélecteurs:

```javascript
// Test SollyAzar
const testSelectors = {
  contract_number: '.contract-number',
  subscription_date: '.subscription-date',
  expiry_date: '.expiry-date',
  premium_amount: '.premium-amount',
  vehicle_registration: '.vehicle-registration',
  vehicle_brand: '.vehicle-brand',
  documents: '.document-link'
};

Object.entries(testSelectors).forEach(([key, selector]) => {
  const element = document.querySelector(selector);
  if (element) {
    console.log(`✅ ${key}: "${element.textContent?.trim()}"`);
  } else {
    console.log(`❌ ${key}: SELECTOR NOT FOUND`);
  }
});

// Test documents
const docs = document.querySelectorAll(testSelectors.documents);
console.log(`📄 Documents trouvés: ${docs.length}`);
docs.forEach((doc, i) => {
  console.log(`  ${i+1}. ${doc.textContent?.trim()} - ${doc.href}`);
});
```

### Étape 4: Mettre à Jour le Code

Une fois les bons sélecteurs identifiés:

1. **Ouvrir le fichier**
   ```
   supabase/functions/web-import-executor/index.ts
   ```

2. **Trouver la fonction de l'assureur**
   ```typescript
   async function importFromSollyAzar(supabase: any, job: ImportJob, credential: Credential)
   ```

3. **Remplacer les sélecteurs**

   **Avant:**
   ```typescript
   await page.type('#username', credential.username);
   await page.type('#password', credential.password_encrypted);
   await page.click('button[type="submit"]');
   ```

   **Après** (exemple avec les vrais sélecteurs):
   ```typescript
   await page.type('input[name="email"]', credential.username);
   await page.type('input[name="mot-de-passe"]', credential.password_encrypted);
   await page.click('button.btn-connexion');
   ```

4. **Mettre à jour l'extraction de données**

   **Avant:**
   ```typescript
   const contractData = await page.evaluate(() => {
     return {
       contract_number: document.querySelector('.contract-number')?.textContent?.trim() || '',
       subscription_date: document.querySelector('.subscription-date')?.textContent?.trim() || '',
     };
   });
   ```

   **Après:**
   ```typescript
   const contractData = await page.evaluate(() => {
     return {
       contract_number: document.querySelector('#numero-contrat-123')?.textContent?.trim() || '',
       subscription_date: document.querySelector('span[data-field="date-souscription"]')?.textContent?.trim() || '',
     };
   });
   ```

### Étape 5: Redéployer l'Edge Function

```bash
# Depuis la racine du projet
npx supabase functions deploy web-import-executor
```

Ou utiliser l'outil MCP:
```
Appeler mcp__supabase__deploy_edge_function avec slug: "web-import-executor"
```

### Étape 6: Tester l'Import

1. Aller dans `/backoffice/web-import`
2. Lancer un import avec les vrais identifiants
3. Observer les logs en temps réel
4. Vérifier que:
   - La connexion fonctionne
   - Les données sont extraites
   - Les documents sont téléchargés

## Exemples de Sélecteurs Typiques

### Formulaires de Connexion

```javascript
// Champs de formulaire
input[name="username"]
input[name="email"]
input[type="email"]
#login
#identifiant
.input-username

// Champs password
input[name="password"]
input[type="password"]
#password
#mot-de-passe
.input-password

// Boutons
button[type="submit"]
button.btn-login
button.btn-connexion
input[type="submit"]
.submit-button
#btn-login
```

### Informations Contrat

```javascript
// Numéros et références
.contract-number
.numero-contrat
.ref-contrat
#contractId
[data-contract-number]
span.contrat-ref

// Dates
.subscription-date
.date-souscription
.date-effet
.expiry-date
.date-echeance
time.contract-date

// Montants
.premium-amount
.montant-prime
.cotisation
.tarif
span.prix
```

### Documents

```javascript
// Liens de documents
.document-link
.doc-download
a.document
a[href*="/documents/"]
a[href*=".pdf"]
[data-document-id]

// Listes de documents
.documents-list
.liste-documents
ul.docs
.document-container

// Attributs de documents
a[data-filename]
a[data-doctype]
a[data-document-name]
```

## Gestion des Cas Spéciaux

### Navigation Multi-Pages

Certains portails nécessitent plusieurs clics:

```typescript
// Connexion
await page.goto(credential.portal_url);
await page.type('#username', credential.username);
await page.type('#password', credential.password_encrypted);
await page.click('.btn-login');
await page.waitForNavigation({ waitUntil: 'networkidle2' });

// Navigation vers contrats
await page.click('a[href="/mes-contrats"]');
await page.waitForNavigation({ waitUntil: 'networkidle2' });

// Clic sur un contrat spécifique
await page.click(`.contrat-item[data-number="${job.contract_number}"]`);
await page.waitForNavigation({ waitUntil: 'networkidle2' });
```

### Données dans des Iframes

Si les données sont dans une iframe:

```typescript
const frameHandle = await page.$('iframe[name="contract-details"]');
const frame = await frameHandle.contentFrame();

const data = await frame.evaluate(() => {
  return {
    contract: document.querySelector('.numero')?.textContent || ''
  };
});
```

### Données Chargées en AJAX

Si les données se chargent après un délai:

```typescript
// Attendre qu'un élément apparaisse
await page.waitForSelector('.contract-number', { timeout: 10000 });

// Ou attendre un temps fixe
await page.waitForTimeout(2000);

// Ou attendre que la page soit stable
await page.waitForNavigation({ waitUntil: 'networkidle2' });
```

### Téléchargement de Documents

#### Méthode 1: Lien direct

```typescript
const docUrl = await page.$eval('.doc-link', el => el.href);
const response = await page.goto(docUrl);
const buffer = await response.buffer();
```

#### Méthode 2: Clic sur bouton

```typescript
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('.btn-download')
]);
const path = await download.path();
const buffer = await fs.readFile(path);
```

#### Méthode 3: API directe

```typescript
const docId = await page.$eval('.doc-link', el => el.dataset.documentId);
const response = await fetch(`${credential.portal_url}/api/documents/${docId}`, {
  headers: {
    'Cookie': cookies, // Récupéré depuis le navigateur
    'Authorization': token
  }
});
const buffer = await response.arrayBuffer();
```

## Checklist de Validation

Après avoir ajusté les sélecteurs, vérifier:

- [ ] La connexion au portail réussit
- [ ] Pas d'erreur de timeout
- [ ] Les données de contrat sont extraites correctement
- [ ] Les informations véhicule sont présentes
- [ ] Les documents sont identifiés (minimum 1)
- [ ] Les documents se téléchargent sans erreur
- [ ] Les fichiers sont bien uploadés dans Supabase Storage
- [ ] Les URLs publiques des documents fonctionnent
- [ ] Les métadonnées sont enregistrées dans la base
- [ ] Le job se termine avec status "completed"
- [ ] Pas d'erreurs dans les logs

## Dépannage

### Problème: "Element not found"

**Cause**: Le sélecteur est incorrect
**Solution**:
1. Retourner sur le portail avec DevTools
2. Identifier le bon sélecteur
3. Mettre à jour le code
4. Redéployer

### Problème: "Navigation timeout"

**Cause**: La page est trop lente à charger ou le sélecteur de clic est incorrect
**Solution**:
```typescript
// Augmenter le timeout
await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

// Ou utiliser un autre event
await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
```

### Problème: "Cannot read property 'textContent' of null"

**Cause**: L'élément n'existe pas ou le sélecteur est incorrect
**Solution**:
```typescript
// Utiliser l'opérateur ?. pour éviter l'erreur
const value = document.querySelector('.selector')?.textContent?.trim() || '';

// Ou vérifier l'existence avant
const element = document.querySelector('.selector');
const value = element ? element.textContent.trim() : '';
```

### Problème: Documents vides ou corrompus

**Cause**: Le téléchargement a échoué ou le format est incorrect
**Solution**:
1. Vérifier que l'URL du document est correcte
2. Vérifier les headers de la requête (cookies, authorization)
3. Tester le téléchargement manuellement
4. Vérifier le Content-Type de la réponse

## Ressources

### Documentation Puppeteer

- Page API: https://pptr.dev/api/puppeteer.page
- Selectors: https://pptr.dev/guides/query-selectors
- Navigation: https://pptr.dev/guides/navigation

### Sélecteurs CSS

- MDN CSS Selectors: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors
- CSS Diner (tutoriel): https://flukeout.github.io/

### DevTools Chrome

- Elements Panel: https://developer.chrome.com/docs/devtools/dom/
- Console: https://developer.chrome.com/docs/devtools/console/

---

**Note**: L'ajustement des sélecteurs est un processus itératif. Ne pas hésiter à tester plusieurs approches jusqu'à trouver les sélecteurs les plus fiables et stables.
