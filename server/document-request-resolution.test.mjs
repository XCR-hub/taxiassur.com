import test from 'node:test';import assert from 'node:assert/strict';
import{documentRequestForUpload}from'./document-request-resolution.mjs';
const request={id:'request-a',lead_id:'lead-a',document_type:'permis_conduire',statut:'demande'};
const upload={leadId:'lead-a',documentType:'permis_conduire'};
test('portal uploads without a request ID reconcile the single pending request',()=>{
 assert.equal(documentRequestForUpload([request],upload),'request-a');
 assert.equal(documentRequestForUpload([{...request,document_type:null,type_document:'permis_conduire'}],upload),'request-a');
});
test('does not reconcile another prospect, another type, a completed request or ambiguous requests',()=>{
 for(const change of [{lead_id:'lead-b'},{document_type:'carte_grise'},{statut:'recu'},{statut:'annule'}])assert.equal(documentRequestForUpload([{...request,...change}],upload),null);
 const requests=[request,{...request,id:'request-b'}];
 assert.equal(documentRequestForUpload(requests,upload),null);
 assert.equal(documentRequestForUpload(requests,{...upload,requestId:'request-b'}),'request-b');
 assert.equal(documentRequestForUpload([{...request,lead_id:'lead-b'}],{...upload,requestId:'request-a'}),null);
});
