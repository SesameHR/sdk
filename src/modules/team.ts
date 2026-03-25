import type { BiClient, BiWhereCondition, BiSelectField } from '../bi.js'
import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'
import type { BiPaginationParams } from '../types.js'

export interface TeamMember {
  name: string
  email: string
  status: string
  workStatus: string
  department?: string
  office?: string
  jobCharge?: string
}

export interface TeamCheck {
  date: string
  checkIn?: string
  checkOut?: string
  secondsWorked: number
  isRemote: string
  type: string
  employeeName?: string
}

export interface TeamRequestEntry {
  status: string
  type: string
  comment?: string
  createdAt?: string
  employeeName?: string
}

export interface TeamGroupCount {
  group: string
  count: number
}

const MEMBER_SELECT: BiSelectField[] = [
  { field: 'core_context_employee.name', alias: 'name' },
  { field: 'core_context_employee.email', alias: 'email' },
  { field: 'core_context_employee.status', alias: 'status' },
  { field: 'core_context_employee.work_status', alias: 'workStatus' },
  { field: 'core_context_department.name', alias: 'department' },
  { field: 'core_context_office.name', alias: 'office' },
  { field: 'core_context_job_charge.name', alias: 'jobCharge' },
]

/** Team/admin module — view team status, manage checks and approve/reject requests for your reports. */
export class TeamModule {
  constructor(
    private bi: BiClient,
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  // --- BI: Employee status ---

  /** List all active team members with their current work status. */
  async status(params?: BiPaginationParams): Promise<TeamMember[]> {
    return this.queryMembers([
      { field: 'core_context_employee.status', operator: '=', value: 'active' },
    ], params)
  }

  /** Get team members currently working (online or remote). */
  async working(params?: BiPaginationParams): Promise<TeamMember[]> {
    return this.queryMembers([
      { field: 'core_context_employee.work_status', operator: 'IN', value: ['online', 'remote'] },
    ], params)
  }

  /** Count active employees grouped by work status (online/offline/paused/remote). */
  async statusSummary(): Promise<TeamGroupCount[]> {
    return this.bi.query<TeamGroupCount>({
      from: 'core_context_employee',
      select: [
        { field: 'core_context_employee.work_status', alias: 'group' },
        { field: 'core_context_employee.name', aggregate: 'COUNT', alias: 'count' },
      ],
      where: [{ field: 'core_context_employee.status', operator: '=', value: 'active' }],
      groupBy: ['core_context_employee.work_status'],
      orderBy: [{ field: 'count', direction: 'DESC' }],
    })
  }

  // --- BI: Checks ---

  /** Get check history for a specific employee by name (partial match) in a date range. */
  async employeeChecks(
    employeeName: string,
    params: { from: string; to: string } & BiPaginationParams,
  ): Promise<TeamCheck[]> {
    return this.bi.query<TeamCheck>({
      from: 'schedule_context_check',
      select: [
        { field: 'schedule_context_check.date', alias: 'date' },
        { field: 'schedule_context_check.check_in_check_datetime', alias: 'checkIn' },
        { field: 'schedule_context_check.check_out_check_datetime', alias: 'checkOut' },
        { field: 'schedule_context_check.seconds_worked', alias: 'secondsWorked' },
        { field: 'schedule_context_check.is_remote', alias: 'isRemote' },
        { field: 'schedule_context_check.type', alias: 'type' },
        { field: 'core_context_employee.name', alias: 'employeeName' },
      ],
      where: [
        { field: 'core_context_employee.name', operator: 'LIKE', value: `%${employeeName}%` },
        { field: 'schedule_context_check.date', operator: '>=', value: params.from },
        { field: 'schedule_context_check.date', operator: '<=', value: params.to },
      ],
      orderBy: [{ field: 'date', direction: 'DESC' }],
      limit: params.limit ?? 250,
      offset: params.offset ?? 0,
    })
  }

  // --- BI: Requests ---

  /** Get pending check requests from team members awaiting approval. */
  async checkRequests(params?: BiPaginationParams): Promise<TeamRequestEntry[]> {
    return this.queryRequests('schedule_context_check_request', params)
  }

  /** Get pending vacation requests from team members awaiting approval. */
  async vacationRequests(params?: BiPaginationParams): Promise<TeamRequestEntry[]> {
    return this.queryRequests('schedule_context_day_off_request', params)
  }

  // --- REST: Check mutations ---

  /** Create a check entry for a team member (admin action, no approval needed). */
  async createCheck(employeeId: string, params: { checkIn: string; checkOut?: string }): Promise<void> {
    await this.http.post('/api/v3/checks', { employeeId, checkType: 'work', ...params })
  }

  /** Edit a team member's existing check entry (admin action). */
  async editCheck(checkId: string, params: { checkIn?: string; checkOut?: string }): Promise<void> {
    await this.http.put(`/api/v3/checks/${checkId}`, { checkType: 'work', ...params })
  }

  /** Delete a team member's check entry (admin action). */
  async deleteCheck(checkId: string): Promise<void> {
    await this.http.delete(`/api/v3/checks/${checkId}`)
  }

  // --- REST: Request approvals ---

  /** Approve a pending check request from a team member. */
  async approveCheckRequest(requestId: string): Promise<void> {
    await this.http.post(`/api/v3/accepted-check-requests/${requestId}`)
  }

  /** Reject a pending check request from a team member. */
  async rejectCheckRequest(requestId: string): Promise<void> {
    await this.http.post(`/api/v3/rejected-check-requests/${requestId}`)
  }

  /** Approve a pending vacation request from a team member. */
  async approveVacation(requestId: string): Promise<void> {
    await this.http.post(`/api/v3/accepted-day-off-requests/${requestId}`)
  }

  /** Reject a pending vacation request from a team member. */
  async rejectVacation(requestId: string): Promise<void> {
    await this.http.post(`/api/v3/rejected-day-off-requests/${requestId}`)
  }

  // --- Helpers ---

  private async queryMembers(where: BiWhereCondition[], params?: BiPaginationParams): Promise<TeamMember[]> {
    return this.bi.query<TeamMember>({
      from: 'core_context_employee',
      select: MEMBER_SELECT,
      where,
      orderBy: [{ field: 'name', direction: 'ASC' }],
      limit: params?.limit ?? 250,
      offset: params?.offset ?? 0,
    })
  }

  private async queryRequests(table: string, params?: BiPaginationParams): Promise<TeamRequestEntry[]> {
    return this.bi.query<TeamRequestEntry>({
      from: table,
      select: [
        { field: `${table}.status`, alias: 'status' },
        { field: `${table}.type`, alias: 'type' },
        { field: `${table}.comment`, alias: 'comment' },
        { field: `${table}.created_at`, alias: 'createdAt' },
        { field: 'core_context_employee.name', alias: 'employeeName' },
      ],
      where: [{ field: `${table}.status`, operator: '=', value: 'pending' }],
      orderBy: [{ field: `${table}.created_at`, direction: 'DESC' }],
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    })
  }
}
