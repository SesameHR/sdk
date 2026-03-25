import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VacationsModule } from './vacations.js'
import type { BiClient } from '../bi.js'
import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'

function mockBi() {
  return { query: vi.fn().mockResolvedValue([]) } as unknown as BiClient
}

function mockHttp() {
  return {
    postData: vi.fn().mockResolvedValue({ id: 'req-1' }),
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

describe('VacationsModule', () => {
  let bi: BiClient
  let http: HttpClient
  let mod: VacationsModule

  beforeEach(() => {
    bi = mockBi()
    http = mockHttp()
    mod = new VacationsModule(bi, http, config)
  })

  // --- BI reads ---

  it('calendars() queries schedule_context_calendar', async () => {
    await mod.calendars()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.from).toBe('schedule_context_calendar')
    expect(call.where).toContainEqual({
      field: 'schedule_context_calendar.calendar_type_type',
      operator: '=',
      value: 'vacation',
    })
  })

  it('calendars() filters by year', async () => {
    await mod.calendars({ year: 2026 })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'schedule_context_calendar.year',
      operator: '=',
      value: '2026',
    })
  })

  it('balanceByEmployee() defaults to current year', async () => {
    await mod.balanceByEmployee()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'schedule_context_calendar.year',
      operator: '=',
      value: String(new Date().getFullYear()),
    })
  })

  it('history() filters by date range', async () => {
    await mod.history({ from: '2026-01-01', to: '2026-12-31' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.from).toBe('schedule_context_day_off')
    expect(call.where).toContainEqual({
      field: 'schedule_context_day_off.date',
      operator: '>=',
      value: '2026-01-01',
    })
  })

  it('byType() groups by absence type', async () => {
    await mod.byType({ from: '2026-01-01', to: '2026-12-31' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('schedule_context_absence_type.name')
  })

  it('pendingRequests() filters by pending status', async () => {
    await mod.pendingRequests()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.from).toBe('schedule_context_day_off_request')
    expect(call.where).toContainEqual({
      field: 'schedule_context_day_off_request.status',
      operator: '=',
      value: 'pending',
    })
  })

  it('requestsByEmployee() groups by employee', async () => {
    await mod.requestsByEmployee()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('core_context_employee.name')
  })

  // --- REST writes ---

  it('request() posts vacation request with dates', async () => {
    const result = await mod.request({
      calendarId: 'cal-1',
      dates: ['2026-04-01', '2026-04-02'],
      comment: 'Spring break',
    })
    expect(result).toEqual({ id: 'req-1' })
    expect(http.postData).toHaveBeenCalledWith(
      '/api/v3/day-off-requests',
      expect.objectContaining({
        employeeId: config.employeeId,
        calendarId: 'cal-1',
        dates: ['2026-04-01', '2026-04-02'],
        comment: 'Spring break',
      }),
    )
  })

  it('cancel() deletes the request', async () => {
    await mod.cancel('req-1')
    expect(http.delete).toHaveBeenCalledWith('/api/v3/day-off-requests/req-1')
  })
})
