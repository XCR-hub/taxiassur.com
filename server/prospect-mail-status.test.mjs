import test from 'node:test';import assert from 'node:assert/strict';import {followupDecision,followupFolderName,findProspectMailbox} from './prospect-mail-status.mjs';
const now=Date.parse('2026-10-29T12:00:00Z'),event=(kind,at='2026-10-28T12:00:00Z',extra={})=>({kind,at,proof:'synthetic-proof',...extra});
test('follow-up uses confirmed sends and relevant later replies, never generic refusal labels',()=>{
 for(const key of ['insurer_wait','prospect_wait','quote_wait'])assert.equal(followupDecision({now,events:[event(key)]}).key,key);
 assert.equal(followupDecision({now,events:[event('insurer_wait'),event('prospect_reply','2026-10-29T10:00:00Z')]}).key,'insurer_wait');
 for(const [wait,reply]of [['insurer_wait','insurer_reply'],['prospect_wait','prospect_reply'],['quote_wait','quote_decision']])assert.equal(followupDecision({now,events:[event(wait),event(reply,'2026-10-29T10:00:00Z')]}).key,'review');
 for(const kind of ['refused','quote_refused','contract_established','signed','payment_received'])assert.equal(followupDecision({now,events:[event(kind)]}).key,'review');
 assert.equal(followupDecision({now,events:[event('contract_issued')]}).key,'review');
 for(const kind of ['client_refused','contract_issued'])assert.equal(followupDecision({now,events:[event(kind,undefined,{verified:true})]}).key,kind);
 assert.equal(followupDecision({now,events:[event('client_refused',undefined,{verified:true}),event('contract_issued',undefined,{verified:true})]}).key,'review');
 assert.equal(followupDecision({now,closed:true,events:[event('quote_wait')]}).key,'review');
 for(const e of [event('quote_wait','bad'),event('quote_wait','2027-01-01'),event('quote_wait',undefined,{proof:''})])assert.equal(followupDecision({now,events:[e]}).key,'review');
});
test('status changes reuse stable mailbox identity and refuse ambiguous or moved folders',()=>{
 const c={name:'Synthetic company',source_id:'12345678-abcd'},old={id:'same-folder',parentId:'product',name:followupFolderName(c,'prospect_wait')};
 assert.equal(findProspectMailbox([old],'product',c)?.id,'same-folder');assert.equal(findProspectMailbox([old],'product',c,'same-folder')?.id,'same-folder');
 assert.throws(()=>findProspectMailbox([old,{...old,id:'copy'}],'product',c),/duplicate/);
 assert.throws(()=>findProspectMailbox([{...old,parentId:'elsewhere'}],'product',c,'same-folder'),/moved/);
 assert.ok(Buffer.byteLength(followupFolderName({...c,name:'\u{1F535}'.repeat(100)},'contract_issued'),'utf8')<=240);
});
