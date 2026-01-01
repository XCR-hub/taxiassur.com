export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface WelcomeEmailData {
  firstName: string;
  email: string;
}

export interface QuoteEmailData {
  firstName: string;
  lastName: string;
  vehicleType: string;
  city: string;
  quoteReference: string;
  estimatedPrice: string;
}

export interface ContractEmailData {
  firstName: string;
  lastName: string;
  contractNumber: string;
  startDate: string;
  policyUrl: string;
}

const emailStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0; font-size: 28px; }
  .content { background: white; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
  .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
  .button:hover { background: #1e40af; }
  .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
  .info-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-weight: 600; }
`;

export function generateWelcomeEmail(data: WelcomeEmailData): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bienvenue chez TaxiAssur</h1>
    </div>
    <div class="content">
      <p>Bonjour ${data.firstName},</p>

      <p>Merci de votre confiance et bienvenue dans la communauté TaxiAssur, le spécialiste de l'assurance pour professionnels du transport de personnes.</p>

      <div class="info-box">
        <strong>Votre compte a été créé avec succès</strong><br>
        Email : ${data.email}
      </div>

      <p>Vous pouvez maintenant :</p>
      <ul>
        <li>Accéder à votre espace client</li>
        <li>Consulter vos devis et contrats</li>
        <li>Gérer vos documents d'assurance</li>
        <li>Déclarer un sinistre 24h/24</li>
      </ul>

      <a href="https://www.taxiassur.com/espace-client" class="button">Accéder à mon espace</a>

      <p>Notre équipe reste à votre disposition pour toute question.</p>

      <p>Cordialement,<br>L'équipe TaxiAssur</p>
    </div>
    <div class="footer">
      <p>TaxiAssur - Courtier en assurances<br>
      📧 contact@taxiassur.com | 📞 01 XX XX XX XX<br>
      <a href="https://www.taxiassur.com">www.taxiassur.com</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Bonjour ${data.firstName},

Merci de votre confiance et bienvenue dans la communauté TaxiAssur, le spécialiste de l'assurance pour professionnels du transport de personnes.

Votre compte a été créé avec succès
Email : ${data.email}

Vous pouvez maintenant :
- Accéder à votre espace client
- Consulter vos devis et contrats
- Gérer vos documents d'assurance
- Déclarer un sinistre 24h/24

Accédez à votre espace : https://www.taxiassur.com/espace-client

Notre équipe reste à votre disposition pour toute question.

Cordialement,
L'équipe TaxiAssur

TaxiAssur - Courtier en assurances
contact@taxiassur.com | 01 XX XX XX XX
www.taxiassur.com
  `;

  return {
    subject: `Bienvenue chez TaxiAssur ${data.firstName}`,
    html,
    text,
  };
}

export function generateQuoteEmail(data: QuoteEmailData): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Votre devis d'assurance</h1>
    </div>
    <div class="content">
      <p>Bonjour ${data.firstName} ${data.lastName},</p>

      <p>Nous avons le plaisir de vous transmettre votre devis personnalisé pour l'assurance de votre ${data.vehicleType}.</p>

      <div class="info-box">
        <strong>Référence : ${data.quoteReference}</strong><br>
        Montant estimé : ${data.estimatedPrice} / an
      </div>

      <table>
        <tr>
          <th>Détails</th>
          <th>Valeur</th>
        </tr>
        <tr>
          <td>Type de véhicule</td>
          <td>${data.vehicleType}</td>
        </tr>
        <tr>
          <td>Ville</td>
          <td>${data.city}</td>
        </tr>
      </table>

      <p><strong>Garanties incluses :</strong></p>
      <ul>
        <li>Responsabilité Civile Professionnelle</li>
        <li>Protection juridique</li>
        <li>Assistance 24h/24</li>
        <li>Garantie conducteur</li>
      </ul>

      <a href="https://www.taxiassur.com/devis/${data.quoteReference}" class="button">Voir mon devis détaillé</a>

      <p>Ce devis est valable 30 jours. N'hésitez pas à nous contacter pour toute question.</p>

      <p>Cordialement,<br>L'équipe TaxiAssur</p>
    </div>
    <div class="footer">
      <p>TaxiAssur - Courtier en assurances<br>
      📧 contact@taxiassur.com | 📞 01 XX XX XX XX<br>
      <a href="https://www.taxiassur.com">www.taxiassur.com</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Bonjour ${data.firstName} ${data.lastName},

Nous avons le plaisir de vous transmettre votre devis personnalisé pour l'assurance de votre ${data.vehicleType}.

Référence : ${data.quoteReference}
Montant estimé : ${data.estimatedPrice} / an

Détails :
- Type de véhicule : ${data.vehicleType}
- Ville : ${data.city}

Garanties incluses :
- Responsabilité Civile Professionnelle
- Protection juridique
- Assistance 24h/24
- Garantie conducteur

Voir mon devis : https://www.taxiassur.com/devis/${data.quoteReference}

Ce devis est valable 30 jours. N'hésitez pas à nous contacter pour toute question.

Cordialement,
L'équipe TaxiAssur

TaxiAssur - Courtier en assurances
contact@taxiassur.com | 01 XX XX XX XX
www.taxiassur.com
  `;

  return {
    subject: `Votre devis TaxiAssur - Réf. ${data.quoteReference}`,
    html,
    text,
  };
}

export function generateContractEmail(data: ContractEmailData): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Votre contrat est activé</h1>
    </div>
    <div class="content">
      <p>Bonjour ${data.firstName} ${data.lastName},</p>

      <p>Félicitations ! Votre contrat d'assurance est maintenant actif.</p>

      <div class="info-box">
        <strong>Contrat N° ${data.contractNumber}</strong><br>
        Date de prise d'effet : ${data.startDate}
      </div>

      <p><strong>Documents disponibles :</strong></p>
      <ul>
        <li>Attestation d'assurance</li>
        <li>Conditions générales</li>
        <li>Conditions particulières</li>
        <li>Notice d'information</li>
      </ul>

      <a href="${data.policyUrl}" class="button">Télécharger mes documents</a>

      <p><strong>En cas de sinistre :</strong></p>
      <ul>
        <li>📞 Numéro d'urgence : 01 XX XX XX XX (24h/24, 7j/7)</li>
        <li>📧 Email : sinistres@taxiassur.com</li>
        <li>💻 Déclaration en ligne sur votre espace client</li>
      </ul>

      <p>Merci de votre confiance !</p>

      <p>Cordialement,<br>L'équipe TaxiAssur</p>
    </div>
    <div class="footer">
      <p>TaxiAssur - Courtier en assurances<br>
      📧 contact@taxiassur.com | 📞 01 XX XX XX XX<br>
      <a href="https://www.taxiassur.com">www.taxiassur.com</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Bonjour ${data.firstName} ${data.lastName},

Félicitations ! Votre contrat d'assurance est maintenant actif.

Contrat N° ${data.contractNumber}
Date de prise d'effet : ${data.startDate}

Documents disponibles :
- Attestation d'assurance
- Conditions générales
- Conditions particulières
- Notice d'information

Télécharger mes documents : ${data.policyUrl}

En cas de sinistre :
- Numéro d'urgence : 01 XX XX XX XX (24h/24, 7j/7)
- Email : sinistres@taxiassur.com
- Déclaration en ligne sur votre espace client

Merci de votre confiance !

Cordialement,
L'équipe TaxiAssur

TaxiAssur - Courtier en assurances
contact@taxiassur.com | 01 XX XX XX XX
www.taxiassur.com
  `;

  return {
    subject: `Votre contrat TaxiAssur est activé - N° ${data.contractNumber}`,
    html,
    text,
  };
}
