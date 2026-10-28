const {readFileSync}=require('node:fs');
const checks=[
 ['shared/insurer-dossier.mjs',['assessInsurerDossier','leadTransmissionBlocked','eligibleInsurerDocument','confirmed_at','client_reference','licence_taxi']],
 ['server/insurer-dossier-service.mjs',['pg_advisory_xact_lock','NOT EXISTS','inspectFile','expected_review_version','document_snapshot']],
 ['server/insurer-dossier-api.mjs',['verifiedAdminSession','workflow_code_required','mark_responded','submission_requested_at']],
 ['server/insurer-jmap.mjs',['EmailSubmission/set','insurerSender','journal','sha256','sent_copy_verified']],
 ['server/native-insurer-worker.mjs',['delivery_unknown','insurer_dossier_readiness','classifyInsurerResponse','planInsurerFollowup','crm_interactions']],
 ['server/insurer-file-check.mjs',['attachment_owner_mismatch','attachment_invalid_path','attachment_scan_failed','realpathSync']],
 ['src/components/crm/SendToInsurerModal.tsx',['nativeAdminCall','/insurer-dossier','client_reference','automation_enabled','Historique des transmissions']],
 ['src/backoffice/InsurerDossierCommandCenter.tsx',['/v1/admin/insurer-dossiers','mark_responded','retryDossier','cancelDossier','next_followup_at','delivery_unknown']],
 ['scripts/install-native-insurers.ps1',['SYSTEM','PT5M','MultipleInstances=2','native-insurer-worker.mjs']],
 ['package.json',['server:process-insurer-dossier-sends','server/native-insurer-worker.mjs']],
 ['.github/workflows/deploy-cloudflare-pages.yml',['Commercial workflow guard','npm run verify:commercial-workflow']],
 ['docs/compliance/insurer-dossier-workflow.md',['J+2','J+5','No hidden contact import','delivery_unknown','SYSTEM']],
].map(([file,patterns])=>{const source=readFileSync(file,'utf8');const missing=patterns.filter(p=>!source.includes(p));return{file,ok:missing.length===0,missing};});
const browser=readFileSync('src/components/crm/SendToInsurerModal.tsx','utf8');
const forbidden=/navigator\.contacts|chrome\.history|send-email-ionos/.test(browser);
const report={ok:checks.every(c=>c.ok)&&!forbidden,checked_at:new Date().toISOString(),checks,forbidden};
console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
