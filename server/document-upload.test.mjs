import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(new URL('./taxiassur-platform-api.mjs', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('async function adminDocumentWorkspaceUpload('), source.indexOf('async function adminDocumentWorkspace('));
const names = ['verifiedAdminSession','drainAndJson','runPsql','parseJsonLine','quoteLiteral','allowedMimeTypes','safeFileName','decodeHeader','allowedDocumentTypes','maxUploadBytes','randomUUID','safeStoragePath','path','config','mkdirSync','receiveFile','scanFile','safeUnlink','json','renameSync'];
function fixture(scan = 'clean', notes = '  Pièce reçue\nAu bureau  ') {
  const queries = [], events = [];
  const respond = (_res,_origin,status,body) => ({ status, body });
  const values = [async()=>({sub:'admin'}),respond,async sql=>{ queries.push(sql);return sql.startsWith('SELECT')?'1':''; },JSON.parse,v=>`'${String(v).replaceAll("'","''")}'`,new Map([['application/pdf','pdf']]),v=>v,v=>decodeURIComponent(v||''),new Set(['carte_grise']),1000,()=> 'document-id',v=>v,path,{documentRoot:'/mock'},()=>{},async()=>({size:3,sha256:'hash'}),async()=>({status:scan}),()=>events.push('unlink'),respond,()=>events.push('rename')];
  const action = new Function(...names, `${handler};return adminDocumentWorkspaceUpload;`)(...values);
  return { queries, events, run:()=>action({headers:{'content-type':'application/pdf','content-length':'3','x-file-name':'carte.pdf','x-document-type':'carte_grise','x-document-notes':encodeURIComponent(notes)}},{},'', 'request-id', 'lead-id') };
}
test('native upload stores decoded notes with the scanned document and audit transaction', async()=>{
  const f=fixture();const result=await f.run();
  assert.equal(result.status,201);
  assert.equal(result.body.document.notes,'Pièce reçue\nAu bureau');
  assert.equal(result.body.document.uploaded_by,'admin');
  assert.match(f.queries.at(-1),/"notes":"Pièce reçue\\nAu bureau"/);
  assert.deepEqual(f.events,['rename']);
});
test('native upload limits note size on the server',async()=>{
  const result=await fixture('clean','x'.repeat(2500)).run();
  assert.equal(result.body.document.notes.length,2000);
});
test('an infected upload creates no document metadata and cleans up its temporary file',async()=>{
  const f=fixture('infected');const result=await f.run();
  assert.equal(result.status,422);
  assert.equal(result.body.error,'infected_file');
  assert.equal(f.queries.length,1);
  assert.deepEqual(f.events,['unlink']);
});
