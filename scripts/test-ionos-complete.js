import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { Client } from 'ssh2';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables SUPABASE manquantes dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Test complet de la configuration IONOS...\n');

// Test 1: Récupération des secrets
async function testSecrets() {
  console.log('1️⃣ Vérification des secrets Supabase...');

  try {
    const { data, error } = await supabase.functions.invoke('test-secrets', {
      body: { action: 'list' }
    });

    if (error) {
      console.log('⚠️  Impossible de vérifier les secrets directement');
      console.log('   Continuons avec les tests pratiques...\n');
      return false;
    }

    console.log('✅ Secrets configurés\n');
    return true;
  } catch (err) {
    console.log('⚠️  Secrets non vérifiables, tests pratiques à suivre...\n');
    return false;
  }
}

// Test 2: SMTP (envoi d'email)
async function testSMTP() {
  console.log('2️⃣ Test SMTP (envoi email)...');

  try {
    const { data, error } = await supabase.functions.invoke('send-email-ionos', {
      body: {
        to: 'contact@taxiassur.pro',
        subject: '✅ Test configuration IONOS SMTP',
        html: `
          <h2>Configuration SMTP réussie !</h2>
          <p>Ce message confirme que :</p>
          <ul>
            <li>✅ Les secrets IONOS sont bien configurés</li>
            <li>✅ L'envoi d'emails fonctionne</li>
            <li>✅ Le système est opérationnel</li>
          </ul>
          <p><strong>Date du test :</strong> ${new Date().toLocaleString('fr-FR')}</p>
        `
      }
    });

    if (error) {
      console.log('❌ Échec :', error.message);
      return false;
    }

    console.log('✅ Email envoyé avec succès');
    console.log('   Vérifiez votre boîte mail contact@taxiassur.pro\n');
    return true;
  } catch (err) {
    console.log('❌ Erreur SMTP :', err.message, '\n');
    return false;
  }
}

// Test 3: IMAP (réception emails)
async function testIMAP() {
  console.log('3️⃣ Test IMAP (réception emails)...');

  try {
    const { data, error } = await supabase.functions.invoke('sync-ionos-imap', {
      body: { limit: 5 }
    });

    if (error) {
      console.log('❌ Échec :', error.message);
      return false;
    }

    console.log('✅ Connexion IMAP réussie');
    console.log(`   ${data?.emails_synced || 0} emails synchronisés\n`);
    return true;
  } catch (err) {
    console.log('❌ Erreur IMAP :', err.message, '\n');
    return false;
  }
}

// Test 4: SFTP (connexion serveur)
async function testSFTP() {
  console.log('4️⃣ Test SFTP (connexion serveur)...');

  return new Promise((resolve) => {
    const conn = new Client();

    conn.on('ready', () => {
      console.log('✅ Connexion SFTP réussie');

      conn.sftp((err, sftp) => {
        if (err) {
          console.log('❌ Erreur SFTP :', err.message);
          conn.end();
          resolve(false);
          return;
        }

        sftp.readdir('/', (err, list) => {
          if (err) {
            console.log('⚠️  Impossible de lire le répertoire');
          } else {
            console.log(`   ${list.length} fichiers/dossiers trouvés`);
          }
          conn.end();
          resolve(true);
        });
      });
    });

    conn.on('error', (err) => {
      console.log('❌ Connexion échouée :', err.message);
      resolve(false);
    });

    conn.connect({
      host: 'home749874859.1and1-data.host',
      port: 22,
      username: 'acc1591324770',
      password: 'TAXIassur2026!,&'
    });
  });
}

// Exécution des tests
async function runAllTests() {
  const results = {
    secrets: await testSecrets(),
    smtp: await testSMTP(),
    imap: await testIMAP(),
    sftp: await testSFTP()
  };

  console.log('📊 Résumé des tests :');
  console.log('─────────────────────');
  console.log(`Secrets   : ${results.secrets ? '✅' : '⚠️'}`);
  console.log(`SMTP      : ${results.smtp ? '✅' : '❌'}`);
  console.log(`IMAP      : ${results.imap ? '✅' : '❌'}`);
  console.log(`SFTP      : ${results.sftp ? '✅' : '❌'}`);
  console.log('');

  const allPass = results.smtp && results.imap && results.sftp;

  if (allPass) {
    console.log('🎉 Tous les tests sont réussis !');
    console.log('');
    console.log('🚀 Vous pouvez maintenant :');
    console.log('   - Déployer le site : npm run deploy');
    console.log('   - Synchroniser les emails automatiquement');
    console.log('   - Envoyer des notifications aux prospects');
  } else {
    console.log('⚠️  Certains tests ont échoué');
    console.log('');
    console.log('🔧 Actions recommandées :');
    if (!results.smtp) console.log('   - Vérifier IONOS_SMTP_* dans les secrets');
    if (!results.imap) console.log('   - Vérifier IONOS_IMAP_* dans les secrets');
    if (!results.sftp) console.log('   - Vérifier SFTP_* dans les secrets');
  }
}

runAllTests().catch(console.error);
