import { createClient } from "jsr:@supabase/supabase-js@2";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: string;
}

interface ProcessEmailPayload {
  email_id: string;
  attachments: EmailAttachment[];
}

const MAX_ATTACHMENTS = 25;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeFileName(value: unknown): string {
  const normalized = String(value || "attachment.bin")
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^[._-]+/, "")
    .slice(0, 160);
  return normalized || "attachment.bin";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (!(await isInternalRequest(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: ProcessEmailPayload = await req.json();
    const { email_id, attachments } = payload;
    if (!UUID_PATTERN.test(email_id) || !Array.isArray(attachments)) {
      throw new Error("Invalid attachment payload");
    }
    if (attachments.length === 0 || attachments.length > MAX_ATTACHMENTS) {
      throw new Error("Attachment count out of bounds");
    }

    const { data: emailData, error: emailError } = await supabase
      .from("email_messages")
      .select("lead_id, from_email, subject")
      .eq("id", email_id)
      .single();

    if (emailError || !emailData) {
      throw new Error("Email not found");
    }

    const results = [];

    for (const attachment of attachments) {
      try {
        const normalizedName = safeFileName(attachment.filename);
        const fileExt = normalizedName.split(".").pop() || "bin";
        if (
          typeof attachment.content !== "string" ||
          attachment.content.length >
            Math.ceil(MAX_ATTACHMENT_BYTES * 4 / 3) + 4
        ) {
          throw new Error("Attachment payload too large");
        }
        const binaryData = Uint8Array.from(
          atob(attachment.content.replace(/\s/g, "")),
          (c) => c.charCodeAt(0),
        );
        if (
          binaryData.length === 0 || binaryData.length > MAX_ATTACHMENT_BYTES
        ) {
          throw new Error("Attachment size out of bounds");
        }
        const fileName = `${email_id}/${crypto.randomUUID()}_${normalizedName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("email-attachments")
          .upload(fileName, binaryData, {
            contentType: attachment.contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        let autoDetectedType: string | null = null;
        let confidenceScore: number | null = null;
        const lowerFilename = attachment.filename.toLowerCase();

        if (
          lowerFilename.includes("licence") || lowerFilename.includes("taxi")
        ) {
          autoDetectedType = "licence_taxi";
          confidenceScore = 75;
        } else if (
          lowerFilename.includes("permis") || lowerFilename.includes("conduire")
        ) {
          autoDetectedType = "permis_conduire";
          confidenceScore = 80;
        } else if (
          lowerFilename.includes("identite") ||
          lowerFilename.includes("carte") || lowerFilename.includes("cni")
        ) {
          autoDetectedType = "piece_identite";
          confidenceScore = 70;
        } else if (
          lowerFilename.includes("carte") && lowerFilename.includes("grise")
        ) {
          autoDetectedType = "carte_grise";
          confidenceScore = 85;
        } else if (
          lowerFilename.includes("releve") ||
          lowerFilename.includes("information")
        ) {
          autoDetectedType = "releve_information";
          confidenceScore = 65;
        } else if (
          lowerFilename.includes("autorisation") ||
          lowerFilename.includes("stationnement")
        ) {
          autoDetectedType = "autorisation_stationnement";
          confidenceScore = 70;
        } else if (
          lowerFilename.includes("rib") || lowerFilename.includes("bank") ||
          lowerFilename.includes("iban")
        ) {
          autoDetectedType = "rib";
          confidenceScore = 80;
        }

        const { data: attachmentData, error: insertError } = await supabase
          .from("email_attachments")
          .insert({
            email_message_id: email_id,
            lead_id: emailData.lead_id,
            file_name: attachment.filename,
            file_type: fileExt,
            file_size: attachment.size,
            mime_type: attachment.contentType,
            storage_path: fileName,
            storage_bucket: "email-attachments",
            download_url: null,
            classification_status: "pending",
            auto_detected_type: autoDetectedType,
            confidence_score: confidenceScore,
            metadata: {
              email_subject: emailData.subject,
              email_from: emailData.from_email,
              processed_at: new Date().toISOString(),
            },
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          const { error: cleanupError } = await supabase.storage
            .from("email-attachments")
            .remove([fileName]);
          if (cleanupError) {
            console.error("Attachment cleanup error:", cleanupError);
          }
          continue;
        }

        results.push({
          success: true,
          filename: attachment.filename,
          attachment_id: attachmentData.id,
          auto_detected_type: autoDetectedType,
        });
      } catch (err) {
        console.error(
          `Error processing attachment ${attachment.filename}:`,
          err,
        );
        results.push({
          success: false,
          filename: attachment.filename,
          error: err.message,
        });
      }
    }

    if (emailData.lead_id && results.some((r) => r.success)) {
      await supabase.from("crm_notifications").insert({
        lead_id: emailData.lead_id,
        type: "attachment_received",
        title: "Nouvelles pièces jointes reçues",
        message: `${
          results.filter((r) => r.success).length
        } pièce(s) jointe(s) reçue(s) par email en attente de classification`,
        priority: "medium",
        status: "unread",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error processing email attachments:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
