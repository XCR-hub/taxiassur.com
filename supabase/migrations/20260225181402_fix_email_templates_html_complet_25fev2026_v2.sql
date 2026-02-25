/*
  # Templates d'emails HTML professionnels

  Création de beaux templates HTML pour :
  - Email de bienvenue prospect avec lien espace personnel
  - Email notification équipe avec design professionnel
*/

-- Fonction pour générer l'email de bienvenue prospect
CREATE OR REPLACE FUNCTION generate_prospect_welcome_email(
  p_first_name text,
  p_last_name text,
  p_access_token text,
  p_city text,
  p_phone text
)
RETURNS text AS $$
DECLARE
  v_full_name text;
  v_prospect_url text;
BEGIN
  v_full_name := p_first_name || CASE WHEN p_last_name != '' THEN ' ' || p_last_name ELSE '' END;
  v_prospect_url := 'https://taxiassur.com/espace-prospect/' || p_access_token;
  
  RETURN '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue chez TaxiAssur</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
          
          <!-- Header avec logo -->
          <tr>
            <td style="background:linear-gradient(90deg,#fbbf24 0%,#f59e0b 100%);padding:30px;text-align:center;">
              <h1 style="margin:0;color:#000;font-size:32px;font-weight:900;letter-spacing:2px;">🚖 TAXIASSUR</h1>
              <p style="margin:8px 0 0 0;color:#000;font-size:14px;font-weight:600;">L''assurance taxi qui vous fait économiser jusqu''à 35%</p>
            </td>
          </tr>

          <!-- Badge de confirmation -->
          <tr>
            <td style="padding:40px 40px 20px 40px;text-align:center;">
              <div style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:20px 40px;border-radius:50px;margin-bottom:20px;">
                <span style="color:#fff;font-size:48px;">✓</span>
              </div>
              <h2 style="margin:0;color:#fff;font-size:28px;font-weight:900;">DEMANDE CONFIRMÉE !</h2>
              <p style="margin:12px 0 0 0;color:#a3a3a3;font-size:16px;">Bonjour ' || v_full_name || ',</p>
            </td>
          </tr>

          <!-- Contenu principal -->
          <tr>
            <td style="padding:20px 40px;">
              <p style="margin:0 0 20px 0;color:#e5e5e5;font-size:16px;line-height:1.6;">
                🎉 <strong style="color:#fbbf24;">Excellente nouvelle !</strong> Nous avons bien reçu votre demande de devis pour une assurance taxi à <strong style="color:#fbbf24;">' || p_city || '</strong>.
              </p>
              
              <div style="background:#1a1a1a;border-left:4px solid #10b981;padding:20px;border-radius:8px;margin:20px 0;">
                <p style="margin:0 0 10px 0;color:#10b981;font-size:18px;font-weight:700;">⏱️ Votre expert vous contacte dans 15 minutes</p>
                <p style="margin:0;color:#a3a3a3;font-size:14px;">Au numéro : <strong style="color:#fff;">' || p_phone || '</strong></p>
              </div>

              <!-- CTA Principal - Espace Prospect -->
              <div style="background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);padding:30px;border-radius:12px;margin:30px 0;text-align:center;">
                <h3 style="margin:0 0 15px 0;color:#000;font-size:22px;font-weight:900;">🎁 VOTRE ESPACE PERSONNEL</h3>
                <p style="margin:0 0 20px 0;color:#000;font-size:14px;">Accédez à votre dossier sécurisé pour :</p>
                <ul style="text-align:left;color:#000;font-size:14px;line-height:1.8;margin:0 0 25px 0;padding-left:30px;">
                  <li>📄 Télécharger vos documents</li>
                  <li>💰 Consulter vos devis personnalisés</li>
                  <li>✍️ Signer votre contrat en ligne</li>
                  <li>💳 Effectuer votre paiement comptant</li>
                </ul>
                <a href="' || v_prospect_url || '" style="display:inline-block;background:#000;color:#fbbf24;text-decoration:none;padding:18px 50px;border-radius:50px;font-size:18px;font-weight:900;letter-spacing:1px;box-shadow:0 4px 15px rgba(0,0,0,0.3);">
                  🚀 ACCÉDER À MON ESPACE
                </a>
              </div>

              <!-- Liste des documents requis -->
              <div style="background:#1a1a1a;padding:25px;border-radius:12px;margin:20px 0;">
                <h3 style="margin:0 0 15px 0;color:#fbbf24;font-size:18px;font-weight:700;">📋 Documents nécessaires (7)</h3>
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color:#10b981;font-size:14px;">✓ Licence de taxi</td>
                    <td style="color:#10b981;font-size:14px;">✓ Permis de conduire</td>
                  </tr>
                  <tr>
                    <td style="color:#10b981;font-size:14px;">✓ Pièce d''identité</td>
                    <td style="color:#10b981;font-size:14px;">✓ Carte grise</td>
                  </tr>
                  <tr>
                    <td style="color:#10b981;font-size:14px;">✓ Relevé d''information</td>
                    <td style="color:#10b981;font-size:14px;">✓ Autorisation stationnement</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="color:#10b981;font-size:14px;">✓ RIB</td>
                  </tr>
                </table>
              </div>

              <!-- Timeline -->
              <div style="margin:30px 0;">
                <h3 style="margin:0 0 20px 0;color:#fff;font-size:18px;font-weight:700;">⏱️ Déroulement</h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="60" style="vertical-align:top;">
                      <div style="background:#10b981;color:#000;width:40px;height:40px;border-radius:50%;text-align:center;line-height:40px;font-weight:900;font-size:18px;">1</div>
                    </td>
                    <td style="padding-bottom:20px;">
                      <p style="margin:0 0 5px 0;color:#fff;font-weight:700;font-size:15px;">Appel de votre expert (sous 15 min)</p>
                      <p style="margin:0;color:#a3a3a3;font-size:13px;">Analyse personnalisée de vos besoins</p>
                    </td>
                  </tr>
                  <tr>
                    <td width="60" style="vertical-align:top;">
                      <div style="background:#fbbf24;color:#000;width:40px;height:40px;border-radius:50%;text-align:center;line-height:40px;font-weight:900;font-size:18px;">2</div>
                    </td>
                    <td style="padding-bottom:20px;">
                      <p style="margin:0 0 5px 0;color:#fff;font-weight:700;font-size:15px;">Devis personnalisés</p>
                      <p style="margin:0;color:#a3a3a3;font-size:13px;">Jusqu''à 35% d''économies garanties</p>
                    </td>
                  </tr>
                  <tr>
                    <td width="60" style="vertical-align:top;">
                      <div style="background:#3b82f6;color:#fff;width:40px;height:40px;border-radius:50%;text-align:center;line-height:40px;font-weight:900;font-size:18px;">3</div>
                    </td>
                    <td>
                      <p style="margin:0 0 5px 0;color:#fff;font-weight:700;font-size:15px;">Souscription rapide</p>
                      <p style="margin:0;color:#a3a3a3;font-size:13px;">Attestation sous 24h après validation</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#000;padding:30px 40px;text-align:center;">
              <p style="margin:0 0 15px 0;color:#fbbf24;font-size:16px;font-weight:700;">📞 Une question ?</p>
              <p style="margin:0 0 10px 0;">
                <a href="tel:0180855786" style="color:#10b981;text-decoration:none;font-weight:700;font-size:18px;">01 80 85 57 86</a>
              </p>
              <p style="margin:0 0 25px 0;">
                <a href="mailto:team@taxiassur.com" style="color:#3b82f6;text-decoration:none;">team@taxiassur.com</a>
              </p>
              <p style="margin:0;color:#737373;font-size:12px;">
                © 2026 TaxiAssur.com - L''assurance taxi simplifiée<br>
                Tous droits réservés
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour générer l'email équipe
CREATE OR REPLACE FUNCTION generate_team_notification_email(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_city text,
  p_lead_id uuid,
  p_vehicle_type text DEFAULT 'Taxi',
  p_immatriculation text DEFAULT '',
  p_is_new boolean DEFAULT true,
  p_vehicle_number int DEFAULT 1
)
RETURNS text AS $$
DECLARE
  v_full_name text;
  v_crm_url text;
  v_date_formatted text;
BEGIN
  v_full_name := p_first_name || CASE WHEN p_last_name != '' THEN ' ' || p_last_name ELSE '' END;
  v_crm_url := 'https://taxiassur.com/backoffice/crm-killer/lead/' || p_lead_id;
  v_date_formatted := to_char(now(), 'DD/MM/YYYY HH24:MI');
  
  RETURN '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau Lead TaxiAssur</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:30px 20px;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          
          <!-- Header avec badge urgent -->
          <tr>
            <td style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:25px 40px;position:relative;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:900;letter-spacing:1px;">
                      🔥 ' || CASE WHEN p_is_new THEN 'NOUVEAU LEAD' ELSE 'LEAD RÉACTIVÉ' END || '
                    </h1>
                    <p style="margin:8px 0 0 0;color:#fecaca;font-size:13px;font-weight:600;">
                      ' || v_date_formatted || '
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <div style="background:#000;color:#fbbf24;padding:10px 20px;border-radius:50px;font-weight:900;font-size:14px;white-space:nowrap;">
                      ⚡ ACTION REQUISE
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Infos principales du lead -->
          <tr>
            <td style="padding:40px;">
              
              <!-- Nom du lead en grand -->
              <div style="background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);padding:30px;border-radius:12px;margin-bottom:30px;text-align:center;">
                <h2 style="margin:0;color:#000;font-size:32px;font-weight:900;">👤 ' || v_full_name || '</h2>
                ' || CASE WHEN p_vehicle_number > 1 THEN 
                  '<p style="margin:10px 0 0 0;background:#000;color:#fbbf24;display:inline-block;padding:8px 20px;border-radius:50px;font-weight:900;font-size:14px;">🚖 VÉHICULE #' || p_vehicle_number || ' (Client existant)</p>'
                ELSE '' END || '
              </div>

              <!-- Tableau des infos -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;overflow:hidden;margin-bottom:30px;">
                <tr>
                  <td colspan="2" style="background:#1e293b;padding:15px 20px;border-bottom:2px solid #334155;">
                    <p style="margin:0;color:#fbbf24;font-size:16px;font-weight:700;">📊 INFORMATIONS DU LEAD</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:15px 20px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:14px;font-weight:600;width:40%;">📧 Email</td>
                  <td style="padding:15px 20px;border-bottom:1px solid #1e293b;">
                    <a href="mailto:' || p_email || '" style="color:#3b82f6;text-decoration:none;font-weight:700;font-size:15px;">' || p_email || '</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:15px 20px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:14px;font-weight:600;">📞 Téléphone</td>
                  <td style="padding:15px 20px;border-bottom:1px solid #1e293b;">
                    <a href="tel:' || p_phone || '" style="color:#10b981;text-decoration:none;font-weight:700;font-size:18px;">' || p_phone || '</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:15px 20px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:14px;font-weight:600;">📍 Ville</td>
                  <td style="padding:15px 20px;border-bottom:1px solid #1e293b;color:#fff;font-size:15px;font-weight:600;">' || p_city || '</td>
                </tr>
                <tr>
                  <td style="padding:15px 20px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:14px;font-weight:600;">🚖 Type véhicule</td>
                  <td style="padding:15px 20px;border-bottom:1px solid #1e293b;color:#fbbf24;font-size:15px;font-weight:700;">' || p_vehicle_type || '</td>
                </tr>
                ' || CASE WHEN p_immatriculation != '' THEN
                  '<tr>
                    <td style="padding:15px 20px;color:#94a3b8;font-size:14px;font-weight:600;">🔢 Immatriculation</td>
                    <td style="padding:15px 20px;color:#fff;font-size:15px;font-weight:600;">' || p_immatriculation || '</td>
                  </tr>'
                ELSE '' END || '
              </table>

              <!-- CTA principal -->
              <div style="text-align:center;margin:30px 0;">
                <a href="' || v_crm_url || '" style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;text-decoration:none;padding:20px 50px;border-radius:50px;font-size:18px;font-weight:900;letter-spacing:1px;box-shadow:0 6px 20px rgba(16,185,129,0.4);">
                  🚀 OUVRIR LE LEAD DANS LE CRM
                </a>
              </div>

              <!-- Actions rapides -->
              <div style="background:#1e293b;padding:25px;border-radius:12px;border-left:4px solid #fbbf24;">
                <h3 style="margin:0 0 15px 0;color:#fbbf24;font-size:16px;font-weight:700;">⚡ ACTIONS RAPIDES</h3>
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color:#e2e8f0;font-size:14px;">✓ Rappeler le prospect sous 15 minutes</td>
                  </tr>
                  <tr>
                    <td style="color:#e2e8f0;font-size:14px;">✓ Vérifier les documents reçus</td>
                  </tr>
                  <tr>
                    <td style="color:#e2e8f0;font-size:14px;">✓ Préparer les devis personnalisés</td>
                  </tr>
                  <tr>
                    <td style="color:#e2e8f0;font-size:14px;">✓ Mettre à jour le statut dans le CRM</td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:25px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="margin:0 0 10px 0;color:#64748b;font-size:13px;">
                Cet email a été généré automatiquement par le système TaxiAssur CRM
              </p>
              <p style="margin:0;color:#475569;font-size:12px;">
                © 2026 TaxiAssur.com - Système CRM Killer
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
