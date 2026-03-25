import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationsModule } from './notifications.js'
import { SesameApiError } from '../errors.js'
import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'

function mockHttp() {
  return {
    get: vi.fn().mockResolvedValue({}),
    getData: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    postData: vi.fn().mockResolvedValue({}),
    upload: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as HttpClient
}

const config: ResolvedConfig = {
  token: 'tok',
  region: 'EU1',
  companyId: 'comp-1',
  employeeId: 'emp-1',
  baseUrl: 'https://back-eu1.sesametime.com',
  biBaseUrl: 'https://bi-engine.sesametime.com',
  timeout: 30_000,
}

describe('NotificationsModule', () => {
  let http: HttpClient
  let mod: NotificationsModule

  beforeEach(() => {
    http = mockHttp()
    mod = new NotificationsModule(http, config)
  })

  it('sendPush() calls correct endpoint with payload', async () => {
    const result = await mod.sendPush({
      employeeId: 'emp-1',
      title: 'Order ready',
      message: 'Your order is ready for pickup',
      applicationId: 'app-123',
    })

    expect(result).toBe(true)
    expect(http.post).toHaveBeenCalledWith(
      '/private/notification/v1/push-notifications-for-replit',
      {
        employeeId: 'emp-1',
        title: 'Order ready',
        message: 'Your order is ready for pickup',
        clickAction: 'ApiPushNotificationSent',
        clickActionPayload: {
          id: 'app-123',
          employeeId: '',
        },
      },
    )
  })

  it('sendPush() returns false on API error', async () => {
    ;(http.post as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SesameApiError(401, { message: 'Unauthorized' }),
    )

    const result = await mod.sendPush({
      employeeId: 'emp-1',
      title: 'Test',
      message: 'Test',
      applicationId: 'app-123',
    })

    expect(result).toBe(false)
  })

  it('sendPush() rethrows non-API errors', async () => {
    ;(http.post as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network failure'),
    )

    await expect(
      mod.sendPush({
        employeeId: 'emp-1',
        title: 'Test',
        message: 'Test',
        applicationId: 'app-123',
      }),
    ).rejects.toThrow('Network failure')
  })
})
