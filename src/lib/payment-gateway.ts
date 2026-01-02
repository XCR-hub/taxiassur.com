export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  clientSecret?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'sepa' | 'ideal';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export class PaymentGateway {
  private apiKey: string;
  private apiUrl: string = '/api/payment.php';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'EUR',
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        action: 'create_intent',
        amount: Math.round(amount * 100),
        currency,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    return await response.json();
  }

  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<PaymentIntent> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        action: 'confirm_payment',
        payment_intent_id: paymentIntentId,
        payment_method_id: paymentMethodId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to confirm payment');
    }

    return await response.json();
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    const response = await fetch(`${this.apiUrl}?action=get_intent&id=${paymentIntentId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get payment intent');
    }

    return await response.json();
  }

  async createCustomer(
    email: string,
    name: string,
    metadata?: Record<string, any>
  ): Promise<{ id: string }> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        action: 'create_customer',
        email,
        name,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create customer');
    }

    return await response.json();
  }

  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        action: 'attach_payment_method',
        customer_id: customerId,
        payment_method_id: paymentMethodId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to attach payment method');
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    const response = await fetch(
      `${this.apiUrl}?action=list_payment_methods&customer_id=${customerId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list payment methods');
    }

    return await response.json();
  }

  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<{ id: string; status: string }> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        action: 'create_refund',
        payment_intent_id: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create refund');
    }

    return await response.json();
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, any>
  ): Promise<{ id: string; status: string }> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        action: 'create_subscription',
        customer_id: customerId,
        price_id: priceId,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create subscription');
    }

    return await response.json();
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        action: 'cancel_subscription',
        subscription_id: subscriptionId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
  }
}

export function formatAmount(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(cleaned)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function validateExpiry(month: number, year: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (month < 1 || month > 12) return false;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;

  return true;
}

export function validateCVV(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv);
}
