# 🔧 GUIDE RAPIDE : Activer l'enregistrement des leads dans Supabase

## ✅ SITUATION ACTUELLE

Votre système **FONCTIONNE DÉJÀ** pour :
- ✅ Envoi des emails (commercial@xcr.fr, tcerda@xcr.fr, client)
- ✅ Validation et sécurité du formulaire
- ✅ Connexion à Supabase configurée

**Le seul problème :** La politique RLS (Row Level Security) bloque l'insertion depuis le formulaire web.

---

## 🚀 SOLUTION EN 3 ÉTAPES

### ÉTAPE 1 : Ouvrir le SQL Editor de Supabase

1. Allez sur : https://supabase.com/dashboard/project/viuuznfqkauatkjcegcj
2. Cliquez sur **"SQL Editor"** dans le menu de gauche
3. Cliquez sur **"New query"**

### ÉTAPE 2 : Exécuter cette commande SQL

Copiez-collez ce code SQL et cliquez sur **"RUN"** :

```sql
-- Create policy for anonymous INSERT on leads
CREATE POLICY IF NOT EXISTS "Allow anonymous users to submit leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);
```

### ÉTAPE 3 : Vérifier que ça fonctionne

Exécutez cette requête pour vérifier :

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'leads';
```

Vous devriez voir **2 politiques** :
1. `Service role has full access to leads` (service_role, ALL)
2. `Allow anonymous users to submit leads` (anon, INSERT)

---

## ✅ APRÈS CETTE MODIFICATION

Le formulaire fonctionnera **automatiquement** :

1. **Le visiteur remplit le formulaire** sur taxiassur.com
2. **Les données sont enregistrées dans Supabase** (table `leads`)
3. **3 emails sont envoyés** :
   - commercial@xcr.fr (notification principale)
   - tcerda@xcr.fr (copie pour suivi)
   - Client (email de confirmation)

---

## 🧪 TESTER LE FORMULAIRE

### Depuis la console du navigateur (F12)

```javascript
// Test direct d'insertion dans Supabase
const { createClient } = supabase;
const supabase = createClient(
  'https://viuuznfqkauatkjcegcj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdXV6bmZxa2F1YXRramNlZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNzMzNDAsImV4cCI6MjA0ODk0OTM0MH0.D0wo88ypG2OiZL3wCiUGgMyA3OaqzIjKU2Nbo-oxOjA'
);

const { data, error } = await supabase
  .from('leads')
  .insert({
    name: 'Test Console',
    email: 'test@console.com',
    phone: '0612345678',
    city: 'Paris',
    status: 'taxi',
    source: 'test_console'
  })
  .select();

console.log('Résultat:', data, error);
```

Si vous voyez `data` avec un objet et `error: null`, **ça marche** !

---

## 📊 VISUALISER LES LEADS

**Dans Supabase Dashboard :**
1. Cliquez sur **"Table Editor"** dans le menu
2. Sélectionnez la table **"leads"**
3. Vous verrez tous les leads soumis en temps réel

**Colonnes importantes :**
- `name`, `email`, `phone`, `city` : Infos client
- `behavior_score` : Score de confiance (0-100)
- `time_on_page` : Temps passé sur la page (en ms)
- `emails_sent` : Nombre d'emails envoyés (devrait être 3)
- `created_at` : Date de soumission

---

## 🔒 SÉCURITÉ

Cette politique est **SÉCURISÉE** car :

✅ Seule l'insertion (`INSERT`) est autorisée pour les utilisateurs anonymes
✅ Lecture, modification et suppression restent bloquées
✅ Les contraintes CHECK valident les données (statut, score, etc.)
✅ Le code applicatif vérifie honeypot, rate limiting, fingerprint

---

## ❓ EN CAS DE PROBLÈME

### Erreur : "new row violates row-level security policy"

→ La commande SQL n'a pas été exécutée. Retournez à l'ÉTAPE 2.

### Erreur : "permission denied for table leads"

→ Vérifiez que vous utilisez bien la clé `anon` et non `service_role`.

### Les emails ne partent pas

→ Vérifiez que l'Edge Function `send-email` est bien déployée :
```bash
# Dans votre terminal
supabase functions list
```

---

## 📞 SUPPORT

Pour toute question :
- **Email technique** : tcerda@xcr.fr
- **Dashboard Supabase** : https://supabase.com/dashboard/project/viuuznfqkauatkjcegcj

---

✅ **Une fois la commande SQL exécutée, le formulaire fonctionnera immédiatement sans rebuild !**
