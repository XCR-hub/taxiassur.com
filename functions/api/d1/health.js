function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      'cache-control': 'no-store',
      'x-taxiassur-source': 'd1-cache',
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

async function contentFreshness(db) {
  const result = await db
    .prepare(`SELECT source_table, COUNT(*) AS rows, MAX(COALESCE(updated_at, published_at, '')) AS latest_at
              FROM public_content_cache
              GROUP BY source_table
              ORDER BY source_table`)
    .all();

  return result.results || [];
}

async function gscFreshness(db) {
  const result = await db
    .prepare(`SELECT source_table, COUNT(*) AS rows, MAX(COALESCE(date, '')) AS latest_at
              FROM gsc_metrics_cache
              GROUP BY source_table
              ORDER BY source_table`)
    .all();

  return result.results || [];
}

async function cacheMetadata(db) {
  try {
    const result = await db
      .prepare('SELECT key, value, updated_at FROM public_cache_metadata ORDER BY key')
      .all();
    const rows = result.results || [];
    const values = {};
    for (const row of rows) values[row.key] = row.value;
    return {
      available: true,
      generated_at: values.generated_at || null,
      imported_rows: values.imported_rows ? Number(values.imported_rows) : null,
      skipped_rows: values.skipped_rows ? Number(values.skipped_rows) : null,
      tables: values.tables ? values.tables.split(',').filter(Boolean) : [],
      rows,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function onRequestGet({ env }) {
  if (!env.TAXIASSUR_DB) {
    return json({ ok: false, error: 'D1 binding TAXIASSUR_DB is not configured.' }, { status: 503 });
  }

  try {
    const [content, gsc, contentFresh, gscFresh, metadata] = await Promise.all([
      groupedCount(env.TAXIASSUR_DB, 'public_content_cache'),
      groupedCount(env.TAXIASSUR_DB, 'gsc_metrics_cache'),
      contentFreshness(env.TAXIASSUR_DB),
      gscFreshness(env.TAXIASSUR_DB),
      cacheMetadata(env.TAXIASSUR_DB),
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
      freshness: {
        public_content_cache: contentFresh,
        gsc_metrics_cache: gscFresh,
      },
      metadata,
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
