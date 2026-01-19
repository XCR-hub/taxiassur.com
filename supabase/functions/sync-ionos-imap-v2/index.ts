import { createClient } from 'npm:@supabase/supabase-js@2';
import Imap from 'npm:imap@0.8.19';
import { simpleParser } from 'npm:mailparser@3.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedEmail {
  messageId: string;
  from: { address: string; name?: string }[];
  to: { address: string; name?: string }[];
  cc?: { address: string; name?: string }[];
  subject: string;
  text: string;
  html?: string;
  date: Date;
  inReplyTo?: string;
  references?: string[];
  attachments: any[];
}

function cleanMIMEContent(content: string): string {
  if (!content) return '';

  // Supprimer les frontières MIME (commence par --)
  let cleaned = content.replace(/^--[a-zA-Z0-9_-]+$/gm, '');

  // Supprimer les headers MIME (Content-Type, Content-Transfer-Encoding, etc.)
  cleaned = cleaned.replace(/^Content-[^:]+:.*$/gm, '');
  cleaned = cleaned.replace(/^MIME-Version:.*$/gm, '');
  cleaned = cleaned.replace(/^boundary=.*$/gm, '');

  // Supprimer les encodages base64 ou quoted-printable vides
  cleaned = cleaned.replace(/^(?:Content-Transfer-Encoding|Content-Disposition|Content-ID):.*$/gm, '');

  // Nettoyer les lignes vides multiples
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
}

function extractTextFromParsed(parsed: any): string {
  // Essayer d'abord le texte brut
  if (parsed.text) {
    const cleaned = cleanMIMEContent(parsed.text);
    if (cleaned && cleaned.length > 50) {
      return cleaned;
    }
  }

  // Si le texte brut est vide ou trop court, essayer le HTML converti
  if (parsed.html) {
    // Convertir HTML basique en texte
    let text = parsed.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    const cleaned = cleanMIMEContent(text);
    if (cleaned && cleaned.length > 50) {
      return cleaned;
    }
  }

  // En dernier recours, retourner le texte original nettoyé
  return cleanMIMEContent(parsed.text || parsed.textAsHtml || '(Contenu non disponible)');
}

async function fetchIMAPEmails(
  host: string,
  port: number,
  user: string,
  password: string,
  boxName: string = 'INBOX',
  limit: number = 100
): Promise<ParsedEmail[]> {
  return new Promise((resolve, reject) => {
    const emails: ParsedEmail[] = [];
    const timeoutId = setTimeout(() => {
      if (imap) {
        imap.end();
      }
      reject(new Error('IMAP connection timeout after 25 seconds'));
    }, 25000); // Timeout à 25s au lieu de 30s

    const imap = new Imap({
      user,
      password,
      host,
      port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 10000,
    });

    function openInbox(cb: (err: Error | null, box: any) => void) {
      imap.openBox(boxName, true, cb);
    }

    imap.once('ready', () => {
      openInbox((err, box) => {
        if (err) {
          clearTimeout(timeoutId);
          imap.end();
          return reject(err);
        }

        const totalMessages = box.messages.total;
        if (totalMessages === 0) {
          clearTimeout(timeoutId);
          imap.end();
          return resolve([]);
        }

        const start = Math.max(1, totalMessages - limit + 1);
        const end = totalMessages;

        console.log(`Fetching ${end - start + 1} messages from ${boxName}`);

        const fetch = imap.seq.fetch(`${start}:${end}`, {
          bodies: '',
          struct: true,
        });

        let processedCount = 0;
        const totalToProcess = end - start + 1;

        fetch.on('message', (msg: any) => {
          msg.on('body', (stream: any) => {
            simpleParser(stream, async (err: Error | null, parsed: any) => {
              if (err) {
                console.error('Error parsing email:', err);
                return;
              }

              try {
                // Nettoyer le contenu MIME
                const cleanText = extractTextFromParsed(parsed);

                const email: ParsedEmail = {
                  messageId: parsed.messageId || `${Date.now()}-${Math.random()}`,
                  from: parsed.from?.value || [],
                  to: parsed.to?.value || [],
                  cc: parsed.cc?.value || [],
                  subject: parsed.subject || '(No Subject)',
                  text: cleanText,
                  html: parsed.html || '',
                  date: parsed.date || new Date(),
                  inReplyTo: parsed.inReplyTo,
                  references: parsed.references,
                  attachments: parsed.attachments || [],
                };

                emails.push(email);
                processedCount++;

                if (processedCount >= totalToProcess) {
                  clearTimeout(timeoutId);
                  imap.end();
                }
              } catch (error) {
                console.error('Error processing email:', error);
                processedCount++;
                if (processedCount >= totalToProcess) {
                  clearTimeout(timeoutId);
                  imap.end();
                }
              }
            });
          });
        });

        fetch.once('error', (err: Error) => {
          clearTimeout(timeoutId);
          imap.end();
          reject(err);
        });

        fetch.once('end', () => {
          console.log('Fetch ended');
        });
      });
    });

    imap.once('error', (err: Error) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    imap.once('end', () => {
      clearTimeout(timeoutId);
      console.log('IMAP connection ended');
      resolve(emails);
    });

    try {
      imap.connect();
    } catch (err) {
      clearTimeout(timeoutId);
      reject(err);
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Vérifier d'abord que les credentials sont configurés
    const imapPassword = Deno.env.get('IONOS_EMAIL_PASSWORD');
    if (!imapPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'IONOS credentials not configured',
          message: 'Please configure IONOS_EMAIL_PASSWORD in Supabase Edge Function secrets',
          instructions: 'Go to Supabase Dashboard > Project Settings > Edge Functions > Secrets',
          stats: { inserted: 0, skipped: 0, errors: 0, total_retrieved: 0 }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503 // Service Unavailable
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting IONOS IMAP sync (v2 with timeout)...');

    // Paramètres IMAP depuis env ou defaults
    const imapHost = Deno.env.get('IONOS_IMAP_HOST') || 'imap.ionos.fr';
    const imapPort = parseInt(Deno.env.get('IONOS_IMAP_PORT') || '993');
    const imapUser = Deno.env.get('IONOS_EMAIL_USER') || 'team@taxiassur.com';

    console.log(`Connecting to IMAP: ${imapHost}:${imapPort} as ${imapUser}`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    let totalRetrieved = 0;

    try {
      console.log('Fetching from INBOX (last 100 emails)...');
      const inboxEmails = await fetchIMAPEmails(
        imapHost,
        imapPort,
        imapUser,
        imapPassword,
        'INBOX',
        100 // Limité à 100 pour éviter timeout
      );

      totalRetrieved += inboxEmails.length;
      console.log(`Retrieved ${inboxEmails.length} emails from INBOX`);

      for (const email of inboxEmails) {
        try {
          const { data: existing } = await supabase
            .from('email_messages')
            .select('id')
            .eq('message_id', email.messageId)
            .maybeSingle();

          if (existing) {
            skipped++;
            continue;
          }

          const fromAddress = email.from[0]?.address || 'unknown@unknown.com';
          const fromName = email.from[0]?.name || fromAddress;
          const toAddresses = email.to.map(t => t.address);
          const toNames = email.to.map(t => t.name || t.address);

          const emailData = {
            message_id: email.messageId,
            from_email: fromAddress,
            from_name: fromName,
            to_emails: toAddresses,
            to_names: toNames,
            subject: email.subject,
            body_text: email.text.substring(0, 50000),
            body_html: email.html?.substring(0, 50000),
            received_at: email.date.toISOString(),
            direction: 'inbound' as const,
            provider: 'ionos',
            is_read: false,
            is_important: false,
            attachments: email.attachments.map(att => ({
              filename: att.filename,
              contentType: att.contentType,
              size: att.size,
            })),
          };

          const { error: insertError } = await supabase
            .from('email_messages')
            .insert(emailData);

          if (insertError) {
            console.error('Insert error:', insertError);
            errors++;
          } else {
            inserted++;
          }
        } catch (emailError) {
          console.error('Error processing email:', emailError);
          errors++;
        }
      }
    } catch (imapError) {
      console.error('IMAP fetch error:', imapError);
      return new Response(
        JSON.stringify({
          success: false,
          error: imapError.message,
          message: 'IMAP connection failed',
          stats: { inserted, skipped, errors, total_retrieved: totalRetrieved },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    const response = {
      success: true,
      message: `IMAP sync completed successfully`,
      stats: {
        total_retrieved: totalRetrieved,
        inserted,
        skipped,
        errors,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('Sync completed:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error in sync-ionos-imap-v2:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
