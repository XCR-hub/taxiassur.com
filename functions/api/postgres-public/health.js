import { config, json, postgresFetch, publicError } from './_shared.js';

export async function onRequestGet({ env }) {
  try {
    const { baseUrl } = config(env);
    const [health, apiHealth] = await Promise.all([
      fetch(`${baseUrl}/health`).then((response) => response.json()),
      postgresFetch(env, '/api/health'),
    ]);

    return json(
      {
        ok: true,
        checked_at: new Date().toISOString(),
        public_health: health,
        tables: apiHealth,
      },
      { cacheControl: 'no-store' },
    );
  } catch (error) {
    return publicError(error);
  }
}