import { config, json, postgresFetch, publicError } from './_shared.js';

export async function onRequestGet({ env }) {
  try {
    const { baseUrl } = config(env);
    const [health, nativeContent] = await Promise.all([
      fetch(`${baseUrl}/health`).then((response) => response.json()),
      postgresFetch(env, '/api/health'),
    ]);

    return json(
      {
        ok: true,
        checked_at: new Date().toISOString(),
        public_health: health,
        tables: nativeContent,
        table_details: Object.entries(nativeContent).filter(([key]) => !['ok'].includes(key)).map(([source_table, rows]) => ({ source_table, rows, source: 'taxiassur-native-postgresql' })),
      },
      { cacheControl: 'no-store' },
    );
  } catch (error) {
    return publicError(error);
  }
}
