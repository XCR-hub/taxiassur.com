# 🚨 DÉPLOIEMENT URGENT - Accès Documents Prospects

## ✅ Statut de la correction

**Toutes les corrections sont prêtes** dans le dossier `/dist` mais **PAS ENCORE EN PRODUCTION**.

### Ce qui a été corrigé :

1. ✅ Politique RLS ajoutée pour l'accès anonyme aux `crm_leads`
2. ✅ Client Supabase anonyme isolé (pas de conflit avec session admin)
3. ✅ Gestion correcte de la route `/prospect/documents/:token`
4. ✅ Logs de debug pour identifier les problèmes
5. ✅ Template d'email avec le bon lien

### Tests de validation :

```sql
-- Test SQL réussi ✅
SET ROLE anon;
SELECT * FROM crm_leads WHERE access_token = 'abad7075...';
-- Résultat : TONY CERDA trouvé
```

---

## 📤 ÉTAPES DE DÉPLOIEMENT (OBLIGATOIRES)

### 1. Uploadez TOUT le contenu de `/dist` vers votre serveur IONOS

**Via FTP/SFTP :**
```
Dossier local  : /tmp/cc-agent/61788020/project/dist/*
Dossier distant: /public_html/ (ou racine de votre domaine)
```

**IMPORTANT : Écrasez TOUS les fichiers existants**

### 2. Vérifiez que ces fichiers sont présents sur le serveur :

```
✓ /index.html
✓ /assets/page-prospectdocuments-DrF6DFce.js  (nouveau build)
✓ /test-prospect-access.html  (page de test)
✓ /.htaccess
```

### 3. Testez l'accès avec la page de diagnostic :

```
https://taxiassur.com/test-prospect-access.html
```

**Ce que vous devez voir :**
- ✅ "Accès réussi !"
- Nom : TONY CERDA
- Email : tcerda@xcr.fr
- ID Lead : c622c26b-01f8-4a45-b492-8fbbf02fae11

### 4. Testez la vraie page documents :

```
https://taxiassur.com/prospect/documents/abad70754f988c31533bfa8ce962a4ce4f7f15c1a547fdf4f9a2bf099fd98912
```

**Ce que vous devez voir :**
- "Bonjour TONY"
- Liste des documents à uploader
- Pas d'erreur "Accès refusé"

### 5. Ouvrez la console du navigateur (F12) :

**Logs attendus :**
```
🔧 Initializing anon client for prospect documents
✅ Anon client initialized
🔍 Loading lead info for token: abad...
📊 Query result: { leadData: {...}, leadError: null }
✅ Lead found: TONY tcerda@xcr.fr
```

---

## 🔍 Dépannage

### Si "Accès refusé" persiste :

1. **Vérifiez que le nouveau build est uploadé :**
   - Hash du fichier : `page-prospectdocuments-DrF6DFce.js`
   - Si vous voyez un autre hash, le build n'est pas à jour

2. **Videz le cache du navigateur :**
   - Ctrl + Shift + R (Windows/Linux)
   - Cmd + Shift + R (Mac)

3. **Vérifiez le .htaccess :**
   - La route `/prospect/documents/:token` doit être redirigée vers `/index.html`
   - Ligne 90 du `.htaccess` : `RewriteRule ^(.*)$ /index.html [L,QSA]`

4. **Vérifiez les logs de la console :**
   - S'il y a une erreur réseau : problème de CORS ou d'URL Supabase
   - S'il y a "No lead found" : le token est incorrect ou le lead n'existe pas

---

## 📧 Lien dans les emails

Le template génère automatiquement le bon lien :

```javascript
// Code dans EmailComposerModal.tsx
getUploadLink() {
  if (lead.access_token) {
    return `https://taxiassur.com/prospect/documents/${lead.access_token}`;
  }
  return 'https://taxiassur.com/espace-client';
}
```

**Format du lien :**
```
https://taxiassur.com/prospect/documents/[TOKEN_64_CARACTÈRES]
```

**Exemple réel :**
```
https://taxiassur.com/prospect/documents/abad70754f988c31533bfa8ce962a4ce4f7f15c1a547fdf4f9a2bf099fd98912
```

---

## ⚠️ Points critiques

1. **Ne PAS ouvrir le lien avec une session admin active**
   - Utilisez un navigateur en navigation privée
   - Ou déconnectez-vous du backoffice d'abord

2. **Le token doit exister en base**
   - Tous les nouveaux leads ont automatiquement un token généré
   - Les anciens leads ont été migrés avec leurs tokens

3. **Les politiques RLS sont actives**
   - Role `anon` : peut lire `crm_leads` via `access_token`
   - Role `anon` : peut uploader dans `prospect_documents`
   - Role `authenticated` : accès complet pour les admins

---

## 🎯 Checklist finale

- [ ] Contenu de `/dist` uploadé sur IONOS
- [ ] Cache navigateur vidé
- [ ] `/test-prospect-access.html` fonctionne
- [ ] `/prospect/documents/[token]` affiche "Bonjour TONY"
- [ ] Upload de fichier fonctionne
- [ ] Email reçu avec le bon lien

---

## 📞 Support

Si le problème persiste après déploiement :
1. Prenez une capture d'écran de la console (F12)
2. Notez l'erreur exacte affichée
3. Vérifiez le hash du fichier JS chargé
