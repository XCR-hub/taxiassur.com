#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__dirname);
console.log('🔒 TaxiAssur Security Check');
console.log('============================');

const securityChecks = {
  files: {
    name: 'Fichiers sensibles',
    checks: [
      { file: '.env', shouldExist: false, message: 'Fichier .env exposé' },
      { file: 'config.php', shouldExist: true, message: 'Configuration PHP manquante' },
      { file: 'public/.htaccess', shouldExist: true, message: 'Protection Apache manquante' },
      { file: 'public/webhooks/.htaccess', shouldExist: true, message: 'Protection webhooks manquante' }
    ]
  },
  headers: {
    name: 'Headers de sécurité',
    checks: [
      'X-Content-Type-Options',
      'X-Frame-Options', 
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy'
    ]
  },
  permissions: {
    name: 'Permissions fichiers',
    checks: [
      { path: 'public/content', permission: '755' },
      { path: 'public/feeds', permission: '755' },
      { path: 'public/webhooks', permission: '755' }
    ]
  }
};

// Check files
console.log('\n📁 Vérification des fichiers...');
securityChecks.files.checks.forEach(check => {
  const exists = fs.existsSync(check.file);
  const status = exists === check.shouldExist;
  
  console.log(`${status ? '✅' : '❌'} ${check.file}: ${
    status ? 'OK' : check.message
  }`);
});

// Check .htaccess content
console.log('\n🛡️ Vérification .htaccess...');
if (fs.existsSync('public/.htaccess')) {
  const htaccess = fs.readFileSync('public/.htaccess', 'utf8');
  
  const requiredRules = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Strict-Transport-Security',
    'RewriteEngine On'
  ];
  
  requiredRules.forEach(rule => {
    const hasRule = htaccess.includes(rule);
    console.log(`${hasRule ? '✅' : '❌'} ${rule}: ${hasRule ? 'Présent' : 'Manquant'}`);
  });
}

// Check webhook security
console.log('\n🔗 Vérification webhook...');
if (fs.existsSync('public/webhooks/make.php')) {
  const webhook = fs.readFileSync('public/webhooks/make.php', 'utf8');
  
  const securityFeatures = [
    'verifyMakeSecret',
    'SecurityManager',
    'sanitizeInput',
    'rate_limit'
  ];
  
  securityFeatures.forEach(feature => {
    const hasFeature = webhook.includes(feature);
    console.log(`${hasFeature ? '✅' : '❌'} ${feature}: ${hasFeature ? 'Implémenté' : 'Manquant'}`);
  });
}

// Check for sensitive data in code
console.log('\n🔍 Scan des données sensibles...');
const sensitivePatterns = [
  { pattern: /password\s*=\s*["'][^"']{1,20}["']/gi, name: 'Mots de passe en dur' },
  { pattern: /api[_-]?key\s*=\s*["'][^"']+["']/gi, name: 'Clés API exposées' },
  { pattern: /secret\s*=\s*["'][^"']{1,30}["']/gi, name: 'Secrets exposés' }
];

const filesToScan = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'public/**/*.php'
];

let sensitiveDataFound = false;

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  sensitivePatterns.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`❌ ${name} trouvé dans ${filePath}:`);
      matches.forEach(match => {
        console.log(`   ${match.substring(0, 50)}...`);
      });
      sensitiveDataFound = true;
    }
  });
}

// Scan main files
['src/lib/security.ts', 'public/config.php', 'public/webhooks/make.php'].forEach(scanFile);

if (!sensitiveDataFound) {
  console.log('✅ Aucune donnée sensible détectée');
}

// Generate security report
console.log('\n📊 Rapport de Sécurité');
console.log('======================');

const report = {
  timestamp: new Date().toISOString(),
  checks: {
    files: securityChecks.files.checks.map(check => ({
      ...check,
      status: fs.existsSync(check.file) === check.shouldExist
    })),
    sensitive_data: !sensitiveDataFound
  },
  recommendations: [
    'Changer le MAKE_SECRET par défaut',
    'Configurer HTTPS avec certificat SSL',
    'Activer la surveillance des logs',
    'Implémenter un WAF si possible',
    'Backup régulier des données'
  ]
};

fs.writeFileSync('security-report.json', JSON.stringify(report, null, 2));
console.log('📄 Rapport sauvegardé dans security-report.json');

console.log('\n🎯 Score de Sécurité Global:');
const totalChecks = report.checks.files.length + 1;
const passedChecks = report.checks.files.filter(c => c.status).length + (report.checks.sensitive_data ? 1 : 0);
const score = Math.round((passedChecks / totalChecks) * 100);

console.log(`${score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴'} ${score}/100`);

if (score < 90) {
  console.log('\n⚠️  Actions requises avant mise en production !');
  process.exit(1);
} else {
  console.log('\n✅ Sécurité validée pour la production');
}