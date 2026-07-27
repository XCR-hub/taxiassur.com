const ALLOWED_TABLES = new Set(['blog_posts', 'city_pages', 'faq_entries', 'news_articles']);

function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      'cache-control': 'public, max-age=60',
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

export async function onRequestGet({ request, env }) {
  if (!env.TAXIASSUR_DB) {
    return json({ ok: false, error: 'D1 binding TAXIASSUR_DB is not configured.' }, { status: 503 });
  }

  const url = new URL(request.url);
  const table = url.searchParams.get('table');
  const slug = url.searchParams.get('slug');
  const id = url.searchParams.get('id');

  if (!table || !ALLOWED_TABLES.has(table)) {
    return json({ ok: false, error: 'Invalid or missing table.' }, { status: 400 });
  }

  if (!slug && !id) {
    return json({ ok: false, error: 'Missing slug or id.' }, { status: 400 });
  }

  const whereColumn = id ? 'source_id' : 'slug';
  const whereValue = id || slug;

  try {
    const row = await env.TAXIASSUR_DB
      .prepare(
        `SELECT source_table, source_id, slug, url, title, status, category, city, published_at, updated_at, payload
         FROM public_content_cache
         WHERE source_table = ? AND ${whereColumn} = ?
         LIMIT 1`,
      )
      .bind(table, whereValue)
      .first();

    if (!row) {
      return json({ ok: false, error: 'Not found.' }, { status: 404 });
    }

    return json({
      ok: true,
      item: {
        ...row,
        payload: parsePayload(row.payload),
      },
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