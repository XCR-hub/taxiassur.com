import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SFTP_CONFIG = {
  host: 'home749874859.1and1-data.host',
  port: 22,
  username: 'acc1591324770',
  password: 'TAXIassur2026!,&'
};

const LOCAL_DIST = path.join(__dirname, '../dist');
const REMOTE_PATH = '/';

console.log('🚀 Déploiement SFTP vers IONOS...\n');

if (!fs.existsSync(LOCAL_DIST)) {
  console.error('❌ Le dossier /dist n\'existe pas');
  console.log('   Lancez d\'abord : npm run build');
  process.exit(1);
}

const conn = new Client();

function uploadDirectory(sftp, localPath, remotePath, callback) {
  let pending = 0;
  let errors = [];

  function uploadFile(localFile, remoteFile) {
    pending++;

    sftp.fastPut(localFile, remoteFile, (err) => {
      if (err) {
        errors.push({ file: localFile, error: err.message });
      } else {
        console.log(`  ✅ ${path.relative(LOCAL_DIST, localFile)}`);
      }

      pending--;
      if (pending === 0) {
        callback(errors.length > 0 ? errors : null);
      }
    });
  }

  function processDirectory(localDir, remoteDir) {
    const items = fs.readdirSync(localDir, { withFileTypes: true });

    items.forEach(item => {
      const localItemPath = path.join(localDir, item.name);
      const remoteItemPath = path.posix.join(remoteDir, item.name);

      if (item.isDirectory()) {
        pending++;

        sftp.mkdir(remoteItemPath, (err) => {
          if (err && err.code !== 4) {
            console.log(`  ⚠️  Dossier existe déjà : ${item.name}`);
          }

          processDirectory(localItemPath, remoteItemPath);

          pending--;
          if (pending === 0) {
            callback(errors.length > 0 ? errors : null);
          }
        });
      } else if (item.isFile()) {
        uploadFile(localItemPath, remoteItemPath);
      }
    });

    if (pending === 0) {
      callback(errors.length > 0 ? errors : null);
    }
  }

  processDirectory(localPath, remotePath);
}

conn.on('ready', () => {
  console.log('✅ Connexion SFTP établie\n');
  console.log('📤 Upload des fichiers...\n');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ Erreur SFTP :', err.message);
      conn.end();
      process.exit(1);
    }

    const startTime = Date.now();

    uploadDirectory(sftp, LOCAL_DIST, REMOTE_PATH, (errors) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('');
      console.log('─────────────────────────────────');

      if (errors && errors.length > 0) {
        console.log(`⚠️  Déploiement terminé avec ${errors.length} erreur(s)`);
        console.log('');
        console.log('Erreurs :');
        errors.forEach(e => {
          console.log(`  ❌ ${e.file}`);
          console.log(`     ${e.error}`);
        });
      } else {
        console.log('✅ Déploiement réussi !');
      }

      console.log(`⏱️  Durée : ${duration}s`);
      console.log('🌐 Site : https://taxiassur.pro');
      console.log('─────────────────────────────────');

      conn.end();
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ Erreur de connexion :', err.message);
  console.log('');
  console.log('🔧 Vérifiez :');
  console.log('   - Serveur : ' + SFTP_CONFIG.host);
  console.log('   - Port : ' + SFTP_CONFIG.port);
  console.log('   - Utilisateur : ' + SFTP_CONFIG.username);
  process.exit(1);
});

console.log('🔗 Connexion au serveur SFTP...');
console.log(`   Serveur : ${SFTP_CONFIG.host}`);
console.log(`   Port : ${SFTP_CONFIG.port}`);
console.log(`   Utilisateur : ${SFTP_CONFIG.username}`);
console.log('');

conn.connect(SFTP_CONFIG);
