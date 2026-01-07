#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const SUPABASE_URL = 'https://drohhxrkoequjphvabvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n🔧 RÉPARATION CONNEXION ADMIN - TAXIASSUR\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Étape 1 : Demander le SERVICE_ROLE_KEY
  console.log('⚠️  Pour réparer la connexion admin, j\'ai besoin de la clé SERVICE_ROLE_KEY');
  console.log('📍 Où la trouver : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/api');
  console.log('🔍 Cherchez : "service_role secret"\n');

  const serviceRoleKey = await question('Collez votre SERVICE_ROLE_KEY ici : ');

  if (!serviceRoleKey || serviceRoleKey.length < 100) {
    console.log('❌ Clé invalide. Elle doit commencer par "eyJhbGciOiJIUzI1NiIsInR..."');
    rl.close();
    return;
  }

  const adminClient = createClient(SUPABASE_URL, serviceRoleKey.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n✅ Clé validée\n');

  // Étape 2 : Email et mot de passe
  const email = await question('Email admin (défaut: master@taxiassur.com) : ') || 'master@taxiassur.com';
  const password = await question('Nouveau mot de passe (défaut: TaxiAssur2025!,&) : ') || 'TaxiAssur2025!,&';

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DIAGNOSTIC\n');

  // Étape 3 : Vérifier si l'utilisateur existe dans auth.users
  console.log('1️⃣  Recherche dans auth.users...');
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();

  if (listError) {
    console.log('❌ Erreur:', listError.message);
    rl.close();
    return;
  }

  let authUser = users.find(u => u.email === email);
  let userId = null;

  if (authUser) {
    console.log(`✅ Utilisateur trouvé : ${authUser.email}`);
    console.log(`   ID: ${authUser.id}`);
    userId = authUser.id;
  } else {
    console.log(`❌ Utilisateur ${email} introuvable dans auth.users`);
    console.log('   Création...');

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
      rl.close();
      return;
    }

    console.log(`✅ Utilisateur créé : ${newUser.user.id}`);
    userId = newUser.user.id;
    authUser = newUser.user;
  }

  // Étape 4 : Réinitialiser le mot de passe
  console.log('\n2️⃣  Réinitialisation du mot de passe...');
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: password
  });

  if (updateError) {
    console.log('❌ Erreur mise à jour:', updateError.message);
  } else {
    console.log('✅ Mot de passe mis à jour');
  }

  // Étape 5 : Vérifier admin_users
  console.log('\n3️⃣  Vérification table admin_users...');
  const { data: adminUser, error: adminError } = await adminClient
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (adminError) {
    console.log('❌ Erreur:', adminError.message);
  } else if (!adminUser) {
    console.log('❌ Pas d\'entrée dans admin_users, création...');

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

    // Synchroniser l'ID si nécessaire
    if (adminUser.id !== userId) {
      console.log(`⚠️  IDs différents ! Auth: ${userId}, Admin: ${adminUser.id}`);
      console.log('   Mise à jour...');

      const { error: updateIdError } = await adminClient
        .from('admin_users')
        .update({ id: userId })
        .eq('email', email);

      if (updateIdError) {
        console.log('❌ Erreur sync:', updateIdError.message);
      } else {
        console.log('✅ IDs synchronisés');
      }
    }

    // S'assurer que l'admin est actif
    if (!adminUser.is_active) {
      console.log('⚠️  Admin inactif, activation...');

      const { error: activateError } = await adminClient
        .from('admin_users')
        .update({ is_active: true })
        .eq('id', userId);

      if (activateError) {
        console.log('❌ Erreur activation:', activateError.message);
      } else {
        console.log('✅ Admin activé');
      }
    }
  }

  // Étape 6 : Test de connexion
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST DE CONNEXION\n');

  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.log('❌ Échec connexion:', signInError.message);
    console.log('\n⚠️  Vérifiez :');
    console.log('   1. Email/mot de passe corrects');
    console.log('   2. Email confirmé dans Supabase Dashboard');
    console.log('   3. Politiques RLS correctes');
  } else {
    console.log('✅ CONNEXION RÉUSSIE !');
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Email: ${authData.user.email}`);

    // Vérifier qu'on peut lire admin_users
    const { data: verifyAdmin, error: verifyError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (verifyError) {
      console.log('⚠️  Admin connecté mais RLS bloque la lecture:', verifyError.message);
    } else if (verifyAdmin) {
      console.log(`✅ Admin vérifié : ${verifyAdmin.full_name} (${verifyAdmin.role})`);
    } else {
      console.log('⚠️  Admin connecté mais pas trouvé dans admin_users');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 RÉSUMÉ\n');
  console.log(`Email : ${email}`);
  console.log(`Mot de passe : ${password}`);
  console.log(`URL : ${SUPABASE_URL}/project/drohhxrkoequjphvabvq/editor`);
  console.log('\n🎯 Essayez de vous reconnecter sur le backoffice maintenant !\n');

  rl.close();
}

main().catch(console.error);
