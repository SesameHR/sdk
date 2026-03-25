import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'

export interface Announcement {
  id: string
  title: string
  type: string
  sentAt: string
  iReadIt: boolean
}

export interface ListAnnouncementsParams {
  limit?: number
}

/** Company announcements — list and view internal communications. */
export class AnnouncementsModule {
  constructor(
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  /** List non-archived announcements, ordered by most recent. */
  async list(params?: ListAnnouncementsParams): Promise<Announcement[]> {
    return this.http.getData('/private/notification/v1/employee-announcements', {
      limit: params?.limit ?? 20,
      orderBy: 'sentAt desc',
      'archivedAt[null]': true,
    })
  }

  /** Get announcement details by ID. */
  async detail(announcementId: string): Promise<Announcement> {
    return this.http.getData(`/private/notification/v1/announcements/${announcementId}`)
  }
}
