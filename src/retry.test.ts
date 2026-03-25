import { describe, it, expect, vi } from 'vitest'
import { withRetry } from './retry.js'
import { SesameApiError, SesameConnectionError } from './errors.js'

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on connection error', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new SesameConnectionError('ECONNREFUSED'))
      .mockResolvedValue('ok')

    const result = await withRetry(fn, { delayMs: 0 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries on 5xx error', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new SesameApiError(502, { message: 'Bad Gateway' }))
      .mockResolvedValue('ok')

    const result = await withRetry(fn, { delayMs: 0 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does NOT retry on 4xx error', async () => {
    const fn = vi.fn().mockRejectedValue(new SesameApiError(401, { message: 'Unauthorized' }))

    await expect(withRetry(fn, { delayMs: 0 })).rejects.toThrow('Unauthorized')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry on timeout', async () => {
    const fn = vi.fn().mockRejectedValue(new SesameConnectionError('The operation was aborted due to timeout'))

    await expect(withRetry(fn, { delayMs: 0 })).rejects.toThrow('timeout')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('exhausts retries and throws last error', async () => {
    const fn = vi.fn().mockRejectedValue(new SesameConnectionError('ECONNREFUSED'))

    await expect(withRetry(fn, { attempts: 2, delayMs: 0 })).rejects.toThrow('ECONNREFUSED')
    expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
  })
})
