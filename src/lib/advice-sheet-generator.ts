interface BrokerInfo {
  name?: string;
  legal_form?: string;
  address?: string;
  phone?: string;
  email?: string;
  orias?: string;
  rcp?: string;
  gf?: string;
}

interface InsurerInfo {
  name?: string;
  phone?: string;
  email?: string;
}

interface Formula {
  name: string;
  guarantees: string[];
}

export interface AdviceTemplate {
  broker?: BrokerInfo;
  insurer?: InsurerInfo;
  formulas?: Formula[];
  optional_guarantees?: string[];
  advice_text?: string;
  important_remarks?: string[];
  claim_info?: string;
  mediation_info?: string;
  gdpr_info?: string;
}

export interface AdviceSheetLead {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  immatriculation?: string | null;
  vehicle_type?: string | null;
}

export interface AdviceSheetCompany {
  id: string;
  name: string;
  logo_url?: string | null;
  advice_template?: AdviceTemplate | null;
}

export interface AdviceSheetOptions {
  quoteAmount?: number | null;
  formulaSelected?: string | null;
  generatedDate?: Date;
}

const escape = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

export function generateAdviceSheetHtml(
  lead: AdviceSheetLead,
  company: AdviceSheetCompany,
  options: AdviceSheetOptions = {}
): string {
  const tpl: AdviceTemplate = company.advice_template || {};
  const broker = tpl.broker || {};
  const insurer = tpl.insurer || { name: company.name };
  const formulas = tpl.formulas || [];
  const optional = tpl.optional_guarantees || [];
  const remarks = tpl.important_remarks || [];
  const generatedAt = options.generatedDate || new Date();

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || 'Souscripteur';
  const fullAddress = [lead.address, lead.postal_code, lead.city].filter(Boolean).join(' ').trim() || '-';
  const vehicle = [lead.vehicle_type, lead.immatriculation].filter(Boolean).join(' - ') || '-';

  const formulasHtml = formulas
    .map((f, idx) => {
      const isSelected = options.formulaSelected
        ? options.formulaSelected.toLowerCase() === f.name.toLowerCase()
        : idx === 1;
      const guarantees = (f.guarantees || []).map((g) => `<li>${escape(g)}</li>`).join('');
      return `
        <div class="formula ${isSelected ? 'formula-selected' : ''}">
          <div class="formula-header">
            <span class="formula-name">${escape(f.name)}</span>
            ${isSelected ? '<span class="formula-badge">Formule conseillée</span>' : ''}
          </div>
          <ul class="formula-list">${guarantees}</ul>
        </div>
      `;
    })
    .join('');

  const optionalHtml = optional
    .map((g) => `<li><span class="check">[ ]</span> ${escape(g)}</li>`)
    .join('');

  const remarksHtml = remarks.map((r) => `<li>${escape(r)}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fiche de conseil - ${escape(company.name)} - ${escape(fullName)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; font-size: 12px; line-height: 1.5; margin: 0; padding: 0; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #16a34a; padding-bottom: 14px; margin-bottom: 18px; }
  .header h1 { font-size: 22px; color: #16a34a; margin: 0 0 4px; }
  .header .subtitle { color: #6b7280; font-size: 12px; }
  .header .meta { text-align: right; font-size: 11px; color: #4b5563; }
  .company-row { display: flex; align-items: center; gap: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; }
  .company-logo { max-height: 48px; max-width: 120px; object-fit: contain; }
  .company-name { font-size: 18px; font-weight: 700; color: #064e3b; }
  h2 { font-size: 14px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; margin: 22px 0 10px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .field { padding: 6px 0; }
  .field-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; }
  .field-value { font-size: 13px; color: #111827; font-weight: 500; }
  .formulas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .formula { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background: #f9fafb; }
  .formula-selected { border-color: #16a34a; background: #ecfdf5; box-shadow: 0 0 0 2px #bbf7d0; }
  .formula-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .formula-name { font-weight: 700; color: #111827; font-size: 13px; }
  .formula-badge { font-size: 9px; background: #16a34a; color: white; padding: 2px 6px; border-radius: 10px; text-transform: uppercase; }
  .formula-list { padding-left: 16px; margin: 0; font-size: 11px; color: #374151; }
  .formula-list li { margin: 2px 0; }
  ul.optional { padding-left: 0; list-style: none; }
  ul.optional li { padding: 4px 0; font-size: 12px; }
  .check { display: inline-block; width: 18px; font-family: monospace; color: #6b7280; }
  .advice-block { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin: 10px 0; font-size: 12px; color: #78350f; }
  .quote-amount { background: linear-gradient(135deg, #16a34a, #059669); color: white; padding: 14px; border-radius: 10px; text-align: center; margin: 14px 0; }
  .quote-amount .label { font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
  .quote-amount .value { font-size: 26px; font-weight: 700; margin-top: 4px; }
  .remarks ul { padding-left: 18px; margin: 0; }
  .remarks li { margin: 4px 0; font-size: 11px; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 22px; }
  .signature-box { border-top: 1px solid #9ca3af; padding-top: 8px; min-height: 80px; }
  .signature-box .label { font-size: 11px; color: #6b7280; }
  .signature-box .name { font-size: 12px; font-weight: 600; margin-top: 4px; color: #111827; }
  .small { font-size: 10px; color: #6b7280; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <h1>Fiche de conseil</h1>
        <div class="subtitle">Devoir de conseil - Article L. 521-1 du Code des assurances</div>
      </div>
      <div class="meta">
        Émise le ${escape(formatDate(generatedAt))}<br>
        <span class="small">Référence : ${escape(company.id.slice(0, 8).toUpperCase())}-${escape(generatedAt.getTime())}</span>
      </div>
    </div>

    <div class="company-row">
      ${company.logo_url ? `<img class="company-logo" src="${escape(company.logo_url)}" alt="${escape(company.name)}">` : ''}
      <div>
        <div class="company-name">${escape(company.name)}</div>
        <div class="small">Compagnie d'assurance partenaire</div>
      </div>
    </div>

    <h2>1. Identification du souscripteur</h2>
    <div class="grid-2">
      <div class="field"><div class="field-label">Nom complet</div><div class="field-value">${escape(fullName)}</div></div>
      <div class="field"><div class="field-label">Email</div><div class="field-value">${escape(lead.email || '-')}</div></div>
      <div class="field"><div class="field-label">Téléphone</div><div class="field-value">${escape(lead.phone || '-')}</div></div>
      <div class="field"><div class="field-label">Adresse</div><div class="field-value">${escape(fullAddress)}</div></div>
      <div class="field"><div class="field-label">Véhicule</div><div class="field-value">${escape(vehicle)}</div></div>
      <div class="field"><div class="field-label">Usage</div><div class="field-value">Taxi - Transport de personnes à titre onéreux</div></div>
    </div>

    <h2>2. Identification des besoins</h2>
    <p>Le souscripteur exerce l'activité de chauffeur de taxi et a sollicité TaxiAssur pour la couverture obligatoire de son véhicule professionnel ainsi que pour les garanties optionnelles correspondant à son niveau d'exposition au risque.</p>

    <h2>3. Formules proposées par ${escape(company.name)}</h2>
    <div class="formulas">${formulasHtml || '<div class="small">Formules à définir avec la compagnie.</div>'}</div>

    <h2>4. Garanties optionnelles</h2>
    <ul class="optional">${optionalHtml || '<li class="small">Aucune garantie optionnelle référencée.</li>'}</ul>

    ${
      options.quoteAmount
        ? `<div class="quote-amount"><div class="label">Cotisation annuelle proposée</div><div class="value">${escape(options.quoteAmount.toFixed(2))} EUR</div></div>`
        : ''
    }

    <h2>5. Conseil et motivation</h2>
    <div class="advice-block">${escape(tpl.advice_text || 'Conseil personnalisé selon le profil et les besoins exprimés par le souscripteur.')}</div>

    <h2>6. Remarques importantes</h2>
    <div class="remarks"><ul>${remarksHtml || '<li class="small">Aucune remarque spécifique.</li>'}</ul></div>

    <h2>7. Choix du souscripteur</h2>
    <p class="small">Le souscripteur reconnaît avoir reçu et pris connaissance des Conditions Générales, du Document d'Information sur le Produit d'Assurance (IPID) et des présentes recommandations. Il déclare souscrire en toute connaissance de cause à la formule choisie ci-dessus.</p>

    <div class="signature-grid">
      <div class="signature-box">
        <div class="label">Le souscripteur</div>
        <div class="name">${escape(fullName)}</div>
        <div class="small">Date et signature précédée de la mention "Lu et approuvé"</div>
      </div>
      <div class="signature-box">
        <div class="label">Le courtier</div>
        <div class="name">${escape(broker.name || 'TaxiAssur')}</div>
        <div class="small">Cachet et signature</div>
      </div>
    </div>

    <h2>Présentation du courtier</h2>
    <p class="small">
      <strong>${escape(broker.name || 'TaxiAssur')}</strong> - ${escape(broker.legal_form || 'Société de courtage en assurances')}<br>
      ${escape(broker.address || '')}<br>
      Tél. ${escape(broker.phone || '')} - ${escape(broker.email || '')}<br>
      ORIAS : ${escape(broker.orias || '-')} - RCP : ${escape(broker.rcp || '-')} - Garantie financière : ${escape(broker.gf || '-')}
    </p>

    <h2>Sinistres et médiation</h2>
    <p class="small">${escape(tpl.claim_info || '')}</p>
    <p class="small">${escape(tpl.mediation_info || '')}</p>

    <h2>Protection des données</h2>
    <p class="small">${escape(tpl.gdpr_info || '')}</p>

    <div class="footer">
      Document généré automatiquement par TaxiAssur le ${escape(formatDate(generatedAt))} - Conforme au devoir de conseil (art. L. 521-1 du Code des assurances).
    </div>
  </div>
</body>
</html>`;
}
