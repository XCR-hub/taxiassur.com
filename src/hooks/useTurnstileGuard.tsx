import { useCallback, useState } from 'react';
import TurnstileWidget from '@/components/security/TurnstileWidget';
import { isTurnstileEnabled, verifyTurnstileToken } from '@/lib/turnstile';

interface UseTurnstileGuardOptions {
  action: string;
  className?: string;
}

export function useTurnstileGuard({ action, className }: UseTurnstileGuardOptions) {
  const [token, setToken] = useState('');
  const enabled = isTurnstileEnabled();

  const reset = useCallback(() => {
    setToken('');
  }, []);

  const verify = useCallback(async () => {
    if (!enabled) return true;
    if (!token) return false;

    const valid = await verifyTurnstileToken(token, action);
    if (!valid) reset();
    return valid;
  }, [action, enabled, reset, token]);

  const widget = enabled ? (
    <TurnstileWidget
      action={action}
      className={className}
      onVerify={setToken}
      onExpire={reset}
      onError={reset}
    />
  ) : null;

  return {
    enabled,
    token,
    canSubmit: !enabled || Boolean(token),
    reset,
    verify,
    widget,
  };
}
