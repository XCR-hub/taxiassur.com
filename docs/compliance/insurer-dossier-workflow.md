# Insurer Dossier Workflow

## Scope

The backoffice can queue a complete insurer dossier after the prospect's file is ready for quote entry. The operator chooses the insurer recipient and the exact documents to attach. The browser does not send SMTP directly.

## Operational Flow

1. `SendToInsurerModal` calls `create_insurer_dossier_send`.
2. The database stores the request in `insurer_dossier_sends` with recipient, selected documents, operator, timestamps and metadata.
3. `process-insurer-dossier-sends` is called by pg_cron or by the self-hosted script `scripts/process-insurer-dossier-sends.cjs`.
4. The worker sends the initial email with the selected documents.
5. If no human marks a response with `mark_insurer_dossier_responded`, the worker sends two follow-ups: J+2 then J+5.
6. Every send, failure and manual response stop is logged into `crm_interactions`.

## Compliance Guardrails

- No hidden contact import.
- No browser history collection.
- No mailbox scraping.
- No covert retargeting or partner data sharing in this workflow.
- The only recipient is the explicitly selected insurer contact or the email typed by the backoffice user.
- The only attachments are the documents explicitly selected by the backoffice user.

## Human Supervision

When the insurer replies, the backoffice must mark the dossier as responded using `mark_insurer_dossier_responded`. This stops the automatic follow-up chain and keeps the audit trail readable.

## Security

The worker accepts only service-role calls. Public or anonymous calls must return `401 Unauthorized`. The direct SMTP function remains a lower-level delivery dependency; the browser-facing backoffice workflow now writes to the auditable outbox first.
