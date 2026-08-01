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

function nonNegativeInt(value, fallback, max) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const table = url.searchParams.get('table');
  const limit = positiveInt(url.searchParams.get('limit'), 20, 250);
  const offset = nonNegativeInt(url.searchParams.get('offset'), 0, 100000);
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
    const readParams = {
      table,
      limit,
      offset,
      sort,
      direction: 'desc',
      category,
    };
    if (status !== 'all') readParams.status = status;

    const data = await postgresFetch(env, '/api/read', readParams);

    const items = (data.items || [])
      .filter((item) => isPublished(item, status))
      .filter((item) => !excludeId || String(item.id || item.slug || '') !== String(excludeId))
      .slice(0, limit)
      .map((item) => publicRow(table, item));

    return json({
      ok: true,
      table,
      limit,
      offset,
      nextOffset: items.length === limit ? offset + limit : null,
      items,
    });
  } catch (error) {
    return publicError(error);
  }
}
