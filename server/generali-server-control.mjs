export function generaliParisTime(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return{hour:Number(p.hour),day:`${p.year}-${p.month}-${p.day}`,slot:`${p.year}-${p.month}-${p.day}-${p.hour}`,entry_open:Number(p.hour)>=7&&Number(p.hour)<21};
}
export function generaliRunDecision({now=new Date(),enabled=true,registry={},lastSlot='',check=false}){
 const time=generaliParisTime(now);
 if(!enabled||registry.enabled===false)return{...time,decision:'disabled'};
 const terminal=registry.terminal_statuses||['quote_sent','insurer_refused','already_queried_verified','closed_or_optout_verified'];
 const cases=[...(registry.cases||[]),...(registry.additional_cases||[])];
 const remaining=cases.filter(x=>!terminal.includes(x.status));
 if(registry.completed&&remaining.length)throw Error('false_completion_with_outstanding_cases');
 if(check)return{...time,decision:'preflight',remaining:remaining.length};
 if(!time.entry_open)return{...time,decision:'outside_generali_hours',remaining:remaining.length};
 if(registry.completed)return{...time,decision:'complete',remaining:0};
 if(lastSlot===time.slot)return{...time,decision:'already_started_this_hour',remaining:remaining.length};
 return{...time,decision:'run',remaining:remaining.length};
}
export function assertGeneraliCoverage(registry,batch){
 const expected=(batch.items||[]).filter(x=>!String(x.classification).startsWith('excluded')&&x.classification!=='generali_already_recorded');
 const ids=(registry.cases||[]).map(x=>x.lead_id);
 if(new Set(ids).size!==ids.length||expected.some(x=>!ids.includes(x.lead_id)))throw Error('case_registry_coverage_mismatch');
 if((registry.additional_cases||[]).filter(x=>x.case_key==='taxi-fab-benci-20261027').length!==1)throw Error('fleet_case_missing');
 return{initial_cases:expected.length,tracked_cases:ids.length,additional_cases:(registry.additional_cases||[]).length};
}
