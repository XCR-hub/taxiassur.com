# ⚡ RÉSUMÉ RAPIDE - CONFIG CRON EN 5 MIN

## 🎯 CE QU'IL VOUS FAUT

### 1. VOTRE_REF_PROJET (ex: abcdefghijklmnop)

**Où le trouver :**
```
Supabase Dashboard → ⚙️ Project Settings → API

Vous voyez :
Project URL: https://abcdefghijklmnop.supabase.co
                     ^^^^^^^^^^^^^^^^
                     COPIER CETTE PARTIE !
```

**RACCOURCI :** Regarder l'URL de votre navigateur
```
https://supabase.com/dashboard/project/abcdefghijklmnop/...
                                        ^^^^^^^^^^^^^^^^
                                        C'EST VOTRE REF !
```

---

### 2. VOTRE_SERVICE_ROLE_KEY (longue chaîne eyJ...)

**Où le trouver :**
```
Même page (Project Settings → API)

Scroller vers le bas :

service_role secret
••••••••••••••••••• [Copy] [Reveal]
                            ^^^^^^
                    1. Cliquer Reveal
                    2. Puis Copy
```

**Ressemble à :**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk1MDAwMDAwLCJleHAiOjE4NTI3NjY0MDB9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## ✅ CONFIGURATION (3 étapes)

### Étape 1 : Récupérer vos identifiants (2 min)
```
□ REF copié
□ Service Role Key copiée
```

### Étape 2 : Modifier le fichier template (1 min)
```
1. Ouvrir : cron-config-template.sql
2. Chercher/Remplacer : VOTRE_REF_PROJET → votre-ref
3. Chercher/Remplacer : VOTRE_SERVICE_ROLE_KEY → votre-cle
```

### Étape 3 : Exécuter dans Supabase (2 min)
```
1. Supabase → SQL Editor
2. Copier/coller le fichier modifié
3. Run
4. Success ✅
```

---

## 🧪 VÉRIFICATION

```sql
SELECT * FROM cron.job;
```

**Devrait montrer 4 crons actifs :**
- ai-social-scraper-6h
- ai-email-responder-30min
- calculate-ambassador-rankings-daily
- engagement-monitoring-hourly

---

## 💡 EXEMPLE RÉEL

**Votre URL :** `https://xyzabc123456.supabase.co`
**Votre REF :** `xyzabc123456`

**Dans le fichier SQL, remplacer :**
```sql
url := 'https://VOTRE_REF_PROJET.supabase.co/...'
```

**Par :**
```sql
url := 'https://xyzabc123456.supabase.co/...'
```

---

## ⚠️ ATTENTION

- **Ne JAMAIS** partager votre service_role key
- **Ne JAMAIS** la mettre dans le code frontend
- Elle donne accès TOTAL à votre database

---

**C'est tout ! Guide détaillé : `TROUVER-REF-PROJET-SUPABASE.md`** 🚀
