// Shared client/server contract. All values are declarations for the vehicle to insure.
const choices=(...pairs)=>pairs.map(([value,label])=>({value,label}));
const yesNo=choices(['yes','Oui'],['no','Non'],['unknown','Je ne sais pas encore']);
export const riskSections=['Le véhicule à assurer','Valeur et financement','Stationnement et protection','Conducteur et foyer','Assurance actuelle'];
export const riskFields=[
 {key:'vehicle_change',label:'Votre demande concerne',section:0,type:'choice',required:true,options:choices(['replacement','Un véhicule qui remplace le précédent'],['additional','Un véhicule supplémentaire'],['current','Mon véhicule actuel'])},
 {key:'professional_use',label:'Activité exercée avec ce véhicule',section:0,type:'choice',required:true,options:choices(['taxi','Taxi'],['vtc','VTC'],['moto-taxi','Moto-taxi'],['other','Autre activité à préciser avec mon conseiller'])},
 {key:'make',label:'Marque du véhicule à assurer',section:0,type:'text',required:true,maxLength:60},
 {key:'model',label:'Modèle',section:0,type:'text',required:true,maxLength:80},
 {key:'trim',label:'Version / finition / motorisation',section:0,type:'text',required:true,maxLength:100},
 {key:'fiscal_power',label:'Puissance fiscale (case P.6 de la carte grise)',section:0,type:'number',required:true,min:1,max:200},
 {key:'registration_pending',label:'L’immatriculation est-elle encore en attente ?',section:0,type:'choice',required:true,options:yesNo},
 {key:'registration',label:'Immatriculation du véhicule à assurer',section:0,type:'text',required:true,maxLength:20,when:['registration_pending','no']},
 {key:'first_registration_month',label:'Première mise en circulation (mois et année)',section:0,type:'month'},
 {key:'delivery_date',label:'Date prévue de récupération, si véhicule neuf',section:0,type:'date'},
 {key:'vehicle_document',label:'Quel justificatif avez-vous pour ce véhicule ?',section:1,type:'choice',required:true,options:choices(['carte_grise','La carte grise de ce véhicule'],['bon_commande','Un bon de commande'],['facture_vehicule','La facture du véhicule'],['none','Je ne l’ai pas encore'])},
 {key:'vehicle_document_id',label:'Sélectionnez le justificatif du véhicule à assurer',section:1,type:'text',required:true,maxLength:36,pattern:'^[0-9a-fA-F-]{36}$',when:['vehicle_document',['carte_grise','bon_commande','facture_vehicule']]},
 {key:'new_value',label:'Valeur à neuf TTC, options et équipements compris (€)',section:1,type:'number',required:true,min:500,max:2000000,decimals:2},
 {key:'value_source',label:'Cette valeur provient',section:1,type:'choice',required:true,options:choices(['order','Du bon de commande'],['invoice','De la facture'],['catalogue','D’une estimation au tarif constructeur'],['unknown','Je ne sais pas encore'])},
 {key:'financing',label:'Comment financez-vous le véhicule ?',section:1,type:'choice',required:true,options:choices(['purchase','Achat comptant'],['credit','Achat à crédit'],['loa','Location avec option d’achat (LOA)'],['lld','Location longue durée (LLD)'],['leasing','Crédit-bail / leasing professionnel'],['unknown','Je ne sais pas encore'])},
 {key:'lessor',label:'Nom du bailleur / organisme de financement',section:1,type:'text',maxLength:120,when:['financing',['loa','lld','leasing']]},
 {key:'garage_address',label:'Adresse du stationnement habituel',section:2,type:'text',required:true,maxLength:200},
 {key:'garage_postal_code',label:'Code postal du stationnement',section:2,type:'text',required:true,maxLength:5,pattern:'^\\d{5}$'},
 {key:'garage_city',label:'Commune du stationnement',section:2,type:'text',required:true,maxLength:100},
 {key:'garage_individual',label:'Disposez-vous d’un garage ou box individuel ?',section:2,type:'choice',required:true,options:yesNo},
 {key:'garage_closed',label:'Le garage ou box est-il clos ?',section:2,type:'choice',required:true,options:yesNo},
 {key:'garage_covered',label:'Le garage ou box est-il couvert ?',section:2,type:'choice',required:true,options:yesNo},
 {key:'sra',label:'Le véhicule dispose-t-il d’un antivol agréé SRA ?',section:2,type:'choice',required:true,options:yesNo},
 {key:'main_driver_name',label:'Nom et prénom du conducteur principal',section:3,type:'text',required:true,maxLength:120},
 {key:'registration_holder',label:'Nom du titulaire prévu ou actuel de la carte grise',section:3,type:'text',required:true,maxLength:120},
 {key:'business_type',label:'Vous exercez en tant que',section:3,type:'choice',required:true,options:choices(['individual','Entrepreneur individuel / artisan en nom propre'],['company','Société'],['employee','Salarié'],['unknown','À préciser avec mon conseiller'])},
 {key:'employee_count',label:'Nombre de salariés de la société',section:3,type:'number',required:true,min:0,max:10000,when:['business_type','company']},
 {key:'messaging_activity',label:'Ce véhicule servira-t-il aussi à une activité de messagerie ou livraison ?',section:3,type:'choice',required:true,options:yesNo},
 {key:'birth_date',label:'Date de naissance du conducteur principal',section:3,type:'date',required:true},
 {key:'licence_date',label:'Date d’obtention du permis correspondant au véhicule',section:3,type:'date',required:true},
 {key:'family_status',label:'Situation familiale',section:3,type:'choice',options:choices(['single','Célibataire'],['married','Marié(e)'],['pacs','Pacsé(e)'],['cohabiting','En concubinage'],['other','Autre'],['unknown','Je préfère préciser avec mon conseiller'])},
 {key:'other_drivers',label:'D’autres personnes conduiront-elles ce véhicule ?',section:3,type:'choice',required:true,options:yesNo},
 {key:'household_vehicles',label:'Nombre réel de véhicules au foyer',section:3,type:'number',required:true,min:0,max:50},
 {key:'household_licences',label:'Nombre réel de personnes titulaires du permis au foyer, vous compris',section:3,type:'number',required:true,min:0,max:50},
 {key:'insurance_status',label:'Situation du contrat d’assurance actuel',section:4,type:'choice',required:true,options:choices(['active','Toujours en cours'],['client_cancelled','Résilié à mon initiative'],['insurer_cancelled','Résilié à l’initiative de l’assureur'],['first_insurance','Première assurance'],['unknown','À vérifier avec mon conseiller'])},
 {key:'current_insurer',label:'Nom de l’assureur actuel ou précédent',section:4,type:'text',required:true,maxLength:100,unless:['insurance_status','first_insurance']},
 {key:'cancellation_date',label:'Date de résiliation effective',section:4,type:'date',required:true,when:['insurance_status',['client_cancelled','insurer_cancelled']]},
 {key:'cancellation_reason',label:'Motif de la résiliation',section:4,type:'choice',required:true,when:['insurance_status',['client_cancelled','insurer_cancelled']],options:choices(['vehicle_change','Vente ou changement de véhicule'],['anniversary','À l’échéance'],['non_payment','Non-paiement'],['claims','Sinistralité'],['other','Autre motif'],['unknown','Je dois retrouver le courrier'])},
 {key:'uninsured_months',label:'Mois d’interruption d’assurance sur les 36 derniers mois',section:4,type:'number',required:true,min:0,max:36},
 {key:'suspension_36_months',label:'Retrait ou suspension de permis de plus de 30 jours sur les 36 derniers mois ?',section:4,type:'choice',required:true,options:yesNo},
 {key:'desired_effect_date',label:'Date souhaitée pour le début de la nouvelle assurance',section:4,type:'date',required:true},
 {key:'additional_notes',label:'Précisions utiles pour votre conseiller',section:4,type:'text',maxLength:2000},
];
const fieldMap=new Map(riskFields.map(field=>[field.key,field]));
const matches=(rule,answers)=>!rule||[].concat(rule[1]).includes(answers[rule[0]]);
export function visibleRiskFields(answers={}){return riskFields.filter(f=>matches(f.when,answers)&&(!f.unless||!matches(f.unless,answers)));}
export function normaliseRiskPatch(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('invalid_answers');
 const answers=Object.create(null),errors=Object.create(null);
 for(const [key,raw]of Object.entries(input)){
  const field=fieldMap.get(key);if(!field){errors[key]='Champ non autorisé';continue}
  if(raw===null||raw===''||(typeof raw==='string'&&!raw.trim())){answers[key]=field.type==='number'?null:'';continue}
  if(field.type==='number'){
   if(typeof raw!=='number'&&typeof raw!=='string'){errors[key]='Nombre invalide';continue}
   const number=Number(raw);if(!Number.isFinite(number)||number<field.min||number>field.max||(!field.decimals&&!Number.isInteger(number))||(field.decimals&&Math.abs(number*100-Math.round(number*100))>1e-6)){errors[key]='Valeur numérique invalide';continue}answers[key]=number;
  }else{
   if(typeof raw!=='string'){errors[key]='Texte invalide';continue}
   const value=raw.trim();if(value.length>(field.maxLength||100)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)){errors[key]='Texte trop long ou invalide';continue}
   if(field.type==='choice'&&!field.options.some(option=>option.value===value)){errors[key]='Choix invalide';continue}
   if(field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)){errors[key]='Date invalide';continue}
   if(field.type==='month'&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)){errors[key]='Mois invalide';continue}
   if(field.pattern&&!new RegExp(field.pattern).test(value)){errors[key]='Format invalide';continue}
   answers[key]=value;
  }
 }
 return {answers,errors};
}
export function riskAssessment(answers={},documents=[]){
 const visible=visibleRiskFields(answers),missing=visible.filter(f=>f.required&&(answers[f.key]===undefined||answers[f.key]===null||answers[f.key]===''||answers[f.key]==='unknown')).map(f=>({key:f.key,label:f.label}));
 if(!answers.first_registration_month&&!answers.delivery_date)missing.push({key:'vehicle_date',label:'Première mise en circulation ou date de récupération du véhicule neuf'});
 const needsReview=[];
 if(answers.value_source==='catalogue')needsReview.push('Valeur à neuf estimée : vérifier les options et le justificatif d’achat.');
 if(answers.registration_pending==='yes')needsReview.push('Immatriculation en attente : carte grise à récupérer avant finalisation.');
 if(answers.insurance_status==='insurer_cancelled')needsReview.push('Résiliation par l’assureur : vérifier le courrier et les conditions de souscription.');
 if(answers.other_drivers==='yes')needsReview.push('Autres conducteurs à identifier avant la tarification.');
 if(answers.messaging_activity==='yes'||answers.professional_use==='other')needsReview.push('Activités du véhicule à vérifier avec l’assureur avant tarification.');
 if(answers.suspension_36_months==='yes')needsReview.push('Retrait ou suspension de permis à examiner avec le conseiller.');
 if(Number.isInteger(answers.household_vehicles)&&Number.isInteger(answers.household_licences)&&answers.household_vehicles>=answers.household_licences)needsReview.push('Véhicules et permis au foyer : vérifier la règle de l’assureur en conservant les nombres réellement déclarés.');
 const physical=documents.filter(d=>d&&(d.file_path||d.storage_path||d.file_url)&&!['rejected','quarantined','deleted'].includes(d.status)&&!['infected','error'].includes(d.security_scan_status));
 const selected=answers.vehicle_document;
 const evidence=physical.find(d=>String(d.id)===answers.vehicle_document_id&&d.document_type===selected&&['carte_grise','bon_commande','facture_vehicule'].includes(selected));
 const missingDocuments=evidence?[]:[{type:['carte_grise','bon_commande','facture_vehicule'].includes(selected)?selected:'bon_commande',label:selected==='carte_grise'?'Carte grise du véhicule à assurer':selected==='facture_vehicule'?'Facture du véhicule à assurer':'Bon de commande du véhicule à assurer (ou carte grise dès disponibilité)'}];
 const requiredCount=visible.filter(f=>f.required).length+1;
 return {missing,missing_documents:missingDocuments,vehicle_document:evidence?{id:evidence.id,type:evidence.document_type,name:evidence.file_name||evidence.original_name||'Justificatif sélectionné'}:null,needs_review:needsReview,answers_complete:missing.length===0,complete:missing.length===0&&missingDocuments.length===0,progress:Math.max(0,Math.round((requiredCount-missing.length)/requiredCount*100))};
}
export function formatRiskValue(field,value){if(value===null||value===undefined||value==='')return 'À préciser';if(field.type==='choice')return field.options.find(o=>o.value===value)?.label||String(value);if(field.key==='new_value')return Number(value).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});if(field.type==='date')return String(value).split('-').reverse().join('/');if(field.type==='month')return String(value).split('-').reverse().join('/');return String(value);}
