export function mailAttachmentMatchesType(content,type){
 if(type==='application/pdf')return content.subarray(0,5).toString()==='%PDF-';
 if(type==='image/jpeg')return content[0]===255&&content[1]===216&&content[2]===255;
 if(type==='image/png')return content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(type==='image/webp')return content.subarray(0,4).toString()==='RIFF'&&content.subarray(8,12).toString()==='WEBP';
 return false;
}
