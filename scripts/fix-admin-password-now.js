#!/usr/bin/env node

/**
 * Script de diagnostic et correction du mot de passe admin
 *
 * Ce script va:
 * 1. Vérifier si l'utilisateur admin existe
 * 2. Tester différents mots de passe
 * 3. Proposer de recréer l'utilisateur si nécessaire
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const EMAIL = 'master@taxiassur.com';
const CORRECT_PASSWORD = 'TaxiAssur2025!,&';

// Mots de passe à tester
const PASSWORDS_TO_TEST = [
  'TaxiAssur2025!,&',
  'TaxiAssur2026!,&',
  'taxiassur2024',
  'taxiassur2026',
  'TaxiAssur2026!'
];

console.log('\n🔍 DIAGNOSTIC MOT DE PASSE ADMIN\n');
console.log('=' .repeat(60));

async function testPassword(supabase, email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function checkAdminUser() {
  console.log('\n1️⃣ Vérification de l\'utilisateur admin...\n');

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Lister tous les utilisateurs
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', error.message);
      return null;
    }

    const adminUser = users.users.find(u => u.email === EMAIL);

    if (adminUser) {
      console.log(`✅ Utilisateur trouvé: ${EMAIL}`);
      console.log(`   ID: ${adminUser.id}`);
      console.log(`   Créé le: ${new Date(adminUser.created_at).toLocaleString('fr-FR')}`);
      console.log(`   Email confirmé: ${adminUser.email_confirmed_at ? 'Oui' : 'Non'}`);
      return adminUser;
    } else {
      console.log(`❌ Utilisateur ${EMAIL} non trouvé dans Supabase Auth`);
      return null;
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    return null;
  }
}

async function testPasswords() {
  console.log('\n2️⃣ Test des différents mots de passe...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  for (const password of PASSWORDS_TO_TEST) {
    process.stdout.write(`   Testing "${password}"... `);

    const result = await testPassword(supabase, EMAIL, password);

    if (result.success) {
      console.log('✅ FONCTIONNE!');
      return password;
    } else {
      console.log('❌ Échec');
    }

    // Attendre un peu entre chaque test
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return null;
}

async function updateAdminPassword(userId) {
  console.log('\n3️⃣ Mise à jour du mot de passe...\n');

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: CORRECT_PASSWORD }
    );

    if (error) {
      console.error('❌ Erreur lors de la mise à jour:', error.message);
      return false;
    }

    console.log('✅ Mot de passe mis à jour avec succès!');
    return true;
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    return false;
  }
}

async function createAdminUser() {
  console.log('\n3️⃣ Création de l\'utilisateur admin...\n');

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Créer l'utilisateur dans Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: EMAIL,
      password: CORRECT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Master Admin',
        role: 'super_admin'
      }
    });

    if (authError) {
      console.error('❌ Erreur lors de la création:', authError.message);
      return false;
    }

    console.log('✅ Utilisateur Auth créé:', authUser.user.id);

    // Créer l'entrée dans admin_users
    const { error: dbError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: authUser.user.id,
        email: EMAIL,
        full_name: 'Master Admin',
        role: 'super_admin',
        is_active: true
      });

    if (dbError && !dbError.message.includes('duplicate')) {
      console.error('⚠️  Erreur lors de l\'insertion dans admin_users:', dbError.message);
    } else {
      console.log('✅ Entrée admin_users créée');
    }

    return true;
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    return false;
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('\n❌ Variables d\'environnement manquantes!');
    console.error('   Vérifiez que .env contient:');
    console.error('   - VITE_SUPABASE_URL');
    console.error('   - VITE_SUPABASE_SERVICE_ROLE_KEY\n');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Mot de passe correct: ${CORRECT_PASSWORD}\n`);

  // Étape 1: Vérifier si l'utilisateur existe
  const adminUser = await checkAdminUser();

  if (!adminUser) {
    console.log('\n📝 Action: Création de l\'utilisateur admin');
    const created = await createAdminUser();

    if (created) {
      console.log('\n' + '='.repeat(60));
      console.log('\n✅ SUCCÈS! Utilisateur admin créé.\n');
      console.log('Vous pouvez maintenant vous connecter avec:');
      console.log(`   Email: ${EMAIL}`);
      console.log(`   Mot de passe: ${CORRECT_PASSWORD}\n`);
    } else {
      console.log('\n❌ Échec de la création. Vérifiez les logs ci-dessus.\n');
    }
    return;
  }

  // Étape 2: Tester les mots de passe
  const workingPassword = await testPasswords();

  if (workingPassword) {
    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ MOT DE PASSE TROUVÉ: "${workingPassword}"\n`);

    if (workingPassword !== CORRECT_PASSWORD) {
      console.log('⚠️  Le mot de passe actuel diffère du mot de passe attendu.');
      console.log(`   Attendu: ${CORRECT_PASSWORD}`);
      console.log(`   Actuel: ${workingPassword}\n`);

      console.log('📝 Action: Mise à jour vers le mot de passe standard...');
      const updated = await updateAdminPassword(adminUser.id);

      if (updated) {
        console.log('\n✅ Mot de passe mis à jour!\n');
        console.log('Utilisez maintenant:');
        console.log(`   Email: ${EMAIL}`);
        console.log(`   Mot de passe: ${CORRECT_PASSWORD}\n`);
      }
    } else {
      console.log('✅ Le mot de passe est correct!\n');
      console.log('Utilisez:');
      console.log(`   Email: ${EMAIL}`);
      console.log(`   Mot de passe: ${CORRECT_PASSWORD}\n`);
    }
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('\n❌ AUCUN MOT DE PASSE NE FONCTIONNE\n');
    console.log('📝 Action: Réinitialisation du mot de passe...');

    const updated = await updateAdminPassword(adminUser.id);

    if (updated) {
      console.log('\n✅ Mot de passe réinitialisé!\n');
      console.log('Utilisez maintenant:');
      console.log(`   Email: ${EMAIL}`);
      console.log(`   Mot de passe: ${CORRECT_PASSWORD}\n`);
    }
  }

  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
