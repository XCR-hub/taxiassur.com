import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.log('Vérifiez que .env contient:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetAdminPassword() {
  console.log('\n🔐 RÉINITIALISATION MOT DE PASSE ADMIN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const email = 'master@taxiassur.com';
  const newPassword = 'TaxiAssur2025!,&'; // Mot de passe documenté

  try {
    // 1. Récupérer l'utilisateur
    console.log('1️⃣ Recherche de l\'utilisateur...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) throw listError;

    const existingUser = users.users?.find(u => u.email === email);

    if (!existingUser) {
      console.log('⚠️  Utilisateur non trouvé. Création...');

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Master Admin'
        }
      });

      if (createError) throw createError;

      console.log('✅ Utilisateur créé avec succès');
      console.log('   ID:', newUser.user.id);
    } else {
      console.log('✅ Utilisateur trouvé');
      console.log('   ID:', existingUser.id);
      console.log('   Email confirmé:', existingUser.email_confirmed_at ? 'Oui' : 'Non');

      // 2. Mettre à jour le mot de passe
      console.log('\n2️⃣ Réinitialisation du mot de passe...');
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: newPassword,
          email_confirm: true
        }
      );

      if (updateError) throw updateError;
      console.log('✅ Mot de passe mis à jour avec succès');
    }

    // 3. Vérifier/créer dans admin_users
    console.log('\n3️⃣ Synchronisation dans admin_users...');
    const { error: dbError } = await supabase
      .from('admin_users')
      .upsert({
        email,
        password_hash: 'managed-by-supabase-auth',
        full_name: 'Master Admin',
        role: 'master',
        is_active: true,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      });

    if (dbError) throw dbError;
    console.log('✅ Table admin_users synchronisée');

    // 4. Vérification finale
    console.log('\n4️⃣ Vérification finale...');
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RÉINITIALISATION TERMINÉE !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📧 Email     :', email);
    console.log('🔑 Mot de passe :', newPassword);
    console.log('👤 Rôle      :', adminUser?.role || 'N/A');
    console.log('✅ Actif     :', adminUser?.is_active ? 'Oui' : 'Non');
    console.log('\n🔗 Connectez-vous sur: https://taxiassur.com/admin-dashboard');
    console.log('   ou en local: http://localhost:5173/admin-dashboard\n');
    console.log('💡 Conseil: Copiez-collez exactement le mot de passe');
    console.log('   (il contient des caractères spéciaux: ! , &)\n');

  } catch (error) {
    console.error('\n❌ ERREUR DÉTAILLÉE:');
    console.error('Message:', error.message);
    if (error.status) console.error('Status:', error.status);
    if (error.code) console.error('Code:', error.code);
    console.error('\nVérifiez:');
    console.error('1. Que les variables d\'environnement sont correctes');
    console.error('2. Que SUPABASE_SERVICE_ROLE_KEY a les droits admin');
    console.error('3. Que la table admin_users existe\n');
    process.exit(1);
  }
}

resetAdminPassword();
