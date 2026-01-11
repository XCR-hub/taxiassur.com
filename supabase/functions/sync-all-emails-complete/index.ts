import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

class IMAPClient {
  private conn: Deno.TlsConn | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private tagCounter = 0;

  async connect(host: string, port: number): Promise<boolean> {
    try {
      this.conn = await Deno.connectTls({ hostname: host, port });
      this.reader = this.conn.readable.getReader();
      const greeting = await this.readResponse();
      return greeting.includes('OK') || greeting.includes('*');
    } catch (error) {
      console.error('IMAP connection error:', error);
      return false;
    }
  }

  private async readResponse(): Promise<string> {
    if (!this.reader) throw new Error('Not connected');
    let response = '';
    while (!response.includes('\r\n')) {
      const { value, done } = await this.reader.read();
      if (done) break;
      response += this.decoder.decode(value);
    }
    return response;
  }

  private async readUntilTag(tag: string): Promise<string> {
    if (!this.reader) throw new Error('Not connected');
    let response = '';
    const tagPattern = new RegExp(`^${tag} `, 'm');
    const startTime = Date.now();
    while (!tagPattern.test(response)) {
      if (Date.now() - startTime > 20000) throw new Error('IMAP timeout');
      const { value, done } = await this.reader.read();
      if (done) break;
      response += this.decoder.decode(value);
    }
    return response;
  }

  private async sendCommand(command: string): Promise<string> {
    if (!this.conn) throw new Error('Not connected');
    const tag = `A${++this.tagCounter}`;
    await this.conn.write(this.encoder.encode(`${tag} ${command}\r\n`));
    return await this.readUntilTag(tag);
  }

  async login(username: string, password: string): Promise<boolean> {
    const response = await this.sendCommand(`LOGIN "${username}" "${password}"`);
    return response.includes('OK');
  }

  async selectMailbox(mailbox: string): Promise<{ exists: number }> {
    const response = await this.sendCommand(`SELECT "${mailbox}"`);
    const existsMatch = response.match(/(\d+) EXISTS/);
    return { exists: existsMatch ? parseInt(existsMatch[1]) : 0 };
  }

  async fetchHeaders(start: number, end: number): Promise<Array<{ uid: string; subject: string; from: string; date: string; seq: number }>> {
    const emails: Array<{ uid: string; subject: string; from: string; date: string; seq: number }> = [];
    const response = await this.sendCommand(`FETCH ${start}:${end} (UID BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)])`);
    const parts = response.split(/\* (\d+) FETCH/);
    for (let i = 1; i < parts.length; i += 2) {
      const seq = parseInt(parts[i]);
      const part = parts[i + 1] || '';
      const uidMatch = part.match(/UID (\d+)/);
      const fromMatch = part.match(/From:\s*(.+?)(?:\r\n(?!\s)|$)/is);
      const subjectMatch = part.match(/Subject:\s*(.+?)(?:\r\n(?!\s)|$)/is);
      const dateMatch = part.match(/Date:\s*(.+?)(?:\r\n|$)/i);
      const msgIdMatch = part.match(/Message-ID:\s*<?([^>\s]+)>?/i);
      if (uidMatch) {
        emails.push({
          uid: msgIdMatch ? msgIdMatch[1] : `uid-${uidMatch[1]}`,
          from: fromMatch ? fromMatch[1].replace(/\r\n\s+/g, ' ').trim() : 'Unknown',
          subject: subjectMatch ? subjectMatch[1].replace(/\r\n\s+/g, ' ').trim() : '(Pas de sujet)',
          date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
          seq,
        });
      }
    }
    return emails;
  }

  async fetchBody(seq: number): Promise<string> {
    try {
      const response = await this.sendCommand(`FETCH ${seq} BODY.PEEK[TEXT]`);
      const bodyMatch = response.match(/BODY\[TEXT\]\s*(?:\{\d+\})?\r\n([\s\S]*?)(?=\r\nA\d+|$)/);
      return bodyMatch ? bodyMatch[1].trim().substring(0, 50000) : '';
    } catch {
      return '';
    }
  }

  async logout(): Promise<void> {
    try { await this.sendCommand('LOGOUT'); } catch {}
    await this.close();
  }

  async close(): Promise<void> {
    try {
      if (this.reader) { await this.reader.cancel(); this.reader = null; }
      if (this.conn) { this.conn.close(); this.conn = null; }
    } catch {}
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting complete email sync via native IMAP...');

    const stats = {
      mailbox_total: 0,
      retrieved: 0,
      inserted: 0,
      skipped: 0,
      linked: 0,
      errors: 0,
    };

    // Get account config
    const { data: account } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('email', 'team@taxiassur.com')
      .single();

    if (!account || !account.imap_password_encrypted) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email account not configured', stats }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imapHost = account.imap_host || 'imap.ionos.fr';
    const imapPort = account.imap_port || 993;
    const username = account.imap_username || 'team@taxiassur.com';
    const password = account.imap_password_encrypted;

    // Connect via native IMAP
    const imap = new IMAPClient();
    const connected = await imap.connect(imapHost, imapPort);
    if (!connected) {
      return new Response(
        JSON.stringify({ success: false, error: 'IMAP connection failed', stats }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loggedIn = await imap.login(username, password);
    if (!loggedIn) {
      await imap.close();
      return new Response(
        JSON.stringify({ success: false, error: 'IMAP authentication failed', stats }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mailbox = await imap.selectMailbox('INBOX');
    stats.mailbox_total = mailbox.exists;
    console.log(`INBOX: ${mailbox.exists} emails`);

    if (mailbox.exists > 0) {
      const start = Math.max(1, mailbox.exists - 99);
      const emails = await imap.fetchHeaders(start, mailbox.exists);
      console.log(`Fetched ${emails.length} headers`);

      for (const email of emails) {
        stats.retrieved++;

        const { data: existing } = await supabase
          .from('email_messages')
          .select('id')
          .eq('message_id', email.uid)
          .maybeSingle();

        if (existing) {
          stats.skipped++;
          continue;
        }

        const fromMatch = email.from.match(/(?:"?([^"<]+)"?\s*)?<?([^>\s]+@[^>\s]+)>?/);
        const fromName = fromMatch?.[1]?.trim() || '';
        const fromEmail = fromMatch?.[2]?.trim() || email.from;

        let receivedAt: string;
        try {
          const d = new Date(email.date);
          receivedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        } catch {
          receivedAt = new Date().toISOString();
        }

        const bodyText = await imap.fetchBody(email.seq);

        const { error } = await supabase.from('email_messages').insert({
          account_id: account.id,
          message_id: email.uid,
          from_email: fromEmail,
          from_name: fromName,
          to_emails: [username],
          subject: email.subject,
          body_text: bodyText,
          received_at: receivedAt,
          direction: 'inbound',
          status: 'received',
          provider: 'ionos-imap',
          is_read: false,
        });

        if (error) {
          stats.errors++;
          console.error('Insert error:', error.message);
        } else {
          stats.inserted++;
        }
      }
    }

    await imap.logout();

    // Link unlinked emails to leads
    const { data: unlinkedEmails } = await supabase
      .from('email_messages')
      .select('id, from_email, to_emails, direction')
      .is('lead_id', null)
      .eq('auto_matched', false)
      .limit(200);

    if (unlinkedEmails) {
      for (const email of unlinkedEmails) {
        const emailToMatch = email.direction === 'inbound'
          ? email.from_email
          : (email.to_emails?.[0] || null);

        if (!emailToMatch) continue;

        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('email', emailToMatch)
          .maybeSingle();

        if (lead) {
          await supabase
            .from('email_messages')
            .update({ lead_id: lead.id, auto_matched: true })
            .eq('id', email.id);
          stats.linked++;
        }
      }
    }

    // Update last sync
    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', account.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronisation IMAP terminee: ${stats.inserted} nouveaux emails`,
        stats,
        provider: 'ionos-imap-native',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});