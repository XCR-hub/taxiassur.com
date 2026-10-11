import { nativeAdminCall } from './native-admin-data';

export async function loadNativeUltron() {
  try {
    const data = await nativeAdminCall('/v1/admin/ultron');
    return { ...data, limited: false };
  } catch (error) {
    if ((error as Error & { status?: number }).status !== 404) throw error;
  }
  const [automation, seo] = await Promise.all([
    nativeAdminCall('/v1/admin/automation-center'),
    nativeAdminCall('/v1/admin/seo'),
  ]);
  return {
    limited: true,
    crons: (automation.automations || []).map((row: Record<string, unknown>) => ({
      jobname: row.job_name || row.name || row.id,
      schedule: row.schedule || row.cron_expression || '',
      active: row.is_enabled === true,
    })),
    gsc: seo.queries || [],
  };
}
