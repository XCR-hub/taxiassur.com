const crypto=require('node:crypto');
function followupMessageId(q){return '<sci-j3-'+crypto.createHash('sha256').update(q.originalMessageId+q.dueAt).digest('hex').slice(0,24)+'@xcr.fr>';}
function followupGate(q,watch,now=Date.now()){
 if(!Number.isFinite(Date.parse(q.dueAt))||!Array.isArray(q.cases)||!q.originalMessageId)throw Error('invalid_followup_queue');
 if(!q.sendEnabled||q.proposedRecipient!=='atemmerman@xcr.fr')return 'sending_disabled';
 if(watch?.replies?.length||watch?.status==='reply_received_pending_review')return 'paused_after_alexandra_reply';
 if(now<Date.parse(q.dueAt))return 'scheduled';
 const age=now-Date.parse(watch?.at);if(!Number.isFinite(age)||age<0||age>30*60000||watch.status!=='waiting'||!Array.isArray(watch.mailboxes)||!['tcerda@xcr.fr','contact@xcr.fr','team@sciassur.com'].every(a=>watch.mailboxes.some(m=>m.user===a&&m.ok&&!m.limited)))return 'waiting_for_verified_mailbox_check';
 return 'ready';
}
module.exports={followupMessageId,followupGate};
