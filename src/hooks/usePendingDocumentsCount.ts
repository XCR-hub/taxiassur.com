import { useState, useEffect } from 'react';
import { nativeAdminCall } from '@/lib/native-admin-data';

const SUSPECT_NAME_PATTERNS = [
  /logo/i, /icon/i, /favicon/i, /signature/i, /banner/i, /avatar/i,
  /header/i, /footer/i, /pixel/i, /tracker/i, /spacer/i, /divider/i,
  /separator/i, /background/i, /\bbg\b/i, /button/i, /bullet/i,
  /checkmark/i, /arrow/i, /border/i, /badge/i, /stamp/i, /watermark/i,
  /pattern/i, /texture/i, /mail.*sign/i, /email.*sign/i,
];
const SUSPECT_EXTENSIONS = ['.gif', '.ico', '.svg', '.bmp'];
const SUSPECT_MIME = ['image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];

function isSuspect(fileName: string, mimeType: string | null, fileSize: number | null): boolean {
  const name = (fileName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  if (SUSPECT_MIME.includes(mime)) return true;
  if (SUSPECT_EXTENSIONS.includes(ext)) return true;
  if (SUSPECT_NAME_PATTERNS.some(re => re.test(name))) return true;
  const isImage = mime.startsWith('image/');
  const isSmall = (fileSize ?? 0) > 0 && (fileSize ?? 0) < 30_000;
  if (isImage && isSmall) return true;
  return false;
}

export function usePendingDocumentsCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const result = await nativeAdminCall<{ documents?: Array<{ file_name?: string; file_size?: number | null; mime_type?: string | null }> }>(
          '/v1/admin/documents?status=pending&scope=all',
        );
          const realDocs = (result.documents || []).filter(
            d => !isSuspect(d.file_name || '', d.mime_type, d.file_size)
          );
          setCount(realDocs.length);
      } catch (error) {
        console.error('Erreur comptage documents:', error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    const interval = setInterval(fetchCount, 60000);
    window.addEventListener('focus', fetchCount);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchCount);
    };
  }, []);

  return { count, loading };
}
