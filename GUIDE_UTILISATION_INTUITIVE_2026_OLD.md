# Guide d'Utilisation Intuitive - CRM TaxiAssur 2026

## ✅ Interface Optimisée et Accessible

Le système a été conçu pour être **extrêmement intuitif** et facile d'utilisation, tant pour les commerciaux que pour les gestionnaires.

---

## 👨‍💼 Pour les Commerciaux : Du Lead à la Vente

### 🎯 Point d'Entrée Principal

**URL** : `/backoffice/crm`

**Accès depuis le menu** :
```
Menu de navigation → CRM Vente → CRM Dashboard
```

### 📊 Dashboard Commercial (Vue d'Accueil)

Dès la connexion, le commercial voit :

```
┌─────────────────────────────────────────────────────────┐
│  🎯 CRM VENTE - DASHBOARD                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📈 MES STATISTIQUES                                    │
│  ┌──────────────┬──────────────┬──────────────┐       │
│  │ 24 Leads     │ 12 Devis     │ 7 Signatures │       │
│  │ Actifs       │ Envoyés      │ En Attente   │       │
│  └──────────────┴──────────────┴──────────────┘       │
│                                                         │
│  🚀 ACTIONS RAPIDES                                     │
│  ┌─────────────────────────────────────────────┐       │
│  │ ➕ Créer un nouveau lead                    │       │
│  │ 📋 Voir mes leads actifs                    │       │
│  │ 📊 Pipeline Kanban                          │       │
│  │ 📬 File de devis prêts                      │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  ⚠️ ALERTES ET NOTIFICATIONS                            │
│  • 3 documents reçus à valider                          │
│  • 2 prospects ont ouvert leur devis                    │
│  • 1 signature complétée ce matin                       │
│                                                         │
│  📋 MES DERNIERS LEADS                                  │
│  [Liste des 10 derniers leads avec actions]            │
└─────────────────────────────────────────────────────────┘
```

### 🎯 Workflow Commercial Intuitif

#### **Étape 1 : Création d'un Lead**

**Action** : Cliquer sur "➕ Créer un nouveau lead"

**Formulaire Simple** :
```
┌─────────────────────────────────────┐
│  NOUVEAU LEAD                       │
├─────────────────────────────────────┤
│  👤 Nom complet *                   │
│  ▸ Martin Dupont                    │
│                                     │
│  ✉️ Email *                         │
│  ▸ martin.dupont@gmail.com          │
│                                     │
│  📞 Téléphone *                     │
│  ▸ 06 12 34 56 78                   │
│                                     │
│  📍 Ville                            │
│  ▸ Lyon                              │
│                                     │
│  📝 Remarques                        │
│  ▸ Contact reçu via formulaire     │
│                                     │
│  [Annuler]  [✓ Créer le lead]      │
└─────────────────────────────────────┘
```

**Résultat** : Lead créé instantanément, redirection vers sa fiche détail

---

#### **Étape 2 : Fiche Lead - Navigation par Onglets**

**URL** : `/backoffice/crm/lead/:leadId`

**Interface Claire** :

```
┌───────────────────────────────────────────────────────────────┐
│  👤 MARTIN DUPONT                           [✏️ Modifier]     │
│  📧 martin.dupont@gmail.com • 📞 06 12 34 56 78               │
│                                                                │
│  Statut : 🔵 Nouveau Lead                                     │
│  Score : ⭐⭐⭐ 75/100                                         │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  📑 ONGLETS DE NAVIGATION                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [Vue d'ensemble] [Workflow] [Documents] [Devis]        │  │
│  │ [Communications] [Timeline]                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  [Contenu de l'onglet actif ici]                             │
│                                                                │
│  🚀 ACTIONS RAPIDES (toujours visibles)                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ✉️ Envoyer email    📞 Appeler    💬 SMS                │  │
│  │ 📄 Demander docs    📊 Créer devis                       │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

**Onglet "Workflow"** - **LE PLUS IMPORTANT** :

```
┌─────────────────────────────────────────────────────────┐
│  🎯 PARCOURS CLIENT                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Étape actuelle : Nouveau Lead                       │
│                                                         │
│  📋 ACTIONS RECOMMANDÉES                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │  1️⃣ [📞 Qualifier le prospect]                    │ │
│  │     → Appeler pour comprendre ses besoins        │ │
│  │                                                   │ │
│  │  2️⃣ [📄 Demander les documents]                   │ │
│  │     → Envoyer email avec liste docs + lien       │ │
│  │                                                   │ │
│  │  3️⃣ [⏭️ Passer à l'étape suivante]                │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  💡 CONSEILS IA                                         │
│  • Meilleur moment d'appel : 10h-12h ou 14h-16h       │
│  • Taux de réponse moyen : 68%                        │
│  • Documents les plus demandés : Carte grise + Permis │
└─────────────────────────────────────────────────────────┘
```

**Onglet "Documents"** :

```
┌─────────────────────────────────────────────────────────┐
│  📄 DOCUMENTS                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📂 DOCUMENTS PROSPECT (uploadés par le client)        │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ✅ Carte grise - Peugeot 508.pdf (254 KB)        │ │
│  │    📅 15/01/2026 • [👁️ Voir] [💾 Télécharger]    │ │
│  │                                                   │ │
│  │ ⏳ Permis de conduire - En attente               │ │
│  │    [📧 Relancer]                                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  📂 DOCUMENTS COMPAGNIE (auto-attachés)                │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📄 CG Generali 2026.pdf                          │ │
│  │    🏢 Generali • 🤖 Auto-attaché                  │ │
│  │    [👁️ Voir] [💾 Télécharger]                    │ │
│  │                                                   │ │
│  │ 📄 IPID Generali.pdf                             │ │
│  │    🏢 Generali • 🤖 Auto-attaché                  │ │
│  │    [👁️ Voir] [💾 Télécharger]                    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ➕ UPLOADER UN NOUVEAU DOCUMENT                        │
│  [📤 Glisser-déposer ou cliquer ici]                   │
└─────────────────────────────────────────────────────────┘
```

**Onglet "Devis"** :

```
┌─────────────────────────────────────────────────────────┐
│  💰 DEVIS                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 CRÉER UN NOUVEAU DEVIS                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │  🏢 Compagnie d'assurance *                       │ │
│  │  ▼ [Generali ▾]                                  │ │
│  │                                                   │ │
│  │  💰 Montant HT                                    │ │
│  │  ▸ 1,750.00 €                                     │ │
│  │                                                   │ │
│  │  💰 Montant TTC                                   │ │
│  │  ▸ 1,950.00 €                                     │ │
│  │                                                   │ │
│  │  📄 Fichier PDF du devis *                        │ │
│  │  [📤 Sélectionner le fichier]                     │ │
│  │                                                   │ │
│  │  💡 Documents qui seront auto-attachés :          │ │
│  │     ✓ Conditions Générales Generali 2026         │ │
│  │     ✓ IPID Generali                               │ │
│  │     ✓ Notice d'Information                        │ │
│  │                                                   │ │
│  │  [Annuler]  [📤 Envoyer le devis]                │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  📜 HISTORIQUE DES DEVIS                                │
│  (Aucun devis pour ce lead)                            │
└─────────────────────────────────────────────────────────┘
```

---

#### **Étape 3 : Pipeline Kanban - Vue Globale**

**URL** : `/backoffice/crm-killer/pipeline`

**Interface Visuelle** :

```
┌───────────────────────────────────────────────────────────────────────────┐
│  📊 PIPELINE KANBAN                                  [🔍 Rechercher...]    │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  🔵 Nouveau      🟢 Documents    🔷 Devis      🟣 Décision   🟡 Paiement  │
│     Lead           Collecte                      Client                   │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐   ┌─────────┐  ┌─────────┐  │
│  │ Martin  │    │ Sophie  │    │ Pierre  │   │ Julie   │  │ Thomas  │  │
│  │ Dupont  │    │ Bernard │    │ Martin  │   │ Durand  │  │ Lefèvre │  │
│  │         │    │         │    │         │   │         │  │         │  │
│  │ 📞 Lyon │    │ 📄 3/4  │    │ 💰 1950€│   │ ✅ Vue  │  │ 💳 OK   │  │
│  │ 🕐 2h   │    │ ⏰ J-2  │    │ 📧 Envoyé│   │ 🕐 3j   │  │ 📝 Sign │  │
│  │         │    │         │    │         │   │         │  │         │  │
│  │[Ouvrir] │    │[Ouvrir] │    │[Ouvrir] │   │[Ouvrir] │  │[Ouvrir] │  │
│  └─────────┘    └─────────┘    └─────────┘   └─────────┘  └─────────┘  │
│                                                                           │
│  🔷 Signature    🟢 Client                                                │
│                   Actif                                                   │
│  ┌─────────┐    ┌─────────┐                                             │
│  │ Léa     │    │ Marc    │                                             │
│  │ Rousseau│    │ Vincent │                                             │
│  │         │    │         │                                             │
│  │ ✍️ 85%  │    │ ✅ Actif│                                             │
│  │ 🕐 1j   │    │ 💰 2100€│                                             │
│  │         │    │         │                                             │
│  │[Ouvrir] │    │[Ouvrir] │                                             │
│  └─────────┘    └─────────┘                                             │
│                                                                           │
│  💡 Glissez-déposez les cartes pour changer de statut                    │
└───────────────────────────────────────────────────────────────────────────┘
```

**Fonctionnalités Drag & Drop** :
- Glisser une carte d'une colonne à l'autre = changement de statut automatique
- Couleurs différentes par colonne pour repérage rapide
- Compteurs de leads par colonne
- Badges visuels (alertes, documents manquants, etc.)

---

#### **Étape 4 : File de Devis Prêts**

**URL** : `/backoffice/quote-queue`

**Interface** :

```
┌─────────────────────────────────────────────────────────┐
│  📋 FILE DE DEVIS PRÊTS                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ℹ️ Ces leads ont tous leurs documents validés         │
│     et sont prêts à recevoir un devis                  │
│                                                         │
│  📊 5 leads en attente de devis                         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 1️⃣ MARTIN DUPONT                                  │ │
│  │    📧 martin@gmail.com • 📞 06 12 34 56 78        │ │
│  │    ✅ 4/4 documents validés                        │ │
│  │    🚗 Peugeot 508 • 📍 Lyon                        │ │
│  │    ⏰ En attente depuis 2 jours                    │ │
│  │    [📊 Créer un devis]                             │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ 2️⃣ SOPHIE BERNARD                                 │ │
│  │    ... [même format]                               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  💡 Prioriser par :                                     │
│  • Ancienneté (plus anciens en premier)                │
│  • Score IA (meilleurs prospects)                      │
│  • Ville (regrouper par zone)                          │
└─────────────────────────────────────────────────────────┘
```

---

### 🎯 Navigation Commerciale - Résumé

**Menu "CRM Vente"** :
```
┌─────────────────────────────────────┐
│  🎯 CRM VENTE                       │
├─────────────────────────────────────┤
│  ⭐ CRM Dashboard (accueil)         │
│  📋 File Devis (prioritaire)        │
│  📊 Pipeline Kanban (vue globale)   │
│  ➕ Créer Lead (rapide)             │
│  📬 Inbox (messages)                │
│  📝 Templates (emails types)        │
└─────────────────────────────────────┘
```

**3 Clics Maximum** pour toute action :
```
Dashboard → Lead → Action
     ou
Dashboard → Créer Lead → Valider
     ou
Dashboard → File Devis → Créer Devis
```

---

## 👔 Pour les Gestionnaires : Gestion du Portefeuille

### 🎯 Point d'Entrée Principal

**URL** : `/backoffice/crm-gestion`

**Accès depuis le menu** :
```
Menu de navigation → CRM Gestion → Portefeuille Contrats
```

### 📊 Dashboard Gestionnaire (Vue d'Accueil)

**Guide d'Onboarding Automatique** :

À la première connexion, un guide interactif s'affiche :

```
┌─────────────────────────────────────────────────────────┐
│  💡 BIENVENUE DANS VOTRE PORTEFEUILLE                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Guide de démarrage rapide                             │
│                                                         │
│  1️⃣ Visualiser vos contrats                            │
│     Tous vos contrats actifs sont listés avec leurs    │
│     informations principales                            │
│                                                         │
│  2️⃣ Rechercher et filtrer                              │
│     Utilisez la barre de recherche et les filtres      │
│                                                         │
│  3️⃣ Gérer les alertes                                  │
│     Les renouvellements proches sont signalés          │
│                                                         │
│  4️⃣ Consulter le détail                                │
│     Cliquez sur "Voir détails" pour la fiche complète  │
│                                                         │
│  5️⃣ Contacter vos clients                              │
│     Utilisez les boutons Email/Téléphone               │
│                                                         │
│  [Ne plus afficher]          [Commencer →]             │
└─────────────────────────────────────────────────────────┘
```

**Interface Principale** :

```
┌───────────────────────────────────────────────────────────────┐
│  💼 PORTEFEUILLE DE CONTRATS                [?] Besoin d'aide?│
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  📊 VUE D'ENSEMBLE                                             │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐ │
│  │ 142 Contrats │ €2,450,000   │ 18 Renouvell.│ 3 Retards  │ │
│  │ Actifs       │ Prime Annuelle│ < 60 jours   │ Paiement   │ │
│  └──────────────┴──────────────┴──────────────┴────────────┘ │
│                                                                │
│  🔍 RECHERCHE ET FILTRES                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [🔍 Rechercher par nom, email, n° contrat...]            │ │
│  │                                                           │ │
│  │ Statut: [Tous ▾] Paiement: [Tous ▾] Renouvellement: [ ] │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ⚠️ ALERTES (3 actions requises)                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 🟠 18 contrats à renouveler dans les 60 prochains jours  │ │
│  │ 🔴 3 paiements en retard                                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  📋 LISTE DES CONTRATS (142)                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  🏢 GENERALI • GEN-2026-00142                            │ │
│  │  👤 Martin Dupont • martin@gmail.com                     │ │
│  │  💰 €1,950/an • 🚗 1 véhicule                            │ │
│  │  ✅ À jour • 📅 Échéance: 15/03/2026                     │ │
│  │  🟠 Renouvellement dans 42 jours                         │ │
│  │                                                           │ │
│  │  [✉️ Email] [📞 Téléphone] [👁️ Voir détails →]         │ │
│  │                                                           │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │  [Contrat suivant...]                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

### 📄 Fiche Détail Contrat

**URL** : `/backoffice/crm-gestion/contrat/:contractId`

**Interface Complète** :

```
┌───────────────────────────────────────────────────────────────┐
│  ← Retour au portefeuille                                     │
│                                                                │
│  🏢 GENERALI            👤 MARTIN DUPONT                       │
│     [Logo]                 Contrat GEN-2026-00142             │
│                            ✅ Actif • ✅ À jour                │
│                            🟠 Renouvellement dans 42 jours     │
│                                                                │
│  💰 Prime TTC    🚗 Véhicules  ⚠️ Sinistres  📊 Renouvellement│
│     €19,500         3 assurés     1 déclaré      87% probable │
│                                                                │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  📑 ONGLETS                                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [Vue d'ensemble] [Documents] [Sinistres]               │  │
│  │ [Modifications] [Communications]                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  [Contenu de l'onglet actif]                                  │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

**Onglet "Vue d'ensemble"** :

```
┌─────────────────────────────────────────────────────────┐
│  📋 INFORMATIONS CLIENT                                 │
│  👤 Nom: Martin Dupont                                  │
│  ✉️ Email: martin.dupont@gmail.com                      │
│  📞 Téléphone: 06 12 34 56 78                           │
│  🏢 Société: Taxi Martin (SIRET: 123...)                │
│                                                         │
│  📋 INFORMATIONS CONTRAT                                │
│  🏢 Compagnie: Generali                                 │
│  📅 Activation: 15/03/2024                              │
│  📅 Échéance: 15/03/2026                                │
│  💳 Paiement: Mensuel                                   │
│  📅 Prochain: 15/02/2026                                │
│  🔧 Modifications: 0 avenant                            │
│                                                         │
│  🚗 VÉHICULES ASSURÉS                                   │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🚗 Peugeot 508 • AB-123-CD • 2022                │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Onglet "Documents"** - **NOUVEAU ET COMPLET** :

```
┌─────────────────────────────────────────────────────────┐
│  📄 TOUS LES DOCUMENTS DU CONTRAT                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📂 DOCUMENTS COMPAGNIE (Auto-attachés)                 │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📄 Conditions Générales Generali 2026.pdf        │ │
│  │    🏢 Generali • Légal • 2.1 MB                   │ │
│  │    🤖 Auto-attaché lors du devis                  │ │
│  │    📅 15/01/2026                                   │ │
│  │    [👁️ Ouvrir] [💾 Télécharger]                  │ │
│  │                                                   │ │
│  │ 📄 IPID Generali.pdf                             │ │
│  │    🏢 Generali • Information • 156 KB             │ │
│  │    🤖 Auto-attaché lors du devis                  │ │
│  │    [👁️ Ouvrir] [💾 Télécharger]                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  📂 DOCUMENTS CLIENT (Uploadés par le prospect)        │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📄 Carte Grise - Peugeot 508.pdf                 │ │
│  │    Véhicule • 254 KB                              │ │
│  │    📅 10/01/2026                                   │ │
│  │    [👁️ Ouvrir] [💾 Télécharger]                  │ │
│  │                                                   │ │
│  │ 📄 Permis de conduire.pdf                        │ │
│  │    Identité • 189 KB                              │ │
│  │    [👁️ Ouvrir] [💾 Télécharger]                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  📂 DOCUMENTS CONTRACTUELS                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📄 Devis Generali - Martin.pdf                   │ │
│  │    Devis • 423 KB                                 │ │
│  │    📅 15/01/2026                                   │ │
│  │    [👁️ Ouvrir] [💾 Télécharger]                  │ │
│  │                                                   │ │
│  │ 📄 Contrat signé.pdf                             │ │
│  │    Contrat • 1.2 MB                               │ │
│  │    ✍️ Signé le 20/01/2026                          │ │
│  │    [👁️ Ouvrir] [💾 Télécharger]                  │ │
│  │                                                   │ │
│  │ 📄 Attestation d'assurance.pdf                   │ │
│  │    Administratif • 98 KB                          │ │
│  │    [👁️ Ouvrir] [💾 Télécharger]                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  💡 Tous les documents sont centralisés ici            │
└─────────────────────────────────────────────────────────┘
```

**Onglet "Sinistres"** :

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ SINISTRES                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 1 sinistre déclaré                                  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🔴 BRIS DE GLACE                                  │ │
│  │                                                   │ │
│  │ 📅 Date: 12/08/2024                               │ │
│  │ 💰 Montant: €320                                  │ │
│  │ ✅ Statut: Remboursé                              │ │
│  │ 👤 Responsabilité: Non responsable                │ │
│  │                                                   │ │
│  │ 📝 Description:                                    │ │
│  │ Impact de caillou sur autoroute                   │ │
│  │                                                   │ │
│  │ [📄 Voir dossier complet]                         │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [➕ Déclarer un nouveau sinistre]                      │
└─────────────────────────────────────────────────────────┘
```

**Onglet "Communications"** :

```
┌─────────────────────────────────────────────────────────┐
│  💬 HISTORIQUE DES COMMUNICATIONS                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📅 Dernier contact: 20/11/2025                         │
│  ⏰ Prochain suivi: 15/02/2026                          │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📧 20/11/2025 - Email envoyé                      │ │
│  │    Objet: Point annuel sur votre contrat          │ │
│  │    ✅ Ouvert le 21/11/2025                         │ │
│  │    [Voir le message]                               │ │
│  │                                                   │ │
│  │ 📞 15/08/2024 - Appel sortant                     │ │
│  │    Durée: 8 minutes                                │ │
│  │    Sujet: Déclaration sinistre bris de glace      │ │
│  │                                                   │ │
│  │ 📧 20/03/2024 - Email reçu                        │ │
│  │    Objet: Ajout d'un véhicule                     │ │
│  │    [Voir le message]                               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [✉️ Envoyer un email]  [📞 Logger un appel]           │
└─────────────────────────────────────────────────────────┘
```

---

### 🎯 Navigation Gestionnaire - Résumé

**Menu "CRM Gestion"** :
```
┌─────────────────────────────────────┐
│  💼 CRM GESTION                     │
├─────────────────────────────────────┤
│  ⭐ Portefeuille Contrats (accueil) │
│  🛡️ Rétention Client                │
│  📚 Bibliothèque Documents          │
└─────────────────────────────────────┘
```

**2 Clics Maximum** pour toute action :
```
Portefeuille → Contrat → [Onglet]
     ou
Portefeuille → Filtrer → Voir contrats
     ou
Portefeuille → Contacter → Email/Tel
```

---

## 🎨 Éléments d'UX Avancés

### 1. **Couleurs et Codes Visuels**

**Statuts Visuels Distincts** :
```
🔵 Nouveau Lead        → Bleu vif
🟢 Documents Collecte  → Vert émeraude
🔷 Devis               → Cyan
🟣 Décision Client     → Violet
🟡 Paiement            → Jaune/Ambre
🔷 Signature           → Indigo
🟢 Client Actif        → Vert
🟠 Relance             → Orange
🔴 Perdu               → Rouge
```

**Badges et Indicateurs** :
```
✅ Validé / Actif / À jour        → Vert
⏳ En attente / En cours          → Bleu
⚠️ Attention / Alertes            → Orange
🔴 Urgent / Retard / Problème     → Rouge
🤖 Automatique / IA               → Violet
```

---

### 2. **Actions Contextuelles Toujours Visibles**

Chaque fiche lead/contrat a une **barre d'actions rapides** toujours visible en haut :

```
┌─────────────────────────────────────────────────────────┐
│  🚀 ACTIONS RAPIDES                                     │
│  [✉️ Email] [📞 Appeler] [💬 SMS] [📄 Documents]        │
└─────────────────────────────────────────────────────────┘
```

Pas besoin de chercher, tout est à portée de clic !

---

### 3. **Recherche Intelligente**

La recherche fonctionne sur **tous les champs** :
- Nom du client
- Email
- Téléphone
- Numéro de contrat
- Ville
- Immatriculation
- Compagnie d'assurance

**Exemple** :
```
Taper "peugeot" → Trouve tous les contrats avec une Peugeot
Taper "lyon"    → Trouve tous les leads/contrats de Lyon
Taper "generali"→ Trouve tous les contrats Generali
```

---

### 4. **Filtres Combinables**

```
┌─────────────────────────────────────────────────────────┐
│  Statut: [Actif ▾]                                      │
│  Paiement: [Tous ▾]                                     │
│  ☑ Renouvellement < 60 jours                            │
│  ☑ Actions pendantes                                    │
└─────────────────────────────────────────────────────────┘
```

Les filtres se cumulent pour affiner la recherche.

---

### 5. **Guide d'Onboarding Intégré**

**Première connexion** : Guide automatique qui explique tout
**Connexions suivantes** : Bouton "?" en bas à droite pour réafficher le guide

Le guide peut être masqué définitivement avec "Ne plus afficher".

---

### 6. **Notifications et Alertes Proactives**

Le système alerte automatiquement sur :
- ⚠️ Documents reçus à valider
- 🟠 Renouvellements à venir (60 jours)
- 🔴 Retards de paiement
- 💬 Nouveaux messages
- ✍️ Signatures complétées
- 📧 Prospects ayant ouvert leur devis

Les notifications sont **non intrusives** mais **toujours visibles** dans le dashboard.

---

### 7. **Responsive et Mobile-Friendly**

Toutes les interfaces s'adaptent automatiquement :
- **Desktop** : Vue complète avec tous les détails
- **Tablette** : Layout adapté, menus condensés
- **Mobile** : Navigation simplifiée, actions tactiles

---

## 🎯 Parcours Utilisateur Complet

### Parcours Commercial : "Créer et Convertir un Lead"

**Temps estimé** : 15 minutes pour un lead complet

```
1. Connexion → Dashboard CRM
   ↓ 10 secondes
2. Clic "Créer Lead" → Formulaire
   ↓ 2 minutes (saisie)
3. Lead créé → Fiche détail s'ouvre
   ↓ 30 secondes (lecture)
4. Onglet "Workflow" → Actions recommandées
   ↓ 1 minute (choix action)
5. Clic "Demander documents" → Email auto envoyé
   ↓ Attente client (heures/jours)
6. Notif "Documents reçus" → Validation
   ↓ 3 minutes (vérification)
7. Onglet "Devis" → Créer devis
   ↓ 5 minutes (saisie + upload PDF)
8. Clic "Envoyer" → Documents auto-attachés + Email
   ↓ Attente client (jours)
9. Notif "Devis ouvert" → Suivi
10. Notif "Signature complétée" → Lead → Client automatiquement
```

**Total actions manuelles** : 8 clics + 3 saisies
**Total temps actif** : ~12 minutes
**Automatisations** : 5 (demande docs, envoi email, attachment docs, signature, conversion)

---

### Parcours Gestionnaire : "Gérer un Renouvellement"

**Temps estimé** : 10 minutes

```
1. Connexion → Dashboard Gestion
   ↓ 10 secondes
2. Alerte "18 renouvellements < 60j" → Clic
   ↓ 20 secondes
3. Liste filtrée → Clic "Voir détails" sur Martin
   ↓ 30 secondes (lecture fiche)
4. Onglet "Documents" → Consultation docs
   ↓ 2 minutes
5. Onglet "Sinistres" → Vérif historique
   ↓ 1 minute
6. Onglet "Communications" → Dernier contact il y a 3 mois
   ↓ 30 secondes
7. Clic "Envoyer email" → Template renouvellement
   ↓ 3 minutes (personnalisation)
8. Envoi → Planification rappel dans 7 jours
   ↓ 1 minute
9. Retour portefeuille → Lead suivant
```

**Total actions manuelles** : 6 clics + 1 saisie
**Total temps actif** : ~9 minutes
**Automatisations** : 3 (alertes, templates, rappels)

---

## ✅ Checklist UX Complète

### Pour les Commerciaux

- ✅ **Dashboard clair** avec stats et actions rapides
- ✅ **Création lead** en 2 minutes maximum
- ✅ **Workflow guidé** avec actions recommandées par l'IA
- ✅ **Pipeline Kanban** drag & drop intuitif
- ✅ **File de devis** priorisée automatiquement
- ✅ **Upload devis** avec auto-attachment des documents compagnie
- ✅ **Tous les onglets** bien organisés (vue d'ensemble, workflow, docs, devis, etc.)
- ✅ **Actions rapides** toujours visibles (email, tel, SMS)
- ✅ **Notifications** en temps réel
- ✅ **Recherche** puissante et rapide
- ✅ **3 clics max** pour toute action

### Pour les Gestionnaires

- ✅ **Dashboard portefeuille** avec stats claires
- ✅ **Guide d'onboarding** automatique à la première connexion
- ✅ **Alertes visuelles** (renouvellements, retards, actions)
- ✅ **Filtres combinables** pour recherche avancée
- ✅ **Fiche contrat complète** avec tous les onglets
- ✅ **Onglet Documents** unifié montrant TOUS les documents (compagnie + client + contrat)
- ✅ **Historique complet** (sinistres, modifications, communications)
- ✅ **Actions de contact** rapides (email, téléphone)
- ✅ **2 clics max** pour accéder à un contrat
- ✅ **Bouton "Besoin d'aide ?"** toujours accessible

---

## 🎓 Formation Utilisateurs

### Formation Commerciaux (30 minutes)

**Module 1 : Découverte du Dashboard (5 min)**
- Présentation de l'interface
- Statistiques principales
- Actions rapides

**Module 2 : Créer et Gérer un Lead (10 min)**
- Création d'un lead
- Navigation dans la fiche détail
- Utilisation du workflow guidé

**Module 3 : Pipeline et Devis (10 min)**
- Vue Kanban drag & drop
- File de devis prêts
- Upload et envoi de devis

**Module 4 : Astuces et Raccourcis (5 min)**
- Recherche rapide
- Templates d'emails
- Notifications

### Formation Gestionnaires (30 minutes)

**Module 1 : Découverte du Portefeuille (5 min)**
- Présentation du dashboard
- Guide d'onboarding
- KPIs principaux

**Module 2 : Gérer les Contrats (10 min)**
- Recherche et filtres
- Fiche contrat détaillée
- Tous les onglets

**Module 3 : Documents et Communications (10 min)**
- Onglet Documents unifié
- Historique des communications
- Actions de contact

**Module 4 : Renouvellements et Alertes (5 min)**
- Gérer les alertes
- Préparer les renouvellements
- Suivis automatiques

---

## 🎉 Conclusion

Le système est conçu pour être **aussi intuitif qu'une application grand public** :

### ✅ Principes Respectés

1. **Clarté** : Chaque élément a sa place logique
2. **Accessibilité** : 2-3 clics maximum pour toute action
3. **Guidage** : IA et workflows suggèrent les prochaines étapes
4. **Visuel** : Couleurs, badges et icônes pour repérage rapide
5. **Aide contextuelle** : Guide d'onboarding + tooltips
6. **Automatisation** : Le système fait le travail répétitif
7. **Réactivité** : Notifications en temps réel
8. **Centralisation** : Tout est au même endroit (ex: tous les documents)

### ✅ Résultat

- **Commerciaux** : Conversion de leads fluide et rapide
- **Gestionnaires** : Gestion de portefeuille efficace et complète
- **Formation** : 30 minutes suffisent pour maîtriser l'outil
- **Adoption** : Interface moderne et agréable à utiliser

**Le système est 100% prêt à l'emploi et intuitif !** 🚀

---

**Date** : 2 février 2026
**Version** : 1.0 FINALE
**Statut** : ✅ Production Ready
