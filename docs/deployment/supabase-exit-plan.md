# TaxiAssur Supabase Exit Plan

## Objectif

Reduire progressivement la dependance a Supabase tout en gardant le site, les leads, les emails, les workflows et le contenu SEO operationnels.

## Etat verifie le 2026-08-01

- Le site public `taxiassur.com` est servi par Cloudflare Pages.
- Le flux de production Cloudflare Pages est verifie par `npm run verify:production` apres deploiement.
- Cloudflare D1 `taxiassur-prod` reste operationnel comme cache public SEO de secours.
- Le proxy public `/api/postgres-public/*` lit le miroir PostgreSQL local sans exposer le token serveur au navigateur.
- Les lectures publiques SEO `blog_posts`, `city_pages`, `faq_entries` et `news_articles` utilisent le cache autonome PostgreSQL puis D1, sans fallback direct Supabase cote navigateur.
- La generation du sitemap de build lit les endpoints publics PostgreSQL puis D1, pagine les contenus publics et conserve le sitemap existant si les sources publiques sont indisponibles.
- Les endpoints publics `postgres-public/list` et `d1/list` supportent `limit`/`offset` avec tri stable pour eviter les doublons ou les variations entre builds.
- Les endpoints de sante exposent les metadonnees de fraicheur du cache D1 et du miroir PostgreSQL public ; les workflows Cloudflare Pages, D1 et health check les exigent en mode strict.
- Les compteurs publics verifies en production sont : 779 articles blog, 376 pages villes, 153 FAQ, 2981 actualites, 1433 pages GSC et 1943 requetes GSC.
- Le workflow GitHub `Refresh Cloudflare D1 Cache` fonctionne avec le secret dedie `CLOUDFLARE_D1_API_TOKEN`.
- Le serveur `192.168.1.70` heberge un miroir PostgreSQL local sous `F:\TaxiAssur`.
- La sync Supabase REST -> PostgreSQL local est cadencee toutes les 60 minutes et les compteurs publics PostgreSQL/D1 sont alignes en production.
- Dernier etat fonctionnel du miroir serveur : sync `ok`, 444 tables OK sur 444, 239237 lignes synchronisees, sauvegarde `taxiassur_20260801-134530.dump`.
- Une API Node de lecture seule est prete dans `server/postgres-read-api.mjs` et installable via `scripts/install-server-postgres-read-api.ps1`.
- La verification production controle le site, D1, le proxy PostgreSQL, l'alignement des compteurs publics et l'absence de tags Google avant consentement.
- Les workflows GitHub executent maintenant `verify:client-compliance`, `verify:production` apres deploiement Cloudflare, et `Production Health Check` toutes les 2 heures.
- Supabase reste la base primaire pour le CRM, les leads, les emails, les SMS, les paiements, les documents, Auth, Realtime, Edge Functions et crons.
- Le scan antivirus documents est pret cote base et peut etre installe en tache planifiee serveur avec `scripts/install-server-clamav-document-scan.ps1`.
- ClamAV `1.5.3` est installe sur `SERVEUR-XCR`, les signatures sont stockees dans `F:\TaxiAssur\ClamAV\db`, et les taches `TaxiAssurDocumentClamAVScan` / `TaxiAssurClamAVFreshclamUpdate` sont planifiees.
- Le depot GitHub bloque maintenant les fuites de secrets via `npm run security:scan-secrets` dans les workflows de validation, de deploiement Cloudflare et de refresh D1.
- Vercel reste uniquement une option historique/rollback, non indispensable au flux Cloudflare actuel.

Voir aussi : `docs/deployment/server-postgres-mirror.md`.

## Etat verifie le 2026-07-27

- Le site public `taxiassur.com` est servi par Cloudflare Pages.
- Vercel reste uniquement une option de rollback.
- Les sauvegardes REST Supabase peuvent etre exportees vers `D:\Nextcloud\Developpement TAXIASSUR\backups`.
- Une sauvegarde logique a deja ete creee dans `D:\Nextcloud\Developpement TAXIASSUR\backups\supabase-rest-node-20260727-191255`.
- Le serveur `192.168.1.70` repond au ping, mais les ports testes `22`, `445` et `5432` ne repondent pas.
- `pg_dump` et `psql` ne sont pas installes localement.
- Docker CLI est installe, mais Docker Engine n'etait pas demarre pendant la verification.

## Sauvegarde disponible

Le script `scripts/backup-supabase-rest.cjs` exporte les tables accessibles par l'API REST Supabase avec une cle service role, en JSONL, et copie aussi les migrations, fonctions Supabase et workflows GitHub.

Variables requises :

```powershell
$env:SUPABASE_URL = "https://<project>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
npm run backup:supabase-rest
```

Destination par defaut :

```text
D:\Nextcloud\Developpement TAXIASSUR\backups
```

Ce format est utile comme sauvegarde logique et comme pont de migration, mais ce n'est pas un `pg_dump` complet. Il ne preserve pas integralement les schemas internes Supabase, `auth`, `storage`, les roles PostgreSQL, politiques RLS, extensions, triggers, publications realtime et metadata plateforme.

## Chemin recommande

1. Continuer les sauvegardes REST regulieres pour disposer d'une copie exploitable des donnees metier.
2. Recuperer le mot de passe PostgreSQL Supabase ou une chaine de connexion directe.
3. Installer `pg_dump` et `psql`, ou demarrer Docker Desktop pour utiliser les outils PostgreSQL dans un conteneur.
4. Faire un dump PostgreSQL complet hors Nextcloud.
5. Preparer une instance cible sur `192.168.1.70` ou un dossier local dedie hors synchronisation cloud.
6. Restaurer le dump complet, puis tester les Edge Functions, le CRM, les emails, les SMS, les paiements, les crons SEO et les workflows de publication.
7. Basculer progressivement les variables d'environnement du site et des workflows.

## Options d'independance

### Option A - Supabase self-hosted

Avantage : migration plus proche de l'existant, Edge Functions et APIs PostgREST similaires.

Prerequis principaux : Docker Engine actif, stockage persistant hors dossier synchronise, sauvegardes automatiques, supervision, rotation des secrets, configuration SMTP/SMS/paiement, et exposition reseau securisee si le site doit y acceder.

### Option B - Backend sur mesure

Avantage : controle maximal et moins de dependance au modele Supabase.

Inconvenient : il faut remplacer l'authentification, le stockage, les API REST, les crons, les fonctions, les policies RLS et les integrations. C'est plus long et plus risque que le self-hosting Supabase.


### Option C - Cloudflare D1 pour le cache public

Avantage : tres bon alignement avec Cloudflare Pages, lecture rapide depuis le reseau Cloudflare, sauvegardes Time Travel D1, et reduction immediate de la dependance Supabase pour les contenus SEO publics.

Perimetre conseille au depart : `blog_posts`, `city_pages`, `faq_entries`, `news_articles`, `gsc_pages`, `gsc_queries`.

Limite : D1 est base sur SQLite, pas PostgreSQL. Il ne remplace pas directement Supabase Auth, Storage, Realtime, les Edge Functions et les policies RLS. Le CRM doit etre migre plus tard avec une phase de double ecriture.

## Point important stockage

Les exports de sauvegarde peuvent etre stockes dans Nextcloud. En revanche, les fichiers actifs d'une base PostgreSQL ne doivent pas etre places dans un dossier synchronise Nextcloud. Pour une base active, utiliser un dossier dedie local ou serveur, par exemple `D:\TaxiAssurPostgresData` avec droits adaptes et sauvegardes planifiees.

## Feuille de route depuis l'etat actuel

### Phase 1 - Deja fait

- Site public sur Cloudflare Pages.
- Cache public Cloudflare D1 pour contenus SEO et donnees GSC.
- Miroir PostgreSQL local sur `192.168.1.70`.
- Sync D1 automatisee par GitHub Actions.
- Scan anti-secrets dans les workflows CI/deploiement.

### Phase 2 - Prochaine etape sure

- Verifier regulierement le miroir avec `npm run server:verify-postgres-mirror -- -UseStoredCredentials` ; ce check echoue si la sync, la tache horaire, le dump ou l espace disque ne sont pas sains.
- Redeployer les scripts de sync/backup serveur avec `npm run server:deploy-postgres-sync -- -UseStoredCredentials`.
- Installer et tester l'API interne en lecture seule devant PostgreSQL local.
- Exposer cette API uniquement via un tunnel/reverse proxy securise, jamais directement via l'IP LAN.
- Brancher un endpoint non critique du backoffice en double lecture pour comparer Supabase et PostgreSQL local.
- Maintenir le garde-fou `npm run verify:self-hosted-first` pour empecher le retour de fallbacks Supabase sur les lectures SEO publiques.
- Surveiller les taches planifiees ClamAV et les rapports de scan documents.

### Phase 3 - Avant toute bascule metier

- Migrer ou remplacer Auth, Storage, Edge Functions, crons, RLS et webhooks.
- Mettre en place une double ecriture controlee pour les leads/CRM.
- Comparer les donnees sur plusieurs jours avant de changer la source primaire.
- Prevoir un rollback documente vers Supabase.
