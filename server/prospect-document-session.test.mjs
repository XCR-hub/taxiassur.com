import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./taxiassur-platform-api.mjs',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async function prospectSession('),source.indexOf('async function adminDocumentWorkspaceUpload('));
const create=new Function('prospectToken','json','leadByToken','recordsForRelatedLeads','recordsWhere','preferredQuotesForLead','recordsAll','withPublicCompanyLogo',`${handler};return prospectSession;`);
test('prospect session includes classified CRM pieces, deduplicates IDs and preserves vehicle requirements',async()=>{
  const action=create(()=> 'token',(_res,_origin,status,body)=>({status,body}),async()=>({id:'lead',vehicle_type:'VTC'}),async collection=>collection==='prospect_documents'?[{id:'same',document_type:'rib',status:'pending'}]:[{id:'same',document_type:'rib',status:'validated'},{id:'crm',document_type:'carte_grise',status:'pending'},{id:'final',document_type:'attestation_assurance',status:'validated'}],async()=>[],async()=>[],async()=>[],x=>x);
  const result=await action({},{},'','request');
  assert.equal(result.status,200);assert.equal(result.body.lead.vehicle_type,'VTC');
  assert.equal(result.body.documents.length,2);assert.equal(result.body.documents.find(doc=>doc.id==='same').status,'validated');
  assert.equal(result.body.final_documents.length,1);
});
test('invalid prospect access does not read any private document collections',async()=>{
  let reads=0;
  const action=create(()=>'',(_res,_origin,status,body)=>({status,body}),async()=>null,async()=>{reads++;return[];},async()=>[],async()=>[],async()=>[],x=>x);
  assert.equal((await action({},{},'','request')).status,401);assert.equal(reads,0);
});
