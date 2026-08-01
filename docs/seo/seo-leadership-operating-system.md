# TaxiAssur SEO operating system

Objectif: renforcer la visibilite de TaxiAssur sur les recherches assurance taxi, assurance taxi professionnelle, devis assurance taxi et requetes locales utiles.

Aucune modification technique ne peut garantir une position numero 1 Google. Le systeme doit donc viser des signaux durables: pages utiles, canonicals propres, sitemap fiable, donnees structurees coherentes, performance, suivi GSC et amelioration editoriale continue.

## Regles non negociables

- Ne pas publier de pages creees uniquement pour capter des variantes de mots cles.
- Ne pas dupliquer des pages ville si le contenu visible n apporte pas d information locale utile.
- Ne pas injecter de donnees structurees qui ne correspondent pas au contenu visible.
- Ne pas reutiliser de donnees clients, prospects, emails, telephones ou navigation hors consentement explicite et finalite documentee.
- Garder les espaces prives hors index: backoffice, client, prospect, paiement, API, webhooks.

## Socle technique installe

- `functions/_middleware.js` injecte des balises SEO route par route en HTML brut Cloudflare Pages.
- `public/sitemap.xml` sert de baseline de secours ; le build genere le sitemap publie dans `dist/sitemap.xml` depuis les sources publiques PostgreSQL puis D1.
- `public/robots.txt` bloque les zones privees et les doublons legacy `/ville/`.
- `public/llms.txt` et `public/ai.txt` exposent les pages publiques de reference aux assistants IA.
- `npm run verify:seo-leadership` controle les signaux locaux, le sitemap de build quand il existe, le sitemap live et les canonicals HTML reelles en production. En production, le workflow exige aussi `seo-content-map.json` pour que Cloudflare injecte les vrais titres/descriptions des pages dynamiques au lieu de les reconstruire depuis les slugs.
- `npm run seo:quality-audit` repere les slugs casses, les doublons, les URLs trop longues et les clusters de pages a risque.

## Cycle de publication automatique

1. Recuperer les donnees GSC utiles: requetes, pages, impressions, clics, CTR, position moyenne.
2. Prioriser les contenus avec intention commerciale ou besoin d aide reel.
3. Ameliorer les pages existantes avant de creer de nouvelles URLs.
4. Generer une nouvelle page seulement si elle repond a un besoin distinct.
5. Verifier avant publication: titre, H1, description, canonical, liens internes, donnees structurees, absence de duplication.
6. Publier, regenerer le sitemap, puis controler en production.

## Commandes de controle

```powershell
npm run verify:seo-leadership
npm run verify:production
npm run security:scan-secrets
```

Pour un controle local avant deploiement sans appeler le site live:

```powershell
$env:SKIP_LIVE_SEO_CHECK='1'; npm run verify:seo-leadership
```

## Point Cloudflare a surveiller

Cloudflare peut ajouter des regles robots gerees avant le `robots.txt` du projet. Si TaxiAssur veut etre davantage visible dans les assistants IA, verifier dans Cloudflare que les controles AI crawler ne bloquent pas GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot ou Google-Extended contre l intention business.

Reglage cible pour TaxiAssur: garder `public/robots.txt` comme source de verite et desactiver le `robots.txt` manage Cloudflare (`is_robots_txt_managed=false`). Le script suivant ne modifie que ce parametre et laisse les autres protections bots inchangees:

```powershell
$env:CLOUDFLARE_BOT_MANAGEMENT_API_TOKEN='<token Cloudflare avec droits Bot Management sur la zone>'
# Optionnel si le token ne peut pas lister les zones ni lire les domaines Pages:
# $env:CLOUDFLARE_ZONE_ID='<zone id taxiassur.com>'
# Optionnel pour resolution automatique via les domaines Cloudflare Pages:
$env:CLOUDFLARE_ACCOUNT_ID='<account id Cloudflare>'
$env:CLOUDFLARE_PAGES_PROJECT='taxiassur'
# Commande interactive conseillee si le token est dans le presse-papiers ou doit etre saisi masque:
npm run cloudflare:ai-robots:fix -- -DryRun
npm run cloudflare:ai-robots:fix

# Variante non interactive:
npm run cloudflare:ai-robots -- --dry-run
npm run cloudflare:ai-robots
Remove-Item Env:\CLOUDFLARE_BOT_MANAGEMENT_API_TOKEN
```

Zone id verifie via Cloudflare Pages le 2026-07-31 : `6db20e6211bb587c873310cba0578f24` pour `taxiassur.com`.

Le workflow Cloudflare Pages lance aussi cette commande en mode `--soft` avec `CLOUDFLARE_BOT_MANAGEMENT_API_TOKEN` si le secret existe, sinon avec `CLOUDFLARE_API_TOKEN`. Il transmet aussi `CLOUDFLARE_ZONE_ID` si le secret existe et `CLOUDFLARE_PAGES_PROJECT=taxiassur` pour resoudre automatiquement le `zone_tag` depuis les domaines Pages. Si le token n a pas les droits Bot Management, le deploiement continue mais le warning live reste visible dans `npm run verify:seo-leadership`.

Diagnostic du 2026-08-01: le deploiement Cloudflare Pages passe, mais l etape `Align Cloudflare AI robots access` recoit `Cloudflare API 403` sur `/bot_management`. Le token actuel a donc assez de droits pour publier Pages, mais pas pour modifier le `robots.txt` manage par Cloudflare. Tant que ce reglage reste actif, le `robots.txt` live bloque avant nos regles projet: GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, Amazonbot, CCBot, Bytespider et meta-externalagent.

Action durable: creer ou corriger le secret GitHub `CLOUDFLARE_BOT_MANAGEMENT_API_TOKEN` avec un token Cloudflare autorise sur la zone `taxiassur.com` pour lire/modifier les reglages Bot Management / AI crawler. Le droit `Pages Write` seul ne suffit pas. Garder aussi `CLOUDFLARE_ZONE_ID=6db20e6211bb587c873310cba0578f24` pour eviter les resolutions de zone fragiles.
