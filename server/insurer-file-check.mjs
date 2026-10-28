import path from 'node:path';
import { readFileSync, existsSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export function createInsurerFileInspector(env = process.env) {
  const root = path.resolve(env.TAXIASSUR_DOCUMENT_ROOT || 'F:/TaxiAssur/Documents');
  const legacy = path.resolve(env.TAXIASSUR_LEGACY_DOCUMENT_ROOT || path.join(root, 'legacy'));
  return async function inspectFile(doc, leadId) {
    if (String(doc.lead_id) !== String(leadId)) throw new Error('attachment_owner_mismatch');
    let relative = String(doc.file_path || '');
    if (/^https?:/i.test(relative)) {
      const url = new URL(relative), match = url.pathname.match(/\/storage\/v1\/object\/(?:public\/|sign\/)?(?:prospect-documents|crm-documents|email-attachments)\/(.+)$/);
      if (!match) throw new Error('attachment_remote_path_forbidden');
      relative = decodeURIComponent(match[1]);
    }
    if (!relative || path.isAbsolute(relative) || /[\x00-\x1f]/.test(relative)) throw new Error('attachment_invalid_path');
    const bases = [root, ...['prospect-documents','crm-documents','email-attachments'].map(b => path.join(legacy, b))];
    let file;
    for (const base of bases) {
      const candidate = path.resolve(base, relative);
      if (!candidate.startsWith(base + path.sep)) throw new Error('attachment_invalid_path');
      if (existsSync(candidate)) {
        const real = realpathSync(candidate), realRoot = realpathSync(base);
        if (!real.startsWith(realRoot + path.sep)) throw new Error('attachment_symlink_forbidden');
        file = real; break;
      }
    }
    if (!file) throw new Error('attachment_missing');
    const stat = statSync(file);
    if (!stat.isFile() || !stat.size || stat.size > 15 * 1024 * 1024) throw new Error('attachment_invalid_size');
    const clamd = env.CLAMDSCAN_PATH || 'C:/Program Files/ClamAV/clamdscan.exe';
    const options={windowsHide:true,timeout:120000,encoding:'utf8',maxBuffer:1024*1024};
    let scan=existsSync(clamd)?spawnSync(clamd,[`--config-file=${env.CLAMD_CONFIG_PATH || 'F:/TaxiAssur/ClamAV/clamd.conf'}`,'--no-summary',file],options):null;
    if(scan?.status===1)throw new Error('attachment_infected');
    if(!scan||scan.error||scan.status!==0)scan=spawnSync(env.CLAMSCAN_PATH||'C:/Program Files/ClamAV/clamscan.exe',['--no-summary',`--database=${env.CLAMSCAN_DATABASE_PATH||'F:/TaxiAssur/ClamAV/db'}`,file],options);
    if (scan.error || scan.status !== 0) throw new Error(scan.status === 1 ? 'attachment_infected' : 'attachment_scan_failed');
    const content = readFileSync(file), sha256 = createHash('sha256').update(content).digest('hex');
    if (doc.sha256 && doc.sha256 !== sha256) throw new Error('attachment_changed_after_queue');
    const pdf = content.subarray(0,5).toString() === '%PDF-', jpg = content[0] === 255 && content[1] === 216 && content[2] === 255;
    const png = content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (!pdf && !jpg && !png) throw new Error('attachment_format_not_supported');
    return { resolved_path: file, sha256, size: content.length, mime_type: pdf ? 'application/pdf' : jpg ? 'image/jpeg' : 'image/png' };
  };
}
