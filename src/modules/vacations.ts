import type { BiClient, BiWhereCondition } from '../bi.js'
import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'
import type { BiFilterParams } from '../types.js'
import { employeeFilter } from '../types.js'

export interface VacationCalendar {
  year: number
  maxDaysOff: number
  remainingDaysOff: number
  calendarType: string
  employeeName?: string
}

export interface DayOff {
  date: string
  name: string
  seconds?: number
  startTime?: string
  endTime?: string
  employeeName?: string
  absenceType?: string
}

export interface DayOffRequest {
  status: string
  type: string
  comment?: string
  createdAt?: string
  employeeName?: string
}

export interface DayOffGroupCount {
  group: string
  count: number
}

export interface RequestVacationParams {
  calendarId: string
  dates: string[]
  comment?: string
}

/** Vacation and absence management — calendars, day-off history, pending requests, and vacation booking. */
export class VacationsModule {
  constructor(
    private bi: BiClient,
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  // --- BI: schedule_context_calendar ---

  /** Get vacation calendars showing max and remaining days off per employee. */
  async calendars(params?: { year?: number } & BiFilterParams): Promise<VacationCalendar[]> {
    const where: BiWhereCondition[] = [
      ...employeeFilter(params?.employee),
      { field: 'schedule_context_calendar.calendar_type_type', operator: '=', value: 'vacation' },
    ]
    if (params?.year) {
      where.push({ field: 'schedule_context_calendar.year', operator: '=', value: String(params.year) })
    }

    return this.bi.query<VacationCalendar>({
      from: 'schedule_context_calendar',
      select: [
        { field: 'schedule_context_calendar.year', alias: 'year' },
        { field: 'schedule_context_calendar.max_days_off', alias: 'maxDaysOff' },
        { field: 'schedule_context_calendar.remaining_days_off', alias: 'remainingDaysOff' },
        { field: 'schedule_context_calendar.calendar_type_type', alias: 'calendarType' },
        { field: 'core_context_employee.name', alias: 'employeeName' },
      ],
      where,
      orderBy: [{ field: 'core_context_employee.name', direction: 'ASC' }],
      limit: params?.limit ?? 500,
      offset: params?.offset ?? 0,
    })
  }

  /** Get vacation balance per employee for a specific year (defaults to current year). */
  async balanceByEmployee(params?: { year?: number } & BiFilterParams): Promise<VacationCalendar[]> {
    return this.calendars({ ...params, year: params?.year ?? new Date().getFullYear() })
  }

  // --- BI: schedule_context_day_off ---

  /** Get day-off history for a date range. Includes absence type, start/end times. */
  async history(params: { from: string; to: string } & BiFilterParams): Promise<DayOff[]> {
    return this.bi.query<DayOff>({
      from: 'schedule_context_day_off',
      select: [
        { field: 'schedule_context_day_off.date', alias: 'date' },
        { field: 'schedule_context_day_off.name', alias: 'name' },
        { field: 'schedule_context_day_off.seconds', alias: 'seconds' },
        { field: 'schedule_context_day_off.start_time', alias: 'startTime' },
        { field: 'schedule_context_day_off.end_time', alias: 'endTime' },
        { field: 'core_context_employee.name', alias: 'employeeName' },
        { field: 'schedule_context_absence_type.name', alias: 'absenceType' },
      ],
      where: [
        ...employeeFilter(params.employee),
        { field: 'schedule_context_day_off.date', operator: '>=', value: params.from },
        { field: 'schedule_context_day_off.date', operator: '<=', value: params.to },
      ],
      orderBy: [{ field: 'date', direction: 'DESC' }],
      limit: params.limit ?? 250,
      offset: params.offset ?? 0,
    })
  }

  /** Count days off grouped by absence type for a date range. */
  async byType(params: { from: string; to: string } & BiFilterParams): Promise<DayOffGroupCount[]> {
    return this.bi.query<DayOffGroupCount>({
      from: 'schedule_context_day_off',
      select: [
        { field: 'schedule_context_absence_type.name', alias: 'group' },
        { field: 'schedule_context_day_off.date', aggregate: 'COUNT', alias: 'count' },
      ],
      where: [
        ...employeeFilter(params.employee),
        { field: 'schedule_context_day_off.date', operator: '>=', value: params.from },
        { field: 'schedule_context_day_off.date', operator: '<=', value: params.to },
      ],
      groupBy: ['schedule_context_absence_type.name'],
      orderBy: [{ field: 'count', direction: 'DESC' }],
      limit: params.limit ?? 50,
    })
  }

  // --- BI: schedule_context_day_off_request ---

  /** Get pending day-off requests awaiting approval. */
  async pendingRequests(params?: BiFilterParams): Promise<DayOffRequest[]> {
    return this.queryRequests([
      ...employeeFilter(params?.employee),
      { field: 'schedule_context_day_off_request.status', operator: '=', value: 'pending' },
    ], params)
  }

  /** Count pending day-off requests grouped by employee. */
  async requestsByEmployee(params?: BiFilterParams): Promise<DayOffGroupCount[]> {
    return this.bi.query<DayOffGroupCount>({
      from: 'schedule_context_day_off_request',
      select: [
        { field: 'core_context_employee.name', alias: 'group' },
        { field: 'schedule_context_day_off_request.status', aggregate: 'COUNT', alias: 'count' },
      ],
      where: [
        ...employeeFilter(params?.employee),
        { field: 'schedule_context_day_off_request.status', operator: '=', value: 'pending' },
      ],
      groupBy: ['core_context_employee.name'],
      orderBy: [{ field: 'count', direction: 'DESC' }],
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    })
  }

  // --- REST Writes ---

  /** Submit a vacation request for specific dates. Requires a calendarId from calendars(). */
  async request(params: RequestVacationParams): Promise<{ id: string }> {
    return this.http.postData('/api/v3/day-off-requests', {
      employeeId: this.config.employeeId,
      calendarId: params.calendarId,
      dates: params.dates,
      comment: params.comment,
    })
  }

  /** Cancel a previously submitted vacation request. */
  async cancel(requestId: string): Promise<void> {
    await this.http.delete(`/api/v3/day-off-requests/${requestId}`)
  }

  // --- Helper ---

  private async queryRequests(where: BiWhereCondition[], params?: BiFilterParams): Promise<DayOffRequest[]> {
    return this.bi.query<DayOffRequest>({
      from: 'schedule_context_day_off_request',
      select: [
        { field: 'schedule_context_day_off_request.status', alias: 'status' },
        { field: 'schedule_context_day_off_request.type', alias: 'type' },
        { field: 'schedule_context_day_off_request.comment', alias: 'comment' },
        { field: 'schedule_context_day_off_request.created_at', alias: 'createdAt' },
        { field: 'core_context_employee.name', alias: 'employeeName' },
      ],
      where,
      orderBy: [{ field: 'schedule_context_day_off_request.created_at', direction: 'DESC' }],
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    })
  }
}
