import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Domaines et patterns à ignorer immédiatement (avant appel DB)
const LOCAL_BLACKLIST_DOMAINS = new Set([
  'taxiassur.com', 'hunter.io', 'snov.io', 'apollo.io', 'lusha.com',
  'zoominfo.com', 'clearbit.com', 'rocketreach.co', 'neverbounce.com',
  'zerobounce.net', 'debounce.io', 'kickbox.com', 'verifalia.com',
  'mailinator.com', 'guerrillamail.com', 'yopmail.com', 'yopmail.fr',
  '10minutemail.com', 'temp-mail.org', 'trashmail.com', 'trashmail.me',
  'throwaway.email', 'fakeinbox.com', 'maildrop.cc', 'sharklasers.com',
  'dispostable.com', 'tempmail.com', 'spamgourmet.com',
  'instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com',
  'tiktok.com', 'pinterest.com', 'youtube.com', 'google.com',
  'mailchimp.com', 'sendgrid.net', 'brevo.com', 'sendinblue.com',
  'hubspot.com', 'salesforce.com', 'phantombuster.com', 'scrapingbee.com',
  'ionos.com', 'ionos.fr', '1and1.com',
]);

const LOCAL_BLACKLIST_PATTERNS = [
  'noreply', 'no-reply', 'donotreply', 'mailer-daemon', 'postmaster',
  'mailer@', 'notification@', 'notifications@', 'bounce', 'daemon',
  'automated', 'auto-confirm', 'autoconfirm', 'system@', 'robot@',
  'bot@', 'crawler@', 'abuse@', 'alert@', 'alerts@', 'webmaster@',
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
      lastName: parts.slice(1).join(' ').charAt(0).toUpperCase() + parts.slice(1).join(' ').slice(1).toLowerCase(),
    };
  }

  return {
    firstName: cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase(),
    lastName: '',
  };
}

function extractPhoneFromContent(content: string): string | null {
  const phonePatterns = [
    /(?:^|\s)(\+?33|0)[1-9](?:[\s.-]?\d{2}){4}(?:\s|$)/g,
    /(?:^|\s)(0[1-9]\d{8})(?:\s|$)/g,
  ];
  for (const pattern of phonePatterns) {
    const matches = content.match(pattern);
    if (matches) return matches[0].trim().replace(/[\s.-]/g, '');
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

    // Emails inbound sans lead_id, pas des emails de formulaire (ceux-ci sont traités par parse-form-emails)
    const { data: emails, error: fetchError } = await supabase
      .from('email_messages')
      .select('*')
      .is('lead_id', null)
      .eq('direction', 'inbound')
      .not('from_email', 'ilike', '%taxiassur.com%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) throw fetchError;

    console.log(`[auto-create-leads] ${emails?.length || 0} emails à analyser`);

    let created = 0;
    let linked = 0;
    let skipped = 0;
    let rejected = 0;
    const results: any[] = [];

    for (const email of emails || []) {
      try {
        // 1. Pré-filtrage local rapide
        if (isLocallyBlacklisted(email.from_email)) {
          skipped++;
          await markEmailProcessed(supabase, email.id, email.metadata, { action: 'blacklisted' });
          continue;
        }

        // 2. Classification intelligente via DB
        const { data: classification, error: classifError } = await supabase
          .rpc('classify_email_lead', {
            p_email:      email.from_email,
            p_subject:    email.subject || null,
            p_body:       (email.body_text || '').substring(0, 2000),
            p_from_name:  email.from_name || null,
            p_has_attach: !!(email.attachments && email.attachments.length > 0),
          });

        if (classifError) {
          console.error(`[auto-create-leads] Erreur classification ${email.from_email}:`, classifError);
          skipped++;
          continue;
        }

        const action     = classification?.action ?? 'skip';
        const isRealLead = classification?.is_real_lead ?? false;
        const confidence = classification?.confidence ?? 'low';
        const score      = classification?.score ?? 0;
        const reasons    = classification?.reasons ?? [];

        console.log(`[auto-create-leads] ${email.from_email} → score=${score} confidence=${confidence} action=${action}`);

        // -------------------------------------------------------
        // CAS 1 : HIGH confidence (score >= 50) → créer un lead
        // -------------------------------------------------------
        if (isRealLead && action === 'create_lead') {
          const { firstName, lastName } = extractNameFromEmail(email.from_email, email.from_name);
          const phone = extractPhoneFromContent(email.body_text || '');

          const { data: upsertResult, error: upsertError } = await supabase
            .rpc('upsert_lead', {
              p_email:      email.from_email,
              p_first_name: firstName || 'Prospect',
              p_last_name:  lastName || '',
              p_phone:      phone || '0000000000',
              p_city:       null,
              p_source:     'email_inbound',
              p_metadata: {
                first_email_id:       email.id,
                first_email_subject:  email.subject,
                first_email_date:     email.received_at,
                auto_created:         true,
                created_from:         'auto-create-leads-from-emails',
                initial_message:      email.subject,
                phone_missing:        !phone,
                lead_confidence:      confidence,
                classification_score: score,
              },
            });

          if (upsertError) {
            console.error(`[auto-create-leads] Erreur upsert ${email.from_email}:`, upsertError);
            continue;
          }

          const leadId = upsertResult[0].lead_id;
          const isNew  = upsertResult[0].is_new;

          await supabase.from('crm_leads')
            .update({ lead_confidence: confidence, spam_score: 0 })
            .eq('id', leadId);

          if (isNew) {
            created++;
            console.log(`[auto-create-leads] NOUVEAU LEAD HIGH: ${firstName} ${lastName} (${email.from_email})`);
            await supabase.from('crm_event_notifications').insert({
              lead_id:    leadId,
              event_type: 'new_lead',
              title:      'Nouveau contact par email',
              message:    `${firstName} ${lastName} a envoyé un email: "${email.subject}"`,
              priority:   1,
              read:       false,
            }).catch(() => {});
          } else {
            linked++;
          }

          await linkEmailToLead(supabase, email, leadId, confidence, score);
          results.push({ email: email.from_email, lead_id: leadId, action: isNew ? 'created' : 'linked', confidence, score });

        // -------------------------------------------------------
        // CAS 2 : MEDIUM confidence (10-49) → lier seulement si le lead EXISTE DÉJÀ
        // -------------------------------------------------------
        } else if (action === 'link_existing_only') {
          const { data: existingLead } = await supabase
            .from('crm_leads')
            .select('id')
            .ilike('email', email.from_email)
            .maybeSingle();

          if (existingLead) {
            linked++;
            console.log(`[auto-create-leads] MEDIUM: lié au lead existant ${existingLead.id}`);
            await linkEmailToLead(supabase, email, existingLead.id, confidence, score);
            results.push({ email: email.from_email, lead_id: existingLead.id, action: 'linked_existing', confidence, score });
          } else {
            // Pas de lead existant + confiance insuffisante → on ne crée rien
            skipped++;
            console.log(`[auto-create-leads] MEDIUM ignoré (pas de lead existant): ${email.from_email}`);
            await markEmailProcessed(supabase, email.id, email.metadata, { action: 'medium_no_existing', score, confidence, reasons });
          }

        // -------------------------------------------------------
        // CAS 3 : LOW / REJECTED → ignorer
        // -------------------------------------------------------
        } else {
          rejected++;
          console.log(`[auto-create-leads] IGNORÉ (${confidence}, score=${score}): ${email.from_email}`);
          await markEmailProcessed(supabase, email.id, email.metadata, { action: 'rejected', score, confidence, reasons });
        }

      } catch (emailError: any) {
        console.error(`[auto-create-leads] Erreur ${email.from_email}:`, emailError?.message);
      }
    }

    const summary = {
      total_emails:  emails?.length || 0,
      leads_created: created,
      emails_linked: linked,
      rejected,
      skipped,
      execution_time_ms: Date.now() - startTime,
      results: results.slice(0, 20),
    };

    console.log('[auto-create-leads] Résumé:', summary);

    return new Response(
      JSON.stringify({ success: true, summary }),
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

async function linkEmailToLead(supabase: any, email: any, leadId: string, confidence: string, score: number) {
  await supabase.from('email_messages')
    .update({ lead_id: leadId })
    .eq('id', email.id);

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
    },
  }).catch(() => {});
}

async function markEmailProcessed(supabase: any, emailId: string, currentMetadata: any, classificationResult: any) {
  await supabase.from('email_messages').update({
    metadata: {
      ...(currentMetadata || {}),
      classification_result: classificationResult,
      classified_at: new Date().toISOString(),
    },
  }).eq('id', emailId);
}
