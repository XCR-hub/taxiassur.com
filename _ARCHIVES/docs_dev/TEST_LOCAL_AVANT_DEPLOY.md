# 🧪 TEST EN LOCAL AVANT D'UPLOADER

Si vous voulez TESTER le site sur votre ordinateur AVANT de l'uploader :

## Option 1 : Serveur local simple

```bash
cd dist
python3 -m http.server 8000
```

Puis ouvrez : http://localhost:8000

## Option 2 : Avec npm serve

```bash
npm install -g serve
serve dist
```

Puis ouvrez l'URL indiquée (généralement http://localhost:3000)

---

## ✅ Si ça marche en local

Si le site fonctionne en local (localhost), cela CONFIRME que :
- Les fichiers sont bien créés
- Le build est correct
- Il faut juste les uploader sur IONOS

## ❌ Si ça ne marche pas en local

Envoyez-moi l'erreur dans la console (F12).
