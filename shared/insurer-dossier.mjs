import { riskAssessment, visibleRiskFields, formatRiskValue } from './prospect-risk.mjs';

export const insurerSignature = 'Cordialement,\nTony CERDA\nXCR (EXCELLENCE COVERAGE RISKS)\ntcerda@xcr.fr\n06 83 52 67 51 / 01 80 85 57 80';
const rejected = new Set(['rejected', 'deleted', 'quarantined']);
const groups = [
  ['permis', 'Permis de conduire (recto et verso)', ['permis', 'permis_conduire', 'permis_recto', 'permis_verso']],
  ['identite', 'Pièce d’identité', ['identite', 'carte_identite', 'piece_identite', 'passeport']],
  ['carte_pro', 'Carte professionnelle taxi', ['carte_pro', 'carte_professionnelle']],
  ['licence_taxi', 'Licence taxi / ADS', ['licence_taxi', 'ads', 'licence']],
  ['releve_information', 'Relevés d’information couvrant les antécédents', ['releve_information', 'releve_info', 'ri']],
  ['kbis', 'Justificatif d’activité (Kbis / SIRENE)', ['kbis', 'sirene', 'siret']],
];
const allowed = new Set([...groups.flatMap(g => g[2]), 'carte_grise', 'bon_commande', 'facture_vehicule']);
export function eligibleInsurerDocument(doc, leadId) {
  return String(doc.lead_id) === String(leadId) && allowed.has(doc.document_type) &&
    Boolean(doc.file_path) && !rejected.has(doc.status) &&
    (doc.status === 'validated' || doc.validated === true) &&
    !['infected', 'error', 'quarantined'].includes(doc.security_scan_status);
}
export function leadTransmissionBlocked(lead = {}, suppressed = false) {
  const status = String(lead.status || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  return suppressed || Boolean(lead.deleted_at || lead.archived_at || lead.is_archived || lead.is_test || lead.is_internal || lead.do_not_contact || lead.email_opt_out || lead.email_blocked || lead.automation_paused) ||
    ['PERDU','LOST','ARCHIVED','ARCHIVE','SANS_SUITE','SANS SUITE','CLIENT','SOUSCRIT','CLIENT_ACTIF','ACTIVE_CLIENT','CROSS_SELLING','RISK_CHURN','SINISTRE','ATTESTATION_REQUEST','SUPPORT_ASSISTANCE','PAIEMENT','PAYMENT_PENDING','QUOTE_ACCEPTED','CONTRAT_SIGNATURE','CONTRACT_PENDING'].includes(status);
}
export function assessInsurerDossier({ lead, documents = [], questionnaire = {}, settings = {}, profile = {}, suppressed = false, history = [] }) {
  const answers = questionnaire.answers || {};
  const risk = riskAssessment(answers, documents);
  const selected = documents.filter(d => eligibleInsurerDocument(d, lead.id)).filter(d =>
    !['carte_grise', 'bon_commande', 'facture_vehicule'].includes(d.document_type) || String(d.id) === answers.vehicle_document_id);
  const missing = risk.missing.map(f => f.label);
  for (const [, label, types] of groups) if (!selected.some(d => types.includes(d.document_type))) missing.push(label);
  if (!selected.some(d => String(d.id) === answers.vehicle_document_id)) missing.push('Justificatif validé du véhicule à assurer');
  if (!questionnaire.confirmed_at) missing.push('Confirmation du questionnaire du prospect');
  const clientReference = String(settings.client_reference || '').replace(/\s/g, '');
  if (profile.code === 'axa' && !/^\d{7,12}$/.test(clientReference)) missing.push('Numéro client AXA vérifié');
  if (!settings.evidence_reviewed_at || settings.questionnaire_updated_at !== (questionnaire.updated_at || questionnaire.confirmed_at)) missing.push('Vérification des pièces et des antécédents par le conseiller');
  if (!profile.verified_at || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.recipient_email || '')) missing.push('Interlocuteur assureur vérifié');
  const blocked = leadTransmissionBlocked(lead, suppressed);
  const previous = history.find(d => d.workflow_code === profile.code && (d.sent_at || d.submission_requested_at || !['cancelled', 'failed'].includes(d.status)));
  return { ready: !blocked && !previous && !missing.length, blocked, previous_send_id: previous?.id || null,
    missing: [...new Set(missing)], needs_review: risk.needs_review,
    document_ids: selected.map(d => String(d.id)), client_reference: clientReference,
    status: blocked ? 'blocked' : previous ? 'already_consulted' : missing.length ? 'waiting_documents' : 'ready' };
}
export function insurerRequestBody({ lead, questionnaire, settings, profile, documents, note = '' }) {
  const answers = questionnaire.answers || {};
  const facts = visibleRiskFields(answers).filter(f => answers[f.key] !== undefined && answers[f.key] !== '' && f.key !== 'vehicle_document_id')
    .map(f => `${f.label} : ${formatRiskValue(f, answers[f.key])}`).join('\n');
  return `Bonjour,\n\nMerci de nous transmettre votre proposition d’assurance taxi pour ${[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company_name || 'le prospect'}.\n${profile.code === 'axa' ? `Numéro client AXA : ${String(settings.client_reference||'À compléter').replace(/\s/g, '')}\n` : ''}${profile.portfolio_reference?`Code portefeuille : ${profile.portfolio_reference}\n`:''}\n${facts}\n\nPièces jointes vérifiées :\n${documents.map(d => '- ' + (d.file_name || d.original_name || d.document_type)).join('\n')}\n${note ? '\n' + note.trim() + '\n' : ''}\nMerci de préciser la prime, les garanties, les franchises, les conditions et la durée de validité de votre offre.\n\n${insurerSignature}`;
}
