import test from'node:test';import assert from'node:assert/strict';
import{generaliParisTime,generaliRunDecision,assertGeneraliCoverage}from'./generali-server-control.mjs';
test('Generali entry follows Paris time, including DST boundaries, from 07:00 until 21:00',()=>{
 for(const[instant,open]of[['2026-10-28T05:59:59Z',false],['2026-10-28T06:00:00Z',true],['2026-10-28T19:59:59Z',true],['2026-10-28T20:00:00Z',false],['2026-07-15T05:00:00Z',true],['2026-07-15T19:00:00Z',false]])assert.equal(generaliParisTime(new Date(instant)).entry_open,open,instant);
});
test('initial cases and the fleet dossier remain tracked without silent omissions',()=>{
 const batch={items:[{lead_id:'a',classification:'pending'},{lead_id:'b',classification:'pending'},{lead_id:'c',classification:'excluded_client'}]};
 const registry={cases:[{lead_id:'a'},{lead_id:'b'}],additional_cases:[{case_key:'taxi-fab-benci-20261027'}]};
 assert.equal(assertGeneraliCoverage(registry,batch).initial_cases,2);
 assert.throws(()=>assertGeneraliCoverage({...registry,cases:[{lead_id:'a'}]},batch),/coverage_mismatch/);
 assert.throws(()=>assertGeneraliCoverage({...registry,additional_cases:[]},batch),/fleet_case_missing/);
});
test('disabled, completed and already-started hours do not dispatch another agent',()=>{
 const now=new Date('2026-10-28T06:00:00Z'),registry={enabled:true,cases:[{status:'waiting_documents'}]};
 assert.equal(generaliRunDecision({now,registry,enabled:false}).decision,'disabled');
 assert.equal(generaliRunDecision({now,registry,lastSlot:'2026-10-28-07'}).decision,'already_started_this_hour');
 assert.throws(()=>generaliRunDecision({now,registry:{...registry,completed:true}}),/false_completion/);
 assert.equal(generaliRunDecision({now,registry:{completed:true,cases:[{status:'quote_sent'}]}}).decision,'complete');
 assert.equal(generaliRunDecision({now:new Date('2026-10-28T00:00:00Z'),registry,check:true}).decision,'preflight');
});
