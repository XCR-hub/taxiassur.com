const ALLOWED_TABLES = new Set(['blog_posts', 'city_pages', 'faq_entries', 'news_articles']);
const SORT_COLUMNS = new Set(['published_at', 'updated_at', 'title']);

function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      'cache-control': 'public, max-age=60',
      'x-taxiassur-source': 'd1-cache',
      ...(init.headers || {}),
    },
  });
}

function parsePayload(payload) {
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function positiveInt(value, fallback, max) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function nonNegativeInt(value, fallback, max) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

export async function onRequestGet({ request, env }) {
  if (!env.TAXIASSUR_DB) {
    return json({ ok: false, error: 'D1 binding TAXIASSUR_DB is not configured.' }, { status: 503 });
  }

  const url = new URL(request.url);
  const table = url.searchParams.get('table');
  const limit = positiveInt(url.searchParams.get('limit'), 20, 250);
  const offset = nonNegativeInt(url.searchParams.get('offset'), 0, 100000);
  const status = url.searchParams.get('status') || 'published';
  const category = url.searchParams.get('category');
  const excludeId = url.searchParams.get('excludeId');
  const sort = SORT_COLUMNS.has(url.searchParams.get('sort') || '')
    ? url.searchParams.get('sort')
    : 'published_at';

  if (!table || !ALLOWED_TABLES.has(table)) {
    return json({ ok: false, error: 'Invalid or missing table.' }, { status: 400 });
  }

  const where = ['source_table = ?'];
  const bindings = [table];

  if (status !== 'all') {
    where.push('(status = ? OR status IS NULL)');
    bindings.push(status);
  }

  if (category) {
    where.push('category = ?');
    bindings.push(category);
  }

  if (excludeId) {
    where.push('source_id != ?');
    bindings.push(excludeId);
  }

  try {
    const stableSecondaryOrder = sort === 'title'
      ? 'updated_at DESC, slug ASC, source_id ASC'
      : 'updated_at DESC, title ASC, slug ASC, source_id ASC';
    const result = await env.TAXIASSUR_DB
      .prepare(
        `SELECT source_table, source_id, slug, url, title, status, category, city, published_at, updated_at, payload
         FROM public_content_cache
         WHERE ${where.join(' AND ')}
         ORDER BY ${sort} DESC, ${stableSecondaryOrder}
         LIMIT ? OFFSET ?`,
      )
      .bind(...bindings, limit, offset)
      .all();

    const items = (result.results || []).map((row) => ({
      ...row,
      payload: parsePayload(row.payload),
    }));

    return json({
      ok: true,
      table,
      limit,
      offset,
      nextOffset: items.length === limit ? offset + limit : null,
      items,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
