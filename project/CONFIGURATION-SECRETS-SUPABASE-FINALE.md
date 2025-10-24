# 🔐 CONFIGURATION SECRETS SUPABASE - VALEURS RÉELLES

## ✅ VOS CREDENTIALS

### 📦 GitHub
- **Token:** `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`
- **Repository:** À déterminer (voir section ci-dessous)

### 🌐 FTP IONOS (SFTP)
- **Host:** `home749874859.1and1-data.host`
- **Port:** `22` (SFTP)
- **Protocol:** `SFTP`
- **Username:** `acc1591324770`
- **Password:** `TAXIassur2025!,&`

---

## 📋 ÉTAPE 1 : Trouver Votre Repository GitHub

### Qu'est-ce que `GITHUB_REPO` ?

Le format est: `username/repository-name`

**Exemples:**
- Si ton username GitHub est `taxiassur` et ton repo s'appelle `website` → `taxiassur/website`
- Si ton username GitHub est `pierretaxi` et ton repo s'appelle `taxiassur` → `pierretaxi/taxiassur`
- Si ton username GitHub est `taxiassur-official` et ton repo s'appelle `production` → `taxiassur-official/production`

### Comment trouver ?

**Option 1: Sur GitHub.com**
1. Va sur https://github.com/
2. Connecte-toi avec ton compte
3. Regarde l'URL de ton repository TaxiAssur
4. L'URL sera: `https://github.com/USERNAME/REPOSITORY`
5. Copie juste la partie `USERNAME/REPOSITORY`

**Option 2: Si tu ne connais pas**
```bash
# Si tu as git installé localement, dans le dossier du projet:
git remote -v
# Résultat: origin  https://github.com/USERNAME/REPOSITORY.git
```

**Option 3: Demande-moi**
Si tu ne trouves pas, dis-moi juste ton username GitHub ou l'URL complète de ton repo.

---

## 🔧 ÉTAPE 2 : Configurer dans Supabase

### A. Via Supabase Dashboard (RECOMMANDÉ)

1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet TaxiAssur
3. Dans le menu gauche, clique **Settings** (icône engrenage)
4. Clique **Vault** ou **Edge Function Secrets**
5. Pour chaque secret ci-dessous, clique **New Secret**

### B. Secrets à Ajouter

#### 1️⃣ GITHUB_TOKEN
```
Name: GITHUB_TOKEN
Value: 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
```

#### 2️⃣ GITHUB_REPO
```
Name: GITHUB_REPO
Value: [À REMPLACER PAR TON USERNAME/REPO]

Exemples possibles:
- taxiassur/website
- taxiassur/production
- pierretaxi/taxiassur
- ton-username/ton-repo
```

#### 3️⃣ FTP_HOST
```
Name: FTP_HOST
Value: home749874859.1and1-data.host
```

#### 4️⃣ FTP_PORT
```
Name: FTP_PORT
Value: 22
```

#### 5️⃣ FTP_USER
```
Name: FTP_USER
Value: acc1591324770
```

#### 6️⃣ FTP_PASSWORD
```
Name: FTP_PASSWORD
Value: TAXIassur2025!,&
```

#### 7️⃣ FTP_PROTOCOL (optionnel)
```
Name: FTP_PROTOCOL
Value: sftp
```

---

## ⚠️ IMPORTANT: SFTP vs FTP

Tu as un **SFTP** (port 22) et non un FTP classique (port 21).

**L'Edge Function `ftp-auto-deploy` doit être adaptée pour SFTP.**

Je vais la corriger maintenant.

---

## 📊 VÉRIFICATION

Après avoir ajouté tous les secrets, tu devrais voir dans Supabase Vault:

```
✅ OPENAI_API_KEY (déjà existant)
✅ GITHUB_TOKEN (nouveau)
✅ GITHUB_REPO (nouveau)
✅ FTP_HOST (nouveau)
✅ FTP_PORT (nouveau)
✅ FTP_USER (nouveau)
✅ FTP_PASSWORD (nouveau)
```

---

## 🚀 ÉTAPE 3 : Appliquer Migrations SQL

Une fois les secrets configurés, applique les migrations dans **Supabase SQL Editor**:

### Migration 1 (Tables + Fonctions)
Fichier: `20251022210000_create_ai_auto_improvement_system.sql`

### Migration 2 (Cron Jobs - CORRIGÉE)
Fichier: `20251022220000_activate_ai_auto_improvement_crons.sql`

---

## 🔍 ÉTAPE 4 : Trouver Ton GITHUB_REPO

### Je ne peux pas deviner, mais voici comment faire:

**Si tu as déjà un repo GitHub pour TaxiAssur:**

1. Ouvre https://github.com/
2. Connecte-toi
3. Trouve ton repo TaxiAssur
4. L'URL sera quelque chose comme:
   - `https://github.com/taxiassur/website`
   - `https://github.com/pierretaxi/taxiassur`
   - `https://github.com/ton-username/ton-repo`

5. Copie juste la partie après `github.com/`:
   - `taxiassur/website`
   - `pierretaxi/taxiassur`
   - `ton-username/ton-repo`

**Si tu n'as PAS de repo GitHub:**

1. Crée-en un sur https://github.com/new
2. Nom suggéré: `taxiassur-website` ou `taxiassur-production`
3. Privé ou public selon préférence
4. Une fois créé, tu verras l'URL
5. Utilise `username/repository-name`

**Si tu ne sais pas:**

Donne-moi:
- Ton username GitHub
OU
- L'URL complète de ton repository

Et je te dirai la valeur exacte pour `GITHUB_REPO`.

---

## 📝 RÉSUMÉ VALEURS

```yaml
# GitHub
GITHUB_TOKEN: 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
GITHUB_REPO: [À DÉTERMINER - ton-username/ton-repo]

# FTP IONOS (SFTP)
FTP_HOST: home749874859.1and1-data.host
FTP_PORT: 22
FTP_PROTOCOL: sftp
FTP_USER: acc1591324770
FTP_PASSWORD: TAXIassur2025!,&
```

---

## ✅ PROCHAINES ÉTAPES

1. **MAINTENANT:** Trouve ton `GITHUB_REPO`
2. **ENSUITE:** Configure les 7 secrets dans Supabase
3. **PUIS:** Applique les 2 migrations SQL
4. **ENFIN:** Déploie les 3 Edge Functions

**Dès que tu me donnes ton username GitHub ou l'URL de ton repo, je te donne la valeur exacte !** 🚀
