# Guide de Configuration Keyyo - Informations à collecter

## Contexte

Keyyo est votre fournisseur de téléphonie VoIP. L'intégration dans TaxiAssur permet de :
- Passer des appels directement depuis le CRM (click-to-call)
- Enregistrer automatiquement tous les appels
- Récupérer les enregistrements audio
- Lier les appels aux leads automatiquement

---

## Étape 1 : Identifiants API Keyyo

### Ce dont j'ai besoin :

#### 1. **Clé API (API Key)**
- C'est une longue chaîne de caractères (type : `kyy_abc123def456...`)
- Permet à TaxiAssur de communiquer avec Keyyo

#### 2. **Account ID (ID de compte)**
- Identifiant de votre compte Keyyo
- Format numérique ou alphanumérique

#### 3. **URL de l'API**
- Par défaut : `https://api.keyyo.com/v1`
- Confirmez si c'est correct ou s'il y a une URL différente

### Où trouver ces informations dans Keyyo ?

#### Option A : Interface web Keyyo

1. Connectez-vous à votre espace Keyyo : https://www.keyyo.com
2. Allez dans **Paramètres** ou **Administration**
3. Cherchez la section **API** ou **Intégrations**
4. Vous devriez voir :
   - Une clé API existante OU
   - Un bouton "Créer une clé API"

#### Option B : Contacter le support Keyyo

Si vous ne trouvez pas ces informations :
1. Appelez le support Keyyo
2. Demandez : "Je souhaite obtenir mes identifiants API pour intégrer Keyyo avec mon CRM"
3. Ils vous fourniront :
   - La clé API
   - L'Account ID
   - L'URL de l'API

---

## Étape 2 : Extensions téléphoniques

### Ce dont j'ai besoin :

Pour chaque commercial/utilisateur qui utilisera le click-to-call :

| Information | Description | Exemple |
|------------|-------------|---------|
| **Nom/Email de l'utilisateur** | Utilisateur dans le CRM TaxiAssur | `martin@taxiassur.com` |
| **Extension Keyyo** | Numéro d'extension (poste) | `101` ou `2001` |
| **Numéro de téléphone direct** | Le numéro complet si disponible | `+33123456789` (optionnel) |

### Où trouver les extensions dans Keyyo ?

1. Connectez-vous à Keyyo
2. Allez dans **Utilisateurs** ou **Extensions**
3. Vous verrez la liste de tous les postes/extensions
4. Notez le **numéro d'extension** pour chaque commercial

### Exemple de tableau à remplir :

```
Utilisateur CRM          | Extension Keyyo | Téléphone direct
-------------------------|-----------------|------------------
martin@taxiassur.com     | 101            | +33123456789
sophie@taxiassur.com     | 102            | +33123456790
jean@taxiassur.com       | 103            | +33123456791
```

---

## Étape 3 : Configuration des Webhooks

### Ce dont j'ai besoin :

#### 1. **Vérifier si les webhooks sont supportés**

Keyyo supporte-t-il les webhooks (notifications en temps réel) ?
- Si OUI : Parfait, je configurerai l'URL du webhook
- Si NON : On utilisera la récupération périodique (polling)

#### 2. **Si webhooks supportés : Droits d'accès**

Avez-vous les droits pour configurer des webhooks dans Keyyo ?
- Si OUI : Je vous donnerai l'URL à configurer
- Si NON : Demandez au support Keyyo ou à votre administrateur

---

## Étape 4 : Permissions et fonctionnalités

### Ce que je dois vérifier avec vous :

#### 1. **Click-to-Call**

Keyyo permet-il l'initiation d'appels via API ?
- Certains forfaits Keyyo n'incluent pas cette fonctionnalité
- Vérifiez dans votre contrat ou demandez au support

#### 2. **Enregistrements audio**

Vos appels sont-ils enregistrés ?
- Si OUI : Peuvent-ils être téléchargés via l'API ?
- Si NON : Voulez-vous activer cette fonctionnalité ?

**Note légale** : En France, vous devez informer vos interlocuteurs que les appels sont enregistrés.

#### 3. **Historique des appels**

Quelle est la durée de rétention de l'historique dans Keyyo ?
- 30 jours ?
- 90 jours ?
- Plus ?

Cela déterminera la fréquence de synchronisation.

---

## Résumé : Checklist des informations

Cochez au fur et à mesure que vous collectez les informations :

### Identifiants API
- [ ] Clé API (API Key)
- [ ] Account ID
- [ ] URL de l'API (confirmée)

### Extensions
- [ ] Liste des utilisateurs CRM
- [ ] Extensions Keyyo correspondantes
- [ ] Numéros de téléphone directs (optionnel)

### Fonctionnalités
- [ ] Click-to-Call disponible ? (Oui/Non)
- [ ] Enregistrements audio disponibles ? (Oui/Non)
- [ ] Webhooks supportés ? (Oui/Non)
- [ ] Durée de rétention de l'historique

### Accès
- [ ] Droits pour créer une clé API
- [ ] Droits pour configurer des webhooks (si supportés)

---

## Format de réponse souhaité

Pour me faciliter la configuration, vous pouvez me fournir les informations dans ce format :

```
=== IDENTIFIANTS KEYYO ===
Clé API : kyy_abc123def456...
Account ID : 12345
URL API : https://api.keyyo.com/v1

=== EXTENSIONS ===
1. martin@taxiassur.com | Extension: 101 | Tél: +33123456789
2. sophie@taxiassur.com | Extension: 102 | Tél: +33123456790

=== FONCTIONNALITÉS ===
Click-to-Call : Oui / Non
Enregistrements : Oui / Non
Webhooks : Oui / Non
Rétention historique : 90 jours

=== NOTES SUPPLÉMENTAIRES ===
(Toute autre information pertinente)
```

---

## Questions fréquentes

### Je n'ai pas accès aux paramètres API dans Keyyo

**Solution** : Contactez le support Keyyo ou votre administrateur de compte. Vous aurez besoin d'un compte avec des droits d'administration.

### Je ne connais pas les extensions de mes commerciaux

**Solution** : Demandez-leur directement leur numéro de poste. C'est le numéro qu'ils composent entre eux en interne (généralement 3-4 chiffres).

### Keyyo me demande des "scopes" pour la clé API

**Scopes nécessaires** :
- `calls:read` - Lire l'historique des appels
- `calls:write` - Initier des appels (click-to-call)
- `recordings:read` - Télécharger les enregistrements
- `webhooks:write` - Configurer les webhooks (si supportés)

Si vous avez un doute, activez **tous les scopes disponibles** pour l'API.

### L'URL de l'API est différente chez moi

Pas de problème ! Communiquez-moi l'URL exacte que Keyyo vous a fournie.

### Combien de temps prend la configuration ?

Une fois que j'ai toutes les informations :
- Configuration backend : 5 minutes
- Tests de connexion : 5 minutes
- Association des extensions : 2 minutes par utilisateur
- Tests d'appels : 5 minutes

**Total : ~30 minutes maximum**

---

## Prochaines étapes

Une fois que vous m'aurez fourni ces informations :

1. Je configurerai les identifiants dans Supabase (sécurisé)
2. J'associerai les extensions aux utilisateurs
3. Je configurerai le webhook (si supporté)
4. Je testerai la connexion
5. Vous pourrez faire un test d'appel depuis le CRM

---

## Sécurité

### Où sont stockées ces informations ?

- Les identifiants API sont stockés dans **Supabase Vault** (coffre-fort chiffré)
- Jamais visibles en clair dans le code source
- Accessibles uniquement par les Edge Functions autorisées

### Puis-je révoquer l'accès ?

Oui, à tout moment :
1. Désactivez la clé API dans Keyyo
2. Créez une nouvelle clé
3. Communiquez-moi la nouvelle clé

---

## Contact

Une fois que vous avez collecté ces informations, envoyez-les moi et je m'occupe de tout le reste !

**Note de sécurité** : Si vous préférez, vous pouvez me communiquer ces informations de manière sécurisée (message privé, fichier chiffré, etc.)
