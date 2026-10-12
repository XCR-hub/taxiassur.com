import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./taxiassur-platform-api.mjs',import.meta.url),'utf8');
const start=source.indexOf('async function adminLeadTimeline(');
const handler=source.slice(start,source.indexOf('\nasync function ',start+1));
const create=new Function('verifiedAdminSession','json','parseJsonLine','runPsql','quoteLiteral','readJsonBody','randomUUID',`${handler};return adminLeadTimeline;`);
test('native note creation checks its lead without consulting the inaccessible legacy schema',async()=>{
  const queries=[];
  const action=create(async()=>({sub:'admin'}),(_res,_origin,status,body)=>({status,body}),JSON.parse,async sql=>{queries.push(sql);return sql.startsWith('SELECT')?JSON.stringify({id:'lead'}):'';},v=>`'${v}'`,async()=>({channel:'note',content:'Pièces reçues au bureau'}),()=> 'note-id');
  const result=await action({method:'POST'},{},'','request','lead');
  assert.equal(result.status,201);assert.equal(result.body.note.content,'Pièces reçues au bureau');
  assert.doesNotMatch(queries[0],/supabase_rest/);assert.match(queries.at(-1),/crm_note_added/);assert.match(queries.at(-1),/crm_interactions/);
});
