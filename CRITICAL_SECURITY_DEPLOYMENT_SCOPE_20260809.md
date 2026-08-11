# Périmètre de déploiement critique — 9 août 2026

Ce manifeste sépare les correctifs TaxiAssur vérifiés des modifications historiques présentes dans le même worktree. Il interdit un déploiement global aveugle.

## Lot A — base de données, à appliquer avant le frontend

- `supabase/migrations/20260809032500_disable_legacy_public_prospect_document_read.sql`
- `supabase/migrations/20260809061000_minimize_public_payment_reference_data.sql`
- `supabase/migrations/20260809065500_remove_public_client_access_by_lead_id.sql`
- `supabase/migrations/20260809072000_require_access_token_for_client_portal_rpcs.sql`
- `supabase/migrations/20260809081500_add_private_rib_storage_path.sql`
- `supabase/migrations/20260809100000_make_prospect_documents_bucket_private.sql`

La migration `072000` doit être appliquée dans une transaction de préproduction puis contrôlée avec un jeton inexistant, sans données réelles. Ne pas utiliser `db push` avant d’avoir inspecté la liste complète des migrations en attente.

## Lot B — Edge Functions critiques

- `invite-admin-user`
- `send-sms`
- `send-sms-brevo`
- `send-whatsapp`
- `send-client-access`
- `upload-client-document`
- `sign-document-url`
- `client-subscription`
- `create-monetico-payment`
- `send-payment-link-monetico`
- `test-monetico-signature`

Le script `scripts/deploy-critical-supabase-security.ps1` ne déploie que ce lot.

## Lot C — frontend client indissociable de la migration 072000

- `src/lib/client-access.ts`
- `src/lib/client-consent.ts`
- `src/lib/client-requests.ts`
- `src/pages/ClientAccessByToken.tsx`
- `src/pages/EspaceClient.tsx`
- les pages sous `src/pages/client/` converties vers les RPC `*_by_token`

Ne jamais publier le lot C avant le lot A : l’espace client appellerait des RPC encore absents.

## Contrôles obligatoires

1. `npm run security:verify-critical`
2. `npm run test:run`
3. `npm run build`
4. `npm run security:verify-production-privileged`
5. test d’un lien client valide, puis d’un jeton aléatoire invalide
6. test documents, sinistres, demandes, consentements, notifications, paiements et parrainage
7. test SMS, WhatsApp et e-mail sans journaliser de secret ni de donnée personnelle

## Hors périmètre automatique

Les fichiers IA, SEO, CRM et documentation modifiés avant cette intervention ne doivent pas être ajoutés à un commit de sécurité sans revue fonctionnelle séparée. La clé MAC Monetico précédemment exposée doit être considérée compromise et remplacée côté fournisseur et secrets Supabase.
