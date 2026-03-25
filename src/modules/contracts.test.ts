import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContractsModule } from './contracts.js'
import type { BiClient } from '../bi.js'
import type { ResolvedConfig } from '../config.js'

function mockBi() {
  return { query: vi.fn().mockResolvedValue([]) } as unknown as BiClient
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

describe('ContractsModule', () => {
  let bi: BiClient
  let mod: ContractsModule

  beforeEach(() => {
    bi = mockBi()
    mod = new ContractsModule(bi, config)
  })

  it('list() queries contract_context_contract', async () => {
    await mod.list()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.from).toBe('contract_context_contract')
  })

  it('list() applies status filter', async () => {
    await mod.list({ status: 'active' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'contract_context_contract.status',
      operator: '=',
      value: 'active',
    })
  })

  it('active() is shorthand for list with status=active', async () => {
    await mod.active()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'contract_context_contract.status',
      operator: '=',
      value: 'active',
    })
  })

  it('expiringSoon() filters by date range and active status', async () => {
    await mod.expiringSoon(30)
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'contract_context_contract.status',
      operator: '=',
      value: 'active',
    })
    const endDateFilters = call.where.filter(
      (w: { field: string }) => w.field === 'contract_context_contract.end_date',
    )
    expect(endDateFilters).toHaveLength(2) // >= today and <= future
  })

  it('byType() groups by contract type', async () => {
    await mod.byType()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('contract_context_contract_type.name')
  })

  it('statusSummary() groups by status', async () => {
    await mod.statusSummary()
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.groupBy).toContain('contract_context_contract.status')
  })

  it('list() passes employee filter', async () => {
    await mod.list({ employee: 'maria' })
    const call = (bi.query as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where).toContainEqual({
      field: 'core_context_employee.name',
      operator: 'LIKE',
      value: '%maria%',
    })
  })
})
