function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

async function groupedCount(db, tableName) {
  const result = await db
    .prepare(`SELECT source_table, COUNT(*) AS rows FROM ${tableName} GROUP BY source_table ORDER BY source_table`)
    .all();

  return result.results || [];
}

export async function onRequestGet({ env }) {
  if (!env.TAXIASSUR_DB) {
    return json({ ok: false, error: 'D1 binding TAXIASSUR_DB is not configured.' }, { status: 503 });
  }

  try {
    const [content, gsc] = await Promise.all([
      groupedCount(env.TAXIASSUR_DB, 'public_content_cache'),
      groupedCount(env.TAXIASSUR_DB, 'gsc_metrics_cache'),
    ]);

    return json({
      ok: true,
      database: 'taxiassur-prod',
      binding: 'TAXIASSUR_DB',
      checked_at: new Date().toISOString(),
      counts: {
        public_content_cache: content,
        gsc_metrics_cache: gsc,
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