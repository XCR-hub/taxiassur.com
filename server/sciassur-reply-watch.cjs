const fs=require('node:fs/promises');
const {ImapFlow}=require('F:/XCR-Automation/jobs/TaxiAssur/tools/node_modules/imapflow');
const {simpleParser}=require('C:/XCR/Assurance/node_modules/mailparser');
const root='F:/XCR-Automation/jobs/SCIReply';
(async()=>{
 let input='';for await(const chunk of process.stdin)input+=chunk;
 const accounts=JSON.parse(input);input='';
 const config=JSON.parse((await fs.readFile(root+'/request.json','utf8')).replace(/^\uFEFF/,''));
 let prior;try{prior=JSON.parse(await fs.readFile(root+'/state/health.json','utf8'))}catch{}
 if(prior?.status==='reply_received_pending_review'){console.log(JSON.stringify({status:prior.status,previousDetectionPreserved:true,mailSent:false}));return;}
 const state={at:new Date().toISOString(),status:'waiting',readOnly:true,mailSent:false,mailboxes:[],replies:[]};
 for(const account of accounts){
  const client=new ImapFlow({host:'mail.xcr.fr',port:993,secure:true,auth:{user:account.user,pass:account.password},logger:false,tls:{rejectUnauthorized:true},connectionTimeout:15000,socketTimeout:20000});
  try{
   await client.connect();await client.mailboxOpen('INBOX',{readOnly:true});
   const ids=await client.search({since:new Date(config.since),from:config.sender},{uid:true});
   for(const uid of ids.slice(-100)){
    const message=await client.fetchOne(uid,{source:true,internalDate:true},{uid:true});
    if(message.internalDate&&new Date(message.internalDate)<new Date(config.since))continue;
    const mail=await simpleParser(message.source);
    if(!mail.from?.value?.some(f=>f.address?.toLowerCase()===config.sender))continue;
    const auto=String(mail.headers.get('auto-submitted')||'');
    if(auto&&auto.toLowerCase()!=='no'||/absence|automatic reply|rÃ©ponse automatique|out of office/i.test(mail.subject||''))continue;
    const refs=[mail.inReplyTo,...(Array.isArray(mail.references)?mail.references:[mail.references])].filter(Boolean);
    let followupId;try{const q=JSON.parse((await fs.readFile(root+'/state/followup-j3.json','utf8')).replace(/^\uFEFF/,''));followupId=require('./sciassur-j3-rules.cjs').followupMessageId(q);}catch{}
    if(!refs.includes(config.messageId)&&(!followupId||!refs.includes(followupId))&&!/SCIASSUR.*(?:point.*26 dossiers prospects|suivi des dossiers en cours)/i.test(mail.subject||''))continue;
    state.replies.push({account:account.user,uid,messageId:mail.messageId,receivedAt:message.internalDate,subject:mail.subject,text:mail.text||'',unreadPreserved:true});
   }
   state.mailboxes.push({user:account.user,ok:ids.length<=100,limited:ids.length>100});
  }catch{state.mailboxes.push({user:account.user,ok:false});}
  finally{try{await client.logout()}catch{}client.close();account.password='';}
 }
 if(state.replies.length)state.status='reply_received_pending_review';
 else if(state.mailboxes.some(m=>!m.ok))state.status='waiting_partial_coverage';
 await fs.writeFile(root+'/state/health.next.json',JSON.stringify(state,null,2));await fs.rename(root+'/state/health.next.json',root+'/state/health.json');
 console.log(JSON.stringify({status:state.status,mailboxes:state.mailboxes.length,verified:state.mailboxes.filter(m=>m.ok).length,replies:state.replies.length,mailSent:false}));
})().catch(()=>{console.error('SCI_REPLY_WATCH_FAILED');process.exitCode=1;});

