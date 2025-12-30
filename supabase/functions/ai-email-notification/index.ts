import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: recentDecisions } = await supabase
      .from('ai_decisions_log')
      .select('*')
      .eq('notification_sent', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!recentDecisions || recentDecisions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucune décision à notifier' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: performanceData } = await supabase.rpc('evaluate_global_performance');
    const performance = performanceData || {};

    const { data: todayLeads } = await supabase
      .from('leads')
      .select('*')
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    const leadsToday = todayLeads?.length || 0;

    const emailSubject = `🤖 IA MASTER - ${recentDecisions.length} décisions autonomes prises`;

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .decision { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 10px 0; }
    .critical { border-left-color: #dc3545; background: #fff5f5; }
    .success { border-left-color: #28a745; background: #f0fff4; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px 15px; background: #e9ecef; border-radius: 5px; }
    .footer { background: #f8f9fa; padding: 15px; text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 IA MASTER TAXIASSUR</h1>
    <p>Rapport d'activité autonome</p>
  </div>
  
  <div class="content">
    <h2>📊 Performance Actuelle</h2>
    <div class="metric">
      <strong>Leads aujourd'hui:</strong> ${leadsToday}
    </div>
    <div class="metric">
      <strong>Tendance:</strong> ${performance.trend || 'N/A'}
    </div>
    <div class="metric">
      <strong>Croissance:</strong> ${performance.growth_rate ? performance.growth_rate.toFixed(1) + '%' : 'N/A'}
    </div>

    <h2>🎯 Décisions IA Prises (${recentDecisions.length})</h2>
    ${recentDecisions.map(d => `
      <div class="decision ${d.decision_type.includes('critical') || d.decision_type.includes('zero') ? 'critical' : 'success'}">
        <h3>${d.decision_type.toUpperCase()}</h3>
        <p><strong>Action:</strong> ${d.action_taken}</p>
        <p><strong>Confiance:</strong> ${d.confidence_score}%</p>
        <p><strong>Statut:</strong> ${d.status}</p>
        <p><strong>Date:</strong> ${new Date(d.created_at).toLocaleString('fr-FR')}</p>
        ${d.error_message ? `<p style="color: #dc3545;"><strong>Erreur:</strong> ${d.error_message}</p>` : ''}
      </div>
    `).join('')}

    <h2>🚀 Prochaines Actions</h2>
    <ul>
      <li>L'IA Master s'exécute automatiquement toutes les heures</li>
      <li>Analyse continue des leads, conversions et SEO</li>
      <li>Optimisation automatique du contenu et des pop-ups</li>
      <li>Création de contenu SEO si performance faible</li>
      <li>Ajustement des stratégies de conversion en temps réel</li>
    </ul>

    <h2>🎯 Objectif</h2>
    <p><strong style="font-size: 1.2em; color: #667eea;">
      DEVENIR LE LEADER #1 DE L'ASSURANCE TAXI EN FRANCE
    </strong></p>
    <p>L'IA travaille 24/7 pour atteindre cet objectif avec une autonomie totale.</p>
  </div>

  <div class="footer">
    <p>Ce rapport est généré automatiquement par l'IA Master de TaxiAssur</p>
    <p>Pour consulter les détails complets, connectez-vous au backoffice</p>
    <p style="margin-top: 10px; font-size: 0.8em; color: #999;">
      Système IA autonome - Toutes actions sont éthiques et conformes aux objectifs TaxiAssur
    </p>
  </div>
</body>
</html>
    `.trim();

    console.log('📧 Email HTML généré, longueur:', emailBody.length);
    console.log('📧 Destinataire: team@taxiassur.com');
    console.log('📧 Note: Configuration SMTP requise pour envoi réel');

    for (const decision of recentDecisions) {
      await supabase
        .from('ai_decisions_log')
        .update({ notification_sent: true })
        .eq('id', decision.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_prepared: true,
        decisions_notified: recentDecisions.length,
        recipient: 'team@taxiassur.com',
        subject: emailSubject,
        preview: emailBody.substring(0, 500) + '...',
        note: 'Email HTML prêt - Configuration SMTP nécessaire pour envoi automatique',
        alternative: 'Consultez le dashboard IA dans le backoffice pour voir les décisions en temps réel'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('❌ Erreur notification email:', error);

    return new Response(
      JSON.stringify({
        error: 'Email Notification Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});