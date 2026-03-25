import { describe, it, expect } from 'vitest'
import { resolveConfig, configFromCredentials } from './config.js'

describe('resolveConfig', () => {
  it('resolves base URL from region', () => {
    const config = resolveConfig({
      token: 'tok',
      region: 'EU1',
      companyId: 'comp',
      employeeId: 'emp',
    })
    expect(config.baseUrl).toBe('https://back-eu1.sesametime.com')
    expect(config.biBaseUrl).toBe('https://bi-engine.sesametime.com')
    expect(config.timeout).toBe(30_000)
  })

  it('uses custom baseUrl when provided', () => {
    const config = resolveConfig({
      token: 'tok',
      region: 'CO',
      companyId: 'comp',
      employeeId: 'emp',
      baseUrl: 'https://custom.example.com',
    })
    expect(config.baseUrl).toBe('https://custom.example.com')
  })
})

describe('configFromCredentials', () => {
  const credentials = {
    sesame_private_token: 'tok123',
    region: 'EU1',
    sesame_user_id: 'user-1',
    employees: [
      { sesame_employee_id: 'emp-1', company_id: 'comp-1', company_name: 'Acme', full_name: 'John' },
      { sesame_employee_id: 'emp-2', company_id: 'comp-2', company_name: 'Beta', full_name: 'Jane' },
    ],
  }

  it('maps first employee by default', () => {
    const config = configFromCredentials(credentials)
    expect(config.token).toBe('tok123')
    expect(config.region).toBe('EU1')
    expect(config.companyId).toBe('comp-1')
    expect(config.employeeId).toBe('emp-1')
  })

  it('maps specific employee by index', () => {
    const config = configFromCredentials(credentials, 1)
    expect(config.companyId).toBe('comp-2')
    expect(config.employeeId).toBe('emp-2')
  })

  it('throws on invalid index', () => {
    expect(() => configFromCredentials(credentials, 5)).toThrow('No employee at index 5')
  })

  it('throws on empty employees', () => {
    expect(() => configFromCredentials({ ...credentials, employees: [] })).toThrow('No employee at index 0')
  })
})
