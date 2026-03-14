import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function generateInvitationEmail(fullName: string, invitationLink: string, baseUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                Bienvenue à TaxiAssur
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                Plateforme de Gestion Assurance Taxi
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Bonjour <strong>${fullName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Vous avez été invité à rejoindre la plateforme TaxiAssur. Créez votre compte en cliquant sur le bouton ci-dessous pour accéder à tous les outils de gestion assurance.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                      Créer mon compte
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 10px 0; font-size: 14px; color: #666666; line-height: 1.6;">
                Ou copiez ce lien dans votre navigateur :
              </p>
              <p style="margin: 0; padding: 15px; background-color: #f8f8f8; border-radius: 6px; font-size: 12px; color: #0066cc; word-break: break-all;">
                ${invitationLink}
              </p>

              <div style="margin: 30px 0; padding: 20px; background-color: #f0f4ff; border-left: 4px solid #2563eb; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #1e3a8a; line-height: 1.6;">
                  <strong>Ce lien expire dans 24 heures.</strong> Si vous n'avez pas demandé cette invitation, ignorez cet email ou contactez-nous immédiatement.
                </p>
              </div>

              <h3 style="margin: 30px 0 15px 0; font-size: 16px; color: #1e40af; font-weight: 600;">
                Accès à la plateforme
              </h3>
              <ul style="margin: 0 0 20px 20px; padding: 0; color: #333333; font-size: 14px; line-height: 1.8;">
                <li style="margin-bottom: 8px;">Gestion complète de vos prospects et clients</li>
                <li style="margin-bottom: 8px;">Suivi des devis et contrats en temps réel</li>
                <li style="margin-bottom: 8px;">Outils de communication intégrés</li>
                <li style="margin-bottom: 8px;">Rapports et analyses détaillés</li>
                <li>Support client 24/7</li>
              </ul>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                <strong>TaxiAssur</strong> - Plateforme Assurance Taxi & VTC Professionnelle
              </p>
              <p style="margin: 0 0 15px 0; font-size: 13px; color: #999999;">
                team@taxiassur.com | www.taxiassur.com | ${baseUrl}
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                © 2026 TaxiAssur. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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

    const body = await req.json();
    console.log('Request body received:', JSON.stringify(body));

    const { email, full_name, role, permissions } = body;

    console.log('Parsed values:', { email, full_name, role, permissions });

    if (!email || !full_name) {
      console.error('Missing required fields:', { email: !!email, full_name: !!full_name });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email et nom complet requis',
          received: { email: !!email, full_name: !!full_name }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    console.log('Validating email format:', email);
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Format d\'email invalide. L\'email doit contenir un domaine valide (ex: user@domain.com)',
          email_provided: email
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log('Email format valid:', email);

    // Validate role
    const validRoles = ['master', 'admin', 'collaborator', 'commercial', 'support'];
    const userRole = role || 'collaborator';
    if (!validRoles.includes(userRole)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Rôle invalide. Rôles valides: ${validRoles.join(', ')}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Inviting user:', email, full_name, userRole);

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, full_name, role, is_active')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      console.log('User already exists:', existingUser);

      // If user exists but is inactive, reactivate them
      if (!existingUser.is_active) {
        console.log('Reactivating inactive user:', email);

        const { error: updateError } = await supabaseAdmin
          .from('admin_users')
          .update({ is_active: true })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('Error reactivating user:', updateError);
        }

        // Resend invitation
        const redirectUrl = `${req.headers.get('origin') || 'https://taxiassur.com'}/auth/set-password`;
        const { error: resendError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name, role: userRole },
          redirectTo: redirectUrl
        });

        if (resendError) {
          console.error('Error resending invitation:', resendError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Utilisateur ${existingUser.full_name} réactivé et invitation renvoyée à ${email}`,
            user_id: existingUser.id,
            reactivated: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // User exists and is active
      return new Response(
        JSON.stringify({
          success: false,
          error: `L'utilisateur ${existingUser.full_name} (${email}) existe déjà et est actif. Utilisez "Renvoyer l'invitation" si besoin.`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Note: Supabase envoie déjà un email d'invitation automatique
    // Pas besoin d'envoyer un email custom supplémentaire
    console.log('User invited successfully, Supabase will send invitation email');

    if (authError) {
      console.error('Auth error:', authError);

      // If user already exists in Auth but not in admin_users, look up their auth ID
      if (authError.message?.includes('already been registered') || authError.message?.includes('already registered') || authError.code === 'email_exists') {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = usersData?.users?.find((u: any) => u.email === email);

        if (existingAuthUser) {
          const userId = existingAuthUser.id;

          const { error: dbInsertError } = await supabaseAdmin
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

          if (dbInsertError) {
            return new Response(
              JSON.stringify({ success: false, error: dbInsertError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: `Utilisateur ${full_name} ajouté avec succès. Un email de réinitialisation de mot de passe va être envoyé.`,
              user_id: userId
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

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

      // Cleanup: delete auth user if DB insert failed
      await supabaseAdmin.auth.admin.deleteUser(userId);

      // Provide user-friendly error messages
      let errorMessage = dbError.message;

      if (dbError.message.includes('valid_email')) {
        errorMessage = 'Format d\'email invalide. Veuillez utiliser un email avec domaine complet (ex: user@domain.com)';
      } else if (dbError.message.includes('admin_users_role_check')) {
        errorMessage = 'Rôle invalide. Rôles autorisés: master, admin, collaborator, commercial, support';
      } else if (dbError.message.includes('duplicate key') || dbError.message.includes('unique')) {
        errorMessage = 'Cet email est déjà utilisé par un autre utilisateur';
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage
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