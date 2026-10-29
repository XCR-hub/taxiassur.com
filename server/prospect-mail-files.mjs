export function decodeMailFilename(name){
 return String(name||'').replace(/=\?utf-8\?([bq])\?([^?]+)\?=/gi,(_,encoding,value)=>{
  if(encoding.toLowerCase()==='b')return Buffer.from(value,'base64').toString('utf8');
  return Buffer.from(value.replace(/_/g,' ').replace(/=([0-9a-f]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))),'binary').toString('utf8');
 });
}
export function mailAttachmentType(attachment){
 const type=String(attachment?.type||'').toLowerCase().split(';')[0].trim();
 if(['application/pdf','image/jpeg','image/png','image/webp'].includes(type))return type;
 if(!['','application/octet-stream','binary/octet-stream'].includes(type))return null;
 const extension=decodeMailFilename(attachment?.name).match(/\.(pdf|jpe?g|png|webp)$/i)?.[1]?.toLowerCase();
 return {pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[extension]||null;
}
export function mailAttachmentMatchesType(content,type){
 if(type==='application/pdf')return content.subarray(0,5).toString()==='%PDF-';
 if(type==='image/jpeg')return content[0]===255&&content[1]===216&&content[2]===255;
 if(type==='image/png')return content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(type==='image/webp')return content.subarray(0,4).toString()==='RIFF'&&content.subarray(8,12).toString()==='WEBP';
 return false;
}
export function isInternalMailDocument(document){
 if(document?.visibility==='client'&&document?.validated===true)return false;
 return document?.internal_only===true||document?.visibility==='internal'||String(document?.notes||'').startsWith('Import mail XCR ');
}
