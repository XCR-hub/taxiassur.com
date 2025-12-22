# 🚀 Déployer Edge Function Pinterest Boards Proxy - GUIDE RAPIDE

## ❌ Problème Actuel

L'Edge Function `pinterest-boards-proxy` existe dans le code mais **n'est PAS déployée** sur Supabase.

Résultat : Erreur CORS dans le navigateur.

---

## ✅ Solution : Déployer via Supabase Dashboard (2 minutes)

### Étape 1 : Aller sur Supabase Dashboard

1. **Connectez-vous** : https://supabase.com/dashboard
2. **Sélectionnez** votre projet TaxiAssur
3. **Cliquez** sur **"Edge Functions"** dans le menu de gauche

### Étape 2 : Créer la Fonction

1. **Cliquez** sur **"Create a new function"**
2. **Nom** : `pinterest-boards-proxy`
3. **Remplacez tout le code** par celui ci-dessous

### Étape 3 : Code à Copier-Coller

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Pinterest API Key from database
    const { data: pinterestConfig, error: configError } = await supabase
      .from("social_networks")
      .select("config")
      .eq("platform", "pinterest")
      .maybeSingle();

    if (configError || !pinterestConfig) {
      return new Response(
        JSON.stringify({ error: "Configuration Pinterest non trouvée" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = pinterestConfig.config?.api_key;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key Pinterest manquante" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("📌 Récupération des boards Pinterest...");

    // Call Pinterest API
    const response = await fetch("https://api.pinterest.com/v5/boards", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erreur Pinterest API:", errorText);
      throw new Error(`Pinterest API error: ${response.statusText}`);
    }

    const data = await response.json();
    const boards = data.items || [];

    console.log(`✅ ${boards.length} boards récupérés`);

    return new Response(
      JSON.stringify({
        success: true,
        boards: boards.map((board: any) => ({
          id: board.id,
          name: board.name,
          description: board.description,
          privacy: board.privacy,
          pin_count: board.pin_count,
        })),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Erreur:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
```

### Étape 4 : Déployer

1. **Cliquez** sur **"Deploy"**
2. **Attendez** 10-15 secondes (compilation Deno)
3. **Vérifiez** : Status = "Active" (vert)

---

## 🧪 Tester Immédiatement

Une fois déployée, **re-testez** le fichier `GET-PINTEREST-BOARD-ID.html` :

1. **Rechargez** la page `https://taxiassur.com/GET-PINTEREST-BOARD-ID.html`
2. **Cliquez** sur "📋 Récupérer Mes Boards"
3. **Résultat attendu** : Liste de vos boards Pinterest

---

## 🔍 Vérifier Si la Config Pinterest Existe

Si erreur "Configuration Pinterest non trouvée", exécutez dans Supabase SQL Editor :

```sql
-- Vérifier
SELECT * FROM social_networks WHERE platform = 'pinterest';

-- Si vide, ajouter
INSERT INTO social_networks (platform, config, is_active)
VALUES (
  'pinterest',
  jsonb_build_object(
    'api_key', 'pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA'
  ),
  true
)
ON CONFLICT (platform) DO UPDATE
SET config = EXCLUDED.config;
```

---

## ⚠️ Alternative : Utiliser Supabase CLI (Si Installé)

Si vous avez Supabase CLI installé localement :

```bash
cd /chemin/vers/votre/projet
supabase functions deploy pinterest-boards-proxy
```

---

## 📞 Si Ça Ne Marche Toujours Pas

**Vérifiez les logs Edge Function** :

1. Dashboard Supabase → **Edge Functions**
2. Cliquez sur **`pinterest-boards-proxy`**
3. Onglet **"Logs"**
4. Regardez les erreurs

**Erreurs possibles :**

| Erreur | Solution |
|--------|----------|
| "Configuration Pinterest non trouvée" | Exécutez le SQL ci-dessus |
| "API Key Pinterest manquante" | Vérifiez que `config.api_key` existe |
| "Pinterest API error: 401" | Votre API Key est invalide/expirée |
| "Pinterest API error: 403" | API Key n'a pas les permissions nécessaires |

---

## ✅ Une Fois Déployée

Vous pourrez :

1. **Récupérer vos Board IDs** via le fichier HTML
2. **Sauvegarder le Board ID** dans la config Pinterest
3. **Activer la publication automatique** sur Pinterest

---

## 🎯 Prochaine Étape

Après avoir déployé l'Edge Function et récupéré votre Board ID :

```sql
-- Mettre à jour avec votre Board ID
UPDATE social_networks
SET config = jsonb_set(
  config,
  '{board_id}',
  '"VOTRE_BOARD_ID_ICI"'
)
WHERE platform = 'pinterest';
```

Ensuite Pinterest sera **100% opérationnel** !

---

**Temps estimé : 2-3 minutes**

Dites-moi quand c'est fait !
