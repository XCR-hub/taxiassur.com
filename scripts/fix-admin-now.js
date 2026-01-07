#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://drohhxrkoequjphvabvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik';

const email = 'master@taxiassur.com';
const password = 'TaxiAssur2025!,&';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('\n🔧 RÉPARATION CONNEXION ADMIN - TAXIASSUR\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📧 Email : master@taxiassur.com');
  console.log('🔑 Mot de passe : TaxiAssur2025!,&\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DIAGNOSTIC\n');

  // Étape 1 : Vérifier auth.users
  console.log('1️⃣  Recherche dans auth.users...');
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();

  if (listError) {
    console.log('❌ Erreur:', listError.message);
    process.exit(1);
  }

  let authUser = users.find(u => u.email === email);
  let userId = null;

  if (authUser) {
    console.log(`✅ Utilisateur trouvé : ${authUser.email}`);
    console.log(`   ID: ${authUser.id}`);
    userId = authUser.id;
  } else {
    console.log(`❌ Utilisateur ${email} introuvable dans auth.users`);
    console.log('   Création en cours...');

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Master Admin',
        role: 'super_admin'
      }
    });

    if (createError) {
      console.log('❌ Erreur création:', createError.message);
      process.exit(1);
    }

    console.log(`✅ Utilisateur créé : ${newUser.user.id}`);
    userId = newUser.user.id;
    authUser = newUser.user;
  }

  // Étape 2 : Réinitialiser le mot de passe
  console.log('\n2️⃣  Réinitialisation du mot de passe...');
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: password,
    email_confirm: true
  });

  if (updateError) {
    console.log('❌ Erreur mise à jour:', updateError.message);
  } else {
    console.log('✅ Mot de passe mis à jour avec succès');
  }

  // Étape 3 : Vérifier admin_users
  console.log('\n3️⃣  Vérification table admin_users...');
  const { data: adminUser, error: adminError } = await adminClient
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (adminError) {
    console.log('❌ Erreur lecture admin_users:', adminError.message);
  } else if (!adminUser) {
    console.log('❌ Pas d\'entrée dans admin_users');
    console.log('   Création en cours...');

    const { error: insertError } = await adminClient
      .from('admin_users')
      .insert({
        id: userId,
        email: email,
        full_name: 'Master Admin',
        role: 'super_admin',
        is_active: true
      });

    if (insertError) {
      console.log('❌ Erreur insertion:', insertError.message);
    } else {
      console.log('✅ Entrée créée dans admin_users');
    }
  } else {
    console.log(`✅ Entrée trouvée : ${adminUser.full_name}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Actif: ${adminUser.is_active}`);
    console.log(`   ID Auth: ${userId}`);
    console.log(`   ID Admin: ${adminUser.id}`);

    // Synchroniser l'ID si nécessaire
    if (adminUser.id !== userId) {
      console.log('\n⚠️  Les IDs ne correspondent pas !');
      console.log('   Synchronisation...');

      const { error: updateIdError } = await adminClient
        .from('admin_users')
        .update({ id: userId })
        .eq('email', email);

      if (updateIdError) {
        console.log('❌ Erreur sync ID:', updateIdError.message);
      } else {
        console.log('✅ IDs synchronisés avec succès');
      }
    }

    // Activer si nécessaire
    if (!adminUser.is_active) {
      console.log('\n⚠️  Compte inactif, activation...');

      const { error: activateError } = await adminClient
        .from('admin_users')
        .update({ is_active: true })
        .eq('id', userId);

      if (activateError) {
        console.log('❌ Erreur activation:', activateError.message);
      } else {
        console.log('✅ Compte activé');
      }
    }
  }

  // Étape 4 : Test de connexion
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST DE CONNEXION FINALE\n');

  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.log('❌ ÉCHEC DE CONNEXION:', signInError.message);
    console.log('\n🔍 Diagnostic :');
    console.log('   Code:', signInError.status);
    console.log('   Message:', signInError.message);

    if (signInError.message.includes('Invalid login credentials')) {
      console.log('\n💡 Solution : Le mot de passe ne correspond pas');
      console.log('   Vérifiez que le mot de passe est bien : TaxiAssur2025!,&');
    } else if (signInError.message.includes('Email not confirmed')) {
      console.log('\n💡 Solution : Email non confirmé');
      console.log('   Le script a normalement confirmé l\'email automatiquement');
    }
  } else {
    console.log('✅ CONNEXION AUTH RÉUSSIE !');
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Email: ${authData.user.email}`);

    // Vérifier RLS
    console.log('\n4️⃣  Vérification RLS admin_users...');
    const { data: verifyAdmin, error: verifyError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (verifyError) {
      console.log('❌ RLS bloque la lecture:', verifyError.message);
      console.log('\n💡 Problème de politiques RLS à corriger');
    } else if (verifyAdmin) {
      console.log(`✅ RLS OK : ${verifyAdmin.full_name} (${verifyAdmin.role})`);
    } else {
      console.log('⚠️  Auth OK mais admin_users introuvable');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 IDENTIFIANTS DE CONNEXION\n');
  console.log('Email      : master@taxiassur.com');
  console.log('Mot de passe : TaxiAssur2025!,&');
  console.log('\n🌐 URL Backoffice : https://taxiassur.com/admin');
  console.log('\n✅ Vous pouvez maintenant vous connecter !\n');
}

main().catch(error => {
  console.error('\n❌ ERREUR FATALE:', error.message);
  process.exit(1);
});
