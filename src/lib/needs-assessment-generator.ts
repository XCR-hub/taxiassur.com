export interface NeedsAssessmentLead {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  immatriculation?: string | null;
  vehicle_type?: string | null;
  date_of_birth?: string | null;
  license_number?: string | null;
  siret?: string | null;
  company_name?: string | null;
  profession?: string | null;
  notes?: string | null;
}

export interface NeedsAssessmentQuote {
  company_name: string;
  coverage_type?: 'tiers' | 'tiers_plus' | 'tous_risques' | string | null;
  quote_amount?: number | null;
  monthly_price?: number | null;
  enrollment_fee?: number | null;
  includes_immobilisation?: boolean | null;
  includes_assistance_0km?: boolean | null;
  includes_rc_pro?: boolean | null;
  includes_depannage_remorquage?: boolean | null;
  coverage_details?: string | null;
  notes?: string | null;
  quote_options?: Record<string, unknown> | null;
  rc_pro_addon?: boolean | null;
  rc_pro_addon_annual?: number | null;
  rc_pro_addon_monthly?: number | null;
}

export interface NeedsAssessmentOptions {
  commercialName?: string | null;
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

const coverageLabel = (value?: string | null): string => {
  switch (value) {
    case 'tiers':
      return 'Tiers - Responsabilité civile obligatoire';
    case 'tiers_plus':
      return 'Tiers + (Bris de glace, incendie, vol)';
    case 'tous_risques':
      return 'Tous risques - Couverture complète';
    default:
      return value || 'Non renseigné';
  }
};

const yesNo = (v?: boolean | null): string =>
  v ? '<span class="yes">OUI</span>' : '<span class="no">NON</span>';

const money = (v?: number | null): string =>
  v != null && !Number.isNaN(v) ? `${Number(v).toFixed(2)} EUR` : '-';

function renderSollyOptions(opts: Record<string, unknown> | null | undefined): string {
  if (!opts) return '';
  const rows: Array<{ label: string; selected: boolean; detail?: string }> = [
    { label: 'Aménagements intérieurs fixes / PMR', selected: !!opts.amenagements },
    { label: 'Assistance sans franchise', selected: !!opts.assistance_sans_franchise },
    { label: 'Bagages et marchandises transportés', selected: !!opts.bagages_marchandises },
    { label: 'Effets personnels', selected: !!opts.effets_personnels },
    {
      label: 'Équipements professionnels (taximètre, TPE, GPS...)',
      selected: !!opts.equipements_pro,
      detail: opts.equipements_pro ? `Niveau ${opts.equipements_pro_niveau || 1}` : undefined,
    },
    { label: 'Indemnisation en valeur d\'achat', selected: !!opts.indemnisation_valeur_achat },
    {
      label: 'Indemnités journalières d\'immobilisation',
      selected: !!opts.indemnites_journalieres,
      detail: opts.indemnites_journalieres
        ? `Niveau ${opts.indemnites_journalieres_niveau || 1} (${(opts.indemnites_journalieres_niveau || 1) === 2 ? '150' : '75'} EUR/jour)`
        : undefined,
    },
    { label: 'Protection juridique', selected: !!opts.protection_juridique },
    { label: 'Protection du conducteur niveau 2', selected: !!opts.protection_conducteur_niveau2 },
  ];

  const visible = rows.filter((r) => r.selected);
  if (visible.length === 0) return '';

  return `
    <h2>5. Options et garanties complémentaires retenues</h2>
    <table class="data-table">
      <thead><tr><th>Garantie optionnelle</th><th>Niveau / détail</th></tr></thead>
      <tbody>
        ${visible
          .map(
            (r) =>
              `<tr><td>${escape(r.label)}</td><td>${r.detail ? escape(r.detail) : '<span class="check">OUI</span>'}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

export function generateNeedsAssessmentHtml(
  lead: NeedsAssessmentLead,
  quote: NeedsAssessmentQuote,
  options: NeedsAssessmentOptions = {},
): string {
  const generatedAt = options.generatedDate || new Date();
  const fullName =
    [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || 'Prospect';
  const fullAddress =
    [lead.address, lead.postal_code, lead.city].filter(Boolean).join(' ').trim() || '-';
  const vehicle = [lead.vehicle_type, lead.immatriculation].filter(Boolean).join(' - ') || '-';

  const sollyBlock = renderSollyOptions(quote.quote_options || null);

  const rcProBlock = quote.rc_pro_addon
    ? `
    <h2>6. Extension Responsabilité Civile Professionnelle</h2>
    <table class="data-table">
      <tbody>
        <tr><th>RC Pro souscrite en complément</th><td><span class="yes">OUI - Via SwissLife</span></td></tr>
        <tr><th>Prime annuelle RC Pro</th><td>${escape(money(quote.rc_pro_addon_annual))}</td></tr>
        <tr><th>Mensualité RC Pro</th><td>${escape(money(quote.rc_pro_addon_monthly))}</td></tr>
      </tbody>
    </table>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Recueil des besoins TAXI - ${escape(fullName)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.55; margin: 0; padding: 0; background: #fff; }
  .page { max-width: 820px; margin: 0 auto; padding: 20px 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f766e; padding-bottom: 14px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #0f766e; margin: 0 0 6px; letter-spacing: 0.3px; }
  .header .subtitle { color: #475569; font-size: 12px; }
  .header .meta { text-align: right; font-size: 11px; color: #475569; }
  .internal-badge { display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  h2 { font-size: 13px; color: #0f766e; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 22px 0 12px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
  .field { padding: 4px 0; border-bottom: 1px dotted #e2e8f0; }
  .field-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
  .field-value { font-size: 12.5px; color: #0f172a; font-weight: 500; margin-top: 2px; }
  table.data-table { width: 100%; border-collapse: collapse; margin: 6px 0 8px; font-size: 12px; }
  table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; vertical-align: top; }
  table.data-table th { background: #f0fdfa; color: #0f766e; font-weight: 700; width: 42%; }
  .yes { color: #15803d; font-weight: 700; }
  .no { color: #9ca3af; }
  .check { color: #0f766e; font-weight: 700; }
  .price-box { background: linear-gradient(135deg, #0f766e, #0e7490); color: #fff; border-radius: 10px; padding: 14px 18px; margin: 12px 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .price-box .cell { text-align: center; }
  .price-box .cell .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; opacity: 0.9; }
  .price-box .cell .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  .notes { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 12px; border-radius: 4px; font-size: 12px; color: #78350f; white-space: pre-wrap; }
  .commercial-block { margin-top: 24px; border: 1px dashed #94a3b8; border-radius: 6px; padding: 12px 14px; background: #f8fafc; }
  .commercial-block .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; }
  .commercial-block .val { font-size: 12.5px; color: #0f172a; font-weight: 600; margin-top: 2px; }
  .small { font-size: 10px; color: #64748b; }
  .footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #94a3b8; }
  .section-intro { font-size: 11.5px; color: #475569; margin: 4px 0 10px; }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <h1>Recueil des besoins et étude personnalisée</h1>
        <div class="subtitle">Assurance TAXI - Transport public de personnes</div>
        <div class="internal-badge">Document interne commercial</div>
      </div>
      <div class="meta">
        Édité le ${escape(formatDate(generatedAt))}<br>
        <span class="small">Référence dossier : ${escape(String(generatedAt.getTime()).slice(-10))}</span>
      </div>
    </div>

    <h2>1. Identification du prospect</h2>
    <div class="grid-2">
      <div class="field"><div class="field-label">Nom complet</div><div class="field-value">${escape(fullName)}</div></div>
      <div class="field"><div class="field-label">Date de naissance</div><div class="field-value">${escape(lead.date_of_birth || '-')}</div></div>
      <div class="field"><div class="field-label">Email</div><div class="field-value">${escape(lead.email || '-')}</div></div>
      <div class="field"><div class="field-label">Téléphone</div><div class="field-value">${escape(lead.phone || '-')}</div></div>
      <div class="field"><div class="field-label">Adresse</div><div class="field-value">${escape(fullAddress)}</div></div>
      <div class="field"><div class="field-label">Raison sociale / SIRET</div><div class="field-value">${escape(lead.company_name || '-')}${lead.siret ? ' - ' + escape(lead.siret) : ''}</div></div>
      <div class="field"><div class="field-label">Profession</div><div class="field-value">${escape(lead.profession || 'Chauffeur de taxi')}</div></div>
      <div class="field"><div class="field-label">N° de permis / licence ADS</div><div class="field-value">${escape(lead.license_number || '-')}</div></div>
    </div>

    <h2>2. Véhicule à assurer</h2>
    <table class="data-table">
      <tbody>
        <tr><th>Type de véhicule</th><td>${escape(lead.vehicle_type || '-')}</td></tr>
        <tr><th>Immatriculation</th><td>${escape(lead.immatriculation || '-')}</td></tr>
        <tr><th>Usage déclaré</th><td>Taxi - Transport de personnes à titre onéreux</td></tr>
        <tr><th>Zone de circulation</th><td>${escape(lead.city || 'France métropolitaine')}</td></tr>
      </tbody>
    </table>

    <h2>3. Recueil des besoins exprimés</h2>
    <p class="section-intro">Le prospect a sollicité TaxiAssur pour la couverture assurance de son activité de taxi. Les besoins identifiés lors de l'entretien commercial sont les suivants :</p>
    <table class="data-table">
      <tbody>
        <tr><th>Couverture obligatoire du véhicule</th><td><span class="yes">OUI</span> - Obligation légale (art. L. 211-1 Code des assurances)</td></tr>
        <tr><th>Niveau de couverture retenu</th><td>${escape(coverageLabel(quote.coverage_type))}</td></tr>
        <tr><th>Assistance 0 km incluse</th><td>${yesNo(quote.includes_assistance_0km)}</td></tr>
        <tr><th>Garantie immobilisation</th><td>${yesNo(quote.includes_immobilisation)}</td></tr>
        <tr><th>Dépannage / remorquage</th><td>${yesNo(quote.includes_depannage_remorquage)}</td></tr>
        <tr><th>Responsabilité civile professionnelle</th><td>${yesNo(quote.includes_rc_pro)}</td></tr>
      </tbody>
    </table>

    <h2>4. Solution retenue - ${escape(quote.company_name)}</h2>
    <div class="price-box">
      <div class="cell"><div class="label">Prime annuelle</div><div class="value">${escape(money(quote.quote_amount))}</div></div>
      <div class="cell"><div class="label">Mensualité</div><div class="value">${escape(money(quote.monthly_price))}</div></div>
      <div class="cell"><div class="label">Frais de dossier</div><div class="value">${escape(money(quote.enrollment_fee))}</div></div>
    </div>
    ${
      quote.coverage_details
        ? `<div class="notes"><strong>Détails de la couverture :</strong>\n${escape(quote.coverage_details)}</div>`
        : ''
    }

    ${sollyBlock}
    ${rcProBlock}

    <h2>7. Observations du commercial</h2>
    ${
      quote.notes
        ? `<div class="notes">${escape(quote.notes)}</div>`
        : '<p class="small">Aucune observation complémentaire.</p>'
    }

    <h2>8. Motivation du conseil</h2>
    <p class="section-intro">
      La solution proposée par <strong>${escape(quote.company_name)}</strong> a été retenue au regard des besoins exprimés par le prospect,
      de son profil de risque (activité de taxi, zone d'exploitation, historique assurantiel déclaré) et du rapport garanties / cotisation.
      Le niveau de couverture <em>${escape(coverageLabel(quote.coverage_type))}</em> correspond à l'exposition déclarée du véhicule et à l'usage professionnel.
    </p>

    <div class="commercial-block">
      <div class="grid-2">
        <div>
          <div class="label">Commercial en charge</div>
          <div class="val">${escape(options.commercialName || 'TaxiAssur')}</div>
        </div>
        <div>
          <div class="label">Date de l'étude</div>
          <div class="val">${escape(formatDate(generatedAt))}</div>
        </div>
      </div>
      <div class="small" style="margin-top: 8px;">
        Document interne de suivi commercial joint au dossier prospect. Non soumis à signature client.
        Le devoir de conseil formel (article L. 521-1 du Code des assurances) est documenté dans la fiche de conseil signée par le souscripteur.
      </div>
    </div>

    <div class="footer">
      Document généré automatiquement par TaxiAssur le ${escape(formatDate(generatedAt))} - Usage interne exclusivement.
    </div>
  </div>
</body>
</html>`;
}
