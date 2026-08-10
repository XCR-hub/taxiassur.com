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
