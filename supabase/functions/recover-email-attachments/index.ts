import { createClient } from 'npm:@supabase/supabase-js@2';
import Imap from 'npm:imap@0.8.19';
import { simpleParser } from 'npm:mailparser@3.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function fetchEmailByMessageId(
  host: string, port: number, user: string, password: string,
  messageId: string
): Promise<any | null> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (imap) imap.end();
      reject(new Error('IMAP timeout'));
    }, 30000);

    const imap = new Imap({
      user, password, host, port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 10000,
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err: any) => {
        if (err) { clearTimeout(timeoutId); imap.end(); return reject(err); }

        imap.search([['HEADER', 'Message-ID', messageId]], (searchErr: any, results: any) => {
          if (searchErr || !results || results.length === 0) {
            clearTimeout(timeoutId);
            imap.end();
            return resolve(null);
          }

          const f = imap.fetch(results.slice(0, 1), { bodies: '' });
          f.on('message', (msg: any) => {
            let buffer = '';
            msg.on('body', (stream: any) => {
              stream.on('data', (chunk: any) => { buffer += chunk.toString('utf8'); });
              stream.on('end', async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  clearTimeout(timeoutId);
                  imap.end();
                  resolve(parsed);
                } catch (e) {
                  clearTimeout(timeoutId);
                  imap.end();
                  resolve(null);
                }
              });
            });
          });
          f.once('error', () => { clearTimeout(timeoutId); imap.end(); resolve(null); });
          f.once('end', () => {});
        });
      });
    });

    imap.once('error', (err: any) => { clearTimeout(timeoutId); reject(err); });
    imap.connect();
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const imapHost = Deno.env.get('IONOS_IMAP_HOST') || 'imap.ionos.fr';
    const imapPort = parseInt(Deno.env.get('IONOS_IMAP_PORT') || '993');
    const imapUser = Deno.env.get('IONOS_EMAIL_USER') || Deno.env.get('IONOS_SMTP_USER') || '';
    const imapPassword = Deno.env.get('IONOS_EMAIL_PASSWORD') || Deno.env.get('IONOS_SMTP_PASSWORD') || '';

    if (!imapUser || !imapPassword) {
      throw new Error('IMAP credentials not configured');
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 3;

    // Get orphan documents that have email_ref/ paths
    const { data: orphanDocs } = await supabase
      .from('crm_lead_documents')
      .select('id, file_path, lead_id, file_name')
      .like('file_path', 'email_ref/%')
      .limit(batchSize);

    if (!orphanDocs || orphanDocs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No orphan documents to recover', recovered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by email_message_id
    const emailGroups = new Map<string, typeof orphanDocs>();
    for (const doc of orphanDocs) {
      const emailId = doc.file_path.split('/')[1];
      if (!emailGroups.has(emailId)) emailGroups.set(emailId, []);
      emailGroups.get(emailId)!.push(doc);
    }

    let recovered = 0;
    let failed = 0;
    const details: any[] = [];

    for (const [emailMsgId, docs] of emailGroups) {
      try {
        // Get the original message-id header from email_messages
        const { data: emailMsg } = await supabase
          .from('email_messages')
          .select('message_id, subject, from_email, attachments')
          .eq('id', emailMsgId)
          .maybeSingle();

        if (!emailMsg?.message_id) {
          // Can't find original email, try to extract from JSONB attachments
          if (emailMsg?.attachments && Array.isArray(emailMsg.attachments)) {
            // We have attachment metadata but no file content - mark as unrecoverable
            for (const doc of docs) {
              details.push({ id: doc.id, file_name: doc.file_name, status: 'no_message_id' });
            }
          }
          failed += docs.length;
          continue;
        }

        // Fetch email from IMAP
        const parsed = await fetchEmailByMessageId(imapHost, imapPort, imapUser, imapPassword, emailMsg.message_id);

        if (!parsed || !parsed.attachments || parsed.attachments.length === 0) {
          failed += docs.length;
          for (const doc of docs) {
            details.push({ id: doc.id, file_name: doc.file_name, status: 'not_found_in_imap' });
          }
          continue;
        }

        // Upload each attachment found
        for (const doc of docs) {
          const originalFilename = doc.file_path.split('/').pop() || doc.file_name;

          // Find matching attachment by filename
          const matchingAtt = parsed.attachments.find((a: any) => {
            const attName = a.filename || '';
            return attName === originalFilename ||
                   attName.replace(/[^a-zA-Z0-9._-]/g, '_') === originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
          }) || parsed.attachments[0]; // fallback to first if only one

          if (!matchingAtt || !matchingAtt.content) {
            failed++;
            details.push({ id: doc.id, file_name: doc.file_name, status: 'no_content' });
            continue;
          }

          const safeFilename = (matchingAtt.filename || 'document.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `00000000-0000-0000-0000-000000000001/${emailMsgId}/${Date.now()}_${safeFilename}`;
          const binaryData = matchingAtt.content instanceof Uint8Array
            ? matchingAtt.content
            : new Uint8Array(matchingAtt.content);

          const { error: uploadError } = await supabase.storage
            .from('email-attachments')
            .upload(storagePath, binaryData, {
              contentType: matchingAtt.contentType || 'application/octet-stream',
              upsert: false
            });

          if (uploadError) {
            failed++;
            details.push({ id: doc.id, file_name: doc.file_name, status: 'upload_error', error: uploadError.message });
            continue;
          }

          // Update crm_lead_documents with correct path
          await supabase
            .from('crm_lead_documents')
            .update({
              file_path: storagePath,
              file_url: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', doc.id);

          // Also create email_attachments record
          await supabase.from('email_attachments').insert({
            email_message_id: emailMsgId,
            filename: matchingAtt.filename || safeFilename,
            content_type: matchingAtt.contentType || 'application/octet-stream',
            file_size: binaryData.byteLength,
            storage_path: storagePath,
            status: 'processed',
          });

          recovered++;
          details.push({ id: doc.id, file_name: doc.file_name, status: 'recovered', path: storagePath });
        }
      } catch (err) {
        failed += docs.length;
        for (const doc of docs) {
          details.push({ id: doc.id, file_name: doc.file_name, status: 'error', error: err.message });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, recovered, failed, total: orphanDocs.length, details }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
