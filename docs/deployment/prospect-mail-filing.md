# Classement privé des échanges prospects

Le worker `server/prospect-mail-worker.mjs` classe les messages des deux comptes vérifiés `tcerda@xcr.fr` et `team@architecteassur.com` dans `Prospects XCR / TaxiAssur ou ArchitecteAssur / nom du prospect et référence`.

Le rapprochement utilise une adresse participante exacte ou une référence explicite de dossier. Les adresses partagées et messages concernant plusieurs dossiers restent sans classement automatique. Les dossiers clôturés peuvent être classés pour conserver leur historique ; aucun message ni relance n'est envoyé.

Le classement ajoute une appartenance de dossier JMAP en conservant les dossiers existants, les indicateurs de lecture et la réception utilisée par les automates métier. Il ne supprime aucun message. Les messages d'origine restent dans leur boîte.

Dans le back-office `/backoffice/inbox-intelligent`, les groupes « Prospects TaxiAssur » et « Prospects ArchitecteAssur » donnent accès aux échanges. La collection privée `xcr_email_messages` conserve la provenance, les références et le texte du mail. Elle est distincte de la messagerie commerciale TaxiAssur pour éviter de déclencher des créations de prospects ou envois automatiques pour un autre produit. Les pieces jointes restent dans le message original. Le programme serveur TaxiAssur Prospect Mail Attachments copie aussi les PDF et images pris en charge dans les pieces a classer du bon prospect, apres rapprochement et antivirus. Elles restent non validees. Les formats non pris en charge demandent un traitement manuel.

Configuration chiffrée DPAPI LocalMachine et réservée à SYSTEM/Administrateurs : `F:\TaxiAssur\Automation\ProspectMail\private\config.json`. Ne jamais versionner ni afficher son contenu. Les opérations JMAP du worker sont limitées à la lecture des mails et à leur classement ; aucune opération d'envoi n'est implémentée.

Contrôle sans modification : `node F:\TaxiAssur\Api\prospect-mail-worker.mjs`. L'option `--apply` effectue le classement et la synchronisation. Le bilan est dans `health.json`. Après la première reprise historique, les passages suivants reprennent deux jours d'historique ; tout changement de liste des prospects déclenche une nouvelle recherche historique. Un verrou interdit deux exécutions simultanées. Les identifiants déterministes empêchent la duplication lors d'une reprise.

La tâche `XCR Prospect Mail Filing`, installée par `scripts/install-prospect-mail.ps1`, fonctionne sous SYSTEM au démarrage et toutes les quinze minutes, sans PC ouvert. Pour la suspendre, désactiver cette tâche. Conserver les dossiers et données déjà classés.

Une réponse JMAP `overQuota` à la création d'un dossier peut signaler le plafond de dossiers du compte, distinct du quota disque. Le diagnostic conserve le type d'erreur sans enregistrer de secret. Vérifier le quota `maxMailboxes` du compte concerné et sauvegarder sa valeur avant toute augmentation ciblée ; conserver les autres quotas. [Documentation Stalwart](https://stalw.art/docs/auth/authorization/quotas/).


## Extension SCIASSUR

Le r?pertoire de prospects SCIASSUR est lu en SQLite, en lecture seule (`XCR_SCIASSUR_SQLITE_PATH`, d?faut `C:/sciassur/sciassur-leads.sqlite`). Il conserve les identifiants et statuts du dossier source. Les dossiers SCIASSUR n’ont pas de `lead_id` TaxiAssur : ils sont visibles dans le groupe ? Prospects SCIASSUR ? et restent distincts des dossiers automobile. Le classement et la synchronisation ne changent pas les statuts source et ne d?clenchent aucun envoi.

Ajouter `team@sciassur.com` ? la liste priv?e des comptes seulement apr?s v?rification de son identifiant JMAP. Conserver les autres comptes d?j? configur?s. Le changement du r?pertoire des prospects d?clenche une reprise de l’historique ; les identifiants de synchronisation restent d?terministes. Une adresse participant ? plusieurs dossiers reste ? examiner manuellement. Les messages seulement mentionn?s dans le corps, sans adresse participante ni r?f?rence confirm?e, ne sont pas class?s automatiquement.
