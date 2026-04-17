import type { BiClient, BiWhereCondition, BiSelectField } from '../bi.js'
import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'
import type { BiFilterParams } from '../types.js'
import { employeeFilter } from '../types.js'

export interface CheckEntry {
  date: string
  checkIn?: string
  checkOut?: string
  secondsWorked: number
  /** BI returns "1" or "0" for booleans */
  isRemote: string
  type: string
  employeeName?: string
  department?: string
}

export interface CheckAggregation {
  group: string
  totalSeconds: number
  count: number
}

export interface CheckHistoryParams extends BiFilterParams {
  from: string
  to: string
}

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface WorkBreak {
  id: string
  name: string
  icon?: string
  breakMinutes: number
  remunerated: boolean
  active: boolean
}

export interface CheckResult {
  id: string
  employeeId: string
  checkIn: string
  checkOut?: string
  origin: string
  createdAt: string
}

export interface CheckRequestParams {
  checkIn: string
  checkOut?: string
  comment?: string
  /** Check type. Defaults to 'work'. Use 'pause' to request a past-day break. */
  type?: 'work' | 'pause'
  /** Work break ID. Required when type is 'pause' (get it from breaks()). */
  workBreakId?: string
}

export interface CheckRequestEntry {
  status: string
  type: string
  comment?: string
  createdAt?: string
}

const DEFAULT_COORDINATES: Coordinates = { latitude: 0.0001, longitude: 0.0001 }

const REQUEST_TIMEZONE = 'Europe/Madrid'

/**
 * Build the structured timestamp payload the /check-request-for-* endpoints expect.
 * Input: a local datetime string (e.g., "2026-04-16T13:00:00" or "2026-04-16 13:00").
 * The string is interpreted as local time (server TZ). For accurate results, run the SDK
 * in the same timezone as REQUEST_TIMEZONE or pass a fully-qualified ISO string with offset.
 */
function buildCheckTimestamp(datetime: string): { date: number; origin: string; timezone: string } {
  const normalized = datetime.includes('T') ? datetime : datetime.replace(' ', 'T')
  const ms = new Date(normalized).getTime()
  return {
    date: Math.floor(ms / 1000),
    origin: 'request',
    timezone: REQUEST_TIMEZONE,
  }
}

const BASE_SELECT: BiSelectField[] = [
  { field: 'schedule_context_check.date', alias: 'date' },
  { field: 'schedule_context_check.check_in_check_datetime', alias: 'checkIn' },
  { field: 'schedule_context_check.check_out_check_datetime', alias: 'checkOut' },
  { field: 'schedule_context_check.seconds_worked', alias: 'secondsWorked' },
  { field: 'schedule_context_check.is_remote', alias: 'isRemote' },
  { field: 'schedule_context_check.type', alias: 'type' },
  { field: 'core_context_employee.name', alias: 'employeeName' },
  { field: 'core_context_department.name', alias: 'department' },
]

/** Time tracking — clock in/out, breaks, check history, hours aggregation, and check requests. */
export class ChecksModule {
  constructor(
    private bi: BiClient,
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  // --- BI Reads ---

  /** Get check entries for a date range. Returns clock-in/out times and seconds worked. */
  async history(params: CheckHistoryParams): Promise<CheckEntry[]> {
    return this.queryChecks([
      ...employeeFilter(params.employee),
      { field: 'schedule_context_check.date', operator: '>=', value: params.from },
      { field: 'schedule_context_check.date', operator: '<=', value: params.to },
    ], params)
  }

  /** Get today's check entries. */
  async today(params?: BiFilterParams): Promise<CheckEntry[]> {
    return this.queryChecks([
      ...employeeFilter(params?.employee),
      { field: 'schedule_context_check.check_in_check_datetime', operation: 'TODAY' },
    ], params)
  }

  /** Get this week's check entries. */
  async thisWeek(params?: BiFilterParams): Promise<CheckEntry[]> {
    return this.queryChecks([
      ...employeeFilter(params?.employee),
      { field: 'schedule_context_check.check_in_check_datetime', operation: 'THIS_WEEK' },
    ], params)
  }

  /** Get this month's check entries. */
  async thisMonth(params?: BiFilterParams): Promise<CheckEntry[]> {
    return this.queryChecks([
      ...employeeFilter(params?.employee),
      { field: 'schedule_context_check.check_in_check_datetime', operation: 'THIS_MONTH' },
    ], params)
  }

  /** Get only remote check entries for a date range. */
  async remoteOnly(params: CheckHistoryParams): Promise<CheckEntry[]> {
    return this.queryChecks([
      ...employeeFilter(params.employee),
      { field: 'schedule_context_check.is_remote', operator: '=', value: '1' },
      { field: 'schedule_context_check.date', operator: '>=', value: params.from },
      { field: 'schedule_context_check.date', operator: '<=', value: params.to },
    ], params)
  }

  /** Get currently open checks (clocked in but not yet clocked out). */
  async openChecks(params?: BiFilterParams): Promise<CheckEntry[]> {
    return this.queryChecks([
      ...employeeFilter(params?.employee),
      { field: 'schedule_context_check.opened', operator: '=', value: '1' },
    ], params)
  }

  /** Aggregate total hours and check count per employee for a date range. */
  async hoursByEmployee(params: CheckHistoryParams): Promise<CheckAggregation[]> {
    return this.aggregateBy('core_context_employee.name', params)
  }

  /** Aggregate total hours and check count per department for a date range. */
  async hoursByDepartment(params: CheckHistoryParams): Promise<CheckAggregation[]> {
    return this.aggregateBy('core_context_department.name', params)
  }

  /** Get total hours worked and check count across all employees for a date range. */
  async totalHours(params: CheckHistoryParams): Promise<CheckAggregation[]> {
    return this.bi.query<CheckAggregation>({
      from: 'schedule_context_check',
      select: [
        { field: 'schedule_context_check.seconds_worked', aggregate: 'SUM', alias: 'totalSeconds' },
        { field: 'schedule_context_check.date', aggregate: 'COUNT', alias: 'count' },
      ],
      where: [
        ...employeeFilter(params.employee),
        { field: 'schedule_context_check.date', operator: '>=', value: params.from },
        { field: 'schedule_context_check.date', operator: '<=', value: params.to },
      ],
    })
  }

  /** Get the authenticated employee's pending check requests. */
  async myRequests(params?: BiFilterParams): Promise<CheckRequestEntry[]> {
    return this.bi.query<CheckRequestEntry>({
      from: 'schedule_context_check_request',
      select: [
        { field: 'schedule_context_check_request.status', alias: 'status' },
        { field: 'schedule_context_check_request.type', alias: 'type' },
        { field: 'schedule_context_check_request.comment', alias: 'comment' },
        { field: 'schedule_context_check_request.created_at', alias: 'createdAt' },
      ],
      where: [
        ...employeeFilter(params?.employee),
        { field: 'schedule_context_check_request.status', operator: '=', value: 'pending' },
      ],
      orderBy: [{ field: 'schedule_context_check_request.created_at', direction: 'DESC' }],
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    })
  }

  // --- REST Writes ---

  /** Clock in the authenticated employee. Optionally provide GPS coordinates. */
  async clockIn(coordinates?: Coordinates): Promise<CheckResult> {
    return this.http.postData(`/api/v3/employees/${this.config.employeeId}/check-in`, {
      origin: 'web',
      coordinates: coordinates ?? DEFAULT_COORDINATES,
    })
  }

  /** Clock out the authenticated employee. Optionally provide GPS coordinates. */
  async clockOut(coordinates?: Coordinates): Promise<CheckResult> {
    return this.http.postData(`/api/v3/employees/${this.config.employeeId}/check-out`, {
      origin: 'web',
      coordinates: coordinates ?? DEFAULT_COORDINATES,
    })
  }

  /** Work breaks list (REST - not available as BI main table) */
  async breaks(): Promise<WorkBreak[]> {
    return this.http.getData(`/api/v3/employees/${this.config.employeeId}/work-breaks`)
  }

  /** Start a work break (pause). Requires the break type ID from breaks(). */
  async pause(workBreakId: string, coordinates?: Coordinates): Promise<CheckResult> {
    return this.http.postData(`/api/v3/employees/${this.config.employeeId}/pause`, {
      origin: 'web',
      workBreakId,
      coordinates: coordinates ?? DEFAULT_COORDINATES,
    })
  }

  /** Request to create a new check entry (requires manager approval). Default type is 'work'; pass type: 'pause' with a workBreakId to request a past-day break. */
  async requestCreate(params: CheckRequestParams): Promise<{ id: string }> {
    return this.http.postData('/api/v3/check-request-for-create', {
      employeeId: this.config.employeeId,
      type: params.type ?? 'work',
      checkIn: buildCheckTimestamp(params.checkIn),
      checkOut: params.checkOut ? buildCheckTimestamp(params.checkOut) : undefined,
      comment: params.comment,
      workBreakId: params.workBreakId,
    })
  }

  /** Request to edit an existing check entry (requires manager approval). */
  async requestEdit(checkId: string, params: CheckRequestParams): Promise<void> {
    await this.http.post('/api/v3/check-request-for-update', {
      employeeId: this.config.employeeId,
      checkId,
      checkType: 'work',
      checkIn: params.checkIn ? buildCheckTimestamp(params.checkIn) : undefined,
      checkOut: params.checkOut ? buildCheckTimestamp(params.checkOut) : undefined,
      comment: params.comment,
    })
  }

  /** Request to delete a check entry (requires manager approval). */
  async requestDelete(checkId: string, comment?: string): Promise<void> {
    await this.http.post('/api/v3/check-request-for-delete', {
      employeeId: this.config.employeeId,
      checkId,
      checkType: 'work',
      comment,
    })
  }

  // --- Helpers ---

  private async queryChecks(where: BiWhereCondition[], params?: BiFilterParams): Promise<CheckEntry[]> {
    return this.bi.query<CheckEntry>({
      from: 'schedule_context_check',
      select: BASE_SELECT,
      where,
      orderBy: [{ field: 'date', direction: 'DESC' }],
      limit: params?.limit ?? 250,
      offset: params?.offset ?? 0,
    })
  }

  private async aggregateBy(field: string, params: CheckHistoryParams): Promise<CheckAggregation[]> {
    return this.bi.query<CheckAggregation>({
      from: 'schedule_context_check',
      select: [
        { field, alias: 'group' },
        { field: 'schedule_context_check.seconds_worked', aggregate: 'SUM', alias: 'totalSeconds' },
        { field: 'schedule_context_check.date', aggregate: 'COUNT', alias: 'count' },
      ],
      where: [
        ...employeeFilter(params.employee),
        { field: 'schedule_context_check.date', operator: '>=', value: params.from },
        { field: 'schedule_context_check.date', operator: '<=', value: params.to },
      ],
      groupBy: [field],
      orderBy: [{ field: 'totalSeconds', direction: 'DESC' }],
      limit: params.limit ?? 250,
    })
  }
}
