import { createHash } from 'node:crypto';
import { insurerSignature } from '../shared/insurer-dossier.mjs';
export function planInsurerFollowup(parent, children = [], now = Date.now()) {
  if(parent.status!=='sent'||parent.send_type==='followup'||!parent.sent_at||parent.responded_at)return null;
  const age=now-Date.parse(parent.sent_at);if(!Number.isFinite(age)||age<2*86400000)return null;
  const sentSteps=children.filter(c=>c.parent_send_id===parent.id&&c.status==='sent').map(c=>Number(c.followup_step));
  const step=sentSteps.includes(1)?2:1;
  if(sentSteps.includes(2)||age<(step===1?2:5)*86400000)return null;
  // Failed and uncertain attempts remain visible for manual investigation.
  if(children.some(c=>c.parent_send_id===parent.id&&Number(c.followup_step)===step))return null;
  const hex=createHash('sha256').update(parent.id+':followup:'+step).digest('hex');
  const id=`${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
  return {...parent,id,parent_send_id:parent.id,send_type:'followup',followup_step:step,status:'pending',documents:[],
    subject:'RE: '+parent.subject,message:`Bonjour,\n\nNous revenons vers vous concernant notre demande de devis taxi transmise le ${new Date(parent.sent_at).toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'})}.\nLes justificatifs figurent dans notre envoi initial. Pourriez-vous nous transmettre votre proposition ou nous préciser les éléments restant nécessaires ?\n\n${insurerSignature}`,
    created_at:new Date(now).toISOString(),updated_at:new Date(now).toISOString(),scheduled_at:new Date(now).toISOString(),
    sent_at:null,submission_requested_at:null,submission_id:null,email_id:null,message_id:null,sent_copy_verified:null,next_followup_at:null};
}
