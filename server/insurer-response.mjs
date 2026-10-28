export function classifyInsurerResponse(email, row) {
  const tag='[TA-'+row.id+']';
  if(!String(email.subject||'').includes(tag))return null;
  const expectedDomain=String(row.recipient_email).split('@')[1]?.toLowerCase();
  const from=(email.from||[]).map(x=>String(x.email||'').toLowerCase());
  // Copies to Tony are evidence of submission, never an insurer response.
  const known=from.some(x=>x.endsWith('@'+expectedDomain));
  const text=(String(email.subject||'')+' '+String(email.preview||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const bounce=from.some(x=>/^(mailer-daemon|postmaster)@/.test(x))&&/undeliver|failure|non remis|non distribue|delivery status|adresse.*invalide/.test(text);
  if(bounce)return 'delivery_issue';
  if(!known)return null;
  if(/je suis absent|en conges|out of office|automatic reply|reponse automatique.*absence|absence du|boite.*non.*consulte/.test(text))return 'absence';
  if(/ne.*(pouvons|souhaitons).*(assurer|donner suite)|refus.*souscription|hors.*appetit/.test(text))return 'declined';
  if((email.attachments||[]).some(x=>x.type==='application/pdf'))return 'quote_to_review';
  if(/accuse.*reception|bien recu|demande.*enregistree|prise en compte|acknowledg|reponse automatique/.test(text))return 'acknowledgement';
  return 'response';
}
