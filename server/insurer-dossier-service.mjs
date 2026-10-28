import { randomUUID, createHash } from 'node:crypto';
import { assessInsurerDossier, insurerRequestBody } from '../shared/insurer-dossier.mjs';

// Both the authenticated API and the scheduled worker use the same readiness rules.
export function createInsurerDossierService({ all, where, save, query, literal, inspectFile }) {
  async function workspace(lead, code = 'axa') {
    const [profiles, prospect, crm, questionnaires, settingsRows, history, suppressions, health, quotes, responses] = await Promise.all([
      all('insurer_quote_workflows'), where('prospect_documents', 'lead_id', lead.id), where('crm_lead_documents', 'lead_id', lead.id),
      where('lead_risk_questionnaires', 'lead_id', lead.id), where('insurer_dossier_settings', 'lead_id', lead.id),
      where('insurer_dossier_sends', 'lead_id', lead.id), all('email_suppressions'), all('automation_worker_health'), where('lead_company_quotes','lead_id',lead.id), where('insurer_quote_responses','lead_id',lead.id),
    ]);
    // Older questionnaire records use the lead id as record id without lead_id.
    const questionnaire = questionnaires[0] || (await all('lead_risk_questionnaires')).find(x => x.id === lead.id || x.lead_id === lead.id) || {};
    const settings = settingsRows.find(x => x.workflow_code === code) || {};
    const profile = profiles.find(x => x.code === code && x.enabled === true) || { code };
    const documents = prospect.concat(crm).map(d => ({ ...d, source: prospect.includes(d) ? 'prospect' : 'crm' }));
    const suppressed = suppressions.some(x => x.active === true && String(x.email || x.recipient || '').trim().toLowerCase() === String(lead.email || '').trim().toLowerCase());
    const assessment = assessInsurerDossier({ lead, documents, questionnaire, settings, profile, suppressed, history });
    if(settings.document_snapshot!==snapshot(documents)){assessment.ready=false;assessment.missing.push('Pièces modifiées : nouvelle vérification nécessaire');}
    const selected = documents.filter(d => assessment.document_ids.includes(String(d.id)));
    const preview = insurerRequestBody({ lead, questionnaire, settings, profile, documents: selected, note: settings.note || '' });
    const consulted = quotes.some(x => x.company_id === profile.company_id && (x.quote_file_url || x.quote_pdf_url || ['quote_submitted','sent','accepted'].includes(x.status)));
    if(consulted){assessment.ready=false;assessment.status='already_consulted';assessment.missing.push('AXA dispose déjà d’une consultation ou d’un devis pour ce dossier');}
    const worker = health.find(x => x.id === 'insurer-worker-health');
    const review_version=createHash('sha256').update(snapshot(documents)+JSON.stringify(questionnaire)).digest('hex');
    return { lead, profiles: profiles.filter(x => x.enabled), profile, documents, questionnaire, settings, history, responses, assessment, preview, review_version,
      worker: worker ? { last_run_at: worker.last_run_at, status: worker.status } : null };
  }
  async function configure(lead, body, actor) {
    const code = String(body.workflow_code || 'axa');
    if (!['axa'].includes(code)) throw Object.assign(new Error('unsupported_workflow'), { status: 400 });
    const current = await workspace(lead, code);
    if(body.evidence_reviewed===true&&body.expected_review_version!==current.review_version)throw Object.assign(new Error('dossier_changed_reload_required'),{status:409});
    const id = `${lead.id}:${code}`;
    const now = new Date().toISOString();
    const settings = { ...current.settings, id, lead_id: lead.id, workflow_code: code,
      client_reference: String(body.client_reference ?? current.settings.client_reference ?? '').trim().slice(0, 30),
      note: String(body.note ?? current.settings.note ?? '').trim().slice(0, 4000),
      automation_enabled: body.automation_enabled === true,
      updated_at: now, updated_by: actor };
    if (body.evidence_reviewed === true) {
      settings.evidence_reviewed_at = now; settings.evidence_reviewed_by = actor;
      settings.questionnaire_updated_at = current.questionnaire.updated_at || current.questionnaire.confirmed_at || null;
      // Any document replacement or validation change invalidates the review.
      settings.document_snapshot = snapshot(current.documents);
    }
    await save('insurer_dossier_settings', id, settings);
    return workspace(lead, code);
  }
  async function queue(lead, code, actor) {
    const w = await workspace(lead, code);
    if (w.settings.document_snapshot !== snapshot(w.documents)) w.assessment.missing.push('Pièces modifiées : nouvelle vérification nécessaire');
    if (!w.assessment.ready || w.assessment.missing.length) return { ok: false, error: 'dossier_incomplete', assessment: w.assessment };
    const selected = w.documents.filter(d => w.assessment.document_ids.includes(String(d.id)));
    const files = [], hashes = new Set();
    let total = 0;
    for (const doc of selected) { const f = await inspectFile(doc, lead.id); if(hashes.has(f.sha256))continue;hashes.add(f.sha256);total += f.size; files.push({ ...doc, ...f }); }
    if(files.length>30)return {ok:false,error:'too_many_attachments'};
    if (total > 18 * 1024 * 1024) return { ok: false, error: 'attachments_too_large' };
    const id = randomUUID(), now = new Date().toISOString();
    const row = { id, lead_id: lead.id, workflow_code: code, company_id: w.profile.company_id || null,
      recipient_email: w.profile.recipient_email, recipient_name: w.profile.recipient_name, company_name: w.profile.name || code.toUpperCase(),
      sender: 'tcerda@xcr.fr', cc: ['tcerda@xcr.fr'], subject: `Demande de devis taxi [TA-${id}] - ${[lead.first_name, lead.last_name].filter(Boolean).join(' ')}`,
      message: w.preview, documents: files, status: 'pending', created_by: actor, created_at: now, updated_at: now,
      followup_step: 0, attempts: 0, max_attempts: 1, send_type: 'initial', scheduled_at: now,
      questionnaire_updated_at: w.questionnaire.updated_at || w.questionnaire.confirmed_at, document_snapshot: snapshot(w.documents) };
    // Transaction lock + history check prevents concurrent API/worker double queues.
    const inserted = await query(`BEGIN;SELECT pg_advisory_xact_lock(hashtext(${literal(lead.id + ':' + code)}));INSERT INTO taxiassur.records(collection,record_id,data,origin) SELECT 'insurer_dossier_sends',${literal(id)},${literal(JSON.stringify(row))}::jsonb,'native-insurer' WHERE NOT EXISTS(SELECT 1 FROM taxiassur.records WHERE collection='insurer_dossier_sends' AND data->>'lead_id'=${literal(lead.id)} AND data->>'workflow_code'=${literal(code)} AND (data->>'status' NOT IN ('failed','cancelled') OR COALESCE(data->>'sent_at','')<>'' OR COALESCE(data->>'submission_requested_at','')<>''));COMMIT;SELECT data::text FROM taxiassur.records WHERE collection='insurer_dossier_sends' AND record_id=${literal(id)};`);
    return inserted ? { ok: true, send_id: id, email_queued: true } : { ok: false, error: 'already_consulted' };
  }
  return { workspace, configure, queue };
}
export function snapshot(documents) { return JSON.stringify(documents.map(d => [d.id, d.file_path, d.status, d.validated, d.updated_at]).sort((a,b) => String(a[0]).localeCompare(String(b[0])))); }
