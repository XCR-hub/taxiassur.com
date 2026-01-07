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
  console.log('\n🔍 DIAGNOSTIC APPROFONDI - PROBLÈME DE CONNEXION\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Vérifier l'utilisateur dans auth.users
  console.log('1️⃣  Vérification auth.users...');
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();

  if (listError) {
    console.log('❌ Erreur:', listError.message);
    process.exit(1);
  }

  let authUser = users.find(u => u.email === email);

  if (!authUser) {
    console.log('❌ Utilisateur introuvable dans auth.users');
    console.log('   Création nécessaire...');

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

    authUser = newUser.user;
    console.log(`✅ Utilisateur créé : ${authUser.id}`);
  } else {
    console.log(`✅ Utilisateur trouvé : ${authUser.id}`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Email confirmé: ${authUser.email_confirmed_at ? '✅' : '❌'}`);
    console.log(`   Créé le: ${new Date(authUser.created_at).toLocaleString()}`);
    console.log(`   Dernière connexion: ${authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : 'Jamais'}`);
  }

  // 2. Forcer la réinitialisation du mot de passe
  console.log('\n2️⃣  Réinitialisation forcée du mot de passe...');
  const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
    authUser.id,
    {
      password: password,
      email_confirm: true,
      ban_duration: 'none'
    }
  );

  if (updateError) {
    console.log('❌ Erreur:', updateError.message);
  } else {
    console.log('✅ Mot de passe réinitialisé avec succès');
  }

  // 3. Vérifier admin_users
  console.log('\n3️⃣  Vérification admin_users...');
  const { data: adminUsers, error: adminError } = await adminClient
    .from('admin_users')
    .select('*')
    .eq('email', email);

  if (adminError) {
    console.log('❌ Erreur:', adminError.message);
  } else if (!adminUsers || adminUsers.length === 0) {
    console.log('❌ Aucune entrée dans admin_users');
    console.log('   Création...');

    const { error: insertError } = await adminClient
      .from('admin_users')
      .insert({
        id: authUser.id,
        email: email,
        full_name: 'Master Admin',
        role: 'super_admin',
        is_active: true
      });

    if (insertError) {
      console.log('❌ Erreur insertion:', insertError.message);
    } else {
      console.log('✅ Entrée créée');
    }
  } else {
    console.log(`✅ ${adminUsers.length} entrée(s) trouvée(s)`);
    adminUsers.forEach((admin, i) => {
      console.log(`\n   Entrée ${i + 1}:`);
      console.log(`   - ID: ${admin.id}`);
      console.log(`   - Email: ${admin.email}`);
      console.log(`   - Nom: ${admin.full_name}`);
      console.log(`   - Role: ${admin.role}`);
      console.log(`   - Actif: ${admin.is_active}`);
    });

    // Synchroniser l'ID si nécessaire
    const mainAdmin = adminUsers[0];
    if (mainAdmin.id !== authUser.id) {
      console.log('\n⚠️  Désynchronisation des IDs détectée');
      console.log(`   Auth ID: ${authUser.id}`);
      console.log(`   Admin ID: ${mainAdmin.id}`);
      console.log('   Correction...');

      const { error: syncError } = await adminClient
        .from('admin_users')
        .update({ id: authUser.id })
        .eq('email', email);

      if (syncError) {
        console.log('❌ Erreur sync:', syncError.message);
      } else {
        console.log('✅ IDs synchronisés');
      }
    }

    // Activer le compte
    if (!mainAdmin.is_active) {
      console.log('\n⚠️  Compte inactif, activation...');
      const { error: activateError } = await adminClient
        .from('admin_users')
        .update({ is_active: true })
        .eq('id', authUser.id);

      if (activateError) {
        console.log('❌ Erreur:', activateError.message);
      } else {
        console.log('✅ Compte activé');
      }
    }
  }

  // 4. Tester différentes variantes du mot de passe
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4️⃣  TEST DE CONNEXION AVEC DIFFÉRENTS MOTS DE PASSE\n');

  const passwords = [
    'TaxiAssur2025!,&',
    'TaxiAssur2025!',
    'Master2025!',
    'Admin2025!'
  ];

  let successfulPassword = null;

  for (const testPassword of passwords) {
    console.log(`Tentative avec: ${testPassword}`);
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: testPassword
    });

    if (!signInError) {
      console.log(`✅ SUCCÈS avec: ${testPassword}`);
      successfulPassword = testPassword;

      // Déconnexion immédiate
      await supabase.auth.signOut();
      break;
    } else {
      console.log(`   ❌ ${signInError.message}`);
    }
  }

  if (!successfulPassword) {
    console.log('\n❌ AUCUN MOT DE PASSE N\'A FONCTIONNÉ');
    console.log('\n🔧 RÉINITIALISATION COMPLÈTE...');

    // Supprimer l'ancien utilisateur
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUser.id);
    if (deleteError) {
      console.log('⚠️  Impossible de supprimer:', deleteError.message);
    }

    // Recréer avec un mot de passe simple
    const newPassword = 'Master2025!';
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Master Admin',
        role: 'super_admin'
      }
    });

    if (createError) {
      console.log('❌ Erreur recréation:', createError.message);
      process.exit(1);
    }

    console.log(`✅ Nouvel utilisateur créé : ${newUser.user.id}`);

    // Créer dans admin_users
    const { error: insertError } = await adminClient
      .from('admin_users')
      .upsert({
        id: newUser.user.id,
        email: email,
        full_name: 'Master Admin',
        role: 'super_admin',
        is_active: true
      }, {
        onConflict: 'email'
      });

    if (insertError) {
      console.log('⚠️  Erreur admin_users:', insertError.message);
    }

    // Test final
    console.log('\n🧪 Test avec le nouveau mot de passe...');
    const { data: finalAuth, error: finalError } = await supabase.auth.signInWithPassword({
      email,
      password: newPassword
    });

    if (finalError) {
      console.log('❌ ÉCHEC:', finalError.message);
    } else {
      console.log('✅ CONNEXION RÉUSSIE !');
      successfulPassword = newPassword;
      await supabase.auth.signOut();
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 IDENTIFIANTS FINAUX\n');
  console.log(`Email      : ${email}`);
  console.log(`Mot de passe : ${successfulPassword || 'Master2025!'}`);
  console.log('\n🌐 URL : https://taxiassur.com/admin');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(error => {
  console.error('\n❌ ERREUR:', error.message);
  console.error(error);
  process.exit(1);
});
