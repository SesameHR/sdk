import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'

export interface WorkStatsParams {
  from: string
  to: string
  employeeId?: string
}

export interface WorkStatsResult {
  secondsWorked: number
  secondsToWork: number
  balance: number
  workedDays: number
  daysToWork: number
  avgInSeconds: number
  avgOutSeconds: number
  avgWorkBreakSeconds: number
  checksCount: number
  workBreaksCount: number
  vacationsCount: number
  permissionsCount: number
  avgScheduleSeconds: number
  checksOrigin: { mobile: number; web: number }
  checksOutsideOffice: { inside: number; outside: number }
  checksGeo: { with: number; without: number }
}

/** Work statistics — hours worked vs expected, balance, averages, and check origin breakdowns. */
export class WorkStatsModule {
  constructor(
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  /** Employee statistics via REST (same endpoint as MCP) */
  async summary(params: WorkStatsParams): Promise<WorkStatsResult> {
    const response = await this.http.post<{ data: WorkStatsResult }>('/api/v3/employees-statistics', {
      employeeIds: [params.employeeId ?? this.config.employeeId],
      from: params.from,
      to: params.to,
    })
    return response.data
  }
}
