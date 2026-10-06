export const NOINDEX_PATHS: Set<string>;
export function compactSeoText(value: unknown, maxLength: number): string;
export function seoTitle(value: unknown): string;
export function seoDescription(value: unknown, fallback: string): string;
export function redirectSources(text: string): RegExp[];
export function isCanonicalPublicPath(pathname: string, redirects?: RegExp[]): boolean;
