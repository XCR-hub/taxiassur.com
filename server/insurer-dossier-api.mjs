import { createInsurerDossierService } from './insurer-dossier-service.mjs';
import { createInsurerFileInspector } from './insurer-file-check.mjs';

export function insurerDossierHandler(deps) {
  const { verifiedAdminSession, json, readJsonBody, recordsAll, recordsWhere, runPsql, parseJsonLine, quoteLiteral, env } = deps;
  const save = async (collection,id,data) => runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES(${quoteLiteral(collection)},${quoteLiteral(id)},${quoteLiteral(JSON.stringify(data))}::jsonb,'native-insurer') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;`);
  const service = createInsurerDossierService({all:recordsAll,where:recordsWhere,save,query:async sql=>parseJsonLine(await runPsql(sql)),literal:quoteLiteral,inspectFile:createInsurerFileInspector(env)});
  return async function handler(req,res,origin,requestId,leadId) {
    const session=await verifiedAdminSession(req);
    if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
    const lead=(await recordsWhere('crm_leads','id',leadId)).find(x=>x.id===leadId);
    if(!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);
    if(req.method==='GET')return json(res,origin,200,{ok:true,workspace:await service.workspace(lead)},requestId);
    const body=await readJsonBody(req);
    if(req.method==='PATCH') {
      if(body.action==='configure'){
        try{return json(res,origin,200,{ok:true,workspace:await service.configure(lead,body,session.sub)},requestId);}
        catch(e){return json(res,origin,e.status||400,{ok:false,error:e.message==='dossier_changed_reload_required'?'dossier_changed_reload_required':'invalid_settings'},requestId);}
      }
      const row=(await recordsWhere('insurer_dossier_sends','lead_id',leadId)).find(x=>x.id===body.send_id);
      if(!row)return json(res,origin,404,{ok:false,error:'dossier_not_found'},requestId);
      const now=new Date().toISOString();
      if(body.action==='mark_responded')await save('insurer_dossier_sends',row.id,{...row,status:'responded',responded_at:now,next_followup_at:null,response_note:String(body.note||'').slice(0,2000),updated_at:now});
      else if(body.action==='cancel'&&['pending','failed','sent'].includes(row.status))await save('insurer_dossier_sends',row.id,{...row,status:'cancelled',cancelled_at:now,next_followup_at:null,updated_at:now});
      else if(body.action==='retry'&&row.status==='failed'&&!row.submission_requested_at){await save('insurer_dossier_sends',row.id,{...row,status:'cancelled',updated_at:now});return json(res,origin,200,await service.queue(lead,row.workflow_code,session.sub),requestId);}
      else return json(res,origin,409,{ok:false,error:'action_not_allowed'},requestId);
      return json(res,origin,200,{ok:true},requestId);
    }
    if(body.workflow_code!=='axa')return json(res,origin,400,{ok:false,error:'workflow_code_required'},requestId);
    try {
      const result=await service.queue(lead,String(body.workflow_code||'axa'),session.sub);
      return json(res,origin,result.ok?201:409,result,requestId);
    }catch(error){return json(res,origin,422,{ok:false,error:String(error.message).startsWith('attachment_')?error.message:'dossier_check_failed'},requestId);}
  };
}
