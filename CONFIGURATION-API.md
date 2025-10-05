# 🔑 Configuration des Clés API - TaxiAssur

## 📍 **Où Mettre les Clés API ?**

### **Méthode 1 : Fichier .env (Recommandé)**
```env
# Créez un fichier .env à la racine du projet
VITE_CSE_API_KEY=AIzaSyC...
VITE_CSE_CX=017576662...
VITE_OPENAI_API_KEY=sk-...
VITE_SENDGRID_API_KEY=SG....
```

### **Méthode 2 : Variables d'Environnement IONOS**
Dans votre **panneau IONOS** → **Variables d'environnement** :
```
VITE_CSE_API_KEY = AIzaSyC...
VITE_CSE_CX = 017576662...
OPENAI_SECRET_KEY = sk-...
SENDGRID_SECRET_KEY = SG....
```

### **Méthode 3 : .htaccess (Alternative)**
```apache
SetEnv VITE_CSE_API_KEY "AIzaSyC..."
SetEnv VITE_CSE_CX "017576662..."
SetEnv OPENAI_SECRET_KEY "sk-..."
SetEnv SENDGRID_SECRET_KEY "SG...."
```

## 🔑 **Clés API Nécessaires**

### **Google Custom Search Engine (Partner Finder)**
```env
VITE_CSE_API_KEY=AIzaSyC...        # Clé API Google
VITE_CSE_CX=017576662...           # ID du moteur de recherche
```

**Comment obtenir :**
1. **Google Cloud Console** → API & Services → Credentials
2. **Custom Search Engine** → cse.google.com

### **OpenAI (IA Actualités)**
```env
VITE_OPENAI_API_KEY=sk-...         # Clé publique (frontend)
OPENAI_SECRET_KEY=sk-...           # Clé secrète (backend)
```

**Comment obtenir :**
1. **OpenAI Platform** → platform.openai.com
2. **API Keys** → Create new secret key

### **SendGrid (Emails)**
```env
VITE_SENDGRID_API_KEY=SG....       # Clé publique
SENDGRID_SECRET_KEY=SG....         # Clé secrète
```

**Comment obtenir :**
1. **SendGrid** → app.sendgrid.com
2. **Settings** → API Keys → Create API Key

### **Stripe (Paiements - Optionnel)**
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_...  # Clé publique
STRIPE_SECRET_KEY=sk_...            # Clé secrète
```

## 🛡️ **Sécurité des Clés**

### **Clés Publiques (VITE_)**
- ✅ **Visibles côté client** (React)
- ✅ **Pas de risque** si exposées
- ✅ **Limitées par domaine** dans les consoles

### **Clés Secrètes (sans VITE_)**
- ❌ **JAMAIS côté client**
- ✅ **Serveur PHP uniquement**
- ✅ **Variables d'environnement** obligatoires

## 🧪 **Test de Configuration**

### **Vérifier vos APIs**
```
https://taxiassur.com/config-api-keys.php?debug=apis
```

### **Test Partner Finder**
```
https://taxiassur.com/backoffice/partner-finder
```

## 📋 **Priorités par Fonctionnalité**

### **🔍 Partner Finder (Priorité Haute)**
```env
VITE_CSE_API_KEY=AIzaSyC...
VITE_CSE_CX=017576662...
```

### **🤖 IA Actualités (Priorité Moyenne)**
```env
OPENAI_SECRET_KEY=sk-...
```

### **📧 Emails Avancés (Priorité Basse)**
```env
SENDGRID_SECRET_KEY=SG....
```

## ⚠️ **Important**

### **Sans Clés API**
- ✅ **Site fonctionne** normalement
- ✅ **Mode simulation** pour Partner Finder
- ✅ **Fallback** vers fonctions de base

### **Avec Clés API**
- 🚀 **Fonctionnalités complètes** activées
- 🎯 **Recherche réelle** de prospects
- 🤖 **IA** pour synthèse actualités

---

**Commencez par Google CSE pour Partner Finder, c'est le plus utile !** 🎯