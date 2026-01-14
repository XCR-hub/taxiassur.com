import { Lead } from './schema';
import { SecureLead } from './security';
import { supabase } from './supabase';
import { logger } from '@/lib/logger';

export async function submitLead(leadData: Lead): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/lead.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leadData)
    });
    
    const result = await response.json();
    
    if (response.ok && (result.success || result.ok)) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Erreur lors de l\'envoi' };
    }
  } catch (error) {
    logger.error('Lead submission error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur de connexion' 
    };
  }
}

export async function submitSecureLead(leadData: SecureLead): Promise<{ success: boolean; error?: string; accessToken?: string }> {
  try {
    const { data: leadRecord, error: dbError } = await supabase
      .from('leads')
      .insert({
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        city: leadData.city,
        status: leadData.status,
        immatriculation: leadData.immatriculation,
        fingerprint: leadData.fingerprint,
        behavior_score: leadData.behaviorScore,
        time_on_page: leadData.timeOnPage,
        source: 'website_form',
        lead_status: 'nouveau'
      })
      .select('*, access_token')
      .single();

    if (dbError) {
      logger.error('Database error:', dbError);
      return { success: false, error: 'Erreur lors de l\'enregistrement' };
    }

    // Send emails via Brevo Edge Function
    const emailPromises = [
      // Email to team@taxiassur.com (principal)
      sendEmail({
        to: 'team@taxiassur.com',
        subject: `[TAXIASSUR] 🚖 NOUVEAU LEAD - ${leadData.name} - ${leadData.city}`,
        text: buildAdminEmail(leadData, 'commercial'),
        html: buildAdminEmailHTML(leadData, 'commercial'),
      }),
      // Email to commercial@xcr.fr
      sendEmail({
        to: 'commercial@xcr.fr',
        subject: `[TAXIASSUR] 🚖 Nouveau lead - ${leadData.name} - ${leadData.city}`,
        text: buildAdminEmail(leadData, 'commercial'),
        html: buildAdminEmailHTML(leadData, 'commercial'),
      }),
      // Email to tcerda@xcr.fr
      sendEmail({
        to: 'tcerda@xcr.fr',
        subject: `[TAXIASSUR] 🚖 Copie lead - ${leadData.name} - ${leadData.city}`,
        text: buildAdminEmail(leadData, 'tcerda'),
        html: buildAdminEmailHTML(leadData, 'tcerda'),
      }),
      // Email to client
      sendEmail({
        to: leadData.email,
        subject: '✅ Demande confirmée ! Votre expert TaxiAssur vous recontacte rapidement',
        text: buildClientEmail(leadData),
        html: buildClientEmailHTML(leadData),
      }),
    ];

    const emailResults = await Promise.allSettled(emailPromises);
    const emailsSent = emailResults.filter(r => r.status === 'fulfilled').length;
    const emailsFailed = emailResults.filter(r => r.status === 'rejected');

    // Log email results
    logger.info(`Emails sent: ${emailsSent}/4`);
    if (emailsFailed.length > 0) {
      logger.error('Some emails failed:', emailsFailed.map(r => r.status === 'rejected' ? r.reason : ''));
    }

    // Update lead with email status
    await supabase
      .from('leads')
      .update({
        emails_sent: emailsSent,
        last_email_sent_at: new Date().toISOString()
      })
      .eq('id', leadRecord.id);

    return {
      success: true,
      accessToken: leadRecord?.access_token,
      emailsSent,
      emailsFailed: emailsFailed.length
    };
  } catch (error) {
    logger.error('Secure lead submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion'
    };
  }
}

async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params,
    });

    if (error) {
      logger.error(`Email error for ${params.to}:`, error);
      throw error;
    }

    if (data && !data.success) {
      logger.error(`Email failed for ${params.to}:`, data.error);
      throw new Error(data.error || 'Email send failed');
    }

    logger.info(`Email sent successfully to ${params.to}`);
    return data;
  } catch (error) {
    logger.error(`Failed to send email to ${params.to}:`, error);
    throw error;
  }
}

function buildAdminEmail(leadData: SecureLead, recipient: 'commercial' | 'tcerda'): string {
  const isCommercial = recipient === 'commercial';

  let message = isCommercial
    ? '🚖 NOUVELLE DEMANDE DE DEVIS TAXIASSUR\n\n'
    : '🚖 COPIE LEAD TAXIASSUR (pour tcerda@xcr.fr)\n\n';

  message += '=== INFORMATIONS CLIENT ===\n';
  message += `Nom complet : ${leadData.name}\n`;
  message += `Email : ${leadData.email}\n`;
  message += `Téléphone : ${leadData.phone}\n`;
  message += `Ville d'activité : ${leadData.city}\n`;
  message += `Statut professionnel : ${leadData.status}\n`;
  if (leadData.immatriculation) {
    message += `Immatriculation : ${leadData.immatriculation}\n`;
  }

  message += '\n=== DÉTAILS TECHNIQUES ===\n';
  message += `Date de demande : ${new Date().toLocaleString('fr-FR')}\n`;
  message += `Score de comportement : ${leadData.behaviorScore}/100\n`;
  message += `Temps sur la page : ${Math.round(leadData.timeOnPage / 1000)}s\n`;

  if (isCommercial) {
    message += '\n=== ACTIONS RECOMMANDÉES ===\n';
    message += '1. 📞 Rappeler le client sous 15 minutes\n';
    message += '2. 📋 Préparer le devis personnalisé\n';
    message += '3. 📧 Envoyer l\'attestation si souscription\n';
  } else {
    message += '\n=== SUIVI ===\n';
    message += 'Ce lead a été transmis à commercial@xcr.fr pour traitement.\n';
    message += 'Ceci est une copie pour information et suivi.\n';
  }

  message += '\n--\n';
  message += 'TaxiAssur.com - Système automatique\n';
  message += 'Excellence Coverage Risks - ORIAS 11 061 425';

  return message;
}

function buildClientEmail(leadData: SecureLead): string {
  let message = `Bonjour ${leadData.name},\n\n`;
  message += '🎉 EXCELLENTE NOUVELLE !\n\n';
  message += 'Votre demande de devis d\'assurance taxi a été confirmée avec succès ✓\n\n';
  message += '🚀 PROCHAINES ÉTAPES :\n';
  message += '• Votre expert TaxiAssur vous recontacte sous 15 minutes\n';
  message += '• Analyse personnalisée de vos besoins spécifiques\n';
  message += '• Proposition des meilleures offres du marché\n';
  message += '• Économies moyennes constatées : 580€/an\n\n';
  message += '📋 DOCUMENTS À PRÉPARER :\n\n';
  message += 'OBLIGATOIRES :\n';
  message += '• Carte professionnelle taxi en cours de validité\n';
  message += '• Permis de conduire (recto-verso)\n';
  message += '• Pièce d\'identité (carte nationale ou passeport)\n';
  message += '• Certificat d\'immatriculation du véhicule taxi\n';
  message += '• Relevé d\'information de votre assureur précédent\n\n';
  message += '💡 ASTUCE PRO : Envoyez ces pièces par email à team@taxiassur.com\n';
  message += 'pour un traitement PRIORITAIRE !\n\n';
  message += '❓ QUESTIONS ? Notre équipe disponible :\n';
  message += '☎️  01 80 85 57 86 (ligne directe)\n';
  message += '📧  team@taxiassur.com (réponse rapide)\n\n';
  message += '🏆 POURQUOI TAXIASSUR ?\n';
  message += '• Courtier agréé ORIAS 11 061 425\n';
  message += '• +100 chauffeurs nous font confiance\n';
  message += '• Tarifs négociés exclusifs (-35% en moyenne)\n';
  message += '• Service expert et réactif\n\n';
  message += 'Merci de votre confiance !\n\n';
  message += 'L\'équipe TaxiAssur.com\n';
  message += 'Excellence Coverage Risks\n\n';
  message += '--\n';
  message += 'TaxiAssur.com - Spécialiste Assurance Taxi\n';
  message += 'https://taxiassur.com\n\n';
  message += 'Cet email a été envoyé depuis contact@em5892.taxiassur.com\n';
  message += 'Pour nous contacter : team@taxiassur.com';

  return message;
}

function buildAdminEmailHTML(leadData: SecureLead, recipient: 'commercial' | 'tcerda'): string {
  const isCommercial = recipient === 'commercial';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .section { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: bold; width: 180px; color: #6b7280; }
        .value { color: #111827; }
        .action-box { background: #dcfce7; border: 2px solid #86efac; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin:0;">🚖 ${isCommercial ? 'NOUVEAU LEAD TAXIASSUR' : 'COPIE LEAD TAXIASSUR'}</h2>
        </div>

        <div class="section">
          <h3 style="color: #f97316; margin-top: 0;">📋 Informations Client</h3>
          <div class="info-row">
            <span class="label">Nom complet :</span>
            <span class="value">${leadData.name}</span>
          </div>
          <div class="info-row">
            <span class="label">Email :</span>
            <span class="value"><a href="mailto:${leadData.email}">${leadData.email}</a></span>
          </div>
          <div class="info-row">
            <span class="label">Téléphone :</span>
            <span class="value"><a href="tel:${leadData.phone}">${leadData.phone}</a></span>
          </div>
          <div class="info-row">
            <span class="label">Ville d'activité :</span>
            <span class="value">${leadData.city}</span>
          </div>
          <div class="info-row">
            <span class="label">Statut :</span>
            <span class="value">${leadData.status}</span>
          </div>
          ${leadData.immatriculation ? `
          <div class="info-row">
            <span class="label">Immatriculation :</span>
            <span class="value">${leadData.immatriculation}</span>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h3 style="color: #f97316; margin-top: 0;">⚙️ Détails Techniques</h3>
          <div class="info-row">
            <span class="label">Date de demande :</span>
            <span class="value">${new Date().toLocaleString('fr-FR')}</span>
          </div>
          <div class="info-row">
            <span class="label">Score comportement :</span>
            <span class="value">${leadData.behaviorScore}/100</span>
          </div>
          <div class="info-row">
            <span class="label">Temps sur la page :</span>
            <span class="value">${Math.round(leadData.timeOnPage / 1000)}s</span>
          </div>
        </div>

        ${isCommercial ? `
        <div class="action-box">
          <h3 style="color: #16a34a; margin-top: 0;">✅ Actions Recommandées</h3>
          <ol style="margin: 10px 0; padding-left: 20px;">
            <li><strong>📞 Rappeler le client sous 15 minutes</strong></li>
            <li>📋 Préparer le devis personnalisé</li>
            <li>📧 Envoyer l'attestation si souscription</li>
          </ol>
        </div>
        ` : `
        <div class="action-box">
          <h3 style="color: #16a34a; margin-top: 0;">📊 Suivi</h3>
          <p style="margin: 10px 0;">Ce lead a été transmis à commercial@xcr.fr pour traitement.<br>
          Ceci est une copie pour information et suivi.</p>
        </div>
        `}

        <div class="footer">
          <p>TaxiAssur.com - Système automatique<br>
          Excellence Coverage Risks - ORIAS 11 061 425</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildClientEmailHTML(leadData: SecureLead): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px; margin-bottom: 30px; }
        .section { background: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .highlight { background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .docs-list { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .docs-list li { margin: 8px 0; }
        .contact-box { background: #fff7ed; border: 2px solid #fb923c; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .btn { display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0 0 10px 0;">✅ Demande Confirmée !</h1>
          <p style="margin: 0; font-size: 18px;">Bonjour ${leadData.name}</p>
        </div>

        <div class="highlight">
          <h2 style="color: #16a34a; margin-top: 0;">🎉 Excellente Nouvelle !</h2>
          <p><strong>Votre demande de devis d'assurance taxi a été confirmée avec succès ✓</strong></p>
        </div>

        <div class="section">
          <h3 style="color: #f97316;">🚀 Prochaines Étapes</h3>
          <ul>
            <li>✅ Votre expert TaxiAssur vous recontacte <strong>sous 15 minutes</strong></li>
            <li>📊 Analyse personnalisée de vos besoins spécifiques</li>
            <li>💰 Proposition des meilleures offres du marché</li>
            <li>💵 Économies moyennes constatées : <strong>580€/an</strong></li>
          </ul>
        </div>

        <div class="section">
          <h3 style="color: #f97316;">📋 Documents à Préparer</h3>
          <div class="docs-list">
            <strong>OBLIGATOIRES :</strong>
            <ul>
              <li>✓ Carte professionnelle taxi en cours de validité</li>
              <li>✓ Permis de conduire (recto-verso)</li>
              <li>✓ Pièce d'identité (CNI ou passeport)</li>
              <li>✓ Certificat d'immatriculation du véhicule</li>
              <li>✓ Relevé d'information de votre assureur précédent</li>
            </ul>
          </div>
          <div class="highlight">
            <strong>💡 ASTUCE PRO :</strong> Envoyez ces pièces par email à <a href="mailto:team@taxiassur.com">team@taxiassur.com</a> pour un traitement <strong>PRIORITAIRE</strong> !
          </div>
        </div>

        <div class="contact-box">
          <h3 style="color: #f97316; margin-top: 0;">❓ Questions ? Notre équipe disponible</h3>
          <p style="margin: 10px 0;">
            <strong>☎️ 01 80 85 57 86</strong> (ligne directe)<br>
            <strong>📧 <a href="mailto:team@taxiassur.com">team@taxiassur.com</a></strong> (réponse rapide)
          </p>
        </div>

        <div class="section">
          <h3 style="color: #f97316;">🏆 Pourquoi TaxiAssur ?</h3>
          <ul>
            <li>✓ Courtier agréé <strong>ORIAS 11 061 425</strong></li>
            <li>✓ +100 chauffeurs nous font confiance</li>
            <li>✓ Tarifs négociés exclusifs (<strong>-35% en moyenne</strong>)</li>
            <li>✓ Service expert et réactif</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 18px; color: #f97316;"><strong>Merci de votre confiance !</strong></p>
          <p>L'équipe TaxiAssur.com<br>Excellence Coverage Risks</p>
        </div>

        <div class="footer">
          <p><strong>TaxiAssur.com</strong> - Spécialiste Assurance Taxi<br>
          <a href="https://taxiassur.com">https://taxiassur.com</a></p>
          <p style="margin-top: 10px; font-size: 11px;">
            Cet email a été envoyé depuis contact@em5892.taxiassur.com<br>
            Pour nous contacter : team@taxiassur.com
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function generateFormToken(): Promise<string> {
  const timestamp = Date.now().toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(timestamp + 'taxiassur_secret');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}
// Fonction pour déclencher les analytics si configurés
export function trackLeadSubmission(leadData: Partial<Lead>) {
  // Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'lead_submission', {
      event_category: 'engagement',
      event_label: leadData.status,
      value: 1
    });
  }
  
  // Meta Pixel
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', {
      content_category: 'insurance',
      content_name: 'taxi_insurance_quote'
    });
  }
}