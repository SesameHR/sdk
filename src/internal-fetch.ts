import { SesameApiError, SesameConnectionError } from './errors.js'
import { withRetry } from './retry.js'

const SUBDOMAIN_PATTERN = /^[a-zA-Z0-9-]+$/

/**
 * Validate that a string is a safe subdomain (SSRF prevention).
 * Throws SesameApiError(400) if invalid.
 */
export function validateSubdomain(value: string): void {
  if (!SUBDOMAIN_PATTERN.test(value)) {
    throw new SesameApiError(400, { message: `Invalid subdomain format: ${value}` })
  }
}

/**
 * Shared low-level fetch used by auth flows (directLogin, autoLogin).
 * Wraps fetch with retry, timeout, JSON parsing, and error mapping.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function doFetch(url: string, init: { method: string; body?: string; headers?: Record<string, string> }): Promise<any> {
  return withRetry(async () => {
    try {
      const response = await fetch(url, {
        method: init.method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...init.headers,
        },
        body: init.body,
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        throw new SesameApiError(response.status, await response.json().catch(() => null))
      }

      return await response.json()
    } catch (error) {
      if (error instanceof SesameApiError) throw error
      throw new SesameConnectionError((error as Error).message)
    }
  })
}
