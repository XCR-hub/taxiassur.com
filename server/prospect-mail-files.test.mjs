import test from 'node:test';import assert from 'node:assert/strict';
import{mailAttachmentMatchesType,isInternalMailDocument,decodeMailFilename,mailAttachmentType}from'./prospect-mail-files.mjs';
test('recovers generic mail MIME only for supported named files and checks their bytes separately',()=>{
 const name='=?utf-8?Q?Relev=C3=A9=5Fassurance.pdf?=';
 assert.equal(decodeMailFilename(name),'Relevé_assurance.pdf');
 assert.equal(mailAttachmentType({name,type:'application/octet-stream'}),'application/pdf');
 assert.equal(mailAttachmentMatchesType(Buffer.from('<script>bad</script>'),mailAttachmentType({name,type:'application/octet-stream'})),false);
 assert.equal(mailAttachmentType({name:'permit.pdf.exe',type:'application/octet-stream'}),null);
 assert.equal(mailAttachmentType({name:'permit.pdf',type:'text/html'}),null);
 assert.equal(mailAttachmentType({name:'permit.pdf',type:'application/zip'}),null);
 assert.equal(mailAttachmentType({name:'scan.JPG',type:'application/octet-stream'}),'image/jpeg');
});
test('rejects active content disguised as a PDF or an image',()=>{
 for(const type of ['application/pdf','image/png','image/jpeg','image/webp'])assert.equal(mailAttachmentMatchesType(Buffer.from('<html><script>alert(1)</script>'),type),false);
 assert.equal(mailAttachmentMatchesType(Buffer.from('%PDF-1.7'), 'application/pdf'),true);
 assert.equal(mailAttachmentMatchesType(Buffer.from('%PDF-1.7'), 'image/jpeg'),false);
 assert.equal(mailAttachmentMatchesType(Buffer.from([255,216,255,224]),'image/jpeg'),true);
 assert.equal(mailAttachmentMatchesType(Buffer.alloc(0),'image/webp'),false);
});
test('mail imports remain internal until an explicit reviewed publication',()=>{
 assert.equal(isInternalMailDocument({notes:'Import mail XCR message:blob',validated:false}),true);
 assert.equal(isInternalMailDocument({notes:'Import mail XCR message:blob',validated:true}),true);
 assert.equal(isInternalMailDocument({internal_only:true}),true);
 assert.equal(isInternalMailDocument({notes:'Import mail XCR message:blob',visibility:'client',validated:true}),false);
 assert.equal(isInternalMailDocument({notes:'Uploaded by prospect'}),false);
});
