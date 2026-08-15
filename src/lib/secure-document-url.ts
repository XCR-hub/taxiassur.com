import { supabase } from "./supabase";
import { withTimeout } from "./promise-timeout";

interface SignedDocumentResponse {
  success?: boolean;
  error?: string;
  signedUrl?: string;
}

export async function getSecureDocumentUrl(options: {
  path: string;
  bucket: string;
  accessToken?: string | null;
  download?: boolean;
  fileName?: string;
}): Promise<string> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke<SignedDocumentResponse>("sign-document-url", {
      body: {
        path: options.path,
        bucket: options.bucket,
        accessToken: options.accessToken || undefined,
        download: options.download === true,
        fileName: options.fileName,
      },
    }),
    20_000,
  );
  if (error || !data?.success || !data.signedUrl) {
    throw new Error(data?.error || "Impossible d'ouvrir ce document");
  }
  return data.signedUrl;
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
