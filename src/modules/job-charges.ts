import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'
import type { Paginated, PaginationParams } from '../types.js'

export interface JobCharge {
  id: string
  name: string
  description?: string
  children?: JobCharge[]
}

export interface JobChargeEmployee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
}

export interface ListJobChargesParams extends PaginationParams {
  name?: string
}

/** Job positions/charges — list positions, view details and assigned employees. */
export class JobChargesModule {
  constructor(
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  /** List job positions (paginated). Optionally filter by name. */
  async list(params?: ListJobChargesParams): Promise<Paginated<JobCharge>> {
    return this.http.get('/private/core/v3/job-charge', {
      limit: params?.limit ?? 20,
      page: params?.page ?? 1,
      orderBy: 'name asc',
      ...(params?.name ? { 'name[contains]': params.name } : {}),
    })
  }

  /** Get job position details by ID. Optionally include child positions. */
  async detail(jobChargeId: string, withChildren = false): Promise<JobCharge> {
    return this.http.getData(`/private/core/v3/job-charge/${jobChargeId}`, {
      ...(withChildren ? { withChildren: true } : {}),
    })
  }

  /** List employees assigned to a specific job position (paginated). */
  async employees(
    jobChargeId: string,
    params?: PaginationParams,
  ): Promise<Paginated<JobChargeEmployee>> {
    return this.http.get(
      `/private/core/v3/employee-job-charge/${jobChargeId}/employees`,
      { limit: params?.limit ?? 20, page: params?.page ?? 1 },
    )
  }
}
