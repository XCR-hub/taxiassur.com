import {prospectFolderName} from './prospect-mail-matching.mjs';
export const followupStatuses={
 insurer_wait:{label:'Attente assureur',marker:'\u{1F7E0}',color:'#9a3412'},
 prospect_wait:{label:'Attente prospect',marker:'\u{1F7E3}',color:'#6b21a8'},
 quote_wait:{label:'Devis - validation attendue',marker:'\u{1F535}',color:'#1d4ed8'},
 client_refused:{label:'Refus client confirme',marker:'\u{1F534}',color:'#b91c1c'},
 contract_issued:{label:'Contrat emis - finalise',marker:'\u{1F7E2}',color:'#15803d'},
 review:{label:'A verifier',marker:'\u26AA',color:'#4b5563'},
};
export function followupDecision({events=[],closed=false,now=Date.now()}={}){
 const valid=events.filter(e=>e&&typeof e.proof==='string'&&e.proof.trim()&&Number.isFinite(Date.parse(e.at))&&Date.parse(e.at)>0&&Date.parse(e.at)<=now+300000).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 const result=(key,reason,e)=>({key,...followupStatuses[key],reason,evidence:e?{kind:e.kind,at:e.at,proof:e.proof}:null});
 const terminals=valid.filter(e=>e.verified===true&&['client_refused','contract_issued'].includes(e.kind));
 if(new Set(terminals.map(e=>e.kind)).size>1)return result('review','Conflicting confirmed terminal evidence');
 if(terminals.length)return result(terminals[0].kind,'Confirmed terminal evidence',terminals[0]);
 if(closed)return result('review','Closed source case without confirmed client refusal or issued contract');
 const wait=valid.find(e=>['insurer_wait','prospect_wait','quote_wait'].includes(e.kind));
 if(!wait)return result('review','No confirmed current follow-up evidence');
 const replyKinds=wait.kind==='insurer_wait'?['insurer_reply']:['prospect_reply','quote_decision'];
 if(valid.some(e=>replyKinds.includes(e.kind)&&Date.parse(e.at)>=Date.parse(wait.at)))return result('review','A reply or decision needs review');
 return result(wait.kind,'Latest confirmed request or quote delivery',wait);
}
export function followupFolderName(c,key='review'){
 const status=followupStatuses[key]||followupStatuses.review;
 let base=prospectFolderName(c),prefix=status.marker+' '+status.label+' - ';
 while(Buffer.byteLength(prefix+base,'utf8')>240){const suffix=' - '+c.source_id.slice(0,8);const human=base.endsWith(suffix)?base.slice(0,-suffix.length):base;base=Array.from(human).slice(0,-1).join('')+suffix;}
 return prefix+base;
}
export function findProspectMailbox(boxes,parentId,c,knownId){
 const under=boxes.filter(b=>b.parentId===parentId);
 if(knownId){const known=boxes.find(b=>b.id===knownId);if(known){if(known.parentId!==parentId)throw Error('prospect_folder_moved_requires_review');return known;}}
 const names=new Set([prospectFolderName(c),...Object.keys(followupStatuses).map(key=>followupFolderName(c,key))]);
 const matches=under.filter(b=>names.has(b.name));
 if(matches.length>1)throw Error('duplicate_prospect_folders_require_review');
 return matches[0]||null;
}
