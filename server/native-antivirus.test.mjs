import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
const source=readFileSync(new URL('./taxiassur-platform-api.mjs',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async function scanFile('),source.indexOf('async function recordsAllWithMirror('));
const factory=new Function('existsSync','config','spawn',`${handler};return scanFile;`);
function fixture(codes) {
  const calls=[];
  const scan=factory(()=>true,{clamdScanPath:'resident',clamScanPath:'standalone',clamdConfigPath:'config',clamDatabasePath:'db'},(exe,args)=>{
    calls.push({exe,args});const child=new EventEmitter();child.kill=()=>child.emit('close',null);
    queueMicrotask(()=>child.emit('close',codes.shift()));return child;
  });
  return {scan,calls};
}
test('falls back to a full standalone scan when the resident service is unavailable',async()=>{
  const {scan,calls}=fixture([2,0]);assert.deepEqual(await scan('file.pdf'),{status:'clean'});
  assert.deepEqual(calls.map(c=>c.exe),['resident','standalone']);assert.ok(calls[1].args.includes('--database=db'));
});
test('never retries an infected result as if it were a service failure',async()=>{
  const {scan,calls}=fixture([1,0]);assert.deepEqual(await scan('file.pdf'),{status:'infected'});assert.equal(calls.length,1);
});
test('keeps blocking documents when both scanners fail',async()=>{
  const {scan}=fixture([2,2]);assert.deepEqual(await scan('file.pdf'),{status:'error'});
});
