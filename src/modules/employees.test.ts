import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmployeesModule } from './employees.js'
import type { BiClient } from '../bi.js'
import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'

function mockBi() {
  return { query: vi.fn().mockResolvedValue([]) } as unknown as BiClient
}

function mockHttp() {
  return { getData: vi.fn().mockResolvedValue({}) } as unknown as HttpClient
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

describe('EmployeesModule', () => {
  let bi: BiClient
  let http: HttpClient
  let mod: EmployeesModule

  beforeEach(() => {
    bi = mockBi()
    http = mockHttp()
    mod = new EmployeesModule(bi, http, config)
  })

  it('list() queries core_context_employee with defaults', async () => {
    await mod.list()
    expect(bi.query).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'core_context_employee',
        limit: 250,
        offset: 0,
      }),
    )
  })

  it('list() applies status filter', async () => {
    await mod.list({ status: 'active' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.status',
      operator: '=',
      value: 'active',
    })
  })

  it('list() applies department filter with LIKE', async () => {
    await mod.list({ department: 'Sales' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_department.name',
      operator: 'LIKE',
      value: '%Sales%',
    })
  })

  it('list() applies employee filter by name', async () => {
    await mod.list({ employee: 'john' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.name',
      operator: 'LIKE',
      value: '%john%',
    })
  })

  it('list() applies employee filter by email', async () => {
    await mod.list({ employee: 'john@acme.com' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.email',
      operator: '=',
      value: 'john@acme.com',
    })
  })

  it('working() filters by online/remote', async () => {
    await mod.working()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.work_status',
      operator: 'IN',
      value: ['online', 'remote'],
    })
  })

  it('onBreak() filters by paused', async () => {
    await mod.onBreak()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.work_status',
      operator: '=',
      value: 'paused',
    })
  })

  it('remote() filters by remote', async () => {
    await mod.remote()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.work_status',
      operator: '=',
      value: 'remote',
    })
  })

  it('offline() filters by offline', async () => {
    await mod.offline()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.work_status',
      operator: '=',
      value: 'offline',
    })
  })

  it('search() uses LIKE on name', async () => {
    await mod.search('garcia')
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.name',
      operator: 'LIKE',
      value: '%garcia%',
    })
  })

  it('byDepartment() groups by department', async () => {
    await mod.byDepartment()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('core_context_department.name')
    expect(call.where).toContainEqual({
      field: 'core_context_employee.status',
      operator: '=',
      value: 'active',
    })
  })

  it('byOffice() groups by office', async () => {
    await mod.byOffice()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('core_context_office.name')
  })

  it('byJobCharge() groups by job charge', async () => {
    await mod.byJobCharge()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('core_context_job_charge.name')
  })

  it('count() groups by status', async () => {
    await mod.count()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('core_context_employee.status')
  })

  it('list() respects pagination params', async () => {
    await mod.list({ limit: 10, offset: 20 })
    expect(bi.query).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 20 }),
    )
  })

  it('me() calls REST and unwraps array', async () => {
    const profile = { id: 'emp-1', workStatus: 'online' }
    ;(http.getData as ReturnType<typeof vi.fn>).mockResolvedValue([profile])
    const result = await mod.me()
    expect(result).toEqual(profile)
    expect(http.getData).toHaveBeenCalledWith('/api/v3/security/me')
  })

  it('me() handles non-array response', async () => {
    const profile = { id: 'emp-1', workStatus: 'offline' }
    ;(http.getData as ReturnType<typeof vi.fn>).mockResolvedValue(profile)
    const result = await mod.me()
    expect(result).toEqual(profile)
  })
})
