import {
  ALLOWED_TABLES,
  SORT_FIELDS,
  isPublished,
  json,
  positiveInt,
  postgresFetch,
  publicError,
  publicRow,
} from './_shared.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const table = url.searchParams.get('table');
  const limit = positiveInt(url.searchParams.get('limit'), 20, 100);
  const status = url.searchParams.get('status') || 'published';
  const category = url.searchParams.get('category');
  const excludeId = url.searchParams.get('excludeId');
  const sort = SORT_FIELDS.has(url.searchParams.get('sort') || '')
    ? url.searchParams.get('sort')
    : 'updated_at';

  if (!table || !ALLOWED_TABLES.has(table)) {
    return json({ ok: false, error: 'Invalid or missing table.' }, { status: 400, cacheControl: 'no-store' });
  }

  try {
    const data = await postgresFetch(env, '/api/read', {
      table,
      limit: Math.min(limit * 5, 250),
      sort,
      direction: 'desc',
      category,
    });

    const items = (data.items || [])
      .filter((item) => isPublished(item, status))
      .filter((item) => !excludeId || String(item.id || item.slug || '') !== String(excludeId))
      .slice(0, limit)
      .map((item) => publicRow(table, item));

    return json({
      ok: true,
      items,
    });
  } catch (error) {
    return publicError(error);
  }
}
