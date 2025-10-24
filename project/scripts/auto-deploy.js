#!/usr/bin/env node

/**
 * Script de déploiement automatique TaxiAssur
 *
 * Actions :
 * 1. Build du projet (npm run build)
 * 2. Purge automatique du cache Cloudflare via API
 * 3. Instructions pour upload FTP
 *
 * Usage : node scripts/auto-deploy.js
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60) + '\n');
}

// Charger les variables d'environnement Cloudflare
function loadCloudflareConfig() {
  const envFile = join(rootDir, '.env.cloudflare');

  if (!existsSync(envFile)) {
    log('⚠️  Fichier .env.cloudflare introuvable', 'yellow');
    return null;
  }

  const config = {};
  const content = readFileSync(envFile, 'utf-8');

  content.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      config[match[1]] = match[2];
    }
  });

  return config;
}

// Purger le cache Cloudflare via API
async function purgeCloudflareCache(zoneId, apiToken) {
  logSection('🌐 PURGE CACHE CLOUDFLARE');

  log('Envoi de la requête à Cloudflare...', 'cyan');

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      }
    );

    const data = await response.json();

    if (data.success) {
      log('✅ Cache Cloudflare purgé avec succès !', 'green');
      return true;
    } else {
      log('❌ Erreur lors de la purge du cache', 'red');
      console.log('Détails:', data.errors);
      return false;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'red');
    return false;
  }
}

// Build du projet
function buildProject() {
  logSection('🔨 BUILD DU PROJET');

  try {
    log('Lancement de npm run build...', 'cyan');
    execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
    log('✅ Build terminé avec succès !', 'green');
    return true;
  } catch (error) {
    log('❌ Erreur lors du build', 'red');
    return false;
  }
}

// Afficher les instructions FTP
function showFtpInstructions() {
  logSection('📤 UPLOAD FTP IONOS');

  console.log(`
${colors.yellow}⚠️  ACTION MANUELLE REQUISE${colors.reset}

Les fichiers sont prêts dans le dossier /dist/

${colors.bold}ÉTAPES À SUIVRE :${colors.reset}

1. ${colors.cyan}Connexion FTP IONOS${colors.reset}
   - Hôte    : taxiassur.com
   - Port    : 21
   - User    : [votre username IONOS]
   - Pass    : [votre mot de passe IONOS]

2. ${colors.cyan}Supprimer sur le serveur${colors.reset}
   ❌ index.html
   ❌ /assets/ (TOUT)
   ❌ .htaccess

3. ${colors.cyan}Uploader depuis /dist/${colors.reset}
   ✅ index.html (6.6 KB)
   ✅ .htaccess (7.3 KB) ← Fichier CACHÉ !
   ✅ /assets/ (TOUT - 40+ fichiers)

4. ${colors.cyan}Vérification${colors.reset}
   - Attendez 2 minutes
   - Videz cache navigateur : Ctrl+Shift+R
   - Testez : https://www.taxiassur.com/

${colors.green}📋 FICHIERS PRÊTS :${colors.reset}
   ✅ dist/index.html
   ✅ dist/.htaccess
   ✅ dist/assets/index-C5dJXCO4.js
   ✅ dist/assets/index-xp3--mS4.css
   ✅ + 40 autres fichiers JS

${colors.bold}Pour voir .htaccess dans FileZilla :${colors.reset}
   Menu Serveur → Forcer affichage fichiers cachés
  `);
}

// Fonction principale
async function main() {
  console.clear();

  logSection('🚀 DÉPLOIEMENT AUTOMATIQUE - TAXIASSUR.COM');

  log('Date : ' + new Date().toLocaleString('fr-FR'), 'cyan');

  // Étape 1 : Build
  const buildSuccess = buildProject();
  if (!buildSuccess) {
    log('\n❌ Déploiement arrêté suite à l\'erreur de build', 'red');
    process.exit(1);
  }

  // Étape 2 : Purge Cloudflare
  const cloudflareConfig = loadCloudflareConfig();

  if (cloudflareConfig && cloudflareConfig.CLOUDFLARE_API_TOKEN !== 'VOTRE_TOKEN_ICI') {
    const purgeSuccess = await purgeCloudflareCache(
      cloudflareConfig.CLOUDFLARE_ZONE_ID,
      cloudflareConfig.CLOUDFLARE_API_TOKEN
    );

    if (!purgeSuccess) {
      log('\n⚠️  La purge Cloudflare a échoué, mais continuez avec l\'upload FTP', 'yellow');
    }
  } else {
    log('\n⚠️  Configuration Cloudflare manquante', 'yellow');
    log('Pour automatiser la purge du cache :', 'cyan');
    log('1. Allez sur https://dash.cloudflare.com/profile/api-tokens', 'cyan');
    log('2. Créez un token avec permission : Zone > Cache Purge', 'cyan');
    log('3. Ajoutez-le dans .env.cloudflare', 'cyan');
    log('\nVous pouvez purger manuellement sur https://dash.cloudflare.com/', 'cyan');
  }

  // Étape 3 : Instructions FTP
  showFtpInstructions();

  // Résumé final
  logSection('✅ RÉSUMÉ');
  log('✅ Build terminé', 'green');

  if (cloudflareConfig && cloudflareConfig.CLOUDFLARE_API_TOKEN !== 'VOTRE_TOKEN_ICI') {
    log('✅ Cache Cloudflare purgé', 'green');
  } else {
    log('⚠️  Cache Cloudflare à purger manuellement', 'yellow');
  }

  log('📤 Fichiers prêts dans /dist/', 'cyan');
  log('👉 Action requise : Upload FTP vers IONOS', 'yellow');

  console.log('\n' + '='.repeat(60) + '\n');
}

// Exécution
main().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
