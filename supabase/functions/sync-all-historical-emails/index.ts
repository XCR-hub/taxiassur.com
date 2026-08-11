import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, "")
    .replace(
      /=([0-9A-Fa-f]{2})/g,
      (_, hex) => String.fromCharCode(parseInt(hex, 16)),
    );
}

function decodeBase64(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str.replace(/\s/g, ""))));
  } catch {
    try {
      return atob(str.replace(/\s/g, ""));
    } catch {
      return str;
    }
  }
}

function decodeMimeHeader(header: string): string {
  return header.replace(
    /=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g,
    (_, charset, encoding, text) => {
      try {
        if (encoding.toUpperCase() === "B") return decodeBase64(text);
        if (encoding.toUpperCase() === "Q") {
          return decodeQuotedPrintable(
            text.replace(/_/g, " "),
          );
        }
      } catch {}
      return text;
    },
  );
}

function extractHtmlContent(raw: string): { text: string; html: string } {
  let text = "", html = "";
  const boundaryMatch = raw.match(/boundary="?([^"\s;]+)"?/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = raw.split(
      new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"),
    );

    for (const part of parts) {
      const isQP = /Content-Transfer-Encoding:\s*quoted-printable/i.test(part);
      const isB64 = /Content-Transfer-Encoding:\s*base64/i.test(part);
      const isHtml = /Content-Type:\s*text\/html/i.test(part);
      const isText = /Content-Type:\s*text\/plain/i.test(part);

      const bodyStart = part.indexOf("\r\n\r\n");
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
    const bodyStart = raw.indexOf("\r\n\r\n");
    if (bodyStart !== -1) content = raw.substring(bodyStart + 4);

    if (isQP) content = decodeQuotedPrintable(content);
    else if (isB64) content = decodeBase64(content);

    if (isHtml) html = content;
    else text = content;
  }

  if (html && !text) {
    text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
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
      return greeting.includes("OK") || greeting.includes("*");
    } catch (e) {
      console.error("IMAP error:", e);
      return false;
    }
  }

  private async readResponse(): Promise<string> {
    if (!this.reader) throw new Error("Not connected");
    let response = "";
    while (!response.includes("\r\n")) {
      const { value, done } = await this.reader.read();
      if (done) break;
      response += this.decoder.decode(value);
    }
    return response;
  }

  private async sendCommand(command: string): Promise<string> {
    if (!this.conn || !this.reader) throw new Error("Not connected");
    const tag = `A${++this.tagCounter}`;
    await this.conn.write(this.encoder.encode(`${tag} ${command}\r\n`));
    let response = "";
    while (true) {
      const line = await this.readResponse();
      response += line;
      if (line.startsWith(tag)) break;
    }
    return response;
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await this.sendCommand(
        `LOGIN "${username}" "${password}"`,
      );
      return response.includes("OK");
    } catch {
      return false;
    }
  }

  async selectMailbox(mailbox: string): Promise<{ exists: number }> {
    const response = await this.sendCommand(`SELECT "${mailbox}"`);
    const match = response.match(/\* (\d+) EXISTS/);
    return { exists: match ? parseInt(match[1]) : 0 };
  }

  async fetchHeaders(
    start: number,
    end: number,
  ): Promise<
    Array<
      { uid: string; from: string; subject: string; date: string; seq: number }
    >
  > {
    const response = await this.sendCommand(
      `FETCH ${start}:${end} (UID BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)])`,
    );
    const emails: Array<
      { uid: string; from: string; subject: string; date: string; seq: number }
    > = [];
    const chunks = response.split(/\* \d+ FETCH/);

    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];
      const uidMatch = chunk.match(/UID (\d+)/);
      const fromMatch = chunk.match(/From:\s*([^\r\n]+)/i);
      const subjectMatch = chunk.match(/Subject:\s*([^\r\n]+)/i);
      const dateMatch = chunk.match(/Date:\s*([^\r\n]+)/i);
      const msgIdMatch = chunk.match(/Message-ID:\s*<([^>]+)>/i);

      if (uidMatch) {
        const seq = start + i - 1;
        emails.push({
          uid: msgIdMatch ? msgIdMatch[1] : `uid-${uidMatch[1]}`,
          from: decodeMimeHeader(
            fromMatch
              ? fromMatch[1].replace(/\r\n\s+/g, " ").trim()
              : "Unknown",
          ),
          subject: decodeMimeHeader(
            subjectMatch
              ? subjectMatch[1].replace(/\r\n\s+/g, " ").trim()
              : "(Pas de sujet)",
          ),
          date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
          seq,
        });
      }
    }
    return emails;
  }

  async fetchFullEmail(seq: number): Promise<{ text: string; html: string }> {
    try {
      const response = await this.sendCommand(`FETCH ${seq} BODY.PEEK[]`);
      const bodyMatch = response.match(/BODY\[\]\s*\{(\d+)\}\r\n([\s\S]*)/);
      if (bodyMatch) {
        const content = extractHtmlContent(bodyMatch[2]);
        return content;
      }
      return { text: "", html: "" };
    } catch (e) {
      console.error("Error fetching email:", e);
      return { text: "", html: "" };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.sendCommand("LOGOUT");
    } catch {}
    await this.close();
  }
  async close(): Promise<void> {
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.conn) {
        this.conn.close();
        this.conn = null;
      }
    } catch {}
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!(await isInternalRequest(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    console.log(
      "🔄 SYNCHRONISATION COMPLÈTE DE TOUS LES EMAILS HISTORIQUES...",
    );

    const stats = {
      mailbox_total: 0,
      retrieved: 0,
      inserted: 0,
      skipped: 0,
      linked: 0,
      errors: 0,
    };

    const { data: account } = await supabase.from("email_accounts").select("*")
      .eq("email", "team@taxiassur.com").single();
    if (!account?.imap_password_encrypted) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Compte email non configuré",
          stats,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const imap = new IMAPClient();
    if (
      !await imap.connect(
        account.imap_host || "imap.ionos.fr",
        account.imap_port || 993,
      )
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "Connexion IMAP échouée" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      !await imap.login(
        account.imap_username || "team@taxiassur.com",
        account.imap_password_encrypted,
      )
    ) {
      await imap.close();
      return new Response(
        JSON.stringify({ success: false, error: "Auth IMAP échouée" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const mailbox = await imap.selectMailbox("INBOX");
    stats.mailbox_total = mailbox.exists;
    console.log(`📬 Total d'emails dans la boîte: ${mailbox.exists}`);

    if (mailbox.exists > 0) {
      // Récupérer TOUS les emails par batch de 50
      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(mailbox.exists / BATCH_SIZE);

      console.log(
        `📦 Traitement en ${totalBatches} batchs de ${BATCH_SIZE} emails`,
      );

      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const start = batchNum * BATCH_SIZE + 1;
        const end = Math.min((batchNum + 1) * BATCH_SIZE, mailbox.exists);

        console.log(
          `📦 Batch ${batchNum + 1}/${totalBatches}: emails ${start} à ${end}`,
        );

        const emails = await imap.fetchHeaders(start, end);

        for (const email of emails) {
          stats.retrieved++;

          // Vérifier si l'email existe déjà
          const { data: existing } = await supabase
            .from("email_messages")
            .select("id")
            .eq("message_id", email.uid)
            .maybeSingle();

          if (existing) {
            stats.skipped++;
            continue;
          }

          const fromMatch = email.from.match(
            /(?:"?([^"<]+)"?\s*)?<?([^>\s]+@[^>\s]+)>?/,
          );
          const fromName = fromMatch?.[1]?.trim() || "";
          const fromEmail = fromMatch?.[2]?.trim() || email.from;

          let receivedAt: string;
          try {
            const d = new Date(email.date);
            receivedAt = isNaN(d.getTime())
              ? new Date().toISOString()
              : d.toISOString();
          } catch {
            receivedAt = new Date().toISOString();
          }

          const { text, html } = await imap.fetchFullEmail(email.seq);

          const cleanText = text.replace(/--[0-9A-F]+_NextPart_[0-9A-F.]+/g, "")
            .replace(/Content-Type:.*?charset="?UTF-8"?/gi, "")
            .replace(
              /Content-Transfer-Encoding:.*?(quoted-printable|base64)/gi,
              "",
            )
            .replace(/={20,}/g, "")
            .trim();

          const cleanHtml = html.replace(/--[0-9A-F]+_NextPart_[0-9A-F.]+/g, "")
            .trim();

          // Insérer l'email
          const { data: insertedEmail, error } = await supabase.from(
            "email_messages",
          ).insert({
            account_id: account.id,
            message_id: email.uid,
            from_email: fromEmail,
            from_name: fromName,
            to_emails: [account.imap_username || "team@taxiassur.com"],
            subject: email.subject,
            body_text: cleanText.substring(0, 100000),
            body_html: cleanHtml.substring(0, 500000),
            received_at: receivedAt,
            direction: "inbound",
            status: "received",
            provider: "ionos-imap-historical",
            is_read: false,
          }).select().single();

          if (error) {
            console.error("❌ Erreur insertion:", email.subject, error.message);
            stats.errors++;
          } else {
            console.log("✅ Email inséré:", email.subject.substring(0, 50));
            stats.inserted++;
          }
        }

        // Pause entre les batchs pour ne pas surcharger
        if (batchNum < totalBatches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    await imap.logout();

    console.log("🔗 Liaison automatique des emails aux leads...");

    // Lier les emails aux leads
    const { data: linkResult } = await supabase.rpc(
      "link_unassigned_emails_to_leads",
    );
    if (linkResult) {
      stats.linked = linkResult.emails_linked || 0;
    }

    await supabase.from("email_accounts").update({
      last_sync_at: new Date().toISOString(),
    }).eq("id", account.id);

    console.log("✅ Synchronisation complète terminée:", stats);

    return new Response(
      JSON.stringify({
        success: true,
        message:
          `✅ Sync historique: ${stats.inserted} nouveaux emails / ${stats.mailbox_total} total, ${stats.linked} liés`,
        stats,
        provider: "ionos-imap-historical-full",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("❌ Erreur sync:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
