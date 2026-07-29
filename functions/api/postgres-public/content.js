import {
  ALLOWED_TABLES,
  isPublished,
  json,
  postgresFetch,
  publicError,
  publicRow,
} from './_shared.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const table = url.searchParams.get('table');
  const slug = url.searchParams.get('slug');
  const id = url.searchParams.get('id');

  if (!table || !ALLOWED_TABLES.has(table)) {
    return json({ ok: false, error: 'Invalid or missing table.' }, { status: 400, cacheControl: 'no-store' });
  }

  if (!slug && !id) {
    return json({ ok: false, error: 'Missing slug or id.' }, { status: 400, cacheControl: 'no-store' });
  }

  try {
    const data = await postgresFetch(env, '/api/item', {
      table,
      slug,
      id,
      sort: 'updated_at',
    });

    if (!data.item || !isPublished(data.item)) {
      return json({ ok: false, error: 'Not found.' }, { status: 404 });
    }

    return json({
      ok: true,
      item: publicRow(table, data.item),
    });
  } catch (error) {
    return publicError(error);
  }
}
