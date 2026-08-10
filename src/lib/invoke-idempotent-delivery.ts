import { clearDeliveryRequestId, getDeliveryRequestId } from '@/lib/delivery-idempotency';
import { withTimeout } from '@/lib/promise-timeout';

export type DeliveryChannel = 'email' | 'sms' | 'whatsapp';

type DeliveryClient = {
  functions: {
    invoke: (functionName: string, options: { body: Record<string, unknown> }) => PromiseLike<{
      data: Record<string, unknown> | null;
      error: { message?: string } | null;
    }>;
  };
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export async function invokeIdempotentDelivery(
  client: DeliveryClient,
  channel: DeliveryChannel,
  functionName: 'send-crm-email' | 'send-sms-brevo' | 'send-whatsapp' | 'send-client-access',
  bodyOrOptions: Record<string, unknown>,
  timeoutMs = 45_000,
) {
  const wrappedBody = bodyOrOptions.body;
  const body = Object.keys(bodyOrOptions).length === 1 && wrappedBody && typeof wrappedBody === 'object' && !Array.isArray(wrappedBody)
    ? wrappedBody as Record<string, unknown>
    : bodyOrOptions;
  const signature = JSON.stringify(canonicalize(body));
  const requestId = getDeliveryRequestId(channel, signature);
  const result = await withTimeout(
    client.functions.invoke(functionName, { body: { ...body, requestId } }),
    timeoutMs,
  );
  if (!result.error && result.data?.success === true) clearDeliveryRequestId(channel, signature);
  return result;
}
