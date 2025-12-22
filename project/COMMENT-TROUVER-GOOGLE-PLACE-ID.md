# 🔍 Comment Trouver Votre Google Place ID

Le **Google Place ID** est nécessaire pour créer un lien direct permettant à vos clients de laisser un avis sur votre fiche Google My Business.

---

## 📋 Méthode 1 : Via Google Place ID Finder (RAPIDE)

### Étape 1 : Aller sur l'outil

1. Ouvrir : **https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder**
2. Ou chercher sur Google : `"google place id finder"`

### Étape 2 : Rechercher votre établissement

1. Dans la barre de recherche sur la carte, taper : **"TaxiAssur"**
2. Ou taper votre adresse exacte
3. Cliquer sur le résultat de votre établissement

### Étape 3 : Récupérer le Place ID

1. Le Place ID s'affiche dans le panneau de gauche
2. Format : `ChIJ...` (commence toujours par `ChIJ`)
3. Copier ce code

**Exemple :**
```
ChIJN1t_tDeuEmsRUsoyG83frY4
```

---

## 📋 Méthode 2 : Via Google Maps (ALTERNATIVE)

### Étape 1 : Chercher votre établissement

1. Aller sur **https://www.google.com/maps**
2. Chercher : **"TaxiAssur"**
3. Cliquer sur votre fiche

### Étape 2 : Copier l'URL

1. L'URL dans la barre d'adresse contient des informations
2. Format : `https://www.google.com/maps/place/...`

### Étape 3 : Extraire le Place ID

Dans l'URL, chercher après `!1s` ou `data=` :

**Exemple d'URL :**
```
https://www.google.com/maps/place/TaxiAssur/@48.8566,2.3522,15z/data=!4m6!3m5!1s0x47e66e1f06e2b947:0xc04a117a0c3b0e3!8m2!3d48.8566!4d2.3522!16s%2Fg%2F11c5m7k9t9
```

Le Place ID est après `1s0x` → `ChIJN1t_tDeuEmsRUsoyG83frY4`

---

## 📋 Méthode 3 : Via l'API Google Places (DÉVELOPPEUR)

Si vous avez une clé API Google Places :

```bash
curl "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=TaxiAssur&inputtype=textquery&fields=place_id&key=VOTRE_CLE_API"
```

Réponse :
```json
{
  "candidates": [
    {
      "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4"
    }
  ]
}
```

---

## ✅ Vérifier que le Place ID est Correct

### Test du lien direct d'avis :

Une fois le Place ID récupéré, tester le lien :

```
https://search.google.com/local/writereview?placeid=VOTRE_PLACE_ID
```

**Remplacer `VOTRE_PLACE_ID` par votre Place ID**

**Exemple :**
```
https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4
```

### Ce qui doit se passer :

1. ✅ Redirection vers la page d'avis Google
2. ✅ Formulaire pour laisser un avis
3. ✅ Nom de votre établissement visible

### Si erreur :

- ❌ "Établissement introuvable" → Place ID incorrect
- ❌ Redirection vers Google Maps sans formulaire → Mauvais format

---

## 🎯 Utilisation du Place ID

Une fois récupéré, **me transmettre le Place ID** pour que je l'intègre dans :

1. **lead-manager.php** (ligne 350)
2. **Email template "review_request"**

### Format attendu :

```
Place ID: ChIJN1t_tDeuEmsRUsoyG83frY4
```

---

## 📝 Informations Complémentaires

### Où est stocké le Place ID ?

- **Fichier :** `public/api/lead-manager.php`
- **Ligne :** 350
- **Variable :** `$reviewLink`

### Format actuel (à remplacer) :

```php
$reviewLink = 'https://search.google.com/local/writereview?placeid=YOUR_GOOGLE_PLACE_ID';
```

### Format après intégration :

```php
$reviewLink = 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4';
```

---

## ❓ Questions Fréquentes

**Q: Le Place ID peut-il changer ?**
R: Non, c'est un identifiant permanent.

**Q: J'ai plusieurs établissements, lequel choisir ?**
R: Choisir l'établissement principal ou celui avec le plus d'avis.

**Q: Je n'ai pas de fiche Google My Business**
R: Il faut d'abord créer votre fiche sur https://business.google.com

**Q: Ça fonctionne pour tous les pays ?**
R: Oui, le Place ID est international.

---

## 🚀 Prochaines Étapes

1. ✅ Trouver votre Place ID avec l'une des méthodes
2. ✅ Tester le lien avec votre Place ID
3. ✅ Me transmettre le Place ID
4. ✅ J'intègre dans le code
5. ✅ Tests d'envoi d'email

---

**Besoin d'aide ?** Transmettez-moi simplement le nom exact de votre établissement et l'adresse, je peux vous aider à le trouver !
