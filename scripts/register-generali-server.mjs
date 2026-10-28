import{pathToFileURL}from'node:url';
const{insurerEnvironment,insurerDatabase}=await import(pathToFileURL('F:/TaxiAssur/Api/insurer-runtime.mjs'));
const db=insurerDatabase(insurerEnvironment()),id='generali-server-agent';
const current=(await db.all('cron_jobs_config')).find(x=>x.id===id||x.name===id)||{};
await db.save('cron_jobs_config',id,{...current,id,name:id,job_name:id,description:'Devis Generali sur SERVEUR-XCR, navigateur headless, horaires Paris 07h-21h',is_enabled:current.is_enabled!==false,is_active:current.is_enabled!==false,execution_host:'SERVEUR-XCR',schedule:'0 * * * *',account:'SYSTEM',entry_hours:'07:00-21:00 Europe/Paris',updated_at:new Date().toISOString()});
