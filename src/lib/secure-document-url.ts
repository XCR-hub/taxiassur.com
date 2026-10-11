import { nativeAdminStoredDocumentUrl } from './native-admin-data';
import { prospectStoredDocumentUrl } from './platform-api';
import { withTimeout } from './promise-timeout';

export async function getSecureDocumentUrl(options: {
  path: string;
  bucket: string;
  accessToken?: string | null;
  download?: boolean;
  fileName?: string;
}): Promise<string> {
  const bucket = options.bucket === 'native' ? 'crm-documents' : options.bucket;
  const request = options.accessToken
    ? prospectStoredDocumentUrl(options.accessToken, options.path, bucket)
    : nativeAdminStoredDocumentUrl(options.path, bucket, options.download === true, options.fileName || 'document');
  return withTimeout(request.then(url => {
    // Release late responses too, even if the caller has already timed out.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return url;
  }), 20_000);
}

type SecureDocumentOptions = Parameters<typeof getSecureDocumentUrl>[0];

export async function viewSecureDocument(
  options: Omit<SecureDocumentOptions, "download">,
): Promise<void> {
  const popup = window.open("about:blank", "_blank");
  try {
    const signedUrl = await getSecureDocumentUrl({ ...options, download: false });
    if (popup) {
      popup.opener = null;
      popup.location.replace(signedUrl);
    } else {
      window.location.assign(signedUrl);
    }
  } catch (error) {
    popup?.close();
    throw error;
  }
}

export async function downloadSecureDocument(
  options: Omit<SecureDocumentOptions, "download">,
): Promise<void> {
  const signedUrl = await getSecureDocumentUrl({ ...options, download: true });
  const link = document.createElement("a");
  link.href = signedUrl;
  link.download = options.fileName || "document";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
