export interface RequiredDocument {
  type: string;
  label: string;
  required: boolean;
  icon?: string;
}

export const TAXI_DOCUMENTS: RequiredDocument[] = [
  { type: 'licence_taxi', label: 'Licence de taxi / ADS', required: true, icon: '🚕' },
  { type: 'permis_conduire', label: 'Permis de conduire', required: true, icon: '🪪' },
  { type: 'carte_grise', label: 'Carte grise du vehicule', required: true, icon: '🚗' },
  { type: 'carte_identite', label: "Carte d'identite", required: true, icon: '🆔' },
  { type: 'rib', label: 'RIB', required: true, icon: '🏦' },
  { type: 'releve_information', label: "Relevé d'informations", required: true, icon: '📋' },
  { type: 'carte_professionnelle', label: 'Carte professionnelle', required: true, icon: '💳' },
  { type: 'autorisation_stationnement', label: 'Autorisation de stationnement', required: true, icon: '🅿️' },
  { type: 'kbis', label: 'Extrait Kbis / Statuts', required: true, icon: '🏢' },
];

export const VTC_DOCUMENTS: RequiredDocument[] = [
  { type: 'carte_pro_vtc', label: 'Carte professionnelle VTC', required: true, icon: '💳' },
  { type: 'inscription_registre_vtc', label: 'Inscription registre VTC', required: true, icon: '📋' },
  { type: 'permis_conduire', label: 'Permis de conduire', required: true, icon: '🪪' },
  { type: 'carte_grise', label: 'Carte grise du vehicule', required: true, icon: '🚗' },
  { type: 'carte_identite', label: "Carte d'identite", required: true, icon: '🆔' },
  { type: 'rib', label: 'RIB', required: true, icon: '🏦' },
  { type: 'releve_information', label: "Relevé d'informations", required: true, icon: '📋' },
  { type: 'kbis', label: 'Extrait Kbis / Statuts', required: true, icon: '🏢' },
  { type: 'controle_technique', label: 'Controle technique', required: true, icon: '🔧' },
];

export const MOTO_TAXI_DOCUMENTS: RequiredDocument[] = [
  { type: 'licence_taxi', label: 'Licence de taxi / ADS', required: true, icon: '🏍️' },
  { type: 'permis_conduire', label: 'Permis de conduire (A + B)', required: true, icon: '🪪' },
  { type: 'carte_grise', label: 'Carte grise du vehicule', required: true, icon: '🏍️' },
  { type: 'carte_identite', label: "Carte d'identite", required: true, icon: '🆔' },
  { type: 'rib', label: 'RIB', required: true, icon: '🏦' },
  { type: 'releve_information', label: "Relevé d'informations", required: true, icon: '📋' },
  { type: 'carte_professionnelle', label: 'Carte professionnelle', required: true, icon: '💳' },
  { type: 'kbis', label: 'Extrait Kbis / Statuts', required: true, icon: '🏢' },
  { type: 'controle_technique', label: 'Controle technique', required: true, icon: '🔧' },
];

export function getRequiredDocuments(vehicleType?: string | null,vehicleDocument?:string): RequiredDocument[] {
  const normalized = (vehicleType||'taxi').toLowerCase().trim();
  const base=normalized==='vtc'?VTC_DOCUMENTS:normalized==='moto-taxi'?MOTO_TAXI_DOCUMENTS:TAXI_DOCUMENTS;
  if(vehicleDocument!=='bon_commande'&&vehicleDocument!=='facture_vehicule')return base;
  return base.map(doc=>doc.type==='carte_grise'?{...doc,type:vehicleDocument,label:vehicleDocument==='bon_commande'?'Bon de commande (étude du devis)':'Facture du véhicule (étude du devis)'}:doc);
}

export function getDocumentLabel(type: string, vehicleType?: string | null): string {
  const docs = getRequiredDocuments(vehicleType);
  return docs.find(d => d.type === type)?.label || ({bon_commande:'Bon de commande du véhicule',facture_vehicule:'Facture du véhicule'} as Record<string,string>)[type] || type;
}
