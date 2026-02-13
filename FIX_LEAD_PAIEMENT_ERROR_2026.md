# 🔧 Correction Erreur "Lead non trouvé"

## Problème identifié

Erreur rencontrée : **"Lead non trouvé: Cannot coerce the result to a single JSON object"**

Cette erreur se produisait lorsqu'un lead n'existait pas dans la base de données mais qu'on essayait de créer un paiement pour lui.

## Corrections appliquées

### 1. Edge Function `create-monetico-payment`

**Avant** : Utilisait `.single()` qui génère une erreur si aucun résultat
```typescript
.single(); // ❌ Erreur si pas de résultat
```

**Après** : Utilise `.maybeSingle()` qui retourne null si aucun résultat
```typescript
.maybeSingle(); // ✅ Retourne null proprement
```

**Amélioration des messages d'erreur** :
- Message clair : "Lead introuvable"
- Affichage de l'ID du lead concerné
- Distinction entre erreur DB et lead inexistant

### 2. Frontend `MoneticoPaymentManager.tsx`

**Amélioration de l'affichage des erreurs** :
- Affichage du message complet du serveur
- Affichage de l'ID du lead si fourni
- Meilleure gestion des détails d'erreur

## Déploiement

✅ Edge function déployée avec succès
✅ Frontend mis à jour

## Comment tester

1. **Rafraîchissez la page** du backoffice (Ctrl+F5)
2. Essayez de créer un paiement depuis l'étape 6 du pipeline
3. Si le lead n'existe pas, vous verrez maintenant :
   ```
   Lead introuvable: Aucun lead trouvé avec l'ID: xxx-xxx-xxx
   ```

## Vérifications à faire

Si l'erreur persiste, vérifiez que :

1. **Le lead existe dans la base** :
   ```sql
   SELECT id, email, first_name, last_name
   FROM crm_leads
   WHERE id = 'VOTRE_LEAD_ID';
   ```

2. **L'URL est correcte** :
   - URL visible : `/backoffice/crm-killer/lead/1f22521f-194a-44e0-8f50-a3cd91afe3c3`
   - Vérifiez que cet ID existe bien dans `crm_leads`

3. **Les permissions RLS** :
   - Vérifiez que vous avez les droits de lecture sur `crm_leads`

## Causes possibles du lead manquant

1. **Lead supprimé** : Le lead a été supprimé mais l'URL reste accessible
2. **Mauvais ID** : L'ID dans l'URL ne correspond à aucun lead
3. **Table différente** : Le lead est dans `leads` mais pas dans `crm_leads`

## Solution de contournement

Si vous voulez créer un paiement sans lead existant, utilisez la **Facturation Libre** dans le backoffice qui ne nécessite pas de lead ID.

---

**Prochaine étape** : Testez à nouveau la création de paiement avec un lead valide.
