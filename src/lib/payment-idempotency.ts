const pendingPaymentRequestIds = new Map<string, string>();

export function getPaymentRequestId(signature: string): string {
  const existing = pendingPaymentRequestIds.get(signature);
  if (existing) return existing;

  const requestId = crypto.randomUUID();
  pendingPaymentRequestIds.set(signature, requestId);
  return requestId;
}

export function clearPaymentRequestId(signature: string): void {
  pendingPaymentRequestIds.delete(signature);
}
