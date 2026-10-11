import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('./taxiassur-platform-api.mjs',import.meta.url),'utf8');
const start=source.indexOf('async function adminDocumentWorkspace(');
const handler=source.slice(start,source.indexOf("  if(action==='import_reference')",start))+'}';
const create=new Function('verifiedAdminSession','json','parseJsonLine','runPsql','quoteLiteral','readJsonBody','uuidPattern','allowedDocumentTypes',`${handler};return adminDocumentWorkspace;`);
for(const existing of [{status:'validated',validated:true},{status:'verified',validated:true},{status:'pending',validated:true}]) {
  test(`reclassification clears stale validation for ${existing.status}`,async()=>{
    const queries=[];
    const action=create(async()=>({sub:'admin'}),(_res,_origin,status,body)=>({status,body}),JSON.parse,async sql=>{queries.push(sql);return JSON.stringify(sql.startsWith('SELECT')?(sql.includes("collection='crm_leads'")?{id:'lead'}:existing):null);},v=>`'${v}'`,async()=>({action:'move',document_id:'11111111-1111-4111-8111-111111111111',document_type:'rib'}),/^[a-f0-9-]{36}$/i,new Set(['rib']));
    const result=await action({method:'POST'},{},'','request','lead');
    assert.equal(result.status,200);assert.equal(result.body.validation_reset,true);
    assert.equal(result.body.document.validated,false);assert.equal(result.body.document.validation_status,'pending');
    assert.equal(result.body.document.validated_at,null);assert.match(queries.at(-1),/"validated":false/);
  });
}
