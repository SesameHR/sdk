import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { verifyAutoLoginToken } from './autologin.js'
import { SesameApiError } from './errors.js'

const VALID_TOKEN = 'test-token-abc123'
const REGION = 'back-eu1'

function mockFetchResponses(verifyData: unknown, meData: unknown) {
  let callCount = 0
  return vi.fn(async (url: string) => {
    callCount++
    // First non-retry call = verify-token, second = /me
    if ((url as string).includes('verify-token')) {
      return {
        ok: true,
        json: async () => verifyData,
      }
    }
    if ((url as string).includes('/security/me')) {
      return {
        ok: true,
        json: async () => meData,
      }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  })
}

describe('verifyAutoLoginToken', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns AutoLoginResult on success', async () => {
    globalThis.fetch = mockFetchResponses(
      { data: 'user-token-xyz' },
      {
        data: {
          id: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@company.com',
          groupId: 'comp-1',
          imageProfileURL: 'https://cdn.example.com/avatar.jpg',
        },
      },
    ) as unknown as typeof fetch

    const result = await verifyAutoLoginToken({ token: VALID_TOKEN, region: REGION })

    expect(result.token).toBe('user-token-xyz')
    expect(result.region).toBe('EU1')
    expect(result.employeeId).toBe('emp-1')
    expect(result.companyId).toBe('comp-1')
    expect(result.profile.firstName).toBe('John')
    expect(result.profile.lastName).toBe('Doe')
    expect(result.profile.email).toBe('john@company.com')
    expect(result.profile.imageProfileURL).toBe('https://cdn.example.com/avatar.jpg')
    expect(result.sdkConfig).toEqual({
      token: 'user-token-xyz',
      region: 'EU1',
      companyId: 'comp-1',
      employeeId: 'emp-1',
    })
  })

  it('calls correct endpoints', async () => {
    const mockFetch = mockFetchResponses(
      { data: 'tok' },
      { data: { id: 'e1', firstName: 'A', lastName: 'B', email: 'a@b.com', groupId: 'c1' } },
    )
    globalThis.fetch = mockFetch as unknown as typeof fetch

    await verifyAutoLoginToken({ token: VALID_TOKEN, region: REGION })

    const urls = mockFetch.mock.calls.map((c) => c[0])
    expect(urls[0]).toBe('https://back-eu1.sesametime.com/private/external-app/v1/verify-token')
    expect(urls[1]).toBe('https://back-eu1.sesametime.com/api/v3/security/me')
  })

  it('sends token in verify-token POST body', async () => {
    const mockFetch = mockFetchResponses(
      { data: 'tok' },
      { data: { id: 'e1', firstName: 'A', lastName: 'B', email: 'a@b.com', groupId: 'c1' } },
    )
    globalThis.fetch = mockFetch as unknown as typeof fetch

    await verifyAutoLoginToken({ token: VALID_TOKEN, region: REGION })

    const firstCallInit = mockFetch.mock.calls[0][1] as RequestInit
    expect(firstCallInit.method).toBe('POST')
    expect(JSON.parse(firstCallInit.body as string)).toEqual({ token: VALID_TOKEN })
  })

  it('throws on invalid token (401)', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid token' }),
    })) as unknown as typeof fetch

    await expect(
      verifyAutoLoginToken({ token: 'bad', region: REGION }),
    ).rejects.toThrow(SesameApiError)
  })

  it('throws on malicious region (SSRF)', async () => {
    await expect(
      verifyAutoLoginToken({ token: VALID_TOKEN, region: 'evil.com/hack' }),
    ).rejects.toThrow(SesameApiError)

    await expect(
      verifyAutoLoginToken({ token: VALID_TOKEN, region: 'back-eu1.evil.com' }),
    ).rejects.toThrow(SesameApiError)
  })

  it('throws when verify-token returns empty data', async () => {
    globalThis.fetch = mockFetchResponses(
      { data: null },
      { data: {} },
    ) as unknown as typeof fetch

    await expect(
      verifyAutoLoginToken({ token: VALID_TOKEN, region: REGION }),
    ).rejects.toThrow('Token verification failed')
  })

  it('throws when /me returns no employee ID', async () => {
    globalThis.fetch = mockFetchResponses(
      { data: 'tok' },
      { data: { firstName: 'A' } },
    ) as unknown as typeof fetch

    await expect(
      verifyAutoLoginToken({ token: VALID_TOKEN, region: REGION }),
    ).rejects.toThrow('Could not retrieve employee profile')
  })
})
