import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChecksModule } from './checks.js'
import type { BiClient } from '../bi.js'
import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'

function mockBi() {
  return { query: vi.fn().mockResolvedValue([]) } as unknown as BiClient
}

function mockHttp() {
  return {
    postData: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    getData: vi.fn().mockResolvedValue([]),
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

describe('ChecksModule', () => {
  let bi: BiClient
  let http: HttpClient
  let mod: ChecksModule

  beforeEach(() => {
    bi = mockBi()
    http = mockHttp()
    mod = new ChecksModule(bi, http, config)
  })

  // --- BI reads ---

  it('history() filters by date range', async () => {
    await mod.history({ from: '2026-03-01', to: '2026-03-31' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.from).toBe('schedule_context_check')
    expect(call.where).toContainEqual({
      field: 'schedule_context_check.date',
      operator: '>=',
      value: '2026-03-01',
    })
    expect(call.where).toContainEqual({
      field: 'schedule_context_check.date',
      operator: '<=',
      value: '2026-03-31',
    })
  })

  it('today() uses TODAY operation', async () => {
    await mod.today()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'schedule_context_check.check_in_check_datetime',
      operation: 'TODAY',
    })
  })

  it('thisWeek() uses THIS_WEEK operation', async () => {
    await mod.thisWeek()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'schedule_context_check.check_in_check_datetime',
      operation: 'THIS_WEEK',
    })
  })

  it('thisMonth() uses THIS_MONTH operation', async () => {
    await mod.thisMonth()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'schedule_context_check.check_in_check_datetime',
      operation: 'THIS_MONTH',
    })
  })

  it('remoteOnly() filters by is_remote=1', async () => {
    await mod.remoteOnly({ from: '2026-03-01', to: '2026-03-31' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'schedule_context_check.is_remote',
      operator: '=',
      value: '1',
    })
  })

  it('openChecks() filters by opened=1', async () => {
    await mod.openChecks()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'schedule_context_check.opened',
      operator: '=',
      value: '1',
    })
  })

  it('hoursByEmployee() aggregates by employee name', async () => {
    await mod.hoursByEmployee({ from: '2026-03-01', to: '2026-03-31' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('core_context_employee.name')
    expect(call.select).toContainEqual(
      expect.objectContaining({ aggregate: 'SUM', alias: 'totalSeconds' }),
    )
  })

  it('hoursByDepartment() aggregates by department', async () => {
    await mod.hoursByDepartment({ from: '2026-03-01', to: '2026-03-31' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('core_context_department.name')
  })

  it('totalHours() returns SUM without groupBy', async () => {
    await mod.totalHours({ from: '2026-03-01', to: '2026-03-31' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toBeUndefined()
    expect(call.select).toContainEqual(
      expect.objectContaining({ aggregate: 'SUM', alias: 'totalSeconds' }),
    )
  })

  it('history() passes employee filter', async () => {
    await mod.history({ from: '2026-03-01', to: '2026-03-31', employee: 'antonio' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.name',
      operator: 'LIKE',
      value: '%antonio%',
    })
  })

  it('myRequests() queries check_request table', async () => {
    await mod.myRequests()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.from).toBe('schedule_context_check_request')
    expect(call.where).toContainEqual({
      field: 'schedule_context_check_request.status',
      operator: '=',
      value: 'pending',
    })
  })

  // --- REST writes ---

  it('clockIn() posts to check-in endpoint', async () => {
    await mod.clockIn()
    expect(http.postData).toHaveBeenCalledWith(
      `/api/v3/employees/${config.employeeId}/check-in`,
      expect.objectContaining({ origin: 'web' }),
    )
  })

  it('clockIn() uses provided coordinates', async () => {
    await mod.clockIn({ latitude: 39.47, longitude: -0.37 })
    expect(http.postData).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ coordinates: { latitude: 39.47, longitude: -0.37 } }),
    )
  })

  it('clockOut() posts to check-out endpoint', async () => {
    await mod.clockOut()
    expect(http.postData).toHaveBeenCalledWith(
      `/api/v3/employees/${config.employeeId}/check-out`,
      expect.objectContaining({ origin: 'web' }),
    )
  })

  it('pause() sends workBreakId', async () => {
    await mod.pause('break-123')
    expect(http.postData).toHaveBeenCalledWith(
      `/api/v3/employees/${config.employeeId}/pause`,
      expect.objectContaining({ workBreakId: 'break-123' }),
    )
  })

  it('breaks() fetches work breaks', async () => {
    await mod.breaks()
    expect(http.getData).toHaveBeenCalledWith(
      `/api/v3/employees/${config.employeeId}/work-breaks`,
    )
  })

  it('requestCreate() posts with employee ID and structured timestamp', async () => {
    await mod.requestCreate({ checkIn: '2026-03-25T08:00:00' })
    expect(http.postData).toHaveBeenCalledWith(
      '/api/v3/check-request-for-create',
      expect.objectContaining({
        employeeId: config.employeeId,
        type: 'work',
        checkIn: expect.objectContaining({
          date: expect.any(Number),
          origin: 'request',
          timezone: 'Europe/Madrid',
        }),
      }),
    )
  })

  it('requestCreate() supports type="pause" with workBreakId', async () => {
    await mod.requestCreate({
      checkIn: '2026-03-25T13:00:00',
      checkOut: '2026-03-25T14:00:00',
      type: 'pause',
      workBreakId: 'break-xyz',
    })
    expect(http.postData).toHaveBeenCalledWith(
      '/api/v3/check-request-for-create',
      expect.objectContaining({
        type: 'pause',
        workBreakId: 'break-xyz',
        checkIn: expect.objectContaining({ origin: 'request', timezone: 'Europe/Madrid' }),
        checkOut: expect.objectContaining({ origin: 'request', timezone: 'Europe/Madrid' }),
      }),
    )
  })

  it('requestEdit() posts with checkId', async () => {
    await mod.requestEdit('check-1', { checkIn: '2026-03-25T08:00:00' })
    expect(http.post).toHaveBeenCalledWith(
      '/api/v3/check-request-for-update',
      expect.objectContaining({ checkId: 'check-1' }),
    )
  })

  it('requestDelete() posts with checkId', async () => {
    await mod.requestDelete('check-1', 'wrong entry')
    expect(http.post).toHaveBeenCalledWith(
      '/api/v3/check-request-for-delete',
      expect.objectContaining({ checkId: 'check-1', comment: 'wrong entry' }),
    )
  })
})
