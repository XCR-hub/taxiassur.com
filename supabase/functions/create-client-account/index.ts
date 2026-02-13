import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { lead_id, email, password, first_name, last_name } = await req.json();

    console.log('📝 Création compte client pour lead:', lead_id);

    if (!lead_id || !email || !password) {
      throw new Error("lead_id, email et password sont requis");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier que le lead existe et est converti
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", lead_id)
      .eq("converted_to_client", true)
      .maybeSingle();

    if (leadError || !lead) {
      throw new Error("Lead introuvable ou non converti en client");
    }

    // Vérifier si un compte n'existe pas déjà
    const { data: existingAccount } = await supabase
      .from("client_accounts")
      .select("id")
      .eq("lead_id", lead_id)
      .maybeSingle();

    if (existingAccount) {
      throw new Error("Un compte client existe déjà pour ce lead");
    }

    // Créer l'utilisateur dans auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: first_name || lead.first_name,
        last_name: last_name || lead.last_name,
        role: 'client',
        lead_id: lead_id,
      },
    });

    if (authError) {
      console.error('❌ Erreur création auth:', authError);
      throw authError;
    }

    console.log('✅ Utilisateur auth créé:', authUser.user.id);

    // Créer l'entrée dans client_accounts
    const { data: clientAccount, error: accountError } = await supabase
      .from("client_accounts")
      .insert({
        user_id: authUser.user.id,
        lead_id: lead_id,
        email: email,
        is_active: true,
      })
      .select()
      .single();

    if (accountError) {
      console.error('❌ Erreur création client_account:', accountError);
      // Supprimer l'utilisateur auth si la création du compte échoue
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw accountError;
    }

    console.log('✅ Compte client créé:', clientAccount.id);

    // Log dans les interactions
    await supabase.from("crm_interactions").insert({
      lead_id: lead_id,
      interaction_type: "system",
      channel: "system",
      subject: "Compte client créé",
      content: `Compte client activé pour ${email}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Compte client créé avec succès",
        account_id: clientAccount.id,
        user_id: authUser.user.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Erreur:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
