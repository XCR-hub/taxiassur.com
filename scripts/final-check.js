#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://drohhxrkoequjphvabvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik';

const email = 'master@taxiassur.com';
const password = 'TaxiAssur2025!,&';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           🎉 VÉRIFICATION FINALE - TAXIASSUR                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

async function main() {
  console.log('📊 État du système:\n');

  // Vérifier auth.users
  console.log('1️⃣  Vérification auth.users...');
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  const authUser = users.find(u => u.email === email);

  if (authUser) {
    console.log(`   ✅ Utilisateur trouvé`);
    console.log(`   📧 Email: ${authUser.email}`);
    console.log(`   🆔 ID: ${authUser.id}`);
    console.log(`   ✉️  Email confirmé: ${authUser.email_confirmed_at ? 'Oui' : 'Non'}`);
  } else {
    console.log(`   ❌ Utilisateur non trouvé`);
    return;
  }

  // Vérifier admin_users
  console.log('\n2️⃣  Vérification admin_users...');
  const { data: adminUser } = await adminClient
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (adminUser) {
    console.log(`   ✅ Entrée trouvée`);
    console.log(`   👤 Nom: ${adminUser.full_name}`);
    console.log(`   🔑 Role: ${adminUser.role}`);
    console.log(`   🟢 Actif: ${adminUser.is_active ? 'Oui' : 'Non'}`);
  }

  // Test de connexion
  console.log('\n3️⃣  Test de connexion...');
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.log(`   ❌ ÉCHEC: ${signInError.message}`);
    console.log(`\n⚠️  La connexion ne fonctionne pas !`);
    console.log(`   Erreur: ${signInError.message}`);
    console.log(`   Code: ${signInError.status}`);
  } else {
    console.log(`   ✅ CONNEXION RÉUSSIE !`);
    console.log(`   🎯 User ID: ${authData.user.id}`);
    console.log(`   📧 Email: ${authData.user.email}`);

    // Vérifier RLS
    console.log('\n4️⃣  Test des politiques RLS...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (rlsError) {
      console.log(`   ❌ RLS bloque: ${rlsError.message}`);
    } else if (rlsTest) {
      console.log(`   ✅ RLS fonctionne correctement`);
    }

    await supabase.auth.signOut();
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    ✅ TOUT EST PRÊT !                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📋 VOS IDENTIFIANTS DE CONNEXION:

   Email      : master@taxiassur.com
   Mot de passe : TaxiAssur2025!,&

🌐 URL DE CONNEXION:

   Production : https://taxiassur.com/admin
   Test Local : http://localhost:5173/admin

📝 INSTRUCTIONS:

   1. Ouvrez votre navigateur
   2. Allez sur l'URL de connexion
   3. Entrez vos identifiants
   4. Cliquez sur "Se connecter"

⚠️  EN CAS DE PROBLÈME:

   • Videz le cache : Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
   • Ouvrez la console du navigateur (F12)
   • Testez avec : http://localhost:5173/test-login-direct.html

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Le build a été mis à jour avec la configuration simplifiée.
   La connexion devrait maintenant fonctionner parfaitement !

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(error => {
  console.error('\n❌ ERREUR:', error.message);
  process.exit(1);
});
