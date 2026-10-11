import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('./taxiassur-platform-api.mjs',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async function adminLeadWhatsApp('),source.indexOf('async function adminLeadTimeline('));
const create=new Function('verifiedAdminSession','json','parseJsonLine','runPsql','quoteLiteral','readJsonBody','effectiveWhatsApp','uuidPattern','fetch','randomUUID','Buffer',`${handler};return adminLeadWhatsApp;`);
const key='11111111-1111-4111-8111-111111111111';
function fixture(previous=null){
  const queries=[];let sends=0;
  const action=create(async()=>({sub:'admin'}),(_res,_origin,status,body)=>({status,body}),JSON.parse,async sql=>{queries.push(sql);if(sql.includes("collection='crm_leads'"))return JSON.stringify({phone:'0600000000'});if(sql.includes("collection='crm_interactions'"))return JSON.stringify(previous);return '';},v=>`'${v}'`,async()=>({content:'Relance',request_id:key}),async()=>({accountSid:'mock',authToken:'mock',from:'+33000000000'}),/^[a-f0-9-]{36}$/i,async()=>{sends++;return{ok:true,json:async()=>({sid:'message-id'})};},()=>key,Buffer);
  return{queries,get sends(){return sends;},run:()=>action({},{},'','request','lead')};
}
test('a completed native WhatsApp retry reuses history without contacting the provider',async()=>{
  const f=fixture({id:'existing'});const result=await f.run();assert.equal(result.body.idempotent,true);assert.equal(f.sends,0);
});
test('native WhatsApp persists the retry key with its interaction after provider success',async()=>{
  const f=fixture();assert.equal((await f.run()).status,201);assert.equal(f.sends,1);assert.match(f.queries.at(-1),new RegExp(`"request_id":"${key}"`));
});
