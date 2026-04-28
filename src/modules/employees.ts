import type { BiClient, BiWhereCondition, BiSelectField } from '../bi.js'
import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'
import type { BiFilterParams } from '../types.js'
import { employeeFilter } from '../types.js'

export interface Employee {
  name: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  status: string
  workStatus: string
  department?: string
  office?: string
  jobCharge?: string
  code?: number
  imageProfileURL?: string
}

export interface EmployeeGroupCount {
  group: string
  count: number
}

export interface MeProfile {
  id: string
  workStatus: string
  status: string
  email: string
  firstName: string
  lastName: string
  companyId: string
  lastCheckIn?: string
  lastCheckOut?: string
  gender?: string
  identityNumberType?: string
  nif?: string
  dateOfBirth?: string
  phone?: string
  imageProfileURL?: string
}

export interface ListEmployeesParams extends BiFilterParams {
  status?: 'active' | 'inactive'
  department?: string
  office?: string
}

const BASE_SELECT: BiSelectField[] = [
  { field: 'core_context_employee.name', alias: 'name' },
  { field: 'core_context_employee.first_name', alias: 'firstName' },
  { field: 'core_context_employee.last_name', alias: 'lastName' },
  { field: 'core_context_employee.email', alias: 'email' },
  { field: 'core_context_employee.phone', alias: 'phone' },
  { field: 'core_context_employee.status', alias: 'status' },
  { field: 'core_context_employee.work_status', alias: 'workStatus' },
  { field: 'core_context_department.name', alias: 'department' },
  { field: 'core_context_office.name', alias: 'office' },
  { field: 'core_context_job_charge.name', alias: 'jobCharge' },
  { field: 'core_context_employee.code', alias: 'code' },
  { field: 'core_context_employee.image_profile_url', alias: 'imageProfileURL' },
]

/** Manage company employees — list, filter by status/department, search, and get counts. */
export class EmployeesModule {
  constructor(
    private bi: BiClient,
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  /** List employees with optional filters by status, department, or office. */
  async list(params?: ListEmployeesParams): Promise<Employee[]> {
    const where: BiWhereCondition[] = [...employeeFilter(params?.employee)]
    if (params?.status) where.push({ field: 'core_context_employee.status', operator: '=', value: params.status })
    if (params?.department) where.push({ field: 'core_context_department.name', operator: 'LIKE', value: `%${params.department}%` })
    if (params?.office) where.push({ field: 'core_context_office.name', operator: 'LIKE', value: `%${params.office}%` })

    return this.queryEmployees(where, params)
  }

  /** Get employees currently working (online or remote). */
  async working(params?: BiFilterParams): Promise<Employee[]> {
    return this.queryEmployees([
      ...employeeFilter(params?.employee),
      { field: 'core_context_employee.work_status', operator: 'IN', value: ['online', 'remote'] },
    ], params)
  }

  /** Get employees currently on a break (paused). */
  async onBreak(params?: BiFilterParams): Promise<Employee[]> {
    return this.queryEmployees([
      ...employeeFilter(params?.employee),
      { field: 'core_context_employee.work_status', operator: '=', value: 'paused' },
    ], params)
  }

  /** Get employees currently working remotely. */
  async remote(params?: BiFilterParams): Promise<Employee[]> {
    return this.queryEmployees([
      ...employeeFilter(params?.employee),
      { field: 'core_context_employee.work_status', operator: '=', value: 'remote' },
    ], params)
  }

  /** Get employees currently offline (not clocked in). */
  async offline(params?: BiFilterParams): Promise<Employee[]> {
    return this.queryEmployees([
      ...employeeFilter(params?.employee),
      { field: 'core_context_employee.work_status', operator: '=', value: 'offline' },
    ], params)
  }

  /** Search employees by name (partial match). */
  async search(query: string, params?: BiFilterParams): Promise<Employee[]> {
    return this.queryEmployees([
      { field: 'core_context_employee.name', operator: 'LIKE', value: `%${query}%` },
    ], params)
  }

  /** Count active employees grouped by department. */
  async byDepartment(params?: BiFilterParams): Promise<EmployeeGroupCount[]> {
    return this.countGroupedBy('core_context_department.name', params)
  }

  /** Count active employees grouped by office. */
  async byOffice(params?: BiFilterParams): Promise<EmployeeGroupCount[]> {
    return this.countGroupedBy('core_context_office.name', params)
  }

  /** Count active employees grouped by job position. */
  async byJobCharge(params?: BiFilterParams): Promise<EmployeeGroupCount[]> {
    return this.countGroupedBy('core_context_job_charge.name', params)
  }

  /** Count employees grouped by status (active/inactive). */
  async count(): Promise<EmployeeGroupCount[]> {
    return this.countGroupedBy('core_context_employee.status')
  }

  /**
   * Full profile of the authenticated employee (REST).
   * Returns workStatus ("online" | "offline" | "paused" | "remote"), status, lastCheck, and more.
   */
  async me(): Promise<MeProfile> {
    const data = await this.http.getData<MeProfile | MeProfile[]>('/api/v3/security/me')
    // Endpoint returns an array with one entry — unwrap it
    return Array.isArray(data) ? data[0] : data
  }

  // --- Helpers ---

  private async queryEmployees(where: BiWhereCondition[], params?: BiFilterParams): Promise<Employee[]> {
    return this.bi.query<Employee>({
      from: 'core_context_employee',
      select: BASE_SELECT,
      where,
      orderBy: [{ field: 'name', direction: 'ASC' }],
      limit: params?.limit ?? 250,
      offset: params?.offset ?? 0,
    })
  }

  private async countGroupedBy(field: string, params?: BiFilterParams): Promise<EmployeeGroupCount[]> {
    return this.bi.query<EmployeeGroupCount>({
      from: 'core_context_employee',
      select: [
        { field, alias: 'group' },
        { field: 'core_context_employee.name', aggregate: 'COUNT', alias: 'count' },
      ],
      where: [
        { field: 'core_context_employee.status', operator: '=', value: 'active' },
        ...employeeFilter(params?.employee),
      ],
      groupBy: [field],
      orderBy: [{ field: 'count', direction: 'DESC' }],
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    })
  }
}
