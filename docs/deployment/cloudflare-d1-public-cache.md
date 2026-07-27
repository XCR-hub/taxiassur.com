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

Le fichier genere est ignore par Git : `cloudflare/d1/generated/public-cache.sql`.

## Verification

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