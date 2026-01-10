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

async function fetchIMAPEmails(
  host: string,
  port: number,
  user: string,
  password: string,
  boxName: string = 'INBOX',
  limit: number = 500
): Promise<ParsedEmail[]> {
  return new Promise((resolve, reject) => {
    const emails: ParsedEmail[] = [];

    const imap = new Imap({
      user,
      password,
      host,
      port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000,
      connTimeout: 30000,
    });

    function openInbox(cb: (err: Error | null, box: any) => void) {
      imap.openBox(boxName, true, cb);
    }

    imap.once('ready', () => {
      openInbox((err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        const totalMessages = box.messages.total;
        if (totalMessages === 0) {
          imap.end();
          return resolve([]);
        }

        const start = Math.max(1, totalMessages - limit + 1);
        const end = totalMessages;

        console.log(`Fetching messages ${start}:${end} from ${boxName}`);

        const fetch = imap.seq.fetch(`${start}:${end}`, {
          bodies: '',
          struct: true,
        });

        fetch.on('message', (msg: any) => {
          msg.on('body', (stream: any) => {
            simpleParser(stream, async (err: Error | null, parsed: any) => {
              if (err) {
                console.error('Error parsing email:', err);
                return;
              }

              try {
                const email: ParsedEmail = {
                  messageId: parsed.messageId || `${Date.now()}-${Math.random()}`,
                  from: parsed.from?.value || [],
                  to: parsed.to?.value || [],
                  cc: parsed.cc?.value || [],
                  subject: parsed.subject || '(No Subject)',
                  text: parsed.text || '',
                  html: parsed.html || '',
                  date: parsed.date || new Date(),
                  inReplyTo: parsed.inReplyTo,
                  references: parsed.references,
                  attachments: parsed.attachments || [],
                };

                emails.push(email);
              } catch (error) {
                console.error('Error processing email:', error);
              }
            });
          });
        });

        fetch.once('error', (err: Error) => {
          console.error('Fetch error:', err);
          imap.end();
          reject(err);
        });

        fetch.once('end', () => {
          console.log(`Fetched ${emails.length} emails from ${boxName}`);
          imap.end();
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('IMAP connection error:', err);
      reject(err);
    });

    imap.once('end', () => {
      console.log('IMAP connection ended');
      resolve(emails);
    });

    try {
      imap.connect();
    } catch (err) {
      reject(err);
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting IONOS IMAP sync...');

    const { data: accounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('email', 'team@taxiassur.com');

    if (accountsError) {
      throw new Error(`Error fetching accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No active email accounts found for team@taxiassur.com'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const account = accounts[0];
    const imapHost = account.imap_host || 'imap.ionos.fr';
    const imapPort = account.imap_port || 993;
    const imapUser = account.imap_username || account.email;
    const imapPassword = account.imap_password_encrypted;

    console.log(`Connecting to IMAP: ${imapHost}:${imapPort} as ${imapUser}`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    let totalRetrieved = 0;

    try {
      console.log('Fetching from INBOX...');
      const inboxEmails = await fetchIMAPEmails(
        imapHost,
        imapPort,
        imapUser,
        imapPassword,
        'INBOX',
        500
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
          const ccAddresses = email.cc?.map(c => c.address) || [];

          const emailData = {
            message_id: email.messageId,
            thread_id: null,
            from_email: fromAddress,
            from_name: fromName,
            to_emails: toAddresses,
            to_names: toNames,
            cc_emails: ccAddresses,
            subject: email.subject,
            body_text: email.text,
            body_html: email.html || '',
            received_at: email.date.toISOString(),
            sent_at: email.date.toISOString(),
            direction: 'inbound',
            status: 'received',
            channel: 'email',
            provider: 'ionos',
            is_read: false,
            has_attachments: email.attachments.length > 0,
            metadata: {
              in_reply_to: email.inReplyTo,
              references: email.references,
              attachments_count: email.attachments.length,
              ionos_message_id: email.messageId,
            },
          };

          const { error: insertError } = await supabase
            .from('email_messages')
            .insert(emailData);

          if (insertError) {
            console.error(`Error inserting email ${email.messageId}:`, insertError);
            errors++;
          } else {
            inserted++;
          }

        } catch (error) {
          console.error(`Error processing email ${email.messageId}:`, error);
          errors++;
        }
      }

      try {
        console.log('Fetching from Sent folder...');
        const sentEmails = await fetchIMAPEmails(
          imapHost,
          imapPort,
          imapUser,
          imapPassword,
          'Sent',
          200
        );

        totalRetrieved += sentEmails.length;
        console.log(`Retrieved ${sentEmails.length} emails from Sent folder`);

        for (const email of sentEmails) {
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

            const fromAddress = email.from[0]?.address || account.email;
            const fromName = email.from[0]?.name || fromAddress;
            const toAddresses = email.to.map(t => t.address);
            const toNames = email.to.map(t => t.name || t.address);

            const emailData = {
              message_id: email.messageId,
              thread_id: null,
              from_email: fromAddress,
              from_name: fromName,
              to_emails: toAddresses,
              to_names: toNames,
              cc_emails: email.cc?.map(c => c.address) || [],
              subject: email.subject,
              body_text: email.text,
              body_html: email.html || '',
              received_at: email.date.toISOString(),
              sent_at: email.date.toISOString(),
              direction: 'outbound',
              status: 'sent',
              channel: 'email',
              provider: 'ionos',
              is_read: true,
              has_attachments: email.attachments.length > 0,
              metadata: {
                in_reply_to: email.inReplyTo,
                references: email.references,
                attachments_count: email.attachments.length,
                ionos_message_id: email.messageId,
              },
            };

            const { error: insertError } = await supabase
              .from('email_messages')
              .insert(emailData);

            if (insertError) {
              console.error(`Error inserting sent email ${email.messageId}:`, insertError);
              errors++;
            } else {
              inserted++;
            }

          } catch (error) {
            console.error(`Error processing sent email ${email.messageId}:`, error);
            errors++;
          }
        }
      } catch (sentError) {
        console.error('Error fetching from Sent folder (may not exist):', sentError);
      }

      await supabase
        .from('email_accounts')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', account.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'IONOS IMAP sync completed successfully',
          stats: {
            total_retrieved: totalRetrieved,
            inserted,
            skipped,
            errors,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (imapError) {
      console.error('IMAP sync error:', imapError);

      return new Response(
        JSON.stringify({
          success: false,
          error: `IMAP connection failed: ${imapError.message}`,
          note: 'Verify IMAP credentials and server settings',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Error in sync-ionos-imap:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});