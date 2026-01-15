import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  data: Uint8Array;
}

interface EmailMessage {
  uid: string;
  from: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
  headers: Record<string, string>;
  attachments: EmailAttachment[];
}

async function connectIMAP() {
  const imapConfig = {
    host: Deno.env.get('IONOS_IMAP_HOST') || 'imap.ionos.com',
    port: parseInt(Deno.env.get('IONOS_IMAP_PORT') || '993'),
    secure: true,
    auth: {
      user: Deno.env.get('IONOS_IMAP_USER') || '',
      pass: Deno.env.get('IONOS_IMAP_PASSWORD') || '',
    },
  };

  return imapConfig;
}

function classifyDocument(filename: string): { type: string; confidence: number } {
  const lower = filename.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const patterns = [
    { regex: /rib|iban|bank|compte/i, type: 'RIB', confidence: 0.9 },
    { regex: /permis|driving|license|conduire/i, type: 'permis_conduire', confidence: 0.85 },
    { regex: /carte.*grise|registration|immatriculation/i, type: 'carte_grise', confidence: 0.9 },
    { regex: /releve.*info|assurance.*info/i, type: 'releve_information', confidence: 0.8 },
    { regex: /kbis|sirene|siret|extrait/i, type: 'kbis', confidence: 0.95 },
    { regex: /licence|carte.*pro|professional/i, type: 'carte_professionnelle', confidence: 0.9 },
    { regex: /identite|cni|passport|passeport/i, type: 'piece_identite', confidence: 0.85 },
    { regex: /justif.*dom|facture.*elec|facture.*eau|quittance/i, type: 'justificatif_domicile', confidence: 0.8 },
    { regex: /attestation/i, type: 'attestation', confidence: 0.7 },
    { regex: /contrat/i, type: 'contrat', confidence: 0.75 },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(lower)) {
      return { type: pattern.type, confidence: pattern.confidence };
    }
  }

  return { type: 'autre', confidence: 0.3 };
}

async function fetchEmails(): Promise<EmailMessage[]> {
  // Simulation pour l'instant - à remplacer par vraie connexion IMAP
  // Utiliser npm:imap ou npm:emailjs-imap-client

  console.log('IMAP connection would be established here');

  // Pour l'instant, retourner un tableau vide
  // Dans la vraie implémentation, on ferait :
  // 1. Se connecter à IMAP
  // 2. Sélectionner INBOX
  // 3. Chercher messages non traités
  // 4. Parser chaque message
  // 5. Extraire attachments

  return [];
}

async function processEmail(
  supabase: any,
  email: EmailMessage
): Promise<void> {
  try {
    // Vérifier si déjà traité
    const { data: existing } = await supabase
      .from('email_messages')
      .select('id')
      .eq('imap_uid', email.uid)
      .single();

    if (existing) {
      console.log(`Email ${email.uid} already processed`);
      return;
    }

    // Insérer le message
    const { data: messageData, error: messageError } = await supabase
      .from('email_messages')
      .insert({
        imap_uid: email.uid,
        from_email: email.from,
        to_email: email.to,
        subject: email.subject,
        body_text: email.bodyText,
        body_html: email.bodyHtml,
        received_at: email.receivedAt.toISOString(),
        raw_headers: email.headers,
        status: 'pending',
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // Traiter les pièces jointes
    for (const attachment of email.attachments) {
      // Upload vers Supabase Storage
      const fileName = `${messageData.id}/${attachment.filename}`;
      const { error: uploadError } = await supabase.storage
        .from('email-attachments')
        .upload(fileName, attachment.data, {
          contentType: attachment.contentType,
          upsert: false,
        });

      if (uploadError) {
        console.error(`Failed to upload ${attachment.filename}:`, uploadError);
        continue;
      }

      // Classifier le document
      const classification = classifyDocument(attachment.filename);

      // Insérer dans email_attachments
      const { error: attachmentError } = await supabase
        .from('email_attachments')
        .insert({
          email_message_id: messageData.id,
          filename: attachment.filename,
          content_type: attachment.contentType,
          file_size: attachment.size,
          storage_path: fileName,
          proposed_doc_type: classification.type,
          classification_confidence: classification.confidence,
          classification_method: 'filename',
          status: 'unclassified',
        });

      if (attachmentError) {
        console.error(`Failed to insert attachment ${attachment.filename}:`, attachmentError);
      }

      // Enregistrer la classification
      await supabase
        .from('attachment_classifications')
        .insert({
          attachment_id: (await supabase
            .from('email_attachments')
            .select('id')
            .eq('email_message_id', messageData.id)
            .eq('filename', attachment.filename)
            .single()).data?.id,
          doc_type: classification.type,
          confidence: classification.confidence,
          method: 'filename',
          keywords: { filename: attachment.filename },
        });
    }

    // Marquer comme traité
    await supabase
      .from('email_messages')
      .update({ status: 'processed' })
      .eq('id', messageData.id);

    console.log(`Successfully processed email ${email.uid} with ${email.attachments.length} attachments`);
  } catch (error) {
    console.error(`Error processing email ${email.uid}:`, error);

    // Marquer comme failed
    await supabase
      .from('email_messages')
      .update({
        status: 'failed',
        processing_error: error.message
      })
      .eq('imap_uid', email.uid);
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting IMAP sync...');

    // Se connecter à IMAP
    await connectIMAP();

    // Récupérer les emails
    const emails = await fetchEmails();

    console.log(`Found ${emails.length} emails to process`);

    // Traiter chaque email
    for (const email of emails) {
      await processEmail(supabase, email);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: emails.length,
        message: `Successfully processed ${emails.length} emails`,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('IMAP sync error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
