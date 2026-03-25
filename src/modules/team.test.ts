import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TeamModule } from './team.js'
import type { BiClient } from '../bi.js'
import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'

function mockBi() {
  return { query: vi.fn().mockResolvedValue([]) } as unknown as BiClient
}

function mockHttp() {
  return {
    post: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
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

describe('TeamModule', () => {
  let bi: BiClient
  let http: HttpClient
  let mod: TeamModule

  beforeEach(() => {
    bi = mockBi()
    http = mockHttp()
    mod = new TeamModule(bi, http, config)
  })

  // --- BI reads ---

  it('status() filters active employees', async () => {
    await mod.status()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.from).toBe('core_context_employee')
    expect(call.where).toContainEqual({
      field: 'core_context_employee.status',
      operator: '=',
      value: 'active',
    })
  })

  it('working() filters online/remote', async () => {
    await mod.working()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.work_status',
      operator: 'IN',
      value: ['online', 'remote'],
    })
  })

  it('statusSummary() groups by work_status', async () => {
    await mod.statusSummary()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('core_context_employee.work_status')
  })

  it('employeeChecks() filters by name and date range', async () => {
    await mod.employeeChecks('antonio', { from: '2026-03-01', to: '2026-03-31' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.from).toBe('schedule_context_check')
    expect(call.where).toContainEqual({
      field: 'core_context_employee.name',
      operator: 'LIKE',
      value: '%antonio%',
    })
  })

  it('checkRequests() queries check_request table', async () => {
    await mod.checkRequests()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.from).toBe('schedule_context_check_request')
    expect(call.where).toContainEqual({
      field: 'schedule_context_check_request.status',
      operator: '=',
      value: 'pending',
    })
  })

  it('vacationRequests() queries day_off_request table', async () => {
    await mod.vacationRequests()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.from).toBe('schedule_context_day_off_request')
  })

  // --- REST writes ---

  it('createCheck() posts to /api/v3/checks', async () => {
    await mod.createCheck('emp-2', { checkIn: '2026-03-25T08:00:00' })
    expect(http.post).toHaveBeenCalledWith(
      '/api/v3/checks',
      expect.objectContaining({ employeeId: 'emp-2', checkType: 'work' }),
    )
  })

  it('editCheck() puts to /api/v3/checks/:id', async () => {
    await mod.editCheck('check-1', { checkOut: '2026-03-25T17:00:00' })
    expect(http.put).toHaveBeenCalledWith(
      '/api/v3/checks/check-1',
      expect.objectContaining({ checkOut: '2026-03-25T17:00:00' }),
    )
  })

  it('deleteCheck() deletes /api/v3/checks/:id', async () => {
    await mod.deleteCheck('check-1')
    expect(http.delete).toHaveBeenCalledWith('/api/v3/checks/check-1')
  })

  it('approveCheckRequest() posts to accepted endpoint', async () => {
    await mod.approveCheckRequest('req-1')
    expect(http.post).toHaveBeenCalledWith('/api/v3/accepted-check-requests/req-1')
  })

  it('rejectCheckRequest() posts to rejected endpoint', async () => {
    await mod.rejectCheckRequest('req-1')
    expect(http.post).toHaveBeenCalledWith('/api/v3/rejected-check-requests/req-1')
  })

  it('approveVacation() posts to accepted endpoint', async () => {
    await mod.approveVacation('req-2')
    expect(http.post).toHaveBeenCalledWith('/api/v3/accepted-day-off-requests/req-2')
  })

  it('rejectVacation() posts to rejected endpoint', async () => {
    await mod.rejectVacation('req-2')
    expect(http.post).toHaveBeenCalledWith('/api/v3/rejected-day-off-requests/req-2')
  })
})
