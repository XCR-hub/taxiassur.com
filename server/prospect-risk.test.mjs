import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normaliseRiskPatch,riskAssessment,visibleRiskFields} from '../shared/prospect-risk.mjs';

test('drafts preserve real values and reject protected fields, malformed dates and unsupported choices',()=>{
 const result=normaliseRiskPatch({household_vehicles:'2',household_licences:'1',garage_closed:'yes',garage_covered:'unknown',new_value:'40990.20'});
 assert.equal(result.answers.household_licences,1);assert.equal(result.answers.new_value,40990.2);
 const invalid=normaliseRiskPatch(JSON.parse('{"lead_id":"victim","confirmed_at":"now","__proto__":{},"birth_date":"2026-02-30","financing":"free","fiscal_power":8.5}'));
 for(const key of ['lead_id','confirmed_at','__proto__','birth_date','financing','fiscal_power'])assert.ok(Object.hasOwn(invalid.errors,key),key);
 assert.equal(Object.keys(normaliseRiskPatch({new_value:'  '}).answers).length,1);
 assert.equal(normaliseRiskPatch({new_value:'  '}).answers.new_value,null);
});
test('an older registration document cannot satisfy the explicitly selected vehicle order',()=>{
 const old={id:'00000000-0000-4000-a000-000000000001',document_type:'carte_grise',file_path:'old.pdf',status:'validated'};
 const order={id:'00000000-0000-4000-a000-000000000002',document_type:'bon_commande',file_path:'order.pdf',file_name:'Bon Tesla.pdf',status:'pending'};
 const answers={vehicle_document:'bon_commande',vehicle_document_id:order.id};
 assert.equal(riskAssessment(answers,[old]).missing_documents[0].type,'bon_commande');
 assert.equal(riskAssessment(answers,[old,order]).vehicle_document.name,'Bon Tesla.pdf');
 assert.equal(riskAssessment({...answers,vehicle_document_id:old.id},[old,order]).missing_documents.length,1);
 assert.equal(riskAssessment(answers,[{...order,status:'quarantined'}]).missing_documents.length,1);
});
test('garage conditions and an estimate remain explicit review points rather than positive defaults',()=>{
 const a=riskAssessment({garage_individual:'yes',garage_closed:'yes',garage_covered:'unknown',value_source:'catalogue',household_vehicles:2,household_licences:1});
 assert.ok(a.missing.some(x=>x.key==='garage_covered'));
 assert.ok(a.missing.some(x=>x.key==='sra'));
 assert.ok(a.needs_review.some(x=>x.includes('Valeur à neuf estimée')));
 assert.ok(a.needs_review.some(x=>x.includes('nombres réellement déclarés')));
});
test('active insurance never implies a cancellation date or an insured-initiated cancellation',()=>{
 const fields=visibleRiskFields({insurance_status:'active'}).map(x=>x.key);
 assert.ok(!fields.includes('cancellation_date'));assert.ok(!fields.includes('cancellation_reason'));
 assert.ok(visibleRiskFields({insurance_status:'insurer_cancelled'}).some(x=>x.key==='cancellation_reason'));
 assert.ok(riskAssessment({insurance_status:'insurer_cancelled'}).needs_review.some(x=>x.includes('assureur')));
});

const source=readFileSync(new URL('./taxiassur-platform-api.mjs',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async function prospectRiskQuestionnaire('),source.indexOf('async function adminDocumentWorkspaceUpload('));
function makeAction({token='good',lead={id:'lead-a'},current=null,body={},admin=null}={}){
 const sql=[];
 const runPsql=async query=>{sql.push(query);if(query.startsWith('SELECT data::text'))return current;if(query.startsWith('INSERT INTO taxiassur.records')){const match=query.match(/VALUES\('lead_risk_questionnaires','lead-a','(.*?)'::jsonb/);return match?JSON.parse(match[1].replaceAll("''","'")):null}return null;};
 const create=new Function('verifiedAdminSession','prospectToken','leadByToken','parseJsonLine','runPsql','quoteLiteral','recordsForRelatedLeads','json','readJsonBody','normaliseRiskPatch','riskAssessment',`${handler};return prospectRiskQuestionnaire;`);
 const action=create(async()=>admin,()=>token,async()=>lead,x=>x,runPsql,v=>`'${String(v).replaceAll("'","''")}'`,async()=>[],(_res,_origin,status,body)=>({status,body}),async()=>body,normaliseRiskPatch,riskAssessment);
 return {action,sql};
}
test('missing and invalid prospect tokens cannot read the questionnaire or documents',async()=>{
 for(const options of [{token:''},{lead:null}]){const {action,sql}=makeAction(options);const result=await action({method:'GET'},{},'','request');assert.ok([401,403].includes(result.status));assert.equal(sql.length,0);}
 const {action,sql}=makeAction();assert.equal((await action({method:'GET'},{},'','request','victim')).status,401);assert.equal(sql.length,0);
});
test('writes use only the lead resolved from the token and optimistic revisions reject stale edits',async()=>{
 const {action,sql}=makeAction({body:{lead_id:'victim',answers:{make:'TESLA'},expected_revision:0}});
 const result=await action({method:'PATCH'},{},'','00000000-0000-4000-a000-000000000001');
 assert.equal(result.status,200);assert.equal(result.body.questionnaire.lead_id,'lead-a');assert.equal(result.body.questionnaire.answers.make,'TESLA');assert.ok(!sql.join('\n').includes('victim'));
 const stale=makeAction({current:{lead_id:'lead-a',answers:{make:'OTHER'},revision:2},body:{answers:{make:'TESLA'},expected_revision:1}});
 assert.equal((await stale.action({method:'PATCH'},{},'','request')).status,409);assert.ok(stale.sql.every(x=>!x.startsWith('INSERT')));
});
