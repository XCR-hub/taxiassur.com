import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function decodeBase64(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str.replace(/\s/g, ''))));
  } catch {
    try { return atob(str.replace(/\s/g, '')); } catch { return str; }
  }
}

function decodeMimeHeader(header: string): string {
  return header.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') return decodeBase64(text);
      if (encoding.toUpperCase() === 'Q') return decodeQuotedPrintable(text.replace(/_/g, ' '));
    } catch {}
    return text;
  });
}

function extractHtmlContent(raw: string): { text: string; html: string } {
  let text = '', html = '';
  const boundaryMatch = raw.match(/boundary="?([^"\s;]+)"?/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = raw.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'));

    for (const part of parts) {
      const isQP = /Content-Transfer-Encoding:\s*quoted-printable/i.test(part);
      const isB64 = /Content-Transfer-Encoding:\s*base64/i.test(part);
      const isHtml = /Content-Type:\s*text\/html/i.test(part);
      const isText = /Content-Type:\s*text\/plain/i.test(part);

      const bodyStart = part.indexOf('\r\n\r\n');
      if (bodyStart === -1) continue;

      let content = part.substring(bodyStart + 4).trim();
      if (isQP) content = decodeQuotedPrintable(content);
      else if (isB64) content = decodeBase64(content);

      if (isHtml && !html) html = content;
      else if (isText && !text) text = content;
    }
  } else {
    const isQP = /Content-Transfer-Encoding:\s*quoted-printable/i.test(raw);
    const isB64 = /Content-Transfer-Encoding:\s*base64/i.test(raw);
    const isHtml = /Content-Type:\s*text\/html/i.test(raw);

    let content = raw;
    const bodyStart = raw.indexOf('\r\n\r\n');
    if (bodyStart !== -1) content = raw.substring(bodyStart + 4);

    if (isQP) content = decodeQuotedPrintable(content);
    else if (isB64) content = decodeBase64(content);

    if (isHtml) html = content;
    else text = content;
  }

  if (html && !text) text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { text, html };
}

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
    } catch (e) { console.error('IMAP error:', e); return false; }
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
      if (Date.now() - startTime > 30000) throw new Error('IMAP timeout');
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

  async login(u: string, p: string): Promise<boolean> {
    const r = await this.sendCommand(`LOGIN "${u}" "${p}"`);
    return r.includes('OK');
  }

  async selectMailbox(m: string): Promise<{ exists: number }> {
    const r = await this.sendCommand(`SELECT "${m}"`);
    const match = r.match(/(\d+) EXISTS/);
    return { exists: match ? parseInt(match[1]) : 0 };
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
          from: decodeMimeHeader(fromMatch ? fromMatch[1].replace(/\r\n\s+/g, ' ').trim() : 'Unknown'),
          subject: decodeMimeHeader(subjectMatch ? subjectMatch[1].replace(/\r\n\s+/g, ' ').trim() : '(Pas de sujet)'),
          date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
          seq,
        });
      }
    }
    return emails;
  }

  async fetchFullEmail(seq: number): Promise<{ text: string; html: string; attachments: Array<{ filename: string; contentType: string; size: number; data: Uint8Array }> }> {
    try {
      const response = await this.sendCommand(`FETCH ${seq} BODY.PEEK[]`);
      const bodyMatch = response.match(/BODY\[\]\s*\{(\d+)\}\r\n([\s\S]*)/);
      if (bodyMatch) {
        const content = extractHtmlContent(bodyMatch[2]);
        return { ...content, attachments: [] };
      }
      return { text: '', html: '', attachments: [] };
    } catch (e) {
      console.error('Error fetching email:', e);
      return { text: '', html: '', attachments: [] };
    }
  }

  async logout(): Promise<void> { try { await this.sendCommand('LOGOUT'); } catch {} await this.close(); }
  async close(): Promise<void> {
    try {
      if (this.reader) { await this.reader.cancel(); this.reader = null; }
      if (this.conn) { this.conn.close(); this.conn = null; }
    } catch {}
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { offset = 0 } = await req.json().catch(() => ({ offset: 0 }));
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    console.log(`History sync starting from offset ${offset}...`);

    const stats = { total_in_mailbox: 0, batch_retrieved: 0, inserted: 0, skipped: 0, errors: 0, has_more: false };

    const { data: account } = await supabase.from('email_accounts').select('*').eq('email', 'team@taxiassur.com').single();
    if (!account?.imap_password_encrypted) {
      return new Response(JSON.stringify({ success: false, error: 'Compte email non configure', stats }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const imap = new IMAPClient();
    if (!await imap.connect(account.imap_host || 'imap.ionos.fr', account.imap_port || 993)) {
      return new Response(JSON.stringify({ success: false, error: 'Connexion IMAP echouee' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!await imap.login(account.imap_username || 'team@taxiassur.com', account.imap_password_encrypted)) {
      await imap.close();
      return new Response(JSON.stringify({ success: false, error: 'Auth IMAP echouee' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const mailbox = await imap.selectMailbox('INBOX');
    stats.total_in_mailbox = mailbox.exists;

    if (mailbox.exists > 0) {
      const BATCH_SIZE = 20;
      const end = Math.max(1, mailbox.exists - offset);
      const start = Math.max(1, end - (BATCH_SIZE - 1));

      stats.has_more = start > 1;

      console.log(`Fetching emails from ${start} to ${end} (total: ${mailbox.exists}, offset: ${offset})`);
      const emails = await imap.fetchHeaders(start, end);
      stats.batch_retrieved = emails.length;

      for (const email of emails) {
        const { data: existing } = await supabase.from('email_messages').select('id').eq('message_id', email.uid).maybeSingle();
        if (existing) { stats.skipped++; continue; }

        const fromMatch = email.from.match(/(?:"?([^"<]+)"?\s*)?<?([^>\s]+@[^>\s]+)>?/);
        const fromName = fromMatch?.[1]?.trim() || '';
        const fromEmail = fromMatch?.[2]?.trim() || email.from;

        let receivedAt: string;
        try { const d = new Date(email.date); receivedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(); }
        catch { receivedAt = new Date().toISOString(); }

        const { text, html } = await imap.fetchFullEmail(email.seq);

        const cleanText = text.replace(/--[0-9A-F]+_NextPart_[0-9A-F.]+/g, '')
          .replace(/Content-Type:.*?charset="?UTF-8"?/gi, '')
          .replace(/Content-Transfer-Encoding:.*?(quoted-printable|base64)/gi, '')
          .replace(/={20,}/g, '')
          .trim();

        const cleanHtml = html.replace(/--[0-9A-F]+_NextPart_[0-9A-F.]+/g, '').trim();

        const { error } = await supabase.from('email_messages').insert({
          account_id: account.id,
          message_id: email.uid,
          from_email: fromEmail,
          from_name: fromName,
          to_emails: [account.imap_username || 'team@taxiassur.com'],
          subject: email.subject,
          body_text: cleanText.substring(0, 100000),
          body_html: cleanHtml.substring(0, 500000),
          received_at: receivedAt,
          direction: 'inbound',
          status: 'received',
          provider: 'ionos-imap',
          is_read: false,
        });

        if (error) {
          console.error('Insert error:', email.subject, error);
          stats.errors++;
        } else {
          stats.inserted++;
        }
      }
    }

    await imap.logout();

    const nextOffset = stats.has_more ? offset + stats.batch_retrieved : offset;
    const progress = Math.round(((stats.total_in_mailbox - (stats.total_in_mailbox - offset - stats.batch_retrieved)) / stats.total_in_mailbox) * 100);

    return new Response(JSON.stringify({
      success: true,
      message: `Batch traité: ${stats.inserted} nouveaux emails`,
      stats,
      next_offset: nextOffset,
      progress,
      completed: !stats.has_more
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('History sync error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
