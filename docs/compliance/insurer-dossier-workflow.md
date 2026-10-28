# Demandes de devis assureurs — moteur natif XCR

Le premier parcours concerne AXA taxi. Les coordonnées professionnelles sont enregistrées dans `insurer_quote_workflows`, avec la référence des échanges vérifiés. Aucun contact ni numéro client n’est déduit d’un autre dossier. No hidden contact import.

## Préparer le dossier

Le back-office affiche le numéro client AXA, le questionnaire confirmé, les pièces validées du prospect et le justificatif sélectionné pour le véhicule à assurer. Le conseiller vérifie aussi le permis recto-verso, les antécédents, les consultations déjà effectuées et l’adéquation des pièces avant d’enregistrer sa vérification. Une modification des documents ou du questionnaire invalide cette vérification.

RIB, offres concurrentes, circulaires internes et documents d’un autre prospect sont exclus. Une pièce doit exister sur le serveur, appartenir au dossier, passer le contrôle antivirus et conserver son empreinte jusqu’à l’envoi. Le dossier incomplet reste visible dans la liste de préparation AXA. Les oppositions et dossiers clos sont exclus des transmissions.

## Transmettre et suivre

L’API authentifiée enregistre la demande dans `insurer_dossier_sends`. Un verrou transactionnel et une vérification de l’historique évitent les doubles demandes. Ce parcours n’utilise pas la file de courriels aux prospects.

Le programme `server/native-insurer-worker.mjs` utilise le compte **tcerda@xcr.fr**, avec Tony en copie et la signature XCR. Il transmet réellement les fichiers par JMAP et vérifie la copie dans les éléments envoyés. Le mot de passe reste chiffré sous Windows DPAPI LocalMachine ; aucun secret ne doit entrer dans Git, les journaux ou les réponses API.

L’intention de transmission est écrite sur disque avant l’appel d’envoi. Si le résultat reste incertain, le statut `delivery_unknown` suspend toute nouvelle tentative automatique. Une acceptation par la messagerie ne signifie pas que le destinataire a lu le message.

Les réponses portant la référence du dossier sont rapprochées avec le domaine de l’assureur. Un accusé de réception ne vaut pas devis. Absence, incident de distribution, refus de souscription et proposition à vérifier restent distincts. Les propositions et leurs pièces sont signalées dans le back-office et restent consultables dans la messagerie de Tony ; elles ne sont pas publiées au prospect sans vérification.

Les relances J+2 et J+5 sont limitées à deux tentatives identifiées. Une réponse, une opposition ou une modification du dossier arrête leur transmission. Une tentative existante, même incertaine, n’est pas recréée. Pour une absence ou un rejet, vérifier l’interlocuteur professionnel de remplacement avant de réorienter les pièces.

## Exécution indépendante de Codex

Sur **SERVEUR-XCR**, `scripts/install-native-insurers.ps1` installe la tâche **TaxiAssur Native Insurer Quotes**, sous **SYSTEM**, au démarrage et toutes les cinq minutes. Le verrou du programme et la règle de non-chevauchement empêchent plusieurs exécutions simultanées. Le test `-PreflightOnly` lance d’abord une simulation sous le même compte, sans envoyer de courriel.

Ce programme doit être déployé et son dernier rapport contrôlé avant d’annoncer une automatisation active. La fermeture de Codex ou du PC utilisateur n’arrête pas une tâche effectivement installée sur le serveur. Le serveur, PostgreSQL, la messagerie et la connexion réseau doivent rester disponibles. La saisie navigateur Generali suit son propre dispositif et ses horaires.

État et preuves privées : `F:\TaxiAssur\Automation\Insurers\last-run.json`, `dry-run.json`, journaux par transmission et `automation_worker_health`. Le back-office affiche le dernier passage et les éléments manquants par dossier.

L’ancien programme Supabase `process-insurer-dossier-sends` est conservé comme historique de migration ; les commandes npm d’exploitation pointent vers le moteur natif.
