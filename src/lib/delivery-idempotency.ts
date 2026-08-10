const pendingDeliveryRequestIds = new Map<string, string>();

export function getDeliveryRequestId(channel: string, signature: string): string {
  const key = `${channel}:${signature}`;
  const existing = pendingDeliveryRequestIds.get(key);
  if (existing) return existing;
  const requestId = crypto.randomUUID();
  pendingDeliveryRequestIds.set(key, requestId);
  return requestId;
}

export function clearDeliveryRequestId(channel: string, signature: string): void {
  pendingDeliveryRequestIds.delete(`${channel}:${signature}`);
}
