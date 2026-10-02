type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Masks sensitive PII (emails, phone numbers, UPI IDs, credit tokens) in log output.
 */
function maskPii(data: unknown): unknown {
  if (typeof data === 'string') {
    // Mask emails: j***@domain.com
    let masked = data.replace(/([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/g, (match, user, domain, ext) => {
      const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : '***';
      return `${maskedUser}@${domain}.${ext}`;
    });
    // Mask 10-digit phone numbers: ******1234
    masked = masked.replace(/(\+?\d{1,3}[- ]?)?(\d{6})(\d{4})/g, (_match, prefix, _mid, last4) => {
      return `${prefix || ''}******${last4}`;
    });
    return masked;
  }

  if (Array.isArray(data)) {
    return data.map(maskPii);
  }

  if (data !== null && typeof data === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (['password', 'secret', 'token', 'apiKey', 'adminSecretKey'].includes(key.toLowerCase())) {
        copy[key] = '[REDACTED]';
      } else {
        copy[key] = maskPii(val);
      }
    }
    return copy;
  }

  return data;
}

function formatLog(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const sanitizedContext = context ? maskPii(context) : undefined;
  const payload = {
    timestamp,
    level,
    message,
    ...(sanitizedContext ? { context: sanitizedContext } : {}),
  };

  const output = JSON.stringify(payload);
  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(output);
      }
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => formatLog('info', message, context),
  warn: (message: string, context?: LogContext) => formatLog('warn', message, context),
  error: (contextOrMsg: LogContext | string, msgOrNothing?: string) => {
    if (typeof contextOrMsg === 'string') {
      formatLog('error', contextOrMsg);
    } else {
      formatLog('error', msgOrNothing || 'Error occurred', contextOrMsg);
    }
  },
  debug: (message: string, context?: LogContext) => formatLog('debug', message, context),
};
