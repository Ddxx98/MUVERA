import { ZodError } from 'zod';
import { logger } from '@/lib/logger';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Detects Next.js navigation exceptions (redirect and notFound)
 * so they propagate through action handlers uninterrupted.
 */
export function isNavigationError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const digest = (err as { digest?: string }).digest;
  return typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND');
}

export function unstable_rethrow(err: unknown) {
  if (isNavigationError(err)) {
    throw err;
  }
}

export function handleActionError(err: unknown): ServiceResult<never> {
  // Allows Next.js redirect() and notFound() exceptions to propagate without being caught
  unstable_rethrow(err);

  if (err instanceof AppError) {
    return {
      ok: false,
      error: { code: err.code, message: err.message, fields: err.fields },
    };
  }

  if (err instanceof ZodError) {
    const fields = Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message]));
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the highlighted input fields.',
        fields,
      },
    };
  }

  if ((err as { code?: number })?.code === 11000) {
    return {
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'This record or transaction has already been processed.',
      },
    };
  }

  logger.error({ err: err instanceof Error ? err.stack || err.message : String(err) }, 'Unhandled action error');

  return {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.',
    },
  };
}
