const COMPANY_STYLES = [
  { surface: "bg-gradient-to-br from-blue-950/90 via-gray-900 to-blue-900/45", border: "border-l-blue-400", accent: "bg-blue-400/25 text-blue-100 ring-1 ring-blue-300/30", light: "bg-blue-50/80", lightAccent: "bg-blue-100 text-blue-900" },
  { surface: "bg-gradient-to-br from-violet-950/90 via-gray-900 to-violet-900/45", border: "border-l-violet-400", accent: "bg-violet-400/25 text-violet-100 ring-1 ring-violet-300/30", light: "bg-violet-50/80", lightAccent: "bg-violet-100 text-violet-900" },
  { surface: "bg-gradient-to-br from-emerald-950/90 via-gray-900 to-emerald-900/45", border: "border-l-emerald-400", accent: "bg-emerald-400/25 text-emerald-100 ring-1 ring-emerald-300/30", light: "bg-emerald-50/80", lightAccent: "bg-emerald-100 text-emerald-900" },
  { surface: "bg-gradient-to-br from-cyan-950/90 via-gray-900 to-cyan-900/45", border: "border-l-cyan-400", accent: "bg-cyan-400/25 text-cyan-100 ring-1 ring-cyan-300/30", light: "bg-cyan-50/80", lightAccent: "bg-cyan-100 text-cyan-900" },
  { surface: "bg-gradient-to-br from-fuchsia-950/90 via-gray-900 to-fuchsia-900/40", border: "border-l-fuchsia-400", accent: "bg-fuchsia-400/25 text-fuchsia-100 ring-1 ring-fuchsia-300/30", light: "bg-fuchsia-50/80", lightAccent: "bg-fuchsia-100 text-fuchsia-900" },
  { surface: "bg-gradient-to-br from-orange-950/90 via-gray-900 to-orange-900/40", border: "border-l-orange-400", accent: "bg-orange-400/25 text-orange-100 ring-1 ring-orange-300/30", light: "bg-orange-50/80", lightAccent: "bg-orange-100 text-orange-900" },
  { surface: "bg-gradient-to-br from-teal-950/90 via-gray-900 to-teal-900/45", border: "border-l-teal-400", accent: "bg-teal-400/25 text-teal-100 ring-1 ring-teal-300/30", light: "bg-teal-50/80", lightAccent: "bg-teal-100 text-teal-900" },
  { surface: "bg-gradient-to-br from-indigo-950/90 via-gray-900 to-indigo-900/45", border: "border-l-indigo-400", accent: "bg-indigo-400/25 text-indigo-100 ring-1 ring-indigo-300/30", light: "bg-indigo-50/80", lightAccent: "bg-indigo-100 text-indigo-900" },
] as const;

export function companyVisualStyle(idOrName: string) {
  let hash = 0;
  for (const char of String(idOrName || "compagnie")) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  return COMPANY_STYLES[hash % COMPANY_STYLES.length];
}
