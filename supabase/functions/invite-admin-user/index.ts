import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { email, full_name, role, permissions } = await req.json();

    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email et nom complet requis' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Inviting user:', email, full_name, role);

    const redirectUrl = `${req.headers.get('origin') || 'https://taxiassur.com'}/auth/set-password`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          role: role || 'collaborator'
        },
        redirectTo: redirectUrl
      }
    );

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError.message 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Aucun utilisateur créé' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = authData.user.id;

    const { error: dbError } = await supabaseAdmin
      .from('admin_users')
      .insert([{
        id: userId,
        email,
        full_name,
        role: role || 'collaborator',
        is_active: true,
        mfa_enabled: false,
        created_at: new Date().toISOString()
      }]);

    if (dbError) {
      console.error('Database error:', dbError);
      
      await supabaseAdmin.auth.admin.deleteUser(userId);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erreur base de données: ${dbError.message}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Si rôle commercial, créer permissions par défaut
    if (role === 'commercial') {
      const { error: permError } = await supabaseAdmin.rpc('create_commercial_default_permissions', {
        p_user_id: userId
      });

      if (permError) {
        console.error('Error creating commercial permissions:', permError);
        // Continue quand même, ne pas bloquer la création
      } else {
        console.log('Commercial default permissions created for:', userId);
      }
    } else if (permissions && Array.isArray(permissions)) {
      // Pour les autres rôles, utiliser les permissions personnalisées
      for (const perm of permissions) {
        if (perm.view || perm.edit || perm.delete) {
          await supabaseAdmin
            .from('user_permissions')
            .insert([{
              user_id: userId,
              permission_type: perm.type,
              can_view: perm.view || false,
              can_edit: perm.edit || false,
              can_delete: perm.delete || false,
              can_create: perm.create || false
            }]);
        }
      }
    }

    console.log('User invited successfully:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation envoyée avec succès à ${email}`,
        user_id: userId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in invite-admin-user:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur serveur' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});