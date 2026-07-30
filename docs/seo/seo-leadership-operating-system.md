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
- `public/sitemap.xml` liste les pages indexables canoniques sur `https://taxiassur.com`.
- `public/robots.txt` bloque les zones privees et les doublons legacy `/ville/`.
- `public/llms.txt` et `public/ai.txt` exposent les pages publiques de reference aux assistants IA.
- `npm run verify:seo-leadership` controle les signaux locaux et, en production, les canonicals HTML reelles.

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