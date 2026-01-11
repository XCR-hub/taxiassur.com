# 📚 Shared Functions Library

This directory contains **shared utility functions** that can be imported by multiple Edge Functions.

⚠️ **IMPORTANT**: Files in this directory are **NOT** Edge Functions themselves. They are libraries/utilities that are imported by actual Edge Functions.

## ❌ Do NOT Deploy These Files

These files should **NEVER** be deployed as standalone Edge Functions:
- `email-tracking.ts` - Email tracking utilities

## ✅ How to Use

Import these utilities in your Edge Functions like this:

```typescript
import { trackEmail, addLinkTracking } from '../_shared/email-tracking.ts';
```

## 📝 .funcignore

The `.funcignore` file at the root of `/supabase` ensures these files are not treated as Edge Functions during deployment.

## 🔧 Available Utilities

### email-tracking.ts
- `trackEmail()` - Track email sends with click/open tracking
- `addLinkTracking()` - Add click tracking to HTML links
- `addTrackingPixel()` - Add invisible open tracking pixel
- `updateEmailStatus()` - Update email status in database
- `logEmailInteraction()` - Log CRM interactions
