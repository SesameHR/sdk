import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'
import { SesameApiError } from '../errors.js'

const PUSH_ENDPOINT = '/private/notification/v1/push-notifications-for-replit'

export interface SendPushParams {
  employeeId: string
  title: string
  message: string
  applicationId: string
}

/** Push notifications — send push notifications to Sesame HR mobile app. */
export class NotificationsModule {
  constructor(
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  /**
   * Send a push notification to an employee's Sesame HR mobile app.
   * Returns true on success, false on API error (graceful failure).
   */
  async sendPush(params: SendPushParams): Promise<boolean> {
    try {
      await this.http.post(PUSH_ENDPOINT, {
        employeeId: params.employeeId,
        title: params.title,
        message: params.message,
        clickAction: 'ApiPushNotificationSent',
        clickActionPayload: {
          id: params.applicationId,
          employeeId: '',
        },
      })
      return true
    } catch (error) {
      if (error instanceof SesameApiError) return false
      throw error
    }
  }
}
