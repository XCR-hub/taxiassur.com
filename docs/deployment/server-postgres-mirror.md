# TaxiAssur Server PostgreSQL Mirror

## Role actuel

Le serveur `192.168.1.70` heberge un miroir PostgreSQL local de TaxiAssur. Ce miroir sert a reduire le risque de dependance Supabase et a disposer d'une copie exploitable hors cloud.

Ce miroir n'est pas encore la base primaire du site public.

## Etat connu au 2026-07-28

- PostgreSQL a ete installe sur le serveur Windows `192.168.1.70`.
- Les donnees sont stockees sous `F:\TaxiAssur\PostgreSQL`.
- Les scripts et secrets serveur sont sous `F:\TaxiAssur`.
- Le miroir complet a ete restaure depuis une sauvegarde PostgreSQL locale.
- La synchronisation Supabase REST vers PostgreSQL local a ete configuree.
- Dernier etat fonctionnel rapporte : 444 tables OK, 0 table en echec, 7072 lignes importees.
- Le site public continue d'utiliser Supabase pour les donnees dynamiques privees et metier.
- Les donnees publiques SEO sont aussi cachees dans Cloudflare D1.

## Verification

Depuis le poste local :

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verify-server-postgres-mirror.ps1
```

Le script demande les identifiants Windows du serveur via `Get-Credential`, ouvre une session WinRM, puis verifie :

- presence des dossiers `F:\TaxiAssur`, `PostgreSQL`, `Scripts`, `Secrets`, `Backups` ;
- services PostgreSQL/TaxiAssur ;
- taches planifiees TaxiAssur/Supabase/PostgreSQL ;
- derniers rapports JSON ;
- derniers fichiers de sauvegarde ;
- espace disque.

Le rapport local est ecrit ici :

```text
C:\Users\TCERD\taxiassur-server-mirror-status-192-168-1-70.json
```

## Pourquoi ne pas basculer directement le site dessus

`192.168.1.70` est une IP privee LAN. Cloudflare Pages, les Workers et les internautes ne peuvent pas joindre cette IP directement depuis Internet.

Pour utiliser ce serveur comme backend public, il faut d'abord ajouter une couche d'exposition securisee, par exemple :

- Cloudflare Tunnel vers une API interne ;
- VPN prive plus reverse proxy ;
- API publique durcie avec TLS, authentification, rate limiting et journalisation.

Sans cette couche, le serveur est utile comme miroir, sauvegarde et environnement de reprise, mais pas comme backend direct du site public.

## Prochaine bascule raisonnable

1. Garder Supabase en base primaire tant que les workflows CRM, emails, paiements, documents, auth et crons y ecrivent encore.
2. Continuer la synchronisation Supabase -> PostgreSQL local.
3. Utiliser Cloudflare D1 pour les lectures publiques SEO deja migrables.
4. Ajouter une API interne devant PostgreSQL local, d'abord en lecture seule.
5. Tester une double lecture sur quelques endpoints non critiques.
6. Ensuite seulement, envisager la double ecriture puis la bascule progressive des modules metier.

## Limites restantes

Le miroir PostgreSQL ne remplace pas automatiquement :

- Supabase Auth ;
- Supabase Storage et les documents ;
- Realtime ;
- Edge Functions ;
- crons Supabase/pg_cron ;
- policies RLS ;
- webhooks existants ;
- variables et secrets des integrations tierces.
