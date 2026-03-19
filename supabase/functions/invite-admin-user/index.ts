import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const ROLE_LABELS: Record<string, string> = {
  master: 'Super Administrateur',
  admin: 'Administrateur',
  collaborator: 'Collaborateur',
  commercial: 'Commercial',
  support: 'Support client',
};

function buildInvitationEmail(fullName: string, invitationLink: string, role: string): string {
  const firstName = fullName.split(' ')[0];
  const roleLabel = ROLE_LABELS[role] || 'Collaborateur';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation TaxiAssur</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- LOGO BAR -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#0F172A;border-radius:10px;padding:10px 20px;">
                    <span style="font-size:20px;font-weight:900;color:#FFFFFF;letter-spacing:-0.5px;">
                      Taxi<span style="color:#F59E0B;">Assur</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CARD -->
          <tr>
            <td style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- HEADER -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#0F172A;padding:48px 40px 44px;text-align:center;position:relative;">
                    <div style="width:64px;height:64px;background:rgba(245,158,11,0.15);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(245,158,11,0.3);">
                      <!-- Taxi icon placeholder -->
                      <span style="font-size:28px;line-height:64px;display:block;">&#128664;</span>
                    </div>
                    <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;line-height:1.2;">
                      Vous etes invite !
                    </h1>
                    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.5;">
                      Rejoignez l'espace d'administration TaxiAssur
                    </p>
                    <!-- STRIPE -->
                    <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#F59E0B 0%,#D97706 60%,transparent 100%);"></div>
                  </td>
                </tr>
              </table>

              <!-- BODY -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 40px 8px;">

                    <p style="margin:0 0 6px 0;font-size:18px;font-weight:700;color:#0F172A;">
                      Bonjour ${firstName},
                    </p>
                    <p style="margin:0 0 28px 0;font-size:15px;color:#475569;line-height:1.6;">
                      Vous avez ete invite a rejoindre la plateforme de gestion <strong style="color:#0F172A;">TaxiAssur</strong>. Votre acces a ete configure avec le profil suivant :
                    </p>

                    <!-- ROLE BADGE -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                      <tr>
                        <td style="background-color:#FFFBEB;border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:12px 20px;">
                          <span style="font-size:12px;font-weight:700;color:#92400E;letter-spacing:0.5px;text-transform:uppercase;">Role attribue</span>
                          <br>
                          <span style="font-size:16px;font-weight:800;color:#D97706;">${roleLabel}</span>
                        </td>
                      </tr>
                    </table>

                    <!-- STEP 1 -->
                    <p style="margin:0 0 20px 0;font-size:14px;color:#475569;line-height:1.6;">
                      Pour activer votre compte, cliquez sur le bouton ci-dessous et choisissez votre mot de passe personnel. Le lien est valable <strong style="color:#0F172A;">24 heures</strong>.
                    </p>

                    <!-- CTA BUTTON -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                      <tr>
                        <td align="center">
                          <a href="${invitationLink}"
                             style="display:inline-block;background-color:#F59E0B;color:#0F172A;text-decoration:none;padding:16px 48px;border-radius:10px;font-size:16px;font-weight:800;letter-spacing:-0.3px;box-shadow:0 4px 14px rgba(245,158,11,0.35);">
                            Creer mon mot de passe &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- DIVIDER -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="border-top:1px solid #E2E8F0;"></td>
                      </tr>
                    </table>

                    <!-- FEATURES -->
                    <p style="margin:0 0 16px 0;font-size:13px;font-weight:700;color:#0F172A;text-transform:uppercase;letter-spacing:0.5px;">
                      Ce que vous pouvez faire sur la plateforme
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                      <tr>
                        <td style="padding:0 0 10px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:20px;height:20px;background-color:#D1FAE5;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#059669;font-weight:900;">&#10003;</span>
                              </td>
                              <td style="font-size:14px;color:#334155;line-height:1.5;padding-left:10px;">Gestion des <strong>leads et prospects</strong> dans le CRM pipeline</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 10px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:20px;height:20px;background-color:#D1FAE5;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#059669;font-weight:900;">&#10003;</span>
                              </td>
                              <td style="font-size:14px;color:#334155;line-height:1.5;padding-left:10px;">Suivi des <strong>devis et contrats</strong> en temps reel</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 10px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:20px;height:20px;background-color:#D1FAE5;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#059669;font-weight:900;">&#10003;</span>
                              </td>
                              <td style="font-size:14px;color:#334155;line-height:1.5;padding-left:10px;">Messagerie et <strong>communication integree</strong> avec les clients</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 10px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:20px;height:20px;background-color:#D1FAE5;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#059669;font-weight:900;">&#10003;</span>
                              </td>
                              <td style="font-size:14px;color:#334155;line-height:1.5;padding-left:10px;">Validation des <strong>documents clients</strong> et gestion documentaire</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:20px;height:20px;background-color:#D1FAE5;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#059669;font-weight:900;">&#10003;</span>
                              </td>
                              <td style="font-size:14px;color:#334155;line-height:1.5;padding-left:10px;">Tableaux de bord et <strong>statistiques commerciales</strong></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- ONBOARDING BLOCK -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:24px 24px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:middle;padding-bottom:12px;">
                                <table cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="width:36px;height:36px;background-color:#0F172A;border-radius:8px;text-align:center;vertical-align:middle;">
                                      <span style="font-size:18px;line-height:36px;display:block;">&#128218;</span>
                                    </td>
                                    <td style="padding-left:12px;vertical-align:middle;">
                                      <p style="margin:0;font-size:14px;font-weight:800;color:#0F172A;line-height:1.2;">Guide de bienvenue</p>
                                      <p style="margin:2px 0 0 0;font-size:12px;color:#64748B;">Prenez connaissance de votre poste avant votre premiere connexion</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <p style="margin:0 0 16px 0;font-size:13px;color:#475569;line-height:1.6;">
                                  Nous avons prepare une presentation complete de votre role, de nos outils, et de nos processus internes. Consultez-la avant votre premiere connexion pour demarrer dans les meilleures conditions.
                                </p>
                                <table cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td>
                                      <a href="https://taxiassur.com/onboarding-commercial.html"
                                         style="display:inline-block;background-color:#0F172A;color:#FFFFFF;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:-0.2px;">
                                        Lire le guide d'onboarding &rarr;
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- SECURITY NOTE -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                      <tr>
                        <td style="background-color:#FFFBEB;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:14px 18px;">
                          <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;">
                            <strong>Securite :</strong> Ce lien d'invitation expire dans 24 heures. Si vous n'avez pas demande cet acces, ignorez cet email ou contactez immediatement <a href="mailto:team@taxiassur.com" style="color:#D97706;font-weight:600;">team@taxiassur.com</a>.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- FALLBACK LINK -->
                    <p style="margin:0 0 6px 0;font-size:12px;color:#94A3B8;">
                      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
                    </p>
                    <p style="margin:0 0 40px 0;padding:12px 14px;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;font-size:11px;color:#3B82F6;word-break:break-all;line-height:1.5;">
                      ${invitationLink}
                    </p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:28px 0 0 0;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#475569;">
                TaxiAssur — Plateforme Assurance Taxi &amp; VTC
              </p>
              <p style="margin:0 0 4px 0;font-size:12px;color:#94A3B8;">
                <a href="mailto:team@taxiassur.com" style="color:#94A3B8;text-decoration:none;">team@taxiassur.com</a>
                &nbsp;&bull;&nbsp;
                <a href="https://taxiassur.com" style="color:#94A3B8;text-decoration:none;">www.taxiassur.com</a>
              </p>
              <p style="margin:0;font-size:11px;color:#CBD5E1;">
                &copy; 2026 TaxiAssur. Tous droits reserves.
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

async function sendInvitationEmail(to: string, fullName: string, invitationLink: string, role: string): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const htmlBody = buildInvitationEmail(fullName, invitationLink, role);
  const subject = `Votre invitation TaxiAssur — Creez votre mot de passe`;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-email-ionos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      to,
      toName: fullName,
      subject,
      html: htmlBody,
      fromName: 'TaxiAssur',
      from: 'team@taxiassur.com',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`send-email-ionos HTTP ${res.status}: ${errText}`);
  }

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || 'Echec envoi email');
  }

  console.log(`Invitation email sent to ${to}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action, user_id, email, full_name, role, permissions, force_resend } = body;

    // --- DELETE ACTION ---
    if (action === 'delete') {
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id requis pour la suppression' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      await supabaseAdmin.from('user_permissions').delete().eq('user_id', user_id);
      await supabaseAdmin.from('admin_users').delete().eq('id', user_id);
      await supabaseAdmin.auth.admin.deleteUser(user_id);
      return new Response(
        JSON.stringify({ success: true, message: 'Utilisateur supprime avec succes' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email et nom complet requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Format d'email invalide" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['master', 'admin', 'collaborator', 'commercial', 'support'];
    const userRole = role || 'collaborator';
    if (!validRoles.includes(userRole)) {
      return new Response(
        JSON.stringify({ success: false, error: `Role invalide. Roles valides: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const redirectUrl = `${req.headers.get('origin') || 'https://taxiassur.com'}/auth/set-password`;

    // Check if user already exists in admin_users
    const { data: existingUser } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, full_name, role, is_active')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      if (!existingUser.is_active) {
        await supabaseAdmin.from('admin_users').update({ is_active: true }).eq('id', existingUser.id);
      }

      if (force_resend) {
        let actionLink: string | null = null;

        // Try recovery link first (user already has auth account)
        const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: redirectUrl },
        });

        if (resetData?.properties?.action_link) {
          actionLink = resetData.properties.action_link;
        } else {
          // Auth user doesn't exist — create it via invite
          console.log('Recovery failed, creating auth user via invite:', resetError?.message);
          const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email,
            options: {
              data: { full_name: existingUser.full_name || full_name, role: existingUser.role || userRole },
              redirectTo: redirectUrl,
            },
          });

          if (inviteError || !inviteData?.properties?.action_link) {
            return new Response(
              JSON.stringify({ success: false, error: `Impossible de generer le lien: ${inviteError?.message || resetError?.message || 'erreur inconnue'}` }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          actionLink = inviteData.properties.action_link;

          // Sync the new auth user id back to admin_users if needed
          if (inviteData.user?.id && inviteData.user.id !== existingUser.id) {
            await supabaseAdmin.from('admin_users').update({ id: inviteData.user.id }).eq('email', email);
          }
        }
        let emailSent = false;
        let emailError = '';

        try {
          await sendInvitationEmail(email, existingUser.full_name || full_name, actionLink, existingUser.role || userRole);
          emailSent = true;
        } catch (mailErr: any) {
          emailError = mailErr?.message || 'Erreur SMTP inconnue';
          console.error('Email send error (force_resend):', mailErr);
        }

        return new Response(
          JSON.stringify({
            success: true,
            email_sent: emailSent,
            action_link: actionLink,
            message: emailSent
              ? `Invitation renvoyee a ${email}`
              : `Lien genere mais email non envoye (${emailError}). Copiez le lien manuellement.`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingUser.is_active) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `L'utilisateur ${existingUser.full_name} (${email}) existe deja et est actif.`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate invite link without sending Supabase default plain email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { full_name, role: userRole },
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      // Fallback: if user already exists in auth, look them up
      if (linkError.message?.includes('already') || linkError.message?.includes('registered')) {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = usersData?.users?.find((u: any) => u.email === email);

        if (existingAuthUser) {
          const userId = existingAuthUser.id;
          await supabaseAdmin.from('admin_users').insert([{
            id: userId, email, full_name, role: userRole,
            is_active: true, mfa_enabled: false, created_at: new Date().toISOString(),
          }]);

          // Generate reset link as fallback
          const { data: resetData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: { redirectTo: redirectUrl },
          });

          if (resetData?.properties?.action_link) {
            try {
              await sendInvitationEmail(email, full_name, resetData.properties.action_link, userRole);
            } catch (mailErr) {
              console.error('Email send error (fallback):', mailErr);
            }
          }

          return new Response(
            JSON.stringify({ success: true, message: `Invitation envoyee a ${email}`, user_id: userId }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: linkError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = linkData.user?.id;
    const invitationLink = linkData.properties?.action_link;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aucun utilisateur cree' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into admin_users
    const { error: dbError } = await supabaseAdmin.from('admin_users').insert([{
      id: userId, email, full_name, role: userRole,
      is_active: true, mfa_enabled: false, created_at: new Date().toISOString(),
    }]);

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      let errorMessage = dbError.message;
      if (dbError.message.includes('valid_email')) errorMessage = "Format d'email invalide";
      else if (dbError.message.includes('admin_users_role_check')) errorMessage = 'Role invalide';
      else if (dbError.message.includes('duplicate key') || dbError.message.includes('unique')) errorMessage = 'Email deja utilise';
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create permissions
    if (userRole === 'commercial') {
      await supabaseAdmin.rpc('create_commercial_default_permissions', { p_user_id: userId }).catch(() => {});
    } else if (permissions && Array.isArray(permissions)) {
      for (const perm of permissions) {
        if (perm.view || perm.edit || perm.delete) {
          await supabaseAdmin.from('user_permissions').insert([{
            user_id: userId,
            permission_type: perm.type,
            can_view: perm.view || false,
            can_edit: perm.edit || false,
            can_delete: perm.delete || false,
            can_create: perm.create || false,
          }]);
        }
      }
    }

    // Send beautiful branded invitation email
    if (invitationLink) {
      try {
        await sendInvitationEmail(email, full_name, invitationLink, userRole);
        console.log('Branded invitation email sent successfully to', email);
      } catch (mailErr) {
        console.error('Failed to send branded email, proceeding anyway:', mailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation envoyee avec succes a ${email}`,
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in invite-admin-user:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
