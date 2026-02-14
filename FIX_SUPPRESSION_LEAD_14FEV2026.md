# Fix Suppression Lead - Fonction delete_spam_lead Manquante - 14 Février 2026

## Problème Résolu

Lorsqu'un commercial tentait de supprimer un lead depuis le CRM, une erreur était affichée :

```
Erreur : Could not find the function public.delete_spam_lead(to_lead_id, p_reason)
in the schema cache
```

**Lead concerné** : TONY CERDA (tcerda@xcr.fr, +33180855781)

---

## Cause

La fonction RPC `delete_spam_lead` était appelée par le frontend (`LeadDeleteSecure.tsx`) mais n'existait pas dans la base de données.

---

## Solution

Migration créée et appliquée avec succès : `fix_delete_spam_lead_function_2026.sql`

**Contenu** :
1. Table `lead_deletion_log` pour l'audit des suppressions
2. Fonction `safe_delete_lead()` pour suppression sécurisée
3. Fonction `delete_spam_lead()` pour appel RPC depuis le frontend

---

## Résultat

Les commerciaux peuvent maintenant supprimer des leads indésirables (doublons, spam, etc.) depuis le CRM. Chaque suppression est enregistrée dans les logs d'audit avec :
- Qui a supprimé (admin)
- Quand (timestamp)
- Pourquoi (raison sélectionnée)
- Données complètes du lead (JSON)

---

**Date** : 14 Février 2026
**Status** : ✅ Fonction créée et fonctionnelle
**Migration** : ✅ Appliquée
**Build** : ✅ Réussi (1m 5s)
