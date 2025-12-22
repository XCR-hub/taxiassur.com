# 🚀 GUIDE UPLOAD COMPLET IONOS - RÉSOUDRE ERREUR 404

## ❌ PROBLÈME ACTUEL

Erreurs dans la console :
```
GET https://taxiassur.com/assets/index-Cj3kzZGV.css 404 (Not Found)
GET https://taxiassur.com/assets/index-gP55ZLVl.js 404 (Not Found)
```

**CAUSE :** Le fichier `index.html` sur le serveur référence d'anciens fichiers qui n'existent plus.

**SOLUTION :** Upload complet du nouveau build.

---

## ✅ ÉTAPE 1 : PRÉPARER LES FICHIERS (1 min)

### Fichiers à uploader (dans cet ordre) :

```
dist/
├── index.html                    ← CRITIQUE (nouveau hash)
├── assets/
│   ├── index-Cj3kzZGV.css       ← Nouveau fichier CSS
│   ├── index-gP55ZLVl.js        ← Nouveau fichier JS
│   ├── vendor-Bx3qgCDg.js       ← Vendor bundle
│   ├── vendor-react-n5GRnPwG.js ← React bundle
│   ├── backoffice-jeIF2Gzb.js   ← Backoffice bundle
│   └── page-*.js                 ← Tous les autres fichiers
├── favicon.ico
├── logo-600x300.png
├── manifest.json
├── robots.txt
└── sitemap.xml
```

---

## 🔧 ÉTAPE 2 : CONNEXION IONOS (2 min)

### Option A : FileZilla (Recommandé)

1. **Télécharger FileZilla** (si pas déjà fait)
   - https://filezilla-project.org/download.php?type=client

2. **Se connecter à IONOS**
   ```
   Hôte     : ftp.taxiassur.com (ou adresse FTP IONOS)
   Port     : 21
   Protocole: FTP (ou SFTP si disponible)
   Username : [ton username IONOS]
   Password : [ton password IONOS]
   ```

3. **Naviguer vers le bon dossier**
   - Dossier distant : `/` ou `/httpdocs/` ou `/public_html/`
   - (Varie selon config IONOS)

### Option B : IONOS WebFTP (Plus lent)

1. Va sur https://www.ionos.fr/
2. Connexion → Espace client
3. Hébergement → WebSpace Explorer
4. Ou utilise le FTP intégré dans l'espace client

---

## 📤 ÉTAPE 3 : UPLOAD DANS L'ORDRE (5 min)

### IMPORTANT : Upload dans cet ordre précis !

#### 1. D'ABORD : Supprimer ancien dossier `assets/`

```
Sur le serveur IONOS :
1. Sélectionne le dossier /assets/
2. Clic droit → Supprimer
3. Confirme la suppression
```

**Pourquoi ?** Les anciens fichiers avec anciens hash resteraient et causeraient confusion.

#### 2. ENSUITE : Upload nouveau dossier `assets/`

```
1. Dans FileZilla (panneau LOCAL, à gauche) :
   - Navigue vers : /tmp/cc-agent/58094969/project/dist/assets/

2. Sélectionne TOUT le contenu du dossier assets/
   - Ctrl+A (Windows/Linux) ou Cmd+A (Mac)

3. Glisse-dépose vers le serveur (panneau DISTANT, à droite)
   - Ou clic droit → Upload

4. Attends la fin du transfert (1-2 minutes)
   - Barre de progression en bas de FileZilla
```

#### 3. ENFIN : Upload `index.html`

```
1. LOCAL : Sélectionne /dist/index.html
2. Glisse vers le serveur DISTANT (racine)
3. Si demandé "Écraser ?" → Oui, remplacer
```

#### 4. OPTIONNEL : Upload autres fichiers racine

```
Uploader aussi (s'ils ont changé) :
- favicon.ico
- logo-600x300.png
- manifest.json
- robots.txt
- sitemap.xml
- env-config.js (IMPORTANT pour Supabase)
```

---

## ✅ ÉTAPE 4 : VÉRIFICATION (2 min)

### Test 1 : Vérifier structure sur serveur

```
Sur IONOS, tu dois avoir :
/
├── index.html (taille ~7 KB, date récente)
├── assets/
│   ├── index-Cj3kzZGV.css (123 KB)
│   ├── index-gP55ZLVl.js (26 KB)
│   ├── vendor-Bx3qgCDg.js (213 KB)
│   └── ... (tous les autres)
├── env-config.js
├── favicon.ico
└── ...
```

### Test 2 : Vider cache navigateur

```
1. Chrome/Edge : Ctrl+Shift+Delete
2. Cocher "Images et fichiers en cache"
3. Période : "Toutes les données"
4. Cliquer "Effacer les données"

OU

1. Ouvrir https://taxiassur.com
2. Ctrl+F5 (Windows) ou Cmd+Shift+R (Mac)
   (Recharge forcée sans cache)
```

### Test 3 : Vérifier console navigateur

```
1. F12 → Console
2. Rafraîchir page
3. ✅ ATTENDU :
   - Aucune erreur 404
   - Message : "✅ Configuration chargée depuis env-config.js"

4. ❌ SI ERREURS 404 PERSISTENT :
   - Vérifier que index.html est bien uploadé
   - Vérifier que /assets/ contient les bons fichiers
   - Attendre 1-2 minutes (cache serveur IONOS)
```

### Test 4 : Tester pages

```
✅ Accueil        : https://taxiassur.com
✅ Blog           : https://taxiassur.com/blog
✅ FAQ            : https://taxiassur.com/faq
✅ Contact        : https://taxiassur.com/contact
✅ Devis          : https://taxiassur.com/devis-instantane
```

---

## 🔍 TROUBLESHOOTING

### Problème 1 : Toujours erreur 404 après upload

**Causes possibles :**

1. **Mauvais dossier sur serveur**
   - Vérifie que tu es dans `/httpdocs/` ou `/public_html/`
   - Pas dans un sous-dossier

2. **Permissions fichiers**
   ```
   Sur FileZilla :
   1. Clic droit sur index.html
   2. Permissions → 644 (rw-r--r--)
   3. Clic droit sur assets/ (dossier)
   4. Permissions → 755 (rwxr-xr-x)
   5. Cocher "Récursif" pour assets/
   ```

3. **Cache serveur IONOS**
   - Attends 2-3 minutes
   - Ou contacte support IONOS pour vider cache

4. **Ancien .htaccess qui redirige**
   ```
   Vérifie le fichier .htaccess à la racine
   S'il contient des règles de réécriture étranges :
   - Commentaire-les avec #
   - Ou renomme en .htaccess-backup
   ```

### Problème 2 : Page blanche

**Debug :**

```javascript
// Ouvrir Console (F12)
// Vérifier erreurs JavaScript

// Si erreur "Supabase is not defined" :
→ env-config.js n'est pas chargé
→ Vérifie qu'il est présent à la racine du serveur
```

### Problème 3 : Fichiers uploadés mais site ne change pas

**Solution :**

```
1. Vérifier horodatage fichiers sur serveur
   - Clic droit → Propriétés → Date modification
   - Doit être récente (aujourd'hui)

2. Si date ancienne → fichier pas uploadé
   - Re-uploader en forçant écrasement

3. Vider TOUS les caches :
   - Cache navigateur (Ctrl+Shift+Delete)
   - Cache Cloudflare (si activé via IONOS)
   - Cache serveur (attendre ou contacter support)
```

---

## 📋 CHECKLIST COMPLÈTE

### AVANT UPLOAD :
- [ ] Build exécuté : `npm run build` ✅
- [ ] Dossier `dist/` existe ✅
- [ ] Fichier `dist/index.html` contient les bons hash ✅

### PENDANT UPLOAD :
- [ ] Connexion FTP IONOS réussie
- [ ] Ancien dossier `/assets/` supprimé sur serveur
- [ ] Nouveau dossier `/assets/` uploadé (complet)
- [ ] Fichier `index.html` uploadé et écrasé
- [ ] Fichier `env-config.js` uploadé
- [ ] Tous les transferts terminés (0 en attente)

### APRÈS UPLOAD :
- [ ] Cache navigateur vidé (Ctrl+Shift+Delete)
- [ ] Site rechargé (Ctrl+F5)
- [ ] Console : aucune erreur 404 ✅
- [ ] Console : message "Configuration chargée" ✅
- [ ] Page accueil s'affiche correctement ✅
- [ ] Page /blog affiche articles ✅
- [ ] Page /faq affiche questions ✅

---

## 🎯 RÉSULTAT ATTENDU

**AVANT :**
```
❌ GET /assets/index-Cj3kzZGV.css → 404
❌ GET /assets/index-gP55ZLVl.js → 404
❌ Page ne charge pas
```

**APRÈS :**
```
✅ GET /assets/index-Cj3kzZGV.css → 200 (123 KB)
✅ GET /assets/index-gP55ZLVl.js → 200 (26 KB)
✅ Page charge en 1-2 secondes
✅ Tous styles appliqués
✅ Toutes fonctionnalités opérationnelles
```

---

## 💾 BACKUP AVANT UPLOAD (Recommandé)

Avant de supprimer `/assets/` sur le serveur :

```
1. Télécharge l'ancien dossier /assets/ en local
2. Renomme-le : assets-backup-[date]
3. Si problème, tu peux restaurer

Dans FileZilla :
- Clic droit sur /assets/ (serveur)
- Télécharger
- Sauvegarde dans /backup/ local
```

---

## 🚀 COMMANDES RAPIDES

### Vérifier build local :
```bash
npm run build
ls -lh dist/assets/ | grep "index-"
```

### Générer sitemap après upload :
```bash
node scripts/generate-sitemap.js
# Puis upload public/sitemap.xml
```

---

## 📞 SUPPORT

### Si bloqué :

1. **Support IONOS**
   - Téléphone : 01 77 62 30 03
   - Email : support@ionos.fr
   - Demander : "Aide upload FTP + vider cache serveur"

2. **Vérifier config FTP IONOS**
   - Espace client → Hébergement
   - Accès FTP → Voir identifiants
   - Serveur, port, username

3. **Alternative : Déploiement automatique**
   - GitHub Actions
   - IONOS Deploy Now
   - Mais FTP manuel plus simple pour cette fois

---

## ✅ UPLOAD RÉUSSI SI...

1. ✅ Site s'affiche sans erreur 404
2. ✅ Styles CSS appliqués (couleurs, fonts)
3. ✅ Navigation fonctionne
4. ✅ /blog affiche 175+ articles
5. ✅ /faq affiche 513+ questions
6. ✅ Formulaires fonctionnels
7. ✅ Console propre (pas d'erreur rouge)

---

**📁 Tous les fichiers sont prêts dans `/dist/`**

**🚀 Upload maintenant et ton site sera opérationnel en 5 minutes !**

---

*Guide créé le 13 janvier 2025 - TaxiAssur Deploy*
