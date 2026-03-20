import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Patterns locaux de pré-filtrage rapide (avant appel DB)
const LOCAL_BLACKLIST_DOMAINS = new Set([
  'taxiassur.com', 'hunter.io', 'snov.io', 'apollo.io', 'lusha.com',
  'zoominfo.com', 'clearbit.com', 'rocketreach.co', 'neverbounce.com',
  'zerobounce.net', 'debounce.io', 'kickbox.com', 'verifalia.com',
  'mailinator.com', 'guerrillamail.com', 'yopmail.com', 'yopmail.fr',
  '10minutemail.com', 'temp-mail.org', 'trashmail.com', 'trashmail.me',
  'throwaway.email', 'fakeinbox.com', 'maildrop.cc', 'sharklasers.com',
  'dispostable.com', 'tempmail.com', 'spamgourmet.com',
  'instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com',
  'tiktok.com', 'pinterest.com', 'youtube.com',
  'mailchimp.com', 'sendgrid.net', 'brevo.com', 'sendinblue.com',
  'hubspot.com', 'salesforce.com', 'phantombuster.com', 'scrapingbee.com',
]);

const LOCAL_BLACKLIST_PATTERNS = [
  'noreply', 'no-reply', 'donotreply', 'mailer-daemon', 'postmaster',
  'mailer@', 'notification@', 'notifications@', 'bounce', 'daemon',
  'automated', 'auto-confirm', 'autoconfirm', 'system@', 'robot@',
  'bot@', 'crawler@', 'abuse@', 'alert@', 'alerts@',
];

function isLocallyBlacklisted(email: string): boolean {
  const lower = email.toLowerCase();
  const domain = lower.split('@')[1] ?? '';

  if (LOCAL_BLACKLIST_DOMAINS.has(domain)) return true;

  for (const pattern of LOCAL_BLACKLIST_PATTERNS) {
    if (lower.includes(pattern)) return true;
  }

  return false;
}

function extractNameFromEmail(email: string, fromName?: string): { firstName: string; lastName: string } {
  if (fromName && fromName.trim() && !fromName.includes('@')) {
    const parts = fromName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    }
    return { firstName: fromName.trim(), lastName: '' };
  }

  const username = email.split('@')[0];
  const cleaned = username.replace(/[._-]/g, ' ').replace(/\d+/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(p => p.length > 1);

  if (parts.length >= 2) {
    return {
      firstName: parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase(),
      lastName: parts.slice(1).join(' ').charAt(0).toUpperCase() + parts.slice(1).join(' ').slice(1).toLowerCase()
    };
  }

  return {
    firstName: cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase(),
    lastName: ''
  };
}

function extractPhoneFromContent(content: string): string | null {
  const phonePatterns = [
    /(?:^|\s)(\+?33|0)[1-9](?:[\s.-]?\d{2}){4}(?:\s|$)/g,
    /(?:^|\s)(0[1-9]\d{8})(?:\s|$)/g,
  ];

  for (const pattern of phonePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      return matches[0].trim().replace(/[\s.-]/g, '');
    }
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    console.log('[auto-create-leads] Démarrage traitement emails...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les emails inbound sans lead_id
    const { data: emails, error: fetchError } = await supabase
      .from('email_messages')
      .select('*')
      .is('lead_id', null)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) throw fetchError;

    console.log(`[auto-create-leads] ${emails?.length || 0} emails à analyser`);

    let created = 0;
    let linked = 0;
    let skipped = 0;
    let rejected = 0;
    const results: any[] = [];

    for (const email of emails || []) {
      try {
        console.log(`[auto-create-leads] Analyse: ${email.from_email} — "${email.subject}"`);

        // 1. Pré-filtrage local rapide
        if (isLocallyBlacklisted(email.from_email)) {
          console.log(`[auto-create-leads] Ignoré (liste noire locale): ${email.from_email}`);
          skipped++;
          continue;
        }

        // 2. Classification intelligente via DB (avec scoring complet)
        const { data: classification, error: classifError } = await supabase
          .rpc('classify_email_lead', {
            p_email:      email.from_email,
            p_subject:    email.subject || null,
            p_body:       (email.body_text || '').substring(0, 2000),
            p_from_name:  email.from_name || null,
            p_has_attach: !!(email.attachments && email.attachments.length > 0),
          });

        if (classifError) {
          console.error(`[auto-create-leads] Erreur classification pour ${email.from_email}:`, classifError);
          // En cas d'erreur DB, on tente quand même si pas dans liste noire locale
        }

        const isRealLead  = classification?.is_real_lead ?? true;
        const confidence  = classification?.confidence ?? 'medium';
        const score       = classification?.score ?? 0;
        const reasons     = classification?.reasons ?? [];

        if (!isRealLead) {
          console.log(`[auto-create-leads] Rejeté (score ${score}, confidence: ${confidence}): ${email.from_email}`);
          console.log(`[auto-create-leads] Raisons: ${reasons.join(', ')}`);
          rejected++;

          // Marquer l'email comme traité sans créer de lead
          await supabase
            .from('email_messages')
            .update({
              metadata: {
                ...(email.metadata || {}),
                classification_result: { is_real_lead: false, score, confidence, reasons },
                classified_at: new Date().toISOString(),
              }
            })
            .eq('id', email.id);

          continue;
        }

        console.log(`[auto-create-leads] Validé (score ${score}, confidence: ${confidence}): ${email.from_email}`);

        // 3. Upsert du lead
        const { firstName, lastName } = extractNameFromEmail(email.from_email, email.from_name);
        const phone = extractPhoneFromContent(email.body_text || '');

        const { data: upsertResult, error: upsertError } = await supabase
          .rpc('upsert_lead', {
            p_email:      email.from_email,
            p_first_name: firstName || 'Prospect',
            p_last_name:  lastName || 'Email',
            p_phone:      phone || '0000000000',
            p_city:       null,
            p_source:     'email_inbound',
            p_metadata: {
              first_email_id:      email.id,
              first_email_subject: email.subject,
              first_email_date:    email.received_at,
              auto_created:        true,
              created_from:        'auto-create-leads-from-emails',
              initial_message:     email.subject,
              phone_missing:       !phone,
              lead_confidence:     confidence,
              classification_score: score,
            }
          });

        if (upsertError) {
          console.error(`[auto-create-leads] Erreur upsert pour ${email.from_email}:`, upsertError);
          continue;
        }

        const leadId = upsertResult[0].lead_id;
        const isNew  = upsertResult[0].is_new;

        // 4. Mettre à jour le score de confiance sur le lead
        await supabase
          .from('crm_leads')
          .update({
            lead_confidence: confidence,
            spam_score: Math.max(0, -score),
          })
          .eq('id', leadId);

        if (isNew) {
          created++;
          console.log(`[auto-create-leads] Nouveau lead: ${firstName} ${lastName} (${email.from_email}) — ID: ${leadId}`);

          try {
            await supabase.from('crm_event_notifications').insert({
              lead_id:    leadId,
              event_type: 'new_lead',
              title:      'Nouveau contact par email',
              message:    `${firstName} ${lastName} a envoyé un email: "${email.subject}"`,
              priority:   1,
              read:       false,
            });
          } catch (notifError) {
            console.error('[auto-create-leads] Erreur notification:', notifError);
          }
        } else {
          linked++;
          console.log(`[auto-create-leads] Lead existant mis à jour: ${email.from_email} → ${leadId}`);
        }

        // 5. Lier l'email au lead
        await supabase
          .from('email_messages')
          .update({ lead_id: leadId })
          .eq('id', email.id);

        // 6. Créer une interaction CRM
        try {
          await supabase.from('crm_interactions').insert({
            lead_id:   leadId,
            type:      'email',
            direction: 'inbound',
            subject:   email.subject,
            content:   email.body_text?.substring(0, 5000),
            metadata: {
              email_id:    email.id,
              from:        email.from_email,
              received_at: email.received_at,
              confidence,
              score,
            }
          });
        } catch (interactionError) {
          console.error('[auto-create-leads] Erreur interaction:', interactionError);
        }

        results.push({
          email:      email.from_email,
          lead_id:    leadId,
          action:     isNew ? 'created' : 'linked',
          confidence,
          score,
        });

      } catch (emailError: any) {
        console.error(`[auto-create-leads] Erreur traitement ${email.from_email}:`, emailError?.message);
      }
    }

    const executionTime = Date.now() - startTime;
    const summary = {
      total_emails:  emails?.length || 0,
      leads_created: created,
      emails_linked: linked,
      rejected,
      skipped,
      execution_time_ms: executionTime,
      results: results.slice(0, 20),
    };

    console.log('[auto-create-leads] Résumé:', summary);

    return new Response(
      JSON.stringify({ success: true, message: `${created} leads créés, ${linked} emails liés, ${rejected} rejetés (non-leads)`, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("[auto-create-leads] Erreur fatale:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
