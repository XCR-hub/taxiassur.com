export interface AcquisitionPage { title: string; description: string; h1: string; intro: string; heading: string; sections: Array<{ title: string; text: string }>; links: Array<{ href: string; label: string }>; }
export const ACQUISITION_PAGES: Record<string, AcquisitionPage>;
export const ACQUISITION_FAQ: Array<{ question: string; answer: string }>;
export function renderAcquisitionHtml(pathname: string): string;
