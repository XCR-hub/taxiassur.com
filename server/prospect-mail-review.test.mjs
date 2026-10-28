import test from'node:test';import assert from'node:assert/strict';
import{fileProspectMailForReview}from'./prospect-mail-review.mjs';import{stableId}from'./prospect-mail-matching.mjs';
test('ambiguous mail loses its lead link and preserves original Inbox membership',async()=>{
 const account={id:'taxi',address:'team@taxiassur.com'},mail={id:'mail1',mailboxIds:{inbox:true,old:true},from:[{email:'client@example.fr'}],subject:'Documents',attachments:[]},id=stableId('xcr-mail:'+account.address+':'+mail.id),old={id,lead_id:'lead1',body_text:'Keep history',attachments:[]};
 const saves=[],calls=[],folders=new Map([[stableId('xcr-prospect-folder:taxi:lead1'),{name:'Old lead'}]]),existing=new Map([[id,old]]),boxes=[{id:'root',name:'Prospects XCR'},{id:'product',name:'TaxiAssur',parentId:'root'},{id:'old',name:'Old lead',parentId:'product'},{id:'review',name:'A verifier - rapprochement prospect',parentId:'product'}];
 await fileProspectMailForReview({db:{save:async(collection,id,data)=>saves.push({collection,id,data})},mail,account,candidates:[{key:'taxi:lead1',source:'TaxiAssur'},{key:'taxi:lead2',source:'TaxiAssur'}],folders,existing,boxes,call:async(...args)=>{calls.push(args);return {};}});
 const row=saves.find(x=>x.collection==='xcr_email_messages').data;assert.equal(row.lead_id,null);assert.equal(row.previous_lead_id,'lead1');assert.equal(row.body_text,'Keep history');assert.equal(row.link_status,'needs_review');
 assert.deepEqual(calls[0][2].update.mail1,{'mailboxIds/review':true,'mailboxIds/old':null});assert.equal(mail.mailboxIds.inbox,true);
});
