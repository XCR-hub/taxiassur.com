export function extractCitySlugFromPath(path: string): string | null {
  const clean = path.replace(/^\/+|\/+$/g, '')

  if (clean.startsWith('ville/')) {
    return clean.replace('ville/', '')
  }

  if (clean.startsWith('taxi-')) {
    return clean.replace('taxi-', '')
  }

  if (clean.startsWith('assurance-taxi-pas-cher-')) {
    return clean.replace('assurance-taxi-pas-cher-', '')
  }

  if (clean.startsWith('assurance-taxi-')) {
    return clean.replace('assurance-taxi-', '')
  }

  return null
}

export function buildCitySearchSlugs(citySlug: string): string[] {
  return [
    citySlug,
    `assurance-taxi-${citySlug}`,
    `assurance-taxi-pas-cher-${citySlug}`,
  ]
}
