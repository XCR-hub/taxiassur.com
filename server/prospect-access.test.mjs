import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('./taxiassur-platform-api.mjs',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async function adminLeadProspectAccess('),source.indexOf('async function adminLeadPatch('));
const create=new Function('verifiedAdminSession','json','randomBytes','quoteLiteral','parseJsonLine','runPsql',`${handler};return adminLeadProspectAccess;`);
function fixture(session={sub:'admin'},record={access_token:'existing-token'}) {
  const queries=[],sizes=[];
  const action=create(async()=>session,(_res,_origin,status,body)=>({status,body}),size=>{sizes.push(size);return{toString:()=> 'a'.repeat(64)};},v=>`'${String(v).replaceAll("'","''")}'`,JSON.parse,async sql=>{queries.push(sql);return JSON.stringify(record);});
  return{queries,sizes,run:()=>action({},{},'','request-id','lead-id')};
}
test('prospect access requires admin authentication before generating or storing a token',async()=>{
  const f=fixture(null);assert.equal((await f.run()).status,401);assert.equal(f.queries.length,0);assert.equal(f.sizes.length,0);
});
test('prospect access preserves existing tokens in an atomic update and generates 32 secure bytes for missing tokens',async()=>{
  const f=fixture();const result=await f.run();assert.equal(result.body.access_token,'existing-token');assert.deepEqual(f.sizes,[32]);
  assert.match(f.queries[0],/COALESCE\(NULLIF\(data->>'access_token',''\)/);
  assert.match(f.queries[0],/COALESCE\(data->>'deleted_at',''\)=''/);
  assert.match(f.queries[0],/prospect_access_requested/);
});
test('prospect access returns not found instead of an unpersisted token',async()=>{
  const f=fixture({sub:'admin'},null);assert.equal((await f.run()).status,404);
});
