import { Lead } from './schema';
import { SecureLead } from './security';
import { supabase } from './supabase';

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
    console.error('Lead submission error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur de connexion' 
    };
  }
}

export async function submitSecureLead(leadData: SecureLead): Promise<{ success: boolean; error?: string }> {
  try {
    // Save lead to Supabase
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
        lead_status: 'new'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return { success: false, error: 'Erreur lors de l\'enregistrement' };
    }

    // Send emails via SendGrid Edge Function
    const emailPromises = [
      // Email to commercial@xcr.fr
      sendEmail({
        to: 'commercial@xcr.fr',
        subject: `[TAXIASSUR] 🚖 Nouveau lead - ${leadData.name} - ${leadData.city}`,
        text: buildAdminEmail(leadData, 'commercial'),
      }),
      // Email to tcerda@xcr.fr
      sendEmail({
        to: 'tcerda@xcr.fr',
        subject: `[TAXIASSUR] 🚖 Copie lead - ${leadData.name} - ${leadData.city}`,
        text: buildAdminEmail(leadData, 'tcerda'),
      }),
      // Email to client
      sendEmail({
        to: leadData.email,
        subject: '✅ Demande confirmée ! Votre expert TaxiAssur vous recontacte rapidement',
        text: buildClientEmail(leadData),
      }),
    ];

    const emailResults = await Promise.allSettled(emailPromises);
    const emailsSent = emailResults.filter(r => r.status === 'fulfilled').length;

    // Update lead with email status
    await supabase
      .from('leads')
      .update({
        emails_sent: emailsSent,
        last_email_sent_at: new Date().toISOString()
      })
      .eq('id', leadRecord.id);

    return { success: true };
  } catch (error) {
    console.error('Secure lead submission error:', error);
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
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: params,
  });

  if (error) {
    console.error('Email error:', error);
    throw error;
  }

  return data;
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