import { isInternalRequest } from "../_shared/internal-auth.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import puppeteer from "npm:puppeteer-core@21.6.1";
import chromium from "https://deno.land/x/puppeteer@16.2.0/src/deno/Puppeteer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImportJob {
  id: string;
  credential_id: string;
  client_id: string;
  contract_number: string;
}

interface Credential {
  company_name: string;
  portal_url: string;
  username: string;
  password_encrypted: string;
  additional_credentials: any;
}

interface ImportResult {
  company: string;
  documents_imported: number;
  data_imported: number;
  errors?: string[];
}

Deno.serve(async (req: Request) => {
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

    const { job_id } = await req.json();

    const { data: job, error: jobError } = await supabase
      .from("web_import_jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found");
    }

    const { data: credential, error: credError } = await supabase
      .from("insurance_web_credentials")
      .select("*")
      .eq("id", job.credential_id)
      .single();

    if (credError || !credential) {
      throw new Error("Credentials not found");
    }

    await supabase
      .from("web_import_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", job_id);

    let result;
    switch (credential.company_name) {
      case "solly_azar":
        result = await importFromSollyAzar(supabase, job, credential);
        break;
      case "generali":
        result = await importFromGenerali(supabase, job, credential);
        break;
      case "2ma":
        result = await importFrom2MA(supabase, job, credential);
        break;
      case "zephir":
        result = await importFromZephir(supabase, job, credential);
        break;
      case "plus_simple":
        result = await importFromPlusSimple(supabase, job, credential);
        break;
      default:
        throw new Error(`Unknown company: ${credential.company_name}`);
    }

    await supabase.rpc("complete_import_job", {
      p_job_id: job_id,
      p_success: true,
      p_error_message: null,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in web import:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function importFromSollyAzar(
  supabase: any,
  job: ImportJob,
  credential: Credential,
): Promise<ImportResult> {
  const errors: string[] = [];
  let documentsImported = 0;
  let dataImported = 0;

  try {
    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 10,
      p_log_message: "Lancement du navigateur...",
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 20,
      p_log_message: "Connexion au portail Solly Azar...",
    });

    await page.goto(credential.portal_url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.type("#username", credential.username);
    await page.type("#password", credential.password_encrypted);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 40,
      p_log_message: "Connexion réussie, recherche du contrat...",
    });

    if (job.contract_number) {
      await page.type("#contract-search", job.contract_number);
      await page.click('button[type="search"]');
      await page.waitForSelector(".contract-details", { timeout: 10000 });
    }

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 60,
      p_log_message: "Extraction des données du contrat...",
    });

    const contractData = await page.evaluate(() => {
      return {
        contract_number:
          document.querySelector(".contract-number")?.textContent?.trim() || "",
        subscription_date:
          document.querySelector(".subscription-date")?.textContent?.trim() ||
          "",
        expiry_date:
          document.querySelector(".expiry-date")?.textContent?.trim() || "",
        premium_amount:
          document.querySelector(".premium-amount")?.textContent?.trim() || "",
        vehicle_registration:
          document.querySelector(".vehicle-registration")?.textContent
            ?.trim() || "",
        vehicle_brand:
          document.querySelector(".vehicle-brand")?.textContent?.trim() || "",
      };
    });

    const dataFields = [
      {
        type: "contract_info",
        field: "contract_number",
        value: contractData.contract_number,
      },
      {
        type: "contract_info",
        field: "subscription_date",
        value: contractData.subscription_date,
      },
      {
        type: "contract_info",
        field: "expiry_date",
        value: contractData.expiry_date,
      },
      {
        type: "contract_info",
        field: "premium_amount",
        value: contractData.premium_amount,
      },
      {
        type: "vehicle_info",
        field: "registration",
        value: contractData.vehicle_registration,
      },
      {
        type: "vehicle_info",
        field: "brand",
        value: contractData.vehicle_brand,
      },
    ];

    for (const field of dataFields) {
      if (field.value) {
        await supabase.from("web_import_data").insert({
          job_id: job.id,
          client_id: job.client_id,
          data_type: field.type,
          field_name: field.field,
          field_value: field.value,
        });
        dataImported++;
      }
    }

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 80,
      p_log_message: "Téléchargement des documents...",
    });

    const documentLinks = await page.$$eval(
      ".document-link",
      (links) =>
        links.map((link) => ({
          name: link.textContent?.trim() || "",
          url: (link as HTMLAnchorElement).href,
        })),
    );

    for (const doc of documentLinks) {
      try {
        const docPage = await browser.newPage();
        const response = await docPage.goto(doc.url, {
          waitUntil: "networkidle2",
        });

        if (response && response.ok()) {
          const buffer = await response.buffer();

          const fileName = `${job.client_id}/${Date.now()}_${
            doc.name.replace(/[^a-zA-Z0-9._-]/g, "_")
          }.pdf`;

          const { error: uploadError } = await supabase.storage
            .from("client-documents")
            .upload(fileName, buffer, {
              contentType: "application/pdf",
              upsert: false,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("client-documents")
              .getPublicUrl(fileName);

            await supabase.from("web_import_documents").insert({
              job_id: job.id,
              client_id: job.client_id,
              document_type: "contrat",
              document_name: doc.name,
              file_path: fileName,
              file_url: publicUrl,
              file_size: buffer.length,
              mime_type: "application/pdf",
              source_url: doc.url,
              status: "downloaded",
            });

            documentsImported++;
          } else {
            errors.push(`Erreur upload ${doc.name}: ${uploadError.message}`);
          }
        }

        await docPage.close();
      } catch (err) {
        errors.push(`Erreur téléchargement ${doc.name}: ${err.message}`);
      }
    }

    await browser.close();

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 100,
      p_log_message:
        `Import terminé: ${documentsImported} documents, ${dataImported} données`,
    });
  } catch (error) {
    errors.push(`Erreur générale: ${error.message}`);
    console.error("Error in Solly Azar import:", error);
  }

  return {
    company: "solly_azar",
    documents_imported: documentsImported,
    data_imported: dataImported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function importFromGenerali(
  supabase: any,
  job: ImportJob,
  credential: Credential,
): Promise<ImportResult> {
  const errors: string[] = [];
  let documentsImported = 0;
  let dataImported = 0;

  try {
    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 10,
      p_log_message: "Lancement du navigateur...",
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 20,
      p_log_message: "Connexion au portail Generali...",
    });

    await page.goto(credential.portal_url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.waitForSelector('input[name="login"]', { timeout: 10000 });
    await page.type('input[name="login"]', credential.username);
    await page.type('input[name="password"]', credential.password_encrypted);
    await page.click("button.submit-login");

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 40,
      p_log_message: "Connexion réussie, navigation vers les contrats...",
    });

    await page.goto(`${credential.portal_url}/mes-contrats`, {
      waitUntil: "networkidle2",
    });

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 60,
      p_log_message: "Extraction des données...",
    });

    const contractData = await page.evaluate(() => {
      const contracts = Array.from(document.querySelectorAll(".contract-item"));
      return contracts.map((contract) => ({
        number:
          contract.querySelector(".numero-contrat")?.textContent?.trim() || "",
        type: contract.querySelector(".type-contrat")?.textContent?.trim() ||
          "",
        status: contract.querySelector(".statut")?.textContent?.trim() || "",
        premium: contract.querySelector(".prime")?.textContent?.trim() || "",
      }));
    });

    for (const contract of contractData) {
      if (contract.number) {
        await supabase.from("web_import_data").insert({
          job_id: job.id,
          client_id: job.client_id,
          data_type: "contract_info",
          field_name: "contract_number",
          field_value: contract.number,
          metadata: {
            type: contract.type,
            status: contract.status,
            premium: contract.premium,
          },
        });
        dataImported++;
      }
    }

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 80,
      p_log_message: "Téléchargement des documents...",
    });

    const documents = await page.$$eval(
      ".document-download",
      (links) =>
        links.map((link) => ({
          name: link.getAttribute("data-document-name") ||
            link.textContent?.trim() || "",
          url: (link as HTMLAnchorElement).href,
          type: link.getAttribute("data-document-type") || "document",
        })),
    );

    for (const doc of documents) {
      try {
        const docPage = await browser.newPage();
        const response = await docPage.goto(doc.url, {
          waitUntil: "networkidle2",
        });

        if (response && response.ok()) {
          const buffer = await response.buffer();
          const fileName = `${job.client_id}/generali_${Date.now()}_${
            doc.name.replace(/[^a-zA-Z0-9._-]/g, "_")
          }.pdf`;

          const { error: uploadError } = await supabase.storage
            .from("client-documents")
            .upload(fileName, buffer, {
              contentType: "application/pdf",
              upsert: false,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("client-documents")
              .getPublicUrl(fileName);

            await supabase.from("web_import_documents").insert({
              job_id: job.id,
              client_id: job.client_id,
              document_type: doc.type,
              document_name: doc.name,
              file_path: fileName,
              file_url: publicUrl,
              file_size: buffer.length,
              mime_type: "application/pdf",
              source_url: doc.url,
              status: "downloaded",
            });

            documentsImported++;
          } else {
            errors.push(`Erreur upload ${doc.name}: ${uploadError.message}`);
          }
        }

        await docPage.close();
      } catch (err) {
        errors.push(`Erreur téléchargement ${doc.name}: ${err.message}`);
      }
    }

    await browser.close();

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 100,
      p_log_message:
        `Import terminé: ${documentsImported} documents, ${dataImported} données`,
    });
  } catch (error) {
    errors.push(`Erreur générale: ${error.message}`);
    console.error("Error in Generali import:", error);
  }

  return {
    company: "generali",
    documents_imported: documentsImported,
    data_imported: dataImported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function importFrom2MA(
  supabase: any,
  job: ImportJob,
  credential: Credential,
): Promise<ImportResult> {
  const errors: string[] = [];
  let documentsImported = 0;
  let dataImported = 0;

  try {
    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 10,
      p_log_message: "Lancement du navigateur...",
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 20,
      p_log_message: "Connexion à l'extranet 2MA...",
    });

    await page.goto(credential.portal_url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.waitForSelector("#identifiant", { timeout: 10000 });
    await page.type("#identifiant", credential.username);
    await page.type("#motdepasse", credential.password_encrypted);
    await page.click("#btn-connexion");

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 40,
      p_log_message: "Connexion réussie, accès aux contrats...",
    });

    await page.goto(`${credential.portal_url}/contrats`, {
      waitUntil: "networkidle2",
    });

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 60,
      p_log_message: "Extraction des données...",
    });

    const contractInfo = await page.evaluate(() => {
      return {
        contract_number:
          document.querySelector(".ref-contrat")?.textContent?.trim() || "",
        client_name:
          document.querySelector(".nom-assure")?.textContent?.trim() || "",
        start_date:
          document.querySelector(".date-effet")?.textContent?.trim() || "",
        vehicle_plate:
          document.querySelector(".immatriculation")?.textContent?.trim() || "",
        vehicle_model:
          document.querySelector(".vehicule-modele")?.textContent?.trim() || "",
      };
    });

    const fields = [
      {
        type: "contract_info",
        field: "contract_number",
        value: contractInfo.contract_number,
      },
      {
        type: "contract_info",
        field: "client_name",
        value: contractInfo.client_name,
      },
      {
        type: "contract_info",
        field: "start_date",
        value: contractInfo.start_date,
      },
      {
        type: "vehicle_info",
        field: "plate",
        value: contractInfo.vehicle_plate,
      },
      {
        type: "vehicle_info",
        field: "model",
        value: contractInfo.vehicle_model,
      },
    ];

    for (const field of fields) {
      if (field.value) {
        await supabase.from("web_import_data").insert({
          job_id: job.id,
          client_id: job.client_id,
          data_type: field.type,
          field_name: field.field,
          field_value: field.value,
        });
        dataImported++;
      }
    }

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 80,
      p_log_message: "Téléchargement des documents...",
    });

    const docs = await page.$$eval(
      ".liste-documents a.doc-link",
      (links) =>
        links.map((link) => ({
          name: link.textContent?.trim() || "",
          url: (link as HTMLAnchorElement).href,
        })),
    );

    for (const doc of docs) {
      try {
        const docPage = await browser.newPage();
        const response = await docPage.goto(doc.url, {
          waitUntil: "networkidle2",
        });

        if (response && response.ok()) {
          const buffer = await response.buffer();
          const fileName = `${job.client_id}/2ma_${Date.now()}_${
            doc.name.replace(/[^a-zA-Z0-9._-]/g, "_")
          }.pdf`;

          const { error: uploadError } = await supabase.storage
            .from("client-documents")
            .upload(fileName, buffer, {
              contentType: "application/pdf",
              upsert: false,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("client-documents")
              .getPublicUrl(fileName);

            await supabase.from("web_import_documents").insert({
              job_id: job.id,
              client_id: job.client_id,
              document_type: "contrat",
              document_name: doc.name,
              file_path: fileName,
              file_url: publicUrl,
              file_size: buffer.length,
              mime_type: "application/pdf",
              source_url: doc.url,
              status: "downloaded",
            });

            documentsImported++;
          }
        }

        await docPage.close();
      } catch (err) {
        errors.push(`Erreur téléchargement ${doc.name}: ${err.message}`);
      }
    }

    await browser.close();

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 100,
      p_log_message:
        `Import terminé: ${documentsImported} documents, ${dataImported} données`,
    });
  } catch (error) {
    errors.push(`Erreur générale: ${error.message}`);
    console.error("Error in 2MA import:", error);
  }

  return {
    company: "2ma",
    documents_imported: documentsImported,
    data_imported: dataImported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function importFromZephir(
  supabase: any,
  job: ImportJob,
  credential: Credential,
): Promise<ImportResult> {
  const errors: string[] = [];
  let documentsImported = 0;
  let dataImported = 0;

  try {
    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 10,
      p_log_message: "Lancement du navigateur...",
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 20,
      p_log_message: "Connexion au portail Zephir...",
    });

    await page.goto(credential.portal_url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.waitForSelector("input#email", { timeout: 10000 });
    await page.type("input#email", credential.username);
    await page.type("input#password", credential.password_encrypted);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 40,
      p_log_message: "Connexion réussie, récupération des contrats...",
    });

    await page.goto(`${credential.portal_url}/mes-polices`, {
      waitUntil: "networkidle2",
    });

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 60,
      p_log_message: "Extraction des données...",
    });

    const policiesData = await page.evaluate(() => {
      const policies = Array.from(document.querySelectorAll(".police-card"));
      return policies.map((policy) => ({
        policy_number:
          policy.querySelector(".numero-police")?.textContent?.trim() || "",
        vehicle_registration:
          policy.querySelector(".immat")?.textContent?.trim() || "",
        coverage_type: policy.querySelector(".formule")?.textContent?.trim() ||
          "",
        annual_premium:
          policy.querySelector(".cotisation")?.textContent?.trim() || "",
        next_due_date: policy.querySelector(".echeance")?.textContent?.trim() ||
          "",
      }));
    });

    for (const policy of policiesData) {
      if (policy.policy_number) {
        const fields = [
          {
            type: "contract_info",
            field: "policy_number",
            value: policy.policy_number,
          },
          {
            type: "contract_info",
            field: "coverage_type",
            value: policy.coverage_type,
          },
          {
            type: "contract_info",
            field: "annual_premium",
            value: policy.annual_premium,
          },
          {
            type: "contract_info",
            field: "next_due_date",
            value: policy.next_due_date,
          },
          {
            type: "vehicle_info",
            field: "registration",
            value: policy.vehicle_registration,
          },
        ];

        for (const field of fields) {
          if (field.value) {
            await supabase.from("web_import_data").insert({
              job_id: job.id,
              client_id: job.client_id,
              data_type: field.type,
              field_name: field.field,
              field_value: field.value,
            });
            dataImported++;
          }
        }
      }
    }

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 80,
      p_log_message: "Téléchargement des documents...",
    });

    const documents = await page.$$eval(
      ".documents-list .doc-item",
      (items) =>
        items.map((item) => ({
          name: item.querySelector(".doc-title")?.textContent?.trim() || "",
          url: item.querySelector("a.download-btn")?.getAttribute("href") || "",
          type: item.querySelector(".doc-type")?.textContent?.trim() ||
            "document",
        })),
    );

    for (const doc of documents) {
      if (!doc.url) continue;

      try {
        const fullUrl = doc.url.startsWith("http")
          ? doc.url
          : `${credential.portal_url}${doc.url}`;
        const docPage = await browser.newPage();
        const response = await docPage.goto(fullUrl, {
          waitUntil: "networkidle2",
        });

        if (response && response.ok()) {
          const buffer = await response.buffer();
          const fileName = `${job.client_id}/zephir_${Date.now()}_${
            doc.name.replace(/[^a-zA-Z0-9._-]/g, "_")
          }.pdf`;

          const { error: uploadError } = await supabase.storage
            .from("client-documents")
            .upload(fileName, buffer, {
              contentType: "application/pdf",
              upsert: false,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("client-documents")
              .getPublicUrl(fileName);

            await supabase.from("web_import_documents").insert({
              job_id: job.id,
              client_id: job.client_id,
              document_type: doc.type,
              document_name: doc.name,
              file_path: fileName,
              file_url: publicUrl,
              file_size: buffer.length,
              mime_type: "application/pdf",
              source_url: fullUrl,
              status: "downloaded",
            });

            documentsImported++;
          }
        }

        await docPage.close();
      } catch (err) {
        errors.push(`Erreur téléchargement ${doc.name}: ${err.message}`);
      }
    }

    await browser.close();

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 100,
      p_log_message:
        `Import terminé: ${documentsImported} documents, ${dataImported} données`,
    });
  } catch (error) {
    errors.push(`Erreur générale: ${error.message}`);
    console.error("Error in Zephir import:", error);
  }

  return {
    company: "zephir",
    documents_imported: documentsImported,
    data_imported: dataImported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function importFromPlusSimple(
  supabase: any,
  job: ImportJob,
  credential: Credential,
): Promise<ImportResult> {
  const errors: string[] = [];
  let documentsImported = 0;
  let dataImported = 0;

  try {
    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 10,
      p_log_message: "Lancement du navigateur...",
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 20,
      p_log_message: "Connexion à l'espace pro +Simple...",
    });

    await page.goto(credential.portal_url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.waitForSelector("#login-email", { timeout: 10000 });
    await page.type("#login-email", credential.username);
    await page.type("#login-password", credential.password_encrypted);
    await page.click(".btn-login");

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 40,
      p_log_message: "Connexion réussie, accès aux dossiers...",
    });

    await page.goto(`${credential.portal_url}/dossiers`, {
      waitUntil: "networkidle2",
    });

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 60,
      p_log_message: "Extraction des données...",
    });

    const dossiers = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".dossier-item"));
      return items.map((item) => ({
        reference: item.querySelector(".ref-dossier")?.textContent?.trim() ||
          "",
        client: item.querySelector(".nom-client")?.textContent?.trim() || "",
        vehicle: item.querySelector(".vehicule")?.textContent?.trim() || "",
        status: item.querySelector(".statut-dossier")?.textContent?.trim() ||
          "",
        effective_date:
          item.querySelector(".date-effet")?.textContent?.trim() || "",
      }));
    });

    for (const dossier of dossiers) {
      if (dossier.reference) {
        const fields = [
          {
            type: "contract_info",
            field: "reference",
            value: dossier.reference,
          },
          {
            type: "contract_info",
            field: "client_name",
            value: dossier.client,
          },
          { type: "contract_info", field: "status", value: dossier.status },
          {
            type: "contract_info",
            field: "effective_date",
            value: dossier.effective_date,
          },
          { type: "vehicle_info", field: "vehicle", value: dossier.vehicle },
        ];

        for (const field of fields) {
          if (field.value) {
            await supabase.from("web_import_data").insert({
              job_id: job.id,
              client_id: job.client_id,
              data_type: field.type,
              field_name: field.field,
              field_value: field.value,
            });
            dataImported++;
          }
        }
      }
    }

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 80,
      p_log_message: "Téléchargement des documents...",
    });

    const documents = await page.$$eval(
      ".document-list a.doc-download",
      (links) =>
        links.map((link) => ({
          name: link.getAttribute("data-filename") ||
            link.textContent?.trim() || "",
          url: (link as HTMLAnchorElement).href,
          type: link.getAttribute("data-doctype") || "document",
        })),
    );

    for (const doc of documents) {
      try {
        const docPage = await browser.newPage();
        const response = await docPage.goto(doc.url, {
          waitUntil: "networkidle2",
        });

        if (response && response.ok()) {
          const buffer = await response.buffer();
          const fileName = `${job.client_id}/plussimple_${Date.now()}_${
            doc.name.replace(/[^a-zA-Z0-9._-]/g, "_")
          }.pdf`;

          const { error: uploadError } = await supabase.storage
            .from("client-documents")
            .upload(fileName, buffer, {
              contentType: "application/pdf",
              upsert: false,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("client-documents")
              .getPublicUrl(fileName);

            await supabase.from("web_import_documents").insert({
              job_id: job.id,
              client_id: job.client_id,
              document_type: doc.type,
              document_name: doc.name,
              file_path: fileName,
              file_url: publicUrl,
              file_size: buffer.length,
              mime_type: "application/pdf",
              source_url: doc.url,
              status: "downloaded",
            });

            documentsImported++;
          }
        }

        await docPage.close();
      } catch (err) {
        errors.push(`Erreur téléchargement ${doc.name}: ${err.message}`);
      }
    }

    await browser.close();

    await supabase.rpc("update_import_progress", {
      p_job_id: job.id,
      p_progress: 100,
      p_log_message:
        `Import terminé: ${documentsImported} documents, ${dataImported} données`,
    });
  } catch (error) {
    errors.push(`Erreur générale: ${error.message}`);
    console.error("Error in +Simple import:", error);
  }

  return {
    company: "plus_simple",
    documents_imported: documentsImported,
    data_imported: dataImported,
    errors: errors.length > 0 ? errors : undefined,
  };
}
