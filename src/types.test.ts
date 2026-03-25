import { describe, it, expect } from 'vitest'
import { employeeFilter } from './types.js'

describe('employeeFilter', () => {
  it('returns empty array when no employee', () => {
    expect(employeeFilter()).toEqual([])
    expect(employeeFilter(undefined)).toEqual([])
  })

  it('filters by exact email when contains @', () => {
    const result = employeeFilter('john@company.com')
    expect(result).toEqual([
      { field: 'core_context_employee.email', operator: '=', value: 'john@company.com' },
    ])
  })

  it('filters by name LIKE when no @', () => {
    const result = employeeFilter('matias')
    expect(result).toEqual([
      { field: 'core_context_employee.name', operator: 'LIKE', value: '%matias%' },
    ])
  })
})
