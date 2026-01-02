import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('🔧 Création de l\'utilisateur master@taxiassur.com...\n');

  const email = 'master@taxiassur.com';
  const password = 'TaxiAssur2026!';

  try {
    console.log('1️⃣ Création dans Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Master Admin'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  Utilisateur Auth existe déjà, mise à jour...');

        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users?.find(u => u.email === email);

        if (existingUser) {
          await supabase.auth.admin.updateUserById(existingUser.id, {
            password,
            email_confirm: true
          });
          console.log('✅ Mot de passe mis à jour dans Auth');
        }
      } else {
        throw authError;
      }
    } else {
      console.log('✅ Utilisateur créé dans Supabase Auth');
      console.log('   ID:', authData.user.id);
    }

    console.log('\n2️⃣ Création/mise à jour dans admin_users...');

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

    console.log('✅ Utilisateur créé dans admin_users\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUCCÈS ! Utilisateur master créé');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📧 Email:', email);
    console.log('🔑 Mot de passe:', password);
    console.log('\n🔗 Connectez-vous sur: /admin-dashboard\n');

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();

    if (adminUser) {
      console.log('📊 Détails du compte:');
      console.log('   - Rôle:', adminUser.role);
      console.log('   - Actif:', adminUser.is_active);
      console.log('   - Créé le:', new Date(adminUser.created_at).toLocaleString('fr-FR'));
    }

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createAdminUser();
