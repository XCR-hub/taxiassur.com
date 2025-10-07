# 🎯 SOLUTION DÉFINITIVE - AFFICHAGE DES LEADS

## 🐛 LE PROBLÈME

**Symptôme :**
- ✅ Supabase contient les vraies données (nom, email, téléphone)
- ❌ Le backoffice affiche "Lead anonyme" avec champs vides

**Cause :**
Le fichier `lead-manager.php` actuel lit depuis les **fichiers JSON locaux** (`/content/leads/`) au lieu de **Supabase**.

**Preuve :**
```json
// Ce que retourne l'API actuelle :
{
  "id": "lead_68e581ab954817",
  "status": "taxi",
  "city": "melun"
  // ❌ MANQUE: name, email, phone !
}
```

---

## ✅ LA SOLUTION

Remplacer `lead-manager.php` par la version qui lit **directement depuis Supabase**.

---

## 📤 FICHIERS À UPLOADER SUR IONOS

### Option 1 : Remplacement complet (RECOMMANDÉ)

**Fichier à uploader :**
```
/public/api/lead-manager-supabase.php
```

**Actions :**
1. Sur IONOS, **renommez** l'ancien fichier :
   - `/api/lead-manager.php` → `/api/lead-manager-OLD.php`

2. **Uploadez** le nouveau fichier :
   - `/api/lead-manager-supabase.php`

3. **Renommez** le nouveau fichier :
   - `/api/lead-manager-supabase.php` → `/api/lead-manager.php`

### Option 2 : Test d'abord (PRUDENT)

1. **Uploadez** le fichier de test :
   ```
   /public/api/test-supabase-leads.php → /api/test-supabase-leads.php
   ```

2. **Testez** dans votre navigateur :
   ```
   https://taxiassur.com/api/test-supabase-leads.php
   ```

3. **Vérifiez** que vous voyez :
   ```
   ✅ CONNEXION SUPABASE RÉUSSIE
   Nom: tony cerda
   Email: tcerda@xcr.fr
   Téléphone: 0683526751
   ```

4. Si OK → Uploadez `lead-manager-supabase.php` et renommez-le

---

## 🔍 DIFFÉRENCE ENTRE LES DEUX VERSIONS

### Ancien fichier (lead-manager.php)
```php
// Ligne 73-82
$leadsPath = LEADS_DIR . '/' . $currentMonth;
if (is_dir($leadsPath)) {
    $files = glob($leadsPath . '/lead-*.json');
    foreach ($files as $file) {
        $data = json_decode(file_get_contents($file), true);
    }
}
```
❌ Lit depuis `/content/leads/202510/lead-xxx.json` (incomplets)

### Nouveau fichier (lead-manager-supabase.php)
```php
// Ligne 52
$result = supabaseRequest('GET', 'leads?select=*&order=created_at.desc');
```
✅ Lit depuis **Supabase** (données complètes)

---

## 🧪 TESTS APRÈS UPLOAD

### 1. Test direct de l'API

**URL :**
```
https://taxiassur.com/api/lead-manager.php?action=list
```

**Résultat attendu :**
```json
{
  "success": true,
  "leads": [
    {
      "id": "2019ed5c-dadf-480a-8a6b-ea039aa74c3c",
      "name": "tony cerda",
      "email": "tcerda@xcr.fr",
      "phone": "0683526751",
      "city": "melun",
      "status": "taxi",
      "leadStatus": "nouveau"
    }
  ]
}
```

✅ Si vous voyez `"name": "tony cerda"` → C'est BON !
❌ Si vous voyez `"status": "taxi"` sans `name` → Ancien fichier encore actif

### 2. Test du backoffice

1. Ouvrez le backoffice → **Gestion des leads**
2. **Videz le cache** (Ctrl + Shift + R)
3. **Actualisez** la page

**Résultat attendu :**
- ✅ Client : "tony cerda" (pas "Lead anonyme")
- ✅ Contact : "tcerda@xcr.fr" (pas vide)
- ✅ Téléphone : "0683526751" (pas vide)
- ✅ Ville : "melun" (correct)

---

## 🔧 EN CAS DE PROBLÈME

### Problème 1 : Toujours "Lead anonyme"

**Cause :** Cache navigateur ou ancien fichier encore actif

**Solutions :**
1. Videz le cache complet du navigateur
2. Vérifiez sur IONOS que le fichier a bien été remplacé
3. Vérifiez la date de modification du fichier
4. Testez avec `?action=list` directement

### Problème 2 : Erreur 500

**Cause :** PHP ou cURL non disponible

**Solutions :**
1. Vérifiez version PHP (minimum 7.4) dans panneau IONOS
2. Vérifiez que cURL est activé
3. Consultez les logs d'erreur PHP sur IONOS

### Problème 3 : "cURL error"

**Cause :** Serveur ne peut pas contacter Supabase

**Solutions :**
1. Vérifiez la connexion internet du serveur
2. Testez avec le fichier `test-supabase-leads.php`
3. Contactez support IONOS

---

## 📊 CE QUE CONTIENT LE NOUVEAU FICHIER

### Fonctionnalités :

✅ **Liste des leads** depuis Supabase (action=list)
✅ **Mise à jour du statut** (action=update)
✅ **Envoi devis** (action=send_devis)
✅ **Envoi contrat** (action=send_contract)

### Conversion automatique :

| Supabase (snake_case) | Frontend (camelCase) |
|-----------------------|----------------------|
| `name` | `name` |
| `email` | `email` |
| `phone` | `phone` |
| `city` | `city` |
| `lead_status` | `leadStatus` |
| `created_at` | `createdAt` |
| `contacted_at` | `contactedAt` |
| `devis_envoye_at` | `devisEnvoyeAt` |
| `client_at` | `clientAt` |

---

## 🎯 CHECKLIST FINALE

- [ ] 1. Upload `test-supabase-leads.php` sur IONOS
- [ ] 2. Test dans navigateur → Voir les vraies données
- [ ] 3. Renommer ancien `lead-manager.php` en `lead-manager-OLD.php`
- [ ] 4. Upload `lead-manager-supabase.php`
- [ ] 5. Renommer en `lead-manager.php`
- [ ] 6. Test API : `?action=list` → Voir `"name": "tony cerda"`
- [ ] 7. Backoffice → Vider cache → Actualiser
- [ ] 8. Vérifier que "Lead anonyme" → "tony cerda"

---

## 🚀 RÉSUMÉ ULTRA-SIMPLE

**1 fichier à remplacer :**
```
lead-manager.php
```

**Nouveau fichier :**
```
lead-manager-supabase.php → renommer en lead-manager.php
```

**Résultat :**
- ✅ Toutes les données s'affichent
- ✅ Nom, email, téléphone visibles
- ✅ Plus de "Lead anonyme"

**Uploadez et c'est réglé ! 🎉**
