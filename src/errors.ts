export class SesameError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown,
  ) {
    super(message)
    this.name = 'SesameError'
  }
}

export class SesameApiError extends SesameError {
  public readonly errors: unknown[]

  constructor(status: number, body: unknown) {
    const message = SesameApiError.extractMessage(body, status)
    const errors = SesameApiError.extractErrors(body)
    super(message, status, body)
    this.name = 'SesameApiError'
    this.errors = errors
  }

  /**
   * Extract error message trying multiple paths, matching
   * the pattern from SesameApiException.php (lines 105-120).
   */
  private static extractMessage(body: unknown, status: number): string {
    if (body === null || body === undefined || typeof body !== 'object') {
      return `Sesame API error: HTTP ${status}`
    }

    const b = body as Record<string, unknown>

    // 1. Nested: body.error.message
    if (typeof b.error === 'object' && b.error !== null && 'message' in b.error) {
      return SesameApiError.normalizeMessage((b.error as Record<string, unknown>).message)
    }

    // 2. Flat: body.message → body.error → body.error_description
    const flat = b.message ?? b.error ?? b.error_description
    if (flat !== undefined && flat !== null) {
      return SesameApiError.normalizeMessage(flat)
    }

    return `Sesame API error: HTTP ${status}`
  }

  private static extractErrors(body: unknown): unknown[] {
    if (body === null || body === undefined || typeof body !== 'object') return []
    const b = body as Record<string, unknown>
    const errors =
      (typeof b.error === 'object' && b.error !== null && 'errors' in b.error
        ? (b.error as Record<string, unknown>).errors
        : b.errors) ?? []
    return Array.isArray(errors) ? errors : []
  }

  private static normalizeMessage(value: unknown): string {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return SesameApiError.flattenArray(value)
    return String(value)
  }

  private static flattenArray(arr: unknown[]): string {
    const parts: string[] = []
    for (const item of arr) {
      if (typeof item === 'string') parts.push(item)
      else if (Array.isArray(item)) parts.push(SesameApiError.flattenArray(item))
      else if (item !== null && item !== undefined) parts.push(String(item))
    }
    return parts.filter(Boolean).join(', ')
  }
}

export class SesameConnectionError extends SesameError {
  constructor(cause: string) {
    super(`Connection failed: ${cause}`)
    this.name = 'SesameConnectionError'
  }
}
