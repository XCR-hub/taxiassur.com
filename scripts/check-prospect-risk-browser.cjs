const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const {normaliseRiskPatch,riskAssessment}=await import('../shared/prospect-risk.mjs');
 const documents=[{id:'00000000-0000-4000-a000-000000000001',document_type:'carte_grise',file_name:'Ancien véhicule.pdf',file_path:'old.pdf',status:'validated',validated:true},{id:'00000000-0000-4000-a000-000000000002',document_type:'bon_commande',file_name:'Bon de commande Tesla.pdf',file_path:'new.pdf',status:'validated',validated:true}];
 let record={id:'test-lead',lead_id:'test-lead',answers:{},revision:0,confirmed_at:null};let saves=0;
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:960}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/prospect/session',route=>route.fulfill({json:{ok:true,lead:{id:'test-lead',first_name:'CLIENT',last_name:'TEST',email:'test@example.invalid',phone:'0600000000',city:'Janneyrias',status:'COLLECTE_DOCUMENTS',vehicle_type:'Taxi'},documents,final_documents:[],payments:[],quotes:[],company_documents:[],document_requests:[]},headers:{'Access-Control-Allow-Origin':'*'}}));
 await page.route('**/v1/prospect/risk-questionnaire',async route=>{
  if(route.request().method()==='PATCH'){const body=route.request().postDataJSON();assert.equal(body.expected_revision,record.revision);const normalized=normaliseRiskPatch(body.answers);assert.equal(Object.keys(normalized.errors).length,0);record={...record,answers:{...record.answers,...normalized.answers},revision:record.revision+1,confirmed_at:body.confirmed?new Date().toISOString():null};saves++;}
  await route.fulfill({json:{ok:true,questionnaire:{...record,assessment:riskAssessment(record.answers,documents)}},headers:{'Access-Control-Allow-Origin':'*'}});
 });
 await page.goto('http://127.0.0.1:5174/espace-prospect/'+ 'a'.repeat(64),{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Préparons votre devis pour le bon véhicule'}).waitFor({timeout:45000});
 const refuse=page.getByRole('button',{name:'Refuser',exact:true});if(await refuse.isVisible())await refuse.click();
 await page.locator('#risk-make').fill('TESLA');await page.locator('#risk-model').fill('MODEL Y');await page.locator('#risk-trim').fill('PROPULSION');await page.locator('#risk-fiscal_power').fill('8');
 await page.locator('#risk-vehicle_change').selectOption('additional');await page.locator('#risk-professional_use').selectOption('taxi');await page.locator('#risk-registration_pending').selectOption('yes');await page.locator('#risk-first_registration_month').fill('2026-10');
 const next=()=>page.getByRole('button',{name:'Continuer',exact:true}).click();await next();await page.locator('#risk-new_value').waitFor();
 await page.locator('#risk-vehicle_document').selectOption('bon_commande');
 assert.equal(await page.locator('#risk-vehicle_document_id option').filter({hasText:'Ancien véhicule'}).count(),0);
 await page.locator('#risk-vehicle_document_id').selectOption(documents[1].id);await page.locator('#risk-new_value').fill('40990');await page.locator('#risk-value_source').selectOption('catalogue');await page.locator('#risk-financing').selectOption('loa');await page.locator('#risk-lessor').fill('BAILLEUR TEST');await next();
 await page.locator('#risk-garage_address').fill('4 RUE DU TEST');await page.locator('#risk-garage_postal_code').fill('38280');await page.locator('#risk-garage_city').fill('JANNEYRIAS');
 for(const key of ['garage_individual','garage_closed','sra'])await page.locator('#risk-'+key).selectOption('yes');await page.locator('#risk-garage_covered').selectOption('unknown');await next();
 await page.locator('#risk-main_driver_name').fill('CLIENT TEST');await page.locator('#risk-registration_holder').fill('CLIENT TEST');await page.locator('#risk-business_type').selectOption('individual');await page.locator('#risk-messaging_activity').selectOption('no');await page.locator('#risk-birth_date').fill('1973-09-30');await page.locator('#risk-licence_date').fill('1992-11-17');await page.locator('#risk-other_drivers').selectOption('no');await page.locator('#risk-household_vehicles').fill('2');await page.locator('#risk-household_licences').fill('1');await next();
 await page.locator('#risk-insurance_status').selectOption('active');assert.equal(await page.locator('#risk-cancellation_date').count(),0);await page.locator('#risk-current_insurer').fill('MFA');await page.locator('#risk-uninsured_months').fill('0');await page.locator('#risk-suspension_36_months').selectOption('no');await page.locator('#risk-desired_effect_date').fill('2026-11-01');await next();
 await page.getByRole('checkbox',{name:/Je confirme que ces réponses/}).check();await page.getByRole('button',{name:'Confirmer et transmettre'}).click();await page.getByRole('status').filter({hasText:'transmises'}).waitFor();
 assert.equal(record.answers.household_vehicles,2);assert.equal(record.answers.household_licences,1);assert.equal(record.answers.garage_covered,'unknown');assert.ok(record.confirmed_at);assert.ok(riskAssessment(record.answers,documents).missing.some(x=>x.key==='garage_covered'));
 await page.reload();await page.getByText('Vérifiez vos réponses avant transmission',{exact:true}).waitFor();
 await page.getByRole('heading',{name:'Préparons votre devis pour le bon véhicule'}).scrollIntoViewIfNeeded();await page.screenshot({path:'reports/prospect-risk-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('#risk-title').scrollIntoViewIfNeeded();await page.screenshot({path:'reports/prospect-risk-mobile.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 assert.deepEqual(errors,[]);fs.writeFileSync('reports/prospect-risk-browser.json',JSON.stringify({ok:true,saves,resume_verified:true,correct_document_verified:true,actual_counts_preserved:true,garage_unknown_preserved:true,viewport_mobile:390,errors},null,2));
 await browser.close();console.log('Parcours navigateur validé : sauvegarde, reprise, bon justificatif, réponses réelles et mobile.');
})().catch(e=>{console.error(e.stack);process.exit(1)});
