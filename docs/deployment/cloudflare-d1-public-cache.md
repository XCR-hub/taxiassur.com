# Cloudflare D1 Public Cache

## Role

D1 sert de premiere etape pour reduire la dependance a Supabase. La base `taxiassur-prod` contient un cache SQL serverless des donnees publiques et SEO de TaxiAssur.

Binding Cloudflare Pages :

```toml
[[d1_databases]]
binding = "TAXIASSUR_DB"
database_name = "taxiassur-prod"
database_id = "ced89fdb-d3b3-4a3b-aef1-04c827ef339d"
```

## Tables D1

- `public_content_cache` : articles, pages villes, FAQ, actualites.
- `gsc_metrics_cache` : pages et requetes Google Search Console.
- `public_cache_metadata` : horodatage de generation, volumes importes et tables couvertes par le dernier cache.

Les donnees sont stockees sous forme de cache denormalise avec colonnes d'index principales et un champ `payload` JSON complet. Ce choix evite une migration PostgreSQL vers SQLite trop fragile au depart.

## Import depuis la sauvegarde Supabase

1. Appliquer le schema D1 :

```powershell
npm run d1:apply-schema
```

2. Generer le SQL depuis la derniere sauvegarde REST Supabase :

```powershell
npm run d1:build-public-cache
```

3. Importer dans D1 :

```powershell
npm run d1:import-public-cache
```

Le fichier genere est ignore par Git : `cloudflare/d1/generated/public-cache.sql`. L import applique le schema avant les donnees afin que `public_cache_metadata` existe toujours avant le chargement.

Depuis la correction du 27 octobre 2026, l'import est incremental : il utilise un UPSERT conditionnel et ne reecrit pas les lignes inchangees. Les suppressions ciblent uniquement les identifiants disparus de chaque table source, par blocs de taille bornee. Les caches ne sont plus vides avant chaque actualisation horaire. Un snapshot manquant, invalide, contenant des doublons ou des lignes trop volumineuses fait echouer la generation ; le dernier fichier SQL complet reste intact.

Ce changement reduit les ecritures et la reconstruction des index lors des actualisations ordinaires. Une premiere importation ou une modification massive reste soumise au quota du compte Cloudflare, partage avec les autres sites. Ne pas relancer un rechargement complet pour contourner une erreur de quota. Les tests SQLite sont executes avant chaque import automatique et dans les controles de pull request.

## Verification

Verification directe des metadonnees et volumes reels D1 apres import :

```powershell
npm run d1:verify-public-cache-metadata
```

Cette verification echoue si :

- les metadonnees `generated_at`, `imported_rows` ou `tables` manquent ;
- le cache depasse `MAX_D1_CACHE_AGE_HOURS` ;
- une table attendue n'a aucune ligne dans D1 ;
- les volumes reels sont sous les seuils par defaut : `blog_posts=100`, `city_pages=100`, `faq_entries=50`, `news_articles=500`, `gsc_pages=100`, `gsc_queries=100` ;
- le total reel dans `public_content_cache` + `gsc_metrics_cache` ne correspond pas a `public_cache_metadata.imported_rows`.

Les seuils peuvent etre ajustes par table avec `MIN_D1_<TABLE>_ROWS`, par exemple `MIN_D1_NEWS_ARTICLES_ROWS=1000`.

Modes de verification :

- `D1_VERIFY_MODE=auto` (defaut) interroge directement l API Cloudflare si les secrets sont presents, sinon utilise l endpoint public `/api/d1/health`.
- `D1_VERIFY_MODE=direct` exige `CLOUDFLARE_ACCOUNT_ID` et `CLOUDFLARE_API_TOKEN` ou `CLOUDFLARE_D1_API_TOKEN`.
- `D1_VERIFY_MODE=public` force le controle via `SITE_URL/api/d1/health`, utile sur un poste local sans secrets Cloudflare.

Endpoint de sante :

```text
https://taxiassur.com/api/d1/health
```

Lecture d'un contenu par slug :

```text
https://taxiassur.com/api/d1/content?table=blog_posts&slug=<slug>
```

## Limites volontaires

Cette phase ne migre pas encore le CRM, l'authentification, les documents, les paiements, les emails ou les crons d'ecriture. Pour les documents, il faudra utiliser Cloudflare R2. Pour le CRM, il faut d'abord mettre en place une double ecriture Supabase + D1 et comparer les resultats avant bascule.
