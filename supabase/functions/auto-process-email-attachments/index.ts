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
  { pattern: /carte.*grise|registration|immatriculation/i, type: 'carte_grise', confidence: 0.9 },
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

// Filtrer les images inutiles (logos, signatures, images marketing)
function shouldFilterAttachment(attachment: any): boolean {
  const filename = (attachment.filename || attachment.name || '').toLowerCase();
  const mimeType = (attachment.contentType || attachment.mime_type || '').toLowerCase();
  const size = attachment.size || 0;

  // Filtrer les images trop petites (probablement des logos/icônes)
  if (mimeType.startsWith('image/') && size < 50000) { // < 50KB
    console.log(`🚫 Image trop petite filtrée: ${filename} (${size} bytes)`);
    return true;
  }

  // Filtrer les logos et images marketing par nom de fichier
  const unwantedPatterns = [
    /logo/i,
    /icon/i,
    /signature/i,
    /banner/i,
    /header/i,
    /footer/i,
    /background/i,
    /spacer/i,
    /pixel/i,
    /tracking/i,
    /badge/i,
    /award/i,
    /seal/i,
    /stamp/i,
    /watermark/i,
    /thumbnail/i,
    /avatar/i,
    /social/i,
    /facebook|twitter|linkedin|instagram/i,
    /\.(gif)$/i, // Souvent utilisés pour tracking/décoration
  ];

  for (const pattern of unwantedPatterns) {
    if (pattern.test(filename)) {
      console.log(`🚫 Image marketing/logo filtrée: ${filename}`);
      return true;
    }
  }

  // Accepter les PDFs et documents Office sans restriction
  if (mimeType.includes('pdf') ||
      mimeType.includes('word') ||
      mimeType.includes('document') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('officedocument')) {
    return false;
  }

  // Accepter les images qui ressemblent à des scans/photos de documents
  const documentImagePatterns = [
    /scan/i,
    /photo/i,
    /img_\d+/i, // IMG_1234.jpg (photos de téléphone)
    /\d{8}_\d{6}/i, // 20240127_143000.jpg (format téléphone)
    /whatsapp/i, // Photos WhatsApp
    /screenshot|capture/i,
    /permis|carte|rib|kbis|identite|justif/i, // Documents spécifiques
  ];

  for (const pattern of documentImagePatterns) {
    if (pattern.test(filename)) {
      return false; // Ne pas filtrer
    }
  }

  // Filtrer les images sans indication claire qu'elles sont des documents
  if (mimeType.startsWith('image/') &&
      !filename.match(/\d{4,}/) && // Pas de numéro long (comme date/timestamp)
      size < 500000) { // < 500KB
    console.log(`🚫 Image générique filtrée: ${filename} (taille: ${size} bytes)`);
    return true;
  }

  return false; // Par défaut, accepter
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 50000; // 50 secondes max
    console.log('🔄 Traitement automatique des pièces jointes...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Limiter à 20 emails pour éviter les timeouts
    const { data: emails, error: fetchError } = await supabase
      .from('email_messages')
      .select('*')
      .not('attachments', 'is', null)
      .neq('attachments', '[]')
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📧 ${emails?.length || 0} emails avec pièces jointes à traiter`);

    let processed = 0;
    let errors = 0;
    let timedOut = false;
    const results: any[] = [];

    for (const email of emails || []) {
      // Vérifier le timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log('⏱️ Timeout atteint, arrêt du traitement');
        timedOut = true;
        break;
      }

      try {
        // Essayer de trouver le lead correspondant par email
        let leadId = email.lead_id;

        if (!leadId) {
          const { data: lead } = await supabase
            .from('crm_leads')
            .select('id')
            .eq('email', email.from_email)
            .maybeSingle();

          if (lead) {
            leadId = lead.id;

            // Lier l'email au lead
            await supabase
              .from('email_messages')
              .update({ lead_id: leadId })
              .eq('id', email.id);
          }
        }

        if (!leadId) {
          console.log(`⚠️ Pas de lead trouvé pour ${email.from_email}`);
          continue;
        }

        // Parser les pièces jointes
        const attachments = typeof email.attachments === 'string'
          ? JSON.parse(email.attachments)
          : email.attachments;

        if (!Array.isArray(attachments) || attachments.length === 0) {
          continue;
        }

        console.log(`📎 ${attachments.length} pièce(s) jointe(s) pour lead ${leadId}`);

        for (const attachment of attachments) {
          try {
            // Filtrer les images inutiles (logos, images marketing, etc.)
            if (shouldFilterAttachment(attachment)) {
              console.log(`⏭️ Pièce jointe filtrée (image inutile)`);
              continue;
            }

            const filename = attachment.filename || attachment.name || 'document';
            const classification = classifyDocument(filename);

            // Vérifier si le document a déjà été créé
            const { data: existingDoc } = await supabase
              .from('crm_lead_documents')
              .select('id')
              .eq('lead_id', leadId)
              .eq('file_name', filename)
              .maybeSingle();

            if (existingDoc) {
              console.log(`⏭️ Document déjà traité: ${filename}`);
              continue;
            }

            // Créer le document dans prospect_documents
            const { data: doc, error: docError } = await supabase
              .from('prospect_documents')
              .insert({
                lead_id: leadId,
                document_type: classification.type,
                file_name: filename,
                file_path: attachment.path || null,
                file_size: attachment.size || 0,
                mime_type: attachment.contentType || attachment.mime_type || 'application/octet-stream',
                status: 'pending',
                metadata: {
                  email_id: email.id,
                  email_subject: email.subject,
                  auto_classified: true,
                  confidence: classification.confidence,
                  processed_at: new Date().toISOString(),
                  download_url: attachment.url
                }
              })
              .select()
              .single();

            if (docError) {
              console.error(`❌ Erreur création document ${filename}:`, docError);
              console.error('Détails:', JSON.stringify(docError, null, 2));
              errors++;
              continue;
            }

            // Créer aussi dans crm_lead_documents
            await supabase.from('crm_lead_documents').insert({
              lead_id: leadId,
              document_type: classification.type,
              file_name: filename,
              file_path: attachment.path || null,
              file_size: attachment.size || 0,
              mime_type: attachment.contentType || attachment.mime_type || 'application/octet-stream',
              uploaded_at: new Date().toISOString(),
              status: 'pending',
              metadata: {
                email_id: email.id,
                prospect_document_id: doc.id,
                auto_classified: true,
                classification_confidence: classification.confidence,
                download_url: attachment.url
              }
            });

            // Enregistrer dans email_attachments
            await supabase.from('email_attachments').insert({
              email_message_id: email.id,
              filename: filename,
              content_type: attachment.contentType || attachment.mime_type || 'application/octet-stream',
              file_size: attachment.size || 0,
              storage_path: attachment.path || null,
              proposed_doc_type: classification.type,
              classification_confidence: classification.confidence,
              classification_method: 'auto',
              status: 'pending_validation'
            });

            console.log(`✅ Document créé: ${filename} -> ${classification.type}`);
            processed++;

            results.push({
              email_id: email.id,
              lead_id: leadId,
              filename,
              document_type: classification.type,
              confidence: classification.confidence
            });

          } catch (attachError) {
            console.error(`❌ Erreur traitement pièce jointe:`, attachError);
            errors++;
          }
        }

        // Créer notification si documents ajoutés
        if (results.filter(r => r.lead_id === leadId).length > 0) {
          await supabase.from('crm_event_notifications').insert({
            lead_id: leadId,
            event_type: 'documents_received',
            title: 'Nouveaux documents reçus par email',
            message: `${results.filter(r => r.lead_id === leadId).length} document(s) automatiquement importé(s)`,
            priority: 'medium',
            read: false
          });
        }

      } catch (emailError) {
        console.error(`❌ Erreur traitement email ${email.id}:`, emailError);
        errors++;
      }
    }

    const executionTime = Date.now() - startTime;
    const summary = {
      total_emails: emails?.length || 0,
      documents_processed: processed,
      errors,
      execution_time_ms: executionTime,
      results: results.slice(0, 20)
    };

    console.log('📊 Résumé:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Traitement des pièces jointes terminé',
        summary
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("❌ Erreur:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
