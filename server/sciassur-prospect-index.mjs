import {normalEmail} from './prospect-mail-matching.mjs';
export function sciassurProspects(rows){
 const cases=[];
 for(const row of Array.isArray(rows)?rows:[]){
  const id=typeof row.id==='string'?row.id.trim():'',email=normalEmail(typeof row.email==='string'?row.email:'');
  if(!id||id.length>120||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||/@(?:xcr\.fr|sciassur\.com)$/i.test(email))continue;
  cases.push({key:'sci:'+id,source:'SCIASSUR',source_id:id,email,name:String(row.name||email).trim(),status:String(row.crm_status||''),lead_id:null});
 }
 return cases;
}
