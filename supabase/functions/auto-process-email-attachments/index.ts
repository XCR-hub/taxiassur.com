import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DocumentTypeMapping {
  pattern: RegExp;
  type: string;
  confidence: number;
}

const DOC_PATTERNS: DocumentTypeMapping[] = [
  { pattern: /permis.*conduire|driving.*license|permis/i, type: 'permis_conduire', confidence: 0.85 },
  { pattern: /carte.*grise|registration|immatriculation|certificat.*temporaire/i, type: 'carte_grise', confidence: 0.9 },
  { pattern: /rib|iban|bank.*details?/i, type: 'rib', confidence: 0.9 },
  { pattern: /releve.*info|insurance.*history/i, type: 'releve_information', confidence: 0.8 },
  { pattern: /kbis|sirene|siret/i, type: 'kbis', confidence: 0.95 },
  { pattern: /carte.*pro|professional.*card|licence.*taxi/i, type: 'carte_professionnelle', confidence: 0.9 },
  { pattern: /identite|cni|id.*card|passport|passeport/i, type: 'piece_identite', confidence: 0.85 },
  { pattern: /justif.*domicile|proof.*address|facture/i, type: 'justificatif_domicile', confidence: 0.8 },
  { pattern: /autorisation.*stationnement|parking/i, type: 'autorisation_stationnement', confidence: 0.85 },
];

function classifyDocument(filename: string): { type: string; confidence: number } {
  const normalized = filename.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const pattern of DOC_PATTERNS) {
    if (pattern.pattern.test(normalized)) {
      return { type: pattern.type, confidence: pattern.confidence };
    }
  }
  return { type: 'autre', confidence: 0.3 };
}

function shouldFilterAttachment(filename: string, mimeType: string, size: number): boolean {
  const fn = filename.toLowerCase();
  const mt = mimeType.toLowerCase();

  if (mt.startsWith('image/') && size > 0 && size < 50000) return true;

  const unwanted = [
    /logo/i, /icon/i, /signature/i, /banner/i, /header/i, /footer/i,
    /background/i, /spacer/i, /pixel/i, /tracking/i, /badge/i, /award/i,
    /seal/i, /stamp/i, /watermark/i, /thumbnail/i, /avatar/i, /social/i,
    /facebook|twitter|linkedin|instagram/i, /\.(gif)$/i,
  ];
  for (const p of unwanted) if (p.test(fn)) return true;

  if (mt.includes('pdf') || mt.includes('word') || mt.includes('document') ||
      mt.includes('spreadsheet') || mt.includes('officedocument')) return false;

  const docImg = [/scan/i, /photo/i, /img_\d+/i, /\d{8}_\d{6}/i, /whatsapp/i,
    /screenshot|capture/i, /permis|carte|rib|kbis|identite|justif|certificat/i];
  for (const p of docImg) if (p.test(fn)) return false;

  if (mt.startsWith('image/') && !fn.match(/\d{4,}/) && size > 0 && size < 500000) return true;
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 50000;
    console.log('Traitement automatique des pièces jointes (lecture email_attachments)...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // On lit les pièces jointes déjà persistées (storage_path garanti NOT NULL)
    // et on les lie aux leads via l'email parent.
    const { data: attachments, error: fetchError } = await supabase
      .from('email_attachments')
      .select('id, email_message_id, filename, content_type, file_size, storage_path, proposed_doc_type, classification_confidence, status, assigned_document_id')
      .is('assigned_document_id', null)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) throw fetchError;

    console.log(`${attachments?.length || 0} pièces jointes non traitées`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    let timedOut = false;
    const results: Array<Record<string, unknown>> = [];
    const leadDocCounts = new Map<string, number>();

    for (const att of attachments || []) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        timedOut = true;
        break;
      }

      try {
        if (!att.storage_path) { skipped++; continue; }
        if (shouldFilterAttachment(att.filename, att.content_type, att.file_size)) {
          await supabase.from('email_attachments')
            .update({ status: 'rejected' })
            .eq('id', att.id);
          skipped++;
          continue;
        }

        // Récupérer l'email parent pour résoudre le lead
        const { data: email } = await supabase
          .from('email_messages')
          .select('id, lead_id, from_email, subject')
          .eq('id', att.email_message_id)
          .maybeSingle();

        if (!email) { skipped++; continue; }

        let leadId = email.lead_id;
        if (!leadId && email.from_email) {
          const { data: lead } = await supabase
            .from('crm_leads')
            .select('id')
            .eq('email', email.from_email)
            .maybeSingle();
          if (lead) {
            leadId = lead.id;
            await supabase.from('email_messages')
              .update({ lead_id: leadId, auto_matched: true })
              .eq('id', email.id);
          }
        }

        if (!leadId) { skipped++; continue; }

        const classification = att.proposed_doc_type
          ? { type: att.proposed_doc_type, confidence: Number(att.classification_confidence) || 0.7 }
          : classifyDocument(att.filename);

        // Dédup : ne pas recréer un doc si même fichier + même lead déjà lié
        const { data: existingDoc } = await supabase
          .from('crm_lead_documents')
          .select('id')
          .eq('lead_id', leadId)
          .eq('file_name', att.filename)
          .maybeSingle();

        if (existingDoc) {
          await supabase.from('email_attachments')
            .update({ assigned_document_id: existingDoc.id, status: 'assigned' })
            .eq('id', att.id);
          skipped++;
          continue;
        }

        // Insert prospect_documents avec le VRAI storage_path
        const { data: prospectDoc, error: pdErr } = await supabase
          .from('prospect_documents')
          .insert({
            lead_id: leadId,
            document_type: classification.type,
            file_name: att.filename,
            file_path: att.storage_path,
            file_size: att.file_size,
            mime_type: att.content_type,
            status: 'pending',
            metadata: {
              email_id: email.id,
              email_subject: email.subject,
              auto_classified: true,
              confidence: classification.confidence,
              processed_at: new Date().toISOString(),
              source_bucket: 'email-attachments',
              email_attachment_id: att.id,
            }
          })
          .select()
          .single();

        if (pdErr) {
          console.error('prospect_documents insert error:', pdErr);
          errors++;
          continue;
        }

        // Insert crm_lead_documents avec le VRAI storage_path
        const { data: crmDoc, error: cdErr } = await supabase
          .from('crm_lead_documents')
          .insert({
            lead_id: leadId,
            document_type: classification.type,
            file_name: att.filename,
            file_path: att.storage_path,
            file_size: att.file_size,
            mime_type: att.content_type,
            uploaded_at: new Date().toISOString(),
            status: 'pending',
            metadata: {
              email_id: email.id,
              prospect_document_id: prospectDoc.id,
              auto_classified: true,
              classification_confidence: classification.confidence,
              source_bucket: 'email-attachments',
              email_attachment_id: att.id,
            }
          })
          .select()
          .single();

        if (cdErr) {
          console.error('crm_lead_documents insert error:', cdErr);
          // prospect_documents existe déjà, on lie quand même
        }

        await supabase.from('email_attachments')
          .update({
            assigned_document_id: crmDoc?.id || prospectDoc.id,
            status: 'assigned',
            proposed_doc_type: classification.type,
            classification_confidence: classification.confidence,
            classification_method: att.classification_method || 'auto',
          })
          .eq('id', att.id);

        processed++;
        leadDocCounts.set(leadId, (leadDocCounts.get(leadId) || 0) + 1);
        results.push({
          email_id: email.id,
          lead_id: leadId,
          filename: att.filename,
          document_type: classification.type,
          storage_path: att.storage_path,
        });

      } catch (e: any) {
        console.error('attachment error:', e?.message || e);
        errors++;
      }
    }

    // Notifications par lead
    for (const [leadId, count] of leadDocCounts) {
      try {
        await supabase.from('crm_event_notifications').insert({
          lead_id: leadId,
          event_type: 'documents_received',
          title: 'Nouveaux documents reçus par email',
          message: `${count} document(s) automatiquement importé(s)`,
          priority: 'medium',
          read: false,
        });
      } catch {}
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Traitement terminé',
      summary: {
        total_attachments: attachments?.length || 0,
        documents_processed: processed,
        skipped,
        errors,
        timed_out: timedOut,
        execution_time_ms: Date.now() - startTime,
        results: results.slice(0, 20),
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

  } catch (error: any) {
    console.error('fatal:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
