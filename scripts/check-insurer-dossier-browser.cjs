const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const NATIVE_ADMIN_TOKEN_KEY=fs.readFileSync('src/lib/native-admin-auth.ts','utf8').match(/NATIVE_ADMIN_TOKEN_KEY = '([^']+)'/)[1];
 fs.mkdirSync('reports',{recursive:true});
 fs.writeFileSync('reports/insurer-fixture.html',`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/reports/insurer-fixture.tsx"></script></body></html>`);
 fs.writeFileSync('reports/insurer-fixture.tsx',`import React from 'react';import{createRoot}from'react-dom/client';import Modal from '../src/components/crm/SendToInsurerModal';import'../src/index.css';createRoot(document.getElementById('root')!).render(<Modal isOpen={true} onClose={()=>{}} leadId="00000000-0000-4000-a000-000000000001" leadName="CLIENT TEST"/>);`);
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:960}});const errors=[];const writes=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(key=>localStorage.setItem(key,'fixture-only'),NATIVE_ADMIN_TOKEN_KEY);
 let workspace={review_version:'revision-1',profile:{code:'axa',name:'AXA Entreprises',recipient_name:'Contact vérifié',recipient_email:'axa@example.invalid'},settings:{},assessment:{ready:false,blocked:false,status:'waiting_documents',missing:['Numéro client AXA vérifié','Licence taxi / ADS'],needs_review:[],document_ids:['doc-1']},documents:[{id:'doc-1',file_name:'Carte grise véhicule demandé.pdf',document_type:'carte_grise',status:'validated'},{id:'old',file_name:'Ancien véhicule.pdf',document_type:'carte_grise',status:'validated'},{id:'rib',file_name:'RIB.pdf',document_type:'rib',status:'validated'}],history:[],preview:'Bonjour,\n\nCordialement,\nTony CERDA\nXCR (EXCELLENCE COVERAGE RISKS)',worker:{last_run_at:'2026-10-28T01:00:00Z',status:'healthy'}};
 await page.route('**/v1/admin/leads/**/insurer-dossier',async route=>{
  const req=route.request();if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,PATCH,POST'}});
  if(req.method()==='PATCH'){const body=req.postDataJSON();writes.push(body);assert.equal(body.expected_review_version,'revision-1');workspace={...workspace,settings:{client_reference:body.client_reference,note:body.note,automation_enabled:body.automation_enabled}};}
  if(req.method()==='POST'){writes.push(req.postDataJSON());return route.fulfill({json:{ok:false,error:'must_not_send_incomplete'},status:409});}
  return route.fulfill({json:{ok:true,workspace},headers:{'Access-Control-Allow-Origin':'*'}});
 });
 await page.goto('http://127.0.0.1:5174/reports/insurer-fixture.html');
 await page.getByRole('heading',{name:'Demande de devis AXA'}).waitFor();
 await page.getByText('Numéro client AXA vérifié',{exact:true}).waitFor();
 assert.equal(await page.getByText('Ancien véhicule.pdf',{exact:true}).count(),0);assert.equal(await page.getByText('RIB.pdf',{exact:true}).count(),0);
 await page.getByLabel('Numéro client AXA',{exact:true}).fill('12345678');
 await page.getByRole('checkbox',{name:/J’ai vérifié/}).check();
 await page.getByRole('button',{name:'Vérifier et mettre en file'}).click();
 await page.waitForTimeout(300);assert.equal(writes.filter(x=>x.workflow_code==='axa'&&!x.action).length,0);assert.equal(writes[0].evidence_reviewed,true);assert.equal(writes[0].client_reference,'12345678');
 await page.screenshot({path:'reports/axa-dossier-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'reports/axa-dossier-mobile.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 assert.equal(await page.getByRole('dialog').count(),1);assert.deepEqual(errors,[]);
 fs.writeFileSync('reports/axa-browser.json',JSON.stringify({ok:true,incomplete_send_blocked:true,old_vehicle_and_rib_excluded:true,review_version_sent:true,mobile_width:390,errors},null,2));
 await browser.close();console.log('AXA browser checks passed.');
})().catch(e=>{console.error(e.stack);process.exit(1)});
