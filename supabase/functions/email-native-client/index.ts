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
  private buffer = '';

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
    let response = this.buffer;
    this.buffer = '';
    while (!response.includes('\r\n')) {
      const { value, done } = await this.reader.read();
      if (done) break;
      response += this.decoder.decode(value);
    }
    return response;
  }

  private async readUntilTag(tag: string): Promise<string> {
    if (!this.reader) throw new Error('Not connected');
    let response = this.buffer;
    this.buffer = '';
    const tagPattern = new RegExp(`^${tag} `, 'm');
    const startTime = Date.now();
    while (!tagPattern.test(response)) {
      if (Date.now() - startTime > 15000) throw new Error('IMAP timeout');
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
    try {
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
    } catch (error) {
      console.error('Fetch headers error:', error);
    }
    return emails;
  }

  async fetchBody(seq: number): Promise<string> {
    try {
      const response = await this.sendCommand(`FETCH ${seq} BODY.PEEK[TEXT]`);
      const bodyMatch = response.match(/BODY\[TEXT\]\s*(?:\{\d+\})?\r\n([\s\S]*?)(?=\r\nA\d+|$)/);
      return bodyMatch ? bodyMatch[1].trim() : '';
    } catch (error) {
      return '';
    }
  }

  async logout(): Promise<void> {
    try { await this.sendCommand('LOGOUT'); } catch (e) {}
    await this.close();
  }

  async close(): Promise<void> {
    try {
      if (this.reader) { await this.reader.cancel(); this.reader = null; }
      if (this.conn) { this.conn.close(); this.conn = null; }
    } catch (e) {}
  }
}

class SMTPClient {
  private conn: Deno.TlsConn | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  async connect(host: string, port: number): Promise<boolean> {
    try {
      console.log(`SMTP: Connecting to ${host}:${port}...`);
      this.conn = await Deno.connectTls({ hostname: host, port });
      const greeting = await this.readLine();
      console.log('SMTP connected:', greeting.substring(0, 50));
      return greeting.startsWith('220');
    } catch (error) {
      console.error('SMTP connection error:', error);
      return false;
    }
  }

  private async readLine(): Promise<string> {
    if (!this.conn) throw new Error('Not connected');
    const buffer = new Uint8Array(4096);
    const n = await this.conn.read(buffer);
    return n ? this.decoder.decode(buffer.subarray(0, n)) : '';
  }

  private async sendCommand(command: string): Promise<string> {
    if (!this.conn) throw new Error('Not connected');
    await this.conn.write(this.encoder.encode(command + '\r\n'));
    return await this.readLine();
  }

  async login(username: string, password: string): Promise<boolean> {
    let response = await this.sendCommand('EHLO taxiassur.com');
    console.log('EHLO response:', response.substring(0, 100));
    if (!response.includes('250')) return false;
    response = await this.sendCommand('AUTH LOGIN');
    console.log('AUTH response:', response);
    if (!response.startsWith('334')) return false;
    response = await this.sendCommand(btoa(username));
    if (!response.startsWith('334')) return false;
    response = await this.sendCommand(btoa(password));
    console.log('Login result:', response.substring(0, 50));
    return response.startsWith('235');
  }

  async sendEmail(from: string, to: string, subject: string, body: string, html?: string): Promise<boolean> {
    let response = await this.sendCommand(`MAIL FROM:<${from}>`);
    console.log('MAIL FROM:', response);
    if (!response.startsWith('250')) return false;
    response = await this.sendCommand(`RCPT TO:<${to}>`);
    console.log('RCPT TO:', response);
    if (!response.startsWith('250')) return false;
    response = await this.sendCommand('DATA');
    console.log('DATA:', response);
    if (!response.startsWith('354')) return false;
    
    const boundary = `----=_Part_${Date.now()}`;
    const message = [
      `From: TaxiAssur <${from}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Date: ${new Date().toUTCString()}`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      btoa(unescape(encodeURIComponent(body))),
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      btoa(unescape(encodeURIComponent(html || `<p>${body}</p>`))),
      `--${boundary}--`,
      '.',
    ].join('\r\n');
    
    response = await this.sendCommand(message);
    console.log('Send result:', response);
    return response.startsWith('250');
  }

  async close(): Promise<void> {
    try {
      await this.sendCommand('QUIT');
      if (this.conn) { this.conn.close(); this.conn = null; }
    } catch (e) {}
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

    // Parse request body
    let body: any = {};
    try {
      const text = await req.text();
      console.log('Request body:', text.substring(0, 200));
      if (text) body = JSON.parse(text);
    } catch (e) {
      console.log('Body parse error:', e);
    }
    
    const action = body.action || 'fetch';
    console.log('Action:', action);

    const { data: account } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('email', 'team@taxiassur.com')
      .single();

    if (!account) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email account not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imapHost = account.imap_host || 'imap.ionos.fr';
    const imapPort = account.imap_port || 993;
    const smtpHost = account.smtp_host || 'smtp.ionos.fr';
    const smtpPort = account.smtp_port || 465;
    const username = account.imap_username || 'team@taxiassur.com';
    const password = account.imap_password_encrypted;

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email password not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SEND EMAIL via SMTP
    if (action === 'send') {
      console.log('Sending email via SMTP...');
      console.log('To:', body.to, 'Subject:', body.subject);
      
      if (!body.to || !body.subject || !body.body) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing: to, subject, or body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const smtp = new SMTPClient();
      const connected = await smtp.connect(smtpHost, smtpPort);
      if (!connected) {
        return new Response(
          JSON.stringify({ success: false, error: 'SMTP connection failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const loggedIn = await smtp.login(username, password);
      if (!loggedIn) {
        await smtp.close();
        return new Response(
          JSON.stringify({ success: false, error: 'SMTP authentication failed' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sent = await smtp.sendEmail(body.from || username, body.to, body.subject, body.body, body.html);
      await smtp.close();

      if (sent) {
        const messageId = `smtp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await supabase.from('email_messages').insert({
          account_id: account.id,
          message_id: messageId,
          from_email: body.from || username,
          from_name: 'TaxiAssur',
          to_emails: [body.to],
          subject: body.subject,
          body_text: body.body,
          body_html: body.html || body.body,
          sent_at: new Date().toISOString(),
          direction: 'outbound',
          status: 'sent',
          provider: 'ionos-smtp',
          is_read: true,
          lead_id: body.lead_id || null,
        });
      }

      return new Response(
        JSON.stringify({ success: sent, message: sent ? 'Email envoye via SMTP IONOS' : 'Echec envoi SMTP' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FETCH EMAILS via IMAP
    console.log('Fetching emails via IMAP...');
    const imap = new IMAPClient();
    const connected = await imap.connect(imapHost, imapPort);
    if (!connected) {
      return new Response(
        JSON.stringify({ success: false, error: 'IMAP connection failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loggedIn = await imap.login(username, password);
    if (!loggedIn) {
      await imap.close();
      return new Response(
        JSON.stringify({ success: false, error: 'IMAP authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mailbox = await imap.selectMailbox('INBOX');
    const stats = { retrieved: 0, inserted: 0, skipped: 0, errors: [] as string[] };

    if (mailbox.exists > 0) {
      const start = Math.max(1, mailbox.exists - 49);
      const emails = await imap.fetchHeaders(start, mailbox.exists);

      for (const email of emails) {
        stats.retrieved++;
        const messageId = email.uid;

        const { data: existing } = await supabase
          .from('email_messages')
          .select('id')
          .eq('message_id', messageId)
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
          message_id: messageId,
          from_email: fromEmail,
          from_name: fromName,
          to_emails: [username],
          subject: email.subject,
          body_text: bodyText.substring(0, 50000),
          received_at: receivedAt,
          direction: 'inbound',
          status: 'received',
          provider: 'ionos-imap',
          is_read: false,
        });

        if (error) {
          stats.errors.push(`${messageId}: ${error.message}`);
        } else {
          stats.inserted++;
        }
      }
    }

    await imap.logout();

    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', account.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronisation IMAP: ${stats.inserted} nouveaux emails`,
        mailbox_total: mailbox.exists,
        stats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Email client error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});