import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

class SMTPClient {
  private conn: Deno.TlsConn | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  async connect(host: string, port: number): Promise<boolean> {
    try {
      console.log(`SMTP: Connecting to ${host}:${port}...`);
      this.conn = await Deno.connectTls({ hostname: host, port });
      const greeting = await this.readLine();
      console.log('SMTP greeting:', greeting.substring(0, 80));
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
    if (!response.includes('250')) return false;
    
    response = await this.sendCommand('AUTH LOGIN');
    if (!response.startsWith('334')) return false;
    
    response = await this.sendCommand(btoa(username));
    if (!response.startsWith('334')) return false;
    
    response = await this.sendCommand(btoa(password));
    return response.startsWith('235');
  }

  async sendEmail(from: string, to: string, subject: string, body: string, html?: string): Promise<boolean> {
    let response = await this.sendCommand(`MAIL FROM:<${from}>`);
    if (!response.startsWith('250')) return false;
    
    response = await this.sendCommand(`RCPT TO:<${to}>`);
    if (!response.startsWith('250')) return false;
    
    response = await this.sendCommand('DATA');
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
      btoa(unescape(encodeURIComponent(html || `<html><body><p>${body}</p></body></html>`))),
      `--${boundary}--`,
      '.',
    ].join('\r\n');
    
    response = await this.sendCommand(message);
    console.log('Send result:', response.substring(0, 100));
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

    const body = await req.json();
    console.log('Email request:', JSON.stringify(body));

    if (!body.to || !body.subject || !body.body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Champs requis: to, subject, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: account } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('email', 'team@taxiassur.com')
      .single();

    if (!account || !account.imap_password_encrypted) {
      return new Response(
        JSON.stringify({ success: false, error: 'Compte email non configure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const smtpHost = account.smtp_host || 'smtp.ionos.fr';
    const smtpPort = account.smtp_port || 465;
    const username = account.imap_username || 'team@taxiassur.com';
    const password = account.imap_password_encrypted;

    const smtp = new SMTPClient();
    const connected = await smtp.connect(smtpHost, smtpPort);
    if (!connected) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connexion SMTP echouee' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loggedIn = await smtp.login(username, password);
    if (!loggedIn) {
      await smtp.close();
      return new Response(
        JSON.stringify({ success: false, error: 'Authentification SMTP echouee' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sent = await smtp.sendEmail(
      body.from || username,
      body.to,
      body.subject,
      body.body,
      body.html
    );
    await smtp.close();

    if (sent) {
      const messageId = `smtp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await supabase.from('email_messages').insert({
        account_id: account.id,
        message_id: messageId,
        from_email: body.from || username,
        from_name: body.from_name || 'TaxiAssur',
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
      JSON.stringify({ 
        success: sent, 
        message: sent ? 'Email envoye via SMTP IONOS' : 'Echec envoi',
        to: body.to,
        subject: body.subject
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('SMTP error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});