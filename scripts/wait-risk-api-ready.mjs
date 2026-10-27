import {writeFileSync} from 'node:fs';
const output=process.argv[2],requireNew=process.argv[3]==='new',deadline=Date.now()+240000;
let report={ok:false,started_at:new Date().toISOString(),checks:[]};
while(Date.now()<deadline){
 try{
  const health=await fetch('http://127.0.0.1:8796/health',{signal:AbortSignal.timeout(2000)});
  if(health.ok){
   const version=await fetch('http://127.0.0.1:8796/v1/prospect/risk-questionnaire',{signal:AbortSignal.timeout(2000)});
   if(!requireNew||version.status===401){
    const access=await fetch('http://127.0.0.1:8796/v1/prospect/session',{headers:{'X-Prospect-Token':'a'.repeat(64)},signal:AbortSignal.timeout(10000)});
    if(access.status===403){report={...report,ok:true,ready_at:new Date().toISOString(),questionnaire_status:version.status,database_access_check:access.status};break}
   }
  }
 }catch(e){report.last_error=e.message}
 report.checked_at=new Date().toISOString();writeFileSync(output,JSON.stringify(report,null,2));
 await new Promise(resolve=>setTimeout(resolve,2000));
}
writeFileSync(output,JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
