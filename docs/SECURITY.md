# 🔒 Guide de Sécurité TaxiAssur.com

## Vue d'Ensemble

TaxiAssur.com implémente une sécurité de niveau entreprise pour protéger contre :
- ✅ Attaques par injection (SQL, XSS, CSRF)
- ✅ Bots et spam automatisé
- ✅ Tentatives de force brute
- ✅ Failles de configuration
- ✅ Exposition de données sensibles

## 🛡️ Couches de Protection

### 1. Protection Frontend
- **Validation Zod** : Tous les inputs validés côté client
- **Empreinte navigateur** : Détection des bots via fingerprinting
- **Analyse comportementale** : Score de confiance basé sur les interactions
- **Rate limiting** : Limitation des soumissions par IP
- **Honeypot** : Champs cachés pour piéger les bots

### 2. Protection Backend (PHP)
- **Validation stricte** : Double validation de tous les inputs
- **Sanitisation** : Nettoyage de toutes les données entrantes
- **Headers sécurisés** : CSP, HSTS, X-Frame-Options, etc.
- **Logs détaillés** : Traçabilité complète des tentatives d'attaque
- **Blacklist IP** : Blocage automatique des IPs suspectes

### 3. Protection Serveur (.htaccess)
- **Blocage patterns** : Détection d'attaques communes
- **Protection fichiers** : Accès refusé aux fichiers sensibles
- **Rate limiting** : Limitation au niveau Apache
- **Headers sécurité** : Configuration complète des headers

## 🔧 Configuration Sécurisée

### Variables d'Environnement Critiques
```apache
# Dans .htaccess ou panneau de contrôle
SetEnv MAKE_SECRET "votre_token_ultra_securise_2024"
SetEnv ADMIN_EMAIL "commercial@xcr.fr"
SetEnv BACKUP_EMAIL "backup@xcr.fr"
SetEnv ADMIN_PASSWORD "mot_de_passe_complexe"
```

### Permissions Fichiers Recommandées
```bash
chmod 755 content/
chmod 755 feeds/
chmod 755 webhooks/
chmod 644 webhooks/*.php
chmod 600 config.php
chmod 644 .htaccess
```

## 🚨 Monitoring et Alertes

### Logs de Sécurité
- **Emplacement** : `/webhooks/logs/YYYY-MM-DD.log`
- **Format** : JSON structuré avec contexte complet
- **Rotation** : Automatique par jour
- **Alertes** : Email automatique pour tentatives critiques

### Métriques Surveillées
- Tentatives de spam par heure
- IPs bloquées automatiquement
- Score comportemental moyen des leads
- Temps de réponse du webhook
- Erreurs de validation

## 🔍 Tests de Sécurité

### Tests Automatisés
```bash
# Vérification complète
npm run security:check

# Test des headers
curl -I https://taxiassur.com

# Test anti-spam
curl -X POST -H "Content-Type: application/json" \
     -d '{"honeypot":"spam"}' \
     https://taxiassur.com/webhooks/make.php?action=lead
```

### Tests Manuels
1. **Test honeypot** : Remplir le champ caché
2. **Test rapidité** : Soumettre en moins de 5 secondes
3. **Test email jetable** : Utiliser 10minutemail.com
4. **Test rate limiting** : Soumettre 5+ fois rapidement

## 🎯 Checklist de Déploiement Sécurisé

### Avant Mise en Production
- [ ] Changer tous les mots de passe par défaut
- [ ] Configurer HTTPS avec certificat valide
- [ ] Tester tous les endpoints de sécurité
- [ ] Vérifier les permissions fichiers
- [ ] Configurer les alertes email
- [ ] Backup initial des données

### Maintenance Régulière
- [ ] Vérification hebdomadaire des logs
- [ ] Mise à jour mensuelle des patterns de détection
- [ ] Audit trimestriel des accès admin
- [ ] Test annuel de pénétration

## 🚀 Optimisations Avancées

### WAF (Web Application Firewall)
Si votre hébergeur le propose, activez :
- Protection DDoS
- Filtrage géographique
- Détection d'anomalies
- Mise à jour automatique des règles

### Authentification Renforcée
Pour le backoffice :
- Authentification à deux facteurs (2FA)
- Restriction par IP
- Sessions sécurisées
- Timeout automatique

### Backup et Récupération
- Backup quotidien automatique
- Stockage chiffré hors site
- Test de restauration mensuel
- Plan de continuité d'activité

## 📞 Support Sécurité

En cas d'incident de sécurité :
- **Email urgent** : security@xcr.fr
- **Téléphone** : 01 80 85 57 86
- **Procédure** : Isolation → Analyse → Correction → Rapport

## 🏆 Certifications et Conformité

- **ORIAS** : Courtier agréé 11 061 425
- **RGPD** : Conformité complète protection données
- **ISO 27001** : Bonnes pratiques sécurité information
- **ANSSI** : Recommandations cybersécurité France