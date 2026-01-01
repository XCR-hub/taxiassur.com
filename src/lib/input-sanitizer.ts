const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'span', 'div'
];

const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'title', 'target', 'rel'],
  '*': ['class', 'id']
};

const URL_PROTOCOLS = ['http:', 'https:', 'mailto:'];

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.href);
    if (!URL_PROTOCOLS.includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  function cleanNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      if (!ALLOWED_TAGS.includes(tagName)) {
        return document.createTextNode(element.textContent || '');
      }

      const newElement = document.createElement(tagName);
      const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || [];
      const globalAttrs = ALLOWED_ATTRIBUTES['*'] || [];
      const allAllowed = [...allowedAttrs, ...globalAttrs];

      Array.from(element.attributes).forEach(attr => {
        if (allAllowed.includes(attr.name)) {
          if (attr.name === 'href') {
            const sanitized = sanitizeUrl(attr.value);
            if (sanitized) {
              newElement.setAttribute(attr.name, sanitized);
            }
          } else {
            newElement.setAttribute(attr.name, attr.value);
          }
        }
      });

      Array.from(element.childNodes).forEach(child => {
        const cleaned = cleanNode(child);
        if (cleaned) {
          newElement.appendChild(cleaned);
        }
      });

      return newElement;
    }

    return null;
  }

  const body = doc.body;
  const cleaned = document.createElement('div');

  Array.from(body.childNodes).forEach(child => {
    const cleanedNode = cleanNode(child);
    if (cleanedNode) {
      cleaned.appendChild(cleanedNode);
    }
  });

  return cleaned.innerHTML;
}

export function sanitizeInput(input: string): string {
  return escapeHtml(input.trim());
}

export function sanitizeEmail(email: string): string {
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
}

export function preventXSS(str: string): string {
  return escapeHtml(str);
}

export function validateAndSanitize(
  value: string,
  type: 'text' | 'email' | 'phone' | 'url' | 'html' = 'text'
): string {
  switch (type) {
    case 'email':
      return sanitizeEmail(value);
    case 'phone':
      return sanitizePhone(value);
    case 'url':
      return sanitizeUrl(value);
    case 'html':
      return sanitizeHtml(value);
    default:
      return sanitizeInput(value);
  }
}
