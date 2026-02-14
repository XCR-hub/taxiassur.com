import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Fonction pour envoyer un email via IONOS SMTP
async function sendInvitationEmailSMTP(
  to: string,
  fullName: string,
  type: 'invite' | 'reset'
): Promise<void> {
  const SMTP_HOST = Deno.env.get('IONOS_SMTP_HOST') || 'smtp.ionos.fr';
  const SMTP_PORT = parseInt(Deno.env.get('IONOS_SMTP_PORT') || '465');
  const SMTP_USER = Deno.env.get('IONOS_EMAIL_USER') || 'team@taxiassur.com';
  const SMTP_PASS = Deno.env.get('IONOS_EMAIL_PASSWORD');

  if (!SMTP_PASS) {
    throw new Error('IONOS_EMAIL_PASSWORD not configured');
  }

  const conn = await Deno.connect({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (n === null) return '';
    return decoder.decode(buffer.subarray(0, n));
  }

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + '\r\n'));
    return await readResponse();
  }

  try {
    await readResponse();
    await sendCommand(`EHLO ${SMTP_HOST}`);
    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(SMTP_USER));
    await sendCommand(btoa(SMTP_PASS));
    await sendCommand(`MAIL FROM:<${SMTP_USER}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand('DATA');

    const subject = type === 'invite'
      ? 'Invitation au CRM TaxiAssur'
      : 'Réinitialisation de votre mot de passe - CRM TaxiAssur';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; }
    .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">${type === 'invite' ? '🎉 Bienvenue !' : '🔑 Réinitialisation'}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">CRM TaxiAssur</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; margin-bottom: 20px;">Bonjour <strong>${fullName}</strong>,</p>

      ${type === 'invite' ? `
        <p>Vous avez été invité(e) à rejoindre le CRM TaxiAssur !</p>
        <p>Pour activer votre compte et définir votre mot de passe, veuillez consulter votre boîte mail et cliquer sur le lien d'activation envoyé par Supabase.</p>
      ` : `
        <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte.</p>
        <p>Veuillez consulter votre boîte mail et suivre le lien de réinitialisation envoyé par Supabase.</p>
      `}

      <div class="info-box">
        <strong>⚠️ Important :</strong> Ce lien est valable pendant 24 heures seulement.
      </div>

      <p style="margin-top: 30px;">Si vous n'avez pas reçu l'email de Supabase, vérifiez vos spams ou contactez l'administrateur.</p>

      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Une fois connecté, vous aurez accès à toutes les fonctionnalités du CRM selon vos permissions.
      </p>
    </div>
    <div class="footer">
      <strong>TaxiAssur CRM</strong><br>
      Plateforme de gestion commerciale<br>
      © 2026 TaxiAssur - Tous droits réservés
    </div>
  </div>
</body>
</html>`;

    const emailContent = [
      `From: "TaxiAssur CRM" <${SMTP_USER}>`,
      `To: "${fullName}" <${to}>`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
      '.',
    ].join('\r\n');

    await conn.write(encoder.encode(emailContent + '\r\n'));
    await readResponse();
    await sendCommand('QUIT');
  } finally {
    conn.close();
  }
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

    // Envoyer également un email via IONOS SMTP comme backup
    try {
      await sendInvitationEmailSMTP(email, full_name, authData.user.email_confirmed_at ? 'reset' : 'invite');
      console.log('IONOS SMTP invitation email sent successfully');
    } catch (smtpError) {
      console.error('Failed to send IONOS SMTP email (non-blocking):', smtpError);
      // Ne pas bloquer si l'email SMTP échoue, Supabase Auth a déjà envoyé un email
    }

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