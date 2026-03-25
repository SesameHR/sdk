import { SesameApiError, SesameConnectionError } from './errors.js'

export interface RetryOptions {
  attempts?: number
  delayMs?: number
  shouldRetry?: (error: unknown) => boolean
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function isTimeoutError(error: unknown): boolean {
  if (error instanceof SesameConnectionError) {
    return error.message.includes('aborted') || error.message.includes('timeout')
  }
  return false
}

/**
 * Default retry predicate:
 * - Connection failures → retry (except timeouts)
 * - Server errors (5xx) → retry
 * - Timeouts → do NOT retry (would just timeout again)
 * - Client errors (4xx) → do NOT retry
 */
function defaultShouldRetry(error: unknown): boolean {
  if (isTimeoutError(error)) return false
  if (error instanceof SesameConnectionError) return true
  if (error instanceof SesameApiError && error.status !== undefined && error.status >= 500) return true
  return false
}

/**
 * Execute a function with retry logic.
 *
 * Mirrors SesameClient.php: 2 retries, 500ms delay,
 * retries on connection errors and 5xx only.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const attempts = options?.attempts ?? 2
  const delayMs = options?.delayMs ?? 500
  const shouldRetry = options?.shouldRetry ?? defaultShouldRetry

  let lastError: unknown

  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < attempts && shouldRetry(error)) {
        await sleep(delayMs)
        continue
      }
      throw error
    }
  }

  throw lastError
}
