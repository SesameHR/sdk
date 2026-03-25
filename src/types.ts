/** Paginated response from the Sesame API */
export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  lastPage: number
  perPage: number
}

/** Common pagination params for REST endpoints */
export interface PaginationParams {
  limit?: number
  page?: number
}

/** Common pagination params for BI queries */
export interface BiPaginationParams {
  limit?: number
  offset?: number
}

/** Common params for BI queries with optional employee filter */
export interface BiFilterParams extends BiPaginationParams {
  /** Filter by employee name (LIKE) or email (exact match if contains @) */
  employee?: string
}

/**
 * Build where conditions for employee filter.
 * If value contains @, filters by exact email. Otherwise by name LIKE.
 */
export function employeeFilter(employee?: string) {
  if (!employee) return []
  if (employee.includes('@')) {
    return [{ field: 'core_context_employee.email', operator: '=' as const, value: employee }]
  }
  return [{ field: 'core_context_employee.name', operator: 'LIKE' as const, value: `%${employee}%` }]
}
