# 🚨 UPLOAD URGENT - Dans Cet Ordre Précis

## ⚠️ Le Problème

Vous avez uploadé `/dist/` mais **PAS les fichiers `/api/*.php`** !

L'erreur 500 vient de là : **config.php n'existe pas sur le serveur IONOS**.

---

## 📦 ÉTAPE 1 : Uploader UNIQUEMENT Ces 2 Fichiers (URGENT)

**Via FTP IONOS, allez dans `/api/` et uploadez :**

```
1. /public/api/config.php                    ← CRITIQUE (contient les clés)
2. /public/api/test-debug-complet.php        ← TEST (nouveau fichier créé)
```

**Après upload, testez :**
```
https://taxiassur.com/api/test-debug-complet.php
```

**Résultat attendu :**
```json
{
  "step_1_fichier_config": {
    "config_exists": true,
    "config_readable": true
  },
  "step_4_conclusion": {
    "status": "✅ ALL OK",
    "message": "config.php loaded successfully"
  }
}
```

**Si vous voyez `"config_exists": false` :**
- ❌ Vous n'avez PAS uploadé `config.php`
- ✅ Uploadez-le dans `/api/config.php` (chemin EXACT)

---

## 📦 ÉTAPE 2 : Uploader Les Autres APIs (8 fichiers)

**Une fois que le test ci-dessus affiche "ALL OK", uploadez :**

```
/public/api/generate-content.php
/public/api/serp-optimizer.php
/public/api/lead-manager.php
/public/api/backlink-automation.php
/public/api/referral-program.php
/public/api/diagnostic.php
/public/api/webhook.php
/public/api/newsletter.php
```

**Destination IONOS :**
```
/api/generate-content.php
/api/serp-optimizer.php
... etc
```

**⚠️ ATTENTION :** Uploadez depuis `/public/api/` VERS `/api/` sur IONOS !

---

## 📦 ÉTAPE 3 : Rebuild et Upload /dist/

```bash
npm run build
```

**Uploadez TOUT le contenu de `/dist/` vers la racine IONOS**

---

## 🧪 Tests de Validation

### Test 1 : Config Chargée
```
https://taxiassur.com/api/test-debug-complet.php
→ ✅ "status": "✅ ALL OK"
```

### Test 2 : Config Debug
```
https://taxiassur.com/api/config.php?debug=config
→ ✅ {"config_loaded": true, "openai_key_set": true}
```

### Test 3 : Génération IA
```
1. Allez sur : /backoffice/content
2. Entrez : "assurance taxi"
3. Cliquez : "Générer le Contenu"
4. ✅ Devrait générer SANS erreur 500
```

---

## 🔍 Diagnostic Si Erreur Persiste

### Erreur : "config_exists": false

**Cause :** Vous avez uploadé dans le mauvais dossier

**Solution :**
```
Fichier local : /public/api/config.php
Doit être dans  : /api/config.php (sur IONOS)

PAS dans /public/api/config.php sur IONOS !
```

### Erreur : "openai_key_set": false

**Cause :** config.php existe mais clés vides

**Solution :** Vérifiez que config.php contient bien :
```php
setEnvIfNotExists('VITE_OPENAI_API_KEY', 'sk-proj-...');
```

### Erreur 500 sur generate-content.php

**Cause :** config.php pas chargé

**Solution :** 
1. Vérifiez que config.php existe dans `/api/`
2. Vérifiez les permissions (chmod 644)
3. Testez avec test-debug-complet.php

---

## 📁 Structure Finale sur IONOS

```
/ (racine)
├── index.html                    (depuis /dist/)
├── assets/                       (depuis /dist/assets/)
│   ├── backoffice-xxx.js
│   ├── vendor-xxx.js
│   └── index-xxx.css
└── api/
    ├── config.php                ← CRITIQUE !
    ├── load-env.php              (optionnel si existe)
    ├── test-debug-complet.php    ← TEST
    ├── generate-content.php
    ├── serp-optimizer.php
    ├── lead-manager.php
    ├── backlink-automation.php
    ├── referral-program.php
    ├── diagnostic.php
    ├── webhook.php
    └── newsletter.php
```

---

## ✅ Checklist Rapide

Avant de tester, vérifiez :

- [ ] `config.php` uploadé dans `/api/` (pas `/public/api/`)
- [ ] `test-debug-complet.php` uploadé dans `/api/`
- [ ] Test https://taxiassur.com/api/test-debug-complet.php affiche "ALL OK"
- [ ] Les 8 autres fichiers API uploadés dans `/api/`
- [ ] `/dist/` uploadé vers la racine
- [ ] Test génération IA fonctionne

---

**Si TOUS les tests passent → ✅ Système 100% opérationnel !**
