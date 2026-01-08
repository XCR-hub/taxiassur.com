# 🔑 Identifiants Admin - COPIER/COLLER

## ✅ Identifiants Vérifiés

Le script de diagnostic confirme que ces identifiants **fonctionnent**:

```
Email: master@taxiassur.com
Mot de passe: TaxiAssur2025!,&
```

## ⚠️ Points d'Attention

### Caractères Spéciaux du Mot de Passe
```
TaxiAssur2025!,&
             ↑↑↑
         Point d'exclamation !
            Virgule ,
              Esperluette &
```

**Conseil**: Copiez-collez directement le mot de passe pour éviter les erreurs de frappe

### Sensibilité à la Casse
- **T** majuscule au début
- **A** majuscule dans "Assur"
- Le reste en minuscules

## 📋 Pour Se Connecter

### Méthode 1: Copier/Coller (Recommandé)

1. Copiez ceci: `master@taxiassur.com`
2. Collez dans le champ Email
3. Copiez ceci: `TaxiAssur2025!,&`
4. Collez dans le champ Mot de passe
5. Cliquez sur "Se connecter"

### Méthode 2: Affichage du Mot de Passe

Si vous préférez le taper:
1. Activez "Afficher le mot de passe" (icône œil)
2. Tapez caractère par caractère en vérifiant
3. Vérifiez bien les caractères spéciaux: `!,&`

## 🔍 Test de Connexion

URL de test: https://taxiassur.com/test-auth-diagnostic.html

1. Ouvrez cette page
2. Les champs sont préremplis avec les bons identifiants
3. Cliquez sur "Tester la Connexion"
4. ✅ Devrait afficher "Connexion réussie"

## 🐛 Si "Invalid login credentials" Persiste

### 1. Vérifier l'Email
```
Correct: master@taxiassur.com
Incorrect: master@taxi-assur.com (tiret)
Incorrect: admin@taxiassur.com (admin au lieu de master)
```

### 2. Vérifier le Mot de Passe

**Erreurs Courantes**:
- `TaxiAssur2025!&` ❌ (manque la virgule)
- `taxiassur2025!,&` ❌ (pas de majuscules)
- `TaxiAssur2025!,` ❌ (manque &)
- `TaxiAssur2025!.&` ❌ (point au lieu de virgule)

**Correct**:
- `TaxiAssur2025!,&` ✅

### 3. Vider le Cache

Si le problème persiste:
1. Ouvrez la console (F12)
2. Tapez: `localStorage.clear()`
3. Tapez: `sessionStorage.clear()`
4. Appuyez sur Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)

### 4. Mode Incognito

Testez en navigation privée:
1. Ctrl+Shift+N (Chrome) ou Ctrl+Shift+P (Firefox)
2. Allez sur: https://taxiassur.com/backoffice
3. Essayez de vous connecter

## 📞 Script de Diagnostic

Si vraiment bloqué, exécutez:

```bash
node scripts/fix-admin-password-now.js
```

Ce script va:
1. Vérifier que l'utilisateur existe
2. Tester différents mots de passe
3. Réinitialiser le mot de passe si nécessaire

## ✅ Confirmation

**Utilisateur Vérifié**:
- ID: `abfe659d-6eb7-46a9-92aa-aa30edfbe200`
- Email: `master@taxiassur.com`
- Créé le: 02/01/2026
- Mot de passe: `TaxiAssur2025!,&` ✅ FONCTIONNE

---

**En cas de doute**: Copiez-collez directement depuis ce document!
