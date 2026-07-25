import { logger } from './logger';
import type { EmailTemplate } from './email-templates';

export interface EmailOptions {
  to: string | string[];
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  tags?: Record<string, string>;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

const DEFAULT_FROM = 'TaxiAssur <noreply@taxiassur.com>';
const REPLY_TO = 'contact@taxiassur.com';

export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  const resendApiKey = '';

  if (!resendApiKey) {
    logger.error('Resend API key not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: options.from || DEFAULT_FROM,
        to: Array.isArray(options.to) ? options.to : [options.to],
        reply_to: options.replyTo || REPLY_TO,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
        tags: options.tags,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Failed to send email via Resend', {
        status: response.status,
        error: data,
      });

      return {
        success: false,
        error: data.message || 'Failed to send email',
      };
    }

    logger.info('Email sent successfully via Resend', {
      messageId: data.id,
      to: options.to,
      subject: options.subject,
    });

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    logger.error('Error sending email', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendTemplateEmail(
  to: string | string[],
  template: EmailTemplate,
  options?: Partial<EmailOptions>
): Promise<EmailResponse> {
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    ...options,
  });
}

export async function sendBulkEmails(
  emails: EmailOptions[]
): Promise<EmailResponse[]> {
  const results = await Promise.allSettled(
    emails.map(email => sendEmail(email))
  );

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        success: false,
        error: result.reason?.message || 'Unknown error',
      };
    }
  });
}

export async function verifyEmailDomain(domain: string): Promise<boolean> {
  const resendApiKey = '';

  if (!resendApiKey) {
    logger.error('Resend API key not configured');
    return false;
  }

  try {
    const response = await fetch(`https://api.resend.com/domains/${domain}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
      },
    });

    return response.ok;
  } catch (error) {
    logger.error('Error verifying domain', error);
    return false;
  }
}

export function validateEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}
