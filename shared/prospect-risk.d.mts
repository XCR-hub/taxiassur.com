export type RiskAnswers=Record<string,string|number|null>;
export interface RiskField {key:string;label:string;section:number;type:'text'|'number'|'choice'|'month'|'date';required?:boolean;maxLength?:number;min?:number;max?:number;decimals?:number;options?:Array<{value:string;label:string}>;when?:[string,string|string[]];unless?:[string,string|string[]]}
export interface RiskAssessment {missing:Array<{key:string;label:string}>;missing_documents:Array<{type:string;label:string}>;vehicle_document:{id:string;type:string;name:string}|null;needs_review:string[];answers_complete:boolean;complete:boolean;progress:number}
export const riskSections:string[];
export const riskFields:RiskField[];
export function visibleRiskFields(answers?:RiskAnswers):RiskField[];
export function normaliseRiskPatch(input:unknown):{answers:RiskAnswers;errors:Record<string,string>};
export function riskAssessment(answers?:RiskAnswers,documents?:Array<Record<string,unknown>>):RiskAssessment;
export function formatRiskValue(field:RiskField,value:unknown):string;
