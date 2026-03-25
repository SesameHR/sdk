import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'
import type { Paginated, PaginationParams } from '../types.js'

export interface Vacancy {
  id: string
  name: string
  status: string
}

export interface VacancyTotals {
  total: number
  open: number
  closed: number
  draft: number
}

export interface Candidate {
  id: string
  name: string
  email: string
}

export interface ListVacanciesParams extends PaginationParams {
  status?: 'open' | 'closed' | 'draft' | 'archived'
  search?: string
}

/** Recruitment — list vacancies, view totals, and browse candidates. */
export class RecruitmentModule {
  constructor(
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  /** List vacancies (paginated). Filter by status or search by name. */
  async vacancies(params?: ListVacanciesParams): Promise<Paginated<Vacancy>> {
    return this.http.get(`/api/v3/companies/${this.config.companyId}/vacancies`, {
      limit: params?.limit ?? 20,
      page: params?.page ?? 1,
      status: params?.status,
      ...(params?.search ? { 'name[contains]': params.search } : {}),
      orderBy: 'createdAt desc',
    })
  }

  /** Get vacancy count totals (total, open, closed, draft). */
  async totals(): Promise<VacancyTotals> {
    return this.http.getData('/api/v3/vacancies-totals')
  }

  /** Get vacancy details by ID. */
  async vacancy(vacancyId: string): Promise<Vacancy> {
    return this.http.getData(`/api/v3/vacancies/${vacancyId}`)
  }

  /** List candidates for a specific vacancy (paginated). */
  async candidates(
    vacancyId: string,
    params?: PaginationParams & { search?: string },
  ): Promise<Paginated<Candidate>> {
    return this.http.get(`/api/v3/companies/${this.config.companyId}/candidates`, {
      vacancyId,
      limit: params?.limit ?? 20,
      page: params?.page ?? 1,
      ...(params?.search ? { search: params.search } : {}),
      orderBy: 'createdAt desc',
    })
  }
}
