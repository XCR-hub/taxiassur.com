# TaxiAssur Server PostgreSQL Mirror

## Role actuel

Le serveur `192.168.1.70` heberge un miroir PostgreSQL local de TaxiAssur. Ce miroir sert a reduire le risque de dependance Supabase et a disposer d'une copie exploitable hors cloud.

Ce miroir n'est pas encore la base primaire du site public.

## Etat verifie au 2026-08-01

- La synchronisation Supabase REST -> PostgreSQL local est operationnelle via la tache planifiee `TaxiAssur Supabase REST to PostgreSQL Sync`.
- La tache est configuree en repetition toutes les 60 minutes (`PT1H`), avec `MultipleInstances IgnoreNew` pour eviter les chevauchements si une sync est encore en cours.
- Dernier rapport serveur verifie : `ok`, 444 tables OK sur 444, 0 echec, 239502 lignes synchronisees, 0 ligne JSON invalide.
- Derniere sauvegarde PostgreSQL post-sync verifiee : `taxiassur_20260801-174017.dump` dans `F:\TaxiAssur\Backups\PostgreSQL`.
- Les compteurs publics PostgreSQL sont alignes avec D1 : 781 articles blog, 376 pages villes, 153 FAQ, 2981 actualites, 1433 pages GSC et 1943 requetes GSC.
- Les scripts serveur corriges sont maintenant versionnes dans le depot :
  - `scripts/server-sync-supabase-rest-to-postgres.ps1` ;
  - `scripts/server-backup-taxiassur-postgres.ps1` ;
  - `scripts/deploy-server-postgres-sync.ps1` ;
  - `scripts/verify-server-postgres-mirror.ps1`.
- Le parser `.env` ne doit pas utiliser `ConvertFrom-StringData` pour ces fichiers, car les chemins Windows comme `F:\TaxiAssur\...` peuvent etre interpretes comme des sequences d echappement.
- L'export REST reduit automatiquement la taille de page lorsqu'une table volumineuse renvoie une erreur HTTP 500, ce qui evite les echecs sur `email_inbox` et `email_messages` sans tronquer les tables.

Pour redeployer les scripts serveur avec les identifiants Windows deja stockes :

```powershell
npm run server:deploy-postgres-sync -- -UseStoredCredentials -SyncIntervalMinutes 60
```

Le parametre par defaut est 60 minutes. Garder au moins 30 minutes pour eviter des cycles de sync trop rapproches.

Pour redeployer puis lancer une sync complete immediatement :

```powershell
npm run server:deploy-postgres-sync -- -UseStoredCredentials -SyncIntervalMinutes 60 -RunNow
```
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
powershell -ExecutionPolicy Bypass -File scripts\verify-server-postgres-mirror.ps1 -UseStoredCredentials
```

Le script utilise les identifiants Windows stockes avec `-UseStoredCredentials`, ou demande les identifiants via `Get-Credential` si le switch est absent. Il ouvre une session WinRM, ecrit un rapport JSON local, affiche un resume lisible, puis sort en erreur si un garde-fou critique echoue.

Il verifie maintenant :

- presence des dossiers `F:\TaxiAssur`, `PostgreSQL`, `PostgreSQL\runtime\pgsql`, `Scripts`, `Secrets`, `Backups` et `Logs` ;
- service PostgreSQL actif ;
- binaires PostgreSQL runtime `psql.exe`, `pg_isready.exe` et `pg_dump.exe` ;
- tache `TaxiAssur Supabase REST to PostgreSQL Sync` presente, saine, cadencee a 60 minutes et configuree avec `MultipleInstances IgnoreNew` ;
- dernier rapport `F:\TaxiAssur\Logs\supabase-postgres-sync-latest.json` parseable, `ok`, sans table echouee, sans ligne JSON invalide et frais de moins de 4 heures ;
- dernier dump PostgreSQL frais, non trivial et stocke sous `F:\TaxiAssur\Backups\PostgreSQL` ;
- espace libre du disque `F:` superieur au seuil minimal.

Options utiles : `-MaxSyncAgeHours`, `-ExpectedSyncIntervalMinutes`, `-MaxRunningSyncHours`, `-MinDataDriveFreeGB`, `-MinPostgresBackupBytes`, `-PrintRawReport`.

Le controle public `npm run verify:publications` affiche aussi la fraicheur D1 (`generated_at`) et la derniere importation PostgreSQL (`imported_at`) par table. Si D1 a quelques lignes d'avance mais que l'ecart reste dans la tolerance, le rapport indique explicitement que le miroir PostgreSQL est en retard sur D1 et donne le decalage en minutes.

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
4. Installer l'API interne en lecture seule avec `scripts\install-server-postgres-read-api.ps1`.
5. Tester une double lecture sur quelques endpoints non critiques.
6. Ensuite seulement, envisager la double ecriture puis la bascule progressive des modules metier.

Voir aussi : `docs/deployment/postgres-read-api.md`.

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
