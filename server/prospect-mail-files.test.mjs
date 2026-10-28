import test from 'node:test';import assert from 'node:assert/strict';
import{mailAttachmentMatchesType}from'./prospect-mail-files.mjs';
test('rejects active content disguised as a PDF or an image',()=>{
 for(const type of ['application/pdf','image/png','image/jpeg','image/webp'])assert.equal(mailAttachmentMatchesType(Buffer.from('<html><script>alert(1)</script>'),type),false);
 assert.equal(mailAttachmentMatchesType(Buffer.from('%PDF-1.7'), 'application/pdf'),true);
 assert.equal(mailAttachmentMatchesType(Buffer.from('%PDF-1.7'), 'image/jpeg'),false);
 assert.equal(mailAttachmentMatchesType(Buffer.from([255,216,255,224]),'image/jpeg'),true);
 assert.equal(mailAttachmentMatchesType(Buffer.alloc(0),'image/webp'),false);
});
