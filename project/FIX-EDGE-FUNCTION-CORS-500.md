# 🔧 Fix Edge Function - CORS + Erreur 500

## 🎯 Problème

```
Access to fetch has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present
POST /generate-seo-content net::ERR_FAILED 500 (Internal Server Error)
```

**Causes possibles:**
1. Edge function crash avant d'envoyer headers CORS
2. Erreur dans le code TypeScript (syntaxe)
3. Variables d'environnement manquantes (OPENAI_API_KEY)

---

## 🚀 Solution Immédiate

### Option 1: Vérifier les Logs (Recommandé)

```
Dashboard Supabase > Edge Functions > generate-seo-content > Logs
```

**Chercher:**
- Erreurs TypeScript (syntax error)
- Variables undefined (OPENAI_API_KEY not found)
- Stack trace du crash

### Option 2: Test Direct API

```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"keyword": "test", "city": "Paris", "mode": "unified"}'
```

**Si erreur 500:** Voir le message d'erreur exact

### Option 3: Redéployer avec Logs Debug

**Ajouter au début de Deno.serve:**

```typescript
Deno.serve(async (req: Request) => {
  console.log('🚀 Request received:', req.method, req.url);

  if (req.method === "OPTIONS") {
    console.log('✅ OPTIONS request - returning CORS headers');
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('📝 Parsing request body...');
    const body = await req.json();
    console.log('📦 Body:', JSON.stringify(body));

    // Vérifications
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured!');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenAI API key not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ... reste du code
  } catch (error) {
    console.error('💥 Unhandled error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

---

## 🔍 Diagnostic Complet

### Étape 1: Vérifier Variables Environnement

```sql
-- Dashboard Supabase > Settings > Vault
-- Vérifier que ces secrets existent:
```

**Secrets requis:**
- `OPENAI_API_KEY`: sk-proj-...
- `PEXELS_API_KEY`: votre-cle-pexels
- `SUPABASE_URL`: https://drohhxrkoequjphvabvq.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: eyJhbGciOiJI...

**Si manquants, ajouter:**

```
Dashboard Supabase > Settings > Vault > New Secret

Name: OPENAI_API_KEY
Value: sk-proj-...
```

### Étape 2: Vérifier Déploiement

```
Dashboard Supabase > Edge Functions > generate-seo-content
```

**Status:** Doit être "Active" (vert)

**Si "Failed" ou "Inactive":**
1. Cliquer sur "Deploy"
2. Copier le code depuis `supabase/functions/generate-seo-content/index.ts`
3. Redéployer

### Étape 3: Test Minimal

**Créer fonction test simplifiée:**

```typescript
// test-function.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test OK',
        received: body
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

**Déployer et tester:**
```bash
curl -X POST https://.../test-function \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Si ça marche → Problème dans la logique métier
Si ça marche pas → Problème infrastructure

---

## 🛠️ Corrections Probables

### Problème 1: OPENAI_API_KEY Manquante

**Symptôme:** Erreur 500 immédiate

**Solution:**
```
Dashboard Supabase > Settings > Vault > New Secret
Name: OPENAI_API_KEY
Value: sk-proj-... (votre clé OpenAI)
```

### Problème 2: Erreur Syntaxe TypeScript

**Symptôme:** Function ne déploie pas

**Solution:** Vérifier les logs de déploiement, corriger l'erreur

### Problème 3: Timeout OpenAI

**Symptôme:** Erreur après 30-60 secondes

**Solution:** Augmenter timeout ou réduire max_tokens

```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [...],
    temperature: 0.8,
    max_tokens: 4000, // Réduire de 6000 à 4000
  }),
  signal: AbortSignal.timeout(120000) // 2 minutes max
});
```

### Problème 4: Payload Trop Gros

**Symptôme:** Erreur 413 ou 500

**Solution:** Réduire max_tokens dans la requête OpenAI

---

## ✅ Checklist Debug

- [ ] Variables environnement configurées (Vault)
- [ ] Edge function déployée (Status: Active)
- [ ] Logs edge function consultés
- [ ] Test OPTIONS request OK
- [ ] Test POST minimal OK
- [ ] OPENAI_API_KEY valide testée
- [ ] CORS headers présents dans toutes les réponses

---

## 🚀 Redéploiement Propre

### Étape 1: Sauvegarder Code Actuel

```bash
# Télécharger depuis Dashboard Supabase
# Edge Functions > generate-seo-content > Code
```

### Étape 2: Vérifier Code Local

```typescript
// Vérifier que le fichier compile
deno check supabase/functions/generate-seo-content/index.ts
```

### Étape 3: Redéployer

**Via Dashboard:**
```
Edge Functions > generate-seo-content > Deploy
→ Copier tout le code
→ Deploy
→ Attendre 30 secondes
→ Vérifier Status: Active
```

### Étape 4: Tester

```javascript
// Console navigateur sur /backoffice/ai-generator
fetch('https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  body: JSON.stringify({
    keyword: 'test',
    city: 'Paris',
    mode: 'unified'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## 📋 Solution Rapide (5 min)

**Si vous n'avez pas le temps de debugger:**

1. **Vérifier OPENAI_API_KEY:**
   ```
   Dashboard > Settings > Vault > OPENAI_API_KEY
   → Doit commencer par "sk-proj-..."
   ```

2. **Redéployer fonction:**
   ```
   Dashboard > Edge Functions > generate-seo-content > Deploy
   → Status doit passer à "Active"
   ```

3. **Tester:**
   ```
   /backoffice/ai-generator
   → Remplir formulaire
   → Générer
   → Doit marcher
   ```

**Si erreur persiste:**
→ Consulter les logs (Edge Functions > Logs)
→ Copier erreur exacte
→ Corriger le code spécifique

---

## 🔗 Liens Utiles

- **Logs Edge Function:** Dashboard > Edge Functions > Logs
- **Secrets:** Dashboard > Settings > Vault
- **Deno Deploy Docs:** https://deno.com/deploy/docs
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions

---

**Date:** 23 octobre 2025
**Problème:** CORS + 500 sur generate-seo-content
**Cause probable:** OPENAI_API_KEY manquante ou erreur syntaxe
**Solution:** Vérifier Vault + consulter logs + redéployer
