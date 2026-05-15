import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: string;
}

interface ProcessEmailPayload {
  email_id: string;
  attachments: EmailAttachment[];
}

function detectDocType(filename: string): { type: string | null; confidence: number | null } {
  const lower = filename.toLowerCase();
  if (lower.includes('carte') && lower.includes('grise')) return { type: 'carte_grise', confidence: 0.85 };
  if (lower.includes('permis') || lower.includes('conduire')) return { type: 'permis_conduire', confidence: 0.8 };
  if (lower.includes('identite') || lower.includes('cni') || lower.includes('passeport')) return { type: 'piece_identite', confidence: 0.7 };
  if (lower.includes('releve') || lower.includes('information') || lower.includes('sinistre')) return { type: 'releve_information', confidence: 0.65 };
  if (lower.includes('licence') || lower.includes('taxi')) return { type: 'licence_taxi', confidence: 0.75 };
  if (lower.includes('autorisation') || lower.includes('stationnement')) return { type: 'autorisation_stationnement', confidence: 0.7 };
  if (lower.includes('rib') || lower.includes('bank') || lower.includes('iban')) return { type: 'rib', confidence: 0.8 };
  if (lower.includes('kbis') || lower.includes('inpi') || lower.includes('siret')) return { type: 'kbis', confidence: 0.75 };
  if (lower.includes('carte') && lower.includes('pro')) return { type: 'carte_professionnelle', confidence: 0.75 };
  return { type: null, confidence: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: ProcessEmailPayload = await req.json();
    const { email_id, attachments } = payload;

    const { data: emailData, error: emailError } = await supabase
      .from('email_messages')
      .select('lead_id, from_email, subject')
      .eq('id', email_id)
      .single();

    if (emailError || !emailData) {
      throw new Error('Email not found');
    }

    const results = [];

    for (const attachment of attachments) {
      try {
        const binaryData = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0));
        const safeFilename = (attachment.filename || 'document.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `00000000-0000-0000-0000-000000000001/${email_id}/${Date.now()}_${safeFilename}`;

        const { error: uploadError } = await supabase.storage
          .from('email-attachments')
          .upload(storagePath, binaryData, {
            contentType: attachment.contentType || 'application/octet-stream',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          results.push({ success: false, filename: attachment.filename, error: uploadError.message });
          continue;
        }

        const { type: proposedType, confidence } = detectDocType(attachment.filename);

        const { data: attachmentData, error: insertError } = await supabase
          .from('email_attachments')
          .insert({
            email_message_id: email_id,
            filename: attachment.filename,
            content_type: attachment.contentType || 'application/octet-stream',
            file_size: binaryData.byteLength || attachment.size || 0,
            storage_path: storagePath,
            proposed_doc_type: proposedType,
            classification_confidence: confidence,
            status: 'pending',
          })
          .select('id')
          .maybeSingle();

        if (insertError) {
          console.error('Insert error:', insertError);
          results.push({ success: false, filename: attachment.filename, error: insertError.message });
          continue;
        }

        results.push({
          success: true,
          filename: attachment.filename,
          attachment_id: attachmentData?.id,
          proposed_doc_type: proposedType,
        });

      } catch (err) {
        console.error(`Error processing attachment ${attachment.filename}:`, err);
        results.push({ success: false, filename: attachment.filename, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing email attachments:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
