# Shared Functions Library

This directory contains shared utility functions imported by Edge Functions.

Important: files in this directory are not Edge Functions and must not be deployed as standalone functions.

## Usage

```typescript
import { trackEmail, addLinkTracking } from '../_shared/email-tracking.ts';
```

## email-tracking.ts

- `trackEmail()` records an email send and injects open/click tracking only when `trackingConsent: true` is provided.
- `addLinkTracking()` and `addTrackingPixel()` are low-level helpers and must only be called after explicit consent has been checked.
- `updateEmailStatus()` updates email status in the database.
- `logEmailInteraction()` logs CRM interactions.

Open/click tracking metadata must set `email_tracking_allowed: true`; otherwise the public tracking endpoints refuse to write events.
