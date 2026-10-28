import test from 'node:test';
import assert from 'node:assert/strict';
import {matchProspect,selectProspectInbox,stableId,prospectFolderName} from './prospect-mail-matching.mjs';
const a={key:'aa:a',source_id:'12345678-1111-4111-8111-123456789012',email:'client@example.fr',name:'Client / Test'},b={key:'taxi:b',source_id:'22345678-1111-4111-8111-123456789012',email:'other@example.fr'};
test('matches exact participant without substring matches',()=>{assert.equal(matchProspect({from:[{email:'CLIENT@example.fr'}]},[a,b]).prospect.key,a.key);assert.equal(matchProspect({from:[{email:'fakeclient@example.fr'}]},[a,b]).status,'unmatched');});
test('shared addresses and mixed references remain ambiguous',()=>{assert.equal(matchProspect({from:[{email:a.email}]},[a,{...b,email:a.email}]).status,'ambiguous');assert.equal(matchProspect({from:[{email:b.email}],subject:`[AA:${a.source_id}]`},[a,b]).status,'ambiguous');});
test('carrier reference matches dossier and names are safe',()=>{assert.equal(matchProspect({subject:`Re: [AA:${a.source_id}]`},[a,b]).prospect.key,a.key);assert.ok(!prospectFolderName(a).includes('/'));assert.match(stableId('box:mail'),/^[a-f0-9-]{36}$/);});
test('old prospect messages remain visible after filtering',()=>{const messages=Array.from({length:150},(_,i)=>({id:String(i),received_at:new Date(1700000000000+i*1000).toISOString()}));assert.deepEqual(selectProspectInbox(messages,[{email_id:'0',folder_id:'client'}],'client').map(x=>x.id),['0']);});
