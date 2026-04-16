const SITE_URL = 'https://taxiassur.com'

export function canonicalUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${clean}`
}

export function resolveSlugToCanonical(slug: string): string {
  if (slug.startsWith('assurance-taxi-pas-cher-')) {
    const city = slug.replace('assurance-taxi-pas-cher-', '')
    return `/ville/${city}`
  }
  if (slug.startsWith('assurance-taxi-')) {
    const city = slug.replace('assurance-taxi-', '')
    return `/ville/${city}`
  }
  return `/ville/${slug}`
}
