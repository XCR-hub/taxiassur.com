import { isInternalRequest } from "../_shared/internal-auth.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function decodeQuotedPrintable(str: string, charset = "utf-8"): string {
  const cleaned = str.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  let i = 0;
  while (i < cleaned.length) {
    if (cleaned[i] === "=" && i + 2 < cleaned.length) {
      const hex = cleaned.substring(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    bytes.push(cleaned.charCodeAt(i));
    i++;
  }
  try {
    return new TextDecoder(charset).decode(new Uint8Array(bytes));
  } catch {
    return String.fromCharCode(...bytes);
  }
}

function decodeBase64(str: string, charset = "utf-8"): string {
  try {
    const binary = atob(str.replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder(charset).decode(bytes);
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
        if (encoding.toUpperCase() === "B") return decodeBase64(text, charset);
        if (encoding.toUpperCase() === "Q") {
          return decodeQuotedPrintable(
            text.replace(/_/g, " "),
            charset,
          );
        }
      } catch {}
      return text;
    },
  );
}

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  data: Uint8Array;
}

function extractEmailContent(
  raw: string,
): { text: string; html: string; attachments: EmailAttachment[] } {
  let text = "", html = "";
  const attachments: EmailAttachment[] = [];

  const getCharset = (part: string): string => {
    const match = part.match(/charset="?([^"\s;]+)"?/i);
    return match ? match[1].toLowerCase() : "utf-8";
  };

  const getFilename = (part: string): string | null => {
    const dispositionMatch = part.match(
      /Content-Disposition:.*filename="?([^";\r\n]+)"?/i,
    );
    if (dispositionMatch) return decodeMimeHeader(dispositionMatch[1].trim());

    const typeMatch = part.match(/Content-Type:.*name="?([^";\r\n]+)"?/i);
    if (typeMatch) return decodeMimeHeader(typeMatch[1].trim());

    return null;
  };

  const getContentType = (part: string): string => {
    const match = part.match(/Content-Type:\s*([^;\r\n]+)/i);
    return match ? match[1].trim().toLowerCase() : "application/octet-stream";
  };

  const isAttachment = (part: string): boolean => {
    return /Content-Disposition:.*attachment/i.test(part) ||
      (/Content-Type:\s*(?!text\/(?:plain|html))/i.test(part) &&
        getFilename(part) !== null);
  };

  const boundaryMatch = raw.match(/boundary="?([^"\s;]+)"?/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const regex = new RegExp(
      `--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "g",
    );
    const parts = raw.split(regex);

    for (const part of parts) {
      if (part.includes("--") && part.trim().length < 5) continue;

      const bodyStart = part.indexOf("\r\n\r\n");
      if (bodyStart === -1) continue;

      // Extraire les pièces jointes
      if (isAttachment(part)) {
        const filename = getFilename(part);
        if (filename) {
          const contentType = getContentType(part);
          const isB64 = /Content-Transfer-Encoding:\s*base64/i.test(part);

          let content = part.substring(bodyStart + 4).trim();
          const endBoundary = content.lastIndexOf("\r\n--");
          if (endBoundary > 0) content = content.substring(0, endBoundary);

          if (isB64) {
            try {
              const binary = atob(content.replace(/\s/g, ""));
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }

              attachments.push({
                filename,
                contentType,
                size: bytes.length,
                data: bytes,
              });
            } catch (e) {
              console.error("Error decoding attachment:", filename, e);
            }
          }
        }
        continue;
      }

      // Extraire le texte/HTML comme avant
      const charset = getCharset(part);
      const isQP = /Content-Transfer-Encoding:\s*quoted-printable/i.test(part);
      const isB64 = /Content-Transfer-Encoding:\s*base64/i.test(part);
      const isHtml = /Content-Type:\s*text\/html/i.test(part);
      const isText = /Content-Type:\s*text\/plain/i.test(part);

      let content = part.substring(bodyStart + 4).trim();
      const endBoundary = content.lastIndexOf("\r\n--");
      if (endBoundary > 0) content = content.substring(0, endBoundary);

      if (isQP) content = decodeQuotedPrintable(content, charset);
      else if (isB64) content = decodeBase64(content, charset);

      if (isHtml && !html) html = content;
      else if (isText && !text) text = content;
    }
  } else {
    const charset = getCharset(raw);
    const isQP = /Content-Transfer-Encoding:\s*quoted-printable/i.test(raw);
    const isB64 = /Content-Transfer-Encoding:\s*base64/i.test(raw);
    const isHtml = /Content-Type:\s*text\/html/i.test(raw);

    let content = raw;
    const bodyStart = raw.indexOf("\r\n\r\n");
    if (bodyStart !== -1) content = raw.substring(bodyStart + 4);

    if (isQP) content = decodeQuotedPrintable(content, charset);
    else if (isB64) content = decodeBase64(content, charset);

    if (isHtml) html = content;
    else text = content;
  }

  if (html && !text) {
    text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }

  return { text, html, attachments };
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

  private async readUntilTag(tag: string): Promise<string> {
    if (!this.reader) throw new Error("Not connected");
    let response = "";
    const tagPattern = new RegExp(`^${tag} `, "m");
    const startTime = Date.now();
    while (!tagPattern.test(response)) {
      if (Date.now() - startTime > 30000) throw new Error("IMAP timeout");
      const { value, done } = await this.reader.read();
      if (done) break;
      response += this.decoder.decode(value);
    }
    return response;
  }

  private async sendCommand(command: string): Promise<string> {
    if (!this.conn) throw new Error("Not connected");
    const tag = `A${++this.tagCounter}`;
    await this.conn.write(this.encoder.encode(`${tag} ${command}\r\n`));
    return await this.readUntilTag(tag);
  }

  async login(u: string, p: string): Promise<boolean> {
    return (await this.sendCommand(`LOGIN "${u}" "${p}"`)).includes("OK");
  }

  async selectMailbox(m: string): Promise<{ exists: number }> {
    const r = await this.sendCommand(`SELECT "${m}"`);
    const match = r.match(/(\d+) EXISTS/);
    return { exists: match ? parseInt(match[1]) : 0 };
  }

  async fetchHeaders(
    start: number,
    end: number,
  ): Promise<
    Array<
      { uid: string; subject: string; from: string; date: string; seq: number }
    >
  > {
    const emails: Array<
      { uid: string; subject: string; from: string; date: string; seq: number }
    > = [];
    const response = await this.sendCommand(
      `FETCH ${start}:${end} (UID BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)])`,
    );
    const parts = response.split(/\* (\d+) FETCH/);
    for (let i = 1; i < parts.length; i += 2) {
      const seq = parseInt(parts[i]);
      const part = parts[i + 1] || "";
      const uidMatch = part.match(/UID (\d+)/);
      const fromMatch = part.match(/From:\s*(.+?)(?:\r\n(?!\s)|$)/is);
      const subjectMatch = part.match(/Subject:\s*(.+?)(?:\r\n(?!\s)|$)/is);
      const dateMatch = part.match(/Date:\s*(.+?)(?:\r\n|$)/i);
      const msgIdMatch = part.match(/Message-ID:\s*<?([^>\s]+)>?/i);
      if (uidMatch) {
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

  async fetchFullEmail(
    seq: number,
  ): Promise<{ text: string; html: string; attachments: EmailAttachment[] }> {
    try {
      const response = await this.sendCommand(`FETCH ${seq} BODY.PEEK[]`);
      const bodyMatch = response.match(/BODY\[\]\s*\{(\d+)\}\r\n([\s\S]*)/);
      if (bodyMatch) return extractEmailContent(bodyMatch[2]);
      return { text: "", html: "", attachments: [] };
    } catch {
      return { text: "", html: "", attachments: [] };
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
    const stats = {
      mailbox_total: 0,
      retrieved: 0,
      inserted: 0,
      skipped: 0,
      errors: 0,
    };

    const mailboxUser = Deno.env.get("IMAP_USER") ||
      Deno.env.get("SMTP_USER") || Deno.env.get("HMAIL_IMAP_USER") ||
      "tcerda@xcr.fr";
    const mailboxHost = Deno.env.get("IMAP_HOST") ||
      Deno.env.get("HMAIL_IMAP_HOST") || Deno.env.get("IONOS_IMAP_HOST") ||
      "mail.xcr.fr";
    const mailboxPort = parseInt(
      Deno.env.get("IMAP_PORT") || Deno.env.get("HMAIL_IMAP_PORT") ||
        Deno.env.get("IONOS_IMAP_PORT") || "993",
    );
    const mailboxPassword = Deno.env.get("IMAP_PASS") ||
      Deno.env.get("SMTP_PASS") || Deno.env.get("HMAIL_IMAP_PASS") ||
      Deno.env.get("IONOS_EMAIL_PASSWORD") || "";

    const { data: account } = await supabase.from("email_accounts").select("*")
      .eq("email", mailboxUser).maybeSingle();
    if (!account?.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Compte email non configure" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!account.imap_password_encrypted && !mailboxPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Mot de passe IMAP non configure",
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
        account.imap_host || mailboxHost,
        account.imap_port || mailboxPort,
      )
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "Connexion IMAP echouee" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (
      !await imap.login(
        account.imap_username || mailboxUser,
        account.imap_password_encrypted || mailboxPassword,
      )
    ) {
      await imap.close();
      return new Response(
        JSON.stringify({ success: false, error: "Auth IMAP echouee" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const mailbox = await imap.selectMailbox("INBOX");
    stats.mailbox_total = mailbox.exists;

    if (mailbox.exists > 0) {
      const BATCH_SIZE = 15;
      const start = Math.max(1, mailbox.exists - (BATCH_SIZE - 1));
      const emails = await imap.fetchHeaders(start, mailbox.exists);

      for (const email of emails) {
        stats.retrieved++;
        const { data: existing } = await supabase.from("email_messages").select(
          "id",
        ).eq("message_id", email.uid).maybeSingle();
        if (existing) {
          stats.skipped++;
          continue;
        }

        const fromMatch = email.from.match(
          /(?:"?([^"<]+)"?\s*)?<?([^>\s]+@[^>\s]+)>?/,
        );
        let receivedAt: string;
        try {
          const d = new Date(email.date);
          receivedAt = isNaN(d.getTime())
            ? new Date().toISOString()
            : d.toISOString();
        } catch {
          receivedAt = new Date().toISOString();
        }

        const { text, html, attachments } = await imap.fetchFullEmail(
          email.seq,
        );

        // Uploader les pièces jointes et préparer les métadonnées
        const attachmentsMetadata = [];
        for (const attachment of attachments) {
          try {
            const fileName =
              `${account.id}/${Date.now()}_${attachment.filename}`;
            const { error: uploadError } = await supabase.storage
              .from("email-attachments")
              .upload(fileName, attachment.data, {
                contentType: attachment.contentType,
                upsert: false,
              });

            if (!uploadError) {

              attachmentsMetadata.push({
                filename: attachment.filename,
                contentType: attachment.contentType,
                size: attachment.size,
                path: fileName,
                bucket: "email-attachments",
              });
            }
          } catch (attachError) {
            console.error(
              "Error uploading attachment:",
              attachment.filename,
              attachError,
            );
          }
        }

        const { data: insertedEmail, error } = await supabase.from(
          "email_messages",
        ).insert({
          account_id: account.id,
          message_id: email.uid,
          from_email: fromMatch?.[2]?.trim() || email.from,
          from_name: fromMatch?.[1]?.trim() || "",
          to_emails: [account.imap_username || mailboxUser],
          subject: email.subject,
          body_text: text.substring(0, 50000),
          body_html: html.substring(0, 200000),
          received_at: receivedAt,
          direction: "inbound",
          status: "received",
          provider: "hmail-imap",
          is_read: false,
          attachments: attachmentsMetadata,
        }).select().single();

        if (error) {
          stats.errors++;
        } else {
          stats.inserted++;

          // Créer les entrées email_attachments pour chaque pièce jointe
          if (insertedEmail && attachmentsMetadata.length > 0) {
            for (const att of attachmentsMetadata) {
              await supabase.from("email_attachments").insert({
                email_message_id: insertedEmail.id,
                filename: att.filename,
                content_type: att.contentType,
                file_size: att.size,
                storage_path: att.path,
                status: "pending_validation",
              });
            }
          }
        }
      }
    }

    await imap.logout();
    await supabase.from("email_accounts").update({
      last_sync_at: new Date().toISOString(),
    }).eq("id", account.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync: ${stats.inserted} nouveaux emails`,
        stats,
        provider: "ionos-imap-native",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
