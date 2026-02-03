# Correction Problème Email et Lead Manquant

Date: 3 février 2026

## Problèmes Identifiés et Corrigés

### 1. Lead Soufiane Karim manquant ✅

**Cause**: Le lead n'a jamais été créé dans la base de données

**Solution**: Lead créé manuellement
- ID: `509a8b49-6fc8-4ce7-a2a0-6d26de60889d`
- Email: transport.kcn@gmail.com
- Téléphone: 0759168566
- Ville: Mantes-la-Jolie
- Immatriculation: DN-690-NC

### 2. Système de notifications défectueux ✅

**Cause**: Triggers utilisant les mauvais noms de colonnes

**Solution**: 
- Migration `fix_notification_trigger_column_name` appliquée
- Composant `RealtimeNotifications.tsx` corrigé
- Utilisation de `event_type`, `is_read`, `priority` (numérique)

### 3. Système d'emails ne fonctionne pas ⚠️

**Cause**: Settings database manquants (app.settings.*)

**À corriger**:
```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://drohhxrkoequjphvabvq.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_KEY';
```

## État Actuel

✅ Lead Soufiane Karim créé
✅ Notification créée et visible
✅ Composant notifications corrigé
⚠️ Emails non synchronisés (table vide)

