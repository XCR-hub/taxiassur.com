# 🚀 Démarrage Rapide - 3 Commandes

## Étape 1 : Installer Supabase CLI

```bash
npm install -g supabase
```

## Étape 2 : Configurer tous les secrets automatiquement

```bash
npm run secrets:configure
```

**Durée** : 2-3 minutes
**Résultat** : Tous les secrets (emails, IA, réseaux sociaux) seront configurés

## Étape 3 : Vérifier la configuration

```bash
npm run secrets:list
```

**Résultat** : Vous verrez la liste de tous les secrets configurés

---

## ✅ C'est tout !

Votre système est maintenant configuré avec :
- ✅ Emails automatiques (IONOS)
- ✅ Intelligence artificielle (OpenAI)
- ✅ Publications réseaux sociaux (LinkedIn, Pinterest)
- ✅ Génération d'images (Pexels)
- ✅ Paiements (Monético MODE TEST)

---

## 🧪 Test rapide

Pour tester que tout fonctionne :

```bash
# 1. Allez sur le backoffice
https://taxiassur.com/admin/dashboard

# 2. Ouvrez un lead et générez un lien de paiement

# 3. Vérifiez que vous recevez l'email
```

---

## 📚 Documentation complète

Pour plus d'informations, consultez :
- `RECAP_CONFIGURATION_COMPLETE_2026.md` - Vue complète
- `CONFIGURATION_SECRETS_GUIDE_RAPIDE.md` - Guide détaillé
- `SYSTEME_PAIEMENT_MONETICO_COMPLET_2026.md` - Système de paiement

---

## ⚠️ Avant la mise en PRODUCTION

Demandez à Ingineco les identifiants Monético PRODUCTION :
- `MONETICO_TPE`
- `MONETICO_MAC_KEY`

Puis configurez-les :
```bash
supabase secrets set MONETICO_MODE="production"
supabase secrets set MONETICO_TPE="VOTRE_TPE"
supabase secrets set MONETICO_MAC_KEY=REDACTED
```

---

*Besoin d'aide ? team@taxiassur.com ou 01 80 85 57 86*
